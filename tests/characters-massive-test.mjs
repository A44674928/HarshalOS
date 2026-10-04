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
    instrument: { symbol: "AAPL", assetClass: "equity", interval: "1d" },
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
  assert.match(url.pathname, /^\/v2\/aggs\/ticker\/AAPL\/range\/1\/day\/\d{4}-\d{2}-\d{2}\/\d{4}-\d{2}-\d{2}$/);
  assert.equal(url.searchParams.get("adjusted"), "true");
  assert.equal(url.searchParams.get("sort"), "asc");
  assert.equal(url.searchParams.get("limit"), "60");
  assert.equal(options.headers.Authorization, `Bearer ${MASSIVE_KEY}`);
  assert.equal(options.redirect, "manual");
  assert.doesNotMatch(url.toString(), new RegExp(MASSIVE_KEY));

  assert.equal(result.packet.symbol, "AAPL");
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
    symbol: "BTC", displaySymbol: "BTC/USD", assetClass: "crypto", rankingProvider: "CoinGecko"
  });
  const commodity = massiveDailyInternals.normalizeInstrument(catalog.commodities.find(entry => entry.symbol === "WTI"));
  const index = massiveDailyInternals.normalizeInstrument(catalog.indices.find(entry => entry.symbol === "SPX"));
  assert.deepEqual(
    [fx && fx.massiveTicker, crypto && crypto.massiveTicker, commodity && commodity.massiveTicker, index && index.massiveTicker],
    ["C:EURUSD", "X:BTCUSD", "CLZ6", "I:SPX"]
  );
  assert.equal(fx.family, "aggs");
  assert.equal(commodity.family, "futures");
  assert.equal(index.dataShape, "ohlc");
  assert.equal(massiveDailyInternals.normalizeInstrument({ symbol: "NOT_REVIEWED", assetClass: "commodity" }), null);

  const futuresUrl = massiveDailyInternals.makeRequestUrl(commodity, NOW);
  assert.equal(futuresUrl.pathname, "/futures/v1/aggs/CLZ6");
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
    beat("disc=stocks&provider=massive&symbols=AAPL&interval=1d&cadence=1"),
    env(db),
    dependencies
  );
  const firstPayload = await first.json();
  assert.equal(first.status, 200);
  assert.deepEqual(hosts, ["api.massive.com"]);
  assert.equal(firstPayload.data.provider, "massive");
  assert.equal(firstPayload.data.cadenceMinutes, 1);
  assert.equal(firstPayload.data.holdMs, Date.parse("2026-10-04T00:00:00.000Z") - NOW);
  assert.equal(firstPayload.data.instruments[0].provider, "massive");
  assert.equal(firstPayload.data.spend.massiveAttempts, 1);
  assert.equal(firstPayload.data.spend.tickerbotAttempts, 0);
  assert.equal(firstPayload.data.spend.alphaVantageAttempts, 0);
  assert.equal(firstPayload.data.spend.massiveDaily.calls, 1);
  assert.equal(firstPayload.data.spend.massiveDaily.dailyLimit, MASSIVE_PROVIDER_DAILY_LIMIT);

  const cached = await handleCharactersBeat(
    beat("disc=stocks&provider=massive&symbols=AAPL&interval=1d&cadence=1"),
    env(db),
    { now: () => NOW + 30_000, fetch: async () => { throw new Error("a daily cache hit must not call Massive"); } }
  );
  const cachedPayload = await cached.json();
  assert.equal(cached.status, 200);
  assert.equal(cachedPayload.data.instruments[0].status, "cached");
  assert.equal(cachedPayload.data.spend.providerAttempts, 0);
  assert.equal(cachedPayload.data.spend.massiveDaily.calls, 1, "a cache hit does not claim another daily slot");

  const omittedCadence = await handleCharactersBeat(
    beat("disc=stocks&provider=massive&symbols=MSFT&interval=1d"), env(db), dependencies
  );
  const omittedCadencePayload = await omittedCadence.json();
  assert.equal(omittedCadence.status, 200);
  assert.equal(omittedCadencePayload.data.cadenceMinutes, 1, "the fixed Massive loop normalizes an omitted cadence to one minute");
  assert.equal(omittedCadencePayload.data.instruments.length, 1);

  const afterMidnight = await handleCharactersBeat(
    beat("disc=stocks&provider=massive&symbols=AAPL&interval=1d&cadence=1"),
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
    beat("disc=stocks&provider=massive&symbols=AAPL&interval=1h&cadence=1"), env(db), dependencies
  );
  assert.equal(badMassiveInterval.status, 400);
  const badMassiveCadence = await handleCharactersBeat(
    beat("disc=stocks&provider=massive&symbols=MSFT&interval=1d&cadence=15"), env(db), dependencies
  );
  assert.equal(badMassiveCadence.status, 400, "Massive's automatic loop is exactly one minute");
  const badMassiveBatch = await handleCharactersBeat(
    beat("disc=stocks&provider=massive&symbols=MSFT,NVDA&interval=1d&cadence=1"), env(db), dependencies
  );
  assert.equal(badMassiveBatch.status, 400, "a crafted URL cannot widen the one-instrument Massive beat");
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
  const restricted = env(db, { MASSIVE_DEPLOYMENT_LIMIT_PER_MINUTE: "1", MASSIVE_CLIENT_LIMIT_PER_MINUTE: "1" });
  let fetches = 0;
  const dependencies = {
    now: () => NOW,
    fetch: async () => { fetches += 1; return dailyAggs(); }
  };
  const admitted = await handleCharactersBeat(
    beat("disc=stocks&provider=massive&symbols=AAPL&interval=1d&cadence=1"), restricted, dependencies
  );
  assert.equal(admitted.status, 200);
  const rateLimited = await handleCharactersBeat(
    beat("disc=stocks&provider=massive&symbols=MSFT&interval=1d&cadence=1"), restricted, dependencies
  );
  const payload = await rateLimited.json();
  assert.equal(rateLimited.status, 429);
  assert.equal(payload.data.spend.massiveAttempts, 0);
  assert.equal(payload.data.spend.massiveDaily.calls, 1, "the denied minute slot did not claim the daily allowance");
  assert.equal(fetches, 1);
});

test("Massive failures do not leak an upstream body or a Worker secret, and missing D1 fails closed", async t => {
  clearCharactersBeatCache();
  clearMassiveCache();
  const { db, sql } = createTickerbotLedgerDb();
  t.after(() => sql.close());
  const failureResponse = await handleCharactersBeat(
    beat("disc=stocks&provider=massive&symbols=AAPL&interval=1d&cadence=1"),
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
    beat("disc=stocks&provider=massive&symbols=MSFT&interval=1d&cadence=1"),
    { MASSIVE_API_KEY: MASSIVE_KEY },
    { now: () => NOW, fetch: async () => { fetches += 1; return dailyAggs(); } }
  );
  assert.equal(missingLedger.status, 503);
  assert.equal(fetches, 0, "D1 must be available before a Massive request can leave the Worker");
  assert.match(await missingLedger.text(), /massive.*ledger.*unavailable/i);
});
