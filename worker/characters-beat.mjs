/*
 * HarshalOS — Characters market beat route.
 *
 * Triple-provider boundary:
 *   • Massive: automatic 1d daily bars for all five reviewed Discs.
 *   • Tickerbot: on-demand 15m / 1h / 1d bars for the reviewed Disc1 stock deck; Orb 2 uses 15m as a bounded residual lane.
 *   • Alpha Vantage: Disc1-only explicit 1mo best-performer spotlight.
 *
 * Providers are selected explicitly with ?provider=. The browser includes that
 * parameter on every live beat; legacy URLs get a safe deterministic mapping.
 * No provider key reaches browser code or a response body. Failed outbound
 * requests consume the provider's durable ledger after an atomic claim.
 */

import {
  TICKERBOT_INTERVALS,
  TICKERBOT_WATCHLIST,
  fetchTickerbotMarketContext,
  isTickerbotSymbol
} from "./good-intelligence-tickerbot.mjs";
import { fetchAlphaVantageMonthlyMarketContext } from "./characters-alpha-vantage.mjs";
import { fetchMassiveDailyMarketContext } from "./characters-massive.mjs";
import { claimTickerbotCall, readTickerbotCallLedger } from "./tickerbot-call-ledger.mjs";
import {
  ALPHA_VANTAGE_PROVIDER_DAILY_LIMIT,
  claimAlphaVantageDailyCall,
  readAlphaVantageDailyCallLedger
} from "./alpha-vantage-daily-call-ledger.mjs";
import {
  MASSIVE_PROVIDER_DAILY_LIMIT,
  claimMassiveDailyCall,
  readMassiveDailyCallLedger
} from "./massive-daily-call-ledger.mjs";
import { consumeMassiveBudget } from "./massive.mjs";
import { getCharactersCryptoRanking } from "./characters-crypto-ranking.mjs";
import "../js/characters-disc-catalog.js";

export const CHARACTERS_BEAT_ROUTE = "/api/characters/v1/beat";
export const CHARACTERS_DEPLOY_ROUTE = "/api/characters/v1/deploy";
export const MAX_BEAT_SYMBOLS = 12;
/* Tickerbot's manual planner cadences. Massive's fixed cadence=1 denotes
   the reviewed daily-bar contract; request pacing is a separate five-per-minute
   envelope enforced by the shared Massive budget below. */
export const BEAT_CADENCES = Object.freeze([15, 30, 60, 240, 1440]);
export const MONTHLY_CACHE_HOLD_MS = 60 * 60_000;
export const MASSIVE_DISCS = Object.freeze(["stocks", "fx", "crypto", "commodities", "indices"]);
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
    quoteCurrency: "USD",
    alphaVantage: { function: "TIME_SERIES_MONTHLY", symbol: entry.symbol }
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
    "rate-limit", "budget-exhausted", "alpha-vantage-rate-limit", "alpha-vantage-budget-exhausted",
    "massive-rate-limit", "massive-budget-exhausted", "crypto-ranking-rate-limit"
  ].includes(code)) return 429;
  if ([
    "ledger-unavailable", "alpha-vantage-ledger-unavailable", "massive-ledger-unavailable",
    "tickerbot-not-configured", "alpha-vantage-not-configured", "massive-not-configured",
    "tickerbot-symbol-not-covered"
  ].includes(code)) return 503;
  if (["empty", "alpha-vantage-empty", "massive-empty"].includes(code)) return 404;
  if (["timeout", "alpha-vantage-timeout", "massive-timeout", "crypto-ranking-timeout"].includes(code)) return 504;
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

