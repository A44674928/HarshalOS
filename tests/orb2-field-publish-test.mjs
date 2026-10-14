/* Orb 2 field publication: the precomputed document, its slices, and serving.

   These tests run the real Worker modules against an in-memory D1 built from the
   checked-in migrations. The load-bearing assertion is byte identity: the stored
   document has to be the exact `{ success, environment, data }` envelope the live
   read path produces, or the precomputed route would quietly serve a different
   field than the fallback read. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  ORB2_FIELD_FRESHNESS,
  ORB2_FIELD_INTERVALS,
  ORB2_FIELD_ROUTE,
  clearOrb2FieldSchemaCache,
  heldFieldObservation,
  observationFromPacket,
  readOrb2FieldSnapshot,
  sanitizeOrb2FieldObservation
} from "../worker/orb2-field.mjs";
import {
  ORB2_FIELD_FRAGMENT_COLD_PAGE,
  ORB2_FIELD_FRAGMENT_PAGE,
  ORB2_FIELD_SNAPSHOT_CACHE_SECONDS,
  ORB2_FIELD_SNAPSHOT_MAX_BYTES,
  clearOrb2FieldPublishCache,
  orb2FieldAggregateCounts,
  orb2FieldAggregateSql,
  orb2FieldFragmentForRow,
  orb2FieldFragmentFreshUntil,
  orb2FieldFilterFromUrl,
  publishOrb2FieldDocument,
  readOrb2FieldSnapshotRow,
  runOrb2FieldBuildSlice,
  serveOrb2FieldSnapshot
} from "../worker/orb2-field-publish.mjs";
import { TICKERBOT_WATCHLIST } from "../worker/good-intelligence-tickerbot.mjs";
import { clearCharactersCryptoRankingCache } from "../worker/characters-crypto-ranking.mjs";
import { clearKrakenDailyBarCache } from "../worker/characters-kraken.mjs";
import { clearMassiveCache } from "../worker/massive.mjs";

const MIGRATIONS = [
  "0005_tickerbot_call_ledger.sql",
  "0006_alpha_vantage_daily_call_ledger.sql",
  "0007_massive_daily_call_ledger.sql",
  "0009_orb2_server_field.sql",
  "0010_characters_crypto_ranking_cache.sql",
  "0011_massive_futures_contract_cache.sql",
  "0012_kraken_public_crypto.sql",
  "0018_orb2_field_snapshot.sql",
  "0020_d1_rows_written.sql"
].map(file => readFileSync(new URL(`../migrations/community/${file}`, import.meta.url), "utf8"));

const OPTIONS_MIGRATION = "0013_orb2_options_field.sql";
const NOW = Date.parse("2026-10-05T12:00:00.000Z");
const ORIGIN = "https://os.example";
const STOCK_SYMBOLS = TICKERBOT_WATCHLIST.slice(0, 4).map(entry => entry.symbol);
const FX_SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD"];
const COMMODITY_SYMBOLS = ["CL", "GC", "SI"];
const INDEX_SYMBOLS = ["SPX", "NDX", "DJI"];
/* The whole seeded field: four FX, four commodities (one of them held), three
   indices, and four Tickerbot Stocks. */
const FIELD_SIZE = FX_SYMBOLS.length + COMMODITY_SYMBOLS.length + 1 + INDEX_SYMBOLS.length + STOCK_SYMBOLS.length;
const TEST_CONTRACT_TICKERS = Object.freeze({ CL: "CLX6", NG: "NGX6", GC: "GCZ6", SI: "SIZ6" });

/* A deterministic beat id per symbol. The production sanitizer mints a random UUID,
   and the `.raw()` / `db.batch()` fallback fixtures have to rebuild the same bytes,
   so the seeds cannot carry one. */
