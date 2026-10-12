/* Reviewed Characters Disc metadata and provider/cadence boundaries. */

import assert from "node:assert/strict";
import test from "node:test";
import "../js/characters-disc-catalog.js";
import { TICKERBOT_WATCHLIST } from "../worker/good-intelligence-tickerbot.mjs";

const Catalog = globalThis.CharactersDiscCatalog;

test("the five reviewed Discs expose only their assigned providers and intervals", () => {
  assert.deepEqual(Catalog.discs.map(disc => disc.id), ["stocks", "fx", "crypto", "commodities", "indices"]);
  assert.equal(Catalog.sourceChannels, Catalog.discs, "the NAB composite's evidence-channel roster remains the same frozen Discs");
  assert.equal(Catalog.disc("stocks").name, "The 52 Cards");
  assert.equal(Catalog.disc("stocks").label, "Disc1 · The 52 Cards");
  assert.equal(Catalog.disc("stocks").defaultProvider, "tickerbot");
  assert.deepEqual(Catalog.disc("stocks").intervalModes, ["1h", "1d"]);
  assert.equal(TICKERBOT_WATCHLIST.length, 52);
  assert.equal(new Set(TICKERBOT_WATCHLIST.map(entry => entry.symbol)).size, 52);

  assert.equal(Catalog.disc("fx").number, 2);
  assert.equal(Catalog.fxCurrencies.length, 23);
  assert.equal(new Set(Catalog.fxCurrencies.map(entry => entry.symbol)).size, 23);
  assert.ok(Catalog.fxCurrencies.every(entry => entry.quoteCurrency === "USD" && entry.assetClass === "fx"));
  assert.match(Catalog.disc("fx").ranking, /23 non-USD currencies individually/);
  assert.equal(Catalog.disc("fx").defaultProvider, "massive");
  assert.deepEqual(Catalog.disc("fx").intervalModes, ["1d"]);

  assert.equal(Catalog.disc("crypto").number, 3);
  assert.equal(Catalog.disc("crypto").defaultProvider, "kraken");
  assert.deepEqual(Catalog.disc("crypto").intervalModes, ["1d"]);
  assert.match(Catalog.disc("crypto").ranking, /Kraken Spot venue data/);
  assert.match(Catalog.disc("crypto").ranking, /rolling-24-hour base volume × VWAP/);
  assert.match(Catalog.disc("crypto").ranking, /not a global market ranking/);
  assert.equal(Catalog.rankingSource.crypto, "https://docs.kraken.com/api-reference/market-data/get-ticker-information");
  assert.equal(Catalog.rankingSource.cryptoBars, "https://docs.kraken.com/api-reference/market-data/get-ohlc-data");

  assert.equal(Catalog.disc("commodities").number, 4);
  assert.equal(Catalog.disc("commodities").name, "Futures");
  assert.equal(Catalog.disc("futures").name, "Futures");
  assert.equal(Catalog.disc("commodities").defaultProvider, "massive");
  assert.deepEqual(Catalog.disc("commodities").intervalModes, ["1d"]);
  assert.equal(Catalog.disc("indices").number, 5);
  assert.equal(Catalog.disc("indices").defaultProvider, "massive");
  assert.deepEqual(Catalog.disc("indices").intervalModes, ["1d"]);
  const indices = Catalog.staticInstruments("indices");
  // Massive Basic does not authorize DJT/DJU/REIT and the DJUS* sector/industry
  // slice that was held as `massive-plan-limited`. They are removed from the
  // reviewed roster so the server field does not spend a held row on them.
  const expectedIndices = ["NDX","COMP","BKX","SOX","BANK","DJUSIR","DJUSME","DJUSNG","DJUSFB","DJUSCG","DJUSAE","DJUSTL","DJUSCR","DJUSCA","DJUSAI","DJUSNS","DJAUS","CADOW","CHDOW","DEDOW","FRDOW","GBDOW","HKDOW","JPDOW","DWAEM","DWAMLVEM","GRNENEF","GRNWINDX","GRNEUROPE","NDXESG","NDXDIV","DEFENSE"];
  assert.equal(indices.length, 32);
  assert.deepEqual(indices.map(entry => entry.symbol), expectedIndices);
  assert.equal(new Set(indices.map(entry => entry.symbol)).size, 32);
  assert.ok(!indices.some(entry => ["SPX", "DJI", "RUT", "VIX"].includes(entry.symbol)),
    "Disc5 does not reintroduce non-Basic familiar indices outside the reviewed roster");
  assert.ok(indices.every(entry => entry.assetClass === "index" && entry.dataShape === "ohlc"));
  assert.ok(indices.every(entry => entry.massive.family === "aggs" && entry.massive.ticker === `I:${entry.symbol}`));
  // 32 = 5 headline + 11 industry/subindustry + 8 international/regional + 8 thematic
  assert.deepEqual(indices.slice(0, 5).map(entry => entry.sector), Array(5).fill("U.S. headline / structural"));
  assert.deepEqual(indices.slice(5, 16).map(entry => entry.sector), Array(11).fill("U.S. industry / subindustry"));
  assert.deepEqual(indices.slice(16, 24).map(entry => entry.sector), Array(8).fill("International / regional"));
  assert.deepEqual(indices.slice(24, 32).map(entry => entry.sector), Array(8).fill("Thematic / factor / specialty"));
});

test("Disc4 keeps its reviewed Massive product roster and energy equities remain Disc1 stocks", () => {
  const commodities = Catalog.staticInstruments("futures");
  const wti = commodities.find(entry => entry.symbol === "WTI");
  const gold = commodities.find(entry => entry.symbol === "GOLD");
  const aluminum = commodities.find(entry => entry.symbol === "ALUMINUM");
  assert.equal(commodities.length, 11);
  assert.deepEqual(commodities.map(entry => entry.symbol), ["WTI", "NATURAL_GAS", "GOLD", "SILVER", "COPPER", "ALUMINUM", "PLATINUM", "PALLADIUM", "WHEAT", "CORN", "SOYBEANS"]);
  assert.ok(commodities.every(entry => entry.assetClass === "futures" && entry.massive.family === "futures" && /^[A-Z0-9]{1,4}$/.test(entry.massive.productCode) && !entry.massive.ticker),
    "the catalog carries product codes only; Massive must verify today's active dated contract");
  assert.equal(wti.dataShape, "ohlcv");
  assert.equal(wti.massive.productCode, "CL");
  assert.equal(gold.massive.productCode, "GC");
  assert.equal(aluminum.massive.productCode, "ALI");
  assert.equal(aluminum.quoteCurrency, "USD/metric ton");
  assert.equal(aluminum.sector, "Industrial metals");
  assert.deepEqual(wti.tags, ["Energy", "Crude oil"]);
  assert.deepEqual(gold.tags, ["Precious metal"]);
  assert.equal(wti.quoteCurrency, "USD/barrel");
  assert.match(Catalog.disc("commodities").ranking, /Worker resolves today's active single contract through Massive/);

  const energyStock = TICKERBOT_WATCHLIST.find(entry => entry.sector === "Energy");
  assert.ok(energyStock, "the reviewed stock deck retains energy-company equities");
  assert.notEqual(energyStock.symbol, "WTI");
  assert.equal(energyStock.discId, undefined, "an equity does not become a commodity contract");
});

test("Alpha Vantage/1mo is absent from the selectable Characters catalog", () => {
  const stocks = Catalog.disc("stocks");
  assert.ok(!stocks.intervalModes.includes("1mo"));
  assert.match(stocks.ranking, /Alpha Vantage are not stock substitutes/);
});
