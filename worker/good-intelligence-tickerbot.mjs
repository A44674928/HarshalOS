/*
 * Read-only Tickerbot OHLCV adapter for Good Intelligence Market Charts.
 * The provider key stays inside the Worker; only a fixed upstream origin is used.
 */
import { claimTickerbotCall } from "./tickerbot-call-ledger.mjs";

const ROUTE = "/api/good-intelligence/v1/market/tickerbot/bars";
const TICKERBOT_ORIGIN = "https://api.tickerbot.io";

/*
 * Fixed allowlist for the 52-asset heartbeat roster. It is the only place a ticker
 * path can come from: browser input is matched against this list before any
 * `/v2/bars/{ticker}/{interval}` request is formed. The names, sectors and ordering
 * mirror js/good-intelligence-market-roster.js; the latter also carries the
 * attributed 2026-10-02 market-cap snapshot used by the display-only firing order.
 * Tests fail if the Worker allowlist and browser roster drift.
 *
 * Allowlisting proves only that the Worker may ask the configured provider for a
 * symbol. The provider can still answer unavailable; the app does not substitute a
 * different source or manufacture a market observation.
 */
const WATCHLIST = [
  { symbol: "NVDA", name: "Nvidia Corp", sector: "Technology" },
  { symbol: "AAPL", name: "Apple Inc.", sector: "Technology" },
  { symbol: "MSFT", name: "Microsoft Corp", sector: "Technology" },
  { symbol: "AVGO", name: "Broadcom Inc.", sector: "Technology" },
  { symbol: "MU", name: "Micron Technology, Inc.", sector: "Technology" },
  { symbol: "AMD", name: "Advanced Micro Devices", sector: "Technology" },
  { symbol: "INTC", name: "Intel Corp", sector: "Technology" },
  { symbol: "GOOGL", name: "Alphabet Inc.", sector: "Communication Services" },
  { symbol: "META", name: "Meta Platforms, Inc.", sector: "Communication Services" },
  { symbol: "NFLX", name: "NetFlix Inc", sector: "Communication Services" },
  { symbol: "VZ", name: "Verizon Communications Inc.", sector: "Communication Services" },
  { symbol: "TMUS", name: "T-Mobile US, Inc.", sector: "Communication Services" },
  { symbol: "DIS", name: "Walt Disney Company", sector: "Communication Services" },
  { symbol: "AMZN", name: "Amazon.com, Inc.", sector: "Consumer Cyclical" },
  { symbol: "TSLA", name: "Tesla, Inc.", sector: "Consumer Cyclical" },
  { symbol: "HD", name: "Home Depot, Inc.", sector: "Consumer Cyclical" },
  { symbol: "MCD", name: "McDonald's Corporation", sector: "Consumer Cyclical" },
  { symbol: "TJX", name: "The TJX Companies, Inc.", sector: "Consumer Cyclical" },
  { symbol: "BKNG", name: "Booking Holdings Inc.", sector: "Consumer Cyclical" },
  { symbol: "SPCX", name: "SpaceX", sector: "Industrials" },
  { symbol: "CAT", name: "Caterpillar Inc.", sector: "Industrials" },
  { symbol: "GE", name: "GE Aerospace", sector: "Industrials" },
  { symbol: "GEV", name: "GE Vernova", sector: "Industrials" },
  { symbol: "RTX", name: "RTX Corporation", sector: "Industrials" },
  { symbol: "DE", name: "Deere & Company", sector: "Industrials" },
  { symbol: "UNP", name: "Union Pacific Corp.", sector: "Industrials" },
  { symbol: "LLY", name: "Eli Lilly and Company", sector: "Healthcare" },
  { symbol: "JNJ", name: "Johnson & Johnson", sector: "Healthcare" },
  { symbol: "ABBV", name: "AbbVie Inc.", sector: "Healthcare" },
  { symbol: "MRK", name: "Merck & Co., Inc.", sector: "Healthcare" },
  { symbol: "UNH", name: "UnitedHealth Group Incorporated", sector: "Healthcare" },
  { symbol: "TMO", name: "Thermo Fisher Scientific Inc.", sector: "Healthcare" },
  { symbol: "AMGN", name: "Amgen Inc", sector: "Healthcare" },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", sector: "Financial Services" },
  { symbol: "V", name: "VISA Inc.", sector: "Financial Services" },
  { symbol: "MA", name: "Mastercard Incorporated", sector: "Financial Services" },
  { symbol: "BAC", name: "Bank of America Corporation", sector: "Financial Services" },
  { symbol: "MS", name: "Morgan Stanley", sector: "Financial Services" },
  { symbol: "GS", name: "Goldman Sachs Group Inc.", sector: "Financial Services" },
  { symbol: "WFC", name: "Wells Fargo & Co.", sector: "Financial Services" },
  { symbol: "WMT", name: "Walmart Inc.", sector: "Consumer Defensive" },
  { symbol: "COST", name: "Costco Wholesale Corporation", sector: "Consumer Defensive" },
  { symbol: "KO", name: "Coca-Cola Company", sector: "Consumer Defensive" },
  { symbol: "PG", name: "Procter & Gamble Company", sector: "Consumer Defensive" },
  { symbol: "PM", name: "Philip Morris International Inc.", sector: "Consumer Defensive" },
  { symbol: "PEP", name: "PepsiCo, Inc.", sector: "Consumer Defensive" },
  { symbol: "XOM", name: "ExxonMobil", sector: "Energy" },
  { symbol: "CVX", name: "Chevron Corporation", sector: "Energy" },
  { symbol: "COP", name: "ConocoPhillips", sector: "Energy" },
  { symbol: "MPC", name: "MARATHON PETROLEUM CORPORATION", sector: "Energy" },
  { symbol: "VLO", name: "Valero Energy Corporation", sector: "Energy" },
  { symbol: "PSX", name: "PHILLIPS 66", sector: "Energy" }
];
// The allowlist is immutable at runtime: nothing in this Worker can widen it per request.
export const TICKERBOT_WATCHLIST = Object.freeze(WATCHLIST.map(entry => Object.freeze(entry)));
const SYMBOLS = new Set(TICKERBOT_WATCHLIST.map(entry => entry.symbol));
export const TICKERBOT_INTERVALS = Object.freeze(["1h", "1d"]);
const INTERVALS = new Set(TICKERBOT_INTERVALS);
const BAR_LIMIT = 360;
const CACHE_TTL_MS = 60_000;
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

