import { claimAlphaVantageCall } from "./alpha-vantage-call-ledger.mjs";

const FX_SYMBOL = /^[A-Z]{6}$/;
const MAX_BARS = 60;

const failure = (code, message, extra = {}) => ({ ok: false, code, message, ...extra });

function normalizeFxInstrument(instrument) {
  const symbol = String(instrument?.symbol || "").trim().toUpperCase();
  if (!FX_SYMBOL.test(symbol) || instrument?.discId !== "fx" || instrument?.assetClass !== "fx") return null;
  return { symbol, fromSymbol: symbol.slice(0, 3), toSymbol: symbol.slice(3, 6) };
}

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function fetchAlphaVantageFxDaily({
  instrument,
  apiKey,
  db,
  fetcher = globalThis.fetch,
  now = Date.now(),
  timeoutMs = 8_000
} = {}) {
  const normalized = normalizeFxInstrument(instrument);
  if (!normalized) return failure("alpha-vantage-instrument-refused", "Alpha Vantage FX routing is limited to the reviewed six-letter FX instruments.");
  if (!String(apiKey || "").trim()) return failure("alpha-vantage-not-configured", "Add the ALPHA_VANTAGE_API_KEY Worker secret to enable Alpha Vantage FX validation.");
  if (typeof fetcher !== "function") return failure("alpha-vantage-unavailable", "Alpha Vantage is unavailable in this Worker runtime.");

  const claim = await claimAlphaVantageCall(db, now);
  if (!claim.ok) return failure(claim.reason, claim.message, { ledger: claim.ledger || null });

  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "FX_DAILY");
  url.searchParams.set("from_symbol", normalized.fromSymbol);
  url.searchParams.set("to_symbol", normalized.toSymbol);
  url.searchParams.set("outputsize", "compact");
  url.searchParams.set("apikey", String(apiKey).trim());

  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), Math.max(1, Number(timeoutMs) || 8_000)) : null;
  try {
    const response = await fetcher(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      redirect: "manual",
      ...(controller ? { signal: controller.signal } : {})
    });
    if (!response || !response.ok) {
      return failure("alpha-vantage-http-error", "Alpha Vantage rejected the FX request.", { httpStatus: Number(response?.status) || 0 });
    }
    let payload;
    try { payload = await response.json(); } catch { return failure("alpha-vantage-unreadable", "Alpha Vantage returned unreadable FX data."); }
    if (payload?.Note || payload?.Information) {
      return failure("alpha-vantage-provider-limit", "Alpha Vantage reported a request-limit or service notice.");
    }
    if (payload?.["Error Message"]) return failure("alpha-vantage-provider-error", "Alpha Vantage rejected the FX pair.");
    const series = payload?.["Time Series FX (Daily)"];
    if (!series || typeof series !== "object") return failure("alpha-vantage-empty", "Alpha Vantage returned no daily FX series.");

    const bars = Object.entries(series)
      .map(([date, row]) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !row || typeof row !== "object") return null;
        const open = number(row["1. open"]);
        const high = number(row["2. high"]);
        const low = number(row["3. low"]);
        const close = number(row["4. close"]);
        if (![open, high, low, close].every(Number.isFinite)) return null;
        return {
          time: Date.parse(date + "T00:00:00.000Z"),
          open, high, low, close,
          confirmed: true
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.time - b.time)
      .slice(-MAX_BARS);

    if (!bars.length) return failure("alpha-vantage-empty", "Alpha Vantage returned no usable daily FX bars.");

    return {
      ok: true,
      packet: {
        schema: "gi-market-context-v1",
        synthetic: false,
        source: "Alpha Vantage · FX_DAILY",
        symbol: normalized.symbol,
        timeframe: "1d",
        dataShape: "ohlc",
        quoteCurrency: normalized.toSymbol,
        bars
      },
      ledger: claim.ledger
    };
  } catch (error) {
    if (error?.name === "AbortError") return failure("alpha-vantage-timeout", "Alpha Vantage daily FX request timed out.");
    return failure("alpha-vantage-unreachable", "Alpha Vantage could not be reached from this Worker.");
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

export const alphaVantageFxInternals = Object.freeze({ normalizeFxInstrument, MAX_BARS });
