/* Shared Characters Disc metadata. This file is intentionally a plain IIFE so the
   browser and Cloudflare Worker can consume the same reviewed instrument catalog. */
"use strict";

(() => {
  /* Every static entry is frozen because this catalog is shared by browser and
     Worker code. Massive mappings are explicit reviewed routing metadata, not
     user-provided tickers; FX mappings are mechanically derived from the six
     ISO letters only after the roster itself has been reviewed. Commodity
     metadata contains product codes only; the Worker must verify today's active
     dated contract with Massive before it may request futures bars. */
  const freezeEntries = entries => Object.freeze(entries.map(entry => {
    const derivedMassive = entry.massive || (entry.assetClass === "fx" && /^[A-Z]{6}$/.test(entry.symbol || "")
      ? { ticker: `C:${entry.symbol}`, family: "aggs" }
      : {});
    return Object.freeze({
      ...entry,
      tags: Object.freeze([...(entry.tags || [])]),
      massive: Object.freeze({ ...derivedMassive })
    });
  }));

  /* Reviewed Massive Futures product codes. Dated contract tickers are
     deliberately absent: the Worker resolves and validates today's active
     single contract from Massive's contracts reference endpoint before bars
     are requested. */
  const FUTURES_MASSIVE = Object.freeze({
    WTI: { productCode: "CL", family: "futures" },
    NATURAL_GAS: { productCode: "NG", family: "futures" },
    GOLD: { productCode: "GC", family: "futures" },
    SILVER: { productCode: "SI", family: "futures" },
    COPPER: { productCode: "HG", family: "futures" },
    ALUMINUM: { productCode: "ALI", family: "futures" },
    PLATINUM: { productCode: "PL", family: "futures" },
    PALLADIUM: { productCode: "PA", family: "futures" },
    WHEAT: { productCode: "ZW", family: "futures" },
    CORN: { productCode: "ZC", family: "futures" },
    SOYBEANS: { productCode: "ZS", family: "futures" }
  });

  const BIS_FX_CURRENCIES = freezeEntries([
    { symbol: "EURUSD", displaySymbol: "EUR/USD", name: "Euro / US dollar", sector: "FX majors", assetClass: "fx", quoteCurrency: "USD", turnoverRank: 2, bisCode: "EUR" },
    { symbol: "JPYUSD", displaySymbol: "JPY/USD", name: "Japanese yen / US dollar", sector: "FX majors", assetClass: "fx", quoteCurrency: "USD", turnoverRank: 3, bisCode: "JPY" },
    { symbol: "GBPUSD", displaySymbol: "GBP/USD", name: "Pound sterling / US dollar", sector: "FX majors", assetClass: "fx", quoteCurrency: "USD", turnoverRank: 4, bisCode: "GBP" },
    { symbol: "CNYUSD", displaySymbol: "CNY/USD", name: "Chinese renminbi / US dollar", sector: "FX majors", assetClass: "fx", quoteCurrency: "USD", turnoverRank: 5, bisCode: "CNY" },
    { symbol: "CHFUSD", displaySymbol: "CHF/USD", name: "Swiss franc / US dollar", sector: "FX majors", assetClass: "fx", quoteCurrency: "USD", turnoverRank: 6, bisCode: "CHF" },
    { symbol: "AUDUSD", displaySymbol: "AUD/USD", name: "Australian dollar / US dollar", sector: "FX majors", assetClass: "fx", quoteCurrency: "USD", turnoverRank: 7, bisCode: "AUD" },
    { symbol: "CADUSD", displaySymbol: "CAD/USD", name: "Canadian dollar / US dollar", sector: "FX majors", assetClass: "fx", quoteCurrency: "USD", turnoverRank: 8, bisCode: "CAD" },
    { symbol: "HKDUSD", displaySymbol: "HKD/USD", name: "Hong Kong dollar / US dollar", sector: "FX majors", assetClass: "fx", quoteCurrency: "USD", bisCode: "HKD" },
    { symbol: "SGDUSD", displaySymbol: "SGD/USD", name: "Singapore dollar / US dollar", sector: "FX majors", assetClass: "fx", quoteCurrency: "USD", bisCode: "SGD" },
    { symbol: "INRUSD", displaySymbol: "INR/USD", name: "Indian rupee / US dollar", sector: "FX majors", assetClass: "fx", quoteCurrency: "USD", bisCode: "INR" },
    { symbol: "NZDUSD", displaySymbol: "NZD/USD", name: "New Zealand dollar / US dollar", sector: "FX majors", assetClass: "fx", quoteCurrency: "USD", bisCode: "NZD" },
    { symbol: "MXNUSD", displaySymbol: "MXN/USD", name: "Mexican peso / US dollar", sector: "FX emerging", assetClass: "fx", quoteCurrency: "USD", bisCode: "MXN" },
    { symbol: "KRWUSD", displaySymbol: "KRW/USD", name: "South Korean won / US dollar", sector: "FX emerging", assetClass: "fx", quoteCurrency: "USD", bisCode: "KRW" },
    { symbol: "BRLUSD", displaySymbol: "BRL/USD", name: "Brazilian real / US dollar", sector: "FX emerging", assetClass: "fx", quoteCurrency: "USD", bisCode: "BRL" },
    { symbol: "TWDUSD", displaySymbol: "TWD/USD", name: "New Taiwan dollar / US dollar", sector: "FX emerging", assetClass: "fx", quoteCurrency: "USD", bisCode: "TWD" },
    { symbol: "ZARUSD", displaySymbol: "ZAR/USD", name: "South African rand / US dollar", sector: "FX emerging", assetClass: "fx", quoteCurrency: "USD", bisCode: "ZAR" },
    { symbol: "SEKUSD", displaySymbol: "SEK/USD", name: "Swedish krona / US dollar", sector: "FX emerging", assetClass: "fx", quoteCurrency: "USD", bisCode: "SEK" },
    { symbol: "NOKUSD", displaySymbol: "NOK/USD", name: "Norwegian krone / US dollar", sector: "FX emerging", assetClass: "fx", quoteCurrency: "USD", bisCode: "NOK" },
    { symbol: "TRYUSD", displaySymbol: "TRY/USD", name: "Turkish lira / US dollar", sector: "FX emerging", assetClass: "fx", quoteCurrency: "USD", bisCode: "TRY" },
    { symbol: "DKKUSD", displaySymbol: "DKK/USD", name: "Danish krone / US dollar", sector: "FX emerging", assetClass: "fx", quoteCurrency: "USD", bisCode: "DKK" },
    { symbol: "PLNUSD", displaySymbol: "PLN/USD", name: "Polish zloty / US dollar", sector: "FX emerging", assetClass: "fx", quoteCurrency: "USD", bisCode: "PLN" },
    { symbol: "HUFUSD", displaySymbol: "HUF/USD", name: "Hungarian forint / US dollar", sector: "FX emerging", assetClass: "fx", quoteCurrency: "USD", bisCode: "HUF" },
    { symbol: "RUBUSD", displaySymbol: "RUB/USD", name: "Russian ruble / US dollar", sector: "FX emerging", assetClass: "fx", quoteCurrency: "USD", bisCode: "RUB" }
  ]);

  const FUTURES = freezeEntries([
    { symbol: "WTI", displaySymbol: "WTI", name: "West Texas Intermediate crude", sector: "Energy", assetClass: "futures", dataShape: "ohlcv", quoteCurrency: "USD/barrel", tags: ["Energy", "Crude oil"] },
    { symbol: "NATURAL_GAS", displaySymbol: "NATURAL GAS", name: "Henry Hub natural gas", sector: "Energy", assetClass: "commodity", dataShape: "ohlcv", quoteCurrency: "USD/MMBtu", tags: ["Energy"] },
    { symbol: "GOLD", displaySymbol: "GOLD", name: "Gold", sector: "Precious metals", assetClass: "commodity", dataShape: "ohlcv", quoteCurrency: "USD/troy ounce", tags: ["Precious metal"] },
    { symbol: "SILVER", displaySymbol: "SILVER", name: "Silver", sector: "Precious metals", assetClass: "commodity", dataShape: "ohlcv", quoteCurrency: "USD/troy ounce", tags: ["Precious metal"] },
    { symbol: "COPPER", displaySymbol: "COPPER", name: "Copper", sector: "Industrial metals", assetClass: "commodity", dataShape: "ohlcv", quoteCurrency: "USD/lb", tags: ["Industrial metal"] },
    { symbol: "ALUMINUM", displaySymbol: "ALUMINUM", name: "Aluminum", sector: "Industrial metals", assetClass: "commodity", dataShape: "ohlcv", quoteCurrency: "USD/metric ton", tags: ["Industrial metal"] },
    { symbol: "PLATINUM", displaySymbol: "PLATINUM", name: "Platinum", sector: "Precious metals", assetClass: "commodity", dataShape: "ohlcv", quoteCurrency: "USD/troy ounce", tags: ["Precious metal"] },
    { symbol: "PALLADIUM", displaySymbol: "PALLADIUM", name: "Palladium", sector: "Precious metals", assetClass: "commodity", dataShape: "ohlcv", quoteCurrency: "USD/troy ounce", tags: ["Precious metal"] },
    { symbol: "WHEAT", displaySymbol: "WHEAT", name: "Wheat", sector: "Agriculture", assetClass: "commodity", dataShape: "ohlcv", quoteCurrency: "USD/bushel", tags: ["Agriculture"] },
    { symbol: "CORN", displaySymbol: "CORN", name: "Corn", sector: "Agriculture", assetClass: "commodity", dataShape: "ohlcv", quoteCurrency: "USD/bushel", tags: ["Agriculture"] },
    { symbol: "SOYBEANS", displaySymbol: "SOYBEANS", name: "Soybeans", sector: "Agriculture", assetClass: "commodity", dataShape: "ohlcv", quoteCurrency: "USD/bushel", tags: ["Agriculture"] }
  ].map(entry => ({ ...entry, massive: FUTURES_MASSIVE[entry.symbol] })));

  const INDICES = freezeEntries([
    { symbol: "NDX", displaySymbol: "NDX", name: "NASDAQ-100 Index", sector: "U.S. headline / structural", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Headline / structural"], massive: { ticker: "I:NDX", family: "aggs" } },
    { symbol: "COMP", displaySymbol: "COMP", name: "Nasdaq Composite Index", sector: "U.S. headline / structural", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Headline / structural"], massive: { ticker: "I:COMP", family: "aggs" } },
    { symbol: "DJT", displaySymbol: "DJT", name: "Dow Jones Transportation Average", sector: "U.S. headline / structural", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Headline / structural"], massive: { ticker: "I:DJT", family: "aggs" } },
    { symbol: "DJU", displaySymbol: "DJU", name: "Dow Jones Utilities Average", sector: "U.S. headline / structural", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Headline / structural"], massive: { ticker: "I:DJU", family: "aggs" } },
    { symbol: "BKX", displaySymbol: "BKX", name: "KBW Bank Index", sector: "U.S. headline / structural", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Headline / structural"], massive: { ticker: "I:BKX", family: "aggs" } },
    { symbol: "SOX", displaySymbol: "SOX", name: "PHLX Semiconductor Index", sector: "U.S. headline / structural", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Headline / structural"], massive: { ticker: "I:SOX", family: "aggs" } },
    { symbol: "REIT", displaySymbol: "REIT", name: "REIT Index", sector: "U.S. headline / structural", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Headline / structural"], massive: { ticker: "I:REIT", family: "aggs" } },
    { symbol: "BANK", displaySymbol: "BANK", name: "Bank Index", sector: "U.S. headline / structural", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Headline / structural"], massive: { ticker: "I:BANK", family: "aggs" } },
    { symbol: "DJUSEN", displaySymbol: "DJUSEN", name: "Index I:DJUSEN", sector: "U.S. sector architecture", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Sector"], massive: { ticker: "I:DJUSEN", family: "aggs" } },
    { symbol: "DJUSFI", displaySymbol: "DJUSFI", name: "Index I:DJUSFI", sector: "U.S. sector architecture", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Sector"], massive: { ticker: "I:DJUSFI", family: "aggs" } },
    { symbol: "DJUSHC", displaySymbol: "DJUSHC", name: "Index I:DJUSHC", sector: "U.S. sector architecture", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Sector"], massive: { ticker: "I:DJUSHC", family: "aggs" } },
    { symbol: "DJUSIN", displaySymbol: "DJUSIN", name: "Index I:DJUSIN", sector: "U.S. sector architecture", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Sector"], massive: { ticker: "I:DJUSIN", family: "aggs" } },
    { symbol: "DJUSTC", displaySymbol: "DJUSTC", name: "Index I:DJUSTC", sector: "U.S. sector architecture", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Sector"], massive: { ticker: "I:DJUSTC", family: "aggs" } },
    { symbol: "DJUSUT", displaySymbol: "DJUSUT", name: "Index I:DJUSUT", sector: "U.S. sector architecture", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Sector"], massive: { ticker: "I:DJUSUT", family: "aggs" } },
    { symbol: "DJUSCN", displaySymbol: "DJUSCN", name: "Index I:DJUSCN", sector: "U.S. sector architecture", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Sector"], massive: { ticker: "I:DJUSCN", family: "aggs" } },
    { symbol: "DJUSCS", displaySymbol: "DJUSCS", name: "Index I:DJUSCS", sector: "U.S. sector architecture", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Sector"], massive: { ticker: "I:DJUSCS", family: "aggs" } },
    { symbol: "DJUSRE", displaySymbol: "DJUSRE", name: "Index I:DJUSRE", sector: "U.S. sector architecture", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Sector"], massive: { ticker: "I:DJUSRE", family: "aggs" } },
    { symbol: "DJUSRT", displaySymbol: "DJUSRT", name: "Index I:DJUSRT", sector: "U.S. sector architecture", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Sector"], massive: { ticker: "I:DJUSRT", family: "aggs" } },
    { symbol: "DJUSFN", displaySymbol: "DJUSFN", name: "Index I:DJUSFN", sector: "U.S. sector architecture", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Sector"], massive: { ticker: "I:DJUSFN", family: "aggs" } },
    { symbol: "DJUSFV", displaySymbol: "DJUSFV", name: "Index I:DJUSFV", sector: "U.S. sector architecture", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Sector"], massive: { ticker: "I:DJUSFV", family: "aggs" } },
    { symbol: "DJUSAP", displaySymbol: "DJUSAP", name: "Index I:DJUSAP", sector: "U.S. industry / subindustry", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Industry / subindustry"], massive: { ticker: "I:DJUSAP", family: "aggs" } },
    { symbol: "DJUSBK", displaySymbol: "DJUSBK", name: "Index I:DJUSBK", sector: "U.S. industry / subindustry", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Industry / subindustry"], massive: { ticker: "I:DJUSBK", family: "aggs" } },
    { symbol: "DJUSBS", displaySymbol: "DJUSBS", name: "Index I:DJUSBS", sector: "U.S. industry / subindustry", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Industry / subindustry"], massive: { ticker: "I:DJUSBS", family: "aggs" } },
    { symbol: "DJUSCH", displaySymbol: "DJUSCH", name: "Index I:DJUSCH", sector: "U.S. industry / subindustry", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Industry / subindustry"], massive: { ticker: "I:DJUSCH", family: "aggs" } },
    { symbol: "DJUSIG", displaySymbol: "DJUSIG", name: "Index I:DJUSIG", sector: "U.S. industry / subindustry", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Industry / subindustry"], massive: { ticker: "I:DJUSIG", family: "aggs" } },
    { symbol: "DJUSIR", displaySymbol: "DJUSIR", name: "Index I:DJUSIR", sector: "U.S. industry / subindustry", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Industry / subindustry"], massive: { ticker: "I:DJUSIR", family: "aggs" } },
    { symbol: "DJUSME", displaySymbol: "DJUSME", name: "Index I:DJUSME", sector: "U.S. industry / subindustry", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Industry / subindustry"], massive: { ticker: "I:DJUSME", family: "aggs" } },
    { symbol: "DJUSNG", displaySymbol: "DJUSNG", name: "Index I:DJUSNG", sector: "U.S. industry / subindustry", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Industry / subindustry"], massive: { ticker: "I:DJUSNG", family: "aggs" } },
    { symbol: "DJUSFB", displaySymbol: "DJUSFB", name: "Index I:DJUSFB", sector: "U.S. industry / subindustry", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Industry / subindustry"], massive: { ticker: "I:DJUSFB", family: "aggs" } },
    { symbol: "DJUSCG", displaySymbol: "DJUSCG", name: "Index I:DJUSCG", sector: "U.S. industry / subindustry", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Industry / subindustry"], massive: { ticker: "I:DJUSCG", family: "aggs" } },
    { symbol: "DJUSAE", displaySymbol: "DJUSAE", name: "Index I:DJUSAE", sector: "U.S. industry / subindustry", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Industry / subindustry"], massive: { ticker: "I:DJUSAE", family: "aggs" } },
    { symbol: "DJUSTL", displaySymbol: "DJUSTL", name: "Index I:DJUSTL", sector: "U.S. industry / subindustry", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Industry / subindustry"], massive: { ticker: "I:DJUSTL", family: "aggs" } },
    { symbol: "DJUSCR", displaySymbol: "DJUSCR", name: "Index I:DJUSCR", sector: "U.S. industry / subindustry", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Industry / subindustry"], massive: { ticker: "I:DJUSCR", family: "aggs" } },
    { symbol: "DJUSCA", displaySymbol: "DJUSCA", name: "Index I:DJUSCA", sector: "U.S. industry / subindustry", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Industry / subindustry"], massive: { ticker: "I:DJUSCA", family: "aggs" } },
    { symbol: "DJUSAI", displaySymbol: "DJUSAI", name: "Index I:DJUSAI", sector: "U.S. industry / subindustry", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Industry / subindustry"], massive: { ticker: "I:DJUSAI", family: "aggs" } },
    { symbol: "DJUSNS", displaySymbol: "DJUSNS", name: "Index I:DJUSNS", sector: "U.S. industry / subindustry", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Industry / subindustry"], massive: { ticker: "I:DJUSNS", family: "aggs" } },
    { symbol: "DJAUS", displaySymbol: "DJAUS", name: "Index I:DJAUS", sector: "International / regional", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "International / regional"], massive: { ticker: "I:DJAUS", family: "aggs" } },
    { symbol: "CADOW", displaySymbol: "CADOW", name: "Index I:CADOW", sector: "International / regional", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "International / regional"], massive: { ticker: "I:CADOW", family: "aggs" } },
    { symbol: "CHDOW", displaySymbol: "CHDOW", name: "Index I:CHDOW", sector: "International / regional", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "International / regional"], massive: { ticker: "I:CHDOW", family: "aggs" } },
    { symbol: "DEDOW", displaySymbol: "DEDOW", name: "Index I:DEDOW", sector: "International / regional", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "International / regional"], massive: { ticker: "I:DEDOW", family: "aggs" } },
    { symbol: "FRDOW", displaySymbol: "FRDOW", name: "Index I:FRDOW", sector: "International / regional", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "International / regional"], massive: { ticker: "I:FRDOW", family: "aggs" } },
    { symbol: "GBDOW", displaySymbol: "GBDOW", name: "Index I:GBDOW", sector: "International / regional", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "International / regional"], massive: { ticker: "I:GBDOW", family: "aggs" } },
    { symbol: "HKDOW", displaySymbol: "HKDOW", name: "Index I:HKDOW", sector: "International / regional", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "International / regional"], massive: { ticker: "I:HKDOW", family: "aggs" } },
    { symbol: "JPDOW", displaySymbol: "JPDOW", name: "Index I:JPDOW", sector: "International / regional", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "International / regional"], massive: { ticker: "I:JPDOW", family: "aggs" } },
    { symbol: "DWAEM", displaySymbol: "DWAEM", name: "Index I:DWAEM", sector: "Thematic / factor / specialty", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Thematic / factor / specialty"], massive: { ticker: "I:DWAEM", family: "aggs" } },
    { symbol: "DWAMLVEM", displaySymbol: "DWAMLVEM", name: "Index I:DWAMLVEM", sector: "Thematic / factor / specialty", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Thematic / factor / specialty"], massive: { ticker: "I:DWAMLVEM", family: "aggs" } },
    { symbol: "GRNENEF", displaySymbol: "GRNENEF", name: "Index I:GRNENEF", sector: "Thematic / factor / specialty", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Thematic / factor / specialty"], massive: { ticker: "I:GRNENEF", family: "aggs" } },
    { symbol: "GRNWINDX", displaySymbol: "GRNWINDX", name: "Index I:GRNWINDX", sector: "Thematic / factor / specialty", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Thematic / factor / specialty"], massive: { ticker: "I:GRNWINDX", family: "aggs" } },
    { symbol: "GRNEUROPE", displaySymbol: "GRNEUROPE", name: "Index I:GRNEUROPE", sector: "Thematic / factor / specialty", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Thematic / factor / specialty"], massive: { ticker: "I:GRNEUROPE", family: "aggs" } },
    { symbol: "NDXESG", displaySymbol: "NDXESG", name: "Index I:NDXESG", sector: "Thematic / factor / specialty", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Thematic / factor / specialty"], massive: { ticker: "I:NDXESG", family: "aggs" } },
    { symbol: "NDXDIV", displaySymbol: "NDXDIV", name: "Index I:NDXDIV", sector: "Thematic / factor / specialty", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Thematic / factor / specialty"], massive: { ticker: "I:NDXDIV", family: "aggs" } },
    { symbol: "DEFENSE", displaySymbol: "DEFENSE", name: "Index I:DEFENSE", sector: "Thematic / factor / specialty", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Thematic / factor / specialty"], massive: { ticker: "I:DEFENSE", family: "aggs" } }
  ]);

  /* Provider modes are deliberately narrow:
     - Tickerbot exclusively serves the reviewed Disc1 stock sphere (daily and
       on-demand stock intervals); Massive is not a stock substitute.
     - Kraken public Spot serves Disc3 ranking and daily pair bars.
     - Massive serves reviewed FX, futures, and index series.
     - Alpha Vantage/1mo is retired from selectable and savable routes; old
       observations may be parsed only as read-only legacy history.
     Non-stock Discs expose only the daily interval so the UI cannot imply an
     unsupported provider/cadence path. */
  const DISCS = Object.freeze([
    Object.freeze({
      id: "stocks", number: 1, name: "The 52 Cards", label: "Disc1 · The 52 Cards",
      assetClass: "equity", intervalModes: Object.freeze(["1h", "1d"]),
      defaultProvider: "tickerbot",
      ranking: "Reviewed 52-card U.S. stock watchlist. Tickerbot is the exclusive Disc1 stock provider for Characters 1h/1d beats, NAB 1d observations, and Orb 2's bounded stock field; Massive and Alpha Vantage are not stock substitutes."
    }),
    Object.freeze({
      id: "fx", number: 2, name: "Fiat / FX", label: "Disc2 · Fiat / FX",
      assetClass: "fx", intervalModes: Object.freeze(["1d"]),
      defaultProvider: "massive",
      ranking: "BIS 2025 Triennial Survey. The released detailed tables name 23 non-USD currencies individually; the remainder are aggregated as other currencies, so a BIS-only top 52 cannot be ranked from the publication. Reviewed daily pairs route through Massive; no provider fallback is implied."
    }),
    Object.freeze({
      id: "crypto", number: 3, name: "Crypto", label: "Disc3 · Crypto",
      assetClass: "crypto", intervalModes: Object.freeze(["1d"]),
      defaultProvider: "kraken",
      ranking: "Kraken Spot venue data. Up to 52 USD-quoted spot pairs are ranked by the public Ticker endpoint's rolling-24-hour base volume × VWAP and cached for 24 hours; each exact Kraken pair's daily bars use public OHLC interval=1440. This is venue-specific, not a global market ranking or Massive's previous-UTC-day metric."
    }),
    Object.freeze({
      id: "commodities", number: 4, name: "Futures", label: "Disc4 · Futures",
      assetClass: "commodity", intervalModes: Object.freeze(["1d"]),
      defaultProvider: "massive",
      ranking: "Reviewed Massive Futures product-code roster for U.S. energy, metal, and grain contracts. Before bars are requested, the Worker resolves today's active single contract through Massive and caches it in D1 until UTC midnight; missing, inactive, unauthorized, or unverified contracts remain held with no stale-contract fallback. Futures-session bars supply OHLC and any reported volume; missing fields remain missing. Energy company shares remain in Disc1."
    }),
    Object.freeze({
      id: "indices", number: 5, name: "Indices", label: "Disc5 · Indices",
      assetClass: "index", intervalModes: Object.freeze(["1d"]),
      defaultProvider: "massive",
      ranking: "Static reviewed U.S. benchmark and volatility index roster. Massive supplies automatic daily bars; these are display-only reference series, not tradable instruments or advice."
    })
  ]);

  const api = Object.freeze({
    /* `discs` is what Characters and Orb 2 navigate: the five reviewed Discs.
       `sourceChannels` is the same frozen roster under the name the NAB composite
       field uses for its legacy evidence channels, so neither surface renames
       the other and no Disc silently becomes something else. */
    discs: DISCS,
    sourceChannels: DISCS,
    get nabDiscs() {
      return Object.freeze((globalThis.NabSectors?.sectors || []).map(nab => Object.freeze({
        id: `nab-${nab.id}`, nabId: nab.id, label: `NAB ${nab.id} · ${nab.name}`, theme: nab.theme
      })));
    },
    fxCurrencies: BIS_FX_CURRENCIES,
    commodities: COMMODITIES,
    indices: INDICES,
    disc(id) {\n      const normalized = String(id || "").toLowerCase() === "futures" ? "commodities" : String(id || "");\n      return DISCS.find(entry => entry.id === normalized) || null;\n    },
    staticInstruments(id) {
      if (id === "fx") return BIS_FX_CURRENCIES;
      if (id === "futures" || id === "commodities") return FUTURES;
      if (id === "indices") return INDICES;
      return Object.freeze([]);
    },
    rankingSource: Object.freeze({
      fx: "https://www.bis.org/publications/triennial-survey/rpfx25-fx-annex-2606.pdf",
      crypto: "https://docs.kraken.com/api-reference/market-data/get-ticker-information",
      cryptoBars: "https://docs.kraken.com/api-reference/market-data/get-ohlc-data",
      indices: "https://massive.com/docs/rest/indices/overview"
    })
  });
  Object.defineProperty(globalThis, "CharactersDiscCatalog", { configurable: true, enumerable: false, value: api });
})();
