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
  ORB2_MASSIVE_PER_MINUTE_PER_ASSET_CLASS,
  clearOrb2FieldSchemaCache,
  handleOrb2Field,
  heldFieldObservation,
  observationFromPacket,
  orb2FieldBeatTypesFor,
  orb2FieldFreshness,
  orb2FieldNeedsRefresh,
  orb2FieldRoster,
  runOrb2FieldTick,
  sanitizeOrb2FieldObservation
} from "../worker/orb2-field.mjs";
import { TICKERBOT_WATCHLIST } from "../worker/good-intelligence-tickerbot.mjs";
import { clearCharactersCryptoRankingCache } from "../worker/characters-crypto-ranking.mjs";
import { clearKrakenDailyBarCache } from "../worker/characters-kraken.mjs";
import { MASSIVE_FUTURES_CONTRACT_RETRY_COOLDOWN_MS } from "../worker/characters-futures-contracts.mjs";

const MIGRATIONS = ["0005_tickerbot_call_ledger.sql", "0007_massive_daily_call_ledger.sql", "0009_orb2_server_field.sql", "0010_characters_crypto_ranking_cache.sql", "0011_massive_futures_contract_cache.sql", "0012_kraken_public_crypto.sql"]
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

function seedActiveContracts(sql, at = NOW) {
  const date = new Date(at).toISOString().slice(0, 10);
  const nextMidnight = Date.parse(`${date}T00:00:00.000Z`) + 86_400_000;
  const seed = activeContracts(at);
  for (const contract of Object.values(seed)) {
    sql.prepare(`INSERT INTO massive_futures_contract_cache
      (product_code, contract_json, source_date, fetched_at, expires_at, last_attempt_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(contract.productCode, JSON.stringify(contract), date, at, nextMidnight, at, at);
  }
}

function fixture(t, { migrated = true, maxBindParameters = Infinity } = {}) {
  clearCharactersCryptoRankingCache();
  clearKrakenDailyBarCache();
  clearOrb2FieldSchemaCache();
  const sql = new DatabaseSync(":memory:");
  if (migrated) for (const migration of MIGRATIONS) sql.exec(migration);
  t.after(() => sql.close());
  const db = {
    prepare(query) {
      let values = [];
      const statement = {
        bind(...args) {
          if (args.length > maxBindParameters) throw new Error(`too many SQL variables: ${args.length}`);
          values = args;
          return statement;
        },
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

function seedValidMarketObservation(sql, { symbol, discId, observedAt = NOW }) {
  const candidate = {
    schema: "gi-orb2-field-observation-v1", symbol, displaySymbol: symbol, name: symbol,
    sector: discId === "indices" ? "Index" : "Commodity", discId, provider: "massive", interval: "1d",
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
  assert.equal(roster.indices.length, 5);
  assert.deepEqual(roster.dsSymbols, ["EURUSD", "JPYUSD", "GBPUSD", "CADUSD", "SEKUSD", "CHFUSD"]);
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

test("a cold tick keeps Massive inside its envelope and Kraken's roster and OHLC share the one-second gate", async t => {
  const { sql, env } = fixture(t);
  const seen = { urls: [], massive: [], tickerbot: [] };
  const at = nextClock();
  const summary = await runOrb2FieldTick(env, null, deps(seen, { at }));
  assert.equal(summary.ok, true);
  assert.equal(summary.massiveCalls, ORB2_MASSIVE_PER_MINUTE, "contract discovery and Massive bars stay inside the five-request envelope");
  assert.equal(seen.krakenRanking.length, 1, "Disc3's roster is fetched from Kraken Spot");
  assert.equal(seen.krakenBars.length, 0, "the roster call occupies Kraken's one-per-second gate, so OHLC waits for a later tick");
  assert.equal(seen.contracts.length, 1, "one active futures product is discovered per tick");
  assert.equal(seen.massive.length, ORB2_MASSIVE_PER_MINUTE - 1, "contract discovery leaves four Massive bar slots");
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_observations WHERE provider='massive'").get().count, ORB2_MASSIVE_PER_MINUTE - 1);
  assert.equal(sql.prepare("SELECT attempted_calls AS calls FROM massive_daily_call_ledger").get().calls, ORB2_MASSIVE_PER_MINUTE);
  const row = sql.prepare("SELECT payload, interval, confirmed FROM orb2_field_observations WHERE interval='1d' AND provider='massive' LIMIT 1").get();
  const payload = JSON.parse(row.payload);
  assert.equal(payload.schema, "gi-orb2-field-observation-v1");
  assert.equal(payload.provider, "massive");
  assert.equal(payload.motion.schema, "characters-market-motion-v1", "the Characters directive is computed server-side");
  assert.ok(payload.market && payload.market.latestBar && payload.market.latestBar.confirmed === true);
  assert.equal(row.confirmed, 1);

  const later = await runOrb2FieldTick(env, null, { now: () => at + 1_000, fetch: providerFetch(seen) });
  assert.equal(later.krakenCalls, 1, "the exact-pair OHLC request proceeds after the one-second cooldown");
  assert.equal(seen.krakenRanking.length, 1, "the fresh Kraken roster is read from D1, not fetched again");
  assert.equal(seen.krakenBars.length, 1);
  assert.equal(seen.krakenBars[0].pair, "ADA/USD");
  assert.equal(seen.krakenBars[0].requestedPair, "ADAUSD");
  assert.equal(seen.krakenBars[0].interval, "1440");
  const crypto = sql.prepare("SELECT payload FROM orb2_field_observations WHERE symbol='ADA' AND provider='kraken' AND interval='1d'").get();
  assert.ok(crypto, "the first pair is stored from Kraken rather than an alternate venue");
  const cryptoPayload = JSON.parse(crypto.payload);
  assert.equal(cryptoPayload.krakenPair, "ADA/USD");
  assert.equal(cryptoPayload.providerId, "ADA/USD");
});

test("the provider-split rotation covers Tickerbot stocks, Kraken Crypto, and Massive non-stock Discs", async t => {
  const { sql, env } = fixture(t);
  const seen = { urls: [], massive: [], tickerbot: [], krakenRanking: [], krakenBars: [], contracts: [] };
  const at = nextClock();
  seedActiveContracts(sql, at);

  const firstTick = await runOrb2FieldTick(env, null, { now: () => at, fetch: providerFetch(seen) });
  assert.equal(firstTick.massiveCalls, ORB2_MASSIVE_PER_MINUTE_PER_ASSET_CLASS * 3);
  assert.equal(firstTick.krakenCalls, 1, "the cold tick spends one Kraken call on the rolling-24-hour roster");
  const rankingRow = sql.prepare("SELECT ranking_json FROM characters_crypto_ranking_cache WHERE id=1").get();
  const cryptoRanking = JSON.parse(rankingRow.ranking_json);
  const roster = orb2FieldRoster({ now: at, cryptoRanking, commodityContracts: activeContracts(at) });
  const reviewed = roster.instruments.length;
  assert.equal(roster.crypto.length, 52);
  assert.equal(roster.cryptoPairs.length, 1, "the exact ADA/USDT pair joins the Kraken daily rotation");
  assert.equal(reviewed, 144);
  assert.equal(seen.krakenRanking.length, 1);
  assert.equal(seen.krakenBars.length, 0, "the pair-bar lane waits for the next one-second Kraken slot");
  assert.equal(seen.massive.length, ORB2_MASSIVE_PER_MINUTE_PER_ASSET_CLASS * 3,
    "each Massive subscription class gets its own five-call server-side envelope");
  assert.equal(seen.massive.filter(ticker => ticker.startsWith("C:")).length, ORB2_MASSIVE_PER_MINUTE_PER_ASSET_CLASS);
  assert.equal(seen.massive.filter(ticker => ticker.startsWith("I:")).length, ORB2_MASSIVE_PER_MINUTE_PER_ASSET_CLASS);
  assert.equal(seen.massive.filter(ticker => /^[A-Z]{2,4}[FGHJKMNQUVXZ]\d$/.test(ticker)).length, ORB2_MASSIVE_PER_MINUTE_PER_ASSET_CLASS);
  const firstDiscs = new Set(seen.massive.map(ticker =>
    ticker.startsWith("C:") ? "fx" : ticker.startsWith("I:") ? "indices" : /^[A-Z]{2,4}[FGHJKMNQUVXZ]\d$/.test(ticker) ? "commodities" : "unexpected"));
  assert.deepEqual([...firstDiscs].sort(), ["commodities", "fx", "indices"],
    "Massive serves only FX, active commodity futures, and indices");

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
  let tick = 1;
  while (coverage().size < reviewed && tick < 100) {
    const summary = await runOrb2FieldTick(env, null, { now: () => at + tick * 60_000, fetch: providerFetch(seen) });
    assert.ok(summary.massiveCalls <= ORB2_MASSIVE_PER_MINUTE_PER_ASSET_CLASS * 3);
    assert.ok(summary.krakenCalls <= 1, "Kraken's shared pacing gate permits at most one call per tick");
    tick += 1;
  }
  const fetched = coverage();
  assert.equal(fetched.size, reviewed, `every reviewed instrument is covered by its exclusive provider (${reviewed})`);
  assert.deepEqual([...fetched].sort(), [...expected].sort(), "no provider substitutes for another Disc");
  assert.equal(seen.massive.length, roster.fx.length + roster.commodities.length + roster.indices.length);
  assert.equal(seen.krakenBars.length, roster.crypto.length + roster.cryptoPairs.length);
  assert.equal(seen.krakenRanking.length, 1, "the D1 roster cache avoids a Kraken ranking call on every Cron tick");
  assert.ok(seen.tickerbot.some(entry => entry.endsWith(":1d")), "Stocks are refreshed on Tickerbot daily bars");
  assert.ok(seen.massive.includes("C:EURUSD"), "FX routes through the reviewed Massive catalog mapping");
  assert.ok(seen.massive.includes("GCZ6"), "commodities route through the fixed active Massive futures contract");
  assert.ok(seen.massive.includes("ALIZ6"), "Aluminum routes through its verified active Massive futures contract");
  assert.ok(seen.krakenBars.some(entry => entry.pair === "BTC/USD"), "Crypto daily bars retain Kraken's exact USD pair identity");
  assert.ok(seen.krakenBars.some(entry => entry.pair === "ADA/USDT"), "the cross-quote OHLC request retains ADA/USDT instead of inventing USDT/ADA");
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_observations WHERE interval='1d' AND disc_id='crypto' AND provider='massive'").get().count, 0);
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_observations WHERE interval='1d' AND disc_id='stocks' AND provider='massive'").get().count, 0);
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
  let queuedCompleted = claimedFirstTick;
  while (sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_queue").get().count > 0 && tick < 12) {
    const summary = await runOrb2FieldTick(env, null, { now: () => at + tick * 60_000, fetch: providerFetch(seen) });
    queuedCompleted += summary.queueCompleted;
    tick += 1;
  }
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_queue").get().count, 0, "the burst drains within its bounded batch size");
  assert.equal(queuedCompleted, ORB2_FIELD_TICKERBOT_BURST_CALLS, "all queued warm jobs complete");
  assert.ok(seen.tickerbot.length >= ORB2_FIELD_TICKERBOT_BURST_CALLS,
    "the stock daily rotation may add calls while the separate 15m/1h/1d warm queue drains");
  assert.equal(new Set(seen.tickerbot.map(entry => entry.split(":")[1])).size, 3, "15m, 1h, and 1d are covered");
  assert.equal(sql.prepare("SELECT attempted_calls AS calls FROM tickerbot_call_ledger").get().calls,
    seen.tickerbot.length, "every Tickerbot attempt, including daily rotation, is claimed in the durable monthly ledger");
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
  const at = nextClock();
  seedActiveContracts(sql, at);
  /* The provider lanes have separate pacing: one Kraken pair per tick, five
     Massive calls per minute, plus the bounded Tickerbot stock warm burst. */
  await runOrb2FieldTick(env, null, { now: () => at, fetch: providerFetch(seen) });
  const rankingRow = sql.prepare("SELECT ranking_json FROM characters_crypto_ranking_cache WHERE id=1").get();
  const cryptoRanking = JSON.parse(rankingRow.ranking_json);
  const roster = orb2FieldRoster({ now: at, cryptoRanking, commodityContracts: activeContracts(at) });
  const massiveCount = roster.fx.length + roster.commodities.length + roster.indices.length;
  const ticksForOnePass = Math.max(roster.stocks.length, roster.crypto.length + roster.cryptoPairs.length, Math.ceil(massiveCount / ORB2_MASSIVE_PER_MINUTE)) + 1;
  for (let tick = 1; tick < ticksForOnePass + 1; tick += 1) {
    await runOrb2FieldTick(env, null, { now: () => at + tick * 60_000, fetch: providerFetch(seen) });
  }
  const snapshotAt = at + (ticksForOnePass + 1) * 60_000;
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
  assert.equal(discs.commodities.stored, 11, "all eleven reviewed commodity berths are stored by the automatic rotation; an unreviewed D1 row is excluded");
  assert.equal(sql.prepare("SELECT COUNT(*) AS count FROM orb2_field_observations WHERE interval='1d' AND disc_id='commodities'").get().count, 12,
    "the unmatched legacy row stays preserved without inflating the reviewed count");
  const commodityPayload = JSON.parse(sql.prepare("SELECT payload FROM orb2_field_observations WHERE interval='1d' AND disc_id='commodities' LIMIT 1").get().payload);
  assert.equal(commodityPayload.provider, "massive");
  assert.equal(commodityPayload.market.massiveContract.provider, "Massive");
  assert.ok(commodityPayload.market.massiveContract.ticker.startsWith(commodityPayload.market.massiveContract.productCode),
    "Orb 2 retains the exact active-contract identity used for the futures bars");
  assert.equal(discs.indices.instruments, 5);
  assert.equal(discs.indices.stored, 5, "the index Disc is populated by the automatic rotation");
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
  for (const [discId, expected] of [["fx", 23], ["commodities", 11], ["indices", 5]]) {
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
  assert.equal(response.status, 200);
  const { data } = await response.json();
  const discs = Object.fromEntries(data.status.discs.map(disc => [disc.id, disc]));
  assert.deepEqual({ instruments: discs.commodities.instruments, stored: discs.commodities.stored, active: discs.commodities.active,
    observed: discs.commodities.observed, held: discs.commodities.held, pending: discs.commodities.pending },
  { instruments: 11, stored: 11, active: 3, observed: 3, held: 8, pending: 0 });
  assert.equal(discs.commodities.complete, false);
  assert.equal(discs.commodities.members.length, 11);
  assert.equal(discs.commodities.members.find(member => member.symbol === commodities[3].symbol).status, "held");
  assert.deepEqual({ instruments: discs.indices.instruments, stored: discs.indices.stored, active: discs.indices.active,
    observed: discs.indices.observed, held: discs.indices.held, pending: discs.indices.pending },
  { instruments: 5, stored: 5, active: 1, observed: 1, held: 4, pending: 0 });
  assert.equal(discs.indices.complete, false);
  assert.equal(discs.indices.members.length, 5);
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
  assert.equal(response.status, 200);
  const { data } = await response.json();
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
  assert.equal(response.status, 200);
  const { data } = await response.json();
  const fx = data.status.discs.find(disc => disc.id === "fx");
  assert.equal(fx.stored, 1);
  assert.equal(fx.held, 1);
  assert.equal(fieldQueries.length, 1, "the daily payload scan is shared by rendering, Disc status, and Dollar Strength (DS)");
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
  const alters = [];
  const originalPrepare = db.prepare;
  db.prepare = query => {
    if (/ALTER\s+TABLE\s+orb2_field_runs/i.test(String(query))) alters.push(String(query));
    return originalPrepare(query);
  };
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
  const alters = [];
  const innerPrepare = env.COMMUNITY_DB.prepare.bind(env.COMMUNITY_DB);
  env.COMMUNITY_DB.prepare = query => {
    if (/ALTER\s+TABLE/i.test(String(query))) alters.push(String(query));
    return innerPrepare(query);
  };
  const seen = { urls: [], massive: [], tickerbot: [] };
  const at = nextClock();
  const first = await runOrb2FieldTick(env, null, deps(seen, { at }));
  assert.equal(first.ok, true);
  const second = await runOrb2FieldTick(env, null, deps(seen, { at: nextClock() }));
  assert.equal(second.ok, true);
  assert.deepEqual(alters, [], "steady-state ticks must not attempt ALTER TABLE at all");
});

test("failed provider beats and missing commodity contracts write heldFieldObservation and are not immediately retried", async t => {
  const { sql, env } = fixture(t);
  const seen = { urls: [], massive: [], tickerbot: [], contracts: [] };
  const at = nextClock();

  /* Custom provider fetch where contract discovery returns no active contract for CL,
     and Massive bars fail for EURUSD */
  const customFetch = async (url, options = {}) => {
    const parsed = new URL(url);
    if (parsed.pathname === "/futures/v1/contracts") {
      seen.contracts.push(parsed.searchParams.get("product_code"));
      return Response.json({ results: [] }); /* No active contract found */
    }
    if (decodeURIComponent(parsed.pathname).startsWith("/v2/aggs/ticker/C:AUDUSD/")) {
      return Response.json({ status: "ERROR", message: "Upstream rate limit" }, { status: 429 });
    }
    return providerFetch(seen)(url, options);
  };

  const firstTick = await runOrb2FieldTick(env, null, { now: () => at, fetch: customFetch });
  assert.equal(firstTick.ok, true);

  /* Verify held observation was written for CL in commodities */
  const clRow = sql.prepare("SELECT * FROM orb2_field_observations WHERE disc_id='commodities' AND symbol='WTI'").get();
  assert.ok(clRow, "held observation was written for commodity whose contract was unavailable");
  const clPayload = JSON.parse(clRow.payload);
  assert.equal(clPayload.status, "unavailable");
  assert.equal(clPayload.discId, "commodities");

  /* Verify held observation was written for AUDUSD in FX */
  const fxRow = sql.prepare("SELECT * FROM orb2_field_observations WHERE disc_id='fx' AND symbol='AUDUSD'").get();
  assert.ok(fxRow, "held observation was written for failed Massive FX beat");
  const fxPayload = JSON.parse(fxRow.payload);
  assert.equal(fxPayload.status, "unavailable");

  /* A tick one minute later stays inside both bounded retry holds. */
  seen.contracts = [];
  seen.massive = [];
  const secondTick = await runOrb2FieldTick(env, null, { now: () => at + 60_000, fetch: customFetch });
  assert.equal(secondTick.ok, true);
  assert.ok(!seen.contracts.includes("CL"), "contract discovery for CL does not retry on the next tick");
  assert.ok(!seen.massive.includes("C:AUDUSD"), "AUDUSD does not retry on the next tick");

  /* The held CL row is not market coverage: after the contract adapter's retry
     cooldown, discovery must retry CL instead of waiting for the 24h field TTL. */
  const retryAt = at + MASSIVE_FUTURES_CONTRACT_RETRY_COOLDOWN_MS + 1_000;
  seen.contracts = [];
  const retryTick = await runOrb2FieldTick(env, null, { now: () => retryAt, fetch: customFetch });
  assert.equal(retryTick.ok, true);
  assert.ok(seen.contracts.includes("CL"), "the held commodity contract is retried when its provider cooldown expires");

  /* Verify snapshot reports all eleven reviewed commodities even with no active contracts */
  const snapshotRes = await handleOrb2Field(new Request(`${ORIGIN}${ORB2_FIELD_ROUTE}?interval=1d`), env, { now: () => retryAt });
  const { data } = await snapshotRes.json();
  const discMap = Object.fromEntries(data.status.discs.map(d => [d.id, d]));
  assert.equal(discMap.commodities.instruments, 11, "commodities Disc reports all 11 reviewed instruments, never only the contracts active in cache");
});
