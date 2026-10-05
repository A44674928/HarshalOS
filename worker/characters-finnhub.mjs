/* Finnhub daily candle adapter. The token stays Worker-side and symbols are
 * reviewed mappings; callers cannot turn this into an arbitrary proxy. */
export const FINNHUB_ORIGIN = "https://finnhub.io";
const SYMBOLS = Object.freeze({
  SPX: "^GSPC", NDX: "^NDX", DJI: "^DJI", VIX: "^VIX", RUT: "^RUT",
  WTI: "OANDA:WTICOUSD", BRENT: "OANDA:BCOUSD", NATURAL_GAS: "OANDA:NATGASUSD",
  EURUSD: "OANDA:EUR_USD", GBPUSD: "OANDA:GBP_USD", AUDUSD: "OANDA:AUD_USD",
  CADUSD: "OANDA:CAD_USD", CHFUSD: "OANDA:CHF_USD", NZDUSD: "OANDA:NZD_USD",
  JPYUSD: "OANDA:USD_JPY", CNYUSD: "OANDA:USD_CNY", HKDUSD: "OANDA:USD_HKD",
  SGDUSD: "OANDA:USD_SGD", INRUSD: "OANDA:USD_INR", MXNUSD: "OANDA:USD_MXN",
  COPPER: "OANDA:XCU_USD", GOLD: "OANDA:XAU_USD", SILVER: "OANDA:XAG_USD"
});
const fail = (code, message) => ({ ok: false, code, message });
const n = value => typeof value === "number" && Number.isFinite(value) ? value : null;
export async function fetchFinnhubDailyMarketContext({ instrument, symbol, apiKey, fetcher = globalThis.fetch, now = Date.now(), timeoutMs = 10000 } = {}) {
  const key = String(symbol || instrument?.symbol || "").trim().toUpperCase(), ticker = SYMBOLS[key];
  if (!ticker) return fail("finnhub-instrument-refused", "This instrument has no reviewed Finnhub fallback mapping.");
  if (!apiKey?.trim()) return fail("finnhub-not-configured", "Finnhub is not configured on this Worker.");
  if (typeof fetcher !== "function") return fail("finnhub-unavailable", "Finnhub is unavailable in this Worker runtime.");
  const to = Math.floor(Number(now) / 1000), from = to - 60 * 86400;
  const url = new URL("/api/v1/stock/candle", FINNHUB_ORIGIN);
  url.searchParams.set("symbol", ticker); url.searchParams.set("resolution", "D"); url.searchParams.set("from", String(from)); url.searchParams.set("to", String(to)); url.searchParams.set("token", apiKey.trim());
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetcher(url.toString(), { method: "GET", headers: { Accept: "application/json" }, redirect: "manual", ...(controller ? { signal: controller.signal } : {}) });
    if (!response?.ok) return fail(response?.status === 429 ? "finnhub-rate-limit" : "finnhub-upstream", "Finnhub could not provide this daily market series right now.");
    const payload = await response.json();
    if (payload?.s !== "ok") return fail(payload?.s === "no_data" ? "finnhub-empty" : "finnhub-upstream", "Finnhub returned no recognizable daily market series.");
    const bars = (Array.isArray(payload.t) ? payload.t : []).map((stamp, i) => {
      const open=n(payload.o?.[i]), high=n(payload.h?.[i]), low=n(payload.l?.[i]), close=n(payload.c?.[i]);
      if (![open,high,low,close].every(Number.isFinite) || Math.min(open,high,low,close)<=0 || high<Math.max(open,close) || low>Math.min(open,close)) return null;
      const bar={time:stamp*1000,open,high,low,close,confirmed:stamp*1000<Date.parse(new Date(now).toISOString().slice(0,10))}; const volume=n(payload.v?.[i]); if(volume!==null&&volume>=0)bar.volume=volume; return bar;
    }).filter(Boolean).slice(-60);
    if (!bars.length) return fail("finnhub-empty", `Finnhub returned no daily bars for ${key}.`);
    return { ok:true, packet:{schema:"gi-market-context-v1",synthetic:false,source:`Finnhub · ${ticker} daily bars`,symbol:key,timeframe:"1d",dataShape:instrument?.dataShape||"ohlcv",quoteCurrency:instrument?.quoteCurrency||"USD",finnhubSymbol:ticker,bars} };
  } catch(error) { return fail(error?.name === "AbortError" ? "finnhub-timeout" : "finnhub-unreachable", "Finnhub could not be reached from this Worker."); }
  finally { if(timer)clearTimeout(timer); }
}
export const finnhubInternals = Object.freeze({ SYMBOLS });
