/* Massive-only Disc3 constituent ranking.
 *
 * One grouped daily-aggregate request supplies the full crypto market. We keep
 * only unique X:{BASE}USD pairs with an observed VWAP, rank by Massive's
 * reported base volume × VWAP, and hold the previous UTC day's top 52. This is
 * ranking metadata only; the Worker fetches each selected pair's reviewed
 * Massive 1d history through characters-massive.mjs.
 *
 * A bounded D1 cache shares the roster across Worker isolates. A failed refresh
 * does not make an expired ranking fresh, and missing market fields are never
 * filled from another vendor or guessed from a ticker name.
 */

import { reserveMassiveProviderCall } from "./massive-call-guard.mjs";

export const MASSIVE_CRYPTO_GROUPED_PATH = "/v2/aggs/grouped/locale/global/market/crypto";
export const CHARACTERS_CRYPTO_RANKING_TTL_MS = 24 * 60 * 60_000;
export const CHARACTERS_CRYPTO_RANKING_RETRY_MS = 15 * 60_000;
export const CHARACTERS_CRYPTO_RANKING_SIZE = 52;
const MASSIVE_ORIGIN = "https://api.massive.com";
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
const previousUtcDate = at => new Date(Number(at) - 86_400_000).toISOString().slice(0, 10);
const nextUtcMidnight = at => {
  const date = new Date(Number(at));
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1);
};
const stablecoinSymbols = /^(USDT|USDC|USDE|DAI|USDS|USDD|FDUSD|TUSD|PYUSD|USDP|GUSD|FRAX|USDX)$/;

function readNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim())) return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeGroupedCryptoAggregates(payload, { at = Date.now(), sourceDate = previousUtcDate(at) } = {}) {
  if (!isRecord(payload) || !Array.isArray(payload.results) || !dateStamp(sourceDate)) return null;
  const candidatesBySymbol = new Map();
  for (const row of payload.results) {
    if (!isRecord(row)) continue;
    const ticker = typeof row.T === "string" ? row.T.trim().toUpperCase()
      : typeof row.ticker === "string" ? row.ticker.trim().toUpperCase() : "";
    const match = /^X:([A-Z0-9]{2,12})USD$/.exec(ticker);
    if (!match) continue; // No cross-quote conversion or non-USD ticker substitution.
    const symbol = match[1];
    const baseVolume = readNumber(row.v);
    const vwap = readNumber(row.vw);
    if (!finitePositive(baseVolume) || !finitePositive(vwap)) continue;
    const volumeUsd = baseVolume * vwap;
    if (!finitePositive(volumeUsd)) continue;
    const currentPriceUsd = readNumber(row.c);
    const previous = candidatesBySymbol.get(symbol);
    if (!previous || volumeUsd > previous.volumeUsd) {
      candidatesBySymbol.set(symbol, {
        symbol,
        massiveTicker: ticker,
        volumeUsd,
        currentPriceUsd: finitePositive(currentPriceUsd) ? currentPriceUsd : null
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
    /* The grouped aggregates endpoint does not publish market capitalization.
       Keep it missing rather than borrowing a value from another data vendor. */
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
      rankingProvider: "Massive",
      providerId: entry.massiveTicker,
      massiveTicker: entry.massiveTicker,
      rank: index + 1,
      providerRank: index + 1,
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
  const rankingAudit = Object.freeze({
    policy: `Massive grouped crypto aggregates for ${sourceDate}; unique USD pairs with positive reported volume and VWAP, ranked by volume × VWAP. No investment-quality or listing-legitimacy screen.`,
    sourceDate,
    candidateCount: sorted.length,
    stablecoinCandidateCount: stablecoinCandidates.length,
    stablecoinCandidates: Object.freeze(stablecoinCandidates),
    missingMarketCapCount: instruments.length,
    missingVwapCount: 0,
    extremeNominalPriceCandidates: Object.freeze(extremeNominalPriceCandidates),
    warnings: Object.freeze([
      "Ranking uses the previous UTC calendar day's Massive aggregate, not a rolling 24-hour coin-level ranking.",
      "Only Massive USD-quoted pairs with a reported VWAP are eligible; unreported values remain missing.",
      "Stablecoin candidates remain eligible by volume and are flagged for operator review.",
      "This aggregate endpoint has no market-cap field; no value is borrowed or inferred."
    ])
  });
  return Object.freeze({
    provider: "Massive",
    metric: `previous UTC day USD notional (base volume × VWAP) · ${sourceDate}`,
    sourceDate,
    rankedAt: new Date(Number(at)).toISOString(),
    audit: rankingAudit,
    instruments: Object.freeze(instruments)
  });
}

function sanitizeCachedRanking(value) {
  if (!isRecord(value) || value.provider !== "Massive" || !dateStamp(value.sourceDate) ||
      typeof value.rankedAt !== "string" || !Number.isFinite(Date.parse(value.rankedAt)) ||
      !Array.isArray(value.instruments) || value.instruments.length !== CHARACTERS_CRYPTO_RANKING_SIZE ||
      !isRecord(value.audit) || value.audit.sourceDate !== value.sourceDate) return null;
  const seen = new Set();
  const instruments = [];
  for (let index = 0; index < value.instruments.length; index += 1) {
    const entry = value.instruments[index];
    if (!isRecord(entry)) return null;
    const symbol = typeof entry.symbol === "string" ? entry.symbol.toUpperCase() : "";
    const massiveTicker = typeof entry.massiveTicker === "string" ? entry.massiveTicker.toUpperCase() : "";
    if (!/^[A-Z0-9]{2,12}$/.test(symbol) || massiveTicker !== `X:${symbol}USD` || seen.has(symbol) ||
        entry.rankingProvider !== "Massive" || entry.assetClass !== "crypto" || entry.discId !== "crypto" ||
        entry.rank !== index + 1 || !finitePositive(entry.volumeUsd) ||
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
      rankingProvider: "Massive",
      providerId: massiveTicker,
      massiveTicker,
      rank: index + 1,
      providerRank: index + 1,
      volumeUsd: entry.volumeUsd,
      currentPriceUsd: finitePositive(entry.currentPriceUsd) ? entry.currentPriceUsd : null,
      marketCapUsd: null,
      audit: Object.freeze(audit)
    }));
  }
  return Object.freeze({
    provider: "Massive",
    metric: String(value.metric).slice(0, 96),
    sourceDate: value.sourceDate,
    rankedAt: new Date(Date.parse(value.rankedAt)).toISOString(),
    audit: Object.freeze({
      policy: String(value.audit.policy || "").slice(0, 320),
      sourceDate: value.sourceDate,
      candidateCount: Math.max(CHARACTERS_CRYPTO_RANKING_SIZE, Math.floor(Number(value.audit.candidateCount) || CHARACTERS_CRYPTO_RANKING_SIZE)),
      stablecoinCandidateCount: instruments.filter(entry => entry.audit.includes("stablecoin-candidate")).length,
      stablecoinCandidates: Object.freeze(instruments.filter(entry => entry.audit.includes("stablecoin-candidate"))
        .map(entry => ({ rank: entry.rank, symbol: entry.symbol }))),
      missingMarketCapCount: instruments.length,
      missingVwapCount: 0,
      extremeNominalPriceCandidates: Object.freeze(instruments.filter(entry => entry.currentPriceUsd !== null && entry.currentPriceUsd >= 1_000_000)
        .map(entry => ({ rank: entry.rank, symbol: entry.symbol, currentPriceUsd: entry.currentPriceUsd }))),
      warnings: Object.freeze(Array.isArray(value.audit.warnings) ? value.audit.warnings.filter(note => typeof note === "string").slice(0, 8).map(note => note.slice(0, 220)) : [])
    }),
    instruments: Object.freeze(instruments)
  });
}

async function readCacheRow(db) {
  if (!db || typeof db.prepare !== "function") return { ok: true, row: null };
  try {
    return { ok: true, row: await db.prepare(CACHE_SELECT).first() };
  } catch {
    return { ok: false, row: null };
  }
}

async function claimRankingRefresh(db, now) {
  if (!db || typeof db.prepare !== "function") {
    return failure("massive-ledger-unavailable", "Bind COMMUNITY_DB and apply migration 0010 before refreshing the Massive crypto ranking.");
  }
  try {
    const row = await db.prepare(CACHE_CLAIM)
      .bind(now, now, now - CHARACTERS_CRYPTO_RANKING_RETRY_MS)
      .first();
    if (row) return { ok: true };
    return failure("crypto-ranking-cooldown", "The Massive crypto ranking was just checked. Disc3 stays held until its bounded retry window ends.");
  } catch {
    return failure("massive-ledger-unavailable", "The Massive crypto ranking cache is unavailable. Apply migration 0010 and retry.");
  }
}

async function writeRankingCache(db, ranking, now, expiresAt) {
  try {
    await db.prepare(CACHE_WRITE)
      .bind(JSON.stringify(ranking), now, expiresAt, now, now)
      .run();
    return true;
  } catch { return false; }
}

export function clearCharactersCryptoRankingCache() {
  cached = null;
  inFlight = null;
}

/** Read the current valid ranking without making any provider request. */
export async function readCharactersCryptoRankingCache({ db, now = Date.now() } = {}) {
  const current = Number.isFinite(Number(now)) ? Number(now) : Date.now();
  if ((!db || typeof db.prepare !== "function") && cached && cached.expiresAt > current &&
      cached.ranking.sourceDate === previousUtcDate(current)) {
    return { ok: true, ranking: cached.ranking, cached: true, source: "isolate" };
  }
  if (cached && cached.ranking.sourceDate !== previousUtcDate(current)) cached = null;
  const result = await readCacheRow(db);
  if (!result.ok) return failure("massive-ledger-unavailable", "The Massive crypto ranking cache is unreadable. No provider request was sent.");
  const expiresAt = Number(result.row && result.row.expires_at) || 0;
  if (!result.row || expiresAt <= current || typeof result.row.ranking_json !== "string") {
    return failure("crypto-ranking-cache-miss", "A fresh Massive crypto ranking is not cached; no provider request was sent.", {
      lastAttemptAt: Number(result.row && result.row.last_attempt_at) || 0
    });
  }
  let parsed;
  try { parsed = JSON.parse(result.row.ranking_json); } catch { parsed = null; }
  const ranking = sanitizeCachedRanking(parsed);
  if (!ranking) return failure("massive-ranking-unreadable", "The cached Massive crypto ranking did not pass validation. No stale constituent list was substituted.");
  if (ranking.sourceDate !== previousUtcDate(current)) {
    return failure("crypto-ranking-cache-miss", "The cached Massive ranking is no longer for the previous UTC day; Disc3 stays held until a fresh ranking is available.", {
      lastAttemptAt: Number(result.row && result.row.last_attempt_at) || 0
    });
  }
  cached = { ranking, expiresAt };
  return { ok: true, ranking, cached: true, source: "d1" };
}

/**
 * Read (or refresh) the Massive-only crypto ranking. `beforeFetch` must reserve
 * the shared Massive minute and D1 daily allowances before any outbound call.
 */
export async function getCharactersCryptoRanking({
  apiKey,
  db,
  fetcher = globalThis.fetch,
  now = Date.now(),
  timeoutMs = FETCH_TIMEOUT_MS,
  forceRefresh = false,
  allowFetch = true,
  beforeFetch
} = {}) {
  const current = Number.isFinite(Number(now)) ? Number(now) : Date.now();
  if (!forceRefresh) {
    const fresh = await readCharactersCryptoRankingCache({ db, now: current });
    if (fresh.ok) return fresh;
    if (!allowFetch) return fresh;
    if (fresh.code === "massive-ledger-unavailable" || fresh.code === "massive-ranking-unreadable") return fresh;
    const lastAttemptAt = Number(fresh.lastAttemptAt) || 0;
    if (lastAttemptAt > 0 && current - lastAttemptAt < CHARACTERS_CRYPTO_RANKING_RETRY_MS) {
      return failure("crypto-ranking-cooldown", "The Massive crypto ranking was just checked. Disc3 stays held until its bounded retry window ends.");
    }
  }
  if (!allowFetch) return failure("crypto-ranking-cache-miss", "A fresh Massive crypto ranking is not cached; no provider request was sent.");
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    return failure("massive-not-configured", "Add the MASSIVE_API_KEY Worker secret to load the Massive crypto ranking.");
  }
  if (!db || typeof db.prepare !== "function") {
    return failure("massive-ledger-unavailable", "Bind COMMUNITY_DB and apply migrations 0007 and 0010 before refreshing the Massive crypto ranking.");
  }
  if (typeof fetcher !== "function") return failure("massive-unavailable", "Massive is unavailable in this Worker runtime.");
  if (typeof beforeFetch !== "function") {
    return failure("massive-ledger-unavailable", "The Massive minute and daily allowances must be reserved before reading the crypto ranking.");
  }
  if (inFlight) return inFlight;

  const run = (async () => {
    const gate = await beforeFetch();
    if (!gate || gate.ok !== true) {
      return failure(gate && gate.code || "massive-ledger-unavailable",
        gate && gate.message || "The Massive crypto ranking request was held before provider work.",
        gate && gate.retryAfter ? { retryAfter: gate.retryAfter } : {});
    }
    const refreshClaim = await claimRankingRefresh(db, current);
    if (!refreshClaim.ok) return refreshClaim;

    const sourceDate = previousUtcDate(current);
    const url = new URL(`${MASSIVE_CRYPTO_GROUPED_PATH}/${sourceDate}`, MASSIVE_ORIGIN);
    url.searchParams.set("adjusted", "true");
    const timeout = Number.isFinite(Number(timeoutMs)) ? Math.max(1, Number(timeoutMs)) : FETCH_TIMEOUT_MS;
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;
    try {
      const response = await fetcher(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json", Authorization: `Bearer ${apiKey.trim()}` },
        redirect: "manual",
        ...(controller ? { signal: controller.signal } : {})
      });
      if (!response || !response.ok) {
        const status = Number(response && response.status) || 0;
        if (status === 429) return failure("massive-rate-limit", "Massive's per-minute request envelope was reached. Wait before refreshing Disc3.");
        if (status === 401 || status === 403) return failure("massive-unauthorized", "Massive rejected the Worker key. Check the MASSIVE_API_KEY secret and crypto-plan access.");
        return failure("massive-upstream", "Massive could not provide the grouped crypto aggregates right now.");
      }
      let payload;
      try { payload = await response.json(); }
      catch { return failure("massive-unreadable", "Massive returned unreadable grouped crypto aggregates."); }
      const ranking = normalizeGroupedCryptoAggregates(payload, { at: current, sourceDate });
      if (!ranking) {
        return failure("massive-ranking-unreadable", "Massive did not return at least 52 unique USD crypto pairs with positive volume and VWAP. Disc3 was not padded or substituted.");
      }
      const expiresAt = Math.min(current + CHARACTERS_CRYPTO_RANKING_TTL_MS, nextUtcMidnight(current));
      cached = { ranking, expiresAt };
      await writeRankingCache(db, ranking, current, expiresAt);
      return { ok: true, ranking, cached: false, source: "massive" };
    } catch (error) {
      return failure(error && error.name === "AbortError" ? "massive-timeout" : "massive-unreachable",
        error && error.name === "AbortError"
          ? "Massive's grouped crypto ranking request timed out. Try again shortly."
          : "Massive's grouped crypto ranking endpoint could not be reached from this Worker.");
    } finally {
      if (timer !== null) clearTimeout(timer);
    }
  })();
  inFlight = run;
  try { return await run; }
  finally { if (inFlight === run) inFlight = null; }
}

