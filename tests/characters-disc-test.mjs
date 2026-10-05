/* Multi-Disc catalog metadata and Massive-backed crypto ranking tests. */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import "../js/characters-disc-catalog.js";
import {
  CHARACTERS_CRYPTO_RANKING_SIZE,
  CHARACTERS_CRYPTO_RANKING_TTL_MS,
  clearCharactersCryptoRankingCache,
  getCharactersCryptoRanking,
  handleCharactersDiscCatalog,
  charactersCryptoRankingInternals
} from "../worker/characters-crypto-ranking.mjs";
import { clearMassiveCache } from "../worker/massive.mjs";
import { TICKERBOT_WATCHLIST } from "../worker/good-intelligence-tickerbot.mjs";

const Catalog = globalThis.CharactersDiscCatalog;
const NOW = Date.parse("2026-10-05T12:00:00.000Z");
const MASSIVE_KEY = "massive-crypto-test-secret";
const MIGRATIONS = ["0007_massive_daily_call_ledger.sql", "0010_characters_crypto_ranking_cache.sql", "0011_massive_futures_contract_cache.sql"]
  .map(file => readFileSync(new URL(`../migrations/community/${file}`, import.meta.url), "utf8"));

function fixture(t) {
  const sql = new DatabaseSync(":memory:");
  MIGRATIONS.forEach(migration => sql.exec(migration));
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
    }
  };
  return { db, sql };
}

function groupedRows(count = 70) {
  const rows = Array.from({ length: count }, (_, index) => {
    const symbol = index === 0 ? "USDT" : index === 1 ? "BTC" : index === 2 ? "ETH" : `C${String(index).padStart(2, "0")}`;
    const baseVolume = index === 0 ? 20_000_000 : index === 1 ? 10_000 : index === 2 ? 200_000 : 10_000 - index * 10;
    const vwap = index === 0 ? 1 : index === 1 ? 50_000 : index === 2 ? 2_000 : 100 - index;
    return {
      T: `X:${symbol}USD`,
      o: vwap * 0.98, h: vwap * 1.02, l: vwap * 0.97,
      c: vwap, v: baseVolume, vw: vwap, n: 1000 + index,
      t: NOW - 86_400_000
    };
  });
  rows.push({ T: "X:BTCUSDC", o: 50_000, h: 51_000, l: 49_000, c: 50_500, v: 1e9, vw: 50_000 },
    { T: "X:NOVWAPUSD", o: 4, h: 5, l: 3, c: 4, v: 1e9 });
  return rows;
}

const beforeFetch = async () => ({ ok: true });

function reset() {
  clearCharactersCryptoRankingCache();
  clearMassiveCache();
}

test("the five reviewed Discs share Massive daily routing, and FX still discloses the BIS 23-code limit", () => {
  assert.deepEqual(Catalog.discs.map(disc => disc.id), ["stocks", "fx", "crypto", "commodities", "indices"]);
  assert.equal(Catalog.disc("stocks").name, "The 52 Cards", "the reviewed Disc1 identity is what navigation shows");
  assert.equal(Catalog.disc("stocks").label, "Disc1 · The 52 Cards");
  assert.equal(Catalog.sourceChannels, Catalog.discs, "the composite field's legacy channels are the same frozen roster, not a renamed copy");
  assert.deepEqual(Catalog.disc("stocks").intervalModes, ["1h", "1d", "1mo"]);
  assert.equal(Catalog.disc("fx").number, 2);
  assert.equal(Catalog.fxCurrencies.length, 23);
  assert.equal(new Set(Catalog.fxCurrencies.map(entry => entry.symbol)).size, 23);
  assert.ok(Catalog.fxCurrencies.every(entry => entry.quoteCurrency === "USD" && entry.assetClass === "fx"));
  assert.match(Catalog.disc("fx").ranking, /23 non-USD currencies individually/);
  assert.equal(Catalog.disc("crypto").number, 3);
  assert.equal(Catalog.disc("crypto").defaultProvider, "massive");
  assert.match(Catalog.disc("crypto").ranking, /Massive grouped daily crypto aggregates/);
  assert.equal(Catalog.disc("commodities").number, 4);
  assert.equal(Catalog.disc("indices").number, 5);
  assert.equal(Catalog.disc("indices").defaultProvider, "massive");
  assert.ok(Catalog.staticInstruments("indices").some(entry => entry.symbol === "SPX"));
  assert.equal(Catalog.rankingSource.crypto, "https://massive.com/docs/rest/crypto/aggregates/daily-market-summary");
});

