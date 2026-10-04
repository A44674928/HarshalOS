/*
 * Read-only Alpha Vantage daily adapter for Characters only.
 *
 * The free TIME_SERIES_DAILY endpoint returns compact (up to 100 latest) unadjusted OHLCV.
 * It is never used for hourly beats. ALPHA_VANTAGE_API_KEY is a Worker secret; Alpha
 * Vantage requires it in the query string, so Wrangler observability must redact queries.
 */
import { isTickerbotSymbol } from "./good-intelligence-tickerbot.mjs";

const ALPHA_VANTAGE_ORIGIN = "https://www.alphavantage.co";
export const ALPHA_VANTAGE_DAILY_MAX_BARS = 100;
const DAILY_SERIES_KEY = "Time Series (Daily)";

function validDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

function parseProviderNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!/^[+-]?(?:[0-9]+(?:[.][0-9]*)?|[.][0-9]+)(?:[eE][+-]?[0-9]+)?$/.test(text)) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toAlphaVantageDailyBar(date, row) {
  if (!validDateKey(date) || !row || typeof row !== "object" || Array.isArray(row)) return null;
  const open = parseProviderNumber(row["1. open"]);
  const high = parseProviderNumber(row["2. high"]);
  const low = parseProviderNumber(row["3. low"]);
  const close = parseProviderNumber(row["4. close"]);
  const volume = parseProviderNumber(row["5. volume"]);
  if (![open, high, low, close, volume].every(Number.isFinite) ||
      Math.min(open, high, low, close) <= 0 || !Number.isSafeInteger(volume) || volume < 0 ||
      high < Math.max(open, close) || low > Math.min(open, close) || high < low) return null;
  return {
    time: Date.parse(`${date}T00:00:00.000Z`),
    open, high, low, close, volume,
    confirmed: true
  };
}

function easternSessionClock(at) {
  const date = new Date(Number(at));
  if (!Number.isFinite(date.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.filter(part => part.type !== "literal").map(part => [part.type, part.value]));
    const hour = Number(values.hour), minute = Number(values.minute);
    if (!values.year || !values.month || !values.day || !Number.isInteger(hour) || !Number.isInteger(minute)) return null;
    return {
      date: `${values.year}-${values.month}-${values.day}`,
      minutes: hour * 60 + minute
    };
  } catch {
    return null;
  }
}

/*
 * Never admit today's daily row before the regular US equity session has closed and
 * Alpha Vantage has had a short publication buffer. Waiting until 16:15 Eastern is
 * conservative on early-close days too; the previous confirmed session remains usable.
 */
export function isAlphaVantageDailyBarClosed(date, at = Date.now()) {
  if (!validDateKey(date)) return false;
  const clock = easternSessionClock(at);
  if (!clock) return false;
  if (date < clock.date) return true;
  if (date > clock.date) return false;
  return clock.minutes >= 16 * 60 + 15;
}

function failure(code, message, extra = {}) {
  return { ok: false, code, message, ...extra };
}

function safeName(value) {
  return typeof value === "string" && /^[A-Za-z][A-Za-z0-9]{0,31}$/.test(value) ? value : "";
}

function safeCode(value) {
  return typeof value === "string" && /^[A-Za-z0-9_:-]{1,40}$/.test(value) ? value : "";
}

function logUpstreamFetchFailure(error, dependencies) {
  try {
    const cause = error && typeof error.cause === "object" ? error.cause : null;
    const entry = {
      event: "alpha_vantage_upstream_fetch_failed",
      errorName: safeName(error && error.name) || "Error",
      causeName: safeName(cause && cause.name),
      causeCode: safeCode(cause && cause.code)
    };
    if (typeof dependencies.log === "function") dependencies.log(entry);
    else console.warn("[HarshalOS Alpha Vantage]", entry);
  } catch { /* Logging must never affect request handling. */ }
}

function providerMessage(payload) {
  const note = typeof payload?.Note === "string" ? payload.Note : "";
  const information = typeof payload?.Information === "string" ? payload.Information : "";
  const error = typeof payload?.["Error Message"] === "string" ? payload["Error Message"] : "";
  const text = `${note} ${information} ${error}`.toLowerCase();
  if (/rate|limit|frequency|requests per day|quota/.test(text)) {
    return failure("alpha-vantage-rate-limit", "Alpha Vantage's daily request limit or frequency limit was reached. No additional Alpha Vantage data was used.");
  }
  if (note || information || error) {
    return failure("alpha-vantage-upstream", "Alpha Vantage could not provide daily market data for this ticker right now.");
  }
  return failure("alpha-vantage-unreadable", "Alpha Vantage returned no recognizable daily market data.");
}

