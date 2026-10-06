/* Characters' reviewed Massive daily adapter, route boundary, and UTC-day guard. */

import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchMassiveDailyMarketContext,
  massiveDailyInternals
} from "../worker/characters-massive.mjs";
import {
  clearCharactersBeatCache,
  handleCharactersBeat
} from "../worker/characters-beat.mjs";
import {
  MASSIVE_PROVIDER_DAILY_LIMIT,
  claimMassiveDailyCall,
  massiveUtcDay,
  readMassiveDailyCallLedger
} from "../worker/massive-daily-call-ledger.mjs";
import { clearMassiveCache } from "../worker/massive.mjs";
import { TICKERBOT_WATCHLIST } from "../worker/good-intelligence-tickerbot.mjs";
import { createTickerbotLedgerDb } from "./helpers/tickerbot-ledger-db.mjs";

const NOW = Date.parse("2026-10-03T12:00:00.000Z");
const NEXT_DAY = Date.parse("2026-10-04T12:00:00.000Z");
const MASSIVE_KEY = "massive-test-only-worker-secret";
const TICKERBOT_KEY = "tickerbot-test-only-worker-secret";
const ROUTE = "https://os.example.test/api/characters/v1/beat";

const beat = query => new Request(`${ROUTE}?${query}`, {
  headers: { "CF-Connecting-IP": "198.51.100.42" }
});

function dailyAggs({ requestId = "safe_request_42" } = {}) {
  return Response.json({
    request_id: requestId,
    results: [
      { t: NOW - 2 * 86_400_000, o: 100, h: 104, l: 99, c: 102, v: 1_000 },
      { t: NOW - 86_400_000, o: 102, h: 105, l: 101, c: 104, v: 1_100 },
      /* A current UTC-day bar is useful but must be marked unconfirmed. */
      { t: Date.parse("2026-10-03T09:00:00.000Z"), o: 104, h: 106, l: 103, c: 105, v: 1_200 }
    ]
  });
}

function env(db, extra = {}) {
  return {
    COMMUNITY_DB: db,
    MASSIVE_API_KEY: MASSIVE_KEY,
    TICKERBOT_API_KEY: TICKERBOT_KEY,
    ALPHA_VANTAGE_API_KEY: "alpha-test-only-worker-secret",
    ...extra
  };
}

test("the Massive daily adapter uses fixed reviewed paths, a bearer header, and actual daily-bar shape", async () => {
  const requests = [];
  const result = await fetchMassiveDailyMarketContext({
    instrument: { symbol: "EURUSD", assetClass: "fx", interval: "1d" },
    apiKey: MASSIVE_KEY,
    now: NOW,
    fetcher: async (input, options) => {
      requests.push({ url: new URL(input), options });
      return dailyAggs();
    }
  });

  assert.equal(result.ok, true);
  assert.equal(requests.length, 1);
  const { url, options } = requests[0];
  assert.equal(url.origin, "https://api.massive.com");
  assert.match(url.pathname, /^\/v2\/aggs\/ticker\/C%3AEURUSD\/range\/1\/day\/\d{4}-\d{2}-\d{2}\/\d{4}-\d{2}-\d{2}$/);
  assert.equal(url.searchParams.get("adjusted"), "true");
  assert.equal(url.searchParams.get("sort"), "asc");
  assert.equal(url.searchParams.get("limit"), "60");
  assert.equal(options.headers.Authorization, `Bearer ${MASSIVE_KEY}`);
  assert.equal(options.redirect, "manual");
  assert.doesNotMatch(url.toString(), new RegExp(MASSIVE_KEY));

  assert.equal(result.packet.symbol, "EURUSD");
  assert.equal(result.packet.timeframe, "1d");
  assert.equal(result.packet.dataShape, "ohlcv");
  assert.equal(result.packet.synthetic, false);
  assert.equal(result.packet.bars.length, 3);
  assert.equal(result.packet.bars.at(-1).confirmed, false, "a current UTC-day observation is not presented as closed");
  assert.equal(result.packet.bars[0].volume, 1_000);
});

