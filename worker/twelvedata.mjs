/* Read-only proxy for Twelve Data (https://api.twelvedata.com) used only when
   the site is private sole-use (COMMUNITY_ENABLED=false + Access gate).
   Free tier: 800/day, 8/min global, delayed 1-15min, personal/internal only
   (Basic/Grow/Pro internal, no third-party display; Business Venture+ for
   public commercial display). The key is a Cloudflare secret (TWELVEDATA_API_KEY).

   This proxy is intentionally bounded: it only allows the reviewed time_series
   shape the field needs (symbol, interval 1day, outputsize). It is not a
   generic Twelve Data relay. The 8/min gate is in-memory per isolate, like the
   Massive per-asset-class gate, and is a safeguard, not a durable quota. */

export const TWELVEDATA_ORIGIN = "https://api.twelvedata.com";
export const TWELVEDATA_ROUTE_PREFIX = "/api/twelvedata/v1";
export const TWELVEDATA_API_ROUTES = Object.freeze({
  timeSeries: `${TWELVEDATA_ROUTE_PREFIX}/time_series`
});

const CACHE_TTL_MS = 60_000;
const CACHE_CAPACITY = 128;
const WINDOW_MS = 60_000;
export const TWELVEDATA_REQUESTS_PER_MIN = 8;
const FETCH_TIMEOUT_MS = 12_000;

let cache = new Map();
let windowCalls = [];

const json = (value, status = 200) => Response.json(value, {
  status,
  headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" }
});
const failure = (code, message, status = 502, extra = {}) => json({ success: false, code, message, ...extra }, status);

export function clearTwelveDataCache() { cache = new Map(); windowCalls = []; }

function cacheGet(key, now) {
  const e = cache.get(key);
  if (!e) return null;
  if (e.expiresAt <= now) { cache.delete(key); return null; }
  cache.delete(key); cache.set(key, e); return e.data;
}
function cacheSet(key, data, now) {
  cache.delete(key); cache.set(key, { data, expiresAt: now + CACHE_TTL_MS });
  while (cache.size > CACHE_CAPACITY) cache.delete(cache.keys().next().value);
}
function pruneWindow(now) {
  windowCalls = windowCalls.filter(t => now - t < WINDOW_MS);
  return windowCalls;
}
export function availableTwelveDataBudget(now = Date.now()) {
  pruneWindow(now);
  return { remaining: Math.max(0, TWELVEDATA_REQUESTS_PER_MIN - windowCalls.length) };
}
export function consumeTwelveDataBudget(now = Date.now()) {
  pruneWindow(now);
  if (windowCalls.length >= TWELVEDATA_REQUESTS_PER_MIN) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((windowCalls[0] + WINDOW_MS - now) / 1000)) };
  }
  windowCalls.push(now);
  return { ok: true };
}

function invalid(message) { return { ok: false, message }; }

function buildTimeSeries(params) {
  const symbol = (params.get("symbol") || "").trim();
  if (!symbol || symbol.length > 48) return invalid("Enter a reviewed symbol (e.g. AAPL, EUR/USD).");
  // Allow only reviewed shapes: FX like EUR/USD, indices like NDX, or bare stock
  if (!/^[A-Z0-9\/._:-]{1,48}$/i.test(symbol)) return invalid("Symbol contains an unsupported character.");
  const interval = (params.get("interval") || "1day").trim().toLowerCase();
  if (interval !== "1day" && interval !== "1day") return invalid("Interval must be 1day for the bounded field.");
  let outputsize = 30;
  const rawSize = params.get("outputsize");
  if (rawSize !== null && rawSize.trim() !== "") {
    if (!/^\d+$/.test(rawSize.trim())) return invalid("outputsize must be a number 1-60.");
    outputsize = Number(rawSize.trim());
    if (outputsize < 1 || outputsize > 60) return invalid("outputsize must be between 1 and 60.");
  }
  return {
    ok: true,
    cacheKey: `twelvedata|${symbol.toUpperCase()}|${interval}|${outputsize}`,
    upstream: { path: "/time_series", query: { symbol, interval, outputsize: String(outputsize) } }
  };
}
const BUILDERS = Object.freeze({ "time_series": buildTimeSeries, "time-series": buildTimeSeries });

