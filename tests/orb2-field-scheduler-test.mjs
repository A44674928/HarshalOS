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
  ORB2_FIELD_SCHEDULER_MAX_D1_READS,
  ORB2_FIELD_SCHEDULER_MAX_D1_WRITES,
  ORB2_FIELD_SCHEDULER_MAX_PROVIDER_CALLS_PER_TICK,
  ORB2_FIELD_SCHEDULER_MAX_WORK_ITEMS_PER_CYCLE,
  ORB2_FIELD_SCHEDULER_WORK_UNITS_PER_TICK,
  ORB2_FIELD_SCHEDULER_WORK_UNITS_PER_LANE_PER_TICK,
  ORB2_FIELD_PROVIDER_LANES,
  ORB2_FIELD_LANE_COUNT,
  ORB2_FIELD_WORK_LANE_IDS,
  ORB2_FIELD_D1_READ_CONCURRENCY,
  ORB2_MASSIVE_PER_MINUTE_PER_ASSET_CLASS,
  clearOrb2FieldSchemaCache,
  handleOrb2Field,
  heldFieldObservation,
  observationFromPacket,
  orb2FieldBeatTypesFor,
  orb2FieldFreshness,
  orb2FieldNeedsRefresh,
  orb2FieldRoster,
  enqueuePriorityRefresh,
  readOrb2FieldSnapshot,
  runOrb2FieldTick,
  sanitizeOrb2FieldObservation
} from "../worker/orb2-field.mjs";
import { TICKERBOT_WATCHLIST } from "../worker/good-intelligence-tickerbot.mjs";
import {
  CHARACTERS_CRYPTO_RANKING_SIZE,
  KRAKEN_TICKER_MAX_PAIRS,
  KRAKEN_TICKER_MAX_RESPONSE_BYTES,
  charactersCryptoRankingInternals,
  clearCharactersCryptoRankingCache,
  getCharactersCryptoRanking
} from "../worker/characters-crypto-ranking.mjs";
import { clearKrakenDailyBarCache } from "../worker/characters-kraken.mjs";
import { MASSIVE_FUTURES_CONTRACT_RETRY_COOLDOWN_MS } from "../worker/characters-futures-contracts.mjs";
import { clearMassiveCache } from "../worker/massive.mjs";

const MIGRATIONS = ["0005_tickerbot_call_ledger.sql", "0006_alpha_vantage_daily_call_ledger.sql", "0007_massive_daily_call_ledger.sql", "0009_orb2_server_field.sql", "0010_characters_crypto_ranking_cache.sql", "0011_massive_futures_contract_cache.sql", "0012_kraken_public_crypto.sql"]
  .map(file => readFileSync(new URL(`../migrations/community/${file}`, import.meta.url), "utf8"));
const NOW = Date.parse("2026-10-05T12:00:00.000Z");
const ORIGIN = "https://os.example";
const STOCK_SYMBOLS = TICKERBOT_WATCHLIST.map(entry => entry.symbol);
const TEST_CONTRACT_TICKERS = Object.freeze({ CL: "CLX6", NG: "NGX6", GC: "GCZ6", SI: "SIZ6", HG: "HGZ6", ALI: "ALIZ6", PL: "PLX6", PA: "PAX6", ZW: "ZWZ6", ZC: "ZCZ6", ZS: "ZSX6" });

function activeContracts(at = NOW) {
  const asOfDate = new Date(at).toISOString().slice(0, 10);
  return Object.fromEntries(Object.entries(TEST_CONTRACT_TICKERS).map(([productCode, ticker]) => [productCode, {
    ticker, productCode, provider: "Massive", asOfDate, lastTradeDate: "2026-11-20",
    daysToMaturity: Math.round((Date.parse("2026-11-20T00:00:00.000Z") - Date.parse(`${asOfDate}T00:00:00.000Z`)) / 86_400_000)
  }]));
}