function routeStatus(code) {
  if (["massive-rate-limit", "massive-budget-exhausted", "crypto-ranking-cooldown"].includes(code)) return 429;
  if (["massive-not-configured", "massive-ledger-unavailable"].includes(code)) return 503;
  if (code === "massive-timeout") return 504;
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
    return Response.json({ success: false, message: "Only the Massive-backed crypto ranking is served by this catalog route." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const rawNow = typeof dependencies.now === "function" ? dependencies.now() : Date.now();
  const now = Number.isFinite(Number(rawNow)) ? Math.floor(Number(rawNow)) : Date.now();
  const fetcher = dependencies.fetch || dependencies.fetcher || globalThis.fetch;
  const result = await getCharactersCryptoRanking({
    apiKey: env.MASSIVE_API_KEY,
    db: env.COMMUNITY_DB,
    fetcher,
    now,
    timeoutMs: dependencies.timeoutMs || FETCH_TIMEOUT_MS,
    beforeFetch: dependencies.beforeFetch || (() => reserveMassiveProviderCall({ request, env, now }))
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
      metric: result.ranking.metric,
      sourceDate: result.ranking.sourceDate,
      rankedAt: result.ranking.rankedAt,
      cached: result.cached,
      audit: result.ranking.audit
    },
    instruments: result.ranking.instruments
  }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

export const charactersCryptoRankingInternals = Object.freeze({
  normalizeGroupedCryptoAggregates,
  sanitizeCachedRanking,
  previousUtcDate
});
