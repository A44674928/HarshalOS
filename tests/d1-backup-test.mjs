/* Node harness: the nightly D1-to-R2 backup (worker/d1-backup.mjs).
   node:sqlite stands in for D1 with every community migration applied; the R2
   bucket is an in-memory fake. Run: node --test tests/d1-backup-test.mjs */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import {
  D1_BACKUP_PAGE_ROWS,
  D1_BACKUP_TABLES,
  d1BackupDay,
  runD1BackupPage,
  runScheduledBackup
} from "../worker/d1-backup.mjs";

const NOW = Date.parse("2026-10-10T12:00:00.000Z");
const DAY = "2026-10-10";
const MIGRATIONS = [
  "0001_private_drafts.sql", "0002_auth_sessions.sql", "0003_private_runs.sql",
  "0004_publication.sql", "0005_tickerbot_call_ledger.sql", "0006_alpha_vantage_daily_call_ledger.sql",
  "0007_massive_daily_call_ledger.sql", "0008_orb2_saved_beats.sql", "0009_orb2_server_field.sql",
  "0010_characters_crypto_ranking_cache.sql", "0011_massive_futures_contract_cache.sql",
  "0012_kraken_public_crypto.sql", "0013_orb2_options_field.sql", "0014_ai_neuron_ledger.sql",
  "0015_d1_backup_progress.sql", "0019_twelvedata_daily_credit_ledger.sql"
].map(file => readFileSync(new URL(`../migrations/community/${file}`, import.meta.url), "utf8"));

function backupDb(t, seed = true) {
  const sql = new DatabaseSync(":memory:");
  t.after(() => sql.close());
  for (const migration of MIGRATIONS) sql.exec(migration);
  if (seed) {
    const insert = sql.prepare("INSERT INTO tickerbot_call_ledger (utc_month, attempted_calls, provider_budget, worker_limit, updated_at) VALUES (?, ?, ?, ?, ?)");
    for (let index = 0; index < 30; index += 1) {
      const year = 2020 + Math.floor(index / 12);
      const month = String((index % 12) + 1).padStart(2, "0");
      insert.run(`${year}-${month}`, index, 10_000, 10_000, NOW);
    }
    sql.prepare("INSERT INTO ai_neuron_ledger (utc_day, neurons, attempted_calls, provider_budget, worker_limit, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run("2026-10-10", 500, 3, 10_000, 9_000, NOW);
  }
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

function fakeBucket() {
  const objects = new Map();
  return {
    objects,
    async put(key, value) { objects.set(key, String(value)); return { key }; }
  };
}

async function drain(db, bucket, now = NOW) {
  const pages = [];
  for (let tick = 0; tick < 500; tick += 1) {
    const page = await runD1BackupPage({ db, bucket, now });
    assert.equal(page.ok, true, `page ${tick} failed: ${page.reason || page.error}`);
    pages.push(page);
    if (page.done) break;
  }
  return pages;
}

test("the backup covers every durable table exactly once, manifest last", () => {
  assert.ok(D1_BACKUP_TABLES.length > 20);
  assert.equal(D1_BACKUP_TABLES.at(-1), "_manifest");
  assert.equal(new Set(D1_BACKUP_TABLES).size, D1_BACKUP_TABLES.length);
  for (const excluded of ["community_auth_flows", "community_sessions", "community_auth_rates", "d1_backup_progress"]) {
    assert.ok(!D1_BACKUP_TABLES.includes(excluded), `${excluded} stays out of backups`);
  }
  assert.equal(d1BackupDay(NOW), DAY);
});

test("missing bucket, database, or migration no-ops with a reason", async t => {
  const { db } = backupDb(t);
  assert.deepEqual(
    await runD1BackupPage({ db, now: NOW }),
    { ok: false, ran: false, reason: "no-bucket" }
  );
  assert.deepEqual(
    await runD1BackupPage({ bucket: fakeBucket(), now: NOW }),
    { ok: false, ran: false, reason: "no-database" }
  );
  const sql = new DatabaseSync(":memory:");
  t.after(() => sql.close());
  const empty = { prepare: () => { throw new Error("no such table"); } };
  assert.equal((await runD1BackupPage({ db: empty, bucket: fakeBucket(), now: NOW })).reason, "backup-migration-required");
});

test("one page per call: small tables first, paging, resume, then manifest", async t => {
  const { db } = backupDb(t);
  const bucket = fakeBucket();

  const schemaRows = Number((await db.prepare("SELECT COUNT(*) AS count FROM community_schema").first()).count);
  const first = await runD1BackupPage({ db, bucket, now: NOW });
  assert.equal(first.table, "community_schema");
  assert.equal(first.rows, schemaRows);

  const pages = await drain(db, bucket);
  const parts = [...bucket.objects.keys()].filter(key => key.includes("/part-"));
  // 25 tables; the 30-row ledger spans two pages; everything else fits one page.
  assert.equal(parts.length, 25 + 1);
  assert.ok(parts.some(key => key === `d1-backup/${DAY}/tickerbot_call_ledger/part-000000.json`));
  assert.ok(parts.some(key => key === `d1-backup/${DAY}/tickerbot_call_ledger/part-000025.json`));
  const secondPage = JSON.parse(bucket.objects.get(`d1-backup/${DAY}/tickerbot_call_ledger/part-000025.json`));
  assert.equal(secondPage.rows.length, 5);
  assert.equal(secondPage.complete, true);

  const manifest = JSON.parse(bucket.objects.get(`d1-backup/${DAY}/manifest.json`));
  assert.equal(manifest.schema, "hos-d1-backup-manifest-v1");
  assert.equal(manifest.tables.length, 25);
  assert.equal(manifest.tables.find(row => row.table === "tickerbot_call_ledger").rows, 30);
  assert.equal(manifest.rows, 31 + schemaRows);
  assert.ok(pages.at(-1).done);

  const idle = await runD1BackupPage({ db, bucket, now: NOW + 60_000 });
  assert.deepEqual(idle, { ok: true, ran: false, done: true, day: DAY });
});

test("a new UTC day starts a fresh pass with its own prefix", async t => {
  const { db } = backupDb(t);
  const bucket = fakeBucket();
  await drain(db, bucket);
  const next = await runD1BackupPage({ db, bucket, now: NOW + 24 * 3600_000 });
  assert.equal(next.day, "2026-10-11");
  assert.equal(next.table, "community_schema");
  assert.ok(bucket.objects.has("d1-backup/2026-10-11/community_schema/part-000000.json"));
});

test("the scheduled wrapper never throws; page faults report as backup-error", async t => {
  const { db } = backupDb(t);
  const failing = { put: async () => { throw new Error("R2 is down"); } };
  const fault = await runScheduledBackup({ COMMUNITY_DB: db, STORAGE_BUCKET: failing }, NOW);
  assert.equal(fault.ok, false);
  assert.equal(fault.reason, "backup-error");
  assert.match(fault.error, /R2 is down/);
  const quiet = await runScheduledBackup({}, NOW);
  assert.equal(quiet.ran, false);
  assert.ok(D1_BACKUP_PAGE_ROWS <= 25, "pages stay small enough for a Free-plan tick");
});
