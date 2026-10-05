/*
 * HarshalOS — Characters market beat route.
 *
 * Three-provider boundary:
 *   • Tickerbot: the exclusive Disc1 stock provider for daily and on-demand bars;
 *     Orb 2 also uses its bounded 15m / 1h residual queue.
 *   • Kraken public Spot: Disc3 rolling-24-hour USD-notional ranking and exact-pair daily OHLC.
 *   • Massive: reviewed FX, active commodity futures, and index daily bars only.
 *
 * Providers are selected explicitly with ?provider=. The browser includes that
 * parameter on every live beat; legacy URLs get a safe deterministic mapping.
 * Alpha Vantage/1mo is retired from new reads and writes; archive history is
 * handled separately and read-only. No provider key reaches browser code or a
 * response body. Failed outbound
 * requests consume the provider's durable ledger after an atomic claim.
 */

import {
  TICKERBOT_WATCHLIST,
  fetchTickerbotMarketContext,
  isTickerbotSymbol
} from "./good-intelligence-tickerbot.mjs";
import { fetchMassiveDailyMarketContext } from "./characters-massive.mjs";
import { getKrakenDailyMarketContext } from "./characters-kraken.mjs";
import { claimKrakenCall, readKrakenCallLedger, KRAKEN_PROVIDER_DAILY_LIMIT } from "./kraken-call-ledger.mjs";
import { claimTickerbotCall, readTickerbotCallLedger } from "./tickerbot-call-ledger.mjs";
import {
  MASSIVE_PROVIDER_DAILY_LIMIT,
  readMassiveDailyCallLedger
} from "./massive-daily-call-ledger.mjs";
import { reserveMassiveProviderCall } from "./massive-call-guard.mjs";
import { getCharactersCryptoRanking } from "./characters-crypto-ranking.mjs";
import { getMassiveActiveFuturesContract } from "./characters-futures-contracts.mjs";
import "../js/characters-disc-catalog.js";

export const CHARACTERS_BEAT_ROUTE = "/api/characters/v1/beat";
export const CHARACTERS_DEPLOY_ROUTE = "/api/characters/v1/deploy";
export const MAX_BEAT_SYMBOLS = 12;
/* Tickerbot planner cadences. Massive and Kraken use cadence=1 as a daily-bar
   contract; their provider pacing is enforced separately by shared Worker gates. */
export const BEAT_CADENCES = Object.freeze([15, 30, 60, 240, 1440]);
export const CHARACTERS_TICKERBOT_INTERVALS = Object.freeze(["1h", "1d"]);
export const MASSIVE_DISCS = Object.freeze(["fx", "commodities", "indices"]);
const DEFAULT_CADENCE = 15;
const LANES = Object.freeze(["hot", "sweep"]);
const MAX_FETCH_CONCURRENCY = 4;
const UPSTREAM_TIMEOUT_MS = 10_000;

const cache = new Map();
const json = (data, status = 200, extraHeaders = {}) => Response.json(data, {
  status,
  headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extraHeaders }
});
const failure = (message, status = 502, extraHeaders = {}) => json({ success: false, message }, status, extraHeaders);

export function clearCharactersBeatCache() {
  cache.clear();
}

/**
 * Read-only operational check for deployment tooling. Orb 2 does not call this
 * route from the browser: its first existing EURUSD beat runs the same key and
 * D1 checks inline before the Worker can contact Massive.
 */
export async function handleCharactersDeploy(request, env = {}, dependencies = {}) {
  if (request.method !== "GET") return failure("Use GET for the read-only deployment check.", 405);
  const input = typeof dependencies.now === "function" ? dependencies.now() : Date.now();
  const now = Number.isFinite(Number(input)) && Number(input) >= 0 ? Math.floor(Number(input)) : Date.now();
  const apiKey = typeof env.MASSIVE_API_KEY === "string" ? env.MASSIVE_API_KEY.trim() : "";
  const ledgerResult = await readMassiveDailyCallLedger(env.COMMUNITY_DB, now, MASSIVE_PROVIDER_DAILY_LIMIT);
  const ledgerStatus = ledgerResult.ok ? "ready" : "unavailable";
  const ready = Boolean(apiKey) && ledgerResult.ok;
  return json({
    success: ready,
    environment: "characters-beat-deploy",
    data: {
      schema: "characters-deploy-check-v1",
      route: "reachable",
      provider: "massive",
      providerSecret: apiKey ? "configured" : "missing",
      dailyLedger: ledgerStatus,
      dailyUsage: ledgerResult.ok ? ledgerResult.ledger : null,
      checkedAt: new Date(now).toISOString(),
      marketRequestSent: false
    }
  }, ready ? 200 : 503);
}

