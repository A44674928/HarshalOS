/* Multi-Disc catalog metadata and live crypto-ranking feed tests. */

import assert from "node:assert/strict";
import test from "node:test";
import "../js/characters-disc-catalog.js";
import {
  CHARACTERS_CRYPTO_RANKING_SIZE,
  clearCharactersCryptoRankingCache,
  getCharactersCryptoRanking,
  handleCharactersDiscCatalog,
  charactersCryptoRankingInternals
} from "../worker/characters-crypto-ranking.mjs";
import { TICKERBOT_WATCHLIST } from "../worker/good-intelligence-tickerbot.mjs";

const Catalog = globalThis.CharactersDiscCatalog;
const NOW = Date.parse("2026-10-03T12:00:00.000Z");

function marketRows(count = 70) {
  return Array.from({ length: count }, (_, index) => ({
    id: `asset-${index}`,
    symbol: index === 0 ? "USDT" : index === 1 ? "USDZ" : `C${String(index).padStart(2, "0")}`,
    name: index === 0 ? "Tether USD stablecoin" : `Coin ${index}`,
    total_volume: 1_000_000 - index * 1000,
    current_price: index === 2 ? 90_000_000 : 10 + index,
    market_cap: index === 3 ? null : 20_000_000 - index * 1000
  }));
}

test("the Disc catalog preserves the stock deck and discloses the BIS 23-code limit", () => {
  assert.equal(Catalog.disc("stocks").name, "The 52 Cards");
  assert.deepEqual(Catalog.disc("stocks").intervalModes, ["1h", "1d", "1mo"]);
  assert.equal(Catalog.disc("fx").number, 2);
  assert.equal(Catalog.fxCurrencies.length, 23);
  assert.equal(new Set(Catalog.fxCurrencies.map(entry => entry.symbol)).size, 23);
  assert.ok(Catalog.fxCurrencies.every(entry => entry.quoteCurrency === "USD" && entry.assetClass === "fx"));
  assert.match(Catalog.disc("fx").ranking, /23 non-USD currencies individually/);
  assert.equal(Catalog.disc("crypto").number, 3);
  assert.equal(Catalog.disc("commodities").number, 4);
});

test("commodities remain scalar, and crude oil carries Energy tags without moving energy equities", () => {
  const commodities = Catalog.staticInstruments("commodities");
  const wti = commodities.find(entry => entry.symbol === "WTI");
  const brent = commodities.find(entry => entry.symbol === "BRENT");
  assert.equal(wti.dataShape, "value");
  assert.deepEqual(wti.tags, ["Energy", "Crude oil"]);
  assert.deepEqual(brent.tags, ["Energy", "Crude oil"]);
  assert.equal(wti.quoteCurrency, "USD/barrel");
  assert.equal(Catalog.disc("commodities").intervalModes.includes("1mo"), true);

  const energyStock = TICKERBOT_WATCHLIST.find(entry => entry.sector === "Energy");
  assert.ok(energyStock, "the reviewed stock deck retains its energy-company equities");
  assert.notEqual(energyStock.symbol, "WTI");
  assert.equal(energyStock.discId, undefined, "the existing equity is not reclassified as a commodity");
});

test("CoinGecko ranking uses total_volume desc, keeps unique tickers, and exposes audit flags", async () => {
  clearCharactersCryptoRankingCache();
  const urls = [];
  const result = await getCharactersCryptoRanking({
    now: NOW,
    fetcher: async input => {
      urls.push(new URL(input));
      return Response.json(marketRows());
    }
  });
  assert.equal(result.ok, true);
  assert.equal(urls.length, 1);
  assert.equal(urls[0].origin, "https://api.coingecko.com");
  assert.equal(urls[0].pathname, "/api/v3/coins/markets");
  assert.equal(urls[0].searchParams.get("vs_currency"), "usd");
  assert.equal(urls[0].searchParams.get("order"), "volume_desc");
  assert.equal(urls[0].searchParams.get("per_page"), "100");
  assert.equal(result.ranking.instruments.length, CHARACTERS_CRYPTO_RANKING_SIZE);
  assert.equal(result.ranking.instruments[0].symbol, "USDT");
  assert.equal(result.ranking.instruments[0].rank, 1);
  assert.equal(result.ranking.instruments[0].volumeUsd, 1_000_000);
  assert.equal(result.ranking.instruments[0].currentPriceUsd, 10);
  assert.deepEqual(result.ranking.instruments[0].audit, ["stablecoin-candidate"]);
  assert.deepEqual(result.ranking.instruments[2].audit, ["extreme-nominal-price"]);
  assert.deepEqual(result.ranking.instruments[3].audit, ["missing-market-cap"]);
  assert.ok(result.ranking.instruments.every((entry, index, list) => entry.rank === index + 1 && list.findIndex(other => other.symbol === entry.symbol) === index));
  assert.equal(result.ranking.audit.stablecoinCandidateCount, 1, "stablecoins remain eligible but are explicitly flagged");
  assert.ok(result.ranking.audit.extremeNominalPriceCandidates.some(entry => entry.symbol === "C02"),
    "extreme nominal prices are review flags rather than silent exclusions");
  assert.ok(result.ranking.audit.warnings.some(note => /not manually vetted/i.test(note)));
  assert.equal(result.ranking.audit.missingMarketCapCount, 1);

  const cached = await getCharactersCryptoRanking({ now: NOW + 1000, fetcher: async () => { throw new Error("ranking TTL should suppress refetch"); } });
  assert.equal(cached.ok, true);
  assert.equal(cached.cached, true);
  assert.equal(urls.length, 1);
});

test("the crypto catalog route is read-only and reports ranking provenance without a key", async () => {
  clearCharactersCryptoRankingCache();
  let fetchCount = 0;
  const request = new Request("https://os.example.test/api/characters/v1/discs?disc=crypto");
  const response = await handleCharactersDiscCatalog(request, {
    now: NOW,
    fetcher: async () => { fetchCount += 1; return Response.json(marketRows()); }
  });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(fetchCount, 1);
  assert.equal(payload.success, true);
  assert.equal(payload.disc, "crypto");
  assert.equal(payload.instruments.length, 52);
  assert.match(payload.ranking.metric, /24-hour total_volume, USD/);
  assert.equal(payload.ranking.audit.stablecoinCandidateCount, 1);
  assert.doesNotMatch(JSON.stringify(payload), /apikey|alpha-vantage-test-secret/i);

  const refused = await handleCharactersDiscCatalog(new Request("https://os.example.test/api/characters/v1/discs?disc=fx"), {
    fetcher: async () => { throw new Error("only crypto rankings are live on this route"); }
  });
  assert.equal(refused.status, 400);
});

test("a short or ineligible volume feed fails closed instead of padding a false top 52", async () => {
  clearCharactersCryptoRankingCache();
  const short = await getCharactersCryptoRanking({
    now: NOW,
    fetcher: async () => Response.json(marketRows(51))
  });
  assert.equal(short.ok, false);
  assert.equal(short.code, "crypto-ranking-unreadable");
  assert.equal(charactersCryptoRankingInternals.normalizeCoinMarkets({ nope: [] }, NOW), null);
});