test("the adapter only derives documented Massive shapes for reviewed Disc families", () => {
  const catalog = globalThis.CharactersDiscCatalog;
  assert.ok(catalog);
  const fx = massiveDailyInternals.normalizeInstrument(catalog.fxCurrencies.find(entry => entry.symbol === "EURUSD"));
  const crypto = massiveDailyInternals.normalizeInstrument({
    symbol: "BTC", displaySymbol: "BTC/USD", assetClass: "crypto", rankingProvider: "Kraken", providerId: "BTC/USD", krakenPair: "BTC/USD"
  });
  const commodityEntry = catalog.commodities.find(entry => entry.symbol === "WTI");
  const contract = {
    provider: "Massive", productCode: "CL", ticker: "CLX6", asOfDate: "2026-10-03",
    lastTradeDate: "2026-11-20", daysToMaturity: 48
  };
  const commodity = massiveDailyInternals.normalizeInstrument({
    ...commodityEntry, massive: { ...commodityEntry.massive, ticker: contract.ticker, family: "futures" },
    massiveContract: contract
  }, NOW);
  const index = massiveDailyInternals.normalizeInstrument(catalog.indices.find(entry => entry.symbol === "SPX"));
  assert.deepEqual(
    [fx && fx.massiveTicker, crypto && crypto.massiveTicker, commodity && commodity.massiveTicker, index && index.massiveTicker],
    ["C:EURUSD", null, "CLX6", "I:SPX"]
  );
  assert.equal(massiveDailyInternals.normalizeInstrument(commodityEntry, NOW), null,
    "the static catalog's product code cannot be used as a dated contract without a current Massive verification");
  assert.equal(fx.family, "aggs");
  assert.equal(commodity.family, "futures");
  assert.equal(index.dataShape, "ohlc");
  assert.equal(massiveDailyInternals.normalizeInstrument({ symbol: "NOT_REVIEWED", assetClass: "commodity" }), null);
  assert.equal(massiveDailyInternals.normalizeInstrument({
    symbol: "BTC", assetClass: "crypto", rankingProvider: "Massive", massiveTicker: "X:ETHUSD"
  }), null, "Massive cannot normalize a crypto identity");

  const futuresUrl = massiveDailyInternals.makeRequestUrl(commodity, NOW);
  assert.equal(futuresUrl.pathname, "/futures/v1/aggs/CLX6");
  assert.equal(futuresUrl.searchParams.get("resolution"), "1session");

  const dayStart = Date.parse("2026-10-03T00:00:00.000Z");
  const currentFuturesSession = massiveDailyInternals.barFromFutures({
    window_start: Date.parse("2026-10-02T22:00:00.000Z") * 1e6,
    session_end_date: "2026-10-03", open: 100, high: 103, low: 99, close: 102, volume: 12
  }, dayStart);
  assert.equal(currentFuturesSession.confirmed, false, "a session opened last evening but settling today is still a forming daily candle");
});

test("Massive daily D1 claims are atomic, keyed to UTC day, and roll over at midnight", async t => {
  const { db, sql } = createTickerbotLedgerDb();
  t.after(() => sql.close());
  const claims = await Promise.all(Array.from({ length: 8 }, () => claimMassiveDailyCall(db, NOW, 3)));
  assert.equal(claims.filter(claim => claim.ok).length, 3);
  assert.equal(claims.filter(claim => claim.reason === "massive-budget-exhausted").length, 5);

  const oct = await readMassiveDailyCallLedger(db, NOW, 3);
  assert.equal(oct.ok, true);
  assert.equal(oct.ledger.day, "2026-10-03");
  assert.equal(oct.ledger.calls, 3);
  assert.equal(oct.ledger.exhausted, true);
  assert.equal(massiveUtcDay(Date.parse("2026-10-03T23:59:59.999Z")), "2026-10-03");
  assert.equal(massiveUtcDay(Date.parse("2026-10-04T00:00:00.000Z")), "2026-10-04");

  const next = await claimMassiveDailyCall(db, NEXT_DAY, 3);
  assert.equal(next.ok, true);
  assert.equal(next.ledger.calls, 1);
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM massive_daily_call_ledger").get().count, 2);
});

