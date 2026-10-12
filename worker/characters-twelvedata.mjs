/*
 * HarshalOS — Twelve Data daily-series adapter for Characters.
 * Private sole-use replacement for Massive when TWELVEDATA_API_KEY is set.
 * Free tier: 800/day, 8/min, delayed 1-15min, personal/internal only.
 * Uses https://api.twelvedata.com/time_series?symbol=SYMBOL&interval=1day
 * Mirrors the Massive adapter's packet shape so orb2-field can stay agnostic.
 */

import "../js/characters-disc-catalog.js";

export const TWELVEDATA_ORIGIN = "https://api.twelvedata.com";
export const TWELVEDATA_DAILY_MAX_BARS = 60;
const DECIMAL = /^[+-]?(?:[0-9]+(?:[.][0-9]*)?|[.][0-9]+)(?:[eE][+-]?[0-9]+)?$/;

function providerNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !DECIMAL.test(value.trim())) return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function catalogEntry(collection, symbol) {
  const catalog = globalThis.CharactersDiscCatalog;
  const list = catalog && Array.isArray(catalog[collection]) ? catalog[collection] : [];
  return list.find(entry => entry && entry.symbol === symbol) || null;
}

function normalizeInstrument(value, now = Date.now()) {
  const record = typeof value === "string" ? { symbol: value, assetClass: "equity" } : value;
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;
  const symbol = typeof record.symbol === "string" ? record.symbol.trim().toUpperCase() : "";
  const assetClass = typeof record.assetClass === "string" ? record.assetClass : "";
  if (!symbol) return null;

  if (assetClass === "fx") {
    const entry = catalogEntry("fxCurrencies", symbol);
    if (!entry) return null;
    // Twelve Data FX format: EUR/USD, not C:EURUSD
    const tdSymbol = symbol.length === 6 ? `${symbol.slice(0,3)}/${symbol.slice(3)}` : symbol;
    return Object.freeze({
      symbol, displaySymbol: entry.displaySymbol, assetClass, dataShape: "ohlcv", quoteCurrency: entry.quoteCurrency || "USD",
      tdSymbol, sourceLabel: "forex daily"
    });
  }

  if (assetClass === "futures" || assetClass === "commodity") {
    const entry = catalogEntry("futures", symbol) || catalogEntry("commodities", symbol);
    if (!entry) return null;
    // Twelve Data futures: try productCode first (CL, GC etc), fallback to symbol (WTI, GOLD)
    // For private use, Twelve Data may list futures as e.g. WTI/USD or just CL - try both.
    // We use productCode if available, else symbol.
    const productCode = entry.massive && entry.massive.productCode ? String(entry.massive.productCode).toUpperCase() : symbol;
    // Map WTI->WTI/USD style? Twelve Data docs show commodities like WTI/USD not listed, but try productCode.
    // For now, use productCode as tdSymbol, keep original symbol for packet.
    const tdSymbol = productCode;
    return Object.freeze({
      symbol, displaySymbol: entry.displaySymbol, assetClass: "futures", dataShape: "ohlcv", quoteCurrency: entry.quoteCurrency,
      tdSymbol, sourceLabel: "futures daily"
    });
  }

  if (assetClass === "index") {
    const entry = catalogEntry("indices", symbol);
    if (!entry) return null;
    // Twelve Data indices: bare symbol (NDX), not I:NDX
    return Object.freeze({
      symbol, displaySymbol: entry.displaySymbol, assetClass, dataShape: "ohlc", quoteCurrency: entry.quoteCurrency || "USD",
      tdSymbol: symbol, sourceLabel: "indices daily"
    });
  }
  return null;
}

function makeRequestUrl(instrument, apiKey) {
  const url = new URL("/time_series", TWELVEDATA_ORIGIN);
  url.searchParams.set("symbol", instrument.tdSymbol);
  url.searchParams.set("interval", "1day");
  url.searchParams.set("outputsize", String(TWELVEDATA_DAILY_MAX_BARS));
  url.searchParams.set("order", "asc");
  url.searchParams.set("apikey", apiKey.trim());
  return url;
}

