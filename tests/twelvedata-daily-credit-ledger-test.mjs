/* Twelve Data daily credit ledger: the durable 800-credit day in D1.

   The ledger runs the real migration and the real claim SQL on node:sqlite. The
   load-bearing assertions: the 800th credit is the last one granted, a refused claim
   charges nothing, the next UTC day starts empty, and a missing table fails closed. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  TWELVEDATA_DAILY_CREDIT_LIMIT,
  claimTwelveDataDailyCredits,
  readTwelveDataDailyCredits,
  twelvedataUtcDay
} from "../worker/twelvedata-daily-credit-ledger.mjs";

const MIGRATION = readFileSync(new URL("../migrations/community/0019_twelvedata_daily_credit_ledger.sql", import.meta.url), "utf8");
const DAY_ONE = Date.parse("2026-10-13T12:00:00.000Z");

function database({ migrated = true } = {}) {
  const sql = new DatabaseSync(":memory:");
  if (migrated) sql.exec(MIGRATION);
  const db = {
    prepare(text) {
      let parameters = [];
      const statement = {
        bind(...args) { parameters = args; return statement; },
        async first() { return sql.prepare(text).get(...parameters) ?? null; },
        async run() { return sql.prepare(text).run(...parameters); },
        async all() { return { results: sql.prepare(text).all(...parameters) }; }
      };
      return statement;
    }
  };
  return { db, sql };
}

test("the allowance is 800 credits a day and the 800th is the last one granted", async () => {
  assert.equal(TWELVEDATA_DAILY_CREDIT_LIMIT, 800);
  const { db } = database();
  for (let call = 1; call <= 800; call += 1) {
    const claim = await claimTwelveDataDailyCredits(db, DAY_ONE + call);
    assert.equal(claim.ok, true, `credit ${call} should be granted`);
    assert.equal(claim.ledger.credits, call);
  }
  const refused = await claimTwelveDataDailyCredits(db, DAY_ONE + 900);
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, "twelvedata-daily-limit");
  assert.equal(refused.ledger.credits, 800, "a refused claim must not charge a credit");
  const snapshot = await readTwelveDataDailyCredits(db, DAY_ONE + 901);
  assert.equal(snapshot.ledger.credits, 800);
  assert.equal(snapshot.ledger.exhausted, true);
  assert.equal(snapshot.ledger.remaining, 0);
});

test("a multi-credit claim cannot overshoot the day, and the day rolls over at UTC midnight", async () => {
  const { db } = database();
  assert.equal((await claimTwelveDataDailyCredits(db, DAY_ONE, { credits: 799, dailyLimit: 800 })).ok, true);
  const overshoot = await claimTwelveDataDailyCredits(db, DAY_ONE, { credits: 2, dailyLimit: 800 });
  assert.equal(overshoot.ok, false, "799 + 2 must not fit an 800 allowance");
  assert.equal((await readTwelveDataDailyCredits(db, DAY_ONE)).ledger.credits, 799);

  const nextDay = Date.parse("2026-10-14T00:00:01.000Z");
  assert.equal(twelvedataUtcDay(nextDay), "2026-10-14");
  const fresh = await claimTwelveDataDailyCredits(db, nextDay);
  assert.equal(fresh.ok, true);
  assert.equal(fresh.ledger.credits, 1, "a new UTC day starts from zero");
  assert.equal((await readTwelveDataDailyCredits(db, DAY_ONE)).ledger.credits, 799, "the old day keeps its count");
});

test("a missing ledger table fails closed: no credit, no provider call", async () => {
  const { db } = database({ migrated: false });
  const claim = await claimTwelveDataDailyCredits(db, DAY_ONE);
  assert.equal(claim.ok, false);
  assert.equal(claim.reason, "twelvedata-ledger-unavailable");
  assert.match(claim.message, /migration 0019/);
  assert.equal((await readTwelveDataDailyCredits(db, DAY_ONE)).ok, false);
});

test("a missing binding fails closed too", async () => {
  assert.equal((await claimTwelveDataDailyCredits(null, DAY_ONE)).ok, false);
});
