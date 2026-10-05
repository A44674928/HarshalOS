/* Kraken-only Disc3 constituent ranking.
 *
 * One unauthenticated public Spot Ticker request (pair omitted, assetVersion=1)
 * supplies Kraken's current ticker snapshot. We retain up to 52 USD-quoted Spot
 * pairs and rank by Kraken's rolling-24-hour base volume v[1] × VWAP p[1]. This
 * is venue-specific and is not Massive's previous-UTC-day grouped ranking.
 * Daily per-pair bars use the separate fixed-path OHLC adapter in
 * characters-kraken.mjs. Missing fields are never borrowed or inferred.
 */

import { claimKrakenCall } from "./kraken-call-ledger.mjs";

export const KRAKEN_TICKER_PATH = "/0/public/Ticker";
export const CHARACTERS_CRYPTO_RANKING_TTL_MS = 24 * 60 * 60_000;
export const CHARACTERS_CRYPTO_RANKING_RETRY_MS = 15 * 60_000;
export const CHARACTERS_CRYPTO_RANKING_SIZE = 52;
export const KRAKEN_PUBLIC_ORIGIN = "https://api.kraken.com";
const FETCH_TIMEOUT_MS = 8_000;
const CACHE_SELECT = `SELECT ranking_json, fetched_at, expires_at, last_attempt_at
  FROM characters_crypto_ranking_cache WHERE id = 1`;
const CACHE_CLAIM = `INSERT INTO characters_crypto_ranking_cache
    (id, ranking_json, fetched_at, expires_at, last_attempt_at, updated_at)
  VALUES (1, NULL, NULL, 0, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    last_attempt_at = excluded.last_attempt_at,
    updated_at = excluded.updated_at
  WHERE characters_crypto_ranking_cache.last_attempt_at <= ?
  RETURNING last_attempt_at`;
const CACHE_WRITE = `UPDATE characters_crypto_ranking_cache
  SET ranking_json = ?, fetched_at = ?, expires_at = ?, updated_at = ?
  WHERE id = 1 AND last_attempt_at = ?`;

let cached = null;
let inFlight = null;

const failure = (code, message, extra = {}) => ({ ok: false, code, message, ...extra });
const isRecord = value => value && typeof value === "object" && !Array.isArray(value);
const finitePositive = value => typeof value === "number" && Number.isFinite(value) && value > 0;
const dateStamp = value => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const at = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(at) && new Date(at).toISOString().slice(0, 10) === value;
};
const utcDate = at => new Date(Number(at)).toISOString().slice(0, 10);
const nextUtcMidnight = at => {
  const date = new Date(Number(at));
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
};
const stablecoinSymbols = /^(USDT|USDC|USDE|DAI|USDS|USDD|FDUSD|TUSD|PYUSD|USDP|GUSD|FRAX|USDX)$/;
const fiatSymbols = new Set(("AED AFN ALL AMD ANG AOA ARS AUD AWG AZN BAM BBD BDT BGN BHD BIF BMD BND BOB BRL BSD BTN BWP BYN BZD CAD CDF CHF CLP CNY COP CRC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP GEL GHS GIP GMD GNF GTQ GYD HKD HNL HTG HUF IDR ILS INR IQD IRR ISK JMD JOD JPY KES KGS KHR KMF KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MYR MZN NAD NGN NIO NOK NPR NZD OMR PAB PEN PGK PHP PKR PLN PYG QAR RON RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE SOS SRD SSP STN SVC SYP SZL THB TJS TMT TND TOP TRY TTD TWD TZS UAH UGX USD UYU UZS VES VND VUV WST XAF XCD XOF XPF YER ZAR ZMW ZWL XAU XAG").split(" "));
const canonicalBase = value => value === "XBT" ? "BTC" : value === "XDG" ? "DOGE" : value;

function readNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim())) return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function tickerArray(value, minimumLength) {
  if (!Array.isArray(value) || value.length < minimumLength) return null;
  const result = value.map(readNumber);
  return result;
}