export async function handleTwelveData(request, env = {}, dependencies = {}) {
  const url = new URL(request.url);
  if (url.pathname !== TWELVEDATA_ROUTE_PREFIX && !url.pathname.startsWith(`${TWELVEDATA_ROUTE_PREFIX}/`)) {
    return failure("not-found", "Twelve Data route not found.", 404);
  }
  if (request.method !== "GET") return failure("method-not-allowed", "Twelve Data is read-only.", 405);
  const sub = url.pathname.slice(TWELVEDATA_ROUTE_PREFIX.length).replace(/^\//, "");
  const builder = BUILDERS[sub] || BUILDERS["time_series"];
  if (!sub || !BUILDERS[sub]) return failure("not-found", "Unknown Twelve Data endpoint. Use time_series.", 404);
  const built = builder(url.searchParams);
  if (!built.ok) return failure("invalid-request", built.message, 400);
  const apiKey = typeof env.TWELVEDATA_API_KEY === "string" ? env.TWELVEDATA_API_KEY.trim() : "";
  if (!apiKey) return failure("not-configured", "Add TWELVEDATA_API_KEY as a Worker secret to enable Twelve Data (800/day 8/min private internal).", 503);
  const now = Number.isFinite(Number(dependencies.now ?? Date.now())) ? Number(dependencies.now) : Date.now();
  const cached = cacheGet(built.cacheKey, now);
  if (cached) return json({ success: true, cached: true, data: cached });
  const budget = consumeTwelveDataBudget(now);
  if (!budget.ok) return failure("rate-limited", "Twelve Data per-minute envelope (8/min) is spent. Wait a moment.", 429, { retryAfterSeconds: budget.retryAfterSeconds });
  const fetcher = dependencies.fetcher || globalThis.fetch;
  if (typeof fetcher !== "function") return failure("unavailable", "Twelve Data is unavailable in this runtime.", 503);
  const upstreamUrl = new URL(built.upstream.path, TWELVEDATA_ORIGIN);
  for (const [k, v] of Object.entries(built.upstream.query)) upstreamUrl.searchParams.set(k, v);
  upstreamUrl.searchParams.set("apikey", apiKey);
  // Default to JSON; apikey in query is Twelve Data's documented form (not Authorization header).
  upstreamUrl.searchParams.set("format", "JSON");
  const timeoutMs = Number.isFinite(Number(dependencies.timeoutMs)) ? Math.max(1, Number(dependencies.timeoutMs)) : FETCH_TIMEOUT_MS;
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const res = await fetcher(upstreamUrl.toString(), { method: "GET", headers: { Accept: "application/json" }, redirect: "manual", ...(controller ? { signal: controller.signal } : {}) });
    if (!res || !res.ok) {
      const status = Number(res && res.status) || 0;
      if (status === 429) {
        const retryAfter = res.headers && res.headers.get ? res.headers.get("retry-after") : "";
        return failure("upstream-rate-limited", "Twelve Data rate limit reached (8/min).", 429, { retryAfterSeconds: /^\d{1,5}$/.test(retryAfter || "") ? Number(retryAfter) : 60 });
      }
      if (status === 401 || status === 403) return failure("credentials-rejected", "Twelve Data rejected the Worker key. Check TWELVEDATA_API_KEY.", 502);
      return failure("upstream-error", "Twelve Data could not serve this request.", 502);
    }
    let payload;
    try { payload = await res.json(); } catch { return failure("unreadable-response", "Twelve Data returned unreadable data.", 502); }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return failure("unexpected-response", "Twelve Data returned an unexpected shape.", 502);
    if (payload.status === "error") {
      const msg = String(payload.message || "");
      if (/rate|limit/i.test(msg)) return failure("upstream-rate-limited", "Twelve Data rate limit reached.", 429);
      if (/apikey|api key/i.test(msg)) return failure("credentials-rejected", "Twelve Data rejected the key.", 502);
      return failure("upstream-error", "Twelve Data could not serve this request.", 502);
    }
    cacheSet(built.cacheKey, payload, now);
    return json({ success: true, cached: false, data: payload });
  } catch (e) {
    if (e && e.name === "AbortError") return failure("timeout", "Twelve Data request timed out.", 504);
    return failure("unreachable", "Twelve Data could not be reached.", 502);
  } finally { if (timer !== null) clearTimeout(timer); }
}

export const twelvedataInternals = Object.freeze({ BUILDERS, consumeTwelveDataBudget, availableTwelveDataBudget, TWELVEDATA_REQUESTS_PER_MIN });
