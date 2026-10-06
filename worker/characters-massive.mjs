/*
 * HarshalOS — reviewed Massive daily-series adapter for Characters.
 *
 * This is intentionally narrower than worker/massive.mjs (the interactive
 * desktop proxy). Characters may ask only for a reviewed Disc instrument and
 * only for a 1d series. The caller owns cache, D1 allowance, and the shared
 * per-minute budget; this adapter owns the upstream shape and conservative
 * packet normalization. Characters routes Massive only to reviewed FX,
 * futures, and index instruments; Tickerbot owns stocks and Kraken owns crypto.
 * No browser input or API key is interpolated into an arbitrary upstream URL.
 */

import "../js/characters-disc-catalog.js";

export const MASSIVE_DAILY_ORIGIN = "https://api.massive.com";
export const MASSIVE_DAILY_MAX_BARS = 60;
const DECIMAL = /^[+-]?(?:[0-9]+(?:[.][0-9]*)?|[.][0-9]+)(?:[eE][+-]?[0-9]+)?$/;
const FUTURES_TICKER = /^[A-Z0-9]{1,8}[FGHJKMNQUVXZ]\d{1,2}$/;

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

/** Convert a reviewed catalog object into one immutable Massive request shape. */
function normalizeInstrument(value, now = Date.now()) {
  const record = typeof value === "string" ? { symbol: value, assetClass: "equity" } : value;
  if (!record || typeof record !== "object" || Array.isArray(record)) return null;
  const symbol = typeof record.symbol === "string" ? record.symbol.trim().toUpperCase() : "";
  const assetClass = typeof record.assetClass === "string" ? record.assetClass : "";
  if (!symbol) return null;

  if (assetClass === "fx") {
    const entry = catalogEntry("fxCurrencies", symbol);
    const ticker = entry && entry.massive && entry.massive.ticker;
    if (!entry || typeof ticker !== "string" || !/^C:[A-Z]{6}$/.test(ticker)) return null;
    return Object.freeze({
      symbol, displaySymbol: entry.displaySymbol, assetClass, dataShape: "ohlcv", quoteCurrency: entry.quoteCurrency || "USD",
      massiveTicker: ticker, family: "aggs", sourceLabel: "forex daily"
    });
  }

  if (assetClass === "futures" || assetClass === "commodity") {
    const entry = catalogEntry("futures", symbol) || catalogEntry("commodities", symbol);
    const catalogMassive = entry && entry.massive;
    const massive = record.massive && typeof record.massive === "object" ? record.massive : null;
    const contract = record.massiveContract && typeof record.massiveContract === "object" ? record.massiveContract : null;
    const productCode = String(catalogMassive && catalogMassive.productCode || "").trim().toUpperCase();
    const ticker = String(massive && massive.ticker || "").trim().toUpperCase();
    const today = new Date(Number(now)).toISOString().slice(0, 10);
    const lastTradeDate = String(contract && contract.lastTradeDate || "");
    const contractDateValid = /^\d{4}-\d{2}-\d{2}$/.test(lastTradeDate) &&
      Number.isFinite(Date.parse(`${lastTradeDate}T00:00:00.000Z`)) && lastTradeDate >= today;
    if (!entry || !catalogMassive || !massive || massive.family !== "futures" ||
        String(massive.productCode || "").toUpperCase() !== productCode || !/^[A-Z0-9]{1,8}$/.test(productCode) ||
        !FUTURES_TICKER.test(ticker) || !ticker.startsWith(productCode) || !contract ||
        contract.provider !== "Massive" || contract.productCode !== productCode ||
        contract.ticker !== ticker || contract.asOfDate !== today || !contractDateValid) return null;
    const massiveContract = Object.freeze({
      provider: "Massive", productCode, ticker, asOfDate: today, lastTradeDate,
      ...(Number.isInteger(contract.daysToMaturity) && contract.daysToMaturity >= 0
        ? { daysToMaturity: contract.daysToMaturity } : {}),
      ...(typeof contract.name === "string" && contract.name.trim() ? { name: contract.name.trim().slice(0, 120) } : {})
    });
    return Object.freeze({
      symbol, displaySymbol: entry.displaySymbol, assetClass: "futures", dataShape: "ohlcv", quoteCurrency: entry.quoteCurrency,
      massiveTicker: ticker, family: "futures", sourceLabel: "futures session", massiveContract
    });
  }

  if (assetClass === "index") {
    const entry = catalogEntry("indices", symbol);
    const ticker = entry && entry.massive && entry.massive.ticker;
    if (!entry || typeof ticker !== "string" || !/^I:[A-Z0-9.]{1,12}$/.test(ticker)) return null;
    return Object.freeze({
      symbol, displaySymbol: entry.displaySymbol, assetClass, dataShape: "ohlc", quoteCurrency: entry.quoteCurrency || "USD",
      massiveTicker: ticker, family: "aggs", sourceLabel: "indices daily"
    });
  }
  return null;
}