function validOhlc({ time, open, high, low, close }) {
  return Number.isFinite(time) && [open, high, low, close].every(Number.isFinite) &&
    Math.min(open, high, low, close) > 0 && high >= Math.max(open, close) && low <= Math.min(open, close) && high >= low;
}

function barFromTwelveData(row, currentDayStart) {
  // Twelve Data values: { datetime: "2021-09-16" or "2021-09-16 15:59:00", open, high, low, close, volume }
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const dt = typeof row.datetime === "string" ? row.datetime.trim() : "";
  if (!dt) return null;
  // Parse datetime as UTC midnight for daily interval
  let time = Date.parse(dt);
  if (!Number.isFinite(time)) {
    // Try without timezone, assume UTC
    time = Date.parse(dt.replace(" ", "T") + "Z");
  }
  if (!Number.isFinite(time)) return null;
  const open = providerNumber(row.open);
  const high = providerNumber(row.high);
  const low = providerNumber(row.low);
  const close = providerNumber(row.close);
  if (!validOhlc({ time, open, high, low, close })) return null;
  const bar = { time, open, high, low, close, confirmed: time < currentDayStart };
  const volume = providerNumber(row.volume);
  if (Number.isFinite(volume) && volume >= 0) bar.volume = volume;
  return bar;
}

const failure = (code, message, extra = {}) => ({ ok: false, code, message, ...extra });
const safeName = value => typeof value === "string" && /^[A-Za-z][A-Za-z0-9]{0,31}$/.test(value) ? value : "";
const safeCode = value => typeof value === "string" && /^[A-Za-z0-9_:-]{1,40}$/.test(value) ? value : "";

function logFetchFailure(error, dependencies) {
  try {
    const cause = error && typeof error.cause === "object" ? error.cause : null;
    const event = {
      event: "twelvedata_daily_upstream_fetch_failed",
      errorName: safeName(error && error.name) || "Error",
      causeName: safeName(cause && cause.name),
      causeCode: safeCode(cause && cause.code)
    };
    if (typeof dependencies.log === "function") dependencies.log(event);
    else console.warn("[HarshalOS TwelveData]", event);
  } catch { /* never affect request */ }
}

function providerFailure(payload, status) {
  const msg = typeof payload?.message === "string" ? payload.message : typeof payload?.code === "string" ? payload.code : "";
  if (status === 429 || /rate|limit|too many|throttl/i.test(msg)) {
    return failure("twelvedata-rate-limit", "Twelve Data per-minute envelope (8/min free) was reached. Daily bars wait for next window.");
  }
  if (status === 401 || /apikey|api key|unauthorized|invalid.*key/i.test(msg)) {
    return failure("twelvedata-key-unauthorized", "Twelve Data rejected the Worker key. Check TWELVEDATA_API_KEY.");
  }
  if (status === 403 || /plan|subscription|not.*authorized|permission/i.test(msg)) {
    return failure("twelvedata-plan-limited", "Twelve Data does not authorize this symbol under the current plan.");
  }
  return msg
    ? failure("twelvedata-upstream", "Twelve Data could not provide this daily series right now.")
    : failure("twelvedata-unreadable", "Twelve Data returned no recognizable daily series.");
}