function newerTickerbotLedger(current, next) {
  if (!next) return current;
  if (!current || next.month > current.month) return next;
  if (next.month < current.month) return current;
  if (next.calls > current.calls) return next;
  if (next.calls === current.calls && Number(next.updatedAt || 0) > Number(current.updatedAt || 0)) return next;
  return current;
}

function newerDailyLedger(current, next) {
  if (!next) return current;
  if (!current || next.day > current.day) return next;
  if (next.day < current.day) return current;
  if (next.calls > current.calls) return next;
  if (next.calls === current.calls && Number(next.updatedAt || 0) > Number(current.updatedAt || 0)) return next;
  return current;
}

function parseLanes(raw) {
  const lanes = new Map();
  if (typeof raw !== "string" || !raw.trim()) return lanes;
  for (const entry of raw.split(",").slice(0, 64)) {
    const [symbol, lane] = entry.split(":").map(part => (part || "").trim().toUpperCase());
    if (!symbol || !LANES.includes(String(lane || "").toLowerCase())) continue;
    if (!lanes.has(symbol)) lanes.set(symbol, String(lane).toLowerCase());
  }
  return lanes;
}

function stockInstruments() {
  return TICKERBOT_WATCHLIST.map(entry => ({
    ...entry,
    displaySymbol: entry.symbol,
    discId: "stocks",
    assetClass: "equity",
    dataShape: "ohlcv",
    quoteCurrency: "USD"
  }));
}

function staticDiscInstruments(discId) {
  const catalog = globalThis.CharactersDiscCatalog;
  if (!catalog) return [];
  if (discId === "fx") return catalog.fxCurrencies;
  if (discId === "commodities") return catalog.commodities;
  if (discId === "indices") return catalog.indices;
  return [];
}

function parseSymbols(raw, instruments, provider) {
  if (typeof raw !== "string" || !raw.trim()) return { selected: [], rejected: [] };
  const requested = [...new Set(raw.split(",").map(entry => entry.trim().toUpperCase()).filter(Boolean))];
  const bySymbol = new Map(instruments.map(instrument => [String(instrument.symbol).toUpperCase(), instrument]));
  const selected = [];
  const rejected = [];
  for (const symbol of requested) {
    const instrument = bySymbol.get(symbol);
    /* Tickerbot may only be asked for the reviewed stock list. Massive's
       reviewed Disc lists are validated again by characters-massive.mjs. */
    if (!instrument || (provider === "tickerbot" && !isTickerbotSymbol(symbol))) rejected.push(symbol.slice(0, 32));
    else selected.push(instrument);
  }
  return { selected, rejected };
}