/** Parse a Kraken Ticker payload without inferring pair aliases or quote FX. */
function normalizeKrakenTicker(payload, { at = Date.now() } = {}) {
  if (!isRecord(payload) || !isRecord(payload.result) || !Array.isArray(payload.error) || payload.error.length > 0) return null;
  const candidatesBySymbol = new Map();
  let missingVolumeCount = 0;
  let missingVwapCount = 0;
  let nonUsdPairCount = 0;
  for (const [rawPair, row] of Object.entries(payload.result)) {
    if (rawPair === "last" || !isRecord(row)) continue;
    const pair = rawPair.trim().toUpperCase();
    const match = /^([A-Z0-9]{2,12})\/([A-Z0-9]{2,12})$/.exec(pair);
    if (!match) continue;
    const [, providerBase, quote] = match;
    if (quote !== "USD") {
      nonUsdPairCount += 1;
      continue;
    }
    const symbol = canonicalBase(providerBase);
    if (!/^[A-Z0-9]{2,12}$/.test(symbol) || fiatSymbols.has(providerBase) || fiatSymbols.has(symbol)) continue;
    const volumes = tickerArray(row.v, 2);
    const vwaps = tickerArray(row.p, 2);
    const closes = tickerArray(row.c, 1);
    const baseVolume24h = volumes ? volumes[1] : null;
    const vwap24hUsd = vwaps ? vwaps[1] : null;
    if (!finitePositive(baseVolume24h)) { missingVolumeCount += 1; continue; }
    if (!finitePositive(vwap24hUsd)) { missingVwapCount += 1; continue; }
    const volumeUsd = baseVolume24h * vwap24hUsd;
    if (!finitePositive(volumeUsd)) continue;
    const currentPriceUsd = closes && finitePositive(closes[0]) ? closes[0] : null;
    const previous = candidatesBySymbol.get(symbol);
    if (!previous || volumeUsd > previous.volumeUsd) {
      candidatesBySymbol.set(symbol, {
        symbol,
        providerBase,
        krakenPair: pair,
        baseVolume24h,
        vwap24hUsd,
        volumeUsd,
        currentPriceUsd
      });
    }
  }

  const sorted = [...candidatesBySymbol.values()]
    .sort((a, b) => b.volumeUsd - a.volumeUsd || a.symbol.localeCompare(b.symbol));
  if (sorted.length < CHARACTERS_CRYPTO_RANKING_SIZE) return null;
  const instruments = sorted.slice(0, CHARACTERS_CRYPTO_RANKING_SIZE).map((entry, index) => {
    const audit = [];
    if (stablecoinSymbols.test(entry.symbol)) audit.push("stablecoin-candidate");
    if (entry.currentPriceUsd === null) audit.push("missing-current-price");
    if (entry.currentPriceUsd !== null && entry.currentPriceUsd >= 1_000_000) audit.push("extreme-nominal-price");
    audit.push("missing-market-cap");
    return Object.freeze({
      symbol: entry.symbol,
      displaySymbol: `${entry.symbol}/USD`,
      name: entry.symbol,
      sector: "Cryptocurrency",
      assetClass: "crypto",
      discId: "crypto",
      dataShape: "ohlcv",
      quoteCurrency: "USD",
      rankingProvider: "Kraken",
      providerId: entry.krakenPair,
      krakenPair: entry.krakenPair,
      providerBase: entry.providerBase,
      rank: index + 1,
      providerRank: index + 1,
      baseVolume24h: entry.baseVolume24h,
      vwap24hUsd: entry.vwap24hUsd,
      volumeUsd: entry.volumeUsd,
      currentPriceUsd: entry.currentPriceUsd,
      marketCapUsd: null,
      audit: Object.freeze(audit)
    });
  });
  const stablecoinCandidates = instruments.filter(instrument => instrument.audit.includes("stablecoin-candidate"))
    .map(instrument => ({ rank: instrument.rank, symbol: instrument.symbol }));
  const extremeNominalPriceCandidates = instruments.filter(instrument => instrument.currentPriceUsd !== null && instrument.currentPriceUsd >= 1_000_000)
    .map(instrument => ({ rank: instrument.rank, symbol: instrument.symbol, currentPriceUsd: instrument.currentPriceUsd }));
  const asOf = new Date(Number(at)).toISOString();
  const rankingAudit = Object.freeze({
    policy: `Kraken Spot Ticker snapshot at ${asOf}; USD-quoted pairs ranked by rolling 24-hour reported base volume v[1] × VWAP p[1]. Venue-specific roster; no investment-quality or listing-legitimacy screen.`,
    sourceDate: utcDate(at),
    rankedAt: asOf,
    candidateCount: sorted.length,
    eligibleUsdPairCount: candidatesBySymbol.size,
    nonUsdPairCount,
    missingVolumeCount: missingVolumeCount,
    missingVwapCount,
    stablecoinCandidateCount: stablecoinCandidates.length,
    stablecoinCandidates: Object.freeze(stablecoinCandidates),
    missingMarketCapCount: instruments.length,
    extremeNominalPriceCandidates: Object.freeze(extremeNominalPriceCandidates),
    warnings: Object.freeze([
      "This is Kraken Spot venue data only; it is not a global or cross-exchange crypto ranking.",
      "Ranking uses the Ticker endpoint's rolling 24-hour window as observed at rankedAt, not a previous-UTC-day aggregate.",
      "Only USD-quoted Spot pairs are eligible; no quote-currency conversion or non-USD pair substitution is performed.",
      "Stablecoin candidates remain eligible by venue volume and are flagged for operator review.",
      "The Ticker response has no market-cap field; market capitalization remains missing rather than inferred."
    ])
  });
  return Object.freeze({
    schema: "characters-kraken-crypto-ranking-v1",
    provider: "Kraken",
    venue: "Kraken Spot",
    metric: `rolling 24-hour USD notional (Kraken Spot base volume × VWAP) · as of ${asOf}`,
    sourceWindow: "rolling-24h",
    sourceDate: utcDate(at),
    rankedAt: asOf,
    audit: rankingAudit,
    instruments: Object.freeze(instruments)
  });
}

