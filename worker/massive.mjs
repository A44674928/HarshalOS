/* Read-only, rate-conscious proxy for the Massive REST market-data API
   (https://massive.com/docs/rest/quickstart). The Massive API key is a
   Cloudflare Worker secret and is sent only in the Authorization header —
   never as a URL parameter, browser setting, or response field.

   This route accepts only bounded, validated queries (asset class, ticker
   shape, bar window, currency codes); it is not an arbitrary Massive API
   relay. The Massive response JSON is passed through unchanged inside a
   { success, cached, data } envelope so an approved bounded caller can read
   Massive's documented field names (status, results, request_id, …). The former
   standalone desktop window has been retired.

   Pacing is best-effort and in-memory. Massive Basic documents five requests
   per minute per asset class; the Worker therefore keeps one sliding window
   per Massive subscription class rather than one deployment-wide bucket.
   Cloudflare isolate distribution/restarts mean this is a safeguard for the
   owner's shared key, not a durable or global quota. */

export const MASSIVE_ORIGIN = "https://api.massive.com";
export const MASSIVE_ROUTE_PREFIX = "/api/massive/v1";
export const MASSIVE_API_ROUTES = Object.freeze({
  bars: `${MASSIVE_ROUTE_PREFIX}/bars`,
  previousDay: `${MASSIVE_ROUTE_PREFIX}/previous-day`,
  tickerDetails: `${MASSIVE_ROUTE_PREFIX}/ticker-details`,
  lastTrade: `${MASSIVE_ROUTE_PREFIX}/last-trade`,
  dividends: `${MASSIVE_ROUTE_PREFIX}/dividends`,
  conversion: `${MASSIVE_ROUTE_PREFIX}/conversion`
});

/* Asset classes and their Massive ticker shapes for the retained bounded
   Worker routes. There is no active standalone browser app for these routes.
   Massive ticker formats: U.S. stocks are bare symbols (AAPL, BRK.A); crypto
   pairs use the X: prefix (X:BTCUSD); forex pairs use C: (C:EURUSD); indices
   use I: (I:SPX). */
export const MASSIVE_ASSETS = Object.freeze({
  stocks: Object.freeze({ label: "U.S. stocks", tickerPattern: "^[A-Z][A-Z0-9.\\-]{0,11}$", example: "AAPL" }),
  crypto: Object.freeze({ label: "Crypto pairs", tickerPattern: "^X:[A-Z0-9]{3,24}$", example: "X:BTCUSD" }),
  forex: Object.freeze({ label: "Forex pairs", tickerPattern: "^C:[A-Z]{6}$", example: "C:EURUSD" }),
  indices: Object.freeze({ label: "Indices", tickerPattern: "^I:[A-Z0-9.]{1,12}$", example: "I:SPX" })
});

/* Massive aggregate windows (the "timespan" path segment). */
export const MASSIVE_TIMESPANS = Object.freeze(["minute", "hour", "day", "week", "month", "quarter", "year"]);

/* Maximum from→to span per request, in days, per timespan. Fine-grained
   windows stay short so one browser click cannot pull an unbounded series. */
export const MASSIVE_RANGE_LIMIT_DAYS = Object.freeze({
  minute: 90, hour: 90, day: 3660, week: 7320, month: 14610, quarter: 14610, year: 14610
});

export const MASSIVE_MAX_BAR_LIMIT = 5000;
export const MASSIVE_MAX_DIVIDEND_LIMIT = 100;
const CACHE_TTL_MS = 60_000;
const CACHE_CAPACITY = 128;
const WINDOW_MS = 60_000;
export const MASSIVE_REQUESTS_PER_MINUTE_PER_ASSET_CLASS = 5;
const DEFAULT_CLIENT_LIMIT_PER_MINUTE = 5;
const MASSIVE_ASSET_CLASSES = Object.freeze(["stocks", "options", "indices", "currencies", "futures"]);
const CLIENT_BUCKET_CAPACITY = 512;
const FETCH_TIMEOUT_MS = 12_000;
const CURRENCY_CODE = /^[A-Z]{3}$/;

let cache = new Map();
let assetClassWindows = new Map();
let clientWindows = new Map();

const json = (value, status = 200) => Response.json(value, {
  status,
  headers: {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer"
  }
});

const failure = (code, message, status = 502, extra = {}) =>
  json({ success: false, code, message, ...extra }, status);

export function clearMassiveCache() {
  cache = new Map();
  assetClassWindows = new Map();
  clientWindows = new Map();
}

