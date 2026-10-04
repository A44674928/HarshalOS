/* Alpha Vantage's daily-only Characters fallback and its independent D1 daily cap. */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ALPHA_VANTAGE_DAILY_MAX_BARS,
  fetchAlphaVantageDailyMarketContext,
  isAlphaVantageDailyBarClosed,
  toAlphaVantageDailyBar
} from "../worker/characters-alpha-vantage.mjs";
import {
  ALPHA_VANTAGE_PROVIDER_DAILY_LIMIT,
  alphaVantageUtcDay,
  claimAlphaVantageDailyCall,
  readAlphaVantageDailyCallLedger
} from "../worker/alpha-vantage-daily-call-ledger.mjs";
import { clearCharactersBeatCache, handleCharactersBeat } from "../worker/characters-beat.mjs";
import { createTickerbotLedgerDb } from "./helpers/tickerbot-ledger-db.mjs";

const NOW = Date.parse("2026-10-05T17:00:00.000Z"); // Monday, 13:00 America/New_York
const ROUTE = "https://os.example.test/api/characters/v1/beat";
const TICKERBOT_KEY = "tickerbot-test-secret";
const ALPHA_KEY = "alpha-vantage-test-secret";
const beat = (query, init) => new Request(`${ROUTE}?${query}`, init);
const fixture = () => createTickerbotLedgerDb();

function tickerbotPayload() {
  return Response.json({
    as_of: new Date(NOW).toISOString(), ticker: "ANY", interval: "1d", coverage: "covered",
    bars: [
      { t: NOW - 2 * 86_400_000, o: 100, h: 102, l: 99, c: 101, v: 1200 },
      { t: NOW - 86_400_000, o: 101, h: 103, l: 100, c: 102, v: 1300 }
    ]
  });
}

function alphaRow({ open = 10, high = 12, low = 9, close = 11, volume = 500 } = {}) {
  return {
    "1. open": String(open), "2. high": String(high), "3. low": String(low),
    "4. close": String(close), "5. volume": String(volume)
  };
}

const validDailyPayload = (symbol = "AAPL") => ({
  "Meta Data": { "2. Symbol": symbol, "3. Last Refreshed": "2026-10-05" },
  "Time Series (Daily)": {
    "2026-10-05": alphaRow({ open: 110, high: 112, low: 109, close: 111, volume: 2500 }),
    "2026-10-02": alphaRow({ open: 108, high: 111, low: 107, close: 110, volume: 2000 }),
    "2026-10-01": alphaRow({ open: 107, high: 109, low: 106, close: 108, volume: 1800 })
  }
});

const workersFetch = handler => async (input, options = {}) => {
  assert.ok(options.redirect === undefined || options.redirect === "manual" || options.redirect === "follow");
  return handler(input, options);
};

