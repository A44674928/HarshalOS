/*
 * Read-only Alpha Vantage monthly adapter for Characters.
 *
 * This adapter only serves an explicit `1mo` request. It cannot satisfy `1d` or `1h`.
 * Stock bars are OHLCV when supplied, FX bars are OHLC, digital-currency bars may be
 * OHLCV, and commodity functions are scalar value series. Missing fields stay missing.
 * ALPHA_VANTAGE_API_KEY remains a Worker secret; observability query redaction is enabled
 * because Alpha Vantage requires that key in its query string.
 */
import { isTickerbotSymbol } from "./good-intelligence-tickerbot.mjs";
import "../js/characters-disc-catalog.js";

const ALPHA_VANTAGE_ORIGIN = "https://www.alphavantage.co";
export const ALPHA_VANTAGE_MONTHLY_MAX_BARS = 500;
const MONTHLY_SERIES_KEYS = Object.freeze({
  stock: "Monthly Time Series",
  fx: "Time Series FX (Monthly)",
  crypto: "Time Series (Digital Currency Monthly)"
});
const DECIMAL = /^[+-]?(?:[0-9]+(?:[.][0-9]*)?|[.][0-9]+)(?:[eE][+-]?[0-9]+)?$/;

function validDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

function parseProviderNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!DECIMAL.test(text)) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function isClosedMonth(date, at) {
  if (!validDateKey(date)) return false;
  const now = new Date(Number(at));
  if (!Number.isFinite(now.getTime())) return false;
  return date.slice(0, 7) < now.toISOString().slice(0, 7);
}

function normalizeInstrument(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const symbol = typeof value.symbol === "string" ? value.symbol.trim().toUpperCase() : "";
  if (!symbol) return null;
  const catalog = globalThis.CharactersDiscCatalog;

  if (value.assetClass === "equity" && isTickerbotSymbol(symbol)) {
    return {
      symbol,
      displaySymbol: symbol,
      assetClass: "equity",
      dataShape: "ohlcv",
      quoteCurrency: "USD",
      request: { function: "TIME_SERIES_MONTHLY", symbol },
      seriesKey: MONTHLY_SERIES_KEYS.stock,
      sourceShape: "equity"
    };
  }

  if (value.assetClass === "fx" && catalog) {
    const entry = catalog.fxCurrencies.find(item => item.symbol === symbol);
    if (!entry) return null;
    return {
      symbol,
      displaySymbol: entry.displaySymbol,
      assetClass: "fx",
      dataShape: "ohlc",
      quoteCurrency: "USD",
      request: { function: "FX_MONTHLY", from_symbol: entry.alphaVantage.fromSymbol, to_symbol: entry.alphaVantage.toSymbol },
      seriesKey: MONTHLY_SERIES_KEYS.fx,
      sourceShape: "fx"
    };
  }

  if (value.assetClass === "crypto" && value.rankingProvider === "CoinGecko" &&
      typeof value.providerId === "string" && /^[a-z0-9][a-z0-9-]{0,79}$/.test(value.providerId) &&
      /^[A-Z0-9]{2,12}$/.test(symbol)) {
    return {
      symbol,
      displaySymbol: typeof value.displaySymbol === "string" ? value.displaySymbol.slice(0, 32) : `${symbol}/USD`,
      assetClass: "crypto",
      dataShape: "ohlcv",
      quoteCurrency: "USD",
      request: { function: "DIGITAL_CURRENCY_MONTHLY", symbol, market: "USD" },
      seriesKey: MONTHLY_SERIES_KEYS.crypto,
      sourceShape: "crypto"
    };
  }

  if (value.assetClass === "commodity" && catalog) {
    const entry = catalog.commodities.find(item => item.symbol === symbol);
    if (!entry) return null;
    return {
      symbol,
      displaySymbol: entry.displaySymbol,
      assetClass: "commodity",
      dataShape: "value",
      quoteCurrency: entry.quoteCurrency,
      request: { function: entry.alphaVantage.function, interval: entry.alphaVantage.interval },
      sourceShape: "commodity"
    };
  }
  return null;
}