function isoDaysAgo(at, days) {
  return new Date(Number(at) - days * 86_400_000).toISOString().slice(0, 10);
}

/** Builds one fixed Massive path from a normalized reviewed instrument. */
function makeRequestUrl(instrument, at) {
  const from = isoDaysAgo(at, 45);
  if (instrument.family === "futures") {
    const url = new URL(`/futures/v1/aggs/${encodeURIComponent(instrument.massiveTicker)}`, MASSIVE_DAILY_ORIGIN);
    url.searchParams.set("resolution", "1session");
    url.searchParams.set("window_start.gte", from);
    url.searchParams.set("limit", String(MASSIVE_DAILY_MAX_BARS));
    url.searchParams.set("sort", "window_start.asc");
    return url;
  }
  const to = isoDaysAgo(at, 0);
  const url = new URL(`/v2/aggs/ticker/${encodeURIComponent(instrument.massiveTicker)}/range/1/day/${from}/${to}`, MASSIVE_DAILY_ORIGIN);
  url.searchParams.set("adjusted", "true");
  url.searchParams.set("sort", "asc");
  url.searchParams.set("limit", String(MASSIVE_DAILY_MAX_BARS));
  return url;
}

function validOhlc({ time, open, high, low, close }) {
  return Number.isFinite(time) && [open, high, low, close].every(Number.isFinite) &&
    Math.min(open, high, low, close) > 0 && high >= Math.max(open, close) && low <= Math.min(open, close) && high >= low;
}

function barFromAggs(row, currentDayStart) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const time = providerNumber(row.t);
  const open = providerNumber(row.o);
  const high = providerNumber(row.h);
  const low = providerNumber(row.l);
  const close = providerNumber(row.c);
  if (!validOhlc({ time, open, high, low, close })) return null;
  const bar = { time, open, high, low, close, confirmed: time < currentDayStart };
  const volume = providerNumber(row.v);
  if (Number.isFinite(volume) && volume >= 0) bar.volume = volume;
  return bar;
}

function barFromFutures(row, currentDayStart) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const startNs = providerNumber(row.window_start);
  const time = Number.isFinite(startNs) ? Math.round(startNs / 1e6) : null;
  const open = providerNumber(row.open);
  const high = providerNumber(row.high);
  const low = providerNumber(row.low);
  const close = providerNumber(row.close);
  if (!validOhlc({ time, open, high, low, close })) return null;
  /* A futures session opens on the preceding UTC date. Prefer its documented
     settlement date when deciding whether the daily candle is closed; using
     window_start alone would accidentally mark today's live session closed. */
  const sessionEndDate = typeof row.session_end_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.session_end_date)
    ? row.session_end_date : "";
  const sessionEndStart = sessionEndDate ? Date.parse(`${sessionEndDate}T00:00:00.000Z`) : null;
  const confirmedAt = Number.isFinite(sessionEndStart) ? sessionEndStart : time;
  const bar = { time, open, high, low, close, confirmed: confirmedAt < currentDayStart };
  const volume = providerNumber(row.volume);
  if (Number.isFinite(volume) && volume >= 0) bar.volume = volume;
  if (sessionEndDate) bar.sessionEndDate = sessionEndDate;
  return bar;
}

const failure = (code, message, extra = {}) => ({ ok: false, code, message, ...extra });
const safeName = value => typeof value === "string" && /^[A-Za-z][A-Za-z0-9]{0,31}$/.test(value) ? value : "";
const safeCode = value => typeof value === "string" && /^[A-Za-z0-9_:-]{1,40}$/.test(value) ? value : "";

function logFetchFailure(error, dependencies) {
  try {
    const cause = error && typeof error.cause === "object" ? error.cause : null;
    const event = {
      event: "massive_daily_upstream_fetch_failed",
      errorName: safeName(error && error.name) || "Error",
      causeName: safeName(cause && cause.name),
      causeCode: safeCode(cause && cause.code)
    };
    if (typeof dependencies.log === "function") dependencies.log(event);
    else console.warn("[HarshalOS Massive]", event);
  } catch { /* Never let breadcrumb logging affect a request. */ }
}