function cacheGet(key, now) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    cache.delete(key);
    return null;
  }
  cache.delete(key);
  cache.set(key, entry);
  return entry.data;
}

function cacheSet(key, data, now) {
  cache.delete(key);
  cache.set(key, { data, expiresAt: now + CACHE_TTL_MS });
  while (cache.size > CACHE_CAPACITY) cache.delete(cache.keys().next().value);
}

function envLimit(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 1000 ? parsed : fallback;
}

/* Sliding-window budget: one window shared by the whole deployment (the
   Massive key belongs to the owner, so every visitor spends the same quota)
   and one window per client IP so a single caller cannot spend it all. */
/* Exported so other bounded Worker routes that use the same owner key can
   share this exact per-isolate envelope instead of maintaining a second,
   divergent rate bucket. */
function normalizeMassiveAssetClass(value) {
  const asset = String(value || "").trim().toLowerCase();
  if (asset === "crypto" || asset === "forex" || asset === "currencies") return "currencies";
  if (asset === "stocks" || asset === "options" || asset === "indices" || asset === "futures") return asset;
  return "unknown";
}

function requestMassiveAssetClass(request) {
  try {
    const url = request && request.url ? new URL(request.url) : null;
    return normalizeMassiveAssetClass(url && url.searchParams.get("asset"));
  } catch {
    return "unknown";
  }
}

function massiveBudgetWindows(request, env, now, assetClass = null) {
  const clientLimit = envLimit(env.MASSIVE_CLIENT_LIMIT_PER_MINUTE, DEFAULT_CLIENT_LIMIT_PER_MINUTE);
  const explicit = normalizeMassiveAssetClass(assetClass);
  const resolvedAssetClass = explicit !== "unknown" ? explicit : requestMassiveAssetClass(request);
  const classKey = resolvedAssetClass;
  const classWindow = (assetClassWindows.get(classKey) || []).filter(at => now - at < WINDOW_MS);
  assetClassWindows.set(classKey, classWindow);
  const address = request && request.headers && typeof request.headers.get === "function"
    ? request.headers.get("CF-Connecting-IP") : null;
  const key = typeof address === "string" && address.trim() && address.trim().length <= 64 ? address.trim() : "unknown";
  const clientWindow = (clientWindows.get(key) || []).filter(at => now - at < WINDOW_MS);
  clientWindows.set(key, clientWindow);
  return { assetClass: classKey, assetClassLimit: MASSIVE_REQUESTS_PER_MINUTE_PER_ASSET_CLASS, classWindow, clientLimit, key, clientWindow };
}

/** Read the remaining per-isolate allowance without spending a request. */
export function availableMassiveBudget(request, env = {}, now = Date.now(), assetClass = null) {
  const windows = massiveBudgetWindows(request, env, now, assetClass);
  return {
    assetClass: windows.assetClass,
    assetClassRemaining: Math.max(0, windows.assetClassLimit - windows.classWindow.length),
    clientRemaining: Math.max(0, windows.clientLimit - windows.clientWindow.length),
    remaining: Math.max(0, Math.min(
      windows.assetClassLimit - windows.classWindow.length,
      windows.clientLimit - windows.clientWindow.length
    ))
  };
}

/* Sliding-window budget: one window shared by the whole deployment (the
   Massive key belongs to the owner, so every visitor spends the same quota)
   and one window per client IP so a single caller cannot spend it all. */
/* Exported so other bounded Worker routes that use the same owner key can
   share this exact per-isolate envelope instead of maintaining a second,
   divergent rate bucket. */
export function consumeMassiveBudget(request, env = {}, now = Date.now(), assetClass = null) {
  const windows = massiveBudgetWindows(request, env, now, assetClass);
  if (windows.assetClass === "unknown") {
    return { ok: false, scope: "asset-class", code: "massive-asset-class-required", retryAfterSeconds: 0 };
  }
  if (windows.classWindow.length >= windows.assetClassLimit) {
    return {
      ok: false,
      scope: "asset-class",
      assetClass: windows.assetClass,
      retryAfterSeconds: Math.max(1, Math.ceil((windows.classWindow[0] + WINDOW_MS - now) / 1000))
    };
  }
  if (windows.clientWindow.length >= windows.clientLimit) {
    return {
      ok: false,
      scope: "client",
      assetClass: windows.assetClass,
      retryAfterSeconds: Math.max(1, Math.ceil((windows.clientWindow[0] + WINDOW_MS - now) / 1000))
    };
  }
  windows.classWindow.push(now);
  windows.clientWindow.push(now);
  clientWindows.delete(windows.key);
  clientWindows.set(windows.key, windows.clientWindow);
  if (clientWindows.size > CLIENT_BUCKET_CAPACITY) {
    for (const [oldKey, oldWindow] of clientWindows) {
      if (!oldWindow.length || now - oldWindow[oldWindow.length - 1] >= WINDOW_MS) clientWindows.delete(oldKey);
    }
    while (clientWindows.size > CLIENT_BUCKET_CAPACITY) clientWindows.delete(clientWindows.keys().next().value);
  }
  return { ok: true, assetClass: windows.assetClass };
}

