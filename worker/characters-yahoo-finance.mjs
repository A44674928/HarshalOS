/* Yahoo Finance chart fallback for reviewed non-equity Discs.
 * This uses Yahoo's chart endpoint directly; the Python yfinance package cannot
 * run inside a Cloudflare Worker. It is deliberately opt-in and display-only.
 */
export const YAHOO_CHART_ORIGIN = "https://query1.finance.yahoo.com";
const TICKERS = Object.freeze({
  SPX: "^GSPC", NDX: "^NDX", DJI: "^DJI", VIX: "^VIX", RUT: "^RUT",
  WTI: "CL=F", NATURAL_GAS: "NG=F", GOLD: "GC=F", SILVER: "SI=F",
  COPPER: "HG=F", ALUMINUM: "ALI=F", PLATINUM: "PL=F", PALLADIUM: "PA=F",
  WHEAT: "ZW=F", CORN: "ZC=F", SOYBEANS: "ZS=F",
  EURUSD: "EURUSD=X", JPYUSD: "JPY=X", GBPUSD: "GBPUSD=X", CNYUSD: "CNY=X",
  CHFUSD: "CHFUSD=X", AUDUSD: "AUDUSD=X", CADUSD: "CADUSD=X", HKDUSD: "HKD=X",
  SGDUSD: "SGDUSD=X", INRUSD: "INR=X", NZDUSD: "NZDUSD=X", MXNUSD: "MXN=X",
  KRWUSD: "KRW=X", BRLUSD: "BRL=X", TWDUSD: "TWD=X", ZARUSD: "ZAR=X",
  SEKUSD: "SEK=X", NOKUSD: "NOK=X", TRYUSD: "TRY=X", DKKUSD: "DKK=X",
  PLNUSD: "PLN=X", HUFUSD: "HUF=X", RUBUSD: "RUB=X"
});
const failure = (code, message) => ({ ok: false, code, message });
const num = value => typeof value === "number" && Number.isFinite(value) ? value : null;

export async function fetchYahooFinanceDailyMarketContext({ instrument, symbol, fetcher = globalThis.fetch, now = Date.now(), timeoutMs = 10000 } = {}) {
  const key = String(symbol || instrument?.symbol || "").trim().toUpperCase();
  const ticker = TICKERS[key];
  if (!ticker) return failure("yahoo-instrument-refused", "This instrument has no reviewed Yahoo Finance fallback mapping.");
  if (typeof fetcher !== "function") return failure("yahoo-unavailable", "Yahoo Finance is unavailable in this Worker runtime.");
  const period2 = Math.floor(Number(now) / 1000);
  const period1 = period2 - 60 * 86400;
  const url = new URL(`/v8/finance/chart/${encodeURIComponent(ticker)}`, YAHOO_CHART_ORIGIN);
  url.searchParams.set("period1", String(period1)); url.searchParams.set("period2", String(period2));
  url.searchParams.set("interval", "1d"); url.searchParams.set("events", "div,splits");
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetcher(url.toString(), { method: "GET", headers: { Accept: "application/json" }, redirect: "manual", ...(controller ? { signal: controller.signal } : {}) });
    if (!response?.ok) return failure(response?.status === 429 ? "yahoo-rate-limit" : "yahoo-upstream", "Yahoo Finance could not provide this daily market series right now.");
    const payload = await response.json();
    const result = payload?.chart?.result?.[0];
    const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];
    const quote = result?.indicators?.quote?.[0] || {};
    const bars = timestamps.map((stamp, i) => {
      const open = num(quote.open?.[i]), high = num(quote.high?.[i]), low = num(quote.low?.[i]), close = num(quote.close?.[i]);
      if (![open, high, low, close].every(Number.isFinite) || Math.min(open, high, low, close) <= 0 || high < Math.max(open, close) || low > Math.min(open, close)) return null;
      const bar = { time: stamp * 1000, open, high, low, close, confirmed: stamp * 1000 < Date.parse(new Date(now).toISOString().slice(0, 10)) };
      const volume = num(quote.volume?.[i]); if (volume !== null && volume >= 0) bar.volume = volume;
      return bar;
    }).filter(Boolean).slice(-60);
    if (!bars.length) return failure("yahoo-empty", `Yahoo Finance returned no daily bars for ${key}.`);
    return { ok: true, packet: { schema: "gi-market-context-v1", synthetic: false, source: `Yahoo Finance · ${ticker} daily bars`, symbol: key, timeframe: "1d", dataShape: instrument?.dataShape || "ohlcv", quoteCurrency: instrument?.quoteCurrency || "USD", yahooTicker: ticker, bars } };
  } catch (error) { return failure(error?.name === "AbortError" ? "yahoo-timeout" : "yahoo-unreachable", "Yahoo Finance could not be reached from this Worker."); }
  finally { if (timer) clearTimeout(timer); }
}

export const yahooFinanceInternals = Object.freeze({ TICKERS });
