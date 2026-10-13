/* Orb 2 beat runner: the D1-over-HTTP transport and the runner's fail-closed rules.

   The runner is how the provider beats leave Workers Free's 10 ms Cron Trigger.
   Two things have to hold for that to be safe, and both are asserted here:

     · the transport is the same `db` shape the Worker modules already use, so the
       scheduler and the publisher are not re-implemented off-Cloudflare, and the
       document they publish is the same document the Cron Trigger publishes;
     · the runner never writes to a database its secrets do not name. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertD1DatabaseName,
  createD1HttpClient,
  describeD1Database,
  D1_API_BASE
} from "../scripts/orb2-d1-client.mjs";
import { publishOrb2FieldDocument, readOrb2FieldSnapshotRow } from "../worker/orb2-field-publish.mjs";
import { clearOrb2FieldSchemaCache, sanitizeOrb2FieldObservation } from "../worker/orb2-field.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const RUNNER = "scripts/orb2-beat-runner.mjs";
const NOW = Date.parse("2026-10-05T12:00:00.000Z");
const MIGRATIONS = [
  "0005_tickerbot_call_ledger.sql",
  "0006_alpha_vantage_daily_call_ledger.sql",
  "0007_massive_daily_call_ledger.sql",
  "0009_orb2_server_field.sql",
  "0010_characters_crypto_ranking_cache.sql",
  "0011_massive_futures_contract_cache.sql",
  "0012_kraken_public_crypto.sql",
  "0018_orb2_field_snapshot.sql"
].map(file => readFileSync(new URL(`../migrations/community/${file}`, import.meta.url), "utf8"));

const SECRET_NAMES = ["ORB2_D1_DATABASE_ID", "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN",
  "ORB2_D1_DATABASE_NAME", "MASSIVE_API_KEY", "TWELVEDATA_API_KEY", "TICKERBOT_API_KEY", "ALPHA_VANTAGE_API_KEY"];

/** A `fetch` that answers the D1 REST envelope from an in-memory database, so the
 * HTTP path is exercised without a network or a Cloudflare account. */
