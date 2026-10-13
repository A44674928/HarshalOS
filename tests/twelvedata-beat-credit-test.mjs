/* The Twelve Data field beat spends the day's credits before it sends a request.

   The claim sits between the per-minute guard and the provider call. Three things are
   asserted: a call that fails is still charged (so a 429 or timeout cannot be retried
   past the allowance), a spent day sends no request at all, and a call with credits
   left is charged exactly once. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { twelvedataBeatInternals } from "../worker/orb2-field.mjs";
import { readTwelveDataDailyCredits, TWELVEDATA_DAILY_CREDIT_LIMIT } from "../worker/twelvedata-daily-credit-ledger.mjs";

const MIGRATION = readFileSync(new URL("../migrations/community/0019_twelvedata_daily_credit_ledger.sql", import.meta.url), "utf8");
const NOW = Date.parse("2026-10-13T15:00:00.000Z");

function database() {
  const sql = new DatabaseSync(":memory:");
  sql.exec(MIGRATION);
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

const instrument = { symbol: "EURUSD", assetClass: "fx", discId: "fx" };
const keys = { twelvedata: "test-key" };

function failingFetch(calls) {
  return async (...args) => {
    calls.push(args);
    return new Response("upstream trouble", { status: 500 });
  };
}

test("a call that fails is still charged one credit", async () => {
  const { db } = database();
  const calls = [];
  const result = await twelvedataBeatInternals.beatTwelveData({
    env: { COMMUNITY_DB: db }, instrument, now: NOW, fetcher: failingFetch(calls), keys, dependencies: {}
  });
  assert.equal(result.ok, false);
  assert.equal(result.attempted, true, "the provider was reached");
  assert.equal(calls.length, 1, "exactly one request was sent");
  assert.equal((await readTwelveDataDailyCredits(db, NOW)).ledger.credits, 1);
});

test("a spent day sends no request", async () => {
  const { db, sql } = database();
  sql.prepare("INSERT INTO twelvedata_daily_credit_ledger (utc_day, credits, daily_limit, updated_at) VALUES (?, ?, ?, ?)")
    .run("2026-10-13", TWELVEDATA_DAILY_CREDIT_LIMIT, TWELVEDATA_DAILY_CREDIT_LIMIT, NOW);
  const calls = [];
  const result = await twelvedataBeatInternals.beatTwelveData({
    env: { COMMUNITY_DB: db }, instrument, now: NOW, fetcher: failingFetch(calls), keys, dependencies: {}
  });
  assert.equal(result.ok, false);
  assert.equal(result.attempted, false, "the refusal is not a provider attempt");
  assert.equal(result.code, "twelvedata-daily-limit");
  assert.equal(calls.length, 0, "no request may leave the Worker once the day is spent");
  assert.equal((await readTwelveDataDailyCredits(db, NOW)).ledger.credits, TWELVEDATA_DAILY_CREDIT_LIMIT);
});

test("a missing ledger table sends no request either", async () => {
  const sql = new DatabaseSync(":memory:");
  const db = { prepare: text => ({ bind: () => ({ first: async () => { sql.prepare(text); }, run: async () => {} }), first: async () => null }) };
  const calls = [];
  const result = await twelvedataBeatInternals.beatTwelveData({
    env: { COMMUNITY_DB: db }, instrument, now: NOW, fetcher: failingFetch(calls), keys, dependencies: {}
  });
  assert.equal(result.attempted, false);
  assert.equal(result.code, "twelvedata-ledger-unavailable");
  assert.equal(calls.length, 0);
});