function sanitizeCachedRanking(value) {
  if (!isRecord(value) || value.schema !== "characters-kraken-crypto-ranking-v1" || value.provider !== "Kraken" ||
      value.venue !== "Kraken Spot" || value.sourceWindow !== "rolling-24h" || !dateStamp(value.sourceDate) ||
      typeof value.rankedAt !== "string" || !Number.isFinite(Date.parse(value.rankedAt)) ||
      !Array.isArray(value.instruments) || value.instruments.length !== CHARACTERS_CRYPTO_RANKING_SIZE ||
      !isRecord(value.audit) || value.audit.provider === "Massive") return null;
  const seen = new Set();
  const instruments = [];
  for (let index = 0; index < value.instruments.length; index += 1) {
    const entry = value.instruments[index];
    if (!isRecord(entry)) return null;
    const symbol = typeof entry.symbol === "string" ? entry.symbol.toUpperCase() : "";
    const krakenPair = typeof entry.krakenPair === "string" ? entry.krakenPair.toUpperCase() : "";
    const providerId = typeof entry.providerId === "string" ? entry.providerId.toUpperCase() : "";
    const pairMatch = /^([A-Z0-9]{2,12})\/USD$/.exec(krakenPair);
    const providerBase = typeof entry.providerBase === "string" ? entry.providerBase.toUpperCase() : "";
    if (!/^[A-Z0-9]{2,12}$/.test(symbol) || !pairMatch || pairMatch[1] !== providerBase ||
        canonicalBase(providerBase) !== symbol || providerId !== krakenPair || fiatSymbols.has(providerBase) ||
        seen.has(symbol) || entry.rankingProvider !== "Kraken" || entry.assetClass !== "crypto" ||
        entry.discId !== "crypto" || entry.rank !== index + 1 ||
        !finitePositive(entry.baseVolume24h) || !finitePositive(entry.vwap24hUsd) ||
        !finitePositive(entry.volumeUsd) || Math.abs(entry.volumeUsd - entry.baseVolume24h * entry.vwap24hUsd) > Math.max(1e-8, entry.volumeUsd * 1e-10) ||
        (entry.currentPriceUsd !== null && !finitePositive(entry.currentPriceUsd))) return null;
    seen.add(symbol);
    const audit = Array.isArray(entry.audit)
      ? entry.audit.filter(flag => ["stablecoin-candidate", "missing-current-price", "extreme-nominal-price", "missing-market-cap"].includes(flag)).slice(0, 4)
      : [];
    instruments.push(Object.freeze({
      symbol,
      displaySymbol: `${symbol}/USD`,
      name: symbol,
      sector: "Cryptocurrency",
      assetClass: "crypto",
      discId: "crypto",
      dataShape: "ohlcv",
      quoteCurrency: "USD",
      rankingProvider: "Kraken",
      providerId: krakenPair,
      krakenPair,
      providerBase,
      rank: index + 1,
      providerRank: index + 1,
      baseVolume24h: entry.baseVolume24h,
      vwap24hUsd: entry.vwap24hUsd,
      volumeUsd: entry.volumeUsd,
      currentPriceUsd: finitePositive(entry.currentPriceUsd) ? entry.currentPriceUsd : null,
      marketCapUsd: null,
      audit: Object.freeze(audit)
    }));
  }
  const rankedAt = new Date(Date.parse(value.rankedAt)).toISOString();
  return Object.freeze({
    schema: "characters-kraken-crypto-ranking-v1",
    provider: "Kraken",
    venue: "Kraken Spot",
    metric: String(value.metric).slice(0, 160),
    sourceWindow: "rolling-24h",
    sourceDate: value.sourceDate,
    rankedAt,
    audit: Object.freeze({
      policy: String(value.audit.policy || "").slice(0, 400),
      sourceDate: value.sourceDate,
      rankedAt,
      candidateCount: Math.max(CHARACTERS_CRYPTO_RANKING_SIZE, Math.floor(Number(value.audit.candidateCount) || CHARACTERS_CRYPTO_RANKING_SIZE)),
      eligibleUsdPairCount: Math.max(CHARACTERS_CRYPTO_RANKING_SIZE, Math.floor(Number(value.audit.eligibleUsdPairCount) || CHARACTERS_CRYPTO_RANKING_SIZE)),
      nonUsdPairCount: Math.max(0, Math.floor(Number(value.audit.nonUsdPairCount) || 0)),
      stablecoinCandidateCount: instruments.filter(entry => entry.audit.includes("stablecoin-candidate")).length,
      stablecoinCandidates: Object.freeze(instruments.filter(entry => entry.audit.includes("stablecoin-candidate"))
        .map(entry => ({ rank: entry.rank, symbol: entry.symbol }))),
      missingMarketCapCount: instruments.length,
      missingVolumeCount: Math.max(0, Math.floor(Number(value.audit.missingVolumeCount) || 0)),
      missingVwapCount: Math.max(0, Math.floor(Number(value.audit.missingVwapCount) || 0)),
      extremeNominalPriceCandidates: Object.freeze(instruments.filter(entry => entry.currentPriceUsd !== null && entry.currentPriceUsd >= 1_000_000)
        .map(entry => ({ rank: entry.rank, symbol: entry.symbol, currentPriceUsd: entry.currentPriceUsd }))),
      warnings: Object.freeze(Array.isArray(value.audit.warnings) ? value.audit.warnings.filter(note => typeof note === "string").slice(0, 8).map(note => note.slice(0, 240)) : [])
    }),
    instruments: Object.freeze(instruments)
  });
}