test("Disc4 resolves the active Massive contract before bars and carries contract provenance", async t => {
  clearCharactersBeatCache();
  clearMassiveCache();
  const { db, sql } = createTickerbotLedgerDb();
  t.after(() => sql.close());
  const requests = [];
  const response = await handleCharactersBeat(
    beat("disc=commodities&provider=massive&symbols=WTI&interval=1d&cadence=1"), env(db), {
      now: () => NOW,
      fetch: async (input, options) => {
        const url = new URL(input);
        requests.push({ url, options });
        if (url.pathname === "/futures/v1/contracts") {
          return Response.json({ results: [{
            ticker: "CLX6", product_code: "CL", active: true, type: "single",
            date: "2026-10-03", last_trade_date: "2026-11-20", days_to_maturity: 48,
            name: "WTI crude oil"
          }] });
        }
        return Response.json({ request_id: "futures_test_1", results: [
          { window_start: (NOW - 2 * 86_400_000) * 1e6, session_end_date: "2026-10-01", open: 100, high: 104, low: 99, close: 102, volume: 1000 },
          { window_start: (NOW - 86_400_000) * 1e6, session_end_date: "2026-10-02", open: 102, high: 105, low: 101, close: 104, volume: 1100 }
        ] });
      }
    }
  );
  const payload = await response.json();
  assert.equal(response.status, 200, JSON.stringify(payload));
  assert.deepEqual(requests.map(entry => entry.url.pathname), [
    "/futures/v1/contracts", "/futures/v1/aggs/CLX6"
  ], "the dated ticker is discovered and validated before a futures bars URL is built");
  assert.equal(requests[0].url.searchParams.get("product_code"), "CL");
  assert.equal(requests[0].url.searchParams.get("date"), "2026-10-03");
  assert.ok(requests.every(entry => entry.options.headers.Authorization === `Bearer ${MASSIVE_KEY}`));
  assert.equal(payload.data.spend.massiveContractAttempts, 1);
  assert.equal(payload.data.spend.massiveBarAttempts, 1);
  assert.equal(payload.data.spend.massiveDaily.calls, 2, "contract metadata and bars share the same daily allowance");
  assert.deepEqual(payload.data.sourceIdentities[0].massiveContract, {
    provider: "Massive", productCode: "CL", ticker: "CLX6", asOfDate: "2026-10-03",
    lastTradeDate: "2026-11-20", daysToMaturity: 48, name: "WTI crude oil"
  });
  assert.equal(payload.data.instruments[0].marketContext.massiveTicker, "CLX6");
  assert.equal(payload.data.instruments[0].marketContext.massiveContract.productCode, "CL");
  assert.match(payload.data.instruments[0].marketContext.source, /CLX6/);
});

test("Disc4 holds when Massive has no verifiable active contract and cooldown suppresses retries", async t => {
  clearCharactersBeatCache();
  const { db, sql } = createTickerbotLedgerDb();
  t.after(() => sql.close());
  let calls = 0;
  const dependencies = {
    now: () => NOW,
    fetch: async input => {
      calls += 1;
      assert.equal(new URL(input).pathname, "/futures/v1/contracts", "no futures bar request follows an unverified result");
      return Response.json({ results: [] });
    }
  };
  const query = "disc=commodities&provider=massive&symbols=WTI&interval=1d&cadence=1";
  const first = await handleCharactersBeat(beat(query), env(db), dependencies);
  assert.equal(first.status, 404);
  assert.match((await first.json()).message, /no verifiable active single contract/i);
  assert.equal(sql.prepare("SELECT attempted_calls AS calls FROM massive_daily_call_ledger").get().calls, 1);
  const cooled = await handleCharactersBeat(beat(query), env(db), {
    ...dependencies, now: () => NOW + 60_000
  });
  assert.equal(cooled.status, 429);
  assert.equal(calls, 1);
});

