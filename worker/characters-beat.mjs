/*
 * HarshalOS — Characters: the market beat route.
 *
 * `/api/characters/v1/beat?symbols=AAPL,MSFT&interval=1h&cadence=60`
 *
 * Why a route instead of N bars calls: the reviewed Tickerbot plan is 10,000 calls per
 * month, and a beat is a batch. One beat request buys one upstream call per due symbol —
 * never more — and every request inside the same beat window is answered from the Worker's
 * cadence-held cache, so re-rendering the stage (or reloading the page) costs zero calls.
 * The cache TTL is the beat itself: a 60-minute cadence holds a symbol's bars for 60
 * minutes, which is exactly the promise the Characters app makes to the budget.
 *
 * Boundaries, matching worker/good-intelligence-tickerbot.mjs and
 * docs/architecture/CHARACTERS-MARKET-BEAT.md:
 *   · GET only; the fixed Tickerbot allowlist is the only source of upstream ticker paths.
 *   · Partial failures are answered honestly per symbol. A symbol without bars is reported
 *     `unavailable` and the app freezes that berth; no bar is ever fabricated or reused as
 *     if it were fresh.
 *   · The isolate spend counters are best-effort telemetry for a human's own accounting,
 *     not a billing record and not a hard budget enforcement. The browser ledger and the
 *     provider dashboard remain the durable counts.
 */
import {
  TICKERBOT_INTERVALS,
  TICKERBOT_WATCHLIST,
  fetchTickerbotMarketContext,
  isTickerbotSymbol
} from "./good-intelligence-tickerbot.mjs";

export const CHARACTERS_BEAT_ROUTE = "/api/characters/v1/beat";

/* One beat may ask for at most this many symbols. It matches the app's own per-request cap
   (js/characters-beat.js MAX_SYMBOLS_PER_BEAT) and the hourly budget arithmetic: 52 symbols
   at 10,000 calls/month afford 11-12 symbols per beat, and no cadence in the reviewed list
   needs more than that. */
export const MAX_BEAT_SYMBOLS = 12;

/* Cadence values the app offers, in minutes. Each one is also the cache hold. A value
   outside this set falls back to 60 instead of being rejected, so a stale client still
   gets a usable beat rather than an error. */
export const BEAT_CADENCES = Object.freeze([15, 30, 60, 240, 1440]);
const DEFAULT_CADENCE = 60;
const MAX_FETCH_CONCURRENCY = 4;
const UPSTREAM_TIMEOUT_MS = 10_000;

const cache = new Map();
/* Module-scope, isolate-local, best-effort. Everything here resets on redeploy and is not
   shared between isolates; the response labels it that way so no one bills against it. */
const spend = { month: "", monthCalls: 0, day: "", dayCalls: 0 };

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

function utcKeys(now) {
  const date = new Date(now);
  const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  const day = `${month}-${String(date.getUTCDate()).padStart(2, "0")}`;
  return { month, day };
}

function countSpend(now, calls) {
  const keys = utcKeys(now);
  if (spend.month !== keys.month) { spend.month = keys.month; spend.monthCalls = 0; }
  if (spend.day !== keys.day) { spend.day = keys.day; spend.dayCalls = 0; }
  spend.monthCalls += calls;
  spend.dayCalls += calls;
  return { month: spend.month, monthCalls: spend.monthCalls, day: spend.day, dayCalls: spend.dayCalls };
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

/* Failure codes from the shared upstream helper become the status the client should see
   when *every* symbol in the beat failed the same way. Mixed results always answer 200,
   because a partial beat is still a usable beat. */
function statusForCode(code) {
  if (code === "rate-limit") return 429;
  if (code === "empty") return 404;
  if (code === "timeout") return 504;
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

  const apiKey = typeof env.TICKERBOT_API_KEY === "string" ? env.TICKERBOT_API_KEY.trim() : "";
  if (!apiKey) return failure("Tickerbot is not configured on this Worker. Add the TICKERBOT_API_KEY Worker secret.", 503);

  const now = typeof dependencies.now === "function" ? dependencies.now() : Date.now();
  const fetcher = dependencies.fetch || globalThis.fetch;
  if (typeof fetcher !== "function") return failure("Tickerbot is unavailable in this Worker runtime.", 503);

  const holdMs = cadenceMinutes * 60_000;
  let upstreamCalls = 0;
  let cacheHits = 0;

  const instruments = await mapWithConcurrency(symbols, MAX_FETCH_CONCURRENCY, async symbol => {
    const key = `${symbol}:${interval}`;
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now) {
      cacheHits += 1;
      return { symbol, status: "cached", marketContext: cached.packet };
    }
    if (cached) cache.delete(key);

    const result = await fetchTickerbotMarketContext({
      symbol, interval, apiKey, fetcher, now,
      timeoutMs: UPSTREAM_TIMEOUT_MS,
      dependencies,
      logFailure: true
    });
    if (!result.ok) {
      /* A failed read is not cached: the next beat may retry it, and a stale packet is
         never served as if it were this beat's. */
      return { symbol, status: "unavailable", code: result.code, message: result.message, retryAfter: result.retryAfter };
    }
    upstreamCalls += 1;
    cache.set(key, { packet: result.packet, expiresAt: now + holdMs });
    return { symbol, status: "bars", marketContext: result.packet };
  });

  const counters = countSpend(now, upstreamCalls);
  const failures = instruments.filter(instrument => instrument.status === "unavailable");
  const succeeded = instruments.length - failures.length;

  const data = {
    schema: "characters-beat-v1",
    beatAt: new Date(now).toISOString(),
    interval,
    cadenceMinutes,
    holdMs,
    instruments,
    spend: {
      requestedSymbols: symbols.length,
      upstreamCalls,
      cacheHits,
      unavailable: failures.length,
      isolate: counters,
      note: "Isolate-local, best-effort counters for a human's own accounting — not a billing record, not a hard budget, and reset by any redeploy. The browser ledger and the provider dashboard are the durable counts."
    }
  };

  /* Whole-beat failure keeps one honest status and, for a rate limit, the provider's
     Retry-After, so the client backs off instead of hammering the next beat. */
  if (!succeeded) {
    const codes = new Set(failures.map(instrument => instrument.code));
    if (codes.size === 1) {
      const [code] = [...codes];
      const headers = code === "rate-limit" && failures[0].retryAfter ? { "Retry-After": failures[0].retryAfter } : {};
      return json({
        success: false,
        message: failures[0].message,
        environment: "characters-beat",
        data: { ...data, instruments }
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
