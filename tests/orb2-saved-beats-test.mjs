import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { handleOrb2SavedBeats, ORB2_SAVED_BEATS } from "../worker/orb2-saved-beats.mjs";

const migration = readFileSync(new URL("../migrations/community/0008_orb2_saved_beats.sql", import.meta.url), "utf8");
function fixture() {
  const sql = new DatabaseSync(":memory:");
  sql.exec(migration);
  const db = {
    prepare(text) {
      let values = [];
      const statement = {
        bind(...args) { values = args; return statement; },
        async run() { return sql.prepare(text).run(...values); },
        async all() { return { results: sql.prepare(text).all(...values) }; }
      };
      return statement;
    },
    async batch(statements) { return Promise.all(statements.map(statement => statement.run())); }
  };
  return { sql, db };
}
const uuid = () => crypto.randomUUID();
const request = (method, url, body) => new Request(url, {
  method,
  headers: { Origin: new URL(url).origin, ...(body ? { "Content-Type": "application/json" } : {}) },
  ...(body ? { body: JSON.stringify(body) } : {})
});

test("Orb 2 beat archive validates same-origin opaque sessions and stores compact observations", async () => {
  const { db, sql } = fixture();
  const now = 1_800_000_000_000;
  const sessionId = uuid();
  const record = {
    sessionId, beatId: uuid(), beatAt: now - 1000, provider: "massive", discId: "stocks",
    payload: { schema: "orb2-beat-v1", observations: [{ ticker: "AAPL", mood: "steady" }] }
  };
  const response = await handleOrb2SavedBeats(request("POST", `https://site.example${ORB2_SAVED_BEATS.ROUTE}`, record), { COMMUNITY_DB: db }, { now: () => now });
  assert.equal(response.status, 200);
  const saved = await response.json();
  assert.equal(saved.success, true);
  assert.equal(sql.prepare("SELECT count(*) AS n FROM orb2_saved_beats WHERE session_id=?").get(sessionId).n, 1);
  const read = await handleOrb2SavedBeats(request("GET", `https://site.example${ORB2_SAVED_BEATS.ROUTE}?sessionId=${sessionId}`), { COMMUNITY_DB: db }, { now: () => now });
  assert.deepEqual((await read.json()).beats[0].payload, record.payload);
});

test("Orb 2 archive rejects foreign origins, invalid scopes, and oversized snapshots", async () => {
  const { db } = fixture();
  const now = 1_800_000_000_000;
  const valid = { sessionId: uuid(), beatId: uuid(), beatAt: now, provider: "massive", discId: "stocks", payload: { schema: "orb2-beat-v1", observations: [] } };
  const foreign = new Request(`https://site.example${ORB2_SAVED_BEATS.ROUTE}`, { method: "POST", headers: { Origin: "https://attacker.example", "Content-Type": "application/json" }, body: JSON.stringify(valid) });
  assert.equal((await handleOrb2SavedBeats(foreign, { COMMUNITY_DB: db }, { now: () => now })).status, 403);
  const invalidScope = await handleOrb2SavedBeats(request("POST", `https://site.example${ORB2_SAVED_BEATS.ROUTE}`, { ...valid, provider: "unknown" }), { COMMUNITY_DB: db }, { now: () => now });
  assert.equal(invalidScope.status, 400);
  const huge = await handleOrb2SavedBeats(request("POST", `https://site.example${ORB2_SAVED_BEATS.ROUTE}`, { ...valid, beatId: uuid(), payload: { schema: "orb2-beat-v1", observations: [], large: "x".repeat(ORB2_SAVED_BEATS.MAX_PAYLOAD_BYTES + 1) } }), { COMMUNITY_DB: db }, { now: () => now });
  assert.equal(huge.status, 413);
});

test("Orb 2 archive expires old rows and keeps no more than 120 entries per browser", async () => {
  const { db, sql } = fixture();
  const now = 1_800_000_000_000;
  const sessionId = uuid();
  for (let index = 0; index < 121; index++) {
    const item = { sessionId, beatId: uuid(), beatAt: now + index, provider: "tickerbot", discId: "stocks", payload: { schema: "orb2-beat-v1", observations: [] } };
    const response = await handleOrb2SavedBeats(request("POST", `https://site.example${ORB2_SAVED_BEATS.ROUTE}`, item), { COMMUNITY_DB: db }, { now: () => now });
    assert.equal(response.status, 200);
  }
  assert.equal(sql.prepare("SELECT count(*) AS n FROM orb2_saved_beats WHERE session_id=?").get(sessionId).n, 120);
  const expiring = { sessionId, beatId: uuid(), beatAt: now - ORB2_SAVED_BEATS.RETENTION_MS - 1, provider: "rehearsal", discId: "stocks", payload: { schema: "orb2-beat-v1", observations: [] } };
  await handleOrb2SavedBeats(request("POST", `https://site.example${ORB2_SAVED_BEATS.ROUTE}`, expiring), { COMMUNITY_DB: db }, { now: () => now });
  assert.equal(sql.prepare("SELECT count(*) AS n FROM orb2_saved_beats WHERE session_id=?").get(sessionId).n, 120);
});