function seedActiveContracts(sql, at = NOW, { exclude = [] } = {}) {
  const date = new Date(at).toISOString().slice(0, 10);
  const nextMidnight = Date.parse(`${date}T00:00:00.000Z`) + 86_400_000;
  const seed = activeContracts(at);
  for (const contract of Object.values(seed).filter(row => !exclude.includes(row.productCode))) {
    sql.prepare(`INSERT INTO massive_futures_contract_cache
      (product_code, contract_json, source_date, fetched_at, expires_at, last_attempt_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(contract.productCode, JSON.stringify(contract), date, at, nextMidnight, at, at);
  }
}

function fixture(t, { migrated = true, maxBindParameters = Infinity, options = false } = {}) {
  clearCharactersCryptoRankingCache();
  clearKrakenDailyBarCache();
  clearOrb2FieldSchemaCache();
  clearMassiveCache();
  const sql = new DatabaseSync(":memory:");
  if (migrated) for (const migration of MIGRATIONS) sql.exec(migration);
  if (options) sql.exec(readFileSync(new URL("../migrations/community/0013_orb2_options_field.sql", import.meta.url), "utf8"));
  t.after(() => sql.close());
  const stats = {
    reads: 0, writes: 0, rowsRead: 0, maxRowsPerRead: 0, queries: [],
    reset() { this.reads = 0; this.writes = 0; this.rowsRead = 0; this.maxRowsPerRead = 0; this.queries = []; }
  };
  const kindOf = query => /^\s*(?:SELECT|WITH|PRAGMA|EXPLAIN)\b/i.test(String(query)) ? "reads" : "writes";
  const db = {
    prepare(query) {
      stats.queries.push(String(query));
      let values = [];
      const kind = kindOf(query);
      const statement = {
        bind(...args) {
          if (args.length > maxBindParameters) throw new Error(`too many SQL variables: ${args.length}`);
          values = args;
          return statement;
        },
        async first() {
          stats[kind] += 1;
          const row = sql.prepare(query).get(...values) ?? null;
          if (kind === "reads" && row) { stats.rowsRead += 1; stats.maxRowsPerRead = Math.max(stats.maxRowsPerRead, 1); }
          return row;
        },
        async all() {
          stats[kind] += 1;
          const results = sql.prepare(query).all(...values);
          if (kind === "reads") {
            stats.rowsRead += results.length;
            stats.maxRowsPerRead = Math.max(stats.maxRowsPerRead, results.length);
          }
          return { results };
        },
        async run() { stats[kind] += 1; return sql.prepare(query).run(...values); }
      };
      return statement;
    },
    async batch(statements) { return Promise.all(statements.map(statement => statement.run())); }
  };
  return {
    sql, db, stats,
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

function krakenTickerRows(count = 52) {
  const result = { last: "0" };
  for (let index = 0; index < count; index += 1) {
    const symbol = index === 0 ? "BTC" : index === 1 ? "ETH" : index === 2 ? "ADA" : `C${String(index - 3).padStart(2, "0")}`;
    const volume = String(20_000 - index * 100);
    const vwap = String(50_000 - index * 100);
    result[`${symbol}/USD`] = {
      a: [vwap, "1", "1.0"], b: [vwap, "1", "1.0"], c: [vwap, "1"],
      v: [volume, volume], p: [vwap, vwap], t: [1, 1], l: [vwap, vwap], h: [vwap, vwap], o: vwap
    };
  }
  result["ADA/USDT"] = {
    a: ["0.25", "1", "1.0"], b: ["0.25", "1", "1.0"], c: ["0.25", "1"],
    v: ["120000", "100000"], p: ["0.25", "0.25"], t: [1, 1], l: ["0.25", "0.25"], h: ["0.25", "0.25"], o: "0.25"
  };
  return result;
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
    if (parsed.origin === "https://api.kraken.com") {
      seen.krakenRanking ||= [];
      seen.krakenBars ||= [];
      if (parsed.pathname === "/0/public/Ticker") {
        seen.krakenRanking.push(parsed.toString());
        assert.equal(parsed.searchParams.get("assetVersion"), "1", "the roster requests display-format Kraken pair identities");
        return Response.json({ error: [], result: krakenTickerRows() });
      }
      if (parsed.pathname === "/0/public/OHLC") {
        const requestedPair = parsed.searchParams.get("pair");
        const pair = requestedPair?.replace(/(USDT|USD)$/, "/$1");
        seen.krakenBars.push({ pair, requestedPair, interval: parsed.searchParams.get("interval"), url: parsed.toString() });
        assert.equal(parsed.searchParams.get("assetVersion"), "1", "daily bars preserve the exact display-format pair key");
        return Response.json({ error: [], result: {
          [pair]: bars(50).map(bar => [Math.floor(bar.time / 1000), String(bar.open), String(bar.high), String(bar.low), String(bar.close), "0", String(bar.volume), 1]),
          last: "0"
        } });
      }
      return Response.json({ error: ["unknown Kraken route"], result: {} }, { status: 404 });
    }
    if (parsed.origin === "https://api.massive.com") {
      if (parsed.pathname === "/futures/v1/contracts") {
        const productCode = parsed.searchParams.get("product_code");
        seen.contracts ||= [];
        seen.contracts.push(productCode);
        return Response.json({ results: [{
          ticker: TEST_CONTRACT_TICKERS[productCode], product_code: productCode,
          active: true, type: "single", date: parsed.searchParams.get("date"),
          last_trade_date: "2026-11-20", days_to_maturity: 46, name: `${productCode} futures`
        }] });
      }
      const ticker = decodeURIComponent(parsed.pathname.replace(/^\/v2\/aggs\/ticker\//, "").replace(/\/range\/.*$/, "").replace(/^\/futures\/v1\/aggs\//, ""));
      seen.massive.push(ticker);
      if (parsed.pathname.startsWith("/futures/v1/aggs/")) {
        /* The commodity Disc routes through the futures session family, whose
           bars arrive with a nanosecond window_start instead of a t. */
        return Response.json({
          request_id: "test-request",
          results: bars(50).map(bar => ({
            window_start: bar.time * 1e6, open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume
          }))
        });
      }
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

function seedSchedulerControl(sql, at = NOW) {
  sql.prepare(`INSERT INTO orb2_field_control
    (id, deploy_warm_at, manual_warm_at, warm_bursts, ranking_attempt_at, updated_at)
    VALUES (1, ?, NULL, 0, NULL, ?)
    ON CONFLICT(id) DO UPDATE SET deploy_warm_at=excluded.deploy_warm_at, updated_at=excluded.updated_at`)
    .run(at, at);
}

function seedFieldCursor(sql, key, { attempts = 1, at = NOW } = {}) {
  const lane = `cursor:${encodeURIComponent(key)}`;
  sql.prepare(`INSERT INTO orb2_field_queue
    (created_at, interval, symbol, reason, lane, claimed_at, attempts)
    VALUES (?, '__orb2_scheduler__', '__field_cursor__', 'field-cursor-v1', ?, NULL, ?)
    ON CONFLICT(interval, symbol, reason) DO UPDATE SET lane=excluded.lane, attempts=excluded.attempts, claimed_at=NULL`)
    .run(at, lane, attempts);
}

function seedDispatchCursor(sql, { laneId, attempts, at = NOW, options = false } = {}) {
  const catalog = globalThis.CharactersDiscCatalog || {};
  const count = list => Array.isArray(list)
    ? list.filter(entry => entry && /^[A-Z0-9._-]{1,24}$/.test(String(entry.symbol || ""))).length : 0;
  const futures = catalog.futures || catalog.commodities;
  const weights = [
    ["tickerbot-stocks", STOCK_SYMBOLS.length],
    ["kraken-crypto", CHARACTERS_CRYPTO_RANKING_SIZE + 1],
    ["massive-fx", count(catalog.fxCurrencies) || 23],
    ["massive-futures", count(Array.isArray(futures) ? futures.slice(0, 11) : futures) || 11],
    ["massive-indices", count(catalog.indices) || 32],
    ["massive-options", options ? STOCK_SYMBOLS.length * 5 : 0]
  ];
  const offset = Number.isSafeInteger(attempts) ? attempts
    : weights.slice(0, weights.findIndex(([id]) => id === laneId)).reduce((total, [, size]) => total + size, 0);
  assert.ok(offset >= 0, `dispatch lane ${laneId || ""} exists in the weighted schedule`);
  sql.prepare(`INSERT INTO orb2_field_queue
    (created_at, interval, symbol, reason, lane, claimed_at, attempts)
    VALUES (?, '__orb2_scheduler__', '__dispatch_cursor__', 'dispatch-cursor-v1', 'cursor:dispatch-v1', NULL, ?)
    ON CONFLICT(interval, symbol, reason) DO UPDATE SET lane=excluded.lane, attempts=excluded.attempts, claimed_at=NULL`)
    .run(at, offset);
}

/* Each provider lane owns its own durable cursor row: the state table's unique
   key is (interval, symbol, reason), so the lane id rides in the reason. */
const laneCursorReason = laneId => `field-cursor-v1:${laneId}`;

function seedLaneCursor(sql, laneId, key, { attempts = 1, at = NOW } = {}) {
  const lane = `cursor:${encodeURIComponent(key)}`;
  sql.prepare(`INSERT INTO orb2_field_queue
    (created_at, interval, symbol, reason, lane, claimed_at, attempts)
    VALUES (?, '__orb2_scheduler__', '__field_cursor__', ?, ?, NULL, ?)
    ON CONFLICT(interval, symbol, reason) DO UPDATE SET lane=excluded.lane, attempts=excluded.attempts, claimed_at=NULL`)
    .run(at, laneCursorReason(laneId), lane, attempts);
}

function readLaneCursor(sql, laneId) {
  return sql.prepare("SELECT lane, attempts FROM orb2_field_queue WHERE symbol='__field_cursor__' AND reason=?")
    .get(laneCursorReason(laneId));
}

async function primeCryptoRanking({ db, seen, at = NOW }) {
  const result = await getCharactersCryptoRanking({
    db, now: at, fetcher: providerFetch(seen), beforeFetch: async () => ({ ok: true })
  });
  assert.equal(result.ok, true, `test Kraken ranking seed should be valid: ${result.message || result.code || ""}`);
  return result.ranking;
}

function seedValidMarketObservation(sql, { symbol, discId, observedAt = NOW }) {
  const candidate = {
    schema: "gi-orb2-field-observation-v1", symbol, displaySymbol: symbol, name: symbol,
    sector: discId === "indices" ? "Index" : "Futures", discId, provider: "massive", interval: "1d",
    status: "bars", reason: "server-sweep", code: "", message: "",
    beatId: "00000000-0000-4000-8000-000000000099", observedAt, barTime: observedAt, confirmed: true,
    market: {
      status: "ready", source: "Massive test close", timeframe: "1d", dataShape: "ohlcv", synthetic: false,
      barCount: 40, volumeAvailable: true,
      latestBar: { time: observedAt, open: 100, high: 102, low: 99, close: 101, volume: 1000, confirmed: true },
      activityBar: { time: observedAt - 86_400_000, open: 99, high: 101, low: 98, close: 100, volume: 900, confirmed: true },
      previousClose: 100, changePct: 1, basis: 100, bands: { lower1000: 90, upper1000: 110 },
      vfi: { value: 1, signal: 0, available: true }, waveTrend: { wt1: 2, wt2: 1, zone: "neutral" }
    }
  };
  const parsed = sanitizeOrb2FieldObservation(candidate, NOW);
  assert.equal(parsed.ok, true, `test row ${discId}:${symbol} should pass the same sanitizer as production`);
  const observation = parsed.observation;
  sql.prepare(`INSERT INTO orb2_field_observations
    (interval, symbol, disc_id, provider, status, reason, beat_id, payload, observed_at, bar_time, confirmed, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(interval, symbol) DO UPDATE SET
      disc_id=excluded.disc_id, provider=excluded.provider, status=excluded.status, reason=excluded.reason,
      beat_id=excluded.beat_id, payload=excluded.payload, observed_at=excluded.observed_at,
      bar_time=excluded.bar_time, confirmed=excluded.confirmed, updated_at=excluded.updated_at`)
    .run("1d", symbol, discId, "massive", "bars", "server-sweep", observation.beatId,
      JSON.stringify(observation), observedAt, observedAt, 1, NOW);
}

function seedTickerbotStockObservation(sql, { symbol = "NVDA", observedAt = NOW } = {}) {
  const instrument = TICKERBOT_WATCHLIST.find(entry => entry.symbol === symbol);
  assert.ok(instrument, `${symbol} is on the reviewed Tickerbot roster`);
  const packet = {
    schema: "gi-market-context-v1", synthetic: false, source: "Tickerbot options fixture",
    symbol, timeframe: "1d", dataShape: "ohlcv", quoteCurrency: "USD", bars: bars(60)
  };
  const observation = observationFromPacket({
    packet, symbol, displaySymbol: instrument.displaySymbol || symbol, name: instrument.name || symbol,
    sector: instrument.sector || "Technology", discId: "stocks", provider: "tickerbot",
    providerId: symbol, interval: "1d", now: observedAt
  });
  assert.ok(observation, `${symbol} test stock packet should pass the production sanitizer`);
  sql.prepare(`INSERT INTO orb2_field_observations
    (interval, symbol, disc_id, provider, status, reason, beat_id, payload, observed_at, bar_time, confirmed, updated_at)
    VALUES ('1d', ?, 'stocks', 'tickerbot', 'bars', 'options-fixture', ?, ?, ?, ?, 1, ?)`)
    .run(symbol, observation.beatId, JSON.stringify(observation), observedAt, observation.barTime, observedAt);
  return observation;
}

function seedHeldObservation(sql, { symbol, discId, observedAt = NOW, code = "massive-upstream" }) {
  const observation = heldFieldObservation({
    symbol, displaySymbol: symbol, name: symbol, sector: discId === "indices" ? "Index" : "Commodity",
    discId, provider: "massive", interval: "1d", now: observedAt,
    code, message: "Provider did not return a usable daily bar."
  });
  assert.ok(observation, `held test row ${discId}:${symbol} should pass the production sanitizer`);
  sql.prepare(`INSERT INTO orb2_field_observations
    (interval, symbol, disc_id, provider, status, reason, beat_id, payload, observed_at, bar_time, confirmed, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(interval, symbol) DO UPDATE SET
      disc_id=excluded.disc_id, provider=excluded.provider, status=excluded.status, reason=excluded.reason,
      beat_id=excluded.beat_id, payload=excluded.payload, observed_at=excluded.observed_at,
      bar_time=excluded.bar_time, confirmed=excluded.confirmed, updated_at=excluded.updated_at`)
    .run("1d", symbol, discId, "massive", "unavailable", "server-sweep", observation.beatId,
      JSON.stringify(observation), observedAt, null, 0, NOW);
}

test("the server field roster is the reviewed catalog, in firing order, with no invented symbols", () => {
  const unresolved = orb2FieldRoster({ now: NOW });
  assert.equal(unresolved.commodities.length, 0, "product codes are held until an active Massive contract is verified");
  const roster = orb2FieldRoster({ now: NOW, commodityContracts: activeContracts() });
  assert.equal(roster.stocks.length, 52);
  assert.deepEqual(roster.stocks.map(stock => stock.symbol), STOCK_SYMBOLS,
    "the field's stock roster matches the reviewed Tickerbot watchlist exactly");
  assert.equal(roster.stocks[0].symbol, "NVDA", "the rotation is published in the reviewed firing order");
  assert.equal(roster.fx.length, 23);
  assert.equal(roster.commodities.length, 11);
  assert.ok(roster.commodities.some(entry => entry.symbol === "ALUMINUM" && entry.massive.productCode === "ALI" && entry.massiveTicker === "ALIZ6"),
    "Aluminum is on Disc4 only after the current ALI contract is verified");
  assert.equal(roster.indices.length, 32);
  assert.deepEqual(roster.dsSymbols, ["EURUSD", "JPYUSD", "GBPUSD", "CADUSD", "SEKUSD", "CHFUSD"]);
  assert.deepEqual(roster.discs, ["stocks", "fx", "commodities", "indices"]);
  assert.ok(roster.instruments.every(instrument => typeof instrument.discId === "string"));
  assert.equal(new Set(roster.stocks.map(stock => stock.symbol)).size, 52);
});

test("Orb field observations carry the explicit FBB-200/FBB-L60 comparison without changing the reference calculation", () => {
  const packet = {
    schema: "gi-market-context-v1", synthetic: false, source: "Orb integration fixture",
    symbol: "TEST", timeframe: "1d", dataShape: "ohlcv", quoteCurrency: "USD",
    bars: bars(200)
  };
  const observation = observationFromPacket({
    packet, symbol: "TEST", displaySymbol: "TEST", name: "TEST", sector: "Test",
    discId: "stocks", provider: "tickerbot", providerId: "TEST", interval: "1d", now: NOW
  });
  assert.ok(observation);
  const comparison = observation.market?.fbbComparison;
  assert.equal(comparison?.schema, "gi-fbb-comparison-v1");
  assert.equal(comparison?.provider, "tickerbot");
  assert.equal(comparison?.providerId, "TEST");
  assert.equal(comparison?.variants?.["FBB-200"]?.status, "available");
  assert.equal(comparison?.variants?.["FBB-200"]?.experimental, false);
  assert.equal(comparison?.variants?.["FBB-L60"]?.status, "available");
  assert.equal(comparison?.variants?.["FBB-L60"]?.experimental, true);
  assert.equal(comparison?.variants?.["FBB-200"]?.bandLen, 200);
  assert.equal(comparison?.variants?.["FBB-L60"]?.bandLen, 60);
  assert.match(comparison.comparison.authority, /does not supersede FBB-200/);
});

test("Orb field does not manufacture FBB-L60 capacity when the packet has fewer than 60 bars", () => {
  const packet = {
    schema: "gi-market-context-v1", synthetic: false, source: "Orb integration fixture",
    symbol: "TEST", timeframe: "1d", dataShape: "ohlcv", quoteCurrency: "USD",
    bars: bars(59)
  };
  const observation = observationFromPacket({
    packet, symbol: "TEST", displaySymbol: "TEST", name: "TEST", sector: "Test",
    discId: "stocks", provider: "tickerbot", providerId: "TEST", interval: "1d", now: NOW
  });
  assert.ok(observation);
  const variants = observation.market?.fbbComparison?.variants;
  assert.equal(variants?.["FBB-200"]?.status, "insufficient-history");
  assert.equal(variants?.["FBB-L60"]?.status, "insufficient-history");
  assert.equal(variants?.["FBB-L60"]?.availableBars, 59);
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

test("stored provider refusals use a bounded retry instead of masquerading as 24-hour coverage", () => {
  const successful = { interval: "1d", observedAt: NOW - 23 * 60 * 60_000, market: { latestBar: { close: 100 } } };
  const heldMassive = { interval: "1d", provider: "massive", observedAt: NOW - 6 * 60 * 60_000 + 1, market: null };
  const heldKraken = { interval: "1d", provider: "kraken", observedAt: NOW - 60 * 60_000 + 1, market: null };
  assert.equal(orb2FieldNeedsRefresh(successful, NOW, "massive"), false, "fresh market data follows its 24-hour expiry");
  assert.equal(orb2FieldNeedsRefresh({ ...successful, observedAt: NOW - 24 * 60 * 60_000 }, NOW, "massive"), true);
  assert.equal(orb2FieldNeedsRefresh(heldMassive, NOW, "massive"), false, "Massive failures wait for the six-hour retry window");
  assert.equal(orb2FieldNeedsRefresh({ ...heldMassive, observedAt: NOW - 6 * 60 * 60_000 }, NOW, "massive"), true);
  assert.equal(orb2FieldNeedsRefresh(heldKraken, NOW, "kraken"), false, "Kraken failures wait for the one-hour retry window");
  assert.equal(orb2FieldNeedsRefresh({ ...heldKraken, observedAt: NOW - 60 * 60_000 }, NOW, "kraken"), true);
});

test("the cold scheduler persists a single warm cursor step before making one Tickerbot request", async t => {
  const { sql, env, stats } = fixture(t);
  const seen = { urls: [], massive: [], tickerbot: [] };
  const at = nextClock();
  stats.reset();

  const first = await runOrb2FieldTick(env, null, deps(seen, { at }));
  assert.equal(first.ok, true);
  assert.equal(first.workUnit, "warm:15m:NVDA");
  assert.equal(first.warmProgressed, 1);
  assert.equal(first.cursorAdvanced, true);
  assert.equal(first.tickerbotCalls, 1);
  assert.equal(seen.tickerbot.length, 1);
  /* Cold calibration is Tickerbot work, so it spends the tickerbot-stocks lane's
     single unit and no more. It no longer suppresses the other lanes: Kraken and
     Massive allowances are separate envelopes that the warm-up does not touch,
     so a cold deployment warms the crypto, FX, futures, and index Discs in the
     same minute instead of waiting 156 minutes for the stock calibration to
     finish first. */
  assert.equal(first.workUnitsByLane.get("tickerbot-stocks"), 1,
    "the warm-up spends exactly one unit of the Tickerbot lane");
  assert.equal(first.lanes["tickerbot-stocks"].skipped, true,
    "the Tickerbot lane does not also rotate a stock behind the warm-up");
  assert.equal(first.krakenCalls, 1, "a cold ranking cache spends the crypto lane's own unit");
  assert.ok(first.massiveCalls >= 1, "the Massive lanes warm their own Discs in the same minute");
  assert.ok(first.workUnits <= ORB2_FIELD_SCHEDULER_WORK_UNITS_PER_TICK);
  assert.ok(first.providerRequests <= ORB2_FIELD_SCHEDULER_MAX_PROVIDER_CALLS_PER_TICK);
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_queue WHERE lane IN ('hot','sweep')").get().count, 0,
    "automatic warm-up does not materialize the 156-job queue");
  const warmCursor = sql.prepare("SELECT lane, attempts FROM orb2_field_queue WHERE symbol='__warm_cursor__'").get();
  assert.equal(warmCursor.lane, "cursor:warm-v1", "the next stable index is persisted before the provider call");
  assert.equal(warmCursor.attempts, 1);
  assert.ok(first.d1Reads <= ORB2_FIELD_SCHEDULER_MAX_D1_READS);
  assert.ok(first.d1Writes <= ORB2_FIELD_SCHEDULER_MAX_D1_WRITES);
  assert.ok(first.d1RowsRead <= first.d1Reads * 12);
  assert.ok(stats.maxRowsPerRead <= 12);

  const second = await runOrb2FieldTick(env, null, { now: () => at + 60_000, fetch: providerFetch(seen) });
  assert.equal(second.workUnit, "warm:15m:AAPL");
  assert.equal(second.warmProgressed, 1, "a later Cron invocation resumes the stored cursor, not a process-local position");
  assert.equal(sql.prepare("SELECT attempts FROM orb2_field_queue WHERE symbol='__warm_cursor__'").get().attempts, 2);
  assert.equal(new Set(seen.tickerbot).size, 2);
});

test("the persisted one-unit rotation eventually covers every reviewed provider lane and all 32 indices", async t => {
  const { sql, env, stats } = fixture(t);
  const seen = { urls: [], massive: [], tickerbot: [], krakenRanking: [], krakenBars: [], contracts: [] };
  const at = nextClock();
  seedActiveContracts(sql, at);
  seedSchedulerControl(sql, at);
  await primeCryptoRanking({ db: env.COMMUNITY_DB, seen, at });
  seedTickerbotStockObservation(sql, { symbol: "NVDA", observedAt: at - 2 * 86_400_000 });
  stats.reset();

  const rankingRow = sql.prepare("SELECT ranking_json FROM characters_crypto_ranking_cache WHERE id=1").get();
  const cryptoRanking = JSON.parse(rankingRow.ranking_json);
  const roster = orb2FieldRoster({ now: at, cryptoRanking, commodityContracts: activeContracts(at) });
  const reviewed = roster.instruments.length;
  assert.equal(roster.crypto.length, 52);
  assert.equal(roster.cryptoPairs.length, 1, "the exact ADA/USDT pair joins the Kraken daily rotation");
  assert.equal(roster.indices.length, 32, "the full 32-index roster is preserved");
  assert.equal(reviewed, 171);

  const coverage = () => new Set([
    ...seen.massive.map(ticker => `massive:${ticker}`),
    ...seen.tickerbot.filter(entry => entry.endsWith(":1d")).map(entry => `stocks:${entry.slice(0, -3)}`),
    ...seen.krakenBars.map(entry => `crypto:${entry.pair}`)
  ]);
  const expected = new Set([
    ...roster.stocks.map(instrument => `stocks:${instrument.symbol}`),
    ...roster.crypto.map(instrument => `crypto:${instrument.krakenPair}`),
    ...roster.cryptoPairs.map(instrument => `crypto:${instrument.krakenPair}`),
    ...roster.instruments.filter(instrument => ["fx", "commodities", "indices"].includes(instrument.discId))
      .map(instrument => `massive:${instrument.massiveTicker || instrument.massive?.ticker}`)
  ]);
  for (let tick = 0; tick < reviewed; tick += 1) {
    const summary = await runOrb2FieldTick(env, null, { now: () => at + tick * 60_000, fetch: providerFetch(seen) });
    assert.equal(summary.ok, true, `scheduled tick ${tick} should finish without a scheduler error: ${summary.errors.join(" ")}`);
    assert.ok(summary.workUnits <= ORB2_FIELD_SCHEDULER_WORK_UNITS_PER_TICK);
    assert.ok(summary.providerRequests <= ORB2_FIELD_SCHEDULER_MAX_PROVIDER_CALLS_PER_TICK);
    /* The binding constraint is per lane, not per tick: each provider envelope
       still sees at most one unit per scheduled minute. Massive's three
       non-Options lanes (currencies, futures, indices) each hold their own
       five-per-minute window, so up to three Massive calls in one tick is three
       separate envelopes spending one request each — never one envelope
       spending three. */
    assert.ok(summary.massiveCalls <= 3, `Massive lanes stay inside their own per-asset-class windows: ${summary.massiveCalls}`);
    assert.ok(summary.krakenCalls <= 1);
    assert.ok(summary.tickerbotCalls <= 1);
    assert.equal(summary.optionsCalls, 0, "the Options lane remains dormant without migration 0013");
    for (const laneId of ORB2_FIELD_WORK_LANE_IDS) {
      assert.ok((summary.workUnitsByLane.get(laneId) || 0) <= ORB2_FIELD_SCHEDULER_WORK_UNITS_PER_LANE_PER_TICK,
        `the ${laneId} lane spends at most one unit per scheduled minute`);
    }
    assert.ok(summary.d1Reads <= ORB2_FIELD_SCHEDULER_MAX_D1_READS);
    assert.ok(summary.d1Writes <= ORB2_FIELD_SCHEDULER_MAX_D1_WRITES);
    assert.ok(stats.maxRowsPerRead <= 12, "scheduled D1 reads remain targeted and row-capped");
  }
  const fetched = coverage();
  assert.equal(fetched.size, reviewed, `every reviewed instrument is covered by its exclusive provider (${reviewed})`);
  assert.deepEqual([...fetched].sort(), [...expected].sort(), "no provider substitutes for another Disc");
  assert.equal(seen.massive.length, roster.fx.length + roster.commodities.length + roster.indices.length);
  assert.equal(seen.krakenBars.length, roster.crypto.length + roster.cryptoPairs.length);
  assert.equal(seen.krakenRanking.length, 1, "the D1 roster cache avoids a Kraken ranking call on every Cron tick");
  assert.equal(seen.contracts.length, 0, "cached active contracts avoid discovery fan-out during market rotation");
  assert.equal(seen.tickerbot.filter(entry => entry.endsWith(":1d")).length, roster.stocks.length);
  assert.ok(seen.massive.includes("C:EURUSD"), "FX routes through the reviewed Massive catalog mapping");
  assert.ok(seen.massive.includes("GCZ6"), "commodities route through the fixed active Massive futures contract");
  assert.ok(seen.massive.includes("ALIZ6"), "Aluminum routes through its verified active Massive futures contract");
  assert.ok(seen.krakenBars.some(entry => entry.pair === "BTC/USD"), "Crypto daily bars retain Kraken's exact USD pair identity");
  assert.ok(seen.krakenBars.some(entry => entry.pair === "ADA/USDT"), "the cross-quote OHLC request retains ADA/USDT instead of inventing USDT/ADA");
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_observations WHERE interval='1d' AND disc_id='crypto' AND provider='massive'").get().count, 0);
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_observations WHERE interval='1d' AND disc_id='stocks' AND provider='massive'").get().count, 0);
  CLOCK = at + reviewed * 60_000;
});

test("a full cycle wraps to the first stable key without resetting on each Cron tick", async t => {
  const { sql, env } = fixture(t);
  const seen = { urls: [], massive: [], tickerbot: [], krakenRanking: [] };
  const at = Date.parse("2026-10-06T12:00:00.000Z");
  seedActiveContracts(sql, at);
  seedSchedulerControl(sql, at);
  const ranking = await primeCryptoRanking({ db: env.COMMUNITY_DB, seen, at });
  const roster = orb2FieldRoster({ now: at, cryptoRanking: ranking, commodityContracts: activeContracts(at) });
  /* Wrapping is now a per-lane property: each lane owns a cursor over its own
     partition, so a lane at its last stable key wraps to its own first key. The
     stock lane is seeded at its final instrument with a durable ordinal equal
     to the lane length. */
  const stockLane = "tickerbot-stocks";
  seedLaneCursor(sql, stockLane, `tickerbot:1d:${roster.stocks.at(-1).symbol}`, { attempts: roster.stocks.length, at });

  const wrapped = await runOrb2FieldTick(env, null, deps(seen, { at }));
  assert.equal(wrapped.lanes[stockLane].workUnit, `tickerbot:1d:${roster.stocks[0].symbol}`);
  assert.equal(wrapped.cursorReset, false);
  assert.equal(wrapped.cursorAdvanced, true);
  assert.equal(wrapped.workUnitsByLane.get(stockLane), 1, "the lane spends one unit even while wrapping");
  const following = await runOrb2FieldTick(env, null, { now: () => at + 60_000, fetch: providerFetch(seen) });
  assert.equal(following.lanes[stockLane].workUnit, `tickerbot:1d:${roster.stocks[1].symbol}`,
    "the second invocation resumes after the wrapped key instead of starting over");
  assert.equal(readLaneCursor(sql, stockLane).attempts, roster.stocks.length + 2);
});

test("a legacy whole-field cursor seeds each lane ordinal instead of replaying the field from zero", async t => {
  const { sql, env } = fixture(t);
  const seen = { urls: [], massive: [], tickerbot: [], krakenRanking: [] };
  const at = Date.parse("2026-10-06T12:00:00.000Z");
  seedActiveContracts(sql, at);
  seedSchedulerControl(sql, at);
  const ranking = await primeCryptoRanking({ db: env.COMMUNITY_DB, seen, at });
  const roster = orb2FieldRoster({ now: at, cryptoRanking: ranking, commodityContracts: activeContracts(at) });
  /* The cursor row written by the single-cursor scheduler, from before lanes had
     their own rows. Its ordinal must not be discarded: restarting every lane at
     item zero is exactly the whole-field replay the durable ordinal exists to
     prevent. */
  seedFieldCursor(sql, `massive:index:${roster.indices.at(-1).symbol}`, { attempts: roster.instruments.length, at });

  const first = await runOrb2FieldTick(env, null, deps(seen, { at }));
  assert.equal(first.ok, true);
  const stockLane = "tickerbot-stocks";
  const seededIndex = roster.instruments.length % roster.stocks.length;
  assert.equal(first.lanes[stockLane].workUnit, `tickerbot:1d:${roster.stocks[(seededIndex + 1) % roster.stocks.length].symbol}`,
    "the legacy ordinal seeds the lane and rotation continues from there");
  assert.equal(first.cursorReset, false, "seeding from the legacy ordinal is a migration, not a corruption recovery");
  const cursor = readLaneCursor(sql, stockLane);
  assert.match(cursor.lane, /^cursor:tickerbot/, "the lane now owns its own durable cursor row");
  assert.ok(cursor.attempts > roster.instruments.length, "the legacy ordinal is carried forward, never restarted at zero");

  const second = await runOrb2FieldTick(env, null, { now: () => at + 60_000, fetch: providerFetch(seen) });
  assert.equal(second.lanes[stockLane].workUnit, `tickerbot:1d:${roster.stocks[(seededIndex + 2) % roster.stocks.length].symbol}`,
    "the seeded lane advances by one on the next tick like any other cursor");
});

test("a stale cursor resumes from its durable ordinal; corrupt cursor state blocks instead of replaying the field", async t => {
  const recovered = fixture(t);
  const seen = { urls: [], massive: [], tickerbot: [], krakenRanking: [] };
  const at = Date.parse("2026-10-06T12:00:00.000Z");
  seedActiveContracts(recovered.sql, at);
  seedSchedulerControl(recovered.sql, at);
  await primeCryptoRanking({ db: recovered.env.COMMUNITY_DB, seen, at });
  const stockLane = "tickerbot-stocks";
  seedLaneCursor(recovered.sql, stockLane, "removed:catalog-key", { attempts: 5, at });

  const resumed = await runOrb2FieldTick(recovered.env, null, deps(seen, { at }));
  assert.equal(resumed.cursorReset, true);
  assert.equal(resumed.lanes[stockLane].workUnit, `tickerbot:1d:${STOCK_SYMBOLS[5]}`,
    "the missing stable key uses the saved ordinal and does not replay from roster item zero");
  assert.equal(resumed.lanes[stockLane].cursorReset, true);
  assert.equal(resumed.workUnitsByLane.get(stockLane), 1, "recovery still spends exactly one unit of that lane");
  const cursor = readLaneCursor(recovered.sql, stockLane);
  assert.match(cursor.lane, /^cursor:tickerbot/);
  assert.equal(cursor.attempts, 6);

  const corrupted = fixture(t);
  const blockedSeen = { urls: [], massive: [], tickerbot: [], krakenRanking: [] };
  seedActiveContracts(corrupted.sql, at);
  seedSchedulerControl(corrupted.sql, at);
  await primeCryptoRanking({ db: corrupted.env.COMMUNITY_DB, seen: blockedSeen, at });
  seedLaneCursor(corrupted.sql, stockLane, "untrusted-key", { attempts: -1, at });
  const blocked = await runOrb2FieldTick(corrupted.env, null, deps(blockedSeen, { at }));
  assert.equal(blocked.cursorReset, true);
  /* Fail-closed is now per lane, and deliberately so. The corrupted row is one
     lane's durable ordinal; every other lane's cursor is independently valid.
     Halting the whole field because one lane's ordinal is unreadable would be
     an availability regression, so the affected lane blocks — spending no unit
     and no Tickerbot call — while the other lanes keep rotating inside their
     own envelopes. */
  assert.equal(blocked.lanes[stockLane].ran, false);
  assert.equal(blocked.lanes[stockLane].workUnit, null);
  assert.equal(blocked.lanes[stockLane].cursorReset, true);
  assert.equal(blocked.workUnitsByLane.get(stockLane) || 0, 0, "a blocked lane spends nothing");
  assert.equal(blocked.tickerbotCalls, 0, "a blocked lane sends no provider request");
  assert.match(blocked.notes.join(" "), /blocked without replaying the lane/i);
  assert.equal(readLaneCursor(corrupted.sql, stockLane).lane, "cursor:blocked-v1");
  const stillBlocked = await runOrb2FieldTick(corrupted.env, null, { now: () => at + 60_000, fetch: providerFetch(blockedSeen) });
  assert.equal(stillBlocked.lanes[stockLane].ran, false, "corrupt state stays fail-closed instead of silently starting a new whole cycle");
  assert.equal(stillBlocked.tickerbotCalls, 0);
  assert.equal(readLaneCursor(corrupted.sql, stockLane).lane, "cursor:blocked-v1");
});

test("successful cold futures discovery retains the dispatch slot until an instrument bar is fetched", async t => {
  const { sql, env } = fixture(t);
  const seen = { urls: [], massive: [], tickerbot: [], contracts: [] };
  const at = nextClock();
  seedSchedulerControl(sql, at);
  seedDispatchCursor(sql, { laneId: "massive-futures", at });
  const selectedOrdinal = sql.prepare(
    "SELECT attempts FROM orb2_field_queue WHERE symbol='__dispatch_cursor__' AND reason='dispatch-cursor-v1'"
  ).get().attempts;

  const discovery = await runOrb2FieldTick(env, null, { now: () => at, fetch: providerFetch(seen) });
  assert.equal(discovery.ok, true, discovery.errors.join(" "));
  assert.equal(discovery.workUnit, "massive:futures-contract-discovery");
  assert.equal(discovery.workUnits, 1);
  assert.deepEqual(seen.contracts, ["CL"]);
  assert.equal(sql.prepare(
    "SELECT attempts FROM orb2_field_queue WHERE symbol='__dispatch_cursor__' AND reason='dispatch-cursor-v1'"
  ).get().attempts, selectedOrdinal,
  "a successful contract lookup is preparatory work, so the same lane gets its instrument slot next");

  const bars = await runOrb2FieldTick(env, null, { now: () => at + 60_000, fetch: providerFetch(seen) });
  assert.equal(bars.ok, true, bars.errors.join(" "));
  assert.equal(bars.workUnit, "massive:futures:WTI");
  assert.equal(bars.workUnits, 1);
  assert.ok(seen.massive.includes("CLX6"), "the active dated futures contract receives its own bar request");
  assert.equal(sql.prepare(
    "SELECT attempts FROM orb2_field_queue WHERE symbol='__dispatch_cursor__' AND reason='dispatch-cursor-v1'"
  ).get().attempts, selectedOrdinal + 1);
});

test("priority work claims one row per tick and never mistakes cursor sentinels for queue jobs", async t => {
  const { sql, env } = fixture(t);
  const seen = { urls: [], massive: [], tickerbot: [], krakenRanking: [] };
  const at = Date.parse("2026-10-06T12:00:00.000Z");
  seedActiveContracts(sql, at);
  seedSchedulerControl(sql, at);
  await primeCryptoRanking({ db: env.COMMUNITY_DB, seen, at });
  seedFieldCursor(sql, `tickerbot:1d:${STOCK_SYMBOLS[0]}`, { attempts: 1, at });
  await enqueuePriorityRefresh(env.COMMUNITY_DB, [
    { symbol: "AAPL", interval: "1d" }, { symbol: "MSFT", interval: "1d" }
  ], { now: at });

  const first = await runOrb2FieldTick(env, null, deps(seen, { at }));
  assert.equal(first.workUnit, "queue:1d:AAPL");
  assert.equal(first.queueClaimed, 1);
  assert.equal(first.queueCompleted, 1);
  /* Queued work is Tickerbot work, so it spends that lane's single unit and the
     lane does not also rotate a stock behind it. The other lanes keep their own
     envelopes and are unaffected by the queue. */
  assert.equal(first.workUnitsByLane.get("tickerbot-stocks"), 1);
  assert.equal(first.lanes["tickerbot-stocks"].skipped, true);
  assert.equal(first.tickerbotCalls, 1, "one queued row costs exactly one Tickerbot request");
  assert.ok(first.workUnits <= ORB2_FIELD_SCHEDULER_WORK_UNITS_PER_TICK);
  assert.ok(first.providerRequests <= ORB2_FIELD_SCHEDULER_MAX_PROVIDER_CALLS_PER_TICK);
  assert.equal(sql.prepare("SELECT attempts FROM orb2_field_queue WHERE symbol='__field_cursor__' AND reason='field-cursor-v1'").get().attempts, 1,
    "queued work preempts but does not overwrite regular rotation progress");
  assert.equal(readLaneCursor(sql, "tickerbot-stocks"), undefined,
    "a preempted lane never touches its own cursor row");
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_queue WHERE lane='hot'").get().count, 1);

  const second = await runOrb2FieldTick(env, null, { now: () => at + 60_000, fetch: providerFetch(seen) });
  assert.equal(second.workUnit, "queue:1d:MSFT");
  assert.equal(second.queueCompleted, 1);
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_queue WHERE lane='hot'").get().count, 0);
  const rotation = await runOrb2FieldTick(env, null, { now: () => at + 120_000, fetch: providerFetch(seen) });
  assert.equal(rotation.lanes["tickerbot-stocks"].workUnit, `tickerbot:1d:${STOCK_SYMBOLS[1]}`,
    "after the one-row queue drains, scheduled rotation continues from the saved cursor");
  assert.equal(rotation.queueClaimed, 0);
  /* The lane adopted the whole-field cursor's stored key on its first rotation,
     so the two queued minutes did not cost the stock lane its position: it
     resumed from the seeded key and persisted the item it then ran. The lane
     value is URI-encoded. */
  assert.equal(readLaneCursor(sql, "tickerbot-stocks").lane,
    `cursor:${encodeURIComponent(`tickerbot:1d:${STOCK_SYMBOLS[1]}`)}`);
});

test("scheduled D1 reads stay targeted and row-capped when the observations table is large", async t => {
  const { sql, env, stats } = fixture(t);
  const seen = { urls: [], massive: [], tickerbot: [], krakenRanking: [] };
  const at = Date.parse("2026-10-06T12:00:00.000Z");
  seedActiveContracts(sql, at);
  seedSchedulerControl(sql, at);
  await primeCryptoRanking({ db: env.COMMUNITY_DB, seen, at });
  const insert = sql.prepare(`INSERT INTO orb2_field_observations
    (interval, symbol, disc_id, provider, status, reason, beat_id, payload, observed_at, bar_time, confirmed, updated_at)
    VALUES ('1d', ?, 'stocks', 'tickerbot', 'bars', 'legacy', ?, '{}', ?, NULL, 0, ?)`);
  for (let index = 0; index < 1_500; index += 1) {
    const symbol = `BULK${String(index).padStart(4, "0")}`;
    const time = at - 2 * 86_400_000;
    insert.run(symbol, `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`, time, time);
  }
  seedDispatchCursor(sql, { laneId: "massive-futures", at });
  stats.reset();
  const summary = await runOrb2FieldTick(env, null, deps(seen, { at }));
  assert.equal(summary.ok, true, summary.errors.join(" "));
  assert.match(summary.workUnit || "", /^massive:futures:/);
  assert.equal(summary.workUnitsByLane.get("massive-futures"), 1);
  /* The selected serialized lane still uses targeted cache/observation reads
     and remains bounded even when the observations table is large. */
  assert.ok(summary.workUnits <= ORB2_FIELD_SCHEDULER_WORK_UNITS_PER_TICK);
  assert.ok(summary.d1Reads <= ORB2_FIELD_SCHEDULER_MAX_D1_READS);
  assert.ok(summary.d1Writes <= ORB2_FIELD_SCHEDULER_MAX_D1_WRITES);
  assert.ok(summary.d1RowsRead <= summary.d1Reads * 12);
  assert.ok(stats.maxRowsPerRead <= 12);
  assert.ok(sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_observations").get().count >= 1_500);
  const fieldSelects = stats.queries.filter(query => /^\s*SELECT\b/i.test(query) && /FROM\s+orb2_field_observations/i.test(query));
  assert.ok(fieldSelects.length > 0);
  assert.ok(fieldSelects.every(query => /\bWHERE\b/i.test(query) && /\bLIMIT\b/i.test(query)),
    "the scheduler does not load or count the full large observations table");
  const futuresSelect = stats.queries.find(query => /FROM\s+massive_futures_contract_cache/i.test(query));
  assert.match(futuresSelect, /\bLIMIT\b/i, "contract cache reads are limited to the reviewed product-code batch");
});

test("the Options field advances discovery and four EOD bars as five separate bounded work units", async t => {
  const { sql, env, stats } = fixture(t, { options: true });
  const seen = { urls: [], massive: [], tickerbot: [], krakenRanking: [] };
  const at = Date.parse("2026-10-06T12:00:00.000Z");
  seedActiveContracts(sql, at);
  seedSchedulerControl(sql, at);
  await primeCryptoRanking({ db: env.COMMUNITY_DB, seen, at });
  seedTickerbotStockObservation(sql, { symbol: "NVDA", observedAt: at - 2 * 86_400_000 });
  seedDispatchCursor(sql, { laneId: "massive-options", at, options: true });
  /* No Options-lane cursor is seeded, so the lane starts at its own first slot
     (`options:NVDA:0`) and advances one slot per scheduled minute. The other
     lanes rotate independently in the same ticks; their work is asserted
     through the per-lane report rather than whole-tick totals. */

  const contracts = [
    ["call", 160, "C00160000"], ["call", 195, "C00195000"],
    ["put", 160, "P00160000"], ["put", 130, "P00130000"]
  ].map(([contractType, strike, suffix]) => ({
    ticker: `O:NVDA261016${suffix}`, contract_type: contractType,
    expiration_date: "2026-10-16", strike_price: strike, underlying_ticker: "NVDA"
  }));
  const fetch = async input => {
    const url = new URL(String(input));
    seen.urls.push(url.toString());
    if (url.pathname === "/v3/reference/options/contracts") {
      assert.equal(url.searchParams.get("limit"), "250", "the existing documented Massive Options request contract stays fixed");
      /* The lane rotates past NVDA into the next underlying, so the mock answers
         honestly for any underlying instead of only the one under test: NVDA has
         a selectable universe, everything else has none. */
      if (url.searchParams.get("underlying_ticker") !== "NVDA") return Response.json({ results: [] });
      return Response.json({ results: contracts });
    }
    if (decodeURIComponent(url.pathname).startsWith("/v2/aggs/ticker/O:NVDA")) {
      return Response.json({ results: [{
        t: at, o: 10, h: 12, l: 9, c: 11, v: 25
      }] });
    }
    return providerFetch(seen)(input);
  };

  /* The Options lane is the longest in the field (52 underlyings x 5 slots), so
     it spends more than one unit per scheduled minute: each of its units costs
     exactly one request in Massive's separate 'options' asset-class window, and
     the lane documents a four-unit budget that leaves headroom inside that
     window. Discovery plus four EOD bars is therefore still five separate
     bounded units, but they complete in two minutes rather than five, and the
     four units inside a minute are taken sequentially so the sliding-window
     gate still sees one ordered request at a time. */
  const optionsLane = ORB2_FIELD_PROVIDER_LANES.find(lane => lane.id === "massive-options");
  const optionsUnitBudget = optionsLane.maxWorkUnitsPerTick;
  assert.equal(optionsUnitBudget, 1);
  assert.ok(optionsUnitBudget <= ORB2_MASSIVE_PER_MINUTE_PER_ASSET_CLASS,
    "the Options lane budget stays inside its own documented per-minute window");

  const workUnits = [];
  let ticks = 0;
  let lastSummary = null;
  /* The lane keeps rotating past NVDA into the next underlying, which is the
     point of the larger budget, so only NVDA's five slots are collected here. */
  while (workUnits.length < 5 && ticks < 8) {
    lastSummary = await runOrb2FieldTick(env, null, { now: () => at + ticks * 60_000, fetch });
    ticks += 1;
    assert.equal(lastSummary.ok, true, lastSummary.errors.join(" "));
    const lane = lastSummary.lanes["massive-options"];
    workUnits.push(...lane.workUnits.filter(key => key.startsWith("options:NVDA:")));
    /* Per-minute envelope: never more units or Options requests than the lane
       budget, and never more than the asset-class window allows. */
    assert.equal(lastSummary.workUnitsByLane.get("massive-options"), lane.workUnits.length);
    assert.ok(lane.workUnits.length <= optionsUnitBudget);
    assert.equal(lastSummary.optionsCalls, lane.providerCalls,
      "every request this lane sent is charged to the Options asset-class window");
    assert.ok(lastSummary.optionsCalls <= ORB2_MASSIVE_PER_MINUTE_PER_ASSET_CLASS);
    assert.ok(lastSummary.workUnits <= ORB2_FIELD_SCHEDULER_WORK_UNITS_PER_TICK);
    assert.ok(lastSummary.providerRequests <= ORB2_FIELD_SCHEDULER_MAX_PROVIDER_CALLS_PER_TICK);
    assert.ok(lastSummary.d1Reads <= ORB2_FIELD_SCHEDULER_MAX_D1_READS);
    assert.ok(lastSummary.d1Writes <= ORB2_FIELD_SCHEDULER_MAX_D1_WRITES);
    assert.ok(stats.maxRowsPerRead <= 12);
  }
  assert.deepEqual(workUnits, [
    "options:NVDA:0", "options:NVDA:1", "options:NVDA:2", "options:NVDA:3", "options:NVDA:4"
  ]);
  assert.equal(ticks, 2, "the five slots complete in two scheduled minutes, not five");
  assert.equal(lastSummary.optionsObserved, 1, "the fifth cursor slot completes the four-contract EOD field");
  const stored = sql.prepare("SELECT selection_json, bars_json, status FROM orb2_options_observations WHERE symbol='NVDA'").get();
  assert.equal(stored.status, "ready");
  assert.equal(JSON.parse(stored.selection_json).length, 4);
  assert.equal(JSON.parse(stored.bars_json).length, 4);
  /* Scoped to NVDA: a cached selected universe is not rediscovered while its
     four daily bars are filled. Other underlyings the lane reached in the same
     minutes are outside this test's subject. */
  const discoveryUrls = seen.urls.filter(url => {
    const parsed = new URL(url);
    return parsed.pathname === "/v3/reference/options/contracts" &&
      parsed.searchParams.get("underlying_ticker") === "NVDA";
  });
  assert.equal(discoveryUrls.length, 1,
    "a cached selected universe is not rediscovered while its four daily bars are filled");
  assert.equal(seen.urls.filter(url => decodeURIComponent(new URL(url).pathname).startsWith("/v2/aggs/ticker/O:NVDA")).length, 4);
});

test("Kraken ranking rejects over-budget bodies and pair catalogs without partial or alternate-venue fallback", async t => {
  const { sql, env } = fixture(t);
  const at = Date.parse("2026-10-06T12:00:00.000Z");
  let fetchCalls = 0;
  const oversized = await getCharactersCryptoRanking({
    db: env.COMMUNITY_DB, now: at,
    beforeFetch: async () => ({ ok: true }),
    fetcher: async () => {
      fetchCalls += 1;
      return new Response("{}", { headers: { "Content-Type": "application/json", "Content-Length": String(KRAKEN_TICKER_MAX_RESPONSE_BYTES + 1) } });
    }
  });
  assert.equal(oversized.ok, false);
  assert.equal(oversized.code, "kraken-ticker-too-large");
  assert.equal(fetchCalls, 1);
  const uncommitted = sql.prepare("SELECT ranking_json FROM characters_crypto_ranking_cache WHERE id=1").get();
  assert.ok(uncommitted && !uncommitted.ranking_json, "the failed body does not become a partial ranking cache");

  const payload = { error: [], result: Object.create(null) };
  const valid = { a: ["1", "1", "1"], b: ["1", "1", "1"], c: ["1", "1"], v: ["100", "100"], p: ["1", "1"] };
  for (let index = 0; index < CHARACTERS_CRYPTO_RANKING_SIZE; index += 1) {
    payload.result[`AS${String(index).padStart(2, "0")}/USD`] = valid;
  }
  for (let index = CHARACTERS_CRYPTO_RANKING_SIZE; index < KRAKEN_TICKER_MAX_PAIRS; index += 1) {
    payload.result[`PAIR${String(index).padStart(5, "0")}/BTC`] = {};
  }
  const bounded = charactersCryptoRankingInternals.normalizeKrakenTicker(payload, { at });
  assert.equal(bounded.instruments.length, CHARACTERS_CRYPTO_RANKING_SIZE);
  assert.ok(bounded.crossPairs.length <= CHARACTERS_CRYPTO_RANKING_SIZE);
  payload.result["OVERLIMIT/BTC"] = {};
  assert.equal(charactersCryptoRankingInternals.normalizeKrakenTicker(payload, { at }), null,
    "the 8,193rd pair fails closed before it can expand the ranking worklist");
});

test("one FX work unit may use exactly the two-request Massive-to-Alpha fallback", async t => {
  const { sql, env } = fixture(t);
  const seen = { urls: [], massive: [], tickerbot: [], alphaVantage: [], krakenRanking: [] };
  const at = Date.parse("2026-10-06T12:00:00.000Z");
  seedActiveContracts(sql, at);
  seedSchedulerControl(sql, at);
  await primeCryptoRanking({ db: env.COMMUNITY_DB, seen, at });
  /* Select the FX lane's first weighted slot while retaining its independent
     stable-key cursor and its reviewed fallback behavior. */
  seedDispatchCursor(sql, { laneId: "massive-fx", at });
  env.ORB2_FX_PROVIDER_MODE = "fallback";
  env.ALPHA_VANTAGE_API_KEY = "test-alpha-key";
  const fallbackSeries = Object.create(null);
  for (let index = 0; index < 60; index += 1) {
    const date = new Date(at - (59 - index) * 86_400_000).toISOString().slice(0, 10);
    fallbackSeries[date] = { "1. open": String(1.10 + index / 10_000), "2. high": String(1.12 + index / 10_000),
      "3. low": String(1.09 + index / 10_000), "4. close": String(1.11 + index / 10_000) };
  }
  const normalFetch = providerFetch(seen);
  const fetch = async (input, options = {}) => {
    const url = new URL(String(input));
    if (url.hostname === "api.massive.com" && decodeURIComponent(url.pathname).includes("C:EURUSD")) {
      seen.massive.push("C:EURUSD:429");
      return Response.json({ status: "ERROR", message: "temporary refusal" }, { status: 429 });
    }
    if (url.hostname === "www.alphavantage.co") {
      seen.alphaVantage.push("EURUSD");
      return Response.json({ "Time Series FX (Daily)": fallbackSeries });
    }
    return normalFetch(input, options);
  };
  const summary = await runOrb2FieldTick(env, null, { now: () => at, fetch });
  assert.equal(summary.ok, true);
  const fx = summary.lanes["massive-fx"];
  assert.equal(fx.workUnit, "massive:fx:EURUSD");
  assert.equal(summary.workUnitsByLane.get("massive-fx"), 1,
    "provider fallback remains inside the selected instrument's one work unit");
  assert.equal(fx.providerCalls, 2, "the fallback is structurally capped at Massive plus one Alpha Vantage request");
  assert.equal(fx.maxProviderCallsPerUnit, 2, "the FX lane is the only lane reviewed for a two-request unit");
  assert.equal(summary.alphaVantageCalls, 1);
  assert.deepEqual(seen.alphaVantage, ["EURUSD"]);
  assert.equal(seen.massive.filter(entry => entry.includes("EURUSD")).length, 1,
    "exactly one Massive request is attempted for the pair before the fallback");
  assert.equal(fx.held, 1);
  assert.equal(fx.observed, 0, "the Alpha-only rescue remains outside the field's canonical Massive/Tickerbot/Kraken observation schema");
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_observations WHERE interval='1d' AND symbol='EURUSD'").get().count, 0,
    "fallback output is never mislabeled as a Massive field observation");
  /* Every other lane stays inside its own single-request ceiling in the same
     tick, which is the point of bounding per lane rather than only in total. */
  for (const laneId of ORB2_FIELD_WORK_LANE_IDS) {
    const entry = summary.lanes[laneId];
    if (!entry) continue;
    assert.ok(entry.providerCalls <= entry.maxProviderCallsPerUnit,
      `the ${laneId} lane stayed inside its own provider ceiling (${entry.providerCalls}/${entry.maxProviderCallsPerUnit})`);
  }
});

test("cold warm-up restores its cursor after a provider preflight refusal with no upstream attempt", async t => {
  const { sql, env } = fixture(t);
  const seen = { urls: [], massive: [], tickerbot: [] };
  const at = Date.parse("2026-10-06T12:00:00.000Z");
  sql.prepare(`INSERT INTO tickerbot_call_ledger
    (utc_month, attempted_calls, provider_budget, worker_limit, updated_at) VALUES (?,?,?,?,?)`)
    .run("2026-10", 10_000, 10_000, 10_000, at);

  const refused = await runOrb2FieldTick(env, null, { now: () => at, fetch: providerFetch(seen) });
  assert.equal(refused.workUnit, "warm:15m:NVDA");
  assert.equal(refused.warmProgressed, 0);
  /* Scoped to the Tickerbot lane: the other lanes draw from Kraken and Massive
     envelopes the exhausted Tickerbot ledger says nothing about, so they still
     run. What must not happen is a Tickerbot request. */
  assert.equal(refused.tickerbotCalls, 0);
  assert.equal(refused.lanes["tickerbot-stocks"].providerCalls, 0);
  assert.deepEqual(seen.tickerbot, [], "the exhausted allowance is checked before fetch");
  let cursor = sql.prepare("SELECT lane, attempts FROM orb2_field_queue WHERE symbol='__warm_cursor__'").get();
  assert.equal(cursor.lane, "cursor:warm-v1");
  assert.equal(cursor.attempts, 0, "a no-attempt preflight refusal does not consume warm progress");

  sql.prepare("DELETE FROM tickerbot_call_ledger WHERE utc_month='2026-10'").run();
  const admitted = await runOrb2FieldTick(env, null, { now: () => at + 60_000, fetch: providerFetch(seen) });
  assert.equal(admitted.workUnit, "warm:15m:NVDA", "the same work item resumes after admission is available");
  assert.equal(admitted.warmProgressed, 1);
  assert.equal(admitted.tickerbotCalls, 1, "one admitted warm unit costs exactly one Tickerbot request");
  assert.deepEqual(seen.tickerbot, ["NVDA:15m"]);
  cursor = sql.prepare("SELECT attempts FROM orb2_field_queue WHERE symbol='__warm_cursor__'").get();
  assert.equal(cursor.attempts, 1);
});

test("an attempted warm-up failure advances one unit and does not replay the cold batch", async t => {
  const { sql, env } = fixture(t);
  const seen = { urls: [], massive: [], tickerbot: [], attempts: [] };
  const at = Date.parse("2026-10-06T12:00:00.000Z");
  const normalFetch = providerFetch(seen);
  const fetch = async (input, options = {}) => {
    const url = new URL(String(input));
    const match = /^\/v2\/bars\/([^/]+)\/(15m|1h|1d)$/.exec(url.pathname);
    if (match) {
      const symbol = decodeURIComponent(match[1]);
      seen.attempts.push(`${symbol}:${match[2]}`);
      if (symbol === "NVDA") return Response.json({ error: "temporary" }, { status: 500 });
    }
    return normalFetch(input, options);
  };
  const failed = await runOrb2FieldTick(env, null, { now: () => at, fetch });
  assert.equal(failed.workUnit, "warm:15m:NVDA");
  assert.equal(failed.warmProgressed, 1, "an actual attempted upstream refusal is recorded and advanced");
  assert.equal(failed.tickerbotCalls, 1, "the attempted refusal did reach the provider exactly once");
  assert.ok(failed.held >= 1, "the attempted refusal is represented by a bounded held berth");
  const held = sql.prepare("SELECT status, provider FROM orb2_field_observations WHERE symbol='NVDA' AND interval='15m'").get();
  assert.equal(held.status, "unavailable");
  assert.equal(held.provider, "tickerbot");

  const following = await runOrb2FieldTick(env, null, { now: () => at + 60_000, fetch });
  assert.equal(following.workUnit, "warm:15m:AAPL");
  assert.equal(following.warmProgressed, 1);
  assert.deepEqual(seen.attempts, ["NVDA:15m", "AAPL:15m"], "the failing first unit is not replayed as a whole-batch retry");
  assert.equal(sql.prepare("SELECT attempts FROM orb2_field_queue WHERE symbol='__warm_cursor__'").get().attempts, 2);
});

test("automatic cold warm-up advances one durable unit on each Tickerbot slot without a 156-row burst", async t => {
  const { sql, env } = fixture(t);
  const seen = { urls: [], massive: [], tickerbot: [], krakenRanking: [] };
  const at = nextClock();
  let progressed = 0;
  let ticks = 0;
  const maxTicks = ORB2_FIELD_TICKERBOT_BURST_CALLS * 4;
  for (; ticks < maxTicks && progressed < ORB2_FIELD_TICKERBOT_BURST_CALLS; ticks += 1) {
    const summary = await runOrb2FieldTick(env, null, { now: () => at + ticks * 60_000, fetch: providerFetch(seen) });
    assert.equal(summary.ok, true, summary.errors.join(" "));
    assert.ok(summary.warmProgressed === 0 || summary.warmProgressed === 1);
    if (summary.warmProgressed === 1) {
      progressed += 1;
      assert.equal(summary.tickerbotCalls, 1);
      assert.equal(summary.workUnitsByLane.get("tickerbot-stocks"), 1);
      assert.match(summary.workUnit || "", /^warm:/);
    }
    assert.ok(summary.workUnits <= ORB2_FIELD_SCHEDULER_WORK_UNITS_PER_TICK);
    assert.ok(summary.providerRequests <= ORB2_FIELD_SCHEDULER_MAX_PROVIDER_CALLS_PER_TICK);
    for (const laneId of ORB2_FIELD_WORK_LANE_IDS) {
      assert.ok((summary.workUnitsByLane.get(laneId) || 0) <= ORB2_FIELD_SCHEDULER_WORK_UNITS_PER_LANE_PER_TICK,
        `the ${laneId} lane spends at most one unit per scheduled minute`);
    }
    assert.ok(summary.d1Reads <= ORB2_FIELD_SCHEDULER_MAX_D1_READS);
    assert.ok(summary.d1Writes <= ORB2_FIELD_SCHEDULER_MAX_D1_WRITES);
  }
  assert.equal(progressed, ORB2_FIELD_TICKERBOT_BURST_CALLS, "three passes over the weighted base schedule eventually complete all warm units");
  assert.equal(seen.tickerbot.length, ORB2_FIELD_TICKERBOT_BURST_CALLS);
  assert.equal(new Set(seen.tickerbot).size, ORB2_FIELD_TICKERBOT_BURST_CALLS, "no interval/symbol is beaten twice during cursor progression");
  assert.ok(seen.krakenRanking.length >= 1, "the crypto lane still advances while Tickerbot warm-up waits for its own slots");
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_observations WHERE provider='tickerbot'").get().count, 156);
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_queue WHERE lane IN ('hot','sweep')").get().count, 0);
  const sentinelRows = sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_queue WHERE interval='__orb2_scheduler__'").get().count;
  assert.ok(sentinelRows <= 2 + ORB2_FIELD_LANE_COUNT,
    `only a small set of durable cursor sentinels are persisted (${sentinelRows}); warm work is not enqueued as 156 rows`);
  assert.equal(sql.prepare("SELECT attempts FROM orb2_field_queue WHERE symbol='__warm_cursor__'").get().attempts, 156);
  assert.equal(sql.prepare("SELECT attempted_calls AS calls FROM tickerbot_call_ledger").get().calls, 156);
  CLOCK = at + ticks * 60_000;
});

test("durable provider budgets hold refused queue work and the legacy Massive daily count stays telemetry-only", async t => {
  const first = fixture(t);
  const seen = { urls: [], massive: [], tickerbot: [] };
  const at = nextClock();
  await enqueuePriorityRefresh(first.env.COMMUNITY_DB, [{ symbol: "AAPL", interval: "1d" }], { now: at });
  first.sql.prepare("INSERT INTO tickerbot_call_ledger (utc_month, attempted_calls, provider_budget, worker_limit, updated_at) VALUES (?,?,?,?,?)")
    .run("2026-10", 10_000, 10_000, 10_000, at);
  const refused = await runOrb2FieldTick(first.env, null, deps(seen, { at }));
  assert.equal(refused.tickerbotCalls, 0);
  assert.equal(refused.queueClaimed, 1);
  assert.equal(seen.tickerbot.length, 0, "an exhausted monthly ledger sends no upstream request");
  assert.equal(first.sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_queue WHERE lane='hot'").get().count, 1,
    "a refused user-priority item remains durable rather than disappearing");
  assert.ok([...refused.notes, ...refused.errors].some(note => /allowance|exhausted|ledger/i.test(note)),
    "an exhausted ledger is named in the tick summary");

  const second = fixture(t);
  const massiveSeen = { urls: [], massive: [], tickerbot: [], krakenRanking: [] };
  const massiveAt = nextClock();
  second.sql.prepare("INSERT INTO massive_daily_call_ledger (utc_day, attempted_calls, daily_limit, updated_at) VALUES (?,?,?,?)")
    .run("2026-10-05", 300, 300, massiveAt);
  seedActiveContracts(second.sql, massiveAt);
  seedSchedulerControl(second.sql, massiveAt);
  await primeCryptoRanking({ db: second.env.COMMUNITY_DB, seen: massiveSeen, at: massiveAt });
  /* Explicitly position the durable dispatch pointer on FX; this test checks
     provider-ledger accounting rather than cross-lane throughput. */
  seedDispatchCursor(second.sql, { laneId: "massive-fx", at: massiveAt });
  const telemetry = await runOrb2FieldTick(second.env, null, deps(massiveSeen, { at: massiveAt }));
  assert.match(telemetry.lanes["massive-fx"].workUnit, /^massive:fx:/);
  assert.equal(telemetry.lanes["massive-fx"].providerCalls, 1,
    "one FX unit uses the unchanged Massive pacing gate");
  assert.equal(massiveSeen.massive.filter(entry => entry.startsWith("C:")).length, 1,
    "the currencies window spent exactly one request");
  const ledger = second.sql.prepare("SELECT attempted_calls AS calls FROM massive_daily_call_ledger WHERE utc_day='2026-10-05'").get();
  /* The daily ledger was seeded already exhausted at its historical 300 ceiling.
     Every Massive lane still got through, because that ceiling is telemetry and
     not a provider gate — the count simply kept climbing past it. */
  assert.ok(ledger.calls > 300,
    `Massive D1 telemetry records admitted provider attempts without imposing the historical daily ceiling (got ${ledger.calls})`);
  assert.equal(ledger.calls, 300 + telemetry.massiveCalls,
    "each admitted Massive attempt is recorded exactly once");
});

test("a missing Worker secret and a missing binding fail closed with a readable reason", async t => {
  const { env } = fixture(t);
  const seen = { urls: [], massive: [], tickerbot: [] };
  const noSecrets = await runOrb2FieldTick({ COMMUNITY_DB: env.COMMUNITY_DB }, null, deps(seen, { at: nextClock() }));
  assert.equal(noSecrets.massiveCalls, 0);
  assert.equal(noSecrets.tickerbotCalls, 0);
  assert.ok(noSecrets.notes.some(note => /TICKERBOT_API_KEY/.test(note)) && noSecrets.notes.some(note => /MASSIVE_API_KEY/.test(note)),
    "missing provider secrets are named instead of silently substituting another source");
  assert.equal(seen.krakenRanking.length, 1, "public Kraken market data requires neither a Worker secret nor an account API key");
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

test("the snapshot serves the stored field with honest beat-type counts and the Dollar Strength (DS) reference", async t => {
  const { sql, env } = fixture(t);
  const seen = { urls: [], massive: [], tickerbot: [], krakenRanking: [], krakenBars: [], contracts: [] };
  const at = Math.max(nextClock(), Date.parse("2026-10-06T12:00:00.000Z"));
  seedActiveContracts(sql, at);
  seedSchedulerControl(sql, at);
  await primeCryptoRanking({ db: env.COMMUNITY_DB, seen, at });
  seedTickerbotStockObservation(sql, { symbol: "NVDA", observedAt: at - 2 * 86_400_000 });
  const rankingRow = sql.prepare("SELECT ranking_json FROM characters_crypto_ranking_cache WHERE id=1").get();
  const cryptoRanking = JSON.parse(rankingRow.ranking_json);
  const roster = orb2FieldRoster({ now: at, cryptoRanking, commodityContracts: activeContracts(at) });
  const ticksForOnePass = roster.instruments.length;
  const noCallIndexUnits = [];
  for (let tick = 0; tick < ticksForOnePass; tick += 1) {
    const summary = await runOrb2FieldTick(env, null, { now: () => at + tick * 60_000, fetch: providerFetch(seen) });
    assert.equal(summary.ok, true, `snapshot fixture tick ${tick}: ${summary.errors.join(" ")}`);
    assert.ok(summary.workUnits <= ORB2_FIELD_SCHEDULER_WORK_UNITS_PER_TICK);
    assert.ok(summary.providerRequests <= ORB2_FIELD_SCHEDULER_MAX_PROVIDER_CALLS_PER_TICK);
    const indexUnit = summary.lanes["massive-indices"]?.workUnit;
    if (indexUnit?.startsWith("massive:index:") && !summary.massiveCalls) {
      noCallIndexUnits.push({ workUnit: indexUnit, notes: summary.notes, errors: summary.errors });
    }
  }
  assert.equal(seen.massive.length, roster.fx.length + roster.commodities.length + roster.indices.length,
    `provider calls by lane: FX=${seen.massive.filter(ticker => ticker.startsWith("C:")).length}, futures=${seen.massive.filter(ticker => !ticker.startsWith("C:") && !ticker.startsWith("I:")).length}, indices=${seen.massive.filter(ticker => ticker.startsWith("I:")).length}; unattempted=${JSON.stringify(noCallIndexUnits)}`);
  assert.equal(seen.tickerbot.filter(entry => entry.endsWith(":1d")).length, roster.stocks.length);
  assert.equal(seen.krakenBars.length, roster.crypto.length + roster.cryptoPairs.length);
  const snapshotAt = at + ticksForOnePass * 60_000;
  CLOCK = snapshotAt;
  /* A symbol retired from the reviewed catalog can remain in D1. It must not
     inflate the current Disc's `stored of reviewed` count. */
  const existingCommodity = sql.prepare("SELECT * FROM orb2_field_observations WHERE interval='1d' AND disc_id='commodities' LIMIT 1").get();
  const orphanSymbol = "RETIRED_METAL";
  const orphanPayload = JSON.parse(existingCommodity.payload);
  Object.assign(orphanPayload, { symbol: orphanSymbol, displaySymbol: orphanSymbol, name: "Retired metal", observedAt: snapshotAt });
  sql.prepare(`INSERT INTO orb2_field_observations
    (interval, symbol, disc_id, provider, status, reason, beat_id, payload, observed_at, bar_time, confirmed, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    "1d", orphanSymbol, "commodities", "legacy", existingCommodity.status, existingCommodity.reason,
    existingCommodity.beat_id, JSON.stringify(orphanPayload), snapshotAt, existingCommodity.bar_time,
    existingCommodity.confirmed, snapshotAt
  );
  const response = await handleOrb2Field(new Request(`${ORIGIN}${ORB2_FIELD_ROUTE}?interval=1d&disc=stocks`), env, { now: () => snapshotAt });
  const responseBody = await response.text();
  assert.equal(response.status, 200, responseBody);
  const parsedResponse = JSON.parse(responseBody);
  const { data } = parsedResponse;
  assert.equal(data.schema, "gi-orb2-field-v1");
  assert.equal(data.status.source, "server-field");
  assert.equal(data.status.continuous, true);
  assert.equal(data.status.cron, "*/1 * * * *");
  assert.equal(data.observations.length, 52);
  assert.ok(data.observations.every(observation => observation.discId === "stocks"));
  assert.equal(data.status.counts.observed, 52);
  assert.equal(data.status.massive.perMinute, ORB2_MASSIVE_PER_MINUTE_PER_ASSET_CLASS);
  assert.equal(data.status.massive.perMinutePerAssetClass, ORB2_MASSIVE_PER_MINUTE_PER_ASSET_CLASS);
  assert.equal(data.status.massive.perMinuteScope, "per-asset-class");
  assert.equal(data.status.massive.dailyLimit, null);
  assert.equal(data.status.massive.remainingToday, null);
  assert.equal(data.status.massive.exhausted, false);
  assert.equal(data.status.massive.ledger, "provider-rate-class");
  assert.equal(data.status.futuresContracts.cache, "ready");
  assert.equal(data.status.futuresContracts.reviewedProducts, 11);
  assert.equal(data.status.futuresContracts.activeContracts, 11);
  assert.equal(data.status.futuresContracts.staleFallback, false);
  assert.ok(data.observations.every(observation => observation.motion && observation.motion.schema === "characters-market-motion-v1"));
  const types = Object.fromEntries(data.beatTypes.map(type => [type.id, type]));
  assert.equal(types.observation.live, true);
  assert.equal(types.message.live, false);
  assert.equal(types.trade.live, false);
  assert.equal(types.trade.count, 52, "every stored OHLCV observation can carry the trade scenario");
  assert.match(types.permission.summary, /Nothing becomes permitted/);
  assert.equal(data.ds.status, "ready", "the six aligned FX closes produce the fixed benchmark on the server");
  assert.ok(data.ds.value > 0);
  assert.equal(data.ds.inputCount, 6);

  /* The per-Disc status describes the stored field even when the response is
     narrowed to one Disc, so the constellation view can label every orb. */
  const discs = Object.fromEntries(data.status.discs.map(disc => [disc.id, disc]));
  assert.deepEqual(Object.keys(discs), ["stocks", "fx", "crypto", "commodities", "indices"]);
  assert.equal(discs.stocks.instruments, 52);
  assert.equal(discs.stocks.stored, 52, "every reviewed stock berth is stored after the pass");
  assert.equal(discs.stocks.observed, 52);
  assert.equal(discs.stocks.covered, true);
  assert.equal(discs.fx.instruments, 23);
  assert.equal(discs.fx.stored, 23);
  assert.equal(discs.commodities.instruments, 11);
  assert.equal(discs.commodities.stored, 11, "all eleven reviewed futures berths are stored by the automatic rotation; an unreviewed D1 row is excluded");
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_observations WHERE interval='1d' AND disc_id='commodities'").get().count, 12,
    "the unmatched legacy row stays preserved without inflating the reviewed count");
  const commodityPayload = JSON.parse(sql.prepare("SELECT payload FROM orb2_field_observations WHERE interval='1d' AND disc_id='commodities' LIMIT 1").get().payload);
  assert.equal(commodityPayload.provider, "massive");
  assert.equal(commodityPayload.market.massiveContract.provider, "Massive");
  assert.ok(commodityPayload.market.massiveContract.ticker.startsWith(commodityPayload.market.massiveContract.productCode),
    "Orb 2 retains the exact active-contract identity used for the futures bars");
  assert.equal(discs.indices.instruments, 32);
  assert.equal(discs.indices.stored, 32, "the 32-card index Disc is populated by the automatic rotation");
  assert.equal(discs.crypto.assets, 52, "Kraken's ranking cache reports the reviewed primary USD-quoted asset roster");
  assert.equal(discs.crypto.instruments, 53, "the field denominator includes the 52 primary pair feeds and one direct cross-quote feed");
  assert.equal(discs.crypto.stored, 53, "the automatic rotation stores each exact Kraken pair once");
  assert.equal(discs.crypto.active, 53);
  assert.equal(discs.crypto.covered, true);
  assert.ok(discs.fx.newestAt > 0 && discs.crypto.newestAt > 0);
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_observations WHERE interval='1d' AND disc_id='stocks' AND provider='tickerbot'").get().count, 52);
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_observations WHERE interval='1d' AND disc_id='stocks' AND provider='massive'").get().count, 0);
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_observations WHERE interval='1d' AND disc_id='crypto' AND provider='massive'").get().count, 0);
  /* Stocks are Tickerbot-only; Crypto is Kraken-only; Massive is exclusive to
     FX, active commodity futures, and indices. */
  for (const [discId, expected] of [["fx", 23], ["commodities", 11], ["indices", 32]]) {
    const massiveRows = sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_observations WHERE interval='1d' AND disc_id=? AND provider='massive'").get(discId).count;
    assert.equal(massiveRows, expected, `${discId} is populated by the automatic Massive rotation`);
  }
  const cryptoRows = sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_observations WHERE interval='1d' AND disc_id='crypto' AND provider='kraken'").get().count;
  assert.equal(cryptoRows, 53, "Disc3's primary and cross-quote pairs are populated through exact Kraken daily bars");
  const adaUsdt = JSON.parse(sql.prepare("SELECT payload FROM orb2_field_observations WHERE interval='1d' AND disc_id='crypto' AND symbol='ADA-USDT'").get().payload);
  assert.deepEqual([adaUsdt.krakenPair, adaUsdt.baseAsset, adaUsdt.quoteAsset], ["ADA/USDT", "ADA", "USDT"]);
  assert.equal(seen.krakenRanking.length, 1, "the D1 cache prevents a ranking call on every scheduled tick");
  assert.equal(seen.krakenBars.length, 53);

  const narrowed = await handleOrb2Field(new Request(`${ORIGIN}${ORB2_FIELD_ROUTE}?interval=1d&symbols=AAPL,MSFT&types=observation`), env, { now: () => snapshotAt });
  const narrowedData = (await narrowed.json()).data;
  assert.deepEqual(narrowedData.observations.map(observation => observation.symbol).sort(), ["AAPL", "MSFT"]);
  assert.equal(narrowedData.beatTypes.find(type => type.id === "message").available, false,
    "a dialed-out beat type is reported as not requested rather than silently rendered");
});

test("Disc activation status separates fresh commodity/index data from held rows and preserves reviewed denominators", async t => {
  const { sql, env } = fixture(t);
  const catalog = globalThis.CharactersDiscCatalog;
  const commodities = catalog.commodities;
  const indices = catalog.indices;
  assert.equal(commodities.length, 11, "Aluminum is now the eleventh reviewed commodity product");
  for (const [index, entry] of commodities.entries()) {
    if (index < 3) seedValidMarketObservation(sql, { symbol: entry.symbol, discId: "commodities" });
    else seedHeldObservation(sql, { symbol: entry.symbol, discId: "commodities" });
  }
  for (const [index, entry] of indices.entries()) {
    if (index === 0) seedValidMarketObservation(sql, { symbol: entry.symbol, discId: "indices" });
    else seedHeldObservation(sql, { symbol: entry.symbol, discId: "indices" });
  }

  const response = await handleOrb2Field(new Request(`${ORIGIN}${ORB2_FIELD_ROUTE}?interval=1d`), env, { now: () => NOW });
  const responseBody = await response.text();
  assert.equal(response.status, 200, responseBody);
  const parsedResponse = JSON.parse(responseBody);
  const { data } = parsedResponse;
  const discs = Object.fromEntries(data.status.discs.map(disc => [disc.id, disc]));
  assert.deepEqual({ instruments: discs.commodities.instruments, stored: discs.commodities.stored, active: discs.commodities.active,
    observed: discs.commodities.observed, held: discs.commodities.held, pending: discs.commodities.pending },
  { instruments: 11, stored: 11, active: 3, observed: 3, held: 8, pending: 0 });
  assert.equal(discs.commodities.complete, false);
  assert.equal(discs.commodities.members.length, 11);
  assert.equal(discs.commodities.members.find(member => member.symbol === commodities[3].symbol).status, "held");
  assert.deepEqual({ instruments: discs.indices.instruments, stored: discs.indices.stored, active: discs.indices.active,
    observed: discs.indices.observed, held: discs.indices.held, pending: discs.indices.pending },
  { instruments: 32, stored: 32, active: 1, observed: 1, held: 31, pending: 0 });
  assert.equal(discs.indices.complete, false);
  assert.equal(discs.indices.members.length, 32);
  const heldIndex = discs.indices.members.find(member => member.status === "held");
  assert.equal(heldIndex.code, "massive-upstream");
  assert.match(heldIndex.message, /did not return/);
});

test("large Orb 2 snapshots split symbol reads under D1's bind-variable limit", async t => {
  const { sql, env } = fixture(t, { maxBindParameters: 100 });
  const symbols = Array.from({ length: 130 }, (_, index) => `TEST${String(index).padStart(3, "0")}`);
  const motionFor = symbol => ({
    schema: "characters-market-motion-v1", symbol, mood: "drift", status: "unknown",
    gauge: {}, npc: {}, object: {}, item: {}, frozen: true
  });
  for (let index = 0; index < symbols.length; index += 1) {
    const symbol = symbols[index];
    const beatId = `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
    const payload = {
      schema: "gi-orb2-field-observation-v1", symbol, displaySymbol: symbol, discId: "stocks",
      provider: "tickerbot", interval: "1d", status: "bars", reason: "server-sweep", beatId,
      observedAt: NOW, market: null, motion: motionFor(symbol)
    };
    sql.prepare(`INSERT INTO orb2_field_observations
      (interval, symbol, disc_id, provider, status, reason, beat_id, payload, observed_at, bar_time, confirmed, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run("1d", symbol, "stocks", "tickerbot", "bars", "server-sweep", beatId, JSON.stringify(payload), NOW, null, 0, NOW);
  }

  /* The unfiltered 1d snapshot also looks up matching 15m companion rows.
     Before batching, that IN clause contained all 130 symbols and D1 rejected it. */
  const response = await handleOrb2Field(new Request(`${ORIGIN}${ORB2_FIELD_ROUTE}?interval=1d`), env, { now: () => NOW });
  const responseBody = await response.text();
  assert.equal(response.status, 200, responseBody);
  const parsedResponse = JSON.parse(responseBody);
  const { data } = parsedResponse;
  assert.equal(data.observations.length, 130);
  assert.equal(data.observations[0].symbol, symbols[0]);
  assert.equal(data.observations.at(-1).symbol, symbols.at(-1));
});

test("a full daily snapshot reuses its field rows for Disc status and Dollar Strength (DS)", async t => {
  const { sql, env } = fixture(t);
  seedHeldObservation(sql, { symbol: "EURUSD", discId: "fx" });
  const fieldQueries = [];
  const prepare = env.COMMUNITY_DB.prepare.bind(env.COMMUNITY_DB);
  env.COMMUNITY_DB.prepare = query => {
    if (/FROM\s+orb2_field_observations/i.test(query)) fieldQueries.push(String(query).replace(/\s+/g, " "));
    return prepare(query);
  };

  const response = await handleOrb2Field(new Request(`${ORIGIN}${ORB2_FIELD_ROUTE}`), env, { now: () => NOW });
  const responseBody = await response.text();
  assert.equal(response.status, 200, responseBody);
  const parsedResponse = JSON.parse(responseBody);
  const { data } = parsedResponse;
  const fx = data.status.discs.find(disc => disc.id === "fx");
  assert.equal(fx.stored, 1);
  assert.equal(fx.held, 1);
  assert.equal(fieldQueries.length, 1, "the daily payload scan is shared by rendering, Disc status, and Dollar Strength (DS)");
});

test("manual tick returns 202 when the continuous scheduler already holds the field lease", async t => {
  const { sql, env } = fixture(t);
  sql.prepare("INSERT INTO orb2_field_runs (utc_day, updated_at, lock_owner, lock_at) VALUES (?, ?, ?, ?)")
    .run("2026-10-05", NOW, "scheduled-tick", NOW);

  const response = await handleOrb2Field(new Request(ORIGIN + ORB2_FIELD_ROUTE, {
    method: "POST",
    headers: { Origin: ORIGIN, "Content-Type": "application/json" },
    body: JSON.stringify({ schema: "gi-orb2-field-request-v1", action: "tick", interval: "1d" })
  }), env, { now: () => NOW, fetch: providerFetch({ urls: [], massive: [], tickerbot: [] }) });

  const body = await response.json();
  assert.equal(response.status, 202);
  assert.equal(body.success, true);
  assert.equal(body.data.status, "already-running");
  assert.match(body.data.notes[0], /already processing the field/i);
  assert.equal(sql.prepare("SELECT lock_owner FROM orb2_field_runs WHERE utc_day = ?").get("2026-10-05").lock_owner, "scheduled-tick");
});

test("the snapshot fails visibly when D1 or migration 0009 is missing", async t => {
  const { env } = fixture(t, { migrated: false });
  const response = await handleOrb2Field(new Request(`${ORIGIN}${ORB2_FIELD_ROUTE}`), env, { now: () => NOW });
  assert.equal(response.status, 503);
  assert.match((await response.json()).message, /migrations through 0012/i);
  const unbound = await handleOrb2Field(new Request(`${ORIGIN}${ORB2_FIELD_ROUTE}`), {}, { now: () => NOW });
  assert.equal(unbound.status, 503);
  assert.match((await unbound.json()).message, /COMMUNITY_DB/);
});

test("stored observations are validated on the way out, so a hand-edited row cannot claim a provider", () => {
  const valid = {
    schema: "gi-orb2-field-observation-v1", symbol: "AAPL", displaySymbol: "AAPL", discId: "stocks",
    provider: "tickerbot", interval: "1d", status: "bars", reason: "server-sweep", beatId: "00000000-0000-4000-8000-000000000001",
    observedAt: NOW, market: null, motion: null
  };
  assert.equal(sanitizeOrb2FieldObservation(valid, NOW).ok, false, "an observation must carry a market summary or a directive");
  const withMotion = { ...valid, motion: { schema: "characters-market-motion-v1", mood: "drift", status: "unknown", gauge: {}, npc: {}, object: {}, item: {}, frozen: true } };
  assert.equal(sanitizeOrb2FieldObservation(withMotion, NOW).ok, true);
  assert.equal(sanitizeOrb2FieldObservation({ ...withMotion, provider: "alpha" }, NOW).ok, false);
  assert.equal(sanitizeOrb2FieldObservation({ ...withMotion, provider: "massive" }, NOW).ok, false, "Massive cannot write a stock berth");
  assert.equal(sanitizeOrb2FieldObservation({ ...withMotion, interval: "1mo" }, NOW).ok, false);
  assert.equal(sanitizeOrb2FieldObservation({ ...withMotion, provider: "tickerbot", discId: "fx" }, NOW).ok, false);
  const crypto = { ...withMotion, symbol: "BTC", displaySymbol: "BTC/USD", discId: "crypto", provider: "kraken",
    providerId: "BTC/USD", krakenPair: "BTC/USD", rankingProvider: "Kraken" };
  assert.equal(sanitizeOrb2FieldObservation(crypto, NOW).ok, true);
  assert.equal(sanitizeOrb2FieldObservation({ ...crypto, providerId: "OTHER/USD" }, NOW).ok, false);
  assert.equal(sanitizeOrb2FieldObservation({ ...crypto, provider: "massive", krakenPair: undefined, rankingProvider: undefined }, NOW).ok, false);
  assert.equal(sanitizeOrb2FieldObservation({ ...withMotion, observedAt: NOW + 86_400_000 }, NOW).ok, false);
  const beatId = sanitizeOrb2FieldObservation(withMotion, NOW).observation;
  assert.deepEqual(orb2FieldBeatTypesFor(beatId), ["observation", "permission"],
    "a directive without a market observation offers the observation and permission scenarios only");
  assert.deepEqual(orb2FieldBeatTypesFor({ ...beatId, confirmed: true, market: { volumeAvailable: true, latestBar: { volume: 10, confirmed: true }, status: "ready", dataShape: "ohlcv" } }),
    ["observation", "message", "trade", "authorization", "permission"]);
  assert.equal(ORB2_FIELD_BEAT_TYPES.length, 5);
});

test("observationFromPacket refuses a missing packet instead of inventing a berth", () => {
  assert.equal(observationFromPacket({ packet: null, symbol: "AAPL", discId: "stocks", provider: "tickerbot" }), null);
  const observation = observationFromPacket({
    packet: { schema: "gi-market-context-v1", synthetic: false, symbol: "AAPL", timeframe: "1d", source: "test", bars: bars(60) },
    symbol: "AAPL", displaySymbol: "AAPL", discId: "stocks", provider: "tickerbot", now: NOW, beatId: "00000000-0000-4000-8000-000000000002"
  });
  assert.ok(observation);
  assert.equal(observation.market.status !== "unavailable", true);
  assert.equal(observation.market.synthetic, false);
  assert.equal(observation.confirmed, true);
});

test("the scheduler handles missing kraken_calls column gracefully without migration 0012", async t => {
  clearCharactersCryptoRankingCache();
  clearKrakenDailyBarCache();
  clearOrb2FieldSchemaCache();
  const sql = new DatabaseSync(":memory:");
  /* Apply migrations 0005 through 0011 only — omitting 0012 so orb2_field_runs lacks kraken_calls */
  for (const file of ["0005_tickerbot_call_ledger.sql", "0007_massive_daily_call_ledger.sql", "0009_orb2_server_field.sql", "0010_characters_crypto_ranking_cache.sql", "0011_massive_futures_contract_cache.sql"]) {
    sql.exec(readFileSync(new URL(`../migrations/community/${file}`, import.meta.url), "utf8"));
  }
  t.after(() => sql.close());
  const alters = [];
  const db = {
    prepare(query) {
      if (/ALTER\s+TABLE\s+orb2_field_runs/i.test(String(query))) alters.push(String(query));
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
  const env = { COMMUNITY_DB: db, MASSIVE_API_KEY: "test-massive-key", TICKERBOT_API_KEY: "test-tickerbot-key" };
  const seen = { urls: [], massive: [], tickerbot: [] };
  const at = nextClock();
  const summary = await runOrb2FieldTick(env, null, deps(seen, { at }));
  assert.equal(summary.ok, true, "tick succeeds even if kraken_calls was missing from schema");
  const healed = sql.prepare("SELECT sql FROM sqlite_schema WHERE type = 'table' AND name = 'orb2_field_runs'").get();
  assert.match(String(healed.sql), /\bkraken_calls\b/, "the first tick self-heals the missing 0012 column");
  assert.equal(alters.length, 1, "self-heal issues exactly one ALTER TABLE");
  const second = await runOrb2FieldTick(env, null, deps(seen, { at: nextClock() }));
  assert.equal(second.ok, true);
  assert.equal(alters.length, 1, "no further ALTER is issued once the column exists");
});

test("a migrated field never issues ALTER TABLE, so no duplicate-column error reaches observability", async t => {
  const { env } = fixture(t);
  const steadyStateAlters = [];
  const innerPrepare = env.COMMUNITY_DB.prepare.bind(env.COMMUNITY_DB);
  env.COMMUNITY_DB.prepare = query => {
    if (/ALTER\s+TABLE/i.test(String(query))) steadyStateAlters.push(String(query));
    return innerPrepare(query);
  };
  const seen = { urls: [], massive: [], tickerbot: [] };
  const at = nextClock();
  const first = await runOrb2FieldTick(env, null, deps(seen, { at }));
  assert.equal(first.ok, true);
  const second = await runOrb2FieldTick(env, null, deps(seen, { at: nextClock() }));
  assert.equal(second.ok, true);
  assert.deepEqual(steadyStateAlters, [], "steady-state ticks must not attempt ALTER TABLE at all");
});

test("failed work advances its lane cursor, records a held berth, and respects cooldown in a serialized rotation", async t => {
  const { sql, env } = fixture(t);
  const seen = { urls: [], massive: [], tickerbot: [], krakenRanking: [], krakenBars: [], contracts: [], failedFx: [] };
  const at = nextClock();
  seedActiveContracts(sql, at, { exclude: ["CL"] });
  seedSchedulerControl(sql, at);
  const fxOrder = orb2FieldRoster({ now: at, commodityContracts: activeContracts(at) }).fx.map(entry => entry.symbol);
  const audIndex = fxOrder.indexOf("AUDUSD");
  assert.ok(audIndex > 0, "AUDUSD follows another reviewed FX instrument in the deterministic roster");
  seedFieldCursor(sql, `massive:fx:${fxOrder[audIndex - 1]}`, { at });
  seedDispatchCursor(sql, { laneId: "massive-fx", at });

  const normalFetch = providerFetch(seen);
  const customFetch = async (url, options = {}) => {
    const parsed = new URL(String(url));
    if (parsed.pathname === "/futures/v1/contracts") {
      const productCode = parsed.searchParams.get("product_code");
      seen.contracts.push(productCode);
      return productCode === "CL" ? Response.json({ results: [] }) : normalFetch(url, options);
    }
    if (decodeURIComponent(parsed.pathname).startsWith("/v2/aggs/ticker/C:AUDUSD/")) {
      seen.failedFx.push("C:AUDUSD");
      return Response.json({ status: "ERROR", message: "Upstream rate limit" }, { status: 429 });
    }
    return normalFetch(url, options);
  };

  /* The FX lane is selected by the durable global cursor. Its stable-key cursor
     advances before the failing request, so the next selected FX slot does not
     replay AUDUSD even though other provider classes do not run in this tick. */
  const firstTick = await runOrb2FieldTick(env, null, { now: () => at, fetch: customFetch });
  assert.equal(firstTick.ok, true, firstTick.errors.join(" "));
  assert.equal(firstTick.workUnits, 1);
  assert.equal(firstTick.workUnit, "massive:fx:AUDUSD");
  assert.equal(firstTick.lanes["massive-fx"].providerCalls, 1);
  assert.equal(firstTick.lanes["massive-fx"].held, 1);
  assert.deepEqual(seen.failedFx, ["C:AUDUSD"]);
  const fxRow = sql.prepare("SELECT * FROM orb2_field_observations WHERE disc_id='fx' AND symbol='AUDUSD'").get();
  assert.ok(fxRow, "a provider failure is stored against its selected instrument");
  assert.equal(JSON.parse(fxRow.payload).status, "unavailable");

  const nextTick = await runOrb2FieldTick(env, null, { now: () => at + 60_000, fetch: customFetch });
  assert.equal(nextTick.ok, true, nextTick.errors.join(" "));
  assert.match(nextTick.workUnit || "", /^massive:fx:/);
  assert.notEqual(nextTick.workUnit, "massive:fx:AUDUSD",
    "the failed instrument does not pin or rewind the rolling cursor");
  assert.equal(seen.failedFx.length, 1, "the existing six-hour held-observation backoff prevents a retry next minute");

  /* Contract discovery is a separate work unit now. Select the futures slot
     explicitly, verify its held berth, then exercise the same 15-minute retry
     cooldown without requiring unrelated lanes to execute in parallel. */
  const discoveryAt = at + 120_000;
  seedDispatchCursor(sql, { laneId: "massive-futures", at: discoveryAt });
  const discovery = await runOrb2FieldTick(env, null, { now: () => discoveryAt, fetch: customFetch });
  assert.equal(discovery.ok, true, discovery.errors.join(" "));
  assert.equal(discovery.workUnit, "massive:futures-contract-discovery");
  assert.equal(discovery.lanes["massive-futures"].providerCalls, 1);
  assert.deepEqual(seen.contracts, ["CL"]);
  seen.contracts.length = 0;
  const clRow = sql.prepare("SELECT * FROM orb2_field_observations WHERE disc_id='commodities' AND symbol='WTI'").get();
  assert.ok(clRow, "a missing CL contract becomes an explicit held commodity berth");
  const clPayload = JSON.parse(clRow.payload);
  assert.equal(clPayload.status, "unavailable");
  assert.equal(clPayload.discId, "commodities");

  const retryAt = discoveryAt + MASSIVE_FUTURES_CONTRACT_RETRY_COOLDOWN_MS + 1_000;
  seedDispatchCursor(sql, { laneId: "massive-futures", at: retryAt });
  const retryTick = await runOrb2FieldTick(env, null, { now: () => retryAt, fetch: customFetch });
  assert.equal(retryTick.ok, true, retryTick.errors.join(" "));
  assert.equal(retryTick.workUnit, "massive:futures-contract-discovery");
  assert.deepEqual(seen.contracts, ["CL"],
    "the held commodity contract is retried only when its unchanged provider cooldown expires");
  const snapshotRes = await handleOrb2Field(new Request(`${ORIGIN}${ORB2_FIELD_ROUTE}?interval=1d`), env, { now: () => retryAt });
  const { data } = await snapshotRes.json();
  const discMap = Object.fromEntries(data.status.discs.map(d => [d.id, d]));
  assert.equal(discMap.commodities.instruments, 11, "held contract discovery never shrinks the reviewed Disc4 denominator");
  CLOCK = retryAt;
});

/* ── the parallel/sequential lane model ─────────────────────────────────
   These lock in the invariants the lane split depends on: one unit per lane per
   minute, each lane inside its own provider envelope, a full rotation bounded by
   the longest lane rather than the sum of the lanes, real containment when one
   lane throws, and a D1 budget that charges every statement exactly once. */

test("the scheduler executes at most one provider lane and one work unit per Cron tick", async t => {
  const { sql, env } = fixture(t, { options: true });
  const seen = { urls: [], massive: [], tickerbot: [], krakenRanking: [], krakenBars: [], contracts: [] };
  const at = Date.parse("2026-10-06T12:00:00.000Z");
  seedActiveContracts(sql, at);
  seedSchedulerControl(sql, at);
  await primeCryptoRanking({ db: env.COMMUNITY_DB, seen, at });
  seedTickerbotStockObservation(sql, { symbol: "NVDA", observedAt: at - 2 * 86_400_000 });
  const summary = await runOrb2FieldTick(env, null, { now: () => at, fetch: providerFetch(seen) });
  assert.equal(summary.ok, true, summary.errors.join(" "));
  assert.ok(summary.workUnits <= 1);
  assert.ok(summary.workUnitsList.length <= 1);
  assert.ok(Object.values(summary.lanes).filter(lane => lane.ran).length <= 1);
  assert.ok(summary.providerRequests <= ORB2_FIELD_SCHEDULER_MAX_PROVIDER_CALLS_PER_TICK);
  assert.equal(ORB2_FIELD_SCHEDULER_WORK_UNITS_PER_TICK, 1);
  assert.ok(summary.d1Reads <= ORB2_FIELD_SCHEDULER_MAX_D1_READS);
  assert.ok(summary.d1Writes <= ORB2_FIELD_SCHEDULER_MAX_D1_WRITES);
  CLOCK = at + 60_000;
});

test("a full serialized field rotation takes the sum of reviewed lane slots", async t => {
  const { sql, env, stats } = fixture(t);
  const seen = { urls: [], massive: [], tickerbot: [], krakenRanking: [], krakenBars: [], contracts: [] };
  const at = nextClock();
  seedActiveContracts(sql, at);
  seedSchedulerControl(sql, at);
  const ranking = await primeCryptoRanking({ db: env.COMMUNITY_DB, seen, at });
  seedTickerbotStockObservation(sql, { symbol: "NVDA", observedAt: at - 2 * 86_400_000 });
  const roster = orb2FieldRoster({ now: at, cryptoRanking: ranking, commodityContracts: activeContracts(at) });
  const cycleLength = roster.instruments.length;
  assert.equal(roster.indices.length, 32);
  assert.equal(cycleLength, 171);
  stats.reset();

  const covered = new Set();
  for (let tick = 0; tick < cycleLength; tick += 1) {
    const summary = await runOrb2FieldTick(env, null, { now: () => at + tick * 60_000, fetch: providerFetch(seen) });
    assert.equal(summary.ok, true, `serial rotation tick ${tick}: ${summary.errors.join(" ")}`);
    assert.equal(summary.workUnits, 1, `tick ${tick} spends exactly one unit`);
    assert.equal(summary.workUnitsList.length, 1);
    assert.equal(Object.values(summary.lanes).filter(lane => lane.ran || lane.skipped).length, 1);
    assert.ok(summary.providerRequests <= ORB2_FIELD_SCHEDULER_MAX_PROVIDER_CALLS_PER_TICK);
    assert.ok(summary.d1Reads <= ORB2_FIELD_SCHEDULER_MAX_D1_READS);
    assert.ok(summary.d1Writes <= ORB2_FIELD_SCHEDULER_MAX_D1_WRITES);
    assert.ok(stats.maxRowsPerRead <= 12);
    covered.add(summary.workUnit);
  }
  assert.equal(sql.prepare("SELECT attempts FROM orb2_field_queue WHERE symbol='__dispatch_cursor__'").get().attempts, cycleLength);
  const storedSymbols = new Set(sql.prepare(
    "SELECT DISTINCT symbol FROM orb2_field_observations WHERE interval='1d' AND status='bars'"
  ).all().map(row => row.symbol));
  for (const instrument of roster.instruments) {
    assert.ok(storedSymbols.has(instrument.symbol), `${instrument.discId}:${instrument.symbol} was observed within one full serial cycle`);
  }
  assert.equal(covered.size, cycleLength, "each selected slot advances to a distinct reviewed work item over the complete base cycle");
  assert.equal(seen.tickerbot.filter(entry => entry.endsWith(":1d")).length, roster.stocks.length);
  assert.equal(seen.krakenBars.length, roster.crypto.length + roster.cryptoPairs.length);
  assert.equal(seen.massive.length, roster.fx.length + roster.commodities.length + roster.indices.length);
  CLOCK = at + cycleLength * 60_000;
});

test("a lane failure is contained and the durable dispatcher advances to the next slot", async t => {
  const base = fixture(t);
  const seen = { urls: [], massive: [], tickerbot: [], krakenRanking: [], krakenBars: [], contracts: [] };
  const at = nextClock();
  seedActiveContracts(base.sql, at);
  seedSchedulerControl(base.sql, at);
  await primeCryptoRanking({ db: base.env.COMMUNITY_DB, seen, at });
  /* Indexes are the last lane block in the reviewed 171-slot base schedule. */
  seedDispatchCursor(base.sql, { attempts: 170, at });
  const poisonedReason = "field-cursor-v1:massive-indices";
  const realDb = base.env.COMMUNITY_DB;
  const poisonDb = {
    prepare(query) {
      const statement = realDb.prepare(query);
      const isCursorRead = /FROM\s+orb2_field_queue/i.test(String(query)) && /reason\s*=\s*\?/i.test(String(query));
      let bound = [];
      return {
        bind(...values) { bound = values; statement.bind(...values); return this; },
        async first(...args) {
          if (isCursorRead && bound.includes(poisonedReason)) throw new Error("simulated D1 fault on one lane cursor");
          return statement.first(...args);
        },
        all: (...args) => statement.all(...args),
        run: (...args) => statement.run(...args)
      };
    },
    batch: statements => realDb.batch(statements)
  };

  const failed = await runOrb2FieldTick({ ...base.env, COMMUNITY_DB: poisonDb }, null, deps(seen, { at }));
  assert.equal(failed.ok, true, "a single selected lane's fault does not fail tick finalization");
  assert.ok(failed.errors.some(error => /provider lane failed and was contained/i.test(error)));
  assert.ok(failed.errors.some(error => /simulated D1 fault/i.test(error)));
  assert.equal(failed.lanes["massive-indices"], undefined);
  assert.equal(failed.workUnitsByLane.get("massive-indices") || 0, 0);
  assert.equal(base.sql.prepare("SELECT attempts FROM orb2_field_queue WHERE symbol='__dispatch_cursor__'").get().attempts, 171,
    "even a contained lane failure consumes only its assigned dispatch slot");

  const next = await runOrb2FieldTick(base.env, null, { now: () => at + 60_000, fetch: providerFetch(seen) });
  assert.equal(next.ok, true, next.errors.join(" "));
  assert.equal(next.workUnits, 1);
  assert.match(next.workUnit || "", /^(?:warm:|tickerbot:1d:)/,
    "after the final index slot fails, rotation wraps to the stock lane on the next tick");
  CLOCK = at + 60_000;
});

test("independent snapshot status reads overlap under the read-concurrency bound", async t => {
  const { sql, env } = fixture(t);
  const at = nextClock();
  seedActiveContracts(sql, at);
  seedSchedulerControl(sql, at);

  /* The fixture's statements resolve immediately, so overlap is unobservable
     without real latency. Add a small delay and count in-flight reads. */
  let inFlight = 0;
  let maxInFlight = 0;
  const realDb = env.COMMUNITY_DB;
  const wrapStatement = (statement, isRead) => ({
    bind(...values) { return wrapStatement(statement.bind(...values), isRead); },
    async first(...args) {
      if (!isRead) return statement.first(...args);
      inFlight += 1; maxInFlight = Math.max(maxInFlight, inFlight);
      try { await new Promise(resolve => setTimeout(resolve, 4)); return await statement.first(...args); }
      finally { inFlight -= 1; }
    },
    async all(...args) {
      if (!isRead) return statement.all(...args);
      inFlight += 1; maxInFlight = Math.max(maxInFlight, inFlight);
      try { await new Promise(resolve => setTimeout(resolve, 4)); return await statement.all(...args); }
      finally { inFlight -= 1; }
    },
    async run(...args) { return statement.run(...args); }
  });
  const isReadQuery = query => /^\s*(?:SELECT|WITH|PRAGMA|EXPLAIN)\b/i.test(String(query));
  const trackingDb = {
    prepare(query) { return wrapStatement(realDb.prepare(query), isReadQuery(query)); },
    batch: statements => realDb.batch(statements)
  };

  const snapshot = await readOrb2FieldSnapshot({ ...env, COMMUNITY_DB: trackingDb }, { now: at });
  assert.equal(snapshot.ok, true, snapshot.message || "");
  /* `maxInFlight` directly observes the contract: a sequential implementation
     can never exceed one delayed read, while a bounded fan-out must overlap and
     stay at/below its reviewed cap. Do not assert a wall-clock target here:
     timer wake-ups in a shared CI/Worker sandbox are scheduler-dependent and
     made the old 36ms threshold a false failure even when overlap occurred. */
  assert.ok(maxInFlight > 1,
    `independent status reads really did overlap (max ${maxInFlight} in flight)`);
  assert.ok(maxInFlight <= ORB2_FIELD_D1_READ_CONCURRENCY,
    `the fan-out stayed inside the reviewed bound (${maxInFlight}/${ORB2_FIELD_D1_READ_CONCURRENCY})`);
  /* Overlap is proven by the observed in-flight count above, not by wall-clock
     timing: maxInFlight above one shows independent reads really ran together,
     and the bound shows the fan-out stayed inside the reviewed limit. */
});

test("the D1 budget charges every statement exactly once, including batched statements", async t => {
  const { sql, env, stats } = fixture(t);
  const seen = { urls: [], massive: [], tickerbot: [], krakenRanking: [], krakenBars: [], contracts: [] };
  const at = nextClock();
  seedActiveContracts(sql, at);
  seedSchedulerControl(sql, at);
  await primeCryptoRanking({ db: env.COMMUNITY_DB, seen, at });
  /* A stock holding both scales makes refreshStoredComposition batch two
     independent UPDATEs into one D1 round trip. */
  seedTickerbotStockObservation(sql, { symbol: "NVDA", observedAt: at });

  stats.reset();
  const summary = await runOrb2FieldTick(env, null, deps(seen, { at }));
  assert.equal(summary.ok, true, summary.errors.join(" "));
  /* The budget the Worker enforces must equal the statements actually executed.
     A batch that charged twice — or charged a SELECT to the reserved write
     allowance — would diverge here, and would eventually fail a legitimate tick
     closed for no real reason. */
  assert.equal(summary.d1Reads, stats.reads,
    "the enforced read budget counts each executed read exactly once");
  assert.equal(summary.d1Writes, stats.writes,
    "the enforced write budget counts each executed write exactly once, batches included");
  assert.ok(summary.d1Writes <= ORB2_FIELD_SCHEDULER_MAX_D1_WRITES);
  CLOCK = at + 60_000;
});

test("the Options lane serializes its request and spends one unit per selected tick", async t => {
  const { sql, env } = fixture(t, { options: true });
  const seen = { urls: [], massive: [], tickerbot: [], krakenRanking: [], krakenBars: [], contracts: [] };
  const at = nextClock();
  seedActiveContracts(sql, at);
  seedSchedulerControl(sql, at);
  await primeCryptoRanking({ db: env.COMMUNITY_DB, seen, at });
  seedTickerbotStockObservation(sql, { symbol: "NVDA", observedAt: at - 2 * 86_400_000 });
  seedDispatchCursor(sql, { laneId: "massive-options", at, options: true });
  let inFlight = 0;
  let maxInFlight = 0;
  const order = [];
  const fetch = async input => {
    const url = new URL(String(input));
    if (url.pathname === "/v3/reference/options/contracts" || decodeURIComponent(url.pathname).startsWith("/v2/aggs/ticker/O:")) {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      const label = url.searchParams.get("underlying_ticker") || decodeURIComponent(url.pathname);
      order.push(`start:${label}`);
      try {
        const response = await providerFetch(seen)(input);
        order.push(`end:${label}`);
        return response;
      } finally {
        inFlight -= 1;
      }
    }
    return providerFetch(seen)(input);
  };

  const summary = await runOrb2FieldTick(env, null, { now: () => at, fetch });
  assert.equal(summary.ok, true, summary.errors.join(" "));
  const lane = summary.lanes["massive-options"];
  assert.equal(lane.workUnits.length, 1);
  assert.equal(summary.workUnits, 1);
  assert.equal(summary.workUnitsByLane.get("massive-options"), 1);
  assert.equal(lane.unitBudget, 1);
  assert.ok(lane.providerCalls <= 1);
  assert.equal(maxInFlight, 1, "no two options-provider requests are in flight in the same invocation");
  assert.equal(order.length, 2, "the selected discovery or bar unit makes one request");
  assert.match(order[0], /^start:/);
  assert.match(order[1], /^end:/);
  assert.equal(sql.prepare("SELECT attempts FROM orb2_field_queue WHERE symbol='__dispatch_cursor__'").get().attempts, 172);
  CLOCK = at + 60_000;
});