function shapePriceBar(date, row, sourceShape) {
  if (!validDateKey(date) || !row || typeof row !== "object" || Array.isArray(row)) return null;
  const crypto = sourceShape === "crypto";
  const key = (number, label) => crypto ? `${number}. ${label} (USD)` : `${number}. ${label}`;
  const open = parseProviderNumber(row[crypto ? "1b. open (USD)" : "1. open"]);
  const high = parseProviderNumber(row[crypto ? "2b. high (USD)" : "2. high"]);
  const low = parseProviderNumber(row[crypto ? "3b. low (USD)" : "3. low"]);
  const close = parseProviderNumber(row[crypto ? "4b. close (USD)" : "4. close"]);
  // Keep the mapping explicit: AV numbers are strings and missing volume is not zero.
  void key;
  if (![open, high, low, close].every(Number.isFinite) ||
      Math.min(open, high, low, close) <= 0 || high < Math.max(open, close) ||
      low > Math.min(open, close) || high < low) return null;

  const bar = { time: Date.parse(`${date}T00:00:00.000Z`), open, high, low, close, confirmed: true };
  const volumeField = sourceShape === "crypto" ? "5. volume" : "5. volume";
  if (Object.prototype.hasOwnProperty.call(row, volumeField) && row[volumeField] !== "" && row[volumeField] !== null) {
    const volume = parseProviderNumber(row[volumeField]);
    if (!Number.isFinite(volume) || volume < 0) return null;
    bar.volume = volume;
  }
  return bar;
}

function shapeValueBar(row) {
  if (!row || typeof row !== "object" || Array.isArray(row) || !validDateKey(row.date)) return null;
  const value = parseProviderNumber(row.value);
  if (!Number.isFinite(value)) return null;
  return { time: Date.parse(`${row.date}T00:00:00.000Z`), close: value, confirmed: true, dataShape: "value" };
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
      event: "alpha_vantage_monthly_upstream_fetch_failed",
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
    return failure("alpha-vantage-rate-limit", "Alpha Vantage's per-UTC-day request limit was reached. Monthly bars are not substituted for another interval.");
  }
  if (note || information || error) {
    return failure("alpha-vantage-upstream", "Alpha Vantage could not provide this monthly market series right now.");
  }
  return failure("alpha-vantage-unreadable", "Alpha Vantage returned no recognizable monthly market series.");
}

function makeRequestUrl(instrument, apiKey) {
  const url = new URL("/query", ALPHA_VANTAGE_ORIGIN);
  for (const [key, value] of Object.entries(instrument.request)) url.searchParams.set(key, value);
  url.searchParams.set("apikey", apiKey);
  return url;
}

function verifyMetadata(payload, instrument, original) {
  const meta = payload?.["Meta Data"];
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return true;
  if (instrument.sourceShape === "equity") {
    const returned = String(meta["2. Symbol"] || "").trim().toUpperCase();
    return !returned || returned === instrument.symbol;
  }
  if (instrument.sourceShape === "fx") {
    const from = String(meta["2. From Symbol"] || "").trim().toUpperCase();
    const to = String(meta["4. To Symbol"] || meta["3. To Symbol"] || "").trim().toUpperCase();
    const expectedFrom = String(original.alphaVantage?.fromSymbol || "").trim().toUpperCase();
    return (!from || from === expectedFrom) && (!to || to === "USD");
  }
  if (instrument.sourceShape === "crypto") {
    const returned = String(meta["2. Digital Currency Code"] || "").trim().toUpperCase();
    const market = String(meta["4. Market Code"] || "").trim().toUpperCase();
    return (!returned || returned === instrument.symbol) && (!market || market === "USD");
  }
  return true;
}

/*
 * One request to an explicit Alpha Vantage monthly endpoint. The caller claims the
 * independent 25-per-UTC-day Worker request allowance before invoking this helper.
 *
 *   { ok: true, packet }                      — gi-market-context-v1, timeframe=1mo
 *   { ok: false, code, message, retryAfter? }  — safe, provider-body-free failure
 */
