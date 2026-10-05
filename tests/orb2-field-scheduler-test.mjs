/* Orb 2 server-side beat field: roster, tick, budgets, queue, and snapshot.

   These tests run the real Worker modules against an in-memory D1 built from the
   checked-in migrations and a deterministic fake provider, so the assertions are
   about the schedule the deployed Worker will actually run. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  ORB2_FIELD_BEAT_TYPES,
  ORB2_FIELD_MAX_PRIORITY_SYMBOLS,
  ORB2_FIELD_ROUTE,
  ORB2_FIELD_FRESHNESS,
  ORB2_FIELD_TICKERBOT_BURST_CALLS,
  ORB2_FIELD_TICKERBOT_BURST_PER_TICK,
  ORB2_MASSIVE_PER_MINUTE,
  handleOrb2Field,
  observationFromPacket,
  orb2FieldBeatTypesFor,
  orb2FieldFreshness,
  orb2FieldRoster,
  runOrb2FieldTick,
  sanitizeOrb2FieldObservation
} from "../worker/orb2-field.mjs";
import { TICKERBOT_WATCHLIST } from "../worker/good-intelligence-tickerbot.mjs";

const MIGRATIONS = ["0005_tickerbot_call_ledger.sql", "0007_massive_daily_call_ledger.sql", "0009_orb2_server_field.sql"]
  .map(file => readFileSync(new URL(`../migrations/community/${file}`, import.meta.url), "utf8"));
const NOW = Date.parse("2026-10-05T12:00:00.000Z");
const ORIGIN = "https://os.example";
const STOCK_SYMBOLS = TICKERBOT_WATCHLIST.map(entry => entry.symbol);

function fixture(t, { migrated = true } = {}) {
  const sql = new DatabaseSync(":memory:");
  if (migrated) for (const migration of MIGRATIONS) sql.exec(migration);
  t.after(() => sql.close());
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
    },
    async batch(statements) { return Promise.all(statements.map(statement => statement.run())); }
  };
  return {
    sql, db,
    env: { COMMUNITY_DB: db, MASSIVE_API_KEY: "test-massive-key", TICKERBOT_API_KEY: "test-tickerbot-key" }
  };
}

function bars(count, { volume = true } = {}) {
  return Array.from({ length: count }, (_, index) => ({
    time: NOW - (count - index) * 86_400_000,
    open: 100 + index, high: 101 + index, low: 99 + index,
    close: 100.5 + index, ...(volume ? { volume: 1000 + index } : {}), confirmed: true
  }));
}

/** Deterministic provider stand-in: Tickerbot and Massive answer the reviewed shapes. */
function providerFetch(seen, { failSymbols = [] } = {}) {
  return async (url, options = {}) => {
    const parsed = new URL(String(url));
    seen.urls.push(parsed.toString());
    seen.auth = options.headers && options.headers.Authorization ? "bearer" : seen.auth;
    const tickerbot = /^\/v2\/bars\/([^/]+)\/([^/]+)$/.exec(parsed.pathname);
    if (parsed.origin === "https://api.tickerbot.io" && tickerbot) {
      const symbol = decodeURIComponent(tickerbot[1]);
      if (failSymbols.includes(symbol)) return Response.json({ error: "unavailable" }, { status: 500 });
      seen.tickerbot.push(`${symbol}:${tickerbot[2]}`);
      return Response.json({ as_of: new Date(NOW).toISOString(), bars: bars(40).map(bar => ({ t: bar.time, o: bar.open, h: bar.high, l: bar.low, c: bar.close, v: bar.volume })) });
    }
    if (parsed.origin === "https://api.massive.com") {
      const ticker = decodeURIComponent(parsed.pathname.replace(/^\/v2\/aggs\/ticker\//, "").replace(/\/range\/.*$/, "").replace(/^\/futures\/v1\/aggs\//, ""));
      seen.massive.push(ticker);
      return Response.json({
        request_id: "test-request",
        results: bars(50).map(bar => ({ t: bar.time, o: bar.open, h: bar.high, l: bar.low, c: bar.close, v: bar.volume }))
      });
    }
    return Response.json({ error: "unexpected origin" }, { status: 400 });
  };
}

/* Every tick in this file runs in its own minute: the shared Massive envelope is
   a real sliding window, and the tests must not look like a burst of 100 ticks
   inside one minute. */
let CLOCK = NOW;
const nextClock = () => (CLOCK += 120_000);
const deps = (seen, { at = NOW, ...options } = {}) => ({
  now: () => at,
  fetch: providerFetch(seen, options)
});

test("the server field roster is the reviewed catalog, in firing order, with no invented symbols", () => {
  const roster = orb2FieldRoster({ now: NOW });
  assert.equal(roster.stocks.length, 52);
  assert.deepEqual(roster.stocks.map(stock => stock.symbol), STOCK_SYMBOLS,
    "the field's stock roster matches the reviewed Tickerbot watchlist exactly");
  assert.equal(roster.stocks[0].symbol, "NVDA", "the rotation is published in the reviewed firing order");
  assert.equal(roster.fx.length, 23);
  assert.equal(roster.commodities.length, 10);
  assert.equal(roster.indices.length, 5);
  assert.deepEqual(roster.dxySymbols, ["EURUSD", "JPYUSD", "GBPUSD", "CADUSD", "SEKUSD", "CHFUSD"]);
  assert.deepEqual(roster.discs, ["stocks", "fx", "commodities", "indices"]);
  assert.ok(roster.instruments.every(instrument => typeof instrument.discId === "string"));
  assert.equal(new Set(roster.stocks.map(stock => stock.symbol)).size, 52);
});

test("field freshness marks daily cards stale before 24h expiry and 15m cards expired at six hours", () => {
  const dailyFresh = orb2FieldFreshness("1d", NOW - 12 * 60 * 60_000, NOW);
  const dailyStale = orb2FieldFreshness("1d", NOW - 20 * 60 * 60_000, NOW);
  const dailyExpired = orb2FieldFreshness("1d", NOW - 25 * 60 * 60_000, NOW);
  const intradayFresh = orb2FieldFreshness("15m", NOW - 5 * 60 * 60_000, NOW);
  const intradayExpired = orb2FieldFreshness("15m", NOW - 7 * 60 * 60_000, NOW);
  assert.equal(dailyFresh.status, "fresh");
  assert.equal(dailyStale.status, "stale");
  assert.equal(dailyExpired.status, "expired");
  assert.equal(intradayFresh.status, "fresh");
  assert.equal(intradayExpired.status, "expired");
  assert.equal(ORB2_FIELD_FRESHNESS["1d"].expireMs, 24 * 60 * 60_000);
  assert.equal(ORB2_FIELD_FRESHNESS["15m"].expireMs, 6 * 60 * 60_000);
});

test("a tick spends at most the shared Massive per-minute envelope and stores one directive per instrument", async t => {
  const { sql, env } = fixture(t);
  const seen = { urls: [], massive: [], tickerbot: [] };
  const summary = await runOrb2FieldTick(env, null, deps(seen, { at: nextClock() }));
  assert.equal(summary.ok, true);
  assert.equal(summary.massiveCalls, ORB2_MASSIVE_PER_MINUTE, "one tick is one minute of the five-request envelope");
  assert.equal(seen.massive.length, ORB2_MASSIVE_PER_MINUTE);
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_observations WHERE provider='massive'").get().count, ORB2_MASSIVE_PER_MINUTE);
  assert.equal(sql.prepare("SELECT attempted_calls AS calls FROM massive_daily_call_ledger").get().calls, ORB2_MASSIVE_PER_MINUTE);
  const row = sql.prepare("SELECT payload, interval, confirmed FROM orb2_field_observations WHERE interval='1d' LIMIT 1").get();
  const payload = JSON.parse(row.payload);
  assert.equal(payload.schema, "gi-orb2-field-observation-v1");
  assert.equal(payload.provider, "massive");
  assert.equal(payload.motion.schema, "characters-market-motion-v1", "the Characters directive is computed server-side");
  assert.ok(payload.market && payload.market.latestBar && payload.market.latestBar.confirmed === true);
  assert.equal(row.confirmed, 1);
});

test("the rotation is least-recently-observed, so a full sweep cycles the whole field before repeating", async t => {
  const { env } = fixture(t);
  // Tickerbot is deliberately absent here: the warm queue (its own test below)
  // would otherwise also write 1d rows and the rotation assertion would be
  // measuring two writers at once.
  delete env.TICKERBOT_API_KEY;
  const seen = { urls: [], massive: [], tickerbot: [] };
  const fetched = new Set();
  // 52 stocks + 23 fx = 75 reviewed 1d instruments; 5 per tick means a full pass
  // takes 15 ticks. Every symbol must appear exactly once inside that pass.
  const at = nextClock();
  for (let tick = 0; tick < 15; tick += 1) {
    const summary = await runOrb2FieldTick(env, null, { now: () => at + tick * 60_000, fetch: providerFetch(seen) });
    assert.equal(summary.massiveCalls, ORB2_MASSIVE_PER_MINUTE);
    for (const ticker of seen.massive) fetched.add(ticker);
  }
  assert.equal(fetched.size, 75, "the first 15 ticks cover the reviewed 1d field exactly once");
  assert.ok([...fetched].includes("C:EURUSD"), "fx routes through the reviewed catalog mapping");
  assert.equal(Array.from(fetched).filter(ticker => ticker.startsWith("C:")).length, 23);
});

test("the field warm burst queues the full Tickerbot sweep and drains it across scheduled ticks", async t => {
  const { sql, env } = fixture(t);
  const seen = { urls: [], massive: [], tickerbot: [] };
  const at = nextClock();
  const first = await runOrb2FieldTick(env, null, deps(seen, { at }));
  assert.equal(first.warmEnqueued, ORB2_FIELD_TICKERBOT_BURST_CALLS,
    "a cold field queues one Tickerbot call per reviewed stock and interval");
  assert.equal(first.warmEnqueued, 156);
  const claimedFirstTick = first.queueCompleted;
  assert.ok(claimedFirstTick > 0 && claimedFirstTick <= ORB2_FIELD_TICKERBOT_BURST_PER_TICK,
    "one tick never claims more queued jobs than its bounded batch");
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_queue").get().count,
    ORB2_FIELD_TICKERBOT_BURST_CALLS - claimedFirstTick);
  assert.equal(new Set(seen.tickerbot).size, seen.tickerbot.length, "no instrument is beaten twice while the burst drains");

  let tick = 1;
  while (sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_queue").get().count > 0 && tick < 12) {
    await runOrb2FieldTick(env, null, { now: () => at + tick * 60_000, fetch: providerFetch(seen) });
    tick += 1;
  }
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_queue").get().count, 0, "the burst drains within its bounded batch size");
  assert.equal(seen.tickerbot.length, ORB2_FIELD_TICKERBOT_BURST_CALLS);
  assert.equal(new Set(seen.tickerbot.map(entry => entry.split(":")[1])).size, 3, "15m, 1h, and 1d are covered");
  assert.equal(sql.prepare("SELECT attempted_calls AS calls FROM tickerbot_call_ledger").get().calls,
    ORB2_FIELD_TICKERBOT_BURST_CALLS, "every burst call is claimed in the durable monthly ledger");
  const afterFreshnessWindow = await runOrb2FieldTick(env, null, {
    now: () => at + 7 * 60 * 60_000, fetch: providerFetch(seen)
  });
  assert.equal(afterFreshnessWindow.warmEnqueued, 0, "stale intraday cards do not trigger another full calibration burst automatically");
  // Keep the shared in-memory Massive pacing clock monotonic for later tests.
  CLOCK = at + 7 * 60 * 60_000;
  const observed = sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_observations WHERE provider='tickerbot'").get().count;
  assert.equal(observed, ORB2_FIELD_TICKERBOT_BURST_CALLS, "each supported scale keeps its own stored observation");
  const intervals = sql.prepare("SELECT DISTINCT interval FROM orb2_field_observations").all().map(row => row.interval).sort();
  assert.deepEqual(intervals, ["15m", "1d", "1h"]);
});

test("the durable allowances stop the schedule instead of overspending", async t => {
  const { sql, env } = fixture(t);
  const seen = { urls: [], massive: [], tickerbot: [] };
  // Burn the tickerbot month first: the burst must refuse before any upstream call.
  sql.prepare("INSERT INTO tickerbot_call_ledger (utc_month, attempted_calls, provider_budget, worker_limit, updated_at) VALUES (?,?,?,?,?)")
    .run("2026-10", 10_000, 10_000, 10_000, NOW);
  const summary = await runOrb2FieldTick(env, null, deps(seen, { at: nextClock() }));
  assert.equal(summary.tickerbotCalls, 0);
  assert.equal(seen.tickerbot.length, 0, "an exhausted monthly ledger sends no upstream request");
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_queue").get().count > 0, true,
    "the refused work stays queued instead of being silently dropped");
  assert.ok([...summary.notes, ...summary.errors].some(note => /allowance|exhausted|ledger/i.test(note)),
    "an exhausted ledger is named in the tick summary");

  // A spent Massive UTC-day guard stops the rotation but leaves the field readable.
  const second = fixture(t);
  second.sql.prepare("INSERT INTO massive_daily_call_ledger (utc_day, attempted_calls, daily_limit, updated_at) VALUES (?,?,?,?)")
    .run("2026-10-05", 300, 300, NOW);
  const exhausted = await runOrb2FieldTick(second.env, null, deps(seen, { at: nextClock() }));
  assert.equal(exhausted.massiveCalls, 0);
  assert.ok(exhausted.notes.some(note => /Massive UTC-day allowance is spent/i.test(note)));
});

