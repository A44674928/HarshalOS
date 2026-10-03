/*
 * HarshalOS — Characters: the market beat route.
 *
 * `/api/characters/v1/beat?symbols=AAPL,MSFT&interval=1h&cadence=60`
 *
 * Why a route instead of N browser bars calls: one beat is a batch. Every uncached symbol
 * claims one slot in the shared, D1-backed Tickerbot allowance immediately before the
 * Worker fetches it. A cadence-held isolate cache answers repeated reads without another
 * provider request. The D1 row is shared across Worker isolates, redeploys, both Tickerbot
 * routes, and devices; it is an allowance counter, not a provider billing record.
 *
 * Boundaries:
 *   · GET only; the fixed Tickerbot allowlist is the only source of upstream ticker paths.
 *   · Partial failures are answered honestly per symbol. A symbol without bars is reported
 *     `unavailable` and the app freezes that berth; no bar is fabricated or reused as fresh.
 *   · A missing/unavailable D1 ledger fails closed: no new provider request is sent.
 *   · Calls are counted conservatively before fetch, including timeouts and failed responses.
 */
import {
  TICKERBOT_INTERVALS,
  TICKERBOT_WATCHLIST,
  fetchTickerbotMarketContext,
  isTickerbotSymbol
} from "./good-intelligence-tickerbot.mjs";
import { claimTickerbotCall, readTickerbotCallLedger } from "./tickerbot-call-ledger.mjs";

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

/* The newest snapshot received from D1 wins. Call claims in one beat can complete in
   parallel, so don't let a slower response replace a newer call count with an older one. */
function newerLedger(current, next) {
  if (!next) return current;
  if (!current || next.month > current.month) return next;
  if (next.month < current.month) return current;
  if (next.calls > current.calls) return next;
  if (next.calls === current.calls && Number(next.updatedAt || 0) > Number(current.updatedAt || 0)) return next;
  return current;
}

/* The client labels each symbol with its tier lane. A lane is a display hint only; it
   never changes the call count, path, or validation decision. */
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

/* Failure codes from the shared upstream helper become the status the client should see
   when every symbol in the beat failed the same way. Mixed results remain a partial beat. */
function statusForCode(code) {
  if (code === "rate-limit" || code === "budget-exhausted") return 429;
  if (code === "ledger-unavailable") return 503;
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

  const apiKey = typeof env.TICKERBOT_API_KEY === "string" ? env.TICKERBOT_API_KEY.trim() : "";
  if (!apiKey) return failure("Tickerbot is not configured on this Worker. Add the TICKERBOT_API_KEY Worker secret.", 503);

  const now = typeof dependencies.now === "function" ? dependencies.now() : Date.now();
  const fetcher = dependencies.fetch || globalThis.fetch;
  if (typeof fetcher !== "function") return failure("Tickerbot is unavailable in this Worker runtime.", 503);

  const held = await readTickerbotCallLedger(env.COMMUNITY_DB, now);
  let durable = held.ok ? held.ledger : null;
  let ledgerStatus = held.ok ? "ready" : "unavailable";
  const holdMs = cadenceMinutes * 60_000;
  let providerAttempts = 0;
  let cacheHits = 0;

  const instruments = await mapWithConcurrency(symbols, MAX_FETCH_CONCURRENCY, async symbol => {
    const key = `${symbol}:${interval}`;
    const lane = lanes.get(symbol) || null;
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now) {
      cacheHits += 1;
      return { symbol, status: "cached", lane, marketContext: cached.packet };
    }
    if (cached) cache.delete(key);

    /* If this snapshot already shows a full month, don't issue one rejected SQL write per
       symbol. A concurrent Worker can still consume the final slot after this read; the
       atomic claim below is authoritative whenever the snapshot has room. */
    if (durable && durable.exhausted) {
      return {
        symbol, status: "unavailable", lane,
        code: "budget-exhausted",
        message: `The Worker-routed Tickerbot allowance is exhausted for ${durable.month}: ${durable.calls.toLocaleString()} of ${durable.workerLimit.toLocaleString()} calls. No provider request was sent.`
      };
    }

    const claim = await claimTickerbotCall(env.COMMUNITY_DB, now);
    if (!claim.ok) {
      if (claim.ledger) durable = newerLedger(durable, claim.ledger);
      ledgerStatus = claim.reason === "budget-exhausted" ? "ready" : "unavailable";
      return {
        symbol, status: "unavailable", lane,
        code: claim.reason,
        message: claim.message
      };
    }

    /* D1 has now claimed this slot. Count it before fetch; a timeout or upstream error can
       still have reached the provider, so releasing it would make the cap unsafe. */
    providerAttempts += 1;
    durable = newerLedger(durable, claim.ledger);
    const result = await fetchTickerbotMarketContext({
      symbol, interval, apiKey, fetcher, now,
      timeoutMs: UPSTREAM_TIMEOUT_MS,
      dependencies,
      logFailure: true
    });
    if (!result.ok) {
      /* Failed bars are not cached. D1 still counts this attempt conservatively. */
      return { symbol, status: "unavailable", lane, code: result.code, message: result.message, retryAfter: result.retryAfter };
    }
    cache.set(key, { packet: result.packet, expiresAt: now + holdMs });
    return { symbol, status: "bars", lane, marketContext: result.packet };
  });

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
      providerAttempts,
      cacheHits,
      unavailable: failures.length,
      lanes: {
        hot: instruments.filter(instrument => instrument.lane === "hot").map(instrument => instrument.symbol),
        sweep: instruments.filter(instrument => instrument.lane === "sweep").map(instrument => instrument.symbol),
        note: "Client-supplied lane labels for display and the beat log. A lane never changes how many calls a beat makes: it is at most one call per requested symbol."
      },
      durable,
      ledgerStatus,
      note: "The D1 aggregate is shared across Worker isolates, redeploys, Characters, and Good Intelligence. One slot is counted immediately before each Worker fetch; failed responses and timeouts count conservatively. Calls made outside these Worker routes are excluded, so Tickerbot's dashboard remains the billing authority."
    }
  };

  /* Whole-beat failure keeps one honest status and, for a provider rate limit, Retry-After.
     Budget refusals carry the per-symbol data and the durable counter, without a fetch. */
  if (!succeeded) {
    const codes = new Set(failures.map(instrument => instrument.code));
    if (codes.size === 1) {
      const [code] = [...codes];
      const headers = code === "rate-limit" && failures[0].retryAfter ? { "Retry-After": failures[0].retryAfter } : {};
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
