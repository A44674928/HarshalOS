/*
 * HarshalOS — Characters: the market beat route.
 *
 * `/api/characters/v1/beat?symbols=AAPL,MSFT&interval=1h&cadence=60`
 *
 * Tickerbot Live remains the primary provider. On a requested daily (`1d`) beat only,
 * a failed, exhausted, unconfigured, or ledger-refused Tickerbot read may fall back to
 * Alpha Vantage TIME_SERIES_DAILY. The providers have independent D1 allowances: one
 * shared Tickerbot UTC-month counter and one Characters-only Alpha Vantage UTC-day cap.
 * Alpha Vantage is never used to satisfy an hourly beat.
 *
 * A cadence-held isolate cache answers repeated reads without another provider request.
 * Partial failures are honest per symbol; missing bars freeze the berth. Every provider
 * attempt is counted conservatively before fetch, including timeouts and failed responses.
 * Provider keys never enter browser code or response bodies. Alpha Vantage's query-string
 * key is protected from persisted Worker logs/traces by observability query redaction.
 */
import {
  TICKERBOT_INTERVALS,
  TICKERBOT_WATCHLIST,
  fetchTickerbotMarketContext,
  isTickerbotSymbol
} from "./good-intelligence-tickerbot.mjs";
import { fetchAlphaVantageDailyMarketContext } from "./characters-alpha-vantage.mjs";
import { claimTickerbotCall, readTickerbotCallLedger } from "./tickerbot-call-ledger.mjs";
import {
  ALPHA_VANTAGE_PROVIDER_DAILY_LIMIT,
  claimAlphaVantageDailyCall,
  readAlphaVantageDailyCallLedger
} from "./alpha-vantage-daily-call-ledger.mjs";

export const CHARACTERS_BEAT_ROUTE = "/api/characters/v1/beat";

/* One beat may ask for at most this many symbols. It matches the app's per-request cap
   and the existing 52-symbol watchlist. */
export const MAX_BEAT_SYMBOLS = 12;

/* Cadences the app offers, in minutes. Each one is also the cache hold. A value outside
   this set falls back to the app's 15-minute default rather than being rejected. */
export const BEAT_CADENCES = Object.freeze([15, 30, 60, 240, 1440]);
const DEFAULT_CADENCE = 15;
const LANES = Object.freeze(["hot", "sweep"]);
const MAX_FETCH_CONCURRENCY = 4;
const UPSTREAM_TIMEOUT_MS = 10_000;

const cache = new Map();

const json = (data, status = 200, extraHeaders = {}) => Response.json(data, {
  status,
  headers: {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders
  }
});
const failure = (message, status = 502, extraHeaders = {}) => json({ success: false, message }, status, extraHeaders);

export function clearCharactersBeatCache() {
  cache.clear();
}

/* The newest snapshot received from D1 wins. Parallel claims can complete out of order. */
function newerLedger(current, next) {
  if (!next) return current;
  if (!current || next.month > current.month) return next;
  if (next.month < current.month) return current;
  if (next.calls > current.calls) return next;
  if (next.calls === current.calls && Number(next.updatedAt || 0) > Number(current.updatedAt || 0)) return next;
  return current;
}

function newerAlphaVantageLedger(current, next) {
  if (!next) return current;
  if (!current || next.day > current.day) return next;
  if (next.day < current.day) return current;
  if (next.calls > current.calls) return next;
  if (next.calls === current.calls && Number(next.updatedAt || 0) > Number(current.updatedAt || 0)) return next;
  return current;
}

/* The client labels each symbol with its tier lane. A lane is a display hint only; it
   never changes provider order, the call cap, or validation. */
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

function parseSymbols(raw) {
  if (typeof raw !== "string" || !raw.trim()) return { symbols: [], rejected: [] };
  const requested = [...new Set(raw.split(",").map(entry => entry.trim().toUpperCase()).filter(Boolean))];
  const symbols = [];
  const rejected = [];
  for (const symbol of requested) {
    if (isTickerbotSymbol(symbol)) symbols.push(symbol);
    else rejected.push(symbol.slice(0, 12));
  }
  return { symbols, rejected };
}