async function readCacheRow(db) {
  if (!db || typeof db.prepare !== "function") return { ok: true, row: null };
  try { return { ok: true, row: await db.prepare(CACHE_SELECT).first() }; }
  catch { return { ok: false, row: null }; }
}

async function claimRankingRefresh(db, now) {
  if (!db || typeof db.prepare !== "function") {
    return failure("kraken-ledger-unavailable", "Bind COMMUNITY_DB and apply migrations 0010 and 0012 before refreshing the Kraken crypto ranking.");
  }
  try {
    const row = await db.prepare(CACHE_CLAIM)
      .bind(now, now, now - CHARACTERS_CRYPTO_RANKING_RETRY_MS)
      .first();
    if (row) return { ok: true };
    return failure("crypto-ranking-cooldown", "The Kraken crypto ranking was just checked. Disc3 stays held until its bounded retry window ends.");
  } catch {
    return failure("kraken-ledger-unavailable", "The Kraken crypto ranking cache is unavailable. Apply migration 0010 and the Kraken provider migration before retrying.");
  }
}

async function writeRankingCache(db, ranking, now, expiresAt) {
  try {
    const result = await db.prepare(CACHE_WRITE)
      .bind(JSON.stringify(ranking), now, expiresAt, now, now)
      .run();
    const changes = Number(result && (result.meta?.changes ?? result.changes));
    return !Number.isFinite(changes) || changes > 0;
  } catch { return false; }
}

export function clearCharactersCryptoRankingCache() {
  cached = null;
  inFlight = null;
}

