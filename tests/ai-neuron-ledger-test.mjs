/* Node harness: the durable Workers AI Neuron allowance (worker/ai-neuron-ledger.mjs).
   node:sqlite stands in for D1; each test gets an in-memory database with
   migration 0014 applied. Run: node --test tests/ai-neuron-ledger-test.mjs */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import {
  AI_PROVIDER_DAILY_BUDGET,
  AI_WORKER_DAILY_LIMIT,
  aiUtcDay,
  claimAiNeurons,
  readAiNeuronLedger,
  secondsUntilUtcMidnight
} from "../worker/ai-neuron-ledger.mjs";

const MIGRATION = readFileSync(new URL("../migrations/community/0014_ai_neuron_ledger.sql", import.meta.url), "utf8");
const NOW = Date.parse("2026-10-10T12:00:00.000Z");

function ledgerDb(t, migrations = [MIGRATION]) {
  const sql = new DatabaseSync(":memory:");
  t.after(() => sql.close());
  for (const migration of migrations) sql.exec(migration);
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

test("budget constants leave headroom under the provider allocation", () => {
  assert.equal(AI_PROVIDER_DAILY_BUDGET, 10_000);
  assert.equal(AI_WORKER_DAILY_LIMIT, 9_000);
});

test("day keying and midnight countdown are UTC", () => {
  assert.equal(aiUtcDay(NOW), "2026-10-10");
  assert.equal(secondsUntilUtcMidnight(NOW), 12 * 3600);
  assert.equal(secondsUntilUtcMidnight(Date.parse("2026-10-10T23:59:30.000Z")), 30);
});

test("an unread day reads as a zero-use snapshot", async t => {
  const { db } = ledgerDb(t);
  const read = await readAiNeuronLedger(db, NOW);
  assert.equal(read.ok, true);
  assert.equal(read.ledger.day, "2026-10-10");
  assert.equal(read.ledger.neurons, 0);
  assert.equal(read.ledger.calls, 0);
  assert.equal(read.ledger.remaining, AI_WORKER_DAILY_LIMIT);
  assert.equal(read.ledger.exhausted, false);
});

test("claims aggregate neurons and calls on one day row", async t => {
  const { db } = ledgerDb(t);
  const first = await claimAiNeurons(db, 400, NOW);
  assert.equal(first.ok, true);
  assert.equal(first.ledger.neurons, 400);
  assert.equal(first.ledger.calls, 1);
  const second = await claimAiNeurons(db, 250, NOW + 60_000);
  assert.equal(second.ok, true);
  assert.equal(second.ledger.neurons, 650);
  assert.equal(second.ledger.calls, 2);
  assert.equal(second.ledger.remaining, AI_WORKER_DAILY_LIMIT - 650);
});

test("a claim past the limit is refused without changing the row", async t => {
  const { db } = ledgerDb(t);
  const seed = await claimAiNeurons(db, AI_WORKER_DAILY_LIMIT, NOW);
  assert.equal(seed.ok, true);
  const refused = await claimAiNeurons(db, 36, NOW + 1000);
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, "budget-exhausted");
  assert.match(refused.message, /resets at 00:00 UTC/);
  assert.ok(Number.isSafeInteger(refused.retryAfterSeconds) && refused.retryAfterSeconds > 0);
  const read = await readAiNeuronLedger(db, NOW);
  assert.equal(read.ledger.neurons, AI_WORKER_DAILY_LIMIT);
  assert.equal(read.ledger.calls, 1);
  assert.equal(read.ledger.exhausted, true);
});

test("a new UTC day starts a fresh allowance", async t => {
  const { db } = ledgerDb(t);
  await claimAiNeurons(db, AI_WORKER_DAILY_LIMIT, NOW);
  const next = await claimAiNeurons(db, 100, NOW + 24 * 3600_000);
  assert.equal(next.ok, true);
  assert.equal(next.ledger.day, "2026-10-11");
  assert.equal(next.ledger.neurons, 100);
});

test("invalid estimates and missing tables fail closed without spending", async t => {
  const { db } = ledgerDb(t);
  for (const estimate of [0, -5, NaN, 1.5e18, "many"]) {
    const refused = await claimAiNeurons(db, estimate, NOW);
    assert.equal(refused.ok, false, `${String(estimate)} must not claim`);
    assert.equal(refused.reason, "ledger-unavailable");
  }
  const missing = await claimAiNeurons(null, 100, NOW);
  assert.equal(missing.reason, "ledger-unavailable");
  const { db: empty } = ledgerDb(t, []);
  const unmigrated = await claimAiNeurons(empty, 100, NOW);
  assert.equal(unmigrated.ok, false);
  assert.equal(unmigrated.reason, "ledger-unavailable");
  assert.match(unmigrated.message, /D1 migration/);
});