/* The allowlist is the only place an upstream ticker path can come from. The Characters
 * beat route (worker/characters-beat.mjs) imports these helpers instead of keeping a second
 * copy, so both routes accept exactly the same symbols and the same bar shape. */
export function isTickerbotSymbol(value) {
  return SYMBOLS.has(String(value === undefined || value === null ? "" : value).trim().toUpperCase());
}

export function toTickerbotBar(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const values = [Number(row.o), Number(row.h), Number(row.l), Number(row.c), Number(row.v)];
  const time = typeof row.t === "number" ? row.t : Number(row.t);
  const [open, high, low, close, volume] = values;
  if (!Number.isFinite(time) || !values.every(Number.isFinite) ||
      Math.min(open, high, low, close) <= 0 || volume < 0 ||
      high < Math.max(open, close) || low > Math.min(open, close) || high < low) return null;
  return { time, open, high, low, close, volume, confirmed: true };
}

export function clearTickerbotCache() {
  cache.clear();
}

/*
 * One upstream read, shared by the single-symbol bars route and the Characters beat route.
 * It never throws: it answers a result object so each route can apply its own status mapping,
 * caching policy and budget accounting.
 *
 *   { ok: true, packet }                       — normalized gi-market-context-v1 packet
 *   { ok: false, code, message, retryAfter? }  — code: rate-limit | unauthorized | forbidden |
 *                                                upstream | unreadable | empty | timeout | unreachable
 */