/** Read the current valid Kraken roster without making a provider request. */
export async function readCharactersCryptoRankingCache({ db, now = Date.now() } = {}) {
  const current = Number.isFinite(Number(now)) && Number(now) >= 0 ? Math.floor(Number(now)) : Date.now();
  if ((!db || typeof db.prepare !== "function") && cached && cached.expiresAt > current) {
    return { ok: true, ranking: cached.ranking, cached: true, source: "isolate" };
  }
  const result = await readCacheRow(db);
  if (!result.ok) return failure("kraken-cache-unavailable", "The Kraken crypto ranking cache is unreadable. No provider request was sent.");
  const expiresAt = Number(result.row && result.row.expires_at) || 0;
  if (!result.row || expiresAt <= current || typeof result.row.ranking_json !== "string") {
    return failure("crypto-ranking-cache-miss", "A fresh Kraken Spot ranking is not cached; no provider request was sent.", {
      lastAttemptAt: Number(result.row && result.row.last_attempt_at) || 0
    });
  }
  let parsed;
  try { parsed = JSON.parse(result.row.ranking_json); } catch { parsed = null; }
  const ranking = sanitizeCachedRanking(parsed);
  if (!ranking) return failure("kraken-ranking-unreadable", "The cached crypto ranking did not pass Kraken provider-identity validation. No other venue or stale ranking was substituted.");
  cached = { ranking, expiresAt };
  return { ok: true, ranking, cached: true, source: "d1" };
}

/** Read (or refresh) the one-day cached Kraken venue roster. */
export async function getCharactersCryptoRanking({
  db,
  fetcher = globalThis.fetch,
  now = Date.now(),
  timeoutMs = FETCH_TIMEOUT_MS,
  forceRefresh = false,
  allowFetch = true,
  beforeFetch
} = {}) {
  const current = Number.isFinite(Number(now)) && Number(now) >= 0 ? Math.floor(Number(now)) : Date.now();
  if (!forceRefresh) {
    const fresh = await readCharactersCryptoRankingCache({ db, now: current });
    if (fresh.ok) return fresh;
    if (!allowFetch) return fresh;
    if (fresh.code === "kraken-cache-unavailable" || fresh.code === "kraken-ranking-unreadable") return fresh;
    const lastAttemptAt = Number(fresh.lastAttemptAt) || 0;
    if (lastAttemptAt > 0 && current - lastAttemptAt < CHARACTERS_CRYPTO_RANKING_RETRY_MS) {
      return failure("crypto-ranking-cooldown", "The Kraken crypto ranking was just checked. Disc3 stays held until its bounded retry window ends.");
    }
  }
  if (!allowFetch) return failure("crypto-ranking-cache-miss", "A fresh Kraken Spot ranking is not cached; no provider request was sent.");
  if (!db || typeof db.prepare !== "function") {
    return failure("kraken-ledger-unavailable", "Bind COMMUNITY_DB and apply migration 0010 plus the Kraken provider migration before refreshing Disc3.");
  }
  if (typeof fetcher !== "function") return failure("kraken-unavailable", "Kraken public Spot data is unavailable in this Worker runtime.");
  if (typeof beforeFetch !== "function") {
    return failure("kraken-ledger-unavailable", "The shared Kraken pacing and daily safety limits must be reserved before the public Ticker request.");
  }
  if (inFlight) return inFlight;

  const run = (async () => {
    const gate = await beforeFetch();
    if (!gate || gate.ok !== true) {
      return failure(gate && gate.code || "kraken-ledger-unavailable",
        gate && gate.message || "The Kraken ranking request was held before provider work.",
        gate && gate.retryAfterMs ? { retryAfterMs: gate.retryAfterMs } : {});
    }
    const refreshClaim = await claimRankingRefresh(db, current);
    if (!refreshClaim.ok) return refreshClaim;

    const url = new URL(KRAKEN_TICKER_PATH, KRAKEN_PUBLIC_ORIGIN);
    url.searchParams.set("assetVersion", "1");
    const timeout = Number.isFinite(Number(timeoutMs)) ? Math.max(1, Number(timeoutMs)) : FETCH_TIMEOUT_MS;
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;
    try {
      const response = await fetcher(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        redirect: "manual",
        ...(controller ? { signal: controller.signal } : {})
      });
      if (!response || !response.ok) {
        const status = Number(response && response.status) || 0;
        if (status === 429) return failure("kraken-rate-limit", "Kraken refused the public Ticker request. The shared pacing guard remains in force.");
        return failure("kraken-upstream", "Kraken could not provide its public Spot Ticker snapshot right now.");
      }
      let payload;
      try { payload = await response.json(); }
      catch { return failure("kraken-unreadable", "Kraken returned unreadable public Ticker data."); }
      if (Array.isArray(payload && payload.error) && payload.error.length) {
        const rateLimited = payload.error.some(error => /rate|limit|throttl/i.test(String(error)));
        return failure(rateLimited ? "kraken-rate-limit" : "kraken-upstream",
          rateLimited ? "Kraken refused the public Ticker request under its endpoint limits." : "Kraken reported an error for the public Spot Ticker request.");
      }
      const ranking = normalizeKrakenTicker(payload, { at: current });
      if (!ranking) {
        return failure("kraken-ranking-unreadable", "Kraken did not return at least 52 unique USD-quoted Spot pairs with positive rolling-24-hour volume and VWAP. Disc3 was not padded or substituted.");
      }
      const expiresAt = current + CHARACTERS_CRYPTO_RANKING_TTL_MS;
      if (!await writeRankingCache(db, ranking, current, expiresAt)) {
        return failure("kraken-cache-write", "The Kraken ranking was not stored in the shared D1 cache. Disc3 remains held rather than returning an isolate-only roster.");
      }
      cached = { ranking, expiresAt };
      return { ok: true, ranking, cached: false, source: "kraken" };
    } catch (error) {
      return failure(error && error.name === "AbortError" ? "kraken-timeout" : "kraken-unreachable",
        error && error.name === "AbortError"
          ? "Kraken's public Spot Ticker request timed out. Try again after the bounded retry window."
          : "Kraken's public Spot Ticker endpoint could not be reached from this Worker.");
    } finally {
      if (timer !== null) clearTimeout(timer);
    }
  })();
  inFlight = run;
  try { return await run; }
  finally { if (inFlight === run) inFlight = null; }
}