function providerFor(url, interval) {
  const raw = url.searchParams.get("provider");
  if (raw !== null && raw.trim()) {
    const provider = raw.trim().toLowerCase();
    return ["massive", "tickerbot", "alpha"].includes(provider) ? provider : null;
  }
  /* Compatibility default. The browser always supplies provider=, while old
     stock URLs retain their former Tickerbot 1h/1d behavior. `1mo` already
     meant the explicit Alpha Vantage monthly path before the Massive loop. */
  if (interval === "1mo") return "alpha";
  return "tickerbot";
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
  const provider = providerFor(url, interval);
  if (!provider) {
    return failure("Choose provider=massive (automatic daily beats), provider=tickerbot (on-demand stock beats), or provider=alpha (Disc1 monthly beats).", 400);
  }
  if (provider === "massive" && interval !== "1d") {
    return failure("Massive Characters beats are restricted to interval=1d.", 400);
  }
  if (provider === "alpha" && interval !== "1mo") {
    return failure("Alpha Vantage Characters beats are restricted to interval=1mo.", 400);
  }
  if (provider === "tickerbot" && !TICKERBOT_INTERVALS.includes(interval)) {
    return failure(`Choose ${TICKERBOT_INTERVALS.join(" or ")} for Tickerbot, or choose a provider-specific interval.`, 400);
  }
  if (provider === "massive" && !MASSIVE_DISCS.includes(discId)) {
    return failure("Massive automatic beats cover the stocks, FX, crypto, commodities, and indices Discs.", 400);
  }
  if (provider === "tickerbot" && discId !== "stocks") {
    return failure(`Tickerbot on-demand beats cover Disc1 stocks only. Massive serves ${disc.label} automatically at 1d.`, 400);
  }
  if (provider === "alpha" && discId !== "stocks") {
    return failure("Alpha Vantage 1mo is configured only for Disc1 stocks.", 400);
  }

  const rawSymbols = url.searchParams.get("symbols");
  if (typeof rawSymbols !== "string" || !rawSymbols.trim()) return failure("Choose at least one instrument from this Disc.", 400);
  const requestedSymbols = [...new Set(rawSymbols.split(",").map(entry => entry.trim().toUpperCase()).filter(Boolean))];
  if (!requestedSymbols.length) return failure("Choose at least one instrument from this Disc.", 400);
  if (requestedSymbols.length > MAX_BEAT_SYMBOLS) {
    return failure(`One beat may request at most ${MAX_BEAT_SYMBOLS} instruments; ${requestedSymbols.length} were requested.`, 400);
  }

  /* Fixed automatic loops are deliberately narrower than the manual
     Tickerbot planner. The browser chooses Massive's LRU berth and Alpha's
     local best performer; the route enforces that neither provider can be
     widened into a multi-symbol batch or a different cadence by a crafted URL. */
  const cadenceParam = url.searchParams.get("cadence");
  const requestedCadence = Number(cadenceParam);
  if (provider === "massive" && requestedSymbols.length !== 1) {
    return failure("Massive automatic daily beats request exactly one reviewed instrument per Worker request; cadence=1 identifies the daily-bar contract.", 400);
  }
  if (provider === "alpha" && requestedSymbols.length !== 1) {
    return failure("Alpha Vantage 1mo beats request exactly one locally selected Disc1 ticker per hourly beat.", 400);
  }
  if (provider === "massive" && cadenceParam !== null && requestedCadence !== 1) {
    return failure("Massive automatic daily beats use exactly cadence=1 for the daily-bar contract; request pacing is enforced separately.", 400);
  }
  if (provider === "alpha" && cadenceParam !== null && requestedCadence !== 60) {
    return failure("Alpha Vantage 1mo beats use exactly cadence=60 minutes.", 400);
  }

  const now = typeof dependencies.now === "function" ? dependencies.now() : Date.now();
  const fetcher = dependencies.fetch || globalThis.fetch;
  if (typeof fetcher !== "function") return failure("No market-data provider is available in this Worker runtime.", 503);

  let allowedInstruments = discId === "stocks" ? stockInstruments() : staticDiscInstruments(discId);
  let cryptoRanking = null;
  if (discId === "crypto") {
    const rankingResult = await getCharactersCryptoRanking({
      fetcher,
      now,
      timeoutMs: UPSTREAM_TIMEOUT_MS,
      forceRefresh: dependencies.forceCryptoRankingRefresh === true
    });
    if (!rankingResult.ok) return failure(rankingResult.message, statusForCode(rankingResult.code));
    cryptoRanking = rankingResult.ranking;
    allowedInstruments = cryptoRanking.instruments;
  }

  const { selected, rejected } = parseSymbols(rawSymbols, allowedInstruments, provider);
  if (!selected.length) return failure(`No requested instrument is on the reviewed ${disc.label} catalog.`, 400);
  if (rejected.length) return failure(`These instruments are not available through ${provider} on ${disc.label}: ${rejected.join(", ")}.`, 400);

  const lanes = parseLanes(url.searchParams.get("lanes"));
  const cadenceMinutes = provider === "massive" ? 1
    : provider === "alpha" ? 60
      : (BEAT_CADENCES.includes(requestedCadence) ? requestedCadence : DEFAULT_CADENCE);
  const tickerbotApiKey = typeof env.TICKERBOT_API_KEY === "string" ? env.TICKERBOT_API_KEY.trim() : "";
  const alphaApiKey = typeof env.ALPHA_VANTAGE_API_KEY === "string" ? env.ALPHA_VANTAGE_API_KEY.trim() : "";
  const massiveApiKey = typeof env.MASSIVE_API_KEY === "string" ? env.MASSIVE_API_KEY.trim() : "";

  if (provider === "tickerbot" && !tickerbotApiKey) {
    return failure("Tickerbot is not configured on this Worker. Add the TICKERBOT_API_KEY Worker secret for on-demand stock data.", 503);
  }
  if (provider === "alpha" && !alphaApiKey) {
    return failure("Alpha Vantage is not configured. Add the ALPHA_VANTAGE_API_KEY Worker secret for Disc1 1mo data.", 503);
  }
  if (provider === "massive" && !massiveApiKey) {
    return failure("Massive daily beats are not configured. Add the MASSIVE_API_KEY Worker secret.", 503);
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

  const alphaHeld = provider === "alpha"
    ? await readAlphaVantageDailyCallLedger(env.COMMUNITY_DB, now, ALPHA_VANTAGE_PROVIDER_DAILY_LIMIT)
    : { ok: false, reason: "not-applicable" };
  let alphaVantageDaily = alphaHeld.ok ? alphaHeld.ledger : null;
  let alphaVantageLedgerStatus = provider === "alpha" ? (alphaHeld.ok ? "ready" : "unavailable") : "not-applicable";

  const holdMs = provider === "massive"
    ? nextUtcMidnightMs(now) - now
    : provider === "alpha" ? MONTHLY_CACHE_HOLD_MS : cadenceMinutes * 60_000;
  let tickerbotAttempts = 0;
  let massiveAttempts = 0;
  let alphaVantageAttempts = 0;
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

    if (provider === "massive") {
      if (massiveDaily && massiveDaily.exhausted) {
        return unavailableInstrument({
          symbol, instrument, lane, provider: "massive", code: "massive-budget-exhausted",
          message: `The Characters Massive allowance is exhausted for ${massiveDaily.day}: ${massiveDaily.calls.toLocaleString()} of ${massiveDaily.dailyLimit.toLocaleString()} Worker-routed requests. No Massive request was sent.`
        });
      }
      /* Check the short shared envelope first. A rejected minute slot sends no
         upstream request and must not burn the longer-lived Characters D1
         allowance; both guards still fail closed before provider work. */
      const minuteBudget = consumeMassiveBudget(request, env, now);
      if (!minuteBudget.ok) {
        return unavailableInstrument({
          symbol, instrument, lane, provider: "massive", code: "massive-rate-limit",
          message: `The shared Massive per-minute request envelope is exhausted (${minuteBudget.scope}). Wait about ${minuteBudget.retryAfterSeconds}s before beating again.`,
          extra: { retryAfter: String(minuteBudget.retryAfterSeconds) }
        });
      }
      const claim = await claimMassiveDailyCall(env.COMMUNITY_DB, now, MASSIVE_PROVIDER_DAILY_LIMIT);
      if (!claim.ok) {
        if (claim.ledger) massiveDaily = newerDailyLedger(massiveDaily, claim.ledger);
        massiveLedgerStatus = claim.reason === "massive-budget-exhausted" ? "ready" : "unavailable";
        return unavailableInstrument({
          symbol, instrument, lane, provider: "massive", code: claim.reason, message: claim.message,
          extra: claim.ledger ? { massiveDaily: claim.ledger } : {}
        });
      }
      massiveDaily = newerDailyLedger(massiveDaily, claim.ledger);
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

    if (provider === "alpha") {
      if (alphaVantageDaily && alphaVantageDaily.exhausted) {
        return unavailableInstrument({
          symbol, instrument, lane, provider: "alpha-vantage", code: "alpha-vantage-budget-exhausted",
          message: `The Characters Alpha Vantage allowance is exhausted for ${alphaVantageDaily.day}: ${alphaVantageDaily.calls.toLocaleString()} of ${alphaVantageDaily.dailyLimit.toLocaleString()} Worker-routed requests. No Alpha Vantage request was sent.`
        });
      }
      const claim = await claimAlphaVantageDailyCall(env.COMMUNITY_DB, now, ALPHA_VANTAGE_PROVIDER_DAILY_LIMIT);
      if (!claim.ok) {
        if (claim.ledger) alphaVantageDaily = newerDailyLedger(alphaVantageDaily, claim.ledger);
        alphaVantageLedgerStatus = claim.reason === "alpha-vantage-budget-exhausted" ? "ready" : "unavailable";
        return unavailableInstrument({
          symbol, instrument, lane, provider: "alpha-vantage", code: claim.reason, message: claim.message,
          extra: claim.ledger ? { alphaVantageDaily: claim.ledger } : {}
        });
      }
      alphaVantageDaily = newerDailyLedger(alphaVantageDaily, claim.ledger);
      alphaVantageLedgerStatus = "ready";
      alphaVantageAttempts += 1;
      const result = await fetchAlphaVantageMonthlyMarketContext({
        instrument: { ...instrument, interval: "1mo" },
        symbol,
        apiKey: alphaApiKey,
        fetcher,
        now,
        timeoutMs: UPSTREAM_TIMEOUT_MS,
        dependencies
      });
      if (!result.ok) {
        const { retryAfterSeconds, retryAfter, ...rest } = result;
        return unavailableInstrument({
          symbol, instrument, lane, provider: "alpha-vantage", code: rest.code, message: rest.message,
          extra: { ...rest, ...(Number(retryAfterSeconds) > 0 ? { retryAfter: String(retryAfterSeconds) } : {}), ...(retryAfter ? { retryAfter: String(retryAfter) } : {}) }
        });
      }
      cache.set(key, { packet: result.packet, provider: "alpha-vantage", expiresAt: now + holdMs });
      return { symbol, displaySymbol: instrument.displaySymbol || symbol, status: "bars", lane, provider: "alpha-vantage", marketContext: result.packet };
    }

    /* Provider=tickerbot has already been narrowed to Disc1. Keep this local
       allowlist check anyway so an accidental future catalog widening does not
       spend a Tickerbot D1 slot or hit upstream. */
    if (!isTickerbotSymbol(symbol)) {
      return unavailableInstrument({
        symbol, instrument, lane, provider: "tickerbot", code: "tickerbot-symbol-not-covered",
        message: `${symbol} is not on Tickerbot's reviewed stock allowlist. Massive covers reviewed non-stock Discs automatically at 1d.`
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
  const providerAttempts = tickerbotAttempts + massiveAttempts + alphaVantageAttempts;
  const data = {
    schema: "characters-beat-v1",
    disc: discId,
    provider,
    beatAt: new Date(now).toISOString(),
    interval,
    cadenceMinutes,
    holdMs,
    instruments,
    // Bind dynamic crypto symbols to the reviewed identity used for THIS beat.
    sourceIdentities: selected.map(instrument => ({ symbol: instrument.symbol,
      channel: discId, providerId: instrument.providerId || null })),
    ...(cryptoRanking ? { ranking: { provider: cryptoRanking.provider, metric: cryptoRanking.metric, rankedAt: cryptoRanking.rankedAt, audit: cryptoRanking.audit } } : {}),
    spend: {
      requestedSymbols: selected.length,
      providerAttempts,
      tickerbotAttempts,
      massiveAttempts,
      alphaVantageAttempts,
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
      alphaVantageDaily,
      alphaVantageLedgerStatus,
      note: provider === "massive"
        ? "Massive automatic 1d beats claim the durable per-UTC-day Characters ledger and shared per-minute envelope before upstream work. Daily packets are cached until UTC midnight; failed upstream attempts count conservatively."
        : provider === "alpha"
          ? "Alpha Vantage explicit 1mo Disc1 beats claim a separate strict 25-per-UTC-day allowance. Monthly data never substitutes for a daily series."
          : "Tickerbot on-demand Disc1 stock attempts use the shared 10,000-per-UTC-month Worker allowance. Massive is not used for an on-demand Tickerbot beat."
    }
  };

  if (!succeeded) {
    const codes = new Set(failures.map(instrument => instrument.code));
    if (codes.size === 1) {
      const [code] = [...codes];
      const headers = ["rate-limit", "alpha-vantage-rate-limit", "massive-rate-limit"].includes(code)
        ? { "Retry-After": failures[0].retryAfter || "60" }
        : {};
      return json({ success: false, message: failures[0].message, environment: "characters-beat", data }, statusForCode(code), headers);
    }
    return json({ success: false, message: "No instrument in this beat returned usable market observations.", environment: "characters-beat", data }, 502);
  }
  return json({ success: true, environment: "characters-beat", data });
}