test("Disc4 publishes the actual Massive futures shape and keeps energy equities in Disc1", () => {
  const commodities = Catalog.staticInstruments("commodities");
  const wti = commodities.find(entry => entry.symbol === "WTI");
  const gold = commodities.find(entry => entry.symbol === "GOLD");
  assert.equal(commodities.length, 10);
  assert.deepEqual(commodities.map(entry => entry.symbol), ["WTI", "NATURAL_GAS", "GOLD", "SILVER", "COPPER", "PLATINUM", "PALLADIUM", "WHEAT", "CORN", "SOYBEANS"]);
  assert.ok(commodities.every(entry => entry.massive.family === "futures" && /^[A-Z0-9]{1,4}$/.test(entry.massive.productCode) && !entry.massive.ticker),
    "the catalog contains reviewed Massive product codes but no unverified dated contract tickers");
  assert.equal(wti.dataShape, "ohlcv", "the catalog no longer labels Massive futures bars as scalar values");
  assert.equal(wti.massive.productCode, "CL");
  assert.equal(wti.massive.family, "futures");
  assert.equal(gold.massive.productCode, "GC");
  assert.deepEqual(wti.tags, ["Energy", "Crude oil"]);
  assert.deepEqual(gold.tags, ["Precious metal"]);
  assert.equal(wti.quoteCurrency, "USD/barrel");
  assert.deepEqual(Catalog.disc("commodities").intervalModes, ["1d"]);
  assert.equal(Catalog.disc("commodities").defaultProvider, "massive");
  assert.match(Catalog.disc("commodities").ranking, /Worker resolves today's active single contract through Massive/);
  assert.ok(Catalog.disc("stocks").intervalModes.includes("1mo"), "Disc1 retains its separate Alpha Vantage mode");

  const energyStock = TICKERBOT_WATCHLIST.find(entry => entry.sector === "Energy");
  assert.ok(energyStock, "the reviewed stock deck retains its energy-company equities");
  assert.notEqual(energyStock.symbol, "WTI");
  assert.equal(energyStock.discId, undefined, "the existing equity is not reclassified as a commodity");
});

test("Massive grouped crypto aggregates rank unique USD pairs by observed volume times VWAP", async t => {
  reset();
  const { db } = fixture(t);
  const urls = [];
  const auth = [];
  let reservations = 0;
  const result = await getCharactersCryptoRanking({
    apiKey: MASSIVE_KEY,
    db,
    now: NOW,
    beforeFetch: async () => { reservations += 1; return beforeFetch(); },
    fetcher: async (input, options) => {
      urls.push(new URL(input));
      auth.push(options.headers.Authorization);
      return Response.json({ status: "OK", results: groupedRows() });
    }
  });
  assert.equal(result.ok, true);
  assert.equal(urls.length, 1);
  assert.equal(reservations, 1);
  assert.equal(urls[0].origin, "https://api.massive.com");
  assert.equal(urls[0].pathname, "/v2/aggs/grouped/locale/global/market/crypto/2026-10-04");
  assert.equal(urls[0].searchParams.get("adjusted"), "true");
  assert.equal(urls[0].searchParams.has("apiKey"), false, "the secret is never placed in the URL");
  assert.deepEqual(auth, [`Bearer ${MASSIVE_KEY}`]);
  assert.equal(result.ranking.provider, "Massive");
  assert.match(result.ranking.metric, /previous UTC day USD notional \(base volume × VWAP\)/);
  assert.equal(result.ranking.sourceDate, "2026-10-04");
  assert.equal(result.ranking.instruments.length, CHARACTERS_CRYPTO_RANKING_SIZE);
  assert.equal(result.ranking.instruments[0].symbol, "BTC", "volume is multiplied by the provider's reported VWAP");
  assert.equal(result.ranking.instruments[0].massiveTicker, "X:BTCUSD");
  assert.equal(result.ranking.instruments[0].volumeUsd, 500_000_000);
  assert.equal(result.ranking.instruments[0].currentPriceUsd, 50_000);
  assert.equal(result.ranking.instruments[0].rankingProvider, "Massive");
  assert.equal(result.ranking.instruments.find(entry => entry.symbol === "USDT").audit.includes("stablecoin-candidate"), true);
  assert.ok(result.ranking.instruments.every((entry, index, list) => entry.rank === index + 1 &&
    entry.massiveTicker === `X:${entry.symbol}USD` && list.findIndex(other => other.symbol === entry.symbol) === index));
  assert.equal(result.ranking.audit.stablecoinCandidateCount, 1);
  assert.equal(result.ranking.audit.missingMarketCapCount, CHARACTERS_CRYPTO_RANKING_SIZE,
    "the grouped endpoint has no market-cap field, so it stays missing rather than being borrowed");
  assert.equal(result.ranking.audit.missingVwapCount, 0);
  assert.ok(result.ranking.audit.warnings.some(note => /not a rolling 24-hour/i.test(note)));
  assert.equal(CHARACTERS_CRYPTO_RANKING_TTL_MS, 24 * 60 * 60_000);

  clearCharactersCryptoRankingCache();
  const cached = await getCharactersCryptoRanking({
    db,
    now: NOW + 1_000,
    beforeFetch: async () => { throw new Error("a fresh D1 ranking must suppress budget claims"); },
    fetcher: async () => { throw new Error("the D1 ranking must suppress a refetch"); }
  });
  assert.equal(cached.ok, true);
  assert.equal(cached.cached, true);
  assert.equal(cached.source, "d1", "the ranking survives an isolate-local cache reset");
});

test("the crypto ranking cache expires at UTC midnight and never serves a stale previous-day roster", async t => {
  reset();
  const { db, sql } = fixture(t);
  const requestedDates = [];
  let reservations = 0;
  const fetcher = async input => {
    requestedDates.push(new URL(input).pathname.split("/").at(-1));
    return Response.json({ status: "OK", results: groupedRows() });
  };
  const beforeFetch = async () => { reservations += 1; return { ok: true }; };
  const beforeMidnight = Date.parse("2026-10-05T23:55:00.000Z");
  const first = await getCharactersCryptoRanking({
    apiKey: MASSIVE_KEY, db, now: beforeMidnight, beforeFetch, fetcher
  });
  assert.equal(first.ok, true);
  assert.equal(first.ranking.sourceDate, "2026-10-04");
  const cache = sql.prepare("SELECT expires_at FROM characters_crypto_ranking_cache WHERE id=1").get();
  assert.equal(cache.expires_at, Date.parse("2026-10-06T00:00:00.000Z"));

  clearCharactersCryptoRankingCache();
  const shortlyAfterMidnight = await getCharactersCryptoRanking({
    apiKey: MASSIVE_KEY, db, now: Date.parse("2026-10-06T00:06:00.000Z"), beforeFetch, fetcher
  });
  assert.equal(shortlyAfterMidnight.ok, false);
  assert.equal(shortlyAfterMidnight.code, "crypto-ranking-cooldown");
  assert.equal(requestedDates.length, 1, "expired constituents stay held during the bounded refresh cooldown");

  const refreshed = await getCharactersCryptoRanking({
    apiKey: MASSIVE_KEY, db, now: Date.parse("2026-10-06T00:11:00.000Z"), beforeFetch, fetcher
  });
  assert.equal(refreshed.ok, true);
  assert.equal(refreshed.ranking.sourceDate, "2026-10-05");
  assert.deepEqual(requestedDates, ["2026-10-04", "2026-10-05"]);
  assert.equal(reservations, 2);
});

test("the read-only crypto catalog route returns Massive provenance and shares its D1 cache", async t => {
  reset();
  const { db } = fixture(t);
  const request = new Request("https://os.example.test/api/characters/v1/discs?disc=crypto");
  let fetchCount = 0;
  const env = { MASSIVE_API_KEY: MASSIVE_KEY, COMMUNITY_DB: db };
  const response = await handleCharactersDiscCatalog(request, env, {
    now: () => NOW,
    fetch: async (input, options) => {
      fetchCount += 1;
      assert.equal(options.headers.Authorization, `Bearer ${MASSIVE_KEY}`);
      return Response.json({ status: "OK", results: groupedRows() });
    }
  });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(fetchCount, 1);
  assert.equal(payload.success, true);
  assert.equal(payload.disc, "crypto");
  assert.equal(payload.ranking.provider, "Massive");
  assert.equal(payload.ranking.sourceDate, "2026-10-04");
  assert.equal(payload.instruments.length, 52);
  assert.match(payload.ranking.metric, /volume × VWAP/);
  assert.equal(payload.ranking.audit.stablecoinCandidateCount, 1);
  assert.doesNotMatch(JSON.stringify(payload), /apikey|massive-crypto-test-secret/i);

  clearCharactersCryptoRankingCache();
  const cachedResponse = await handleCharactersDiscCatalog(request, env, {
    now: () => NOW + 1_000,
    fetch: async () => { throw new Error("the D1 cache should suppress another Massive request"); }
  });
  const cachedPayload = await cachedResponse.json();
  assert.equal(cachedResponse.status, 200);
  assert.equal(cachedPayload.ranking.cached, true);
  assert.equal(fetchCount, 1);

  const refused = await handleCharactersDiscCatalog(new Request("https://os.example.test/api/characters/v1/discs?disc=fx"), env);
  assert.equal(refused.status, 400);
});

test("a short or unreadable Massive aggregate is held rather than padding a false top 52", async t => {
  reset();
  const { db } = fixture(t);
  const short = await getCharactersCryptoRanking({
    apiKey: MASSIVE_KEY,
    db,
    now: NOW,
    beforeFetch,
    fetcher: async () => Response.json({ status: "OK", results: groupedRows(51) })
  });
  assert.equal(short.ok, false);
  assert.equal(short.code, "massive-ranking-unreadable");
  assert.equal(charactersCryptoRankingInternals.normalizeGroupedCryptoAggregates({ nope: [] }, { at: NOW }), null);

  let fetches = 0;
  const cooling = await getCharactersCryptoRanking({
    apiKey: MASSIVE_KEY,
    db,
    now: NOW + 1_000,
    beforeFetch: async () => { throw new Error("retry cooldown must not claim another Massive call"); },
    fetcher: async () => { fetches += 1; throw new Error("no refetch inside retry window"); }
  });
  assert.equal(cooling.ok, false);
  assert.equal(cooling.code, "crypto-ranking-cooldown");
  assert.equal(fetches, 0);
  const routeCooldown = await handleCharactersDiscCatalog(
    new Request("https://os.example.test/api/characters/v1/discs?disc=crypto"),
    { MASSIVE_API_KEY: MASSIVE_KEY, COMMUNITY_DB: db },
    { now: () => NOW + 1_000, fetch: async () => { throw new Error("cooldown must not reach Massive"); } }
  );
  assert.equal(routeCooldown.status, 429, "the public route reports the bounded retry as rate-limited");
});

test("a missing Massive key or D1 cache fails closed before a ranking request", async t => {
  reset();
  const { db } = fixture(t);
  let fetches = 0;
  const response = await handleCharactersDiscCatalog(new Request("https://os.example.test/api/characters/v1/discs?disc=crypto"), {
    COMMUNITY_DB: db
  }, { now: () => NOW, fetch: async () => { fetches += 1; return Response.json({ results: groupedRows() }); } });
  assert.equal(response.status, 503);
  assert.match((await response.json()).message, /MASSIVE_API_KEY/);
  assert.equal(fetches, 0);
});