export async function fetchTwelveDataDailyMarketContext({
  instrument: rawInstrument,
  symbol,
  apiKey,
  fetcher = globalThis.fetch,
  now = Date.now(),
  timeoutMs = 10_000,
  dependencies = {}
} = {}) {
  const original = rawInstrument && typeof rawInstrument === "object" ? rawInstrument : { symbol, assetClass: "equity" };
  const instrument = normalizeInstrument(original, now);
  if (!instrument) return failure("twelvedata-instrument-refused", "Twelve Data routing is limited to the reviewed FX, futures, and index instruments.");
  if (original.interval !== undefined && original.interval !== "1d") {
    return failure("twelvedata-interval-refused", "Twelve Data beats are restricted to 1d.");
  }
  if (typeof apiKey !== "string" || !apiKey.trim()) return failure("twelvedata-not-configured", "Add the TWELVEDATA_API_KEY Worker secret to enable Twelve Data daily beats.");
  if (typeof fetcher !== "function") return failure("twelvedata-unavailable", "Twelve Data is unavailable in this Worker runtime.");

  const requestUrl = makeRequestUrl(instrument, apiKey);
  const parsedTimeout = Number(timeoutMs);
  const timeout = Number.isFinite(parsedTimeout) ? Math.max(1, parsedTimeout) : 10_000;
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;

  try {
    const response = await fetcher(requestUrl.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      redirect: "manual",
      ...(controller ? { signal: controller.signal } : {})
    });
    if (!response || !response.ok) {
      const status = Number(response && response.status) || 0;
      let payload = null;
      try { payload = await response.json(); } catch { /* safe refusal below */ }
      if (status === 429) {
        const retry = response.headers && typeof response.headers.get === "function" ? response.headers.get("retry-after") : "";
        return failure("twelvedata-rate-limit", "Twelve Data per-minute envelope was reached.", {
          retryAfter: /^\d{1,5}$/.test(retry || "") ? retry : "60",
          httpStatus: 429
        });
      }
      // Twelve Data returns 200 with { code: 400, message: "...", status: "error" } for plan limits sometimes
      if (payload && payload.status === "error") {
        const code = String(payload.code || "");
        const msg = String(payload.message || "");
        if (code === "400" && /apikey|api key/i.test(msg)) {
          return failure("twelvedata-key-unauthorized", "Twelve Data rejected the Worker key.", { httpStatus: 401 });
        }
        if (/plan|subscription|not.*authorized/i.test(msg)) {
          return failure("twelvedata-plan-limited", "Twelve Data does not authorize this symbol under the current plan.", { httpStatus: 403 });
        }
      }
      return providerFailure(payload, status);
    }

    let payload;
    try { payload = await response.json(); } catch { return failure("twelvedata-unreadable", "Twelve Data returned unreadable daily data."); }
    // Twelve Data can return { code: 400, message: "...", status: "error" } with 200
    if (payload && payload.status === "error") {
      return providerFailure(payload, Number(payload.code) || 400);
    }
    const rows = Array.isArray(payload && payload.values) ? payload.values : [];
    const dayStart = Date.parse(`${new Date(Number(now)).toISOString().slice(0, 10)}T00:00:00.000Z`);
    const unique = new Map();
    for (const row of rows) {
      const bar = barFromTwelveData(row, dayStart);
      if (bar) unique.set(bar.time, bar);
    }
    const bars = [...unique.values()].sort((a, b) => a.time - b.time).slice(-TWELVEDATA_DAILY_MAX_BARS);
    if (!bars.length) return failure("twelvedata-empty", `Twelve Data returned no daily bars for ${instrument.tdSymbol} in the trailing window.`);

    const requestId = typeof payload.meta?.exchange === "string" ? payload.meta.exchange.slice(0, 24) : "n/a";
    return {
      ok: true,
      packet: {
        schema: "gi-market-context-v1",
        synthetic: false,
        source: `Twelve Data · ${instrument.sourceLabel} ${instrument.tdSymbol} bars · exchange ${requestId}`,
        symbol: instrument.symbol,
        timeframe: "1d",
        dataShape: instrument.dataShape,
        quoteCurrency: instrument.quoteCurrency,
        // keep massiveTicker field for compatibility with observation code that reads provider id - store tdSymbol there too
        massiveTicker: `TD:${instrument.tdSymbol}`,
        tdSymbol: instrument.tdSymbol,
        bars
      }
    };
  } catch (error) {
    logFetchFailure(error, dependencies);
    if (error && error.name === "AbortError") return failure("twelvedata-timeout", "Twelve Data daily request timed out.");
    return failure("twelvedata-unreachable", "Twelve Data could not be reached from this Worker.");
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

export const twelvedataDailyInternals = Object.freeze({
  normalizeInstrument,
  makeRequestUrl,
  barFromTwelveData,
  providerNumber,
  TWELVEDATA_DAILY_MAX_BARS
});