function beatIdFor(symbol) {
  const hex = [...`orb2field${symbol}`.padEnd(32, "0")].slice(0, 32)
    .map(character => (character.charCodeAt(0) % 16).toString(16)).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function bars(count, { at = NOW, volume = true } = {}) {
  return Array.from({ length: count }, (_, index) => ({
    time: at - (count - index) * 86_400_000,
    open: 100 + index, high: 101 + index, low: 99 + index,
    close: 100.5 + index, ...(volume ? { volume: 1000 + index } : {}), confirmed: true
  }));
}

/**
 * A D1-shaped shim over `node:sqlite`. It counts reads, writes and rows read, and
 * it supports `.raw()` and a `db.batch()` that returns row results, so the batched
 * read path is the one under test; `raw`/`batched` turn those off to prove the
 * fallbacks behave identically.
 */
function fixture(t, { migrated = true, options = false, raw = true, batched = true } = {}) {
  clearCharactersCryptoRankingCache();
  clearKrakenDailyBarCache();
  clearOrb2FieldSchemaCache();
  clearMassiveCache();
  clearOrb2FieldPublishCache();
  const sql = new DatabaseSync(":memory:");
  if (migrated) for (const migration of MIGRATIONS) sql.exec(migration);
  if (options) sql.exec(readFileSync(new URL(`../migrations/community/${OPTIONS_MIGRATION}`, import.meta.url), "utf8"));
  t.after(() => sql.close());
  const stats = {
    reads: 0, writes: 0, rowsRead: 0, batches: 0, queries: [],
    reset() { this.reads = 0; this.writes = 0; this.rowsRead = 0; this.batches = 0; this.queries = []; }
  };
  const kindOf = query => /^\s*(?:SELECT|WITH|PRAGMA|EXPLAIN)\b/i.test(String(query)) ? "reads" : "writes";
  const tally = (kind, rows) => {
    if (kind === "reads") { stats.reads += 1; stats.rowsRead += rows; } else { stats.writes += 1; }
  };
  const db = {
    prepare(query) {
      stats.queries.push(String(query));
      const kind = kindOf(query);
      const statement = {
        query: String(query), kind, values: [],
        /* D1 takes the bindings either way — `bind(...).all()` or `all(...values)` —
           so this shim does too. */
        bind(...args) { statement.values = args; return statement; },
        async first(...args) {
          const row = sql.prepare(query).get(...(args.length ? args : statement.values)) ?? null;
          tally(kind, row ? 1 : 0);
          return row;
        },
        async all(...args) {
          const results = sql.prepare(query).all(...(args.length ? args : statement.values));
          tally(kind, results.length);
          return { results };
        },
        async run(...args) {
          tally(kind, 0);
          return sql.prepare(query).run(...(args.length ? args : statement.values));
        }
      };
      if (raw) {
        statement.raw = async (...args) => sql.prepare(query)
          .all(...(args.length ? args : statement.values)).map(row => Object.values(row));
      }
      return statement;
    },
    async batch(statements) {
      stats.batches += 1;
      return statements.map(statement => {
        if (statement.kind !== "reads") {
          tally("writes", 0);
          return sql.prepare(statement.query).run(...statement.values);
        }
        const results = sql.prepare(statement.query).all(...statement.values);
        tally("reads", results.length);
        /* A runtime whose batch does not hand back row results: the caller has to
           fall back to individual reads rather than see an empty field. */
        return batched ? { results } : { changes: 0 };
      });
    }
  };
  return {
    sql, db, stats,
    env: { COMMUNITY_DB: db, MASSIVE_API_KEY: "test-massive-key", TICKERBOT_API_KEY: "test-tickerbot-key" }
  };
}

function seedActiveContracts(sql, at = NOW) {
  const date = new Date(at).toISOString().slice(0, 10);
  for (const [productCode, ticker] of Object.entries(TEST_CONTRACT_TICKERS)) {
    sql.prepare(`INSERT INTO massive_futures_contract_cache
      (product_code, contract_json, source_date, fetched_at, expires_at, last_attempt_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(productCode, JSON.stringify({
        ticker, productCode, provider: "Massive", asOfDate: date, lastTradeDate: "2026-11-20", daysToMaturity: 46
      }), date, at, Date.parse(`${date}T00:00:00.000Z`) + 86_400_000, at, at);
  }
}

function seedMarketObservation(sql, { symbol, discId, observedAt = NOW, updatedAt = observedAt, confirmed = true }) {
  const parsed = sanitizeOrb2FieldObservation({
    schema: "gi-orb2-field-observation-v1", symbol, displaySymbol: symbol, name: symbol,
    sector: discId === "indices" ? "Index" : "Futures", discId, provider: "massive", interval: "1d",
    status: "bars", reason: "server-sweep", code: "", message: "",
    beatId: "00000000-0000-4000-8000-000000000099", observedAt, barTime: observedAt, confirmed,
    market: {
      status: "ready", source: "Massive test close", timeframe: "1d", dataShape: "ohlcv", synthetic: false,
      barCount: 40, volumeAvailable: true,
      latestBar: { time: observedAt, open: 100, high: 102, low: 99, close: 101, volume: 1000, confirmed: true },
      activityBar: { time: observedAt - 86_400_000, open: 99, high: 101, low: 98, close: 100, volume: 900, confirmed: true },
      previousClose: 100, changePct: 1, basis: 100, bands: { lower1000: 90, upper1000: 110 },
      vfi: { value: 1, signal: 0, available: true }, waveTrend: { wt1: 2, wt2: 1, zone: "neutral" }
    }
  }, observedAt);
  assert.equal(parsed.ok, true, `${discId}:${symbol} fixture should pass the production sanitizer`);
  sql.prepare(`INSERT INTO orb2_field_observations
    (interval, symbol, disc_id, provider, status, reason, beat_id, payload, observed_at, bar_time, confirmed, updated_at)
    VALUES ('1d', ?, ?, 'massive', 'bars', 'server-sweep', ?, ?, ?, ?, ?, ?)
    ON CONFLICT(interval, symbol) DO UPDATE SET
      payload=excluded.payload, observed_at=excluded.observed_at, confirmed=excluded.confirmed, updated_at=excluded.updated_at`)
    .run(symbol, discId, parsed.observation.beatId, JSON.stringify(parsed.observation), observedAt, observedAt,
      confirmed ? 1 : 0, updatedAt);
  return parsed.observation;
}

function seedStockObservation(sql, { symbol = STOCK_SYMBOLS[0], observedAt = NOW, updatedAt = observedAt } = {}) {
  const instrument = TICKERBOT_WATCHLIST.find(entry => entry.symbol === symbol);
  assert.ok(instrument, `${symbol} is on the reviewed Tickerbot roster`);
  const observation = observationFromPacket({
    packet: {
      schema: "gi-market-context-v1", synthetic: false, source: "Tickerbot test bars", symbol,
      timeframe: "1d", dataShape: "ohlcv", quoteCurrency: "USD", bars: bars(60, { at: observedAt })
    },
    symbol, displaySymbol: instrument.displaySymbol || symbol, name: instrument.name || symbol,
    sector: instrument.sector || "Technology", discId: "stocks", provider: "tickerbot",
    providerId: symbol, interval: "1d", now: observedAt, beatId: beatIdFor(symbol)
  });
  assert.ok(observation, `${symbol} fixture should pass the production sanitizer`);
  sql.prepare(`INSERT INTO orb2_field_observations
    (interval, symbol, disc_id, provider, status, reason, beat_id, payload, observed_at, bar_time, confirmed, updated_at)
    VALUES ('1d', ?, 'stocks', 'tickerbot', 'bars', 'server-sweep', ?, ?, ?, ?, 1, ?)
    ON CONFLICT(interval, symbol) DO UPDATE SET
      payload=excluded.payload, observed_at=excluded.observed_at, updated_at=excluded.updated_at`)
    .run(symbol, observation.beatId, JSON.stringify(observation), observedAt, observation.barTime, updatedAt);
  return observation;
}

function seedHeldObservation(sql, { symbol = "NG", discId = "commodities", observedAt = NOW, updatedAt = observedAt } = {}) {
  /* The sanitizer hands back a frozen observation, so the deterministic beat id is
     applied to a copy rather than by mutation. */
  const observation = {
    ...heldFieldObservation({
      symbol, displaySymbol: symbol, name: symbol, sector: "Commodity", discId,
      provider: "massive", interval: "1d", now: observedAt,
      code: "massive-upstream", message: "Provider did not return a usable daily bar."
    }),
    beatId: beatIdFor(symbol)
  };
  sql.prepare(`INSERT INTO orb2_field_observations
    (interval, symbol, disc_id, provider, status, reason, beat_id, payload, observed_at, bar_time, confirmed, updated_at)
    VALUES ('1d', ?, ?, 'massive', 'unavailable', 'server-sweep', ?, ?, ?, NULL, 0, ?)
    ON CONFLICT(interval, symbol) DO UPDATE SET payload=excluded.payload, observed_at=excluded.observed_at, updated_at=excluded.updated_at`)
    .run(symbol, discId, observation.beatId, JSON.stringify(observation), observedAt, updatedAt);
  return observation;
}

/** A small but mixed field: FX, commodities, indices, and Tickerbot Stocks. */
function seedField(sql) {
  seedActiveContracts(sql);
  for (const symbol of FX_SYMBOLS) seedMarketObservation(sql, { symbol, discId: "fx" });
  for (const symbol of COMMODITY_SYMBOLS) seedMarketObservation(sql, { symbol, discId: "commodities" });
  seedHeldObservation(sql);
  for (const symbol of INDEX_SYMBOLS) seedMarketObservation(sql, { symbol, discId: "indices" });
  for (const symbol of STOCK_SYMBOLS) seedStockObservation(sql, { symbol });
}

const requestFor = (query = "", init = {}) => new Request(`${ORIGIN}${ORB2_FIELD_ROUTE}${query}`, { method: "GET", ...init });

/** Publish every interval and return the stored 1d document row. */
async function publishAll(env, now = NOW) {
  const summary = await publishOrb2FieldDocument(env, { now });
  assert.equal(summary.ok, true, `publication should drain: ${summary.errors.join(" | ")}`);
  return readOrb2FieldSnapshotRow(env.COMMUNITY_DB, "1d");
}

function fakeCache() {
  const store = new Map();
  return {
    store,
    async match(request) {
      const hit = store.get(request.url);
      return hit ? hit.clone() : undefined;
    },
    async put(request, response) {
      store.set(request.url, response.clone());
      return undefined;
    }
  };
}

test("the published document is byte-identical to the live read envelope", async t => {
  const { sql, env } = fixture(t);
  seedField(sql);
  const row = await publishAll(env, NOW);
  assert.ok(row && typeof row.body === "string" && row.body.length > 0, "the document should be stored");
  const live = await readOrb2FieldSnapshot(env, { now: NOW, interval: "1d" });
  assert.equal(live.ok, true, live.message);
  const legacy = JSON.stringify({ success: true, environment: "orb2-server-field", data: live });
  assert.equal(row.body, legacy, "the precomputed body must be the exact live envelope");
  assert.equal(row.bytes, legacy.length);
  assert.equal(row.observations, FIELD_SIZE);
  assert.ok(row.bytes < ORB2_FIELD_SNAPSHOT_MAX_BYTES, "the assembled field stays well inside the publication bound");
  const response = await serveOrb2FieldSnapshot(requestFor(), env, { cache: null });
  assert.equal(response.status, 200);
  assert.equal(await response.text(), legacy);
  assert.equal(response.headers.get("ETag"), row.etag);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("Content-Type"), "application/json; charset=utf-8");
  /* The document keeps the beat signal the uptime monitor checks. */
  assert.equal(typeof JSON.parse(legacy).data.status.lastTickAt, "object");
});

test("the pieces stored beside the document rebuild a filtered read", async t => {
  const { sql, env } = fixture(t);
  seedField(sql);
  const row = await publishAll(env, NOW);
  const stored = JSON.parse(row.body).data;
  const response = await serveOrb2FieldSnapshot(requestFor("?disc=fx"), env, { cache: null });
  const filtered = await response.json();
  assert.equal(response.status, 200);
  assert.equal(filtered.data.disc, "fx");
  assert.equal(filtered.data.observations.length, FX_SYMBOLS.length);
  assert.ok(filtered.data.observations.every(observation => observation.discId === "fx"));
  /* The whole-field status stays complete; only the counts follow the narrowing. */
  assert.equal(filtered.data.status.counts.stored, FX_SYMBOLS.length);
  assert.equal(filtered.data.status.counts.reviewedInstruments, stored.status.counts.reviewedInstruments);
  assert.deepEqual(filtered.data.status.discs, stored.status.discs);
  assert.equal(filtered.data.status.lastTickAt, stored.status.lastTickAt);
  assert.deepEqual(filtered.data.status.massive, stored.status.massive);
  assert.equal(filtered.data.beatTypes.find(type => type.id === "observation").count, FX_SYMBOLS.length);
  assert.equal(filtered.data.beatTypes.find(type => type.id === "observation").available, true);
  /* A type filter narrows availability only. */
  const typed = await (await serveOrb2FieldSnapshot(requestFor("?disc=stocks&types=message"), env, { cache: null })).json();
  assert.equal(typed.data.requestedTypes.join(","), "message");
  assert.equal(typed.data.beatTypes.find(type => type.id === "message").available, true,
    "the requested dial is available when the narrowing has that beat");
  assert.equal(typed.data.beatTypes.find(type => type.id === "observation").available, false,
    "a dial that was not requested reports unavailable even though its beat happened");
  assert.equal(typed.data.beatTypes.find(type => type.id === "observation").count, STOCK_SYMBOLS.length);
  /* A symbol list keeps the published order: observed_at descending, then symbol. */
  const symbols = await (await serveOrb2FieldSnapshot(
    requestFor(`?symbols=${STOCK_SYMBOLS.join(",")}`), env, { cache: null })).json();
  assert.deepEqual(symbols.data.observations.map(observation => observation.symbol), [...STOCK_SYMBOLS].sort());
  /* The Disc filter and the symbol filter compose. */
  const both = await (await serveOrb2FieldSnapshot(
    requestFor(`?disc=stocks&symbols=${STOCK_SYMBOLS[0]}`), env, { cache: null })).json();
  assert.deepEqual(both.data.observations.map(observation => observation.symbol), [STOCK_SYMBOLS[0]]);
  /* A filtered body is revalidated against a filter-specific validator. */
  const revalidated = await serveOrb2FieldSnapshot(
    requestFor("?disc=fx", { headers: { "If-None-Match": response.headers.get("ETag") } }), env, { cache: null });
  assert.equal(revalidated.status, 304);
});

test("a matching If-None-Match answers 304 without a document read", async t => {
  const { sql, db, env, stats } = fixture(t);
  seedField(sql);
  const row = await publishAll(env, NOW);
  const first = await serveOrb2FieldSnapshot(requestFor(), env, { cache: null });
  assert.equal(first.status, 200);
  stats.reset();
  const second = await serveOrb2FieldSnapshot(
    requestFor("", { headers: { "If-None-Match": row.etag } }), env, { cache: null });
  assert.equal(second.status, 304);
  assert.equal(second.headers.get("ETag"), row.etag);
  assert.equal(await second.text(), "");
  const selects = stats.queries.filter(query => /FROM orb2_field_snapshots/i.test(query));
  assert.equal(selects.length, 1, "the 304 costs one small SELECT of the stored row");
  /* The validator is the stored one, so it changes only when the document does. */
  const same = await publishAll(env, NOW + 60_000);
  assert.notEqual(same.etag, row.etag);
  assert.equal((await serveOrb2FieldSnapshot(
    requestFor("", { headers: { "If-None-Match": row.etag } }), env, { cache: null })).status, 200);
  /* A wildcard validator is honored. */
  assert.equal((await serveOrb2FieldSnapshot(
    requestFor("", { headers: { "If-None-Match": "*" } }), env, { cache: null })).status, 304);
  assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM orb2_field_snapshots").first()).count, 3);
});

test("the Cache API answers inside its window without touching D1", async t => {
  const { sql, db, env, stats } = fixture(t);
  seedField(sql);
  const row = await publishAll(env, NOW);
  const cache = fakeCache();
  const first = await serveOrb2FieldSnapshot(requestFor(), env, { cache });
  assert.equal(first.status, 200);
  assert.equal(cache.store.size, 1, "the served document is put into the cache");
  const cached = [...cache.store.values()][0];
  assert.equal(cached.headers.get("Cache-Control"), `public, max-age=${ORB2_FIELD_SNAPSHOT_CACHE_SECONDS}`);
  /* A poll inside the window costs no D1 read at all. */
  stats.reset();
  const hit = await serveOrb2FieldSnapshot(requestFor(), env, { cache });
  assert.equal(hit.status, 200);
  assert.match(hit.headers.get("X-Orb2-Field") || "", /cache/);
  assert.equal(hit.headers.get("Cache-Control"), "no-store", "the client is still told not to store it");
  assert.equal(await hit.text(), row.body);
  assert.equal(stats.reads, 0, "a cache hit does not read the database");
  /* A revalidating poller gets its 304 from the cache too. */
  assert.equal((await serveOrb2FieldSnapshot(
    requestFor("", { headers: { "If-None-Match": row.etag } }), env, { cache })).status, 304);
  /* A cache that fails must not fail the request. */
  const broken = { match: async () => { throw new Error("cache down"); }, put: async () => { throw new Error("cache down"); } };
  assert.equal((await serveOrb2FieldSnapshot(requestFor(), env, { cache: broken })).status, 200);
  assert.equal(await readOrb2FieldSnapshotRow(db, "1d").then(next => next.body), row.body);
});

test("the route falls back whenever the document cannot answer", async t => {
  const { sql, env } = fixture(t);
  seedField(sql);
  assert.equal(await serveOrb2FieldSnapshot(requestFor(), env, { cache: null }), null,
    "an unpublished field must use the live read");
  const published = await publishAll(env, NOW);
  assert.ok(published.body.length > 0);
  assert.equal(await serveOrb2FieldSnapshot(requestFor(), { ...env, ORB2_FIELD_SNAPSHOT: "off" }, { cache: null }), null,
    "the rollback switch");
  assert.equal(await serveOrb2FieldSnapshot(new Request(`${ORIGIN}${ORB2_FIELD_ROUTE}`, { method: "POST" }), env, { cache: null }), null,
    "a POST is the request surface, not the stored document");
  assert.equal(await serveOrb2FieldSnapshot(requestFor("?interval=5m"), env, { cache: null }), null,
    "an interval the field does not store");
  /* The 15m interval has no stored berths here, and it still publishes: an empty
     field is a field, and its document says so. */
  const fifteen = await serveOrb2FieldSnapshot(requestFor("?interval=15m"), env, { cache: null });
  assert.equal(fifteen.status, 200);
  const fifteenBody = await fifteen.json();
  assert.equal(fifteenBody.data.interval, "15m");
  assert.deepEqual(fifteenBody.data.observations, []);
  assert.equal(await serveOrb2FieldSnapshot(requestFor(), { COMMUNITY_DB: null }, { cache: null }), null);
  /* A slice is a slice: it runs what it was asked for and reports it, never throws. */
  const slice = await runOrb2FieldBuildSlice(env, { now: NOW + 1_000, intervals: ["1h"] });
  assert.equal(slice.ok, true, slice.errors.join(" | "));
  assert.ok(slice.stages.length > 0);
  /* The database without the migration is the failing case, and it reports it. */
  const unmigrated = await runOrb2FieldBuildSlice({ COMMUNITY_DB: {} }, { now: NOW, intervals: ["1h"] });
  assert.equal(unmigrated.ok, false);
  assert.deepEqual(unmigrated.stages, []);
  assert.match(unmigrated.errors.join(" | "), /Bind COMMUNITY_DB/);
});

test("a database without migration 0018 reports the migration instead of failing", async t => {
  const { sql, env } = fixture(t, { migrated: false });
  sql.exec(readFileSync(new URL("../migrations/community/0009_orb2_server_field.sql", import.meta.url), "utf8"));
  const slice = await runOrb2FieldBuildSlice(env, { now: NOW, intervals: ["1d"] });
  assert.equal(slice.ok, false);
  assert.match(slice.errors.join(" | "), /0018_orb2_field_snapshot\.sql/);
  assert.equal(await serveOrb2FieldSnapshot(requestFor(), env, { cache: null }), null);
});

test("a pass is sliced: the drain pages, then the status, then the assembly", async t => {
  const { sql, db, env } = fixture(t);
  seedField(sql);
  const first = await runOrb2FieldBuildSlice(env, { now: NOW, intervals: ["1d"] });
  assert.equal(first.ok, true, first.errors.join(" | "));
  assert.equal(first.ran, true);
  assert.equal(first.changed, FIELD_SIZE);
  assert.deepEqual(first.stages, [`fragments:${FIELD_SIZE}:changed`, "status:1d", "assemble:1d"]);
  assert.deepEqual(first.published, ["1d"]);
  const state = await db.prepare("SELECT stage, watermark_rowid, passes, assembled_at FROM orb2_field_build_state WHERE interval='1d'").first();
  assert.equal(state.stage, "fragments", "a finished pass is ready to start the next drain");
  assert.equal(state.passes, 1);
  assert.equal(state.assembled_at, NOW);
  assert.ok(state.watermark_rowid > 0, "the saved cursor is the composite watermark");
  const fragmentCount = await db.prepare("SELECT COUNT(*) AS count FROM orb2_field_fragments WHERE interval='1d'").first();
  assert.equal(fragmentCount.count, FIELD_SIZE);
  /* D1 bills rows written, and an index is a row written of its own, so the
     slice reports what it cost rather than leaving it to the dashboard. A cold
     drain writes every fragment (table + primary key + two indexes) plus the
     build state and the document. */
  assert.ok(first.rowsWritten >= FIELD_SIZE,
    `a cold drain is charged at least one row per fragment (${first.rowsWritten} rows, ${FIELD_SIZE} berths)`);
  /* Nothing changed: no fragment is rewritten, but the document is republished so
     the frozen freshness labels cannot drift. */
  const idle = await runOrb2FieldBuildSlice(env, { now: NOW + 1_000, intervals: ["1d"] });
  assert.equal(idle.changed, 0);
  assert.deepEqual(idle.stages, ["fragments:0", "status:1d", "assemble:1d"]);
  assert.deepEqual(idle.published, ["1d"]);
  /* An idle minute is not free: republishing the document is a row, and so is
     the build state. This is the number that has to fit in the daily allowance
     beside the beat tick, which is why it is measured at all. */
  assert.ok(idle.rowsWritten > 0 && idle.rowsWritten < first.rowsWritten,
    `an idle slice costs the fixed rows and nothing per berth (${idle.rowsWritten} vs ${first.rowsWritten})`);
  /* A field with more changed berths than one page drains across slices, and the
     document waits until the drain is caught up so it can never serve a partial field. */
  const wide = await runOrb2FieldBuildSlice(env, { now: NOW + 2_000, intervals: ["1h"] });
  assert.equal(wide.ok, true, wide.errors.join(" | "));
  db.prepare("UPDATE orb2_field_observations SET updated_at = ?").run(NOW + 3_000);
  const paged = await runOrb2FieldBuildSlice(env, { now: NOW + 3_000, intervals: ["1d"] });
  assert.equal(paged.changed, ORB2_FIELD_FRAGMENT_PAGE,
    `one page is ${ORB2_FIELD_FRAGMENT_PAGE} berths; a backlog drains over several invocations`);
  assert.deepEqual(paged.published, [], "a partially drained field keeps the previous document");
  const rest = await runOrb2FieldBuildSlice(env, { now: NOW + 4_000, intervals: ["1d"] });
  assert.equal(rest.changed, FIELD_SIZE - ORB2_FIELD_FRAGMENT_PAGE);
  assert.deepEqual(rest.published, ["1d"]);
});

test("only a changed berth, or one whose label aged out, is rewritten", async t => {
  const { sql, db, env } = fixture(t);
  seedActiveContracts(sql);
  for (const symbol of ["EURUSD", "GBPUSD", "CL"]) seedMarketObservation(sql, { symbol, discId: symbol === "CL" ? "commodities" : "fx" });
  const rows = await db.prepare("SELECT symbol, payload, disc_id, provider, observed_at, confirmed, updated_at, rowid FROM orb2_field_observations").all().then(result => result.results);
  for (const row of rows) {
    const fragment = orb2FieldFragmentForRow({ row, now: NOW });
    assert.ok(fragment, `${row.symbol} should build a fragment`);
    assert.equal(fragment.isMarket, 1);
    assert.equal(fragment.confirmed, 1);
    assert.equal(fragment.observedAt, NOW);
  }
  await runOrb2FieldBuildSlice(env, { now: NOW, intervals: ["1d"] });
  const before = await db.prepare("SELECT symbol, fragment FROM orb2_field_fragments ORDER BY symbol").all().then(result => result.results);
  /* One new beat on one berth. */
  const fx = await db.prepare("SELECT payload FROM orb2_field_observations WHERE symbol='EURUSD'").first();
  const observation = JSON.parse(fx.payload);
  observation.market.latestBar.close += 1;
  db.prepare("UPDATE orb2_field_observations SET payload=?, updated_at=? WHERE symbol='EURUSD'")
    .run(JSON.stringify(observation), NOW + 30_000);
  const slice = await runOrb2FieldBuildSlice(env, { now: NOW + 30_000, intervals: ["1d"] });
  assert.equal(slice.changed, 1, "only the written berth is rebuilt");
  const after = await db.prepare("SELECT symbol, fragment FROM orb2_field_fragments ORDER BY symbol").all().then(result => result.results);
  assert.notEqual(after.find(entry => entry.symbol === "EURUSD").fragment,
    before.find(entry => entry.symbol === "EURUSD").fragment);
  assert.equal(after.find(entry => entry.symbol === "CL").fragment, before.find(entry => entry.symbol === "CL").fragment,
    "an untouched berth is not rewritten");
  assert.equal(JSON.parse(before.find(entry => entry.symbol === "CL").fragment).freshness.status, "fresh");
  /* The aged path: nothing changed, but the fresh window has passed. */
  const aged = NOW + ORB2_FIELD_FRESHNESS["1d"].staleMs + 60_000;
  const aging = await runOrb2FieldBuildSlice(env, { now: aged, intervals: ["1d"] });
  assert.ok(aging.stages.includes("fragments:3:aged"), aging.stages.join(" | "));
  const relabelled = await db.prepare("SELECT fragment FROM orb2_field_fragments WHERE symbol='CL'").first();
  assert.equal(JSON.parse(relabelled.fragment).freshness.status, "stale");
  const document = JSON.parse((await readOrb2FieldSnapshotRow(db, "1d")).body);
  assert.equal(document.data.observations.find(entry => entry.symbol === "CL").freshness.status, "stale",
    "the published document carries the corrected label");
});

test("a page boundary inside one millisecond skips no berth", async t => {
  const { sql, db, env } = fixture(t);
  seedActiveContracts(sql);
  /* A warm burst writes many berths with the same `updated_at`. The composite
     (updated_at, rowid) cursor is what keeps a page boundary from dropping the
     berths that share the boundary millisecond. */
  const burst = NOW;
  const fxBurst = [...FX_SYMBOLS, "USDCAD", "USDCHF", "NZDUSD", "USDSGD", "USDHKD", "USDCNH", "USDMXN", "USDBRL", "USDTRY", "USDZAR"];
  const indexBurst = [...INDEX_SYMBOLS, "RUT", "VIX", "DAX", "FTSE", "NIKKEI", "HSI", "CAC", "STOXX", "IBEX", "SMI"];
  const commodityBurst = [...COMMODITY_SYMBOLS, "NG", "PL", "PA", "ZW", "ZC", "ZS", "CC", "KC", "SB", "CT"];
  for (const symbol of fxBurst) seedMarketObservation(sql, { symbol, discId: "fx" });
  for (const symbol of indexBurst) seedMarketObservation(sql, { symbol, discId: "indices" });
  for (const symbol of commodityBurst) seedMarketObservation(sql, { symbol, discId: "commodities" });
  const stored = await db.prepare("SELECT COUNT(DISTINCT updated_at) AS days, COUNT(*) AS rows FROM orb2_field_observations").first();
  assert.equal(stored.days, 1, "the whole burst shares one updated_at");
  assert.ok(stored.rows > ORB2_FIELD_FRAGMENT_COLD_PAGE, "and it is wider than one page");
  const first = await runOrb2FieldBuildSlice(env, { now: NOW, intervals: ["1d"] });
  assert.equal(first.stages[0], `fragments:${ORB2_FIELD_FRAGMENT_COLD_PAGE}:changed`,
    "a cold field drains at the deeper cold page");
  assert.deepEqual(first.published, [], "a field that has not caught up publishes nothing");
  const cursor = await db.prepare("SELECT watermark_at, watermark_rowid FROM orb2_field_build_state WHERE interval='1d'").first();
  assert.equal(cursor.watermark_at, burst);
  assert.ok(cursor.watermark_rowid > 0);
  let slices = 1;
  let summary = first;
  let paged = 0;
  while (!summary.published.includes("1d") && slices < 30) {
    summary = await runOrb2FieldBuildSlice(env, { now: NOW + slices * 1_000, intervals: ["1d"] });
    paged += summary.changed;
    slices += 1;
  }
  assert.ok(summary.published.includes("1d"), `the drain finishes and publishes: ${summary.stages.join(" | ")}`);
  assert.equal(paged + first.changed, stored.rows,
    "every berth after the page boundary is still picked up");
  assert.equal(slices, 3, "a cold drain pages at the cold page, then at the steady page");
  const seeded = [...fxBurst, ...indexBurst, ...commodityBurst].sort();
  const fragments = (await db.prepare("SELECT symbol FROM orb2_field_fragments WHERE interval='1d'").all().then(result => result.results))
    .map(row => String(row.symbol)).sort();
  assert.deepEqual(fragments, seeded, "no berth sharing the boundary millisecond is skipped");
});

test("publication refuses an oversize document and keeps the previous one", async t => {
  const { sql, db, env } = fixture(t);
  seedField(sql);
  const row = await publishAll(env, NOW);
  const previous = row.body;
  const summary = await publishOrb2FieldDocument({ ...env, ORB2_FIELD_SNAPSHOT_MAX_BYTES: "64" }, { now: NOW + 1_000 });
  assert.equal(summary.ok, false);
  assert.match(summary.errors.join(" | "), /above the 64-byte publication bound/);
  const kept = await readOrb2FieldSnapshotRow(db, "1d");
  assert.equal(kept.body, previous, "the previous document is kept rather than truncated");
  assert.equal(kept.etag, row.etag);
  /* A berth deleted straight from D1 has no `updated_at` to notice, so the fragment
     sweep is what reconciles it — and once the field is narrow enough, the refusal
     stops being a stuck state. */
  db.prepare("DELETE FROM orb2_field_observations WHERE symbol NOT IN ('CL')").run();
  const recovered = await publishOrb2FieldDocument({ ...env, ORB2_FIELD_SNAPSHOT_MAX_BYTES: "60000" }, { now: NOW + 2_000 });
  assert.equal(recovered.ok, true, recovered.errors.join(" | "));
  const next = await readOrb2FieldSnapshotRow(db, "1d");
  assert.ok(next.body.length < 60_000);
  assert.equal(next.observations, 1);
});

test("the served field is the stored document, and the berths behind it are the fallback", async t => {
  const { sql, db, env, stats } = fixture(t);
  seedField(sql);
  await publishAll(env, NOW);
  stats.reset();
  const served = await serveOrb2FieldSnapshot(requestFor(), env, { cache: null });
  assert.equal(served.status, 200);
  assert.equal(stats.queries.filter(query => /FROM orb2_field_snapshots/i.test(query)).length, 1,
    "serving the field is one SELECT");
  assert.ok(!stats.queries.some(query => /FROM orb2_field_observations/i.test(query)),
    "and it never reads the payload table");
  /* A berth written after the publication is not in the document until the next
     pass — that is what precomputed means — while the live read sees it now. */
  const fx = await db.prepare("SELECT payload FROM orb2_field_observations WHERE symbol='EURUSD'").first();
  const observation = JSON.parse(fx.payload);
  observation.market.latestBar.close += 1;
  observation.market.latestBar.high += 1;
  db.prepare("UPDATE orb2_field_observations SET payload=?, updated_at=? WHERE symbol='EURUSD'")
    .run(JSON.stringify(observation), NOW + 5_000);
  const frozen = await (await serveOrb2FieldSnapshot(requestFor(), env, { cache: null })).json();
  const live = await readOrb2FieldSnapshot(env, { now: NOW + 5_000, interval: "1d" });
  assert.notEqual(
    frozen.data.observations.find(entry => entry.symbol === "EURUSD").market.latestBar.close,
    live.observations.find(entry => entry.symbol === "EURUSD").market.latestBar.close);
  await runOrb2FieldBuildSlice(env, { now: NOW + 6_000, intervals: ["1d"] });
  const refreshed = await (await serveOrb2FieldSnapshot(requestFor(), env, { cache: null })).json();
  assert.equal(
    refreshed.data.observations.find(entry => entry.symbol === "EURUSD").market.latestBar.close,
    observation.market.latestBar.close);
});

test("the aggregate over the fragments is the document's own arithmetic", async t => {
  const { sql, db, env } = fixture(t);
  seedField(sql);
  const row = await publishAll(env, NOW);
  const document = JSON.parse(row.body).data;
  const aggregate = orb2FieldAggregateSql({ interval: "1d" });
  const counts = orb2FieldAggregateCounts(await db.prepare(aggregate.sql).bind(...aggregate.bindings).first());
  assert.deepEqual(counts.counts, {
    stored: document.status.counts.stored,
    observed: document.status.counts.observed,
    confirmed: document.status.counts.confirmed,
    held: document.status.counts.held
  });
  for (const type of document.beatTypes) {
    assert.equal(counts.beats[type.id], type.count, `${type.id} count should match the stored mask`);
  }
  assert.equal(counts.counts.held, 1, "the held commodity is the one berth without a market");
  assert.ok(counts.counts.confirmed >= 1);
  /* The filter parser is the request's contract. */
  assert.deepEqual(
    orb2FieldFilterFromUrl(new URL(`${ORIGIN}${ORB2_FIELD_ROUTE}?disc=STOCKS&symbols=nvda,!!&types=OBSERVATION,message`)),
    { disc: "stocks", symbols: ["NVDA"], types: ["observation", "message"] });
  assert.deepEqual(orb2FieldFilterFromUrl(new URL(`${ORIGIN}${ORB2_FIELD_ROUTE}?disc=nope&types=nope`)),
    { disc: null, symbols: [], types: [] });
});

test("the fallbacks for `.raw()` and `db.batch()` build the same document", async t => {
  const { sql, env } = fixture(t, { raw: false });
  seedField(sql);
  const plain = await publishAll(env, NOW);
  const { sql: batchedSql, env: batchedEnv } = fixture(t, { batched: false });
  seedField(batchedSql);
  const batched = await publishAll(batchedEnv, NOW);
  assert.equal(batched.body, plain.body);
  assert.equal(batched.etag, plain.etag);
  const served = await serveOrb2FieldSnapshot(requestFor("?disc=indices"), batchedEnv, { cache: null });
  const filtered = await served.json();
  assert.equal(filtered.data.observations.length, INDEX_SYMBOLS.length);
});

/* ── the numbers the runbook quotes ───────────────────────────────────────── */

/* Opt-in, because a benchmark is not an assertion: `ORB2_BENCH=1 node --test
   tests/orb2-field-publish-test.mjs` prints the CPU cost of the read path this
   publication replaced, of the quiet slice, and of one served request, measured
   against the same in-memory fixture. The runbook's table comes from here. */
const cpu = fn => {
  const before = process.cpuUsage();
  const started = process.hrtime.bigint();
  return Promise.resolve(fn()).then(result => {
    const usage = process.cpuUsage(before);
    return { result, cpuMs: (usage.user + usage.system) / 1000, wallMs: Number(process.hrtime.bigint() - started) / 1e6 };
  });
};

test("the runbook's CPU numbers are reproducible in this fixture", async t => {
  if (process.env.ORB2_BENCH !== "1") { t.skip("set ORB2_BENCH=1 to measure"); return; }
  const { sql, db, env, stats } = fixture(t);
  seedField(sql);
  const counters = () => ({ reads: stats.reads, writes: stats.writes, rowsRead: stats.rowsRead, batches: stats.batches });
  stats.reset();
  const cold = await cpu(() => publishOrb2FieldDocument(env, { now: NOW }));
  const coldCounters = counters();
  const row = await readOrb2FieldSnapshotRow(db, "1d");
  clearOrb2FieldSchemaCache();
  stats.reset();
  const live = await cpu(() => readOrb2FieldSnapshot(env, { now: NOW, interval: "1d" }));
  const liveCounters = counters();
  const envelope = await cpu(async () => JSON.stringify({
    success: true, environment: "orb2-server-field", data: live.result
  }).length);
  stats.reset();
  const quiet = await cpu(() => runOrb2FieldBuildSlice(env, { now: NOW + 60_000, intervals: [...ORB2_FIELD_INTERVALS] }));
  const quietCounters = counters();
  const fx = await db.prepare("SELECT payload FROM orb2_field_observations WHERE symbol='EURUSD'").first();
  const edited = JSON.parse(fx.payload);
  edited.market.latestBar.close += 1;
  edited.market.latestBar.high += 1;
  await db.prepare("UPDATE orb2_field_observations SET payload=?, updated_at=? WHERE symbol='EURUSD'")
    .run(JSON.stringify(edited), NOW + 120_000);
  stats.reset();
  const changed = await cpu(() => runOrb2FieldBuildSlice(env, { now: NOW + 120_000, intervals: ["1d"] }));
  const changedCounters = counters();
  stats.reset();
  const served = await cpu(() => serveOrb2FieldSnapshot(requestFor(), env, { cache: null }));
  const servedCounters = counters();
  const report = {
    bytes: row.bytes,
    observations: row.observations,
    coldPublish: { cpuMs: +cold.cpuMs.toFixed(2), wallMs: +cold.wallMs.toFixed(1), ...coldCounters },
    liveReadPath: { cpuMs: +live.cpuMs.toFixed(2), wallMs: +live.wallMs.toFixed(1), ...liveCounters },
    envelopeStringify: { cpuMs: +envelope.cpuMs.toFixed(2), bytes: envelope.result },
    quietMinuteSlice: { cpuMs: +quiet.cpuMs.toFixed(2), wallMs: +quiet.wallMs.toFixed(1), stages: quiet.result.stages, ...quietCounters },
    oneChangedBerthSlice: { cpuMs: +changed.cpuMs.toFixed(2), stages: changed.result.stages, ...changedCounters },
    servedRequest: { cpuMs: +served.cpuMs.toFixed(2), status: served.result.status, ...servedCounters }
  };
  console.log(`ORB2_BENCH ${JSON.stringify(report, null, 1)}`);
  assert.ok(report.servedRequest.cpuMs < report.liveReadPath.cpuMs,
    "serving the precomputed document is cheaper than reading the field live");
});

test("the freshness window helper matches the interval's published policy", () => {
  const policy = ORB2_FIELD_FRESHNESS["1d"];
  assert.equal(orb2FieldFragmentFreshUntil({ interval: "1d", observedAt: NOW, now: NOW }), NOW + policy.staleMs);
  assert.equal(
    orb2FieldFragmentFreshUntil({ interval: "1d", observedAt: NOW, now: NOW + policy.staleMs + 1 }),
    NOW + policy.expireMs);
  assert.equal(
    orb2FieldFragmentFreshUntil({ interval: "15m", observedAt: NOW, now: NOW }),
    NOW + ORB2_FIELD_FRESHNESS["15m"].staleMs);
  /* No usable timestamp: the label is due one window from now, never in the past. */
  assert.equal(orb2FieldFragmentFreshUntil({ interval: "1d", observedAt: 0, now: NOW }), NOW + policy.staleMs);
  assert.equal(ORB2_FIELD_SNAPSHOT_CACHE_SECONDS, 20);
  assert.ok(ORB2_FIELD_FRAGMENT_PAGE > 0 && ORB2_FIELD_FRAGMENT_PAGE <= 24);
});

test("an oversize document cannot starve the healthy intervals", async t => {
  const { sql, env } = fixture(t);
  seedField(sql);
  await publishAll(env, NOW);
  const sizes = {};
  for (const interval of ORB2_FIELD_INTERVALS) {
    sizes[interval] = (await readOrb2FieldSnapshotRow(env.COMMUNITY_DB, interval)).bytes;
  }
  /* A bound that only the 1d document exceeds: the other two still fit. */
  const bound = Math.max(...ORB2_FIELD_INTERVALS.filter(interval => interval !== "1d").map(interval => sizes[interval])) + 1;
  assert.ok(sizes["1d"] > bound, "the fixture needs the 1d document to be the oversize one");
  const tight = { ...env, ORB2_FIELD_SNAPSHOT_MAX_BYTES: String(bound) };
  const counts = new Map();
  const errors = [];
  for (let minute = 1; minute <= 12; minute += 1) {
    const summary = await runOrb2FieldBuildSlice(tight, { now: NOW + minute * 60_000 });
    for (const interval of summary.published) counts.set(interval, (counts.get(interval) || 0) + 1);
    errors.push(...summary.errors);
  }
  /* Each healthy document has to keep being rebuilt, not just publish once while it
     is still ahead in the rotation. */
  for (const interval of ["15m", "1h"]) {
    assert.ok((counts.get(interval) || 0) >= 2,
      `${interval} should keep publishing across the rotation (published ${counts.get(interval) || 0} time(s))`);
  }
  assert.ok(errors.some(message => message.includes("publication bound")), "the oversize document should still be refused");
});