test("a missing Worker secret and a missing binding fail closed with a readable reason", async t => {
  const { env } = fixture(t);
  const seen = { urls: [], massive: [], tickerbot: [] };
  const noSecrets = await runOrb2FieldTick({ COMMUNITY_DB: env.COMMUNITY_DB }, null, deps(seen, { at: nextClock() }));
  assert.equal(noSecrets.massiveCalls, 0);
  assert.equal(noSecrets.tickerbotCalls, 0);
  assert.ok(noSecrets.notes.some(note => /not configured/i.test(note)),
    "a missing provider secret is reported instead of guessing a data source");
  const noDb = await runOrb2FieldTick({}, null, deps(seen, { at: nextClock() }));
  assert.equal(noDb.ok, false);
  assert.match([...noDb.notes, ...noDb.errors].join(" "), /COMMUNITY_DB/);
});

test("a warm burst is same-origin, bounded, and refused inside its cooldown", async t => {
  const { sql, env } = fixture(t);
  env.TICKERBOT_API_KEY = "test-tickerbot-key";
  const warm = body => new Request(`${ORIGIN}${ORB2_FIELD_ROUTE}`, {
    method: "POST",
    headers: { Origin: ORIGIN, "Content-Type": "application/json" },
    body: JSON.stringify({ schema: "gi-orb2-field-request-v1", action: "warm", intervals: ["1h", "1d"], ...body })
  });
  const crossOrigin = new Request(`${ORIGIN}${ORB2_FIELD_ROUTE}`, {
    method: "POST",
    headers: { Origin: "https://evil.example", "Content-Type": "application/json" },
    body: JSON.stringify({ schema: "gi-orb2-field-request-v1", action: "warm" })
  });
  assert.equal((await handleOrb2Field(crossOrigin, env, { now: () => NOW })).status, 403);

  const queued = await handleOrb2Field(warm({}), env, { now: () => NOW });
  assert.equal(queued.status, 200);
  const payload = await queued.json();
  assert.equal(payload.data.enqueued, 104);
  assert.equal(payload.data.callsPerBurst, ORB2_FIELD_TICKERBOT_BURST_CALLS);
  assert.equal(payload.data.marketRequestSent, false, "queuing is not a provider call");
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_queue").get().count, 104);

  // A second burst inside the cooldown is refused once the field is not cold.
  sql.prepare(`INSERT INTO orb2_field_observations
    (interval, symbol, disc_id, provider, status, reason, beat_id, payload, observed_at, bar_time, confirmed, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    "1d", "AAPL", "stocks", "massive", "bars", "server-sweep", "00000000-0000-4000-8000-000000000009",
    JSON.stringify({ schema: "gi-orb2-field-observation-v1" }), NOW - 60_000, NOW - 60_000, 1, NOW - 60_000);
  const again = await handleOrb2Field(warm({}), env, { now: () => NOW + 60_000 });
  assert.equal(again.status, 429);
  assert.match((await again.json()).message, /warm burst already ran/i);
  const withoutKey = await handleOrb2Field(warm({}), { COMMUNITY_DB: env.COMMUNITY_DB }, { now: () => NOW + 60_000 });
  assert.equal(withoutKey.status, 503);
});

test("a priority refresh is bounded to the reviewed roster and unknown symbols are refused, not invented", async t => {
  const { sql, env } = fixture(t);
  const post = (body, { requestOrigin = ORIGIN, headerOrigin = ORIGIN } = {}) => new Request(`${ORIGIN}${ORB2_FIELD_ROUTE}`, {
    method: "POST",
    headers: { Origin: headerOrigin, "Content-Type": "application/json" },
    body: JSON.stringify({ schema: "gi-orb2-field-request-v1", action: "priority", ...body })
  });
  const response = await handleOrb2Field(post({ symbols: ["AAPL", "MSFT", "NOT-A-SYMBOL"], interval: "1d" }), env, { now: () => NOW });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(payload.data.accepted, ["AAPL", "MSFT"]);
  assert.deepEqual(payload.data.refused, ["NOT-A-SYMBOL"]);
  assert.equal(payload.data.queue.hot, 2);
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_queue WHERE lane='hot'").get().count, 2);

  const tooMany = await handleOrb2Field(post({ symbols: STOCK_SYMBOLS.concat(STOCK_SYMBOLS).slice(0, 20) }), env, { now: () => NOW });
  assert.equal(tooMany.status, 200);
  assert.equal((await tooMany.json()).data.accepted.length, ORB2_FIELD_MAX_PRIORITY_SYMBOLS);

  const empty = await handleOrb2Field(post({ symbols: [] }), env, { now: () => NOW });
  assert.equal(empty.status, 400);
  const wrongSchema = await handleOrb2Field(post({ symbols: ["AAPL"], schema: "nope" }), env, { now: () => NOW });
  assert.equal(wrongSchema.status, 400);
});

test("the snapshot serves the stored field with honest beat-type counts and the DXY reference", async t => {
  const { env } = fixture(t);
  const seen = { urls: [], massive: [], tickerbot: [] };
  const at = nextClock();
  for (let tick = 0; tick < 15; tick += 1) {
    await runOrb2FieldTick(env, null, { now: () => at + tick * 60_000, fetch: providerFetch(seen) });
  }
  const response = await handleOrb2Field(new Request(`${ORIGIN}${ORB2_FIELD_ROUTE}?interval=1d&disc=stocks`), env, { now: () => at + 20 * 60_000 });
  assert.equal(response.status, 200);
  const { data } = await response.json();
  assert.equal(data.schema, "gi-orb2-field-v1");
  assert.equal(data.status.source, "server-field");
  assert.equal(data.status.continuous, true);
  assert.equal(data.status.cron, "*/1 * * * *");
  assert.equal(data.observations.length, 52);
  assert.ok(data.observations.every(observation => observation.discId === "stocks"));
  assert.equal(data.status.counts.observed, 52);
  assert.equal(data.status.massive.perMinute, ORB2_MASSIVE_PER_MINUTE);
  assert.equal(data.status.massive.dailyLimit, 300);
  assert.ok(data.observations.every(observation => observation.motion && observation.motion.schema === "characters-market-motion-v1"));
  const types = Object.fromEntries(data.beatTypes.map(type => [type.id, type]));
  assert.equal(types.observation.live, true);
  assert.equal(types.message.live, false);
  assert.equal(types.trade.live, false);
  assert.equal(types.trade.count, 52, "every stored OHLCV observation can carry the trade scenario");
  assert.match(types.permission.summary, /Nothing becomes permitted/);
  assert.equal(data.dxy.status, "ready", "the six aligned FX closes produce the fixed benchmark on the server");
  assert.ok(data.dxy.value > 0);
  assert.equal(data.dxy.inputCount, 6);

  const narrowed = await handleOrb2Field(new Request(`${ORIGIN}${ORB2_FIELD_ROUTE}?interval=1d&symbols=AAPL,MSFT&types=observation`), env, { now: () => at + 20 * 60_000 });
  const narrowedData = (await narrowed.json()).data;
  assert.deepEqual(narrowedData.observations.map(observation => observation.symbol).sort(), ["AAPL", "MSFT"]);
  assert.equal(narrowedData.beatTypes.find(type => type.id === "message").available, false,
    "a dialed-out beat type is reported as not requested rather than silently rendered");
});

test("the snapshot fails visibly when D1 or migration 0009 is missing", async t => {
  const { env } = fixture(t, { migrated: false });
  const response = await handleOrb2Field(new Request(`${ORIGIN}${ORB2_FIELD_ROUTE}`), env, { now: () => NOW });
  assert.equal(response.status, 503);
  assert.match((await response.json()).message, /migration 0009/i);
  const unbound = await handleOrb2Field(new Request(`${ORIGIN}${ORB2_FIELD_ROUTE}`), {}, { now: () => NOW });
  assert.equal(unbound.status, 503);
  assert.match((await unbound.json()).message, /COMMUNITY_DB/);
});

test("stored observations are validated on the way out, so a hand-edited row cannot claim a provider", () => {
  const valid = {
    schema: "gi-orb2-field-observation-v1", symbol: "AAPL", displaySymbol: "AAPL", discId: "stocks",
    provider: "massive", interval: "1d", status: "bars", reason: "server-sweep", beatId: "00000000-0000-4000-8000-000000000001",
    observedAt: NOW, market: null, motion: null
  };
  assert.equal(sanitizeOrb2FieldObservation(valid, NOW).ok, false, "an observation must carry a market summary or a directive");
  const withMotion = { ...valid, motion: { schema: "characters-market-motion-v1", mood: "drift", status: "unknown", gauge: {}, npc: {}, object: {}, item: {}, frozen: true } };
  assert.equal(sanitizeOrb2FieldObservation(withMotion, NOW).ok, true);
  assert.equal(sanitizeOrb2FieldObservation({ ...withMotion, provider: "alpha" }, NOW).ok, false);
  assert.equal(sanitizeOrb2FieldObservation({ ...withMotion, interval: "1mo" }, NOW).ok, false);
  assert.equal(sanitizeOrb2FieldObservation({ ...withMotion, provider: "tickerbot", discId: "fx" }, NOW).ok, false);
  assert.equal(sanitizeOrb2FieldObservation({ ...withMotion, observedAt: NOW + 86_400_000 }, NOW).ok, false);
  const beatId = sanitizeOrb2FieldObservation(withMotion, NOW).observation;
  assert.deepEqual(orb2FieldBeatTypesFor(beatId), ["observation", "permission"],
    "a directive without a market observation offers the observation and permission scenarios only");
  assert.deepEqual(orb2FieldBeatTypesFor({ ...beatId, confirmed: true, market: { volumeAvailable: true, latestBar: { volume: 10, confirmed: true }, status: "ready", dataShape: "ohlcv" } }),
    ["observation", "message", "trade", "authorization", "permission"]);
  assert.equal(ORB2_FIELD_BEAT_TYPES.length, 5);
});

test("observationFromPacket refuses a missing packet instead of inventing a berth", () => {
  assert.equal(observationFromPacket({ packet: null, symbol: "AAPL", discId: "stocks", provider: "massive" }), null);
  const observation = observationFromPacket({
    packet: { schema: "gi-market-context-v1", synthetic: false, symbol: "AAPL", timeframe: "1d", source: "test", bars: bars(60) },
    symbol: "AAPL", displaySymbol: "AAPL", discId: "stocks", provider: "massive", now: NOW, beatId: "00000000-0000-4000-8000-000000000002"
  });
  assert.ok(observation);
  assert.equal(observation.market.status !== "unavailable", true);
  assert.equal(observation.market.synthetic, false);
  assert.equal(observation.confirmed, true);
});