function statusForCode(code) {
  if ([
    "rate-limit", "budget-exhausted",
    "massive-rate-limit", "massive-budget-exhausted", "crypto-ranking-cooldown",
    "kraken-rate-limit", "kraken-budget-exhausted", "kraken-bar-cooldown",
    "massive-futures-contract-cooldown", "massive-futures-contract-rate-limited", "massive-futures-contract-circuit-open"
  ].includes(code)) return 429;
  if ([
    "ledger-unavailable", "massive-ledger-unavailable",
    "kraken-ledger-unavailable", "kraken-cache-unavailable", "kraken-cache-write", "kraken-bar-cache-unavailable", "kraken-bar-cache-write", "kraken-bar-cache-unreadable",
    "tickerbot-not-configured", "massive-not-configured",
    "tickerbot-symbol-not-covered"
  ].includes(code)) return 503;
  if (["empty", "massive-empty", "massive-futures-contract-unavailable"].includes(code)) return 404;
  if (["timeout", "massive-timeout", "kraken-timeout"].includes(code)) return 504;
  if (["massive-futures-contract-cache-unavailable", "massive-futures-contract-cache-write", "massive-futures-contract-unauthorized", "massive-futures-product-invalid"].includes(code)) return 503;
  return 502;
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

function resolveDisc(discId) {
  const catalog = globalThis.CharactersDiscCatalog;
  return catalog && catalog.disc(discId);
}

function nextUtcMidnightMs(now) {
  const day = new Date(now).toISOString().slice(0, 10);
  return Date.parse(`${day}T00:00:00.000Z`) + 86_400_000;
}

function providerFor(url, discId) {
  const raw = url.searchParams.get("provider");
  if (raw !== null && raw.trim()) {
    const provider = raw.trim().toLowerCase();
    return ["massive", "tickerbot", "kraken"].includes(provider) ? provider : null;
  }
  /* Compatibility defaults follow provider identity by Disc: Tickerbot owns
     stocks, Kraken owns crypto, and Massive owns FX/futures/indices. */
  if (discId === "crypto") return "kraken";
  if (discId === "stocks") return "tickerbot";
  return "massive";
}

function unavailableInstrument({ symbol, instrument, lane, provider, code, message, extra = {} }) {
  return {
    symbol,
    displaySymbol: instrument.displaySymbol || symbol,
    status: "unavailable",
    lane,
    provider,
    code,
    message,
    ...extra
  };
}

export async function handleCharactersBeat(request, env = {}, dependencies = {}) {
  const url = new URL(request.url);
  if (url.pathname !== CHARACTERS_BEAT_ROUTE) return failure("Characters beat route not found.", 404);
  if (request.method !== "GET") return failure("The Characters beat is read-only.", 405, { Allow: "GET" });

  const discId = (url.searchParams.get("disc") || "stocks").trim().toLowerCase();
  const disc = resolveDisc(discId);
  if (!disc) return failure("Choose a reviewed Characters Disc.", 400);

  const interval = (url.searchParams.get("interval") || "1h").trim();
  if (interval === "1mo") {
    return failure("Characters does not accept new 1mo beats. Alpha Vantage records are legacy history only; Tickerbot is the exclusive Stocks provider.", 400);
  }
  const provider = providerFor(url, discId);
  if (!provider) {
    return failure("Choose provider=tickerbot (Disc1 stocks), provider=kraken (Disc3 crypto), or provider=massive (FX/commodities/indices).", 400);
  }
  if (provider === "massive" && interval !== "1d") {
    return failure("Massive Characters beats are restricted to interval=1d.", 400);
  }
  if (provider === "kraken" && (discId !== "crypto" || interval !== "1d")) {
    return failure("Kraken public Spot Characters beats are restricted to Disc3 crypto interval=1d.", 400);
  }
  if (provider === "tickerbot" && (!CHARACTERS_TICKERBOT_INTERVALS.includes(interval) || discId !== "stocks")) {
    return failure("Tickerbot serves reviewed Disc1 stocks only at interval=1h or interval=1d in Characters.", 400);
  }
  if (provider === "massive" && !MASSIVE_DISCS.includes(discId)) {
    return failure("Massive serves reviewed FX, commodity-futures, and index daily bars only; stocks and crypto have separate providers.", 400);
  }
  const rawSymbols = url.searchParams.get("symbols");
  if (typeof rawSymbols !== "string" || !rawSymbols.trim()) return failure("Choose at least one instrument from this Disc.", 400);
  const requestedSymbols = [...new Set(rawSymbols.split(",").map(entry => entry.trim().toUpperCase()).filter(Boolean))];
  if (!requestedSymbols.length) return failure("Choose at least one instrument from this Disc.", 400);
  if (requestedSymbols.length > MAX_BEAT_SYMBOLS) {
    return failure(`One beat may request at most ${MAX_BEAT_SYMBOLS} instruments; ${requestedSymbols.length} were requested.`, 400);
  }

  /* Fixed daily provider modes request one reviewed symbol per Worker call.
     Tickerbot's stock planner remains bounded. The route enforces these
     provider/cadence contracts against crafted URLs. */
  const cadenceParam = url.searchParams.get("cadence");
  const requestedCadence = Number(cadenceParam);
  if (["massive", "kraken"].includes(provider) && requestedSymbols.length !== 1) {
    return failure(`${provider === "kraken" ? "Kraken" : "Massive"} daily beats request exactly one reviewed instrument per Worker request; cadence=1 identifies the daily-bar contract.`, 400);
  }
  if (["massive", "kraken"].includes(provider) && cadenceParam !== null && requestedCadence !== 1) {
    return failure(`${provider === "kraken" ? "Kraken" : "Massive"} daily beats use exactly cadence=1 for the daily-bar contract; request pacing is enforced separately.`, 400);
  }

  const now = typeof dependencies.now === "function" ? dependencies.now() : Date.now();
  const fetcher = dependencies.fetch || globalThis.fetch;
  if (typeof fetcher !== "function") return failure("No market-data provider is available in this Worker runtime.", 503);
  const tickerbotApiKey = typeof env.TICKERBOT_API_KEY === "string" ? env.TICKERBOT_API_KEY.trim() : "";
  const massiveApiKey = typeof env.MASSIVE_API_KEY === "string" ? env.MASSIVE_API_KEY.trim() : "";

  let allowedInstruments = discId === "stocks" ? stockInstruments() : staticDiscInstruments(discId);
  let cryptoRanking = null;
  let massiveRankingAttempts = 0;
  let krakenRankingAttempts = 0;
  let krakenBarAttempts = 0;
  let krakenDaily = null;
  let krakenLedgerStatus = "not-applicable";
  let massiveContractAttempts = 0;
  if (provider === "massive" && discId === "commodities") {
    const requestedCommodity = allowedInstruments.find(instrument =>
      String(instrument && instrument.symbol || "").toUpperCase() === requestedSymbols[0]);
    const productCode = String(requestedCommodity && requestedCommodity.massive && requestedCommodity.massive.productCode || "").toUpperCase();
    if (requestedCommodity && /^[A-Z0-9]{1,8}$/.test(productCode)) {
      const contractResult = await getMassiveActiveFuturesContract({
        productCode, apiKey: massiveApiKey, db: env.COMMUNITY_DB, fetcher, now,
        timeoutMs: UPSTREAM_TIMEOUT_MS,
        beforeFetch: async () => {
          const reservation = await reserveMassiveProviderCall({ request, env, now });
          if (reservation.ok) massiveContractAttempts = 1;
          return reservation;
        }
      });
      if (!contractResult.ok) return failure(contractResult.message, statusForCode(contractResult.code),
        contractResult.retryAfter ? { "Retry-After": String(Math.ceil(contractResult.retryAfter / 1000)) } : {});
      const contract = contractResult.contract;
      allowedInstruments = allowedInstruments.map(instrument => instrument === requestedCommodity ? {
        ...instrument,
        massive: { ...instrument.massive, ticker: contract.ticker, family: "futures" },
        massiveTicker: contract.ticker,
        providerId: contract.ticker,
        massiveContract: contract
      } : instrument);
    }
  }
  if (provider === "kraken") {
    const rankingResult = await getCharactersCryptoRanking({
      db: env.COMMUNITY_DB,
      fetcher,
      now,
      timeoutMs: UPSTREAM_TIMEOUT_MS,
      forceRefresh: dependencies.forceCryptoRankingRefresh === true,
      beforeFetch: async () => {
        const reserve = dependencies.beforeKrakenFetch || dependencies.beforeFetch;
        const reservation = typeof reserve === "function"
          ? await reserve()
          : await claimKrakenCall(env.COMMUNITY_DB, now, KRAKEN_PROVIDER_DAILY_LIMIT);
        if (reservation.ok) krakenRankingAttempts = 1;
        if (reservation.ledger) krakenDaily = reservation.ledger;
        krakenLedgerStatus = reservation.ok || reservation.ledger ? "ready" : "unavailable";
        return reservation;
      }
    });
    if (!rankingResult.ok) {
      const ledgerResult = await readKrakenCallLedger(env.COMMUNITY_DB, now);
      if (ledgerResult.ok && (!krakenDaily || ledgerResult.ledger.calls >= krakenDaily.calls)) krakenDaily = ledgerResult.ledger;
      krakenLedgerStatus = ledgerResult.ok || krakenDaily ? "ready" : "unavailable";
      const failureInstruments = requestedSymbols.map(symbol => unavailableInstrument({
        symbol, instrument: { symbol, displaySymbol: symbol }, lane: null, provider: "kraken",
        code: rankingResult.code, message: rankingResult.message
      }));
      const attemptCount = krakenRankingAttempts;
      const headers = rankingResult.retryAfterMs > 0
        ? { "Retry-After": String(Math.max(1, Math.ceil(rankingResult.retryAfterMs / 1000))) }
        : rankingResult.code === "crypto-ranking-cooldown" ? { "Retry-After": "900" }
          : {};
      return json({
        success: false, message: rankingResult.message, environment: "characters-beat",
        data: {
          schema: "characters-beat-v1", disc: discId, provider, beatAt: new Date(now).toISOString(),
          interval, cadenceMinutes: 1, holdMs: nextUtcMidnightMs(now) - now,
          instruments: failureInstruments, sourceIdentities: [],
          spend: {
            requestedSymbols: requestedSymbols.length, providerAttempts: attemptCount,
            tickerbotAttempts: 0, massiveAttempts: 0,
            krakenAttempts: attemptCount, krakenRankingAttempts: attemptCount, krakenBarAttempts: 0,
            cacheHits: 0, unavailable: failureInstruments.length, krakenDaily, krakenLedgerStatus,
            note: "Disc3 requires a fresh, validated Kraken Spot rolling-24-hour roster. No stale roster, other venue, or inferred pair identity was substituted."
          }
        }
      }, statusForCode(rankingResult.code), headers);
    }
    cryptoRanking = rankingResult.ranking;
    allowedInstruments = cryptoRanking.instruments;
  }

  const { selected, rejected } = parseSymbols(rawSymbols, allowedInstruments, provider);
  if (!selected.length) return failure(`No requested instrument is on the reviewed ${disc.label} catalog.`, 400);
  if (rejected.length) return failure(`These instruments are not available through ${provider} on ${disc.label}: ${rejected.join(", ")}.`, 400);

  const lanes = parseLanes(url.searchParams.get("lanes"));
  const cadenceMinutes = provider === "massive" || provider === "kraken" ? 1
    : interval === "1d" ? 1440
      : (BEAT_CADENCES.includes(requestedCadence) ? requestedCadence : DEFAULT_CADENCE);

  if (provider === "tickerbot" && !tickerbotApiKey) {
    return failure("Tickerbot is not configured on this Worker. Add the TICKERBOT_API_KEY Worker secret for on-demand stock data.", 503);
  }
  if (provider === "massive" && !massiveApiKey) {
    return failure("Massive daily bars are not configured. Add the MASSIVE_API_KEY Worker secret for reviewed FX, futures, or index data.", 503);
  }

  const tickerbotHeld = provider === "tickerbot"
    ? await readTickerbotCallLedger(env.COMMUNITY_DB, now)
    : { ok: false, reason: "not-applicable" };
  let durable = tickerbotHeld.ok ? tickerbotHeld.ledger : null;
  let ledgerStatus = provider === "tickerbot" ? (tickerbotHeld.ok ? "ready" : "unavailable") : "not-applicable";

  const massiveHeld = provider === "massive"
    ? await readMassiveDailyCallLedger(env.COMMUNITY_DB, now, MASSIVE_PROVIDER_DAILY_LIMIT)
    : { ok: false, reason: "not-applicable" };
  let massiveDaily = massiveHeld.ok ? massiveHeld.ledger : null;
  let massiveLedgerStatus = provider === "massive" ? (massiveHeld.ok ? "ready" : "unavailable") : "not-applicable";

  const krakenHeld = provider === "kraken"
    ? await readKrakenCallLedger(env.COMMUNITY_DB, now)
    : { ok: false, reason: "not-applicable" };
  if (provider === "kraken" && krakenHeld.ok) {
    if (!krakenDaily || krakenHeld.ledger.calls >= krakenDaily.calls) krakenDaily = krakenHeld.ledger;
    krakenLedgerStatus = "ready";
  } else if (provider === "kraken" && !krakenHeld.ok) {
    krakenLedgerStatus = "unavailable";
  }

  const holdMs = provider === "massive" || provider === "kraken" || (provider === "tickerbot" && interval === "1d")
    ? nextUtcMidnightMs(now) - now
    : cadenceMinutes * 60_000;
  let tickerbotAttempts = 0;
  let massiveAttempts = 0;
  let cacheHits = 0;

  const instruments = await mapWithConcurrency(selected, MAX_FETCH_CONCURRENCY, async instrument => {
    const symbol = String(instrument.symbol).trim().toUpperCase();
    const lane = lanes.get(symbol) || null;
    const key = `${discId}:${provider}:${symbol}:${interval}:${instrument.providerId || ""}`;
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now) {
      cacheHits += 1;
      return { symbol, displaySymbol: instrument.displaySymbol || symbol, status: "cached", lane, provider: cached.provider, marketContext: cached.packet };
    }
    if (cached) cache.delete(key);

    if (provider === "kraken") {
      const result = await getKrakenDailyMarketContext({
        instrument, db: env.COMMUNITY_DB, fetcher, now, timeoutMs: UPSTREAM_TIMEOUT_MS,
        beforeFetch: async () => {
          const reserve = dependencies.beforeKrakenFetch || dependencies.beforeFetch;
          const reservation = typeof reserve === "function"
            ? await reserve()
            : await claimKrakenCall(env.COMMUNITY_DB, now, KRAKEN_PROVIDER_DAILY_LIMIT);
          if (reservation.ok) krakenBarAttempts += 1;
          if (reservation.ledger) krakenDaily = reservation.ledger;
          if (reservation.ok || reservation.ledger) krakenLedgerStatus = "ready";
          else krakenLedgerStatus = "unavailable";
          return reservation;
        }
      });
      if (!result.ok) {
        return unavailableInstrument({
          symbol, instrument, lane, provider: "kraken", code: result.code, message: result.message,
          extra: {
            ...(result.retryAfterMs ? { retryAfterMs: result.retryAfterMs } : {}),
            ...(result.ledger ? { krakenDaily: result.ledger } : {})
          }
        });
      }
      cache.set(key, { packet: result.packet, provider: "kraken", expiresAt: nextUtcMidnightMs(now) });
      return { symbol, displaySymbol: instrument.displaySymbol || symbol, status: result.cached ? "cached" : "bars", lane, provider: "kraken", marketContext: result.packet };
    }

    if (provider === "massive") {
      if (massiveDaily && massiveDaily.exhausted) {
        return unavailableInstrument({
          symbol, instrument, lane, provider: "massive", code: "massive-budget-exhausted",
          message: `The Characters Massive allowance is exhausted for ${massiveDaily.day}: ${massiveDaily.calls.toLocaleString()} of ${massiveDaily.dailyLimit.toLocaleString()} Worker-routed requests. No Massive request was sent.`
        });
      }
      /* Reserve both shared Massive allowances before provider work. Only
         FX, active commodity futures, and indices reach this branch; Kraken's
         Crypto ranking and pair bars use their separate public-call ledger. */
      const reservation = await reserveMassiveProviderCall({ request, env, now });
      if (!reservation.ok) {
        if (reservation.ledger) massiveDaily = newerDailyLedger(massiveDaily, reservation.ledger);
        massiveLedgerStatus = reservation.code === "massive-budget-exhausted" ? "ready"
          : reservation.code === "massive-ledger-unavailable" ? "unavailable" : massiveLedgerStatus;
        return unavailableInstrument({
          symbol, instrument, lane, provider: "massive", code: reservation.code, message: reservation.message,
          extra: {
            ...(reservation.ledger ? { massiveDaily: reservation.ledger } : {}),
            ...(reservation.retryAfter ? { retryAfter: reservation.retryAfter } : {})
          }
        });
      }
      massiveDaily = newerDailyLedger(massiveDaily, reservation.ledger);
      massiveLedgerStatus = "ready";
      massiveAttempts += 1;
      const result = await fetchMassiveDailyMarketContext({
        instrument: { ...instrument, interval: "1d" },
        symbol,
        apiKey: massiveApiKey,
        fetcher,
        now,
        timeoutMs: UPSTREAM_TIMEOUT_MS,
        dependencies
      });
      if (!result.ok) {
        const { retryAfterSeconds, retryAfter, ...rest } = result;
        return unavailableInstrument({
          symbol, instrument, lane, provider: "massive", code: rest.code, message: rest.message,
          extra: { ...rest, ...(Number(retryAfterSeconds) > 0 ? { retryAfter: String(retryAfterSeconds) } : {}), ...(retryAfter ? { retryAfter: String(retryAfter) } : {}) }
        });
      }
      cache.set(key, { packet: result.packet, provider: "massive", expiresAt: nextUtcMidnightMs(now) });
      return { symbol, displaySymbol: instrument.displaySymbol || symbol, status: "bars", lane, provider: "massive", marketContext: result.packet };
    }

    /* Provider=tickerbot has already been narrowed to Disc1. Keep this local
       allowlist check anyway so an accidental future catalog widening does not
       spend a Tickerbot D1 slot or hit upstream. */
    if (!isTickerbotSymbol(symbol)) {
      return unavailableInstrument({
        symbol, instrument, lane, provider: "tickerbot", code: "tickerbot-symbol-not-covered",
        message: `${symbol} is not on Tickerbot's reviewed stock allowlist. Massive covers reviewed FX, commodity-futures, and index Discs at 1d; Kraken exclusively serves Crypto.`
      });
    }
    if (durable && durable.exhausted) {
      return unavailableInstrument({
        symbol, instrument, lane, provider: "tickerbot", code: "budget-exhausted",
        message: `The Worker-routed Tickerbot allowance is exhausted for ${durable.month}: ${durable.calls.toLocaleString()} of ${durable.workerLimit.toLocaleString()} calls. No Tickerbot request was sent.`
      });
    }
    const claim = await claimTickerbotCall(env.COMMUNITY_DB, now);
    if (!claim.ok) {
      if (claim.ledger) durable = newerTickerbotLedger(durable, claim.ledger);
      ledgerStatus = claim.reason === "budget-exhausted" ? "ready" : "unavailable";
      return unavailableInstrument({
        symbol, instrument, lane, provider: "tickerbot", code: claim.reason, message: claim.message,
        extra: claim.ledger ? { durable: claim.ledger } : {}
      });
    }
    durable = newerTickerbotLedger(durable, claim.ledger);
    ledgerStatus = "ready";
    tickerbotAttempts += 1;
    const result = await fetchTickerbotMarketContext({
      symbol,
      interval,
      apiKey: tickerbotApiKey,
      fetcher,
      now,
      timeoutMs: UPSTREAM_TIMEOUT_MS,
      dependencies,
      logFailure: true
    });
    if (!result.ok) {
      return unavailableInstrument({ symbol, instrument, lane, provider: "tickerbot", code: result.code, message: result.message, extra: result });
    }
    cache.set(key, { packet: result.packet, provider: "tickerbot", expiresAt: now + holdMs });
    return { symbol, displaySymbol: instrument.displaySymbol || symbol, status: "bars", lane, provider: "tickerbot", marketContext: result.packet };
  });

  const failures = instruments.filter(instrument => instrument.status === "unavailable");
  const succeeded = instruments.length - failures.length;
  const massiveProviderAttempts = massiveAttempts + massiveRankingAttempts + massiveContractAttempts;
  const krakenAttempts = krakenRankingAttempts + krakenBarAttempts;
  const providerAttempts = tickerbotAttempts + massiveProviderAttempts + krakenAttempts;
  const data = {
    schema: "characters-beat-v1",
    disc: discId,
    provider,
    beatAt: new Date(now).toISOString(),
    interval,
    cadenceMinutes,
    holdMs,
    instruments,
    // Bind dynamic crypto symbols to the exact Kraken pair used for THIS beat.
    sourceIdentities: selected.map(instrument => ({ symbol: instrument.symbol,
      channel: discId, providerId: instrument.providerId || instrument.massiveTicker || null,
      ...(instrument.rankingProvider ? { rankingProvider: instrument.rankingProvider } : {}),
      ...(instrument.krakenPair ? { krakenPair: instrument.krakenPair } : {}),
      ...(instrument.massiveContract ? { massiveContract: instrument.massiveContract } : {}) })),
    ...(cryptoRanking ? { ranking: { provider: cryptoRanking.provider, venue: cryptoRanking.venue,
      metric: cryptoRanking.metric, sourceWindow: cryptoRanking.sourceWindow, sourceDate: cryptoRanking.sourceDate,
      rankedAt: cryptoRanking.rankedAt, audit: cryptoRanking.audit } } : {}),
    spend: {
      requestedSymbols: selected.length,
      providerAttempts,
      tickerbotAttempts,
      massiveAttempts: massiveProviderAttempts,
      massiveBarAttempts: massiveAttempts,
      massiveRankingAttempts,
      massiveContractAttempts,
      krakenAttempts,
      krakenRankingAttempts,
      krakenBarAttempts,
      cacheHits,
      unavailable: failures.length,
      lanes: {
        hot: instruments.filter(instrument => instrument.lane === "hot").map(instrument => instrument.symbol),
        sweep: instruments.filter(instrument => instrument.lane === "sweep").map(instrument => instrument.symbol),
        note: "Client-supplied lane labels are display hints only; this never changes how many calls are made, a provider allowance, or the request count."
      },
      durable,
      ledgerStatus,
      massiveDaily,
      massiveLedgerStatus,
      krakenDaily,
      krakenLedgerStatus,
      note: provider === "massive"
        ? "Massive daily bars cover reviewed FX, active futures, and indices only. The shared Massive per-minute envelope and D1 UTC-day ledger are claimed before upstream work; there is no fallback provider."
        : provider === "kraken"
          ? "Kraken public Spot supplies Disc3 only. Ranking uses its rolling-24-hour USD notional; exact-pair interval=1440 OHLC packets and the roster are D1-cached. A shared one-request-per-second guard and 160-attempt application ceiling fail closed; no other venue is substituted."
          : "Tickerbot is the exclusive Disc1 stock provider under the shared 10,000-per-UTC-month Worker allowance. Daily packets are held through UTC midnight; Massive does not serve stocks and Alpha Vantage is not substituted."
    }
  };

  if (!succeeded) {
    const codes = new Set(failures.map(instrument => instrument.code));
    if (codes.size === 1) {
      const [code] = [...codes];
      const retryAfterMs = Number(failures[0].retryAfterMs) || 0;
      const headers = ["rate-limit", "massive-rate-limit", "kraken-rate-limit", "kraken-budget-exhausted", "kraken-bar-cooldown", "crypto-ranking-cooldown"].includes(code)
        ? { "Retry-After": failures[0].retryAfter || (retryAfterMs > 0 ? String(Math.max(1, Math.ceil(retryAfterMs / 1000))) : code.startsWith("kraken") ? "1" : "60") }
        : {};
      return json({ success: false, message: failures[0].message, environment: "characters-beat", data }, statusForCode(code), headers);
    }
    return json({ success: false, message: "No instrument in this beat returned usable market observations.", environment: "characters-beat", data }, 502);
  }
  return json({ success: true, environment: "characters-beat", data });
}