test("the beat route isolates provider policies and caches successful Massive daily packets through UTC midnight", async t => {
  clearCharactersBeatCache();
  clearMassiveCache();
  const { db, sql } = createTickerbotLedgerDb();
  t.after(() => sql.close());
  const hosts = [];
  const dependencies = {
    now: () => NOW,
    fetch: async input => {
      hosts.push(new URL(input).hostname);
      return dailyAggs();
    }
  };

  const first = await handleCharactersBeat(
    beat("disc=fx&provider=massive&symbols=EURUSD&interval=1d&cadence=1"),
    env(db),
    dependencies
  );
  const firstPayload = await first.json();
  assert.equal(first.status, 200, JSON.stringify(firstPayload));
  assert.deepEqual(hosts, ["api.massive.com"]);
  assert.equal(firstPayload.data.provider, "massive");
  assert.equal(firstPayload.data.cadenceMinutes, 1);
  assert.equal(firstPayload.data.holdMs, Date.parse("2026-10-04T00:00:00.000Z") - NOW);
  assert.equal(firstPayload.data.instruments[0].provider, "massive");
  assert.equal(firstPayload.data.spend.massiveAttempts, 1);
  assert.equal(firstPayload.data.spend.tickerbotAttempts, 0);
  assert.equal(firstPayload.data.spend.massiveDaily.calls, 1);
  assert.equal(firstPayload.data.spend.massiveDaily.dailyLimit, MASSIVE_PROVIDER_DAILY_LIMIT);

  const cached = await handleCharactersBeat(
    beat("disc=fx&provider=massive&symbols=EURUSD&interval=1d&cadence=1"),
    env(db),
    { now: () => NOW + 30_000, fetch: async () => { throw new Error("a daily cache hit must not call Massive"); } }
  );
  const cachedPayload = await cached.json();
  assert.equal(cached.status, 200);
  assert.equal(cachedPayload.data.instruments[0].status, "cached");
  assert.equal(cachedPayload.data.spend.providerAttempts, 0);
  assert.equal(cachedPayload.data.spend.massiveDaily.calls, 1, "a cache hit does not claim another daily slot");

  const omittedCadence = await handleCharactersBeat(
    beat("disc=fx&provider=massive&symbols=GBPUSD&interval=1d"), env(db), dependencies
  );
  const omittedCadencePayload = await omittedCadence.json();
  assert.equal(omittedCadence.status, 200);
  assert.equal(omittedCadencePayload.data.cadenceMinutes, 1, "the fixed Massive loop keeps cadence=1 as the daily-bar contract");
  assert.equal(omittedCadencePayload.data.instruments.length, 1);

  const afterMidnight = await handleCharactersBeat(
    beat("disc=fx&provider=massive&symbols=EURUSD&interval=1d&cadence=1"),
    env(db),
    { now: () => NEXT_DAY, fetch: async input => { hosts.push(new URL(input).hostname); return dailyAggs(); } }
  );
  const afterMidnightPayload = await afterMidnight.json();
  assert.equal(afterMidnight.status, 200);
  assert.equal(afterMidnightPayload.data.instruments[0].status, "bars", "the successful daily cache expires exactly at UTC midnight");
  assert.equal(afterMidnightPayload.data.spend.massiveAttempts, 1);
  assert.equal(afterMidnightPayload.data.spend.massiveDaily.day, "2026-10-04");
  assert.equal(afterMidnightPayload.data.spend.massiveDaily.calls, 1, "the daily ledger rolls with the cache window");

  const badMassiveInterval = await handleCharactersBeat(
    beat("disc=fx&provider=massive&symbols=EURUSD&interval=1h&cadence=1"), env(db), dependencies
  );
  assert.equal(badMassiveInterval.status, 400);
  const badMassiveCadence = await handleCharactersBeat(
    beat("disc=fx&provider=massive&symbols=EURUSD&interval=1d&cadence=15"), env(db), dependencies
  );
  assert.equal(badMassiveCadence.status, 400, "Massive's daily-bar cadence contract is exactly cadence=1");
  const badMassiveBatch = await handleCharactersBeat(
    beat("disc=fx&provider=massive&symbols=EURUSD,GBPUSD&interval=1d&cadence=1"), env(db), dependencies
  );
  assert.equal(badMassiveBatch.status, 400, "a crafted URL cannot widen the one-instrument-per-request Massive beat");
  const badTickerbotDisc = await handleCharactersBeat(
    beat("disc=fx&provider=tickerbot&symbols=EURUSD&interval=1d&cadence=15"), env(db), dependencies
  );
  assert.equal(badTickerbotDisc.status, 400);
  const badAlphaDisc = await handleCharactersBeat(
    beat("disc=fx&provider=alpha&symbols=EURUSD&interval=1mo&cadence=60"), env(db), dependencies
  );
  assert.equal(badAlphaDisc.status, 400);
});

test("a Massive minute-gate refusal does not consume a daily D1 slot", async t => {
  clearCharactersBeatCache();
  clearMassiveCache();
  const { db, sql } = createTickerbotLedgerDb();
  t.after(() => sql.close());
  const envValue = env(db);
  let fetches = 0;
  const dependencies = {
    now: () => NOW,
    fetch: async () => { fetches += 1; return dailyAggs(); }
  };
  for (const symbol of ["EURUSD", "GBPUSD", "JPYUSD", "CADUSD", "SEKUSD"]) {
    const admitted = await handleCharactersBeat(
      beat(`disc=fx&provider=massive&symbols=${symbol}&interval=1d&cadence=1`), envValue, dependencies
    );
    assert.equal(admitted.status, 200);
  }
  const rateLimited = await handleCharactersBeat(
    beat("disc=fx&provider=massive&symbols=CHFUSD&interval=1d&cadence=1"), envValue, dependencies
  );
  const payload = await rateLimited.json();
  assert.equal(rateLimited.status, 429, JSON.stringify(payload));
  assert.equal(payload.data.spend.massiveAttempts, 0);
  assert.equal(payload.data.spend.massiveDaily.calls, 5, "the denied minute slot did not claim another daily telemetry slot");
  assert.equal(fetches, 5);
});

