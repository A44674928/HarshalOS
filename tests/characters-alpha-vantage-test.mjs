/* Explicit Alpha Vantage 1mo mode and its interval-independent UTC-day request cap. */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ALPHA_VANTAGE_MONTHLY_MAX_BARS,
  fetchAlphaVantageMonthlyMarketContext,
  alphaVantageMonthlyInternals
} from "../worker/characters-alpha-vantage.mjs";
import {
  ALPHA_VANTAGE_PROVIDER_DAILY_LIMIT,
  alphaVantageUtcDay,
  claimAlphaVantageDailyCall,
  readAlphaVantageDailyCallLedger
} from "../worker/alpha-vantage-daily-call-ledger.mjs";
import { clearCharactersBeatCache, handleCharactersBeat } from "../worker/characters-beat.mjs";
import { TICKERBOT_WATCHLIST } from "../worker/good-intelligence-tickerbot.mjs";
import { createTickerbotLedgerDb } from "./helpers/tickerbot-ledger-db.mjs";

const NOW = Date.parse("2026-10-05T17:00:00.000Z");
const ROUTE = "https://os.example.test/api/characters/v1/beat";
const TICKERBOT_KEY = "tickerbot-test-secret";
const ALPHA_KEY = "alpha-vantage-test-secret";
/* Keep existing fixture calls focused on their provider. The production browser
   now always supplies provider= explicitly; this helper mirrors that contract
   while preserving the short readable query strings below. */
const beat = (query, init) => new Request(`${ROUTE}?${query.includes("1mo") ? "provider=alpha&" : query.includes("1d") ? "provider=tickerbot&" : ""}${query}`, init);
const fixture = () => createTickerbotLedgerDb();

function alphaRow({ open = 10, high = 12, low = 9, close = 11, volume } = {}) {
  return {
    "1. open": String(open), "2. high": String(high), "3. low": String(low), "4. close": String(close),
    ...(volume === undefined ? {} : { "5. volume": String(volume) })
  };
}

const validStockMonthlyPayload = (symbol = "AAPL") => ({
  "Meta Data": { "2. Symbol": symbol },
  "Monthly Time Series": {
    "2026-10-01": alphaRow({ open: 12, high: 13, low: 11, close: 12.5, volume: 900 }),
    "2026-09-30": alphaRow({ open: 11, high: 13, low: 10, close: 12, volume: 700 }),
    "2026-08-31": alphaRow({ open: 10, high: 12, low: 9, close: 11, volume: 600 })
  }
});

const workersFetch = handler => async (input, options = {}) => {
  assert.ok(options.redirect === undefined || options.redirect === "manual" || options.redirect === "follow");
  return handler(input, options);
};

test("the Alpha Vantage D1 ledger is an aggregate UTC-day cap, not a daily-bar mode", t => {
  const { sql } = fixture();
  t.after(() => sql.close());
  const migration = readFileSync(new URL("../migrations/community/0006_alpha_vantage_daily_call_ledger.sql", import.meta.url), "utf8");
  assert.match(migration, /CREATE TABLE alpha_vantage_daily_call_ledger/);
  assert.match(migration, /utc_day TEXT PRIMARY KEY/);
  assert.match(migration, /attempted_calls INTEGER NOT NULL DEFAULT 0/);
  assert.match(migration, /daily_limit INTEGER NOT NULL/);
  const columns = sql.prepare("PRAGMA table_info(alpha_vantage_daily_call_ledger)").all().map(row => row.name);
  assert.deepEqual(columns, ["utc_day", "attempted_calls", "daily_limit", "updated_at"]);
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM alpha_vantage_daily_call_ledger").get().count, 0);
  assert.equal(ALPHA_VANTAGE_PROVIDER_DAILY_LIMIT, 25);
});

