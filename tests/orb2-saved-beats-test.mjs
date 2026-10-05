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
    sessionId, beatId: uuid(), beatAt: now - 1000, provider: "tickerbot", discId: "stocks",
    payload: { schema: "orb2-beat-v1", observations: [{ ticker: "AAPL", mood: "steady" }], entry: { disc: "stocks", provider: "tickerbot", interval: "1h", source: "live" } }
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
  const valid = { sessionId: uuid(), beatId: uuid(), beatAt: now, provider: "tickerbot", discId: "stocks", payload: { schema: "orb2-beat-v1", observations: [], entry: { disc: "stocks", provider: "tickerbot", interval: "1d", source: "live" } } };
  const foreign = new Request(`https://site.example${ORB2_SAVED_BEATS.ROUTE}`, { method: "POST", headers: { Origin: "https://attacker.example", "Content-Type": "application/json" }, body: JSON.stringify(valid) });
  assert.equal((await handleOrb2SavedBeats(foreign, { COMMUNITY_DB: db }, { now: () => now })).status, 403);
  const invalidScope = await handleOrb2SavedBeats(request("POST", `https://site.example${ORB2_SAVED_BEATS.ROUTE}`, { ...valid, provider: "unknown" }), { COMMUNITY_DB: db }, { now: () => now });
  assert.equal(invalidScope.status, 400);
  const huge = await handleOrb2SavedBeats(request("POST", `https://site.example${ORB2_SAVED_BEATS.ROUTE}`, { ...valid, beatId: uuid(), payload: { ...valid.payload, large: "x".repeat(ORB2_SAVED_BEATS.MAX_PAYLOAD_BYTES + 1) } }), { COMMUNITY_DB: db }, { now: () => now });
  assert.equal(huge.status, 413);
});

test("new archive writes enforce the split while old Alpha 1mo rows remain readable history", async () => {
  const { db, sql } = fixture();
  const now = 1_800_000_000_000;
  const sessionId = uuid();
  const base = { sessionId, beatId: uuid(), beatAt: now, discId: "stocks" };
  const alpha = {
    ...base, provider: "alpha",
    payload: { schema: "orb2-beat-v1", observations: [], entry: { disc: "stocks", provider: "alpha-vantage", interval: "1mo", source: "live" } }
  };
  const alphaWrite = await handleOrb2SavedBeats(request("POST", `https://site.example${ORB2_SAVED_BEATS.ROUTE}`, alpha), { COMMUNITY_DB: db }, { now: () => now });
  assert.equal(alphaWrite.status, 400, "Alpha/1mo cannot be newly saved");

  const mismatched = {
    ...base, beatId: uuid(), provider: "massive",
    payload: { schema: "orb2-beat-v1", observations: [], entry: { disc: "stocks", provider: "massive", interval: "1d", source: "live" } }
  };
  const mismatchWrite = await handleOrb2SavedBeats(request("POST", `https://site.example${ORB2_SAVED_BEATS.ROUTE}`, mismatched), { COMMUNITY_DB: db }, { now: () => now });
  assert.equal(mismatchWrite.status, 400, "Massive cannot be newly saved under the Stocks Disc");
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM orb2_saved_beats").get().n, 0);

  const legacyPayload = { schema: "orb2-beat-v1", observations: [], entry: { disc: "stocks", provider: "alpha-vantage", interval: "1mo", source: "legacy" } };
  sql.prepare(`INSERT INTO orb2_saved_beats
    (session_id, beat_id, beat_at, provider, disc_id, payload, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(sessionId, uuid(), now - 1000, "alpha", "stocks", JSON.stringify(legacyPayload), now - 1000, now + ORB2_SAVED_BEATS.RETENTION_MS);
  const read = await handleOrb2SavedBeats(request("GET", `https://site.example${ORB2_SAVED_BEATS.ROUTE}?sessionId=${sessionId}`), { COMMUNITY_DB: db }, { now: () => now });
  const archive = await read.json();
  assert.equal(read.status, 200);
  assert.equal(archive.beats[0].provider, "alpha");
  assert.equal(archive.beats[0].payload.entry.interval, "1mo", "legacy data remains visible without reopening its write path");
});

test("Orb 2 archive expires old rows and keeps no more than 120 entries per browser", async () => {
  const { db, sql } = fixture();
  const now = 1_800_000_000_000;
  const sessionId = uuid();
  for (let index = 0; index < 121; index++) {
    const item = { sessionId, beatId: uuid(), beatAt: now + index, provider: "tickerbot", discId: "stocks", payload: { schema: "orb2-beat-v1", observations: [], entry: { disc: "stocks", provider: "tickerbot", interval: "1d", source: "live" } } };
    const response = await handleOrb2SavedBeats(request("POST", `https://site.example${ORB2_SAVED_BEATS.ROUTE}`, item), { COMMUNITY_DB: db }, { now: () => now });
    assert.equal(response.status, 200);
  }
  assert.equal(sql.prepare("SELECT count(*) AS n FROM orb2_saved_beats WHERE session_id=?").get(sessionId).n, 120);
  const expiring = { sessionId, beatId: uuid(), beatAt: now - ORB2_SAVED_BEATS.RETENTION_MS - 1, provider: "rehearsal", discId: "stocks", payload: { schema: "orb2-beat-v1", observations: [], entry: { disc: "stocks", provider: "synthetic", interval: "1d", source: "rehearsal" } } };
  await handleOrb2SavedBeats(request("POST", `https://site.example${ORB2_SAVED_BEATS.ROUTE}`, expiring), { COMMUNITY_DB: db }, { now: () => now });
  assert.equal(sql.prepare("SELECT count(*) AS n FROM orb2_saved_beats WHERE session_id=?").get(sessionId).n, 120);
});