/* ── request-shape validation ─────────────────────────────────────────── */

export function parseMassiveDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return null;
  const [year, month, day] = value.trim().split("-").map(Number);
  const utc = Date.UTC(year, month - 1, day);
  const date = new Date(utc);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  if (year < 1990 || year > 2100) return null;
  return utc;
}

function assetEntry(value) {
  const asset = typeof value === "string" ? value.trim().toLowerCase() : "";
  return Object.prototype.hasOwnProperty.call(MASSIVE_ASSETS, asset) ? { asset, spec: MASSIVE_ASSETS[asset] } : null;
}

function validatedTicker(entry, raw) {
  const ticker = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if (!ticker || ticker.length > 32) return null;
  return new RegExp(entry.spec.tickerPattern).test(ticker) ? ticker : null;
}

function integerParam(params, name, { min, max, fallback = null }) {
  const raw = params.get(name);
  if (raw === null || raw.trim() === "") return fallback;
  if (!/^\d+$/.test(raw.trim())) return undefined;
  const value = Number(raw.trim());
  if (value < min || value > max) return undefined;
  return value;
}

function invalid(message) {
  return { ok: false, message };
}

const assetNames = Object.keys(MASSIVE_ASSETS).join(", ");

function buildBars(params) {
  const entry = assetEntry(params.get("asset"));
  if (!entry) return invalid(`Choose an asset class: ${assetNames}.`);
  const ticker = validatedTicker(entry, params.get("ticker"));
  if (!ticker) return invalid(`Enter a ${entry.spec.label} ticker in Massive format, for example ${entry.spec.example}.`);
  const multiplier = integerParam(params, "multiplier", { min: 1, max: 100, fallback: 1 });
  if (multiplier === undefined) return invalid("Multiplier must be a whole number from 1 to 100.");
  const timespan = (params.get("timespan") || "day").trim().toLowerCase();
  if (!MASSIVE_TIMESPANS.includes(timespan)) return invalid(`Timespan must be one of: ${MASSIVE_TIMESPANS.join(", ")}.`);
  const from = parseMassiveDate(params.get("from"));
  const to = parseMassiveDate(params.get("to"));
  if (from === null || to === null) return invalid("from and to must be dates in YYYY-MM-DD format.");
  if (from > to) return invalid("The from date must be on or before the to date.");
  const maxDays = MASSIVE_RANGE_LIMIT_DAYS[timespan];
  if ((to - from) / 86_400_000 > maxDays) return invalid(`A ${timespan} request covers at most ${maxDays} days; narrow the range.`);
  const sort = (params.get("sort") || "asc").trim().toLowerCase();
  if (sort !== "asc" && sort !== "desc") return invalid("Sort must be asc or desc.");
  const limit = integerParam(params, "limit", { min: 1, max: MASSIVE_MAX_BAR_LIMIT, fallback: MASSIVE_MAX_BAR_LIMIT });
  if (limit === undefined) return invalid(`Limit must be a whole number from 1 to ${MASSIVE_MAX_BAR_LIMIT}.`);
  const fromIso = new Date(from).toISOString().slice(0, 10);
  const toIso = new Date(to).toISOString().slice(0, 10);
  return {
    ok: true,
    cacheKey: `bars|${ticker}|${multiplier}|${timespan}|${fromIso}|${toIso}|${sort}|${limit}`,
    assetClass: entry.asset === "crypto" || entry.asset === "forex" ? "currencies" : entry.asset,
    upstream: {
      path: `/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/${multiplier}/${timespan}/${fromIso}/${toIso}`,
      query: { adjusted: "true", sort, limit: String(limit) }
    }
  };
}