test("concurrent Alpha Vantage claims stop at 25 per UTC day and roll over at UTC midnight", async t => {
  const { db, sql } = fixture();
  t.after(() => sql.close());
  const limit = 17;
  const claims = await Promise.all(Array.from({ length: 64 }, () => claimAlphaVantageDailyCall(db, NOW, limit)));
  assert.equal(claims.filter(claim => claim.ok).length, limit);
  assert.equal(claims.filter(claim => claim.reason === "alpha-vantage-budget-exhausted").length, 64 - limit);
  const ledger = await readAlphaVantageDailyCallLedger(db, NOW, limit);
  assert.equal(ledger.ok, true);
  assert.equal(ledger.ledger.day, "2026-10-05");
  assert.equal(ledger.ledger.calls, limit);
  assert.equal(ledger.ledger.remaining, 0);
  assert.equal(ledger.ledger.exhausted, true);
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM alpha_vantage_daily_call_ledger").get().count, 1);

  const nextDay = Date.parse("2026-10-06T00:00:00.000Z");
  assert.equal(alphaVantageUtcDay(nextDay), "2026-10-06");
  const next = await claimAlphaVantageDailyCall(db, nextDay, limit);
  assert.equal(next.ok, true);
  assert.equal(next.ledger.calls, 1);
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM alpha_vantage_daily_call_ledger").get().count, 2);
});

test("the stock adapter makes an explicit monthly request and withholds the partial month", async () => {
  const requests = [];
  const result = await fetchAlphaVantageMonthlyMarketContext({
    instrument: { symbol: "AAPL", assetClass: "equity", interval: "1mo" },
    apiKey: ALPHA_KEY, now: NOW,
    fetcher: workersFetch(async (input, options) => {
      requests.push({ url: new URL(input), options });
      return Response.json(validStockMonthlyPayload());
    })
  });
  assert.equal(result.ok, true);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url.origin, "https://www.alphavantage.co");
  assert.equal(requests[0].url.pathname, "/query");
  assert.equal(requests[0].url.searchParams.get("function"), "TIME_SERIES_MONTHLY");
  assert.equal(requests[0].url.searchParams.get("symbol"), "AAPL");
  assert.equal(requests[0].url.searchParams.get("apikey"), ALPHA_KEY);
  assert.equal(requests[0].options.redirect, "manual", "the key is never replayed to a redirect target");
  assert.equal(result.packet.schema, "gi-market-context-v1");
  assert.equal(result.packet.synthetic, false);
  assert.equal(result.packet.symbol, "AAPL");
  assert.equal(result.packet.timeframe, "1mo");
  assert.match(result.packet.source, /Alpha Vantage.*monthly stock.*2026-09-30/);
  assert.deepEqual(result.packet.bars.map(bar => new Date(bar.time).toISOString().slice(0, 10)), ["2026-08-31", "2026-09-30"]);
  assert.ok(result.packet.bars.every(bar => bar.confirmed && Number.isFinite(bar.volume)));
  assert.equal(ALPHA_VANTAGE_MONTHLY_MAX_BARS, 500);

  const refusedDaily = await fetchAlphaVantageMonthlyMarketContext({
    instrument: { symbol: "AAPL", assetClass: "equity", interval: "1d" }, apiKey: ALPHA_KEY,
    fetcher: async () => { throw new Error("interval must be refused before fetch"); }, now: NOW
  });
  assert.equal(refusedDaily.ok, false);
  assert.equal(refusedDaily.code, "alpha-vantage-interval-refused");
});