/* Failure codes become the status the client should see when a whole beat failed alike. */
function statusForCode(code) {
  if (["rate-limit", "budget-exhausted", "alpha-vantage-rate-limit", "alpha-vantage-budget-exhausted"].includes(code)) return 429;
  if (["ledger-unavailable", "alpha-vantage-ledger-unavailable", "tickerbot-not-configured", "alpha-vantage-not-configured"].includes(code)) return 503;
  if (["empty", "alpha-vantage-empty"].includes(code)) return 404;
  if (["timeout", "alpha-vantage-timeout"].includes(code)) return 504;
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

export async function handleCharactersBeat(request, env = {}, dependencies = {}) {
  const url = new URL(request.url);
  if (url.pathname !== CHARACTERS_BEAT_ROUTE) return failure("Characters beat route not found.", 404);
  if (request.method !== "GET") return failure("The Characters beat is read-only.", 405, { Allow: "GET" });

  const { symbols, rejected } = parseSymbols(url.searchParams.get("symbols"));
  const lanes = parseLanes(url.searchParams.get("lanes"));
  if (!symbols.length) {
    return failure(`Choose at least one ticker from the configured ${TICKERBOT_WATCHLIST.length}-symbol Tickerbot watchlist.`, 400);
  }
  if (symbols.length > MAX_BEAT_SYMBOLS) {
    return failure(`One beat may request at most ${MAX_BEAT_SYMBOLS} symbols; ${symbols.length} were requested.`, 400);
  }
  if (rejected.length) {
    return failure(`These symbols are not on the reviewed Tickerbot watchlist: ${rejected.join(", ")}.`, 400);
  }

  const interval = (url.searchParams.get("interval") || "1h").trim();
  if (!TICKERBOT_INTERVALS.includes(interval)) {
    return failure(`Choose a supported bar interval: ${TICKERBOT_INTERVALS.join(" or ")}.`, 400);
  }
  const requestedCadence = Number(url.searchParams.get("cadence"));
  const cadenceMinutes = BEAT_CADENCES.includes(requestedCadence) ? requestedCadence : DEFAULT_CADENCE;

  const tickerbotApiKey = typeof env.TICKERBOT_API_KEY === "string" ? env.TICKERBOT_API_KEY.trim() : "";
  const alphaVantageApiKey = typeof env.ALPHA_VANTAGE_API_KEY === "string" ? env.ALPHA_VANTAGE_API_KEY.trim() : "";
  const alphaVantageEligible = interval === "1d" && Boolean(alphaVantageApiKey);
  if (!tickerbotApiKey && !alphaVantageEligible) {
    const message = interval === "1d"
      ? "Tickerbot is not configured. Add the TICKERBOT_API_KEY Worker secret; Alpha Vantage is not configured either, so the daily fallback cannot run."
      : "Tickerbot is not configured on this Worker. Add the TICKERBOT_API_KEY Worker secret. Alpha Vantage fallback is daily-only; it cannot supply a 1-hour beat.";
    return failure(message, 503);
  }

  const now = typeof dependencies.now === "function" ? dependencies.now() : Date.now();
  const fetcher = dependencies.fetch || globalThis.fetch;
  if (typeof fetcher !== "function") return failure("No market-data provider is available in this Worker runtime.", 503);

  const tickerbotHeld = tickerbotApiKey
    ? await readTickerbotCallLedger(env.COMMUNITY_DB, now)
    : { ok: false, reason: "not-configured" };
  let durable = tickerbotHeld.ok ? tickerbotHeld.ledger : null;
  let ledgerStatus = tickerbotApiKey ? (tickerbotHeld.ok ? "ready" : "unavailable") : "not-configured";

  const alphaDailyHeld = alphaVantageEligible
    ? await readAlphaVantageDailyCallLedger(env.COMMUNITY_DB, now)
    : { ok: false, reason: alphaVantageApiKey ? "not-applicable" : "not-configured" };
  let alphaVantageDaily = alphaDailyHeld.ok ? alphaDailyHeld.ledger : null;
  let alphaVantageLedgerStatus = alphaVantageEligible
    ? (alphaDailyHeld.ok ? "ready" : "unavailable")
    : (interval === "1d" ? "not-configured" : "not-applicable");

  const holdMs = cadenceMinutes * 60_000;
  let tickerbotAttempts = 0;
  let alphaVantageAttempts = 0;
  let cacheHits = 0;

  const instruments = await mapWithConcurrency(symbols, MAX_FETCH_CONCURRENCY, async symbol => {
    const key = `${symbol}:${interval}`;
    const lane = lanes.get(symbol) || null;
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now) {
      cacheHits += 1;
      return { symbol, status: "cached", lane, provider: cached.provider, marketContext: cached.packet };
    }
    if (cached) cache.delete(key);

    const tickerbotFailure = (code, message, details = {}) => ({
      ok: false, provider: "tickerbot", code, message, ...details
    });

    const fetchTickerbot = async () => {
      if (!tickerbotApiKey) {
        return tickerbotFailure("tickerbot-not-configured", "Tickerbot primary provider is not configured. Add the TICKERBOT_API_KEY Worker secret.");
      }
      if (durable && durable.exhausted) {
        return tickerbotFailure("budget-exhausted",
          `The Worker-routed Tickerbot allowance is exhausted for ${durable.month}: ${durable.calls.toLocaleString()} of ${durable.workerLimit.toLocaleString()} calls. No Tickerbot request was sent.`);
      }

      const claim = await claimTickerbotCall(env.COMMUNITY_DB, now);
      if (!claim.ok) {
        if (claim.ledger) durable = newerLedger(durable, claim.ledger);
        ledgerStatus = claim.reason === "budget-exhausted" ? "ready" : "unavailable";
        return tickerbotFailure(claim.reason, claim.message, claim.ledger ? { durable: claim.ledger } : {});
      }

      /* The slot is claimed before fetch; timeouts and errors stay counted conservatively. */
      tickerbotAttempts += 1;
      ledgerStatus = "ready";
      durable = newerLedger(durable, claim.ledger);
      const result = await fetchTickerbotMarketContext({
        symbol, interval, apiKey: tickerbotApiKey, fetcher, now,
        timeoutMs: UPSTREAM_TIMEOUT_MS,
        dependencies,
        logFailure: true
      });
      if (!result.ok) return tickerbotFailure(result.code, result.message, { retryAfter: result.retryAfter });
      return { ok: true, provider: "tickerbot", packet: result.packet };
    };

    const fetchAlphaVantage = async () => {
      if (!alphaVantageApiKey) {
        return {
          ok: false, provider: "alpha-vantage", code: "alpha-vantage-not-configured",
          message: "Alpha Vantage's daily fallback is not configured. Add the ALPHA_VANTAGE_API_KEY Worker secret."
        };
      }
      if (alphaVantageDaily && alphaVantageDaily.exhausted) {
        return {
          ok: false, provider: "alpha-vantage", code: "alpha-vantage-budget-exhausted",
          message: `The Characters Alpha Vantage allowance is exhausted for ${alphaVantageDaily.day}: ${alphaVantageDaily.calls.toLocaleString()} of ${alphaVantageDaily.dailyLimit.toLocaleString()} Worker-routed requests. No Alpha Vantage request was sent.`
        };
      }

      const claim = await claimAlphaVantageDailyCall(env.COMMUNITY_DB, now, ALPHA_VANTAGE_PROVIDER_DAILY_LIMIT);
      if (!claim.ok) {
        if (claim.ledger) alphaVantageDaily = newerAlphaVantageLedger(alphaVantageDaily, claim.ledger);
        alphaVantageLedgerStatus = claim.reason === "alpha-vantage-budget-exhausted" ? "ready" : "unavailable";
        return {
          ok: false,
          provider: "alpha-vantage",
          code: claim.reason,
          message: claim.message,
          ...(claim.ledger ? { dailyLedger: claim.ledger } : {})
        };
      }

      alphaVantageLedgerStatus = "ready";
      alphaVantageDaily = newerAlphaVantageLedger(alphaVantageDaily, claim.ledger);
      alphaVantageAttempts += 1;
      const result = await fetchAlphaVantageDailyMarketContext({
        symbol, apiKey: alphaVantageApiKey, fetcher, now,
        timeoutMs: UPSTREAM_TIMEOUT_MS,
        dependencies
      });
      if (!result.ok) return { ...result, provider: "alpha-vantage" };
      return { ok: true, provider: "alpha-vantage", packet: result.packet };
    };

    const primary = await fetchTickerbot();
    if (primary.ok) {
      cache.set(key, { packet: primary.packet, provider: primary.provider, expiresAt: now + holdMs });
      return { symbol, status: "bars", lane, provider: primary.provider, marketContext: primary.packet };
    }

    /* Alpha Vantage is deliberately not a quote/hourly substitute. It can only return
       closed daily OHLCV, never a 1-hour beat. */
    if (interval !== "1d") {
      return { symbol, status: "unavailable", lane, provider: primary.provider, code: primary.code, message: primary.message, retryAfter: primary.retryAfter };
    }

    const fallback = await fetchAlphaVantage();
    if (fallback.ok) {
      cache.set(key, { packet: fallback.packet, provider: fallback.provider, expiresAt: now + holdMs });
      return {
        symbol, status: "bars", lane, provider: fallback.provider,
        fallbackFrom: primary.code,
        marketContext: fallback.packet
      };
    }

    const message = fallback.code === "alpha-vantage-not-configured"
      ? `${primary.message} ${fallback.message}`
      : fallback.message;
    return {
      symbol, status: "unavailable", lane, provider: fallback.provider,
      code: fallback.code, message,
      fallbackFrom: primary.code,
      retryAfter: fallback.retryAfter
    };
  });

  const failures = instruments.filter(instrument => instrument.status === "unavailable");
  const succeeded = instruments.length - failures.length;
  const providerAttempts = tickerbotAttempts + alphaVantageAttempts;
  const data = {
    schema: "characters-beat-v1",
    beatAt: new Date(now).toISOString(),
    interval,
    cadenceMinutes,
    holdMs,
    instruments,
    spend: {
      requestedSymbols: symbols.length,
      providerAttempts,
      tickerbotAttempts,
      alphaVantageAttempts,
      cacheHits,
      unavailable: failures.length,
      lanes: {
        hot: instruments.filter(instrument => instrument.lane === "hot").map(instrument => instrument.symbol),
        sweep: instruments.filter(instrument => instrument.lane === "sweep").map(instrument => instrument.symbol),
        note: "Client-supplied lane labels for display and the beat log. A lane never changes how many calls the provider plan allows or the provider order; daily fallback can make one Tickerbot attempt plus one Alpha Vantage attempt for the same symbol."
      },
      durable,
      ledgerStatus,
      alphaVantageDaily,
      alphaVantageLedgerStatus,
      note: "Tickerbot attempts use the shared 10,000-per-UTC-month Tickerbot allowance. Alpha Vantage TIME_SERIES_DAILY compact fallback attempts use a separate 25-per-UTC-day D1 hard cap and are available only for 1d beats. Both ledgers count failed fetches conservatively; provider-direct calls are excluded, so each provider account remains the billing authority."
    }
  };

  /* Whole-beat failure keeps one honest status and any provider Retry-After. Budget
     refusals carry the per-symbol result and durable cap snapshots without fetching. */
  if (!succeeded) {
    const codes = new Set(failures.map(instrument => instrument.code));
    if (codes.size === 1) {
      const [code] = [...codes];
      const headers = code === "rate-limit" || code === "alpha-vantage-rate-limit"
        ? { "Retry-After": failures[0].retryAfter || "60" }
        : {};
      return json({
        success: false,
        message: failures[0].message,
        environment: "characters-beat",
        data
      }, statusForCode(code), headers);
    }
    return json({
      success: false,
      message: "No symbol in this beat returned bars.",
      environment: "characters-beat",
      data
    }, 502);
  }

  return json({ success: true, environment: "characters-beat", data });
}