function buildSingleTicker(pathTemplate, { stocksOnly = false } = {}) {
  return params => {
    const entry = assetEntry(params.get("asset"));
    if (!entry) return invalid(`Choose an asset class: ${assetNames}.`);
    if (stocksOnly && entry.asset !== "stocks") return invalid("This route is wired for U.S. stocks only.");
    const ticker = validatedTicker(entry, params.get("ticker"));
    if (!ticker) return invalid(`Enter a ${entry.spec.label} ticker in Massive format, for example ${entry.spec.example}.`);
    return {
      ok: true,
      cacheKey: `${pathTemplate}|${ticker}`,
      assetClass: entry.asset === "crypto" || entry.asset === "forex" ? "currencies" : entry.asset,
      upstream: { path: pathTemplate.replace("{ticker}", encodeURIComponent(ticker)), query: {} }
    };
  };
}

function buildDividends(params) {
  const asset = params.get("asset");
  if (asset !== null && asset.trim() !== "" && asset.trim().toLowerCase() !== "stocks") {
    return invalid("Dividends are available for U.S. stocks only.");
  }
  const entry = { asset: "stocks", spec: MASSIVE_ASSETS.stocks };
  const ticker = validatedTicker(entry, params.get("ticker"));
  if (!ticker) return invalid(`Enter a U.S. stock ticker, for example ${MASSIVE_ASSETS.stocks.example}.`);
  const limit = integerParam(params, "limit", { min: 1, max: MASSIVE_MAX_DIVIDEND_LIMIT, fallback: 25 });
  if (limit === undefined) return invalid(`Limit must be a whole number from 1 to ${MASSIVE_MAX_DIVIDEND_LIMIT}.`);
  return {
    ok: true,
    cacheKey: `dividends|${ticker}|${limit}`,
    assetClass: "stocks",
    upstream: {
      path: "/stocks/v1/dividends",
      query: { ticker, limit: String(limit), sort: "ex_dividend_date.desc" }
    }
  };
}

function buildConversion(params) {
  const from = (params.get("from") || "").trim().toUpperCase();
  const to = (params.get("to") || "").trim().toUpperCase();
  if (!CURRENCY_CODE.test(from) || !CURRENCY_CODE.test(to)) return invalid("Enter both currencies as three-letter codes, for example USD and EUR.");
  if (from === to) return invalid("Choose two different currencies to convert between.");
  const rawAmount = params.get("amount");
  let amount = "1";
  if (rawAmount !== null && rawAmount.trim() !== "") {
    if (!/^\d{1,12}(?:\.\d{1,8})?$/.test(rawAmount.trim()) || Number(rawAmount.trim()) <= 0 || Number(rawAmount.trim()) > 1e12) {
      return invalid("Amount must be a positive number up to 1,000,000,000,000.");
    }
    amount = rawAmount.trim();
  }
  const precision = integerParam(params, "precision", { min: 0, max: 6, fallback: 2 });
  if (precision === undefined) return invalid("Precision must be a whole number from 0 to 6.");
  return {
    ok: true,
    cacheKey: `conversion|${from}|${to}|${amount}|${precision}`,
    assetClass: "currencies",
    upstream: {
      path: `/v1/conversion/${from}/${to}`,
      query: { amount, precision: String(precision) }
    }
  };
}

const BUILDERS = Object.freeze({
  "bars": buildBars,
  "previous-day": buildSingleTicker("/v2/aggs/ticker/{ticker}/prev"),
  "ticker-details": buildSingleTicker("/v3/reference/tickers/{ticker}"),
  "last-trade": buildSingleTicker("/v2/last/trade/{ticker}", { stocksOnly: true }),
  "dividends": buildDividends,
  "conversion": buildConversion
});

/* Category-only breadcrumb for Workers Logs when the upstream call throws.
   Never logs a message, URL, header, key, stack, or body. */
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
      event: "massive_upstream_fetch_failed",
      errorName: safeName(scrub(error && error.name)) || "Error",
      causeName: safeName(scrub(cause && cause.name)),
      causeCode: safeCode(scrub(cause && cause.code))
    };
    if (typeof dependencies.log === "function") dependencies.log(entry);
    else console.warn("[HarshalOS massive]", entry);
  } catch { /* Logging must never affect request handling. */ }
}