test("OHLC, OHLCV, and scalar commodity shapes are kept distinct without fabricated fields", async () => {
  const fxRequests = [];
  const fx = await fetchAlphaVantageMonthlyMarketContext({
    instrument: {
      symbol: "EURUSD", assetClass: "fx", interval: "1mo",
      alphaVantage: { fromSymbol: "EUR", toSymbol: "USD" }
    },
    apiKey: ALPHA_KEY, now: NOW,
    fetcher: workersFetch(async input => {
      fxRequests.push(new URL(input));
      return Response.json({
        "Meta Data": { "2. From Symbol": "EUR", "4. To Symbol": "USD" },
        "Time Series FX (Monthly)": { "2026-09-30": alphaRow({ open: 1.1, high: 1.2, low: 1.0, close: 1.15 }) }
      });
    })
  });
  assert.equal(fx.ok, true);
  assert.equal(fxRequests[0].searchParams.get("function"), "FX_MONTHLY");
  assert.equal(fxRequests[0].searchParams.get("from_symbol"), "EUR");
  assert.equal(fxRequests[0].searchParams.get("to_symbol"), "USD");
  assert.equal(fx.packet.timeframe, "1mo");
  assert.equal(fx.packet.dataShape, "ohlc");
  assert.equal(fx.packet.bars[0].open, 1.1);
  assert.equal(Object.hasOwn(fx.packet.bars[0], "volume"), false, "FX volume is not invented as zero");

  const scalar = await fetchAlphaVantageMonthlyMarketContext({
    instrument: { symbol: "WTI", assetClass: "commodity", interval: "1mo" },
    apiKey: ALPHA_KEY, now: NOW,
    fetcher: workersFetch(async input => {
      const url = new URL(input);
      assert.equal(url.searchParams.get("function"), "WTI");
      assert.equal(url.searchParams.get("interval"), "monthly");
      return Response.json({ data: [
        { date: "2026-10-01", value: "77.2" },
        { date: "2026-09-01", value: "72.5" }
      ] });
    })
  });
  assert.equal(scalar.ok, true);
  assert.equal(scalar.packet.timeframe, "1mo");
  assert.equal(scalar.packet.dataShape, "value");
  assert.equal(scalar.packet.quoteCurrency, "USD/barrel");
  assert.equal(scalar.packet.bars.length, 1, "the current partial month is withheld");
  assert.deepEqual(Object.keys(scalar.packet.bars[0]).sort(), ["close", "confirmed", "dataShape", "time"].sort());
  assert.equal(scalar.packet.bars[0].close, 72.5);

  assert.equal(alphaVantageMonthlyInternals.shapePriceBar("2026-09-30", { "1. open": "1", "2. high": "2", "4. close": "1.5" }, "fx"), null,
    "partial OHLC is rejected instead of patched");
});

test("Tickerbot success remains the only source for 1h/1d; configured Alpha Vantage is not a daily fallback", async t => {
  clearCharactersBeatCache();
  const { db, sql } = fixture();
  t.after(() => sql.close());
  const hosts = [];
  const response = await handleCharactersBeat(beat("symbols=AAPL&interval=1d&cadence=60"), {
    TICKERBOT_API_KEY: TICKERBOT_KEY, ALPHA_VANTAGE_API_KEY: ALPHA_KEY, COMMUNITY_DB: db
  }, {
    now: () => NOW,
    fetch: workersFetch(async input => {
      hosts.push(new URL(input).hostname);
      return Response.json({
        as_of: new Date(NOW).toISOString(), ticker: "AAPL", interval: "1d", coverage: "covered",
        bars: [
          { t: NOW - 2 * 86_400_000, o: 100, h: 102, l: 99, c: 101, v: 1200 },
          { t: NOW - 86_400_000, o: 101, h: 103, l: 100, c: 102, v: 1300 }
        ]
      });
    })
  });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(hosts, ["api.tickerbot.io"]);
  assert.equal(payload.data.instruments[0].provider, "tickerbot");
  assert.equal(payload.data.instruments[0].marketContext.timeframe, "1d");
  assert.equal(payload.data.spend.tickerbotAttempts, 1);
  assert.equal(payload.data.spend.alphaVantageAttempts, 0);
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM alpha_vantage_daily_call_ledger").get().count, 0);
});