test("Massive failures do not leak an upstream body or a Worker secret, and missing D1 fails closed", async t => {
  clearCharactersBeatCache();
  clearMassiveCache();
  const { db, sql } = createTickerbotLedgerDb();
  t.after(() => sql.close());
  const failureResponse = await handleCharactersBeat(
    beat("disc=fx&provider=massive&symbols=EURUSD&interval=1d&cadence=1"),
    env(db),
    { now: () => NOW, fetch: async () => Response.json({ message: `private upstream body ${MASSIVE_KEY}` }, { status: 500 }) }
  );
  assert.equal(failureResponse.status, 502);
  const body = JSON.stringify(await failureResponse.json());
  assert.doesNotMatch(body, /private upstream body|massive-test-only-worker-secret|Bearer/);

  clearCharactersBeatCache();
  clearMassiveCache();
  let fetches = 0;
  const missingLedger = await handleCharactersBeat(
    beat("disc=fx&provider=massive&symbols=GBPUSD&interval=1d&cadence=1"),
    { MASSIVE_API_KEY: MASSIVE_KEY },
    { now: () => NOW, fetch: async () => { fetches += 1; return dailyAggs(); } }
  );
  assert.equal(missingLedger.status, 503);
  assert.equal(fetches, 0, "D1 must be available before a Massive request can leave the Worker");
  assert.match(await missingLedger.text(), /massive.*ledger.*unavailable/i);
});

test("the six DXY component quotes retain their USD-per-foreign orientation through the Worker route", async t => {
  clearCharactersBeatCache();
  clearMassiveCache();
  const { db, sql } = createTickerbotLedgerDb();
  t.after(() => sql.close());
  const symbols = ["EURUSD", "JPYUSD", "GBPUSD", "CADUSD", "SEKUSD", "CHFUSD"];
  const upstream = [];
  let now = NOW + 5 * 86_400_000;
  for (const symbol of symbols) {
    const response = await handleCharactersBeat(
      beat(`disc=fx&provider=massive&symbols=${symbol}&interval=1d&cadence=1`), env(db), {
        now: () => now,
        fetch: async input => { upstream.push({ symbol, url: new URL(input) }); return dailyAggs(); }
      }
    );
    const payload = await response.json();
    assert.equal(response.status, 200, `${symbol} reaches the reviewed FX Worker path: ${JSON.stringify(payload)}`);
    assert.equal(payload.data.instruments[0].symbol, symbol);
    assert.equal(payload.data.instruments[0].marketContext.quoteCurrency, "USD");
    assert.equal(payload.data.instruments[0].marketContext.timeframe, "1d");
    now += 60_001;
  }
  assert.deepEqual(upstream.map(({ symbol, url }) => [symbol, decodeURIComponent(url.pathname.split("/")[4])]),
    symbols.map(symbol => [symbol, `C:${symbol}`]));
  assert.equal(upstream.length, 6);
});

test("Massive cannot be used as a Stocks or Crypto fallback", async t => {
  clearCharactersBeatCache();
  clearMassiveCache();
  const { db, sql } = createTickerbotLedgerDb();
  t.after(() => sql.close());
  assert.equal(TICKERBOT_WATCHLIST.length, 52);
  let calls = 0;
  for (const entry of TICKERBOT_WATCHLIST) {
    const response = await handleCharactersBeat(
      beat(`disc=stocks&provider=massive&symbols=${entry.symbol}&interval=1d&cadence=1`), env(db), {
        now: () => NOW, fetch: async () => { calls += 1; return dailyAggs(); }
      }
    );
    assert.equal(response.status, 400, `${entry.symbol} remains Tickerbot-only for Stocks`);
  }
  const crypto = await handleCharactersBeat(
    beat("disc=crypto&provider=massive&symbols=BTC&interval=1d&cadence=1"), env(db), {
      now: () => NOW, fetch: async () => { calls += 1; return dailyAggs(); }
    }
  );
  assert.equal(crypto.status, 400, "Kraken is the only Characters Crypto provider");
  assert.equal(calls, 0, "a mismatched provider never reaches Massive");
});
