/* Tests for the shared D1-backed Tickerbot allowance and its free-tier-safe contract. */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  claimTickerbotCall,
  readTickerbotCallLedger,
  tickerbotUtcMonth,
  TICKERBOT_PROVIDER_MONTHLY_BUDGET,
  TICKERBOT_WORKER_MONTHLY_LIMIT
} from "../worker/tickerbot-call-ledger.mjs";
import { clearCharactersBeatCache, handleCharactersBeat } from "../worker/characters-beat.mjs";
import {
  clearTickerbotCache,
  handleGoodIntelligenceTickerbot
} from "../worker/good-intelligence-tickerbot.mjs";
import { createTickerbotLedgerDb } from "./helpers/tickerbot-ledger-db.mjs";

const NOW = Date.parse("2026-10-03T12:00:00.000Z");
const KEY = "test-only-worker-secret";
const marketBars = [
  { t: NOW - 2 * 60 * 60_000, o: 100, h: 102, l: 99, c: 101, v: 1200 },
  { t: NOW - 60 * 60_000, o: 101, h: 103, l: 100, c: 102, v: 1300 }
];
const providerResponse = () => Response.json({
  as_of: new Date(NOW).toISOString(), ticker: "ANY", interval: "1h", coverage: "covered", bars: marketBars
});
const workersFetch = handler => async (url, options = {}) => {
  assert.ok([undefined, "follow", "manual"].includes(options.redirect));
  return handler(url, options);
};

function fixture() {
  const value = createTickerbotLedgerDb();
  return { ...value, env: { COMMUNITY_DB: value.db, TICKERBOT_API_KEY: KEY } };
}

test("D1 migration creates a compact month-keyed aggregate and enforces nonnegative values", t => {
  const { sql } = fixture();
  t.after(() => sql.close());
  const migration = readFileSync(new URL("../migrations/community/0005_tickerbot_call_ledger.sql", import.meta.url), "utf8");
  assert.match(migration, /CREATE TABLE tickerbot_call_ledger/);
  assert.match(migration, /utc_month TEXT PRIMARY KEY/);
  assert.match(migration, /attempted_calls INTEGER NOT NULL DEFAULT 0 CHECK \(attempted_calls >= 0\)/);
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM tickerbot_call_ledger").get().count, 0,
    "migration does not seed fake spend");
  assert.throws(() => sql.prepare(`INSERT INTO tickerbot_call_ledger
    (utc_month, attempted_calls, provider_budget, worker_limit, updated_at)
    VALUES ('2026-10', -1, 10000, 10000, 1)`).run(), /CHECK/);
  assert.equal(TICKERBOT_PROVIDER_MONTHLY_BUDGET, 10000);
  assert.equal(TICKERBOT_WORKER_MONTHLY_LIMIT, 10000,
    "the atomic hard stop matches the user's provider plan; the planner's reserve remains soft");
});

test("concurrent slot claims atomically stop at the monthly limit", async t => {
  const { db, sql } = fixture();
  t.after(() => sql.close());
  const providerBudget = 24;
  const workerLimit = 17;
  const claims = await Promise.all(Array.from({ length: 64 }, () =>
    claimTickerbotCall(db, NOW, { providerBudget, workerLimit })));
  assert.equal(claims.filter(claim => claim.ok).length, workerLimit);
  assert.equal(claims.filter(claim => claim.reason === "budget-exhausted").length, 64 - workerLimit);
  const ledger = await readTickerbotCallLedger(db, NOW, { providerBudget, workerLimit });
  assert.equal(ledger.ok, true);
  assert.equal(ledger.ledger.month, "2026-10");
  assert.equal(ledger.ledger.calls, workerLimit);
  assert.equal(ledger.ledger.remaining, 0);
  assert.equal(ledger.ledger.exhausted, true);
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM tickerbot_call_ledger").get().count, 1,
    "claims update one aggregate row; no per-call history is stored");
});

test("the durable ledger rolls by UTC month and reads only its primary-key row", async t => {
  const { db, sql } = fixture();
  t.after(() => sql.close());
  const oct = Date.parse("2026-10-31T23:59:59.000Z");
  const nov = Date.parse("2026-11-01T00:00:00.000Z");
  assert.equal(tickerbotUtcMonth(oct), "2026-10");
  assert.equal(tickerbotUtcMonth(nov), "2026-11");
  assert.equal((await claimTickerbotCall(db, oct)).ledger.calls, 1);
  assert.equal((await claimTickerbotCall(db, nov)).ledger.calls, 1,
    "the new UTC month begins at zero then claims its first slot");
  const rows = sql.prepare("SELECT utc_month, attempted_calls FROM tickerbot_call_ledger ORDER BY utc_month").all()
    .map(row => ({ utc_month: row.utc_month, attempted_calls: row.attempted_calls }));
  assert.deepEqual(rows, [
    { utc_month: "2026-10", attempted_calls: 1 },
    { utc_month: "2026-11", attempted_calls: 1 }
  ]);
  const plan = sql.prepare("EXPLAIN QUERY PLAN SELECT * FROM tickerbot_call_ledger WHERE utc_month = ?").all("2026-11");
  assert.ok(plan.some(row => /PRIMARY KEY|INDEX/i.test(row.detail)), "month lookup uses the primary key");
});