export async function fetchTickerbotMarketContext({
  symbol,
  interval = "1h",
  apiKey,
  fetcher,
  now = Date.now(),
  timeoutMs = 12_000,
  logFailure = true,
  dependencies = {}
} = {}) {
  const timeout = (typeof timeoutMs === "number" && Number.isFinite(timeoutMs)) ? timeoutMs : 12_000;
  const upstreamUrl = new URL(`/v2/bars/${symbol}/${interval}`, TICKERBOT_ORIGIN);
  upstreamUrl.searchParams.set("limit", String(BAR_LIMIT));
  // Tickerbot's asof contract returns only bars that have closed by this time.
  upstreamUrl.searchParams.set("asof", new Date(now).toISOString());
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;

  try {
    const response = await fetcher(upstreamUrl.toString(), {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}` },
      // Workers implements only "follow" and "manual": "error" makes fetch() throw a
      // TypeError before any network I/O, which surfaced as "could not be reached".
      // "manual" returns a 3xx as a plain response (never followed, so the key is
      // never replayed to another host); every non-2xx status is refused below.
      redirect: "manual",
      ...(controller ? { signal: controller.signal } : {})
    });
    if (!response || !response.ok) {
      const status = Number(response && response.status) || 0;
      if (status === 429) {
        const retryAfter = response.headers && response.headers.get ? response.headers.get("retry-after") : "";
        return {
          ok: false, code: "rate-limit",
          message: "Tickerbot rate limit reached. Wait before refreshing.",
          retryAfter: /^\d{1,5}$/.test(retryAfter || "") ? retryAfter : "60"
        };
      }
      if (status === 401) return { ok: false, code: "unauthorized", message: "Tickerbot rejected the configured API key. Check the Worker secret." };
      if (status === 403) return { ok: false, code: "forbidden", message: "The Tickerbot account does not have access to this bars request." };
      return { ok: false, code: "upstream", message: "Tickerbot could not provide market bars right now." };
    }

    let payload;
    try { payload = await response.json(); }
    catch { return { ok: false, code: "unreadable", message: "Tickerbot returned unreadable market data." }; }
    const rows = Array.isArray(payload && payload.bars) ? payload.bars : [];
    const bars = rows.map(toTickerbotBar).filter(Boolean).slice(-BAR_LIMIT);
    if (!bars.length) return { ok: false, code: "empty", message: "Tickerbot returned no bars for this ticker and interval." };

    const sourceTime = typeof payload.as_of === "string" ? payload.as_of.slice(0, 40) : "response time unavailable";
    return {
      ok: true,
      packet: {
        schema: "gi-market-context-v1",
        synthetic: false,
        source: `Tickerbot · split-adjusted OHLCV · as of ${sourceTime}`,
        symbol,
        timeframe: interval,
        bars
      }
    };
  } catch (error) {
    if (logFailure) logUpstreamFetchFailure(error, dependencies, apiKey);
    if (error && error.name === "AbortError") {
      return { ok: false, code: "timeout", message: "Tickerbot market request timed out. Try again shortly." };
    }
    return { ok: false, code: "unreachable", message: "Tickerbot could not be reached. Check the Worker connection and retry." };
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

/*
 * Category-only breadcrumb for Workers Logs when the upstream call throws. It says what kind of
 * failure it was (a TypeError with no cause means the request was rejected locally, before any
 * network I/O) and never why in words: no message, URL, header, key, stack or body is logged.
 * Mirrors the Z.AI relay's zai_upstream_fetch_failed.
 */
function logUpstreamFetchFailure(error, dependencies, apiKey) {
  try {
    const scrub = value => {
      const text = String(value === undefined || value === null ? "" : value);
      return apiKey ? text.split(apiKey).join("") : text;
    };
    const safeName = value => /^[A-Za-z][A-Za-z0-9]{0,31}$/.test(value) ? value : "";
    const safeCode = value => /^[A-Za-z0-9_:-]{1,40}$/.test(value) ? value : "";
    const cause = error && typeof error.cause === "object" ? error.cause : null;
    const entry = {
      event: "tickerbot_upstream_fetch_failed",
      errorName: safeName(scrub(error && error.name)) || "Error",
      causeName: safeName(scrub(cause && cause.name)),
      causeCode: safeCode(scrub(cause && cause.code))
    };
    if (typeof dependencies.log === "function") dependencies.log(entry);
    else console.warn("[HarshalOS tickerbot]", entry);
  } catch { /* Logging must never affect request handling. */ }
}

export async function handleGoodIntelligenceTickerbot(request, env = {}, dependencies = {}) {
  const url = new URL(request.url);
  if (url.pathname !== ROUTE) return failure("Tickerbot market route not found.", 404);
  if (request.method !== "GET") return failure("Tickerbot market data is read-only.", 405, { Allow: "GET" });

  const symbol = (url.searchParams.get("symbol") || "AAPL").trim().toUpperCase();
  const interval = (url.searchParams.get("interval") || "1h").trim();
  if (!SYMBOLS.has(symbol)) return failure(`Choose a ticker from the configured ${SYMBOLS.size}-symbol Tickerbot watchlist.`, 400);
  if (!INTERVALS.has(interval)) return failure("Choose a supported bar interval: 1h or 1d.", 400);
  const apiKey = typeof env.TICKERBOT_API_KEY === "string" ? env.TICKERBOT_API_KEY.trim() : "";
  if (!apiKey) return failure("Tickerbot is not configured on this Worker. Add the TICKERBOT_API_KEY Worker secret.", 503);

  const now = typeof dependencies.now === "function" ? dependencies.now() : Date.now();
  const cacheKey = `${symbol}:${interval}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) return json(cached.payload);
  if (cached) cache.delete(cacheKey);

  const fetcher = dependencies.fetch || globalThis.fetch;
  if (typeof fetcher !== "function") return failure("Tickerbot is unavailable in this Worker runtime.", 503);

  /* One durable, shared allowance covers every Tickerbot route that uses this key. The
     atomic D1 claim happens immediately before the upstream fetch and fails closed. */
  const claim = await claimTickerbotCall(env.COMMUNITY_DB, now);
  if (!claim.ok) {
    const status = claim.reason === "budget-exhausted" ? 429 : 503;
    return failure(claim.message, status);
  }

  const result = await fetchTickerbotMarketContext({
    symbol, interval, apiKey, fetcher, now,
    dependencies, logFailure: true
  });
  if (!result.ok) {
    if (result.code === "rate-limit") return failure(result.message, 429, { "Retry-After": result.retryAfter || "60" });
    if (result.code === "empty") return failure(result.message, 404);
    if (result.code === "timeout") return failure(result.message, 504);
    return failure(result.message, 502);
  }
  const payload = { success: true, environment: "tickerbot", data: result.packet };
  cache.set(cacheKey, { payload, expiresAt: now + CACHE_TTL_MS });
  return json(payload);
}