function routeStatus(code) {
  if (["kraken-rate-limit", "kraken-budget-exhausted", "crypto-ranking-cooldown"].includes(code)) return 429;
  if (["kraken-not-configured", "kraken-ledger-unavailable", "kraken-cache-unavailable", "kraken-cache-write"].includes(code)) return 503;
  if (code === "kraken-timeout") return 504;
  return 502;
}

export async function handleCharactersDiscCatalog(request, env = {}, dependencies = {}) {
  const url = new URL(request.url);
  if (url.pathname !== "/api/characters/v1/discs") {
    return Response.json({ success: false, message: "Characters Disc catalog route not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  if (request.method !== "GET") {
    return Response.json({ success: false, message: "The Characters Disc catalog is read-only." }, { status: 405, headers: { Allow: "GET", "Cache-Control": "no-store" } });
  }
  const disc = (url.searchParams.get("disc") || "").trim().toLowerCase();
  if (disc !== "crypto") {
    return Response.json({ success: false, message: "Only the Kraken public Spot crypto ranking is served by this catalog route." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const rawNow = typeof dependencies.now === "function" ? dependencies.now() : Date.now();
  const now = Number.isFinite(Number(rawNow)) && Number(rawNow) >= 0 ? Math.floor(Number(rawNow)) : Date.now();
  const fetcher = dependencies.fetch || dependencies.fetcher || globalThis.fetch;
  const beforeFetch = dependencies.beforeFetch || (() => claimKrakenCall(env.COMMUNITY_DB, now));
  const result = await getCharactersCryptoRanking({
    db: env.COMMUNITY_DB,
    fetcher,
    now,
    timeoutMs: dependencies.timeoutMs || FETCH_TIMEOUT_MS,
    forceRefresh: dependencies.forceCryptoRankingRefresh === true,
    beforeFetch
  });
  if (!result.ok) {
    return Response.json({ success: false, message: result.message, code: result.code }, {
      status: routeStatus(result.code), headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
    });
  }
  return Response.json({
    success: true,
    disc: "crypto",
    ranking: {
      provider: result.ranking.provider,
      venue: result.ranking.venue,
      metric: result.ranking.metric,
      sourceWindow: result.ranking.sourceWindow,
      sourceDate: result.ranking.sourceDate,
      rankedAt: result.ranking.rankedAt,
      cached: result.cached,
      audit: result.ranking.audit
    },
    instruments: result.ranking.instruments
  }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

export const charactersCryptoRankingInternals = Object.freeze({
  normalizeKrakenTicker,
  sanitizeCachedRanking,
  utcDate,
  canonicalBase,
  nextUtcMidnight,
  CACHE_SELECT,
  CACHE_CLAIM,
  CACHE_WRITE
});
