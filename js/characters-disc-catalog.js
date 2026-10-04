/* Shared Characters Disc metadata. This file is intentionally a plain IIFE so the
   browser and Cloudflare Worker can consume the same reviewed instrument catalog. */
"use strict";

(() => {
  const freezeEntries = entries => Object.freeze(entries.map(entry => Object.freeze({
    ...entry,
    tags: Object.freeze([...(entry.tags || [])]),
    alphaVantage: Object.freeze({ ...(entry.alphaVantage || {}) })
  })));

  const BIS_FX_CURRENCIES = freezeEntries([
    { symbol: "EURUSD", displaySymbol: "EUR/USD", name: "Euro / US dollar", sector: "FX majors", assetClass: "fx", quoteCurrency: "USD", turnoverRank: 2, bisCode: "EUR", alphaVantage: { function: "FX_MONTHLY", fromSymbol: "EUR", toSymbol: "USD" } },
    { symbol: "JPYUSD", displaySymbol: "JPY/USD", name: "Japanese yen / US dollar", sector: "FX majors", assetClass: "fx", quoteCurrency: "USD", turnoverRank: 3, bisCode: "JPY", alphaVantage: { function: "FX_MONTHLY", fromSymbol: "JPY", toSymbol: "USD" } },
    { symbol: "GBPUSD", displaySymbol: "GBP/USD", name: "Pound sterling / US dollar", sector: "FX majors", assetClass: "fx", quoteCurrency: "USD", turnoverRank: 4, bisCode: "GBP", alphaVantage: { function: "FX_MONTHLY", fromSymbol: "GBP", toSymbol: "USD" } },
    { symbol: "CNYUSD", displaySymbol: "CNY/USD", name: "Chinese renminbi / US dollar", sector: "FX majors", assetClass: "fx", quoteCurrency: "USD", turnoverRank: 5, bisCode: "CNY", alphaVantage: { function: "FX_MONTHLY", fromSymbol: "CNY", toSymbol: "USD" } },
    { symbol: "CHFUSD", displaySymbol: "CHF/USD", name: "Swiss franc / US dollar", sector: "FX majors", assetClass: "fx", quoteCurrency: "USD", turnoverRank: 6, bisCode: "CHF", alphaVantage: { function: "FX_MONTHLY", fromSymbol: "CHF", toSymbol: "USD" } },
    { symbol: "AUDUSD", displaySymbol: "AUD/USD", name: "Australian dollar / US dollar", sector: "FX majors", assetClass: "fx", quoteCurrency: "USD", turnoverRank: 7, bisCode: "AUD", alphaVantage: { function: "FX_MONTHLY", fromSymbol: "AUD", toSymbol: "USD" } },
    { symbol: "CADUSD", displaySymbol: "CAD/USD", name: "Canadian dollar / US dollar", sector: "FX majors", assetClass: "fx", quoteCurrency: "USD", turnoverRank: 8, bisCode: "CAD", alphaVantage: { function: "FX_MONTHLY", fromSymbol: "CAD", toSymbol: "USD" } },
    { symbol: "HKDUSD", displaySymbol: "HKD/USD", name: "Hong Kong dollar / US dollar", sector: "FX majors", assetClass: "fx", quoteCurrency: "USD", bisCode: "HKD", alphaVantage: { function: "FX_MONTHLY", fromSymbol: "HKD", toSymbol: "USD" } },
    { symbol: "SGDUSD", displaySymbol: "SGD/USD", name: "Singapore dollar / US dollar", sector: "FX majors", assetClass: "fx", quoteCurrency: "USD", bisCode: "SGD", alphaVantage: { function: "FX_MONTHLY", fromSymbol: "SGD", toSymbol: "USD" } },
    { symbol: "INRUSD", displaySymbol: "INR/USD", name: "Indian rupee / US dollar", sector: "FX majors", assetClass: "fx", quoteCurrency: "USD", bisCode: "INR", alphaVantage: { function: "FX_MONTHLY", fromSymbol: "INR", toSymbol: "USD" } },
    { symbol: "NZDUSD", displaySymbol: "NZD/USD", name: "New Zealand dollar / US dollar", sector: "FX majors", assetClass: "fx", quoteCurrency: "USD", bisCode: "NZD", alphaVantage: { function: "FX_MONTHLY", fromSymbol: "NZD", toSymbol: "USD" } },
    { symbol: "MXNUSD", displaySymbol: "MXN/USD", name: "Mexican peso / US dollar", sector: "FX emerging", assetClass: "fx", quoteCurrency: "USD", bisCode: "MXN", alphaVantage: { function: "FX_MONTHLY", fromSymbol: "MXN", toSymbol: "USD" } },
    { symbol: "KRWUSD", displaySymbol: "KRW/USD", name: "South Korean won / US dollar", sector: "FX emerging", assetClass: "fx", quoteCurrency: "USD", bisCode: "KRW", alphaVantage: { function: "FX_MONTHLY", fromSymbol: "KRW", toSymbol: "USD" } },
    { symbol: "BRLUSD", displaySymbol: "BRL/USD", name: "Brazilian real / US dollar", sector: "FX emerging", assetClass: "fx", quoteCurrency: "USD", bisCode: "BRL", alphaVantage: { function: "FX_MONTHLY", fromSymbol: "BRL", toSymbol: "USD" } },
    { symbol: "TWDUSD", displaySymbol: "TWD/USD", name: "New Taiwan dollar / US dollar", sector: "FX emerging", assetClass: "fx", quoteCurrency: "USD", bisCode: "TWD", alphaVantage: { function: "FX_MONTHLY", fromSymbol: "TWD", toSymbol: "USD" } },
    { symbol: "ZARUSD", displaySymbol: "ZAR/USD", name: "South African rand / US dollar", sector: "FX emerging", assetClass: "fx", quoteCurrency: "USD", bisCode: "ZAR", alphaVantage: { function: "FX_MONTHLY", fromSymbol: "ZAR", toSymbol: "USD" } },
    { symbol: "SEKUSD", displaySymbol: "SEK/USD", name: "Swedish krona / US dollar", sector: "FX emerging", assetClass: "fx", quoteCurrency: "USD", bisCode: "SEK", alphaVantage: { function: "FX_MONTHLY", fromSymbol: "SEK", toSymbol: "USD" } },
    { symbol: "NOKUSD", displaySymbol: "NOK/USD", name: "Norwegian krone / US dollar", sector: "FX emerging", assetClass: "fx", quoteCurrency: "USD", bisCode: "NOK", alphaVantage: { function: "FX_MONTHLY", fromSymbol: "NOK", toSymbol: "USD" } },
    { symbol: "TRYUSD", displaySymbol: "TRY/USD", name: "Turkish lira / US dollar", sector: "FX emerging", assetClass: "fx", quoteCurrency: "USD", bisCode: "TRY", alphaVantage: { function: "FX_MONTHLY", fromSymbol: "TRY", toSymbol: "USD" } },
    { symbol: "DKKUSD", displaySymbol: "DKK/USD", name: "Danish krone / US dollar", sector: "FX emerging", assetClass: "fx", quoteCurrency: "USD", bisCode: "DKK", alphaVantage: { function: "FX_MONTHLY", fromSymbol: "DKK", toSymbol: "USD" } },
    { symbol: "PLNUSD", displaySymbol: "PLN/USD", name: "Polish zloty / US dollar", sector: "FX emerging", assetClass: "fx", quoteCurrency: "USD", bisCode: "PLN", alphaVantage: { function: "FX_MONTHLY", fromSymbol: "PLN", toSymbol: "USD" } },
    { symbol: "HUFUSD", displaySymbol: "HUF/USD", name: "Hungarian forint / US dollar", sector: "FX emerging", assetClass: "fx", quoteCurrency: "USD", bisCode: "HUF", alphaVantage: { function: "FX_MONTHLY", fromSymbol: "HUF", toSymbol: "USD" } },
    { symbol: "RUBUSD", displaySymbol: "RUB/USD", name: "Russian ruble / US dollar", sector: "FX emerging", assetClass: "fx", quoteCurrency: "USD", bisCode: "RUB", alphaVantage: { function: "FX_MONTHLY", fromSymbol: "RUB", toSymbol: "USD" } }
  ]);

  const COMMODITIES = freezeEntries([
    { symbol: "WTI", displaySymbol: "WTI", name: "West Texas Intermediate crude", sector: "Energy", assetClass: "commodity", dataShape: "value", quoteCurrency: "USD/barrel", tags: ["Energy", "Crude oil"], alphaVantage: { function: "WTI", interval: "monthly" } },
    { symbol: "BRENT", displaySymbol: "BRENT", name: "Brent crude oil", sector: "Energy", assetClass: "commodity", dataShape: "value", quoteCurrency: "USD/barrel", tags: ["Energy", "Crude oil"], alphaVantage: { function: "BRENT", interval: "monthly" } },
    { symbol: "NATURAL_GAS", displaySymbol: "NATURAL GAS", name: "Henry Hub natural gas", sector: "Energy", assetClass: "commodity", dataShape: "value", quoteCurrency: "USD/MMBtu", tags: ["Energy"], alphaVantage: { function: "NATURAL_GAS", interval: "monthly" } },
    { symbol: "COPPER", displaySymbol: "COPPER", name: "Copper", sector: "Industrial metals", assetClass: "commodity", dataShape: "value", quoteCurrency: "USD/metric ton", tags: ["Industrial metal"], alphaVantage: { function: "COPPER", interval: "monthly" } },
    { symbol: "ALUMINUM", displaySymbol: "ALUMINUM", name: "Aluminum", sector: "Industrial metals", assetClass: "commodity", dataShape: "value", quoteCurrency: "USD/metric ton", tags: ["Industrial metal"], alphaVantage: { function: "ALUMINUM", interval: "monthly" } },
    { symbol: "WHEAT", displaySymbol: "WHEAT", name: "Wheat", sector: "Agriculture", assetClass: "commodity", dataShape: "value", quoteCurrency: "USD/metric ton", tags: ["Agriculture"], alphaVantage: { function: "WHEAT", interval: "monthly" } },
    { symbol: "CORN", displaySymbol: "CORN", name: "Corn", sector: "Agriculture", assetClass: "commodity", dataShape: "value", quoteCurrency: "USD/metric ton", tags: ["Agriculture"], alphaVantage: { function: "CORN", interval: "monthly" } },
    { symbol: "COTTON", displaySymbol: "COTTON", name: "Cotton", sector: "Agriculture", assetClass: "commodity", dataShape: "value", quoteCurrency: "USD/lb", tags: ["Agriculture"], alphaVantage: { function: "COTTON", interval: "monthly" } },
    { symbol: "SUGAR", displaySymbol: "SUGAR", name: "Sugar", sector: "Agriculture", assetClass: "commodity", dataShape: "value", quoteCurrency: "USD/lb", tags: ["Agriculture"], alphaVantage: { function: "SUGAR", interval: "monthly" } },
    { symbol: "COFFEE", displaySymbol: "COFFEE", name: "Coffee", sector: "Agriculture", assetClass: "commodity", dataShape: "value", quoteCurrency: "USD/lb", tags: ["Agriculture"], alphaVantage: { function: "COFFEE", interval: "monthly" } }
  ]);

  const DISCS = Object.freeze([
    Object.freeze({
      id: "stocks", number: 1, name: "The 52 Cards", label: "Disc1 · The 52 Cards",
      assetClass: "equity", intervalModes: Object.freeze(["1h", "1d", "1mo"]),
      defaultProvider: "tickerbot",
      ranking: "Reviewed Tickerbot US stock watchlist; unchanged."
    }),
    Object.freeze({
      id: "fx", number: 2, name: "Fiat / FX", label: "Disc2 · Fiat / FX",
      assetClass: "fx", intervalModes: Object.freeze(["1h", "1d"]),
      defaultProvider: "tickerbot",
      ranking: "BIS 2025 Triennial Survey. The released detailed tables name 23 non-USD currencies individually; the remainder are aggregated as other currencies, so a BIS-only top 52 cannot be ranked from the publication. Alpha Vantage monthly FX is disabled for this Disc; Tickerbot is the default provider pending upcoming asset-class support."
    }),
    Object.freeze({
      id: "crypto", number: 3, name: "Crypto", label: "Disc3 · Crypto",
      assetClass: "crypto", intervalModes: Object.freeze(["1h", "1d"]),
      defaultProvider: "tickerbot",
      ranking: "CoinGecko /coins/markets, volume_desc, USD total_volume over the trailing 24 hours; top 52 unique ticker symbols. Live ranking snapshot; order can change. Alpha Vantage monthly digital-currency bars are disabled for this Disc; Tickerbot is the default provider pending upcoming asset-class support."
    }),
    Object.freeze({
      id: "commodities", number: 4, name: "Commodities", label: "Disc4 · Commodities",
      assetClass: "commodity", intervalModes: Object.freeze(["1h", "1d"]),
      defaultProvider: "tickerbot",
      ranking: "Static reviewed commodity roster (crude oil, natural gas, industrial metals, agriculture). Alpha Vantage monthly scalar series is disabled for this Disc; Tickerbot is the default provider pending upcoming asset-class support. Energy company shares stay in Disc1."
    })
  ]);

  const api = Object.freeze({
    discs: DISCS,
    fxCurrencies: BIS_FX_CURRENCIES,
    commodities: COMMODITIES,
    disc(id) { return DISCS.find(entry => entry.id === String(id || "")) || null; },
    staticInstruments(id) {
      if (id === "fx") return BIS_FX_CURRENCIES;
      if (id === "commodities") return COMMODITIES;
      return Object.freeze([]);
    },
    rankingSource: Object.freeze({
      fx: "https://www.bis.org/publications/triennial-survey/rpfx25-fx-annex-2606.pdf",
      crypto: "https://docs.coingecko.com/reference/coins-markets"
    })
  });
  Object.defineProperty(globalThis, "CharactersDiscCatalog", { configurable: true, enumerable: false, value: api });
})();