test("missing D1 or an unapplied migration refuses a claim without an upstream call", async () => {
  const absent = await claimTickerbotCall(undefined, NOW);
  assert.equal(absent.ok, false);
  assert.equal(absent.reason, "ledger-unavailable");

  const sql = new (await import("node:sqlite")).DatabaseSync(":memory:");
  const brokenDb = { prepare(text) {
    let params = [];
    const statement = { bind(...args) { params = args; return statement; }, async first() { return sql.prepare(text).get(...params) ?? null; } };
    return statement;
  } };
  const broken = await claimTickerbotCall(brokenDb, NOW);
  assert.equal(broken.ok, false);
  assert.equal(broken.reason, "ledger-unavailable");
  sql.close();
});

test("Characters and Good Intelligence share one D1 counter; failed upstream attempts count", async t => {
  clearCharactersBeatCache();
  clearTickerbotCache();
  const { env, sql } = fixture();
  t.after(() => sql.close());
  let fetches = 0;
  const dependencies = {
    now: () => NOW,
    fetch: workersFetch(async () => { fetches += 1; return providerResponse(); })
  };

  const gi = await handleGoodIntelligenceTickerbot(
    new Request("https://os.example.test/api/good-intelligence/v1/market/tickerbot/bars?symbol=AAPL&interval=1h"),
    env,
    dependencies
  );
  assert.equal(gi.status, 200);

  const characters = await handleCharactersBeat(
    new Request("https://os.example.test/api/characters/v1/beat?symbols=MSFT&interval=1h&cadence=15"),
    env,
    dependencies
  );
  const payload = await characters.json();
  assert.equal(characters.status, 200);
  assert.equal(payload.data.spend.providerAttempts, 1);
  assert.equal(payload.data.spend.durable.calls, 2,
    "Characters sees the prior Market Charts provider attempt in the same D1 month row");

  clearTickerbotCache();
  const failed = await handleGoodIntelligenceTickerbot(
    new Request("https://os.example.test/api/good-intelligence/v1/market/tickerbot/bars?symbol=NVDA&interval=1h"),
    env,
    { now: () => NOW, fetch: workersFetch(async () => { fetches += 1; return new Response("private upstream body", { status: 500 }); }) }
  );
  assert.equal(failed.status, 502);
  const ledger = await readTickerbotCallLedger(env.COMMUNITY_DB, NOW);
  assert.equal(ledger.ledger.calls, 3, "an upstream HTTP failure also consumes a conservative allowance slot");
  assert.equal(fetches, 3);

  const errorText = JSON.stringify(await failed.json());
  assert.doesNotMatch(errorText, /private upstream body|test-only-worker-secret/);
});

test("the 10,000-attempt D1 cap refuses both live routes without another provider fetch", async t => {
  clearCharactersBeatCache();
  clearTickerbotCache();
  const { env, sql } = fixture();
  t.after(() => sql.close());
  sql.prepare(`INSERT INTO tickerbot_call_ledger
    (utc_month, attempted_calls, provider_budget, worker_limit, updated_at)
    VALUES (?, ?, ?, ?, ?)`).run("2026-10", 10000, 10000, 10000, NOW);
  let fetches = 0;
  const dependencies = { now: () => NOW, fetch: async () => { fetches += 1; return providerResponse(); } };

  const characters = await handleCharactersBeat(
    new Request("https://os.example.test/api/characters/v1/beat?symbols=AAPL&interval=1h&cadence=15"), env, dependencies
  );
  const charactersPayload = await characters.json();
  assert.equal(characters.status, 429);
  assert.equal(charactersPayload.data.spend.providerAttempts, 0);
  assert.equal(charactersPayload.data.spend.durable.calls, 10000);
  assert.equal(charactersPayload.data.instruments[0].code, "budget-exhausted");

  const market = await handleGoodIntelligenceTickerbot(
    new Request("https://os.example.test/api/good-intelligence/v1/market/tickerbot/bars?symbol=MSFT&interval=1h"), env, dependencies
  );
  assert.equal(market.status, 429);
  assert.match((await market.json()).message, /allowance is exhausted/);
  assert.equal(fetches, 0, "neither app sends another request after the shared D1 hard stop");
  assert.equal(sql.prepare("SELECT attempted_calls FROM tickerbot_call_ledger WHERE utc_month='2026-10'").get().attempted_calls, 10000);
});

test("both live routes fail closed if D1 is not bound or its migration is missing", async t => {
  clearCharactersBeatCache();
  clearTickerbotCache();
  const sql = new (await import("node:sqlite")).DatabaseSync(":memory:");
  const db = { prepare(text) {
    let params = [];
    const statement = { bind(...args) { params = args; return statement; }, async first() { return sql.prepare(text).get(...params) ?? null; } };
    return statement;
  } };
  t.after(() => sql.close());
  let calls = 0;
  const dependencies = { now: () => NOW, fetch: async () => { calls += 1; return providerResponse(); } };
  const env = { TICKERBOT_API_KEY: KEY, COMMUNITY_DB: db };

  const characters = await handleCharactersBeat(
    new Request("https://os.example.test/api/characters/v1/beat?symbols=AAPL&interval=1h&cadence=15"), env, dependencies
  );
  const market = await handleGoodIntelligenceTickerbot(
    new Request("https://os.example.test/api/good-intelligence/v1/market/tickerbot/bars?symbol=MSFT&interval=1h"), env, dependencies
  );
  assert.equal(characters.status, 503);
  assert.equal(market.status, 503);
  assert.equal(calls, 0, "neither route spends the provider key without the durable cap");
});