test("explicit 1mo is Alpha Vantage only, separately cached, and permitted if the Tickerbot month is exhausted", async t => {
  clearCharactersBeatCache();
  const { db, sql } = fixture();
  t.after(() => sql.close());
  sql.prepare(`INSERT INTO tickerbot_call_ledger
    (utc_month, attempted_calls, provider_budget, worker_limit, updated_at)
    VALUES ('2026-10', 10000, 10000, 10000, ?)`).run(NOW);
  const hosts = [];
  const dependencies = {
    now: () => NOW,
    fetch: workersFetch(async input => {
      const url = new URL(input);
      hosts.push(url.hostname);
      if (url.hostname === "www.alphavantage.co") return Response.json(validStockMonthlyPayload(url.searchParams.get("symbol")));
      return Response.json({ as_of: new Date(NOW).toISOString(), ticker: "AAPL", interval: "1d", coverage: "covered", bars: [] });
    })
  };
  const env = { TICKERBOT_API_KEY: TICKERBOT_KEY, ALPHA_VANTAGE_API_KEY: ALPHA_KEY, COMMUNITY_DB: db };
  const monthly = await handleCharactersBeat(beat("disc=stocks&symbols=AAPL&interval=1mo&cadence=60&provider=alpha"), env, dependencies);
  const monthlyPayload = await monthly.json();
  assert.equal(monthly.status, 200);
  assert.deepEqual(hosts, ["www.alphavantage.co"], "1mo never reaches Tickerbot, even with its ledger exhausted");
  assert.equal(monthlyPayload.data.instruments[0].marketContext.timeframe, "1mo");
  assert.equal(monthlyPayload.data.spend.tickerbotAttempts, 0);
  assert.equal(monthlyPayload.data.spend.alphaVantageAttempts, 1);
  assert.equal(monthlyPayload.data.spend.providerAttempts, 1);
  assert.equal(monthlyPayload.data.spend.alphaVantageDaily.dailyLimit, 25);
  assert.match(monthlyPayload.data.spend.note, /strict 25-per-UTC-day allowance/i);

  const cached = await handleCharactersBeat(beat("disc=stocks&symbols=AAPL&interval=1mo&cadence=60&provider=alpha"), env, {
    now: () => NOW + 1000,
    fetch: async () => { throw new Error("same monthly interval is cached"); }
  });
  const cachedPayload = await cached.json();
  assert.equal(cachedPayload.data.instruments[0].status, "cached");
  assert.equal(cachedPayload.data.instruments[0].marketContext.timeframe, "1mo");
  assert.equal(cachedPayload.data.spend.providerAttempts, 0);

  /* A monthly packet can never satisfy the separate requested daily mode. */
  assert.equal(sql.prepare("SELECT attempted_calls FROM tickerbot_call_ledger WHERE utc_month='2026-10'").get().attempted_calls, 10000,
    "the explicit 1mo request does not spend Tickerbot's monthly allowance");
  sql.prepare("UPDATE tickerbot_call_ledger SET attempted_calls = 0 WHERE utc_month = '2026-10'").run();
  const daily = await handleCharactersBeat(beat("disc=stocks&symbols=AAPL&interval=1d&cadence=60"), env, {
    now: () => NOW + 2_000,
    fetch: workersFetch(async input => {
      hosts.push(new URL(input).hostname);
      return Response.json({
        as_of: new Date(NOW).toISOString(), ticker: "AAPL", interval: "1d", coverage: "covered",
        bars: [{ t: NOW - 86_400_000, o: 100, h: 102, l: 99, c: 101, v: 1000 }]
      });
    })
  });
  const dailyPayload = await daily.json();
  assert.equal(daily.status, 200);
  assert.equal(dailyPayload.data.instruments[0].marketContext.timeframe, "1d");
  assert.deepEqual(hosts, ["www.alphavantage.co", "api.tickerbot.io"]);
  assert.equal(sql.prepare("SELECT attempted_calls FROM tickerbot_call_ledger WHERE utc_month='2026-10'").get().attempted_calls, 1,
    "the subsequent daily request uses Tickerbot only");
});