function providerFailure(payload) {
  /* Upstream error text is not a safe response channel: providers may include
     request identifiers, URL fragments, or account-specific detail. Only use
     it to classify a rate-limit response, then return a stable public message. */
  const raw = typeof payload?.error === "string" ? payload.error : typeof payload?.message === "string" ? payload.message : "";
  if (/rate|limit|too many|throttl/i.test(raw)) {
    return failure("massive-rate-limit", "Massive's per-minute request envelope was reached. Daily bars are not substituted from another provider.");
  }
  return raw
    ? failure("massive-upstream", "Massive could not provide this daily market series right now.")
    : failure("massive-unreadable", "Massive returned no recognizable daily market series.");
}

/**
 * Fetch one explicit daily series. The Characters beat route must claim its
 * daily D1 slot and shared Massive minute budget before calling this helper.
 */
export async function fetchMassiveDailyMarketContext({
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
  if (!instrument) return failure("massive-instrument-refused", "Massive Characters routing is limited to the reviewed FX, futures, and index instruments.");
  if (original.interval !== undefined && original.interval !== "1d") {
    return failure("massive-interval-refused", "Massive Characters beats are restricted to an explicit 1d request; Tickerbot serves stock 1h on demand.");
  }
  if (typeof apiKey !== "string" || !apiKey.trim()) return failure("massive-not-configured", "Add the MASSIVE_API_KEY Worker secret to enable Massive daily beats.");
  if (typeof fetcher !== "function") return failure("massive-unavailable", "Massive is unavailable in this Worker runtime.");

  const requestUrl = makeRequestUrl(instrument, now);
  const parsedTimeout = Number(timeoutMs);
  const timeout = Number.isFinite(parsedTimeout) ? Math.max(1, parsedTimeout) : 10_000;
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;

  try {
    const response = await fetcher(requestUrl.toString(), {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Bearer ${apiKey.trim()}` },
      redirect: "manual",
      ...(controller ? { signal: controller.signal } : {})
    });
    if (!response || !response.ok) {
      const status = Number(response && response.status) || 0;
      if (status === 429) {
        const retry = response.headers && typeof response.headers.get === "function" ? response.headers.get("retry-after") : "";
        return failure("massive-rate-limit", "Massive's per-minute request envelope was reached. Wait before beating again.", {
          retryAfter: /^\d{1,5}$/.test(retry || "") ? retry : "60"
        });
      }
      if (status === 401 || status === 403) return failure("massive-unauthorized", "Massive rejected the Worker key. Check the MASSIVE_API_KEY Worker secret.");
      let payload = null;
      try { payload = await response.json(); } catch { /* explicit safe refusal below */ }
      return providerFailure(payload);
    }

    let payload;
    try { payload = await response.json(); }
    catch { return failure("massive-unreadable", "Massive returned unreadable daily data."); }
    const rows = Array.isArray(payload && payload.results) ? payload.results : [];
    const dayStart = Date.parse(`${new Date(Number(now)).toISOString().slice(0, 10)}T00:00:00.000Z`);
    const shapeBar = instrument.family === "futures" ? barFromFutures : barFromAggs;
    const unique = new Map();
    for (const row of rows) {
      const bar = shapeBar(row, dayStart);
      if (bar) unique.set(bar.time, bar);
    }
    const bars = [...unique.values()].sort((a, b) => a.time - b.time).slice(-MASSIVE_DAILY_MAX_BARS);
    if (!bars.length) return failure("massive-empty", `Massive returned no daily bars for ${instrument.massiveTicker} in the trailing window.`);

    const requestId = typeof payload.request_id === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(payload.request_id)
      ? payload.request_id.slice(0, 24) : "n/a";
    return {
      ok: true,
      packet: {
        schema: "gi-market-context-v1",
        synthetic: false,
        source: `Massive · ${instrument.sourceLabel}${instrument.massiveContract ? ` ${instrument.massiveContract.ticker}` : ""} bars · request ${requestId}`,
        symbol: instrument.symbol,
        timeframe: "1d",
        dataShape: instrument.dataShape,
        quoteCurrency: instrument.quoteCurrency,
        massiveTicker: instrument.massiveTicker,
        ...(instrument.massiveContract ? { massiveContract: instrument.massiveContract } : {}),
        bars
      }
    };
  } catch (error) {
    logFetchFailure(error, dependencies);
    if (error && error.name === "AbortError") return failure("massive-timeout", "Massive daily request timed out. Try again shortly.");
    return failure("massive-unreachable", "Massive could not be reached from this Worker.");
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

export const massiveDailyInternals = Object.freeze({
  normalizeInstrument,
  makeRequestUrl,
  barFromAggs,
  barFromFutures,
  providerNumber,
  FUTURES_TICKER,
  MASSIVE_DAILY_MAX_BARS
});