export async function fetchAlphaVantageMonthlyMarketContext({
  instrument: rawInstrument,
  symbol,
  apiKey,
  fetcher = globalThis.fetch,
  now = Date.now(),
  timeoutMs = 10_000,
  dependencies = {}
} = {}) {
  const original = rawInstrument && typeof rawInstrument === "object"
    ? rawInstrument
    : { symbol, assetClass: "equity" };
  const instrument = normalizeInstrument(original);
  if (!instrument) {
    return failure("alpha-vantage-instrument-refused", "This instrument is not on a reviewed Characters Disc or live volume-ranked crypto list.");
  }
  if (original.interval !== undefined && original.interval !== "1mo") {
    return failure("alpha-vantage-interval-refused", "Alpha Vantage is restricted to an explicit 1mo request.");
  }
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    return failure("alpha-vantage-not-configured", "Add the ALPHA_VANTAGE_API_KEY Worker secret to enable monthly market data.");
  }
  if (typeof fetcher !== "function") {
    return failure("alpha-vantage-unavailable", "Alpha Vantage is unavailable in this Worker runtime.");
  }

  const url = makeRequestUrl(instrument, apiKey.trim());
  const timeout = Number.isFinite(Number(timeoutMs)) ? Math.max(1, Number(timeoutMs)) : 10_000;
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;
  try {
    const response = await fetcher(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      // The API key is in the query string; never replay it to a redirect target.
      redirect: "manual",
      ...(controller ? { signal: controller.signal } : {})
    });
    if (!response || !response.ok) {
      const status = Number(response && response.status) || 0;
      if (status === 429) {
        return failure("alpha-vantage-rate-limit", "Alpha Vantage's per-UTC-day request allowance was reached. Try after its reset.", { retryAfter: "60" });
      }
      if (status === 401 || status === 403) {
        return failure("alpha-vantage-upstream", "Alpha Vantage rejected the configured monthly request. Check the Worker secret and endpoint access.");
      }
      return failure("alpha-vantage-upstream", "Alpha Vantage could not provide monthly market data right now.");
    }

    let payload;
    try { payload = await response.json(); }
    catch { return failure("alpha-vantage-unreadable", "Alpha Vantage returned unreadable monthly market data."); }

    if (!verifyMetadata(payload, instrument, original)) {
      return failure("alpha-vantage-symbol-mismatch", "Alpha Vantage returned monthly data for a different instrument; those observations were refused.");
    }

    let bars = [];
    if (instrument.sourceShape === "commodity") {
      const series = payload && payload.data;
      if (!Array.isArray(series)) return providerMessage(payload);
      bars = series
        .filter(row => isClosedMonth(row?.date, now))
        .map(shapeValueBar)
        .filter(Boolean);
    } else {
      const series = payload && payload[instrument.seriesKey];
      if (!series || typeof series !== "object" || Array.isArray(series)) return providerMessage(payload);
      bars = Object.entries(series)
        .filter(([date]) => isClosedMonth(date, now))
        .map(([date, row]) => shapePriceBar(date, row, instrument.sourceShape))
        .filter(Boolean);
    }
    bars.sort((left, right) => left.time - right.time);
    bars = bars.slice(-ALPHA_VANTAGE_MONTHLY_MAX_BARS);
    if (!bars.length) {
      return failure("alpha-vantage-empty", "Alpha Vantage returned no completed monthly observations yet; the current partial month is withheld.");
    }

    const latestDate = new Date(bars[bars.length - 1].time).toISOString().slice(0, 10);
    const hasOhlc = bars.every(bar => Number.isFinite(bar.open) && Number.isFinite(bar.high) && Number.isFinite(bar.low));
    const hasVolume = bars.every(bar => Number.isFinite(bar.volume));
    const dataShape = instrument.sourceShape === "commodity" ? "value"
      : hasOhlc ? (hasVolume ? "ohlcv" : "ohlc") : "value";
    const shape = instrument.sourceShape === "commodity" ? "value-only"
      : hasVolume ? "OHLCV" : hasOhlc ? "OHLC without volume" : "value-only";
    const sourceLabel = instrument.sourceShape === "commodity"
      ? `monthly scalar value series · ${instrument.quoteCurrency}`
      : instrument.sourceShape === "fx"
        ? "monthly FX OHLC · no volume field"
        : instrument.sourceShape === "crypto"
          ? "monthly digital-currency OHLCV"
          : "monthly stock OHLCV when supplied";
    const packet = {
      schema: "gi-market-context-v1",
      synthetic: false,
      source: `Alpha Vantage · ${sourceLabel} · last completed month ${latestDate}`,
      symbol: instrument.displaySymbol,
      timeframe: "1mo",
      dataShape,
      quoteCurrency: instrument.quoteCurrency,
      bars
    };
    return { ok: true, packet };
  } catch (error) {
    logUpstreamFetchFailure(error, dependencies);
    if (error && error.name === "AbortError") {
      return failure("alpha-vantage-timeout", "Alpha Vantage's monthly market request timed out. Try again shortly.");
    }
    return failure("alpha-vantage-unreachable", "Alpha Vantage could not be reached from this Worker.");
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

export const alphaVantageMonthlyInternals = Object.freeze({
  validDateKey,
  parseProviderNumber,
  isClosedMonth,
  normalizeInstrument,
  shapePriceBar,
  shapeValueBar,
  makeRequestUrl
});