/** GET /api/massive/v1/{bars|previous-day|ticker-details|last-trade|dividends|conversion} */
export async function handleMassive(request, env = {}, dependencies = {}) {
  const url = new URL(request.url);
  if (url.pathname !== MASSIVE_ROUTE_PREFIX && !url.pathname.startsWith(`${MASSIVE_ROUTE_PREFIX}/`)) {
    return failure("not-found", "Massive route not found.", 404);
  }
  if (request.method !== "GET") {
    return failure("method-not-allowed", "Massive market data is read-only.", 405);
  }
  const sub = url.pathname.slice(MASSIVE_ROUTE_PREFIX.length).replace(/^\//, "");
  const builder = BUILDERS[sub];
  if (!builder) return failure("not-found", "Unknown Massive endpoint. Use bars, previous-day, ticker-details, last-trade, dividends, or conversion.", 404);

  const built = builder(url.searchParams);
  if (!built.ok) return failure("invalid-request", built.message, 400);

  const apiKey = typeof env.MASSIVE_API_KEY === "string" ? env.MASSIVE_API_KEY.trim() : "";
  if (!apiKey) {
    return failure("not-configured", "Add MASSIVE_API_KEY as a Worker secret to enable Massive market data.", 503);
  }

  const nowInput = Number(dependencies.now ?? Date.now());
  const now = Number.isFinite(nowInput) ? nowInput : Date.now();
  const cached = cacheGet(built.cacheKey, now);
  if (cached) return json({ success: true, cached: true, data: cached });

  const budget = consumeMassiveBudget(request, env, now, built.assetClass);
  if (!budget.ok) {
    return failure(
      "rate-limited",
      budget.scope === "deployment"
        ? "This deployment's Massive request budget is spent for the moment. Wait a little before asking again."
        : "This client has reached its Massive request budget. Wait a little before asking again.",
      429,
      { retryAfterSeconds: budget.retryAfterSeconds }
    );
  }

  const fetcher = dependencies.fetcher || globalThis.fetch;
  if (typeof fetcher !== "function") return failure("unavailable", "The Massive API is unavailable in this Worker runtime.", 503);

  const upstreamUrl = new URL(built.upstream.path, MASSIVE_ORIGIN);
  for (const [name, value] of Object.entries(built.upstream.query)) upstreamUrl.searchParams.set(name, value);
  const timeoutMs = Number.isFinite(Number(dependencies.timeoutMs)) ? Math.max(1, Number(dependencies.timeoutMs)) : FETCH_TIMEOUT_MS;
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await fetcher(upstreamUrl.toString(), {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}` },
      // "manual" returns a 3xx as a plain response instead of replaying the
      // Authorization header to another host; every non-2xx status is refused.
      redirect: "manual",
      ...(controller ? { signal: controller.signal } : {})
    });

    if (!response || !response.ok) {
      const status = Number(response && response.status) || 0;
      if (status === 429) {
        const retryAfter = response.headers && response.headers.get ? response.headers.get("retry-after") : "";
        return failure("upstream-rate-limited", "Massive rate limit reached. Wait before asking again.", 429, {
          retryAfterSeconds: /^\d{1,5}$/.test(retryAfter || "") ? Number(retryAfter) : 60
        });
      }
      if (status === 401 || status === 403) {
        return failure("credentials-rejected", "Massive rejected the Worker key. Check the MASSIVE_API_KEY Worker secret in Cloudflare; do not paste it into HarshalOS.", 502);
      }
      // Provider error bodies can include account- or request-specific detail.
      // Keep them out of the public API; callers receive a stable refusal only.
      return failure("upstream-error", "Massive could not serve this request.", 502);
    }

    let payload;
    try { payload = await response.json(); }
    catch { return failure("unreadable-response", "Massive returned unreadable data.", 502); }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return failure("unexpected-response", "Massive returned an unexpected response shape.", 502);
    }

    cacheSet(built.cacheKey, payload, now);
    return json({ success: true, cached: false, data: payload });
  } catch (error) {
    logUpstreamFetchFailure(error, dependencies, apiKey);
    if (error && error.name === "AbortError") {
      return failure("timeout", "Massive request timed out. Try again shortly.", 504);
    }
    return failure("unreachable", "Massive could not be reached from this Worker.", 502);
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

export const massiveInternals = Object.freeze({
  BUILDERS,
  consumeMassiveBudget,
  parseMassiveDate,
  CACHE_TTL_MS,
  WINDOW_MS,
  DEFAULT_DEPLOYMENT_LIMIT_PER_MINUTE,
  DEFAULT_CLIENT_LIMIT_PER_MINUTE
});