test("Alpha Vantage D1 migration is separate, aggregate-only, and records no secret or symbol history", t => {
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

test("Alpha Vantage allowance atomically stops at its own daily cap and rolls over at UTC midnight", async t => {
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

test("daily bar normalization rejects invalid OHLCV and keeps only closed US sessions", () => {
  const good = toAlphaVantageDailyBar("2026-10-02", alphaRow());
  assert.equal(good.confirmed, true);
  assert.equal(good.volume, 500);
  assert.equal(toAlphaVantageDailyBar("2026-02-30", alphaRow()), null);
  assert.equal(toAlphaVantageDailyBar("2026-10-02", alphaRow({ high: 8 })), null);
  assert.equal(toAlphaVantageDailyBar("2026-10-02", { ...alphaRow(), "5. volume": "NaN" }), null);
  assert.equal(toAlphaVantageDailyBar("2026-10-02", { ...alphaRow(), "5. volume": "" }), null,
    "missing volume is not fabricated as zero");
  assert.equal(toAlphaVantageDailyBar("2026-10-02", { ...alphaRow(), "5. volume": null }), null);
  assert.equal(toAlphaVantageDailyBar("2026-10-02", { ...alphaRow(), "5. volume": "500.5" }), null,
    "fractional volume is not accepted as OHLCV");

  assert.equal(isAlphaVantageDailyBarClosed("2026-10-05", NOW), false,
    "an intraday daily row is not mislabeled as a closed bar");
  assert.equal(isAlphaVantageDailyBarClosed("2026-10-02", NOW), true,
    "the previous trading session is already closed");
  assert.equal(isAlphaVantageDailyBarClosed("2026-10-05", Date.parse("2026-10-05T20:30:00.000Z")), true,
    "the current date may be admitted after the normal close plus a safety buffer");
  assert.equal(isAlphaVantageDailyBarClosed("2026-10-06", NOW), false, "future sessions are rejected");
});

test("Alpha Vantage adapter calls the fixed compact daily endpoint and returns a normalized closed-bar packet", async () => {
  const requests = [];
  const result = await fetchAlphaVantageDailyMarketContext({
    symbol: "aapl", apiKey: ALPHA_KEY, now: NOW,
    fetcher: workersFetch(async (input, options) => {
      requests.push({ url: new URL(input), options });
      return Response.json(validDailyPayload());
    })
  });
  assert.equal(result.ok, true);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url.origin, "https://www.alphavantage.co");
  assert.equal(requests[0].url.pathname, "/query");
  assert.equal(requests[0].url.searchParams.get("function"), "TIME_SERIES_DAILY");
  assert.equal(requests[0].url.searchParams.get("symbol"), "AAPL");
  assert.equal(requests[0].url.searchParams.get("outputsize"), "compact");
  assert.equal(requests[0].url.searchParams.get("apikey"), ALPHA_KEY);
  assert.equal(requests[0].options.redirect, "manual", "the key is never replayed to a redirect target");
  assert.equal(result.packet.schema, "gi-market-context-v1");
  assert.equal(result.packet.synthetic, false);
  assert.equal(result.packet.symbol, "AAPL");
  assert.equal(result.packet.timeframe, "1d");
  assert.match(result.packet.source, /Alpha Vantage.*unadjusted compact daily OHLCV.*2026-10-02/);
  assert.deepEqual(result.packet.bars.map(bar => new Date(bar.time).toISOString().slice(0, 10)), ["2026-10-01", "2026-10-02"]);
  assert.ok(result.packet.bars.every(bar => bar.confirmed));
  assert.equal(ALPHA_VANTAGE_DAILY_MAX_BARS, 100);

  const mismatch = await fetchAlphaVantageDailyMarketContext({
    symbol: "AAPL", apiKey: ALPHA_KEY, now: NOW,
    fetcher: async () => Response.json({
      "Meta Data": { "2. Symbol": "MSFT" },
      "Time Series (Daily)": { "2026-10-02": alphaRow() }
    })
  });
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.code, "alpha-vantage-symbol-mismatch");
});

test("successful Tickerbot remains primary even when the Alpha Vantage fallback is configured", async () => {
  clearCharactersBeatCache();
  const { db, sql } = fixture();
  try {
    const hosts = [];
    const response = await handleCharactersBeat(beat("symbols=AAPL&interval=1d&cadence=60"), {
      TICKERBOT_API_KEY: TICKERBOT_KEY, ALPHA_VANTAGE_API_KEY: ALPHA_KEY, COMMUNITY_DB: db
    }, {
      now: () => NOW,
      fetch: workersFetch(async input => {
        hosts.push(new URL(input).hostname);
        return tickerbotPayload();
      })
    });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(hosts, ["api.tickerbot.io"]);
    assert.equal(payload.data.instruments[0].provider, "tickerbot");
    assert.equal(payload.data.spend.tickerbotAttempts, 1);
    assert.equal(payload.data.spend.alphaVantageAttempts, 0);
    assert.equal(payload.data.spend.providerAttempts, 1);
    assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM alpha_vantage_daily_call_ledger").get().count, 0);
  } finally {
    sql.close();
  }
});

test("Alpha Vantage is never called for hourly beats or an off-watchlist symbol", async () => {
  let directCalls = 0;
  const refusedSymbol = await fetchAlphaVantageDailyMarketContext({
    symbol: "../../admin", apiKey: ALPHA_KEY, fetcher: async () => { directCalls += 1; }, now: NOW
  });
  assert.equal(refusedSymbol.ok, false);
  assert.equal(refusedSymbol.code, "alpha-vantage-symbol-refused");
  assert.equal(directCalls, 0);

  clearCharactersBeatCache();
  const { db, sql } = fixture();
  try {
    let calls = 0;
    const response = await handleCharactersBeat(beat("symbols=AAPL&interval=1h&cadence=60"), {
      TICKERBOT_API_KEY: TICKERBOT_KEY, ALPHA_VANTAGE_API_KEY: ALPHA_KEY, COMMUNITY_DB: db
    }, {
      now: () => NOW,
      fetch: workersFetch(async input => {
        calls += 1;
        return new URL(input).hostname === "api.tickerbot.io"
          ? new Response("Tickerbot unavailable", { status: 500 })
          : Response.json(validDailyPayload());
      })
    });
    const payload = await response.json();
    assert.equal(response.status, 502);
    assert.equal(calls, 1, "only the Tickerbot primary was attempted; Alpha Vantage is daily-only");
    assert.equal(payload.data.spend.tickerbotAttempts, 1);
    assert.equal(payload.data.spend.alphaVantageAttempts, 0);
    assert.equal(payload.data.spend.providerAttempts, 1);
    assert.equal(payload.data.instruments[0].provider, "tickerbot");
    assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM alpha_vantage_daily_call_ledger").get().count, 0);
  } finally {
    sql.close();
  }
});

test("a failed daily Tickerbot read falls back once under the separate Alpha Vantage D1 cap", async () => {
  clearCharactersBeatCache();
  const { db, sql } = fixture();
  try {
    const calls = [];
    const response = await handleCharactersBeat(beat("symbols=AAPL&interval=1d&cadence=60"), {
      TICKERBOT_API_KEY: TICKERBOT_KEY,
      ALPHA_VANTAGE_API_KEY: ALPHA_KEY,
      COMMUNITY_DB: db
    }, {
      now: () => NOW,
      fetch: workersFetch(async input => {
        const url = new URL(input);
        calls.push(url);
        if (url.hostname === "api.tickerbot.io") return new Response("private Tickerbot body", { status: 500 });
        assert.equal(url.hostname, "www.alphavantage.co");
        return Response.json(validDailyPayload());
      })
    });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(calls.map(url => url.hostname), ["api.tickerbot.io", "www.alphavantage.co"]);
    assert.equal(payload.data.instruments[0].provider, "alpha-vantage");
    assert.equal(payload.data.instruments[0].fallbackFrom, "upstream");
    assert.equal(payload.data.instruments[0].marketContext.timeframe, "1d");
    assert.equal(payload.data.spend.tickerbotAttempts, 1);
    assert.equal(payload.data.spend.alphaVantageAttempts, 1);
    assert.equal(payload.data.spend.providerAttempts, 2);
    assert.equal(payload.data.spend.durable.calls, 1);
    assert.equal(payload.data.spend.alphaVantageDaily.calls, 1);
    assert.equal(payload.data.spend.alphaVantageDaily.dailyLimit, 25);
    assert.equal(payload.data.spend.alphaVantageLedgerStatus, "ready");
    assert.equal(payload.data.instruments[0].marketContext.bars.length, 2, "the unfinished current-session bar is withheld");
    const body = JSON.stringify(payload);
    assert.doesNotMatch(body, new RegExp(`${TICKERBOT_KEY}|${ALPHA_KEY}|private Tickerbot body`));
    assert.doesNotMatch(body, /alphavantage\.co\/query\?|apikey=/i);

    const cached = await handleCharactersBeat(beat("symbols=AAPL&interval=1d&cadence=60"), {
      TICKERBOT_API_KEY: TICKERBOT_KEY,
      ALPHA_VANTAGE_API_KEY: ALPHA_KEY,
      COMMUNITY_DB: db
    }, { now: () => NOW, fetch: async () => { throw new Error("cache should suppress outbound calls"); } });
    const cachedPayload = await cached.json();
    assert.equal(cachedPayload.data.instruments[0].status, "cached");
    assert.equal(cachedPayload.data.instruments[0].provider, "alpha-vantage");
    assert.equal(cachedPayload.data.spend.providerAttempts, 0);
    assert.equal(cachedPayload.data.spend.cacheHits, 1);
  } finally {
    sql.close();
  }
});

test("an exhausted Tickerbot month still permits the independently capped daily fallback", async () => {
  clearCharactersBeatCache();
  const { db, sql } = fixture();
  try {
    sql.prepare(`INSERT INTO tickerbot_call_ledger
      (utc_month, attempted_calls, provider_budget, worker_limit, updated_at)
      VALUES ('2026-10', 10000, 10000, 10000, ?)`).run(NOW);
    let calls = 0;
    const response = await handleCharactersBeat(beat("symbols=MSFT&interval=1d"), {
      TICKERBOT_API_KEY: TICKERBOT_KEY, ALPHA_VANTAGE_API_KEY: ALPHA_KEY, COMMUNITY_DB: db
    }, {
      now: () => NOW,
      fetch: workersFetch(async input => {
        calls += 1;
        assert.equal(new URL(input).hostname, "www.alphavantage.co", "the exhausted primary is refused before fetch");
        return Response.json(validDailyPayload("MSFT"));
      })
    });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(calls, 1);
    assert.equal(payload.data.spend.tickerbotAttempts, 0);
    assert.equal(payload.data.spend.alphaVantageAttempts, 1);
    assert.equal(payload.data.spend.providerAttempts, 1);
    assert.equal(payload.data.spend.durable.exhausted, true);
    assert.equal(payload.data.spend.alphaVantageDaily.calls, 1);
  } finally {
    sql.close();
  }
});

test("Alpha Vantage cap exhaustion and D1 failure both fail closed without a provider fetch", async () => {
  clearCharactersBeatCache();
  const { db, sql } = fixture();
  try {
    sql.prepare(`INSERT INTO alpha_vantage_daily_call_ledger
      (utc_day, attempted_calls, daily_limit, updated_at)
      VALUES ('2026-10-05', 25, 25, ?)`).run(NOW);
    let calls = 0;
    const response = await handleCharactersBeat(beat("symbols=NVDA&interval=1d"), {
      ALPHA_VANTAGE_API_KEY: ALPHA_KEY, COMMUNITY_DB: db
    }, { now: () => NOW, fetch: async () => { calls += 1; return Response.json(validDailyPayload()); } });
    const payload = await response.json();
    assert.equal(response.status, 429);
    assert.equal(calls, 0);
    assert.equal(payload.data.instruments[0].code, "alpha-vantage-budget-exhausted");
    assert.equal(payload.data.spend.alphaVantageDaily.calls, 25);
    assert.equal(payload.data.spend.alphaVantageAttempts, 0);
  } finally {
    sql.close();
  }

  clearCharactersBeatCache();
  let calls = 0;
  const noLedger = { prepare() { throw new Error("migration absent"); } };
  const refused = await handleCharactersBeat(beat("symbols=NVDA&interval=1d"), {
    ALPHA_VANTAGE_API_KEY: ALPHA_KEY, COMMUNITY_DB: noLedger
  }, { now: () => NOW, fetch: async () => { calls += 1; return Response.json(validDailyPayload()); } });
  const refusedPayload = await refused.json();
  assert.equal(refused.status, 503);
  assert.equal(calls, 0);
  assert.equal(refusedPayload.data.instruments[0].code, "alpha-vantage-ledger-unavailable");
  assert.equal(refusedPayload.data.spend.alphaVantageLedgerStatus, "unavailable");
});

test("an unconfigured Alpha Vantage fallback reports the optional secret without echoing upstream data", async () => {
  clearCharactersBeatCache();
  const { db, sql } = fixture();
  try {
    const response = await handleCharactersBeat(beat("symbols=AAPL&interval=1d"), {
      TICKERBOT_API_KEY: TICKERBOT_KEY, COMMUNITY_DB: db
    }, {
      now: () => NOW,
      fetch: workersFetch(async () => new Response("upstream failure body", { status: 500 }))
    });
    const body = JSON.stringify(await response.json());
    assert.match(body, /ALPHA_VANTAGE_API_KEY/);
    assert.doesNotMatch(body, new RegExp(ALPHA_KEY));
    assert.doesNotMatch(body, /upstream failure body/);
    assert.equal(response.status, 503);
  } finally {
    sql.close();
  }
});