test("Alpha normalizes an omitted cadence to its exact hourly fixed loop and refuses a different cadence", async t => {
  clearCharactersBeatCache();
  const { db, sql } = fixture();
  t.after(() => sql.close());
  const env = { ALPHA_VANTAGE_API_KEY: ALPHA_KEY, COMMUNITY_DB: db };
  let fetches = 0;
  const dependencies = {
    now: () => NOW,
    fetch: workersFetch(async input => {
      fetches += 1;
      return Response.json(validStockMonthlyPayload(new URL(input).searchParams.get("symbol")));
    })
  };
  const omitted = await handleCharactersBeat(
    new Request(`${ROUTE}?disc=stocks&provider=alpha&symbols=AAPL&interval=1mo`), env, dependencies
  );
  const payload = await omitted.json();
  assert.equal(omitted.status, 200);
  assert.equal(payload.data.cadenceMinutes, 60);
  assert.equal(payload.data.instruments.length, 1);
  assert.equal(fetches, 1);

  const wrongCadence = await handleCharactersBeat(
    new Request(`${ROUTE}?disc=stocks&provider=alpha&symbols=MSFT&interval=1mo&cadence=15`), env, dependencies
  );
  assert.equal(wrongCadence.status, 400);
  assert.match((await wrongCadence.json()).message, /exactly cadence=60/i);
  assert.equal(fetches, 1, "the invalid cadence never reaches Alpha Vantage");
});

test("the 25-request UTC-day cap permits one Alpha ticker per hourly beat and refuses request 26", async t => {  clearCharactersBeatCache();
  const { db, sql } = fixture();
  t.after(() => sql.close());
  const env = { ALPHA_VANTAGE_API_KEY: ALPHA_KEY, COMMUNITY_DB: db };
  let fetches = 0;
  const dependencies = {
    now: () => NOW,
    fetch: workersFetch(async input => {
      fetches += 1;
      return Response.json(validStockMonthlyPayload(new URL(input).searchParams.get("symbol")));
    })
  };

  const batch = await handleCharactersBeat(
    beat("disc=stocks&symbols=AAPL,MSFT&interval=1mo&cadence=60&provider=alpha"), env, dependencies
  );
  assert.equal(batch.status, 400, "the route refuses a crafted multi-symbol Alpha batch");
  assert.match((await batch.json()).message, /exactly one locally selected/i);
  assert.equal(fetches, 0);

  const hourlySymbols = TICKERBOT_WATCHLIST.slice(0, 25).map(entry => entry.symbol);
  for (const symbol of hourlySymbols) {
    const response = await handleCharactersBeat(
      beat(`disc=stocks&symbols=${symbol}&interval=1mo&cadence=60&provider=alpha`), env, dependencies
    );
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.data.cadenceMinutes, 60);
    assert.equal(payload.data.spend.alphaVantageAttempts, 1);
    assert.equal(payload.data.instruments.length, 1);
  }
  assert.equal(fetches, 25);
  const daily = await readAlphaVantageDailyCallLedger(db, NOW);
  assert.equal(daily.ledger.calls, 25);
  assert.equal(daily.ledger.remaining, 0);
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM alpha_vantage_daily_call_ledger").get().count, 1);

  const unusedSymbol = TICKERBOT_WATCHLIST[30].symbol;
  const refused = await handleCharactersBeat(beat(`disc=stocks&symbols=${unusedSymbol}&interval=1mo&cadence=60&provider=alpha`), env, {
    now: () => NOW,
    fetch: async () => { throw new Error("the cap must refuse before the provider request"); }
  });
  assert.equal(refused.status, 429);
  const refusedPayload = await refused.json();
  assert.equal(refusedPayload.data.spend.alphaVantageAttempts, 0);
  assert.equal(refusedPayload.data.spend.alphaVantageDaily.calls, 25);
});

test("missing Alpha Vantage D1 ledger fails closed before the external request", async () => {
  clearCharactersBeatCache();
  let requests = 0;
  const response = await handleCharactersBeat(beat("disc=stocks&symbols=AAPL&interval=1mo"), {
    ALPHA_VANTAGE_API_KEY: ALPHA_KEY,
    COMMUNITY_DB: { prepare() { throw new Error("unavailable D1 binding"); } }
  }, {
    now: () => NOW,
    fetch: async () => { requests += 1; return Response.json(validStockMonthlyPayload()); }
  });
  assert.equal(response.status, 503);
  assert.equal(requests, 0);
  assert.match((await response.text()), /D1 daily allowance is unavailable|alpha-vantage-ledger-unavailable/i);
});
