/* Orb 2 saved-beat D1 handler and Worker dispatch integration tests. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import worker from "../worker/index.mjs";
import {
  ORB2_BEATS_ROUTE,
  ORB2_BEAT_HISTORY_LIMIT,
  ORB2_BEAT_HISTORY_SCHEMA,
  handleGoodIntelligenceOrb2Beats,
  sanitizeOrb2Beat
} from "../worker/good-intelligence-orb2-beats.mjs";

const ORIGIN = "https://os.example";
const SESSION = "11111111-1111-4111-8111-111111111111";
const OTHER_SESSION = "22222222-2222-4222-8222-222222222222";
const NOW = Date.parse("2026-10-04T12:00:00.000Z");
const MIGRATION = readFileSync(new URL("../migrations/community/0008_orb2_saved_beats.sql", import.meta.url), "utf8");

function id(number) {
  return `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
}

function beat(number, overrides = {}) {
  const at = NOW + number * 1000;
  const provider = overrides.provider || "massive";
  const instrumentProvider = provider === "alpha" ? "alpha-vantage"
    : provider === "rehearsal" ? "synthetic" : provider;
  const symbol = overrides.symbol || "AAPL";
  return {
    schema: "gi-orb2-beat-v1",
    beatId: id(number + 1),
    at,
    reason: "manual",
    discId: "stocks",
    provider,
    interval: provider === "alpha" ? "1mo" : provider === "tickerbot" ? "1d" : "1d",
    cadenceMinutes: provider === "massive" ? 1 : provider === "alpha" ? 60 : 15,
    calls: 1,
    cacheHits: 0,
    instruments: [{
      symbol,
      displaySymbol: symbol,
      status: provider === "rehearsal" ? "rehearsal" : "bars",
      provider: instrumentProvider,
      code: "",
      message: "",
      lane: "sweep",
      market: {
        status: "ready",
        source: "fixture provider OHLCV",
        timeframe: provider === "alpha" ? "1mo" : "1d",
        dataShape: "ohlcv",
        synthetic: provider === "rehearsal",
        barCount: 80,
        volumeAvailable: true,
        latestBar: {
          time: at - 1000,
          open: 99,
          high: 102,
          low: 98,
          close: 101,
          volume: 1200,
          confirmed: true
        },
        previousClose: 100,
        changePct: 1,
        basis: 100,
        vfi: { value: 0.4, signal: 0.2, available: true },
        waveTrend: { wt1: 42, wt2: 38, zone: "rising" }
      },
      motion: {
        schema: "characters-market-motion-v1",
        symbol,
        status: "ready",
        synthetic: provider === "rehearsal",
        source: "fixture provider OHLCV",
        volumeAvailable: true,
        barCount: 80,
        mood: "rally",
        frozen: false,
        marks: ["above basis"],
        gauge: {
          bias: 0.4, flow: 0.7, heat: 0.5, charge: 0.6, crowd: 0.3,
          volumeAvailable: true, crowdAvailable: true, flowAvailable: true, known: true
        },
        npc: { speed: 0.5, stride: 0.4, jitter: 0.2, bearing: 0.3, formation: "ring", destBias: 0.1 },
        object: { sway: 0.2, pulse: 0.5, aperture: 0.6, tilt: 0.1 },
        item: { rate: 0.7, bob: 0.2, spin: 0.4, lane: "inbound" },
        caption: `${symbol}: rally · flow up · fixture only`
      }
    }],
    ...overrides
  };
}

function historyDb(t, { migrated = true } = {}) {
  const sql = new DatabaseSync(":memory:");
  t.after(() => sql.close());
  if (migrated) sql.exec(MIGRATION);
  const db = {
    prepare(query) {
      let values = [];
      const statement = {
        bind(...args) { values = args; return statement; },
        async first() { return sql.prepare(query).get(...values) ?? null; },
        async all() { return { results: sql.prepare(query).all(...values) }; },
        async run() { return sql.prepare(query).run(...values); }
      };
      return statement;
    }
  };
  return { sql, db, env: { COMMUNITY_DB: db } };
}

function postRequest(value, {
  sessionId = SESSION,
  requestOrigin = ORIGIN,
  headerOrigin = requestOrigin,
  contentType = "application/json"
} = {}) {
  return new Request(`${ORIGIN}${ORB2_BEATS_ROUTE}?sessionId=${encodeURIComponent(sessionId)}`, {
    method: "POST",
    headers: { Origin: headerOrigin, "Content-Type": contentType, Accept: "application/json" },
    body: typeof value === "string" ? value : JSON.stringify(value)
  });
}

function getRequest(sessionId = SESSION) {
  return new Request(`${ORIGIN}${ORB2_BEATS_ROUTE}?sessionId=${encodeURIComponent(sessionId)}`, {
    headers: { Accept: "application/json" }
  });
}

test("Orb 2 migration creates only bounded anonymous per-session beat history", t => {
  const { sql } = historyDb(t);
  const table = sql.prepare("SELECT sql FROM sqlite_schema WHERE type='table' AND name='orb2_saved_beats'").get();
  assert.ok(table);
  assert.match(table.sql, /PRIMARY KEY \(session_id, beat_id\)/i);
  assert.match(table.sql, /length\(payload\) <= 40960/i);
  assert.match(table.sql, /expires_at > created_at/i);
  const indexes = sql.prepare("SELECT name FROM sqlite_schema WHERE type='index' AND tbl_name='orb2_saved_beats'").all().map(row => row.name);
  assert.ok(indexes.includes("orb2_saved_beats_by_session_time"));
  assert.ok(indexes.includes("orb2_saved_beats_by_expiry"));
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM orb2_saved_beats").get().count, 0,
    "the migration does not create synthetic beat records");
  assert.equal(ORB2_BEAT_HISTORY_LIMIT, 120);
});

test("Orb 2 sanitizer accepts the shared Characters snapshot and refuses unsupported provider paths", () => {
  const candidate = beat(0);
  const clean = sanitizeOrb2Beat(candidate, NOW + 300_000);
  assert.equal(clean.ok, true);
  assert.equal(clean.beat.schema, "gi-orb2-beat-v1");
  assert.equal(clean.beat.instruments[0].market.latestBar.close, 101);
  assert.equal(clean.beat.instruments[0].motion.npc.formation, "ring");
  const fxCandidate = beat(1, {
    reason: "ignition", discId: "fx",
    instruments: [{ ...candidate.instruments[0], symbol: "EURUSD", displaySymbol: "EUR/USD" }]
  });
  const cleanIgnition = sanitizeOrb2Beat(fxCandidate, NOW + 300_000);
  assert.equal(cleanIgnition.ok, true);
  assert.equal(cleanIgnition.beat.reason, "ignition");
  assert.equal(cleanIgnition.beat.discId, "fx");

  assert.equal(sanitizeOrb2Beat({ ...candidate, interval: "1h" }, NOW + 300_000).ok, false,
    "Massive cannot be stored under a non-daily interval");
  assert.equal(sanitizeOrb2Beat({ ...candidate, provider: "tickerbot", discId: "fx" }, NOW + 300_000).ok, false,
    "Tickerbot history remains Disc1-only");
  assert.equal(sanitizeOrb2Beat({ ...candidate, provider: "alpha", interval: "1mo" }, NOW + 300_000).ok, false,
    "Alpha Vantage must use the separate monthly Disc1 path and matching instrument provider");
  const mismatched = beat(1);
  mismatched.instruments[0].provider = "tickerbot";
  assert.equal(sanitizeOrb2Beat(mismatched, NOW + 300_000).ok, false,
    "a client cannot label another provider's observation as Massive");
  assert.equal(sanitizeOrb2Beat({ ...candidate, at: NOW + 600_000 }, NOW).ok, false,
    "future timestamps are bounded");
  assert.equal(sanitizeOrb2Beat({ ...candidate, instruments: Array(13).fill(candidate.instruments[0]) }, NOW + 300_000).ok, false,
    "a saved beat is capped at 12 instruments");
});

test("Orb 2 POST requires same-origin JSON, stores a sanitized beat, and GET restores it by session", async t => {
  const { sql, env } = historyDb(t);
  const candidate = beat(0);
  const saved = await handleGoodIntelligenceOrb2Beats(postRequest(candidate), env, { now: () => NOW + 300_000 });
  assert.equal(saved.status, 200);
  assert.equal(saved.headers.get("cache-control"), "no-store");
  assert.deepEqual(await saved.json(), {
    success: true,
    schema: ORB2_BEAT_HISTORY_SCHEMA,
    stored: true,
    beatId: candidate.beatId,
    retained: ORB2_BEAT_HISTORY_LIMIT
  });
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM orb2_saved_beats").get().count, 1);

  const restored = await handleGoodIntelligenceOrb2Beats(getRequest(), env, { now: () => NOW + 300_000 });
  const payload = await restored.json();
  assert.equal(restored.status, 200);
  assert.equal(payload.schema, ORB2_BEAT_HISTORY_SCHEMA);
  assert.equal(payload.sessionId, SESSION);
  assert.equal(payload.count, 1);
  assert.equal(payload.beats[0].beatId, candidate.beatId);
  assert.equal(payload.beats[0].instruments[0].market.latestBar.close, 101);
  assert.equal((await (await handleGoodIntelligenceOrb2Beats(getRequest(OTHER_SESSION), env, { now: () => NOW + 300_000 })).json()).count, 0,
    "anonymous session keys do not share saved beats");

  const duplicate = await handleGoodIntelligenceOrb2Beats(postRequest(candidate), env, { now: () => NOW + 301_000 });
  assert.equal(duplicate.status, 200);
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM orb2_saved_beats").get().count, 1,
    "retrying a beat id updates one row instead of duplicating it");
});

test("Orb 2 rejects cross-origin writes, malformed requests, and missing D1 migration visibly", async t => {
  const { env } = historyDb(t);
  const hostile = postRequest(beat(0), { requestOrigin: "https://os.example", headerOrigin: "https://evil.example" });
  const crossOrigin = await handleGoodIntelligenceOrb2Beats(hostile, env, { now: () => NOW + 300_000 });
  assert.equal(crossOrigin.status, 403);
  assert.match((await crossOrigin.json()).message, /same-origin request required/i);

  const missingType = await handleGoodIntelligenceOrb2Beats(postRequest(beat(0), { contentType: "text/plain" }), env, { now: () => NOW + 300_000 });
  assert.equal(missingType.status, 415);
  const malformedJson = await handleGoodIntelligenceOrb2Beats(postRequest("{"), env, { now: () => NOW + 300_000 });
  assert.equal(malformedJson.status, 400);
  const badSession = await handleGoodIntelligenceOrb2Beats(getRequest("not-a-uuid"), env, { now: () => NOW + 300_000 });
  assert.equal(badSession.status, 400);
  const wrongRoute = await handleGoodIntelligenceOrb2Beats(new Request(`${ORIGIN}/wrong`), env);
  assert.equal(wrongRoute.status, 404);
  const wrongMethod = await handleGoodIntelligenceOrb2Beats(new Request(`${ORIGIN}${ORB2_BEATS_ROUTE}?sessionId=${SESSION}`, { method: "DELETE" }), env);
  assert.equal(wrongMethod.status, 405);

  const absentBinding = await handleGoodIntelligenceOrb2Beats(getRequest(), {}, { now: () => NOW });
  assert.equal(absentBinding.status, 503);
  assert.match((await absentBinding.json()).message, /Bind COMMUNITY_DB and apply D1 migration 0008/);

  const noMigration = historyDb(t, { migrated: false });
  const absentTable = await handleGoodIntelligenceOrb2Beats(getRequest(), noMigration.env, { now: () => NOW });
  assert.equal(absentTable.status, 503);
  assert.match((await absentTable.json()).message, /Confirm that D1 migration 0008 is applied/);
});

test("Orb 2 enforces request-size, expiry, and 120-record retention bounds", async t => {
  const { sql, env } = historyDb(t);
  const tooLarge = await handleGoodIntelligenceOrb2Beats(
    postRequest({ ...beat(0), extra: "x".repeat(50 * 1024) }), env, { now: () => NOW + 300_000 }
  );
  assert.equal(tooLarge.status, 413);
  assert.match((await tooLarge.json()).message, /48 KiB request limit/);

  for (let sequence = 0; sequence < ORB2_BEAT_HISTORY_LIMIT + 1; sequence += 1) {
    const result = await handleGoodIntelligenceOrb2Beats(
      postRequest(beat(sequence)), env, { now: () => NOW + 300_000 }
    );
    assert.equal(result.status, 200, `beat ${sequence} is accepted`);
  }
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM orb2_saved_beats WHERE session_id=?").get(SESSION).count,
    ORB2_BEAT_HISTORY_LIMIT);
  const history = await handleGoodIntelligenceOrb2Beats(
    getRequest(), env, { now: () => NOW + 300_000 }
  );
  const payload = await history.json();
  assert.equal(payload.count, ORB2_BEAT_HISTORY_LIMIT);
  assert.equal(payload.beats[0].beatId, id(2), "the oldest of the newest 120 rows is retained");
  assert.equal(payload.beats.at(-1).beatId, id(ORB2_BEAT_HISTORY_LIMIT + 1));

  const expiresAt = NOW + 300_000 + 90 * 24 * 60 * 60_000;
  const expired = await handleGoodIntelligenceOrb2Beats(getRequest(), env, { now: () => expiresAt + 1 });
  assert.equal((await expired.json()).count, 0, "history is no longer returned after its 90-day expiry");
});

test("the main Worker routes Orb 2 history to D1 without calling a market provider", async t => {
  const { env, sql } = historyDb(t);
  const saved = await worker.fetch(postRequest(beat(0)), env);
  assert.equal(saved.status, 200);
  const restored = await worker.fetch(getRequest(), env);
  const payload = await restored.json();
  assert.equal(payload.count, 1);
  assert.equal(payload.beats[0].beatId, id(1));
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM orb2_saved_beats").get().count, 1);
});
