/*
 * Read-only Tickerbot OHLCV adapter for Good Intelligence Market Charts.
 * The provider key stays inside the Worker; only a fixed upstream origin is used.
 */
const ROUTE = "/api/good-intelligence/v1/market/tickerbot/bars";
const TICKERBOT_ORIGIN = "https://api.tickerbot.io";
const SYMBOLS = new Set(["AAPL", "MSFT", "NVDA"]);
const INTERVALS = new Set(["1h", "1d"]);
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

function toBar(row) {
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
  if (!SYMBOLS.has(symbol)) return failure("Choose a ticker from the configured Tickerbot watchlist.", 400);
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
  const upstreamUrl = new URL(`/v2/bars/${symbol}/${interval}`, TICKERBOT_ORIGIN);
  upstreamUrl.searchParams.set("limit", String(BAR_LIMIT));
  // Tickerbot's asof contract returns only bars that have closed by this time.
  upstreamUrl.searchParams.set("asof", new Date(now).toISOString());
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeout = controller ? setTimeout(() => controller.abort(), 12_000) : null;

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
        const safeRetryAfter = /^\d{1,5}$/.test(retryAfter || "") ? retryAfter : "60";
        return failure("Tickerbot rate limit reached. Wait before refreshing.", 429, { "Retry-After": safeRetryAfter });
      }
      if (status === 401) return failure("Tickerbot rejected the configured API key. Check the Worker secret.", 502);
      if (status === 403) return failure("The Tickerbot account does not have access to this bars request.", 502);
      return failure("Tickerbot could not provide market bars right now.", 502);
    }

    let payload;
    try { payload = await response.json(); }
    catch { return failure("Tickerbot returned unreadable market data.", 502); }
    const rows = Array.isArray(payload && payload.bars) ? payload.bars : [];
    const bars = rows.map(toBar).filter(Boolean).slice(-BAR_LIMIT);
    if (!bars.length) return failure("Tickerbot returned no bars for this ticker and interval.", 404);

    const sourceTime = typeof payload.as_of === "string" ? payload.as_of.slice(0, 40) : "response time unavailable";
    const marketContext = {
      schema: "gi-market-context-v1",
      synthetic: false,
      source: `Tickerbot · split-adjusted OHLCV · as of ${sourceTime}`,
      symbol,
      timeframe: interval,
      bars
    };
    const result = { success: true, environment: "tickerbot", data: marketContext };
    cache.set(cacheKey, { payload: result, expiresAt: now + CACHE_TTL_MS });
    return json(result);
  } catch (error) {
    logUpstreamFetchFailure(error, dependencies, apiKey);
    if (error && error.name === "AbortError") return failure("Tickerbot market request timed out. Try again shortly.", 504);
    return failure("Tickerbot could not be reached. Check the Worker connection and retry.", 502);
  } finally {
    if (timeout !== null) clearTimeout(timeout);
  }
}