/*
 * One request to Alpha Vantage's free daily endpoint. The caller must atomically claim
 * the separate D1 daily allowance immediately before invoking this helper.
 *
 *   { ok: true, packet }                    — normalized gi-market-context-v1 packet
 *   { ok: false, code, message, retryAfter? } — safe, provider-body-free failure
 */
export async function fetchAlphaVantageDailyMarketContext({
  symbol,
  apiKey,
  fetcher = globalThis.fetch,
  now = Date.now(),
  timeoutMs = 10_000,
  dependencies = {}
} = {}) {
  const normalizedSymbol = String(symbol || "").trim().toUpperCase();
  if (!isTickerbotSymbol(normalizedSymbol)) {
    return failure("alpha-vantage-symbol-refused", "This ticker is not on the reviewed Characters watchlist.");
  }
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    return failure("alpha-vantage-not-configured", "Add the ALPHA_VANTAGE_API_KEY Worker secret to enable the daily fallback.");
  }
  if (typeof fetcher !== "function") {
    return failure("alpha-vantage-unavailable", "Alpha Vantage is unavailable in this Worker runtime.");
  }

  const url = new URL("/query", ALPHA_VANTAGE_ORIGIN);
  url.searchParams.set("function", "TIME_SERIES_DAILY");
  url.searchParams.set("symbol", normalizedSymbol);
  url.searchParams.set("outputsize", "compact");
  url.searchParams.set("apikey", apiKey.trim());

  const timeout = Number.isFinite(Number(timeoutMs)) ? Math.max(1, Number(timeoutMs)) : 10_000;
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;
  try {
    const response = await fetcher(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      /* The API key is in the query string. Never replay it to a redirect target. */
      redirect: "manual",
      ...(controller ? { signal: controller.signal } : {})
    });
    if (!response || !response.ok) {
      const status = Number(response && response.status) || 0;
      if (status === 429) {
        return failure("alpha-vantage-rate-limit", "Alpha Vantage's daily request limit was reached. Try after its allowance resets.", { retryAfter: "60" });
      }
      if (status === 401 || status === 403) {
        return failure("alpha-vantage-upstream", "Alpha Vantage rejected the configured API request. Check the Worker secret and endpoint access.");
      }
      return failure("alpha-vantage-upstream", "Alpha Vantage could not provide daily market data right now.");
    }

    let payload;
    try { payload = await response.json(); }
    catch { return failure("alpha-vantage-unreadable", "Alpha Vantage returned unreadable daily market data."); }

    const returnedSymbol = typeof payload?.["Meta Data"]?.["2. Symbol"] === "string"
      ? payload["Meta Data"]["2. Symbol"].trim().toUpperCase()
      : "";
    if (returnedSymbol && returnedSymbol !== normalizedSymbol) {
      return failure("alpha-vantage-symbol-mismatch", "Alpha Vantage returned daily data for a different ticker; those bars were refused.");
    }

    const series = payload && payload[DAILY_SERIES_KEY];
    if (!series || typeof series !== "object" || Array.isArray(series)) return providerMessage(payload);

    const bars = Object.entries(series)
      .filter(([date]) => isAlphaVantageDailyBarClosed(date, now))
      .map(([date, row]) => toAlphaVantageDailyBar(date, row))
      .filter(Boolean)
      .sort((left, right) => left.time - right.time)
      .slice(-ALPHA_VANTAGE_DAILY_MAX_BARS);
    if (!bars.length) {
      return failure("alpha-vantage-empty", "Alpha Vantage returned no closed daily bars for this ticker yet.");
    }

    const latestDate = new Date(bars[bars.length - 1].time).toISOString().slice(0, 10);
    return {
      ok: true,
      packet: {
        schema: "gi-market-context-v1",
        synthetic: false,
        source: `Alpha Vantage · unadjusted compact daily OHLCV · last closed session ${latestDate}`,
        symbol: normalizedSymbol,
        timeframe: "1d",
        bars
      }
    };
  } catch (error) {
    logUpstreamFetchFailure(error, dependencies);
    if (error && error.name === "AbortError") {
      return failure("alpha-vantage-timeout", "Alpha Vantage's daily market request timed out. Try again shortly.");
    }
    return failure("alpha-vantage-unreachable", "Alpha Vantage could not be reached from this Worker.");
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}