function d1RestFetch(sql) {
  const requests = [];
  const fetchImpl = async (url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : null;
    requests.push({ url: String(url), body, headers: init.headers || {} });
    if (init.method === undefined) {
      /* The database lookup: the only GET this transport makes. */
      return new Response(JSON.stringify({
        success: true, errors: [], messages: [], result: { uuid: "named-db", name: "community_db" }
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    const run = query => {
      const reads = /^\s*(?:SELECT|WITH|PRAGMA|EXPLAIN)\b/i.test(String(query.sql));
      try {
        if (reads) {
          const results = sql.prepare(query.sql).all(...(query.params || []));
          return { results, success: true, meta: { changes: 0, rows_read: results.length, rows_written: 0 } };
        }
        const outcome = sql.prepare(query.sql).run(...(query.params || []));
        return { results: [], success: true, meta: { changes: Number(outcome.changes) || 0, rows_written: Number(outcome.changes) || 0 } };
      } catch (error) {
        return { results: null, success: false, error: String(error.message) };
      }
    };
    const queries = Array.isArray(body) ? body : [body];
    const results = queries.map(run);
    const failed = results.find(result => result.success !== true);
    return new Response(JSON.stringify({
      success: !failed, errors: failed ? [{ message: failed.error }] : [], messages: [],
      result: results.map(result => ({
        results: result.results || [], success: result.success === true, meta: result.meta || {}
      }))
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  return { fetchImpl, requests };
}

function seedField(sql) {
  const observation = sanitizeOrb2FieldObservation({
    schema: "gi-orb2-field-observation-v1", symbol: "EURUSD", displaySymbol: "EURUSD", name: "EURUSD",
    sector: "Futures", discId: "fx", provider: "massive", interval: "1d", status: "bars", reason: "server-sweep",
    code: "", message: "", beatId: "00000000-0000-4000-8000-000000000099",
    observedAt: NOW, barTime: NOW, confirmed: true,
    market: {
      status: "ready", source: "Massive test close", timeframe: "1d", dataShape: "ohlcv", synthetic: false,
      barCount: 40, volumeAvailable: true,
      latestBar: { time: NOW, open: 100, high: 102, low: 99, close: 101, volume: 1000, confirmed: true },
      activityBar: { time: NOW - 86_400_000, open: 99, high: 101, low: 98, close: 100, volume: 900, confirmed: true },
      previousClose: 100, changePct: 1, basis: 100, bands: { lower1000: 90, upper1000: 110 },
      vfi: { value: 1, signal: 0, available: true }, waveTrend: { wt1: 2, wt2: 1, zone: "neutral" }
    }
  }, NOW);
  assert.equal(observation.ok, true, "the fixture should pass the production sanitizer");
  sql.prepare(`INSERT INTO orb2_field_observations
    (interval, symbol, disc_id, provider, status, reason, beat_id, payload, observed_at, bar_time, confirmed, updated_at)
    VALUES ('1d', 'EURUSD', 'fx', 'massive', 'bars', 'server-sweep', ?, ?, ?, ?, 1, ?)`)
    .run(observation.observation.beatId, JSON.stringify(observation.observation), NOW, NOW, NOW);
}

test("the runner is inert, and writes nothing, until its secrets name a database", () => {
  const env = { ...process.env, PATH: process.env.PATH };
  for (const name of SECRET_NAMES) delete env[name];
  const run = spawnSync(process.execPath, [RUNNER], { cwd: ROOT, encoding: "utf8", env, timeout: 60_000 });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /is inert/);
  assert.match(run.stdout, /Nothing was read or written/);
  assert.equal(run.stderr, "", "an unconfigured run is not an error");
});

test("the runner refuses a database its secrets do not name", async () => {
  const { fetchImpl } = d1RestFetch(new DatabaseSync(":memory:"));
  const named = await assertD1DatabaseName({
    accountId: "account", databaseId: "named-db", apiToken: "token",
    expectedName: "community_db", fetchImpl
  });
  assert.equal(named.name, "community_db");
  /* An unset name is still an explicit choice: the id the secrets gave. */
  assert.equal(await assertD1DatabaseName({
    accountId: "account", databaseId: "named-db", apiToken: "token", expectedName: "", fetchImpl
  }), null);
  await assert.rejects(assertD1DatabaseName({
    accountId: "account", databaseId: "named-db", apiToken: "token",
    expectedName: "community_db_staging", fetchImpl
  }), /Refusing to write: named-db is named "community_db", not "community_db_staging"/);
  assert.equal(await describeD1Database({ accountId: "account", databaseId: "named-db", apiToken: "token", fetchImpl })
    .then(result => result.uuid), "named-db");
});

test("the D1 HTTP client is the `db` shape the Worker modules use", async () => {
  const sql = new DatabaseSync(":memory:");
  sql.exec("CREATE TABLE probe (id INTEGER PRIMARY KEY, label TEXT NOT NULL)");
  const { fetchImpl, requests } = d1RestFetch(sql);
  const db = createD1HttpClient({ accountId: "account", databaseId: "named-db", apiToken: "token", fetchImpl });

  const created = await db.prepare("INSERT INTO probe (label) VALUES (?)").bind("one").run();
  assert.equal(created.changes, 1);
  assert.equal(await db.prepare("SELECT label FROM probe WHERE id = ?").bind(1).first().then(row => row.label), "one");
  assert.deepEqual(await db.prepare("SELECT label FROM probe").all().then(result => result.results), [{ label: "one" }]);
  /* No `raw()`: the publisher's documented object-row fallback is the one path. */
  assert.equal(typeof db.prepare("SELECT 1").raw, "undefined");

  const batched = await db.batch([
    db.prepare("INSERT INTO probe (label) VALUES (?)").bind("two"),
    db.prepare("SELECT label FROM probe ORDER BY id").bind()
  ]);
  assert.deepEqual(batched[0].changes, 1);
  assert.deepEqual(batched[1].results, [{ label: "one" }, { label: "two" }],
    "a batch keeps its statement order and returns row results");
  const batchRequest = requests.find(entry => Array.isArray(entry.body));
  assert.ok(batchRequest, "the batch is one HTTP request");
  assert.equal(batchRequest.url, `${D1_API_BASE}/accounts/account/d1/database/named-db/query`);
  assert.equal(batchRequest.headers.Authorization, "Bearer token");

  /* A transport that refuses the batch form still answers, statement by statement. */
  const sequential = createD1HttpClient({
    accountId: "account", databaseId: "named-db", apiToken: "token",
    fetchImpl: async (url, init = {}) => {
      if (Array.isArray(init.body ? JSON.parse(init.body) : null)) {
        return new Response(JSON.stringify({ success: false, errors: [{ message: "batch unsupported" }] }), { status: 400 });
      }
      return fetchImpl(url, init);
    }
  });
  const rows = await sequential.batch([sequential.prepare("SELECT label FROM probe ORDER BY id").bind()]);
  assert.deepEqual(rows[0].results, [{ label: "one" }, { label: "two" }]);
});

test("the runner's transport publishes the same document the Worker publishes", async () => {
  clearOrb2FieldSchemaCache();
  const sql = new DatabaseSync(":memory:");
  for (const migration of MIGRATIONS) sql.exec(migration);
  seedField(sql);
  const { fetchImpl, requests } = d1RestFetch(sql);
  const db = createD1HttpClient({ accountId: "account", databaseId: "named-db", apiToken: "token", fetchImpl });
  const env = { COMMUNITY_DB: db };

  const summary = await publishOrb2FieldDocument(env, { now: NOW, source: "github-actions" });
  assert.equal(summary.ok, true, summary.errors.join(" | "));
  const row = await readOrb2FieldSnapshotRow(db, "1d");
  assert.ok(row && row.body.length > 0, "the document should be stored through the HTTP transport");
  assert.equal(row.source, "github-actions", "the served document says which publisher built it");
  const body = JSON.parse(row.body);
  assert.equal(body.data.observations.length, 1);
  assert.equal(body.data.observations[0].market.latestBar.close, 101);
  assert.ok(requests.some(entry => Array.isArray(entry.body)), "the build batches its reads");
  assert.ok(requests.every(entry => entry.url.startsWith(`${D1_API_BASE}/accounts/account/d1/database/named-db/`)),
    "every request names the database the secrets named");
});
