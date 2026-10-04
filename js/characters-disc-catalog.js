/* Shared Characters Disc metadata. This file is intentionally a plain IIFE so the
   browser and Cloudflare Worker can consume the same reviewed instrument catalog. */
"use strict";

(() => {
  /* Every static entry is frozen because this catalog is shared by browser and
     Worker code. Massive mappings are explicit reviewed routing metadata, not
     user-provided tickers; FX mappings are mechanically derived from the six
     ISO letters only after the roster itself has been reviewed. */
  const freezeEntries = entries => Object.freeze(entries.map(entry => {
    const derivedMassive = entry.massive || (entry.assetClass === "fx" && /^[A-Z]{6}$/.test(entry.symbol || "")
      ? { ticker: `C:${entry.symbol}`, family: "aggs" }
      : {});
    return Object.freeze({
      ...entry,
      tags: Object.freeze([...(entry.tags || [])]),
      alphaVantage: Object.freeze({ ...(entry.alphaVantage || {}) }),
      massive: Object.freeze({ ...derivedMassive })
    });
  }));

  /* These are reviewed contract identifiers for the October 2026 catalog.
     They are intentionally metadata rather than free-form browser input;
     the Worker still validates every route and does not invent a rollover.
     A stale or unavailable contract is reported as unavailable, never
     replaced with a different commodity series. */
  const COMMODITY_MASSIVE = Object.freeze({
    WTI: { ticker: "CLZ6", family: "futures" },
    BRENT: { ticker: "BRNZ6", family: "futures" },
    NATURAL_GAS: { ticker: "NGZ6", family: "futures" },
    COPPER: { ticker: "HGZ6", family: "futures" },
    ALUMINUM: { ticker: "ALIU6", family: "futures" },
    WHEAT: { ticker: "ZWZ6", family: "futures" },
    CORN: { ticker: "ZCZ6", family: "futures" },
    COTTON: { ticker: "CTZ6", family: "futures" },
    SUGAR: { ticker: "SBH7", family: "futures" },
    COFFEE: { ticker: "KCZ6", family: "futures" }
  });

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
  ].map(entry => ({ ...entry, massive: COMMODITY_MASSIVE[entry.symbol] })));

  const INDICES = freezeEntries([
    { symbol: "SPX", displaySymbol: "S&P 500", name: "S&P 500 Index", sector: "U.S. benchmarks", assetClass: "index", dataShape: "ohlc", quoteCurrency: "USD", tags: ["Index"], massive: { ticker: "I:SPX", family: "aggs" } },
    { symbol: "NDX", displaySymbol: "NASDAQ 100", name: "NASDAQ-100 Index", sector: "U.S. benchmarks", assetClass: "index", dataShape: "ohlc", quoteCurrency: "USD", tags: ["Index", "Technology"], massive: { ticker: "I:NDX", family: "aggs" } },
    { symbol: "DJI", displaySymbol: "Dow 30", name: "Dow Jones Industrial Average", sector: "U.S. benchmarks", assetClass: "index", dataShape: "ohlc", quoteCurrency: "USD", tags: ["Index"], massive: { ticker: "I:DJI", family: "aggs" } },
    { symbol: "VIX", displaySymbol: "VIX", name: "Cboe Volatility Index", sector: "Volatility", assetClass: "index", dataShape: "ohlc", quoteCurrency: "index points", tags: ["Index", "Volatility"], massive: { ticker: "I:VIX", family: "aggs" } },
    { symbol: "RUT", displaySymbol: "Russell 2000", name: "Russell 2000 Index", sector: "U.S. benchmarks", assetClass: "index", dataShape: "ohlc", quoteCurrency: "USD", tags: ["Index", "Small cap"], massive: { ticker: "I:RUT", family: "aggs" } }
  ]);

  /* Provider modes are deliberately narrow:
     - Massive is the automatic, daily series provider for every reviewed Disc.
     - Tickerbot remains the on-demand stock provider (1h or 1d).
     - Alpha Vantage remains the separate Disc1-only 1mo spotlight.
     Non-stock Discs expose only the daily interval so the UI cannot imply an
     unsupported Tickerbot 1h path. */
  const DISCS = Object.freeze([
    Object.freeze({
      id: "stocks", number: 1, name: "The 52 Cards", label: "Disc1 · The 52 Cards",
      assetClass: "equity", intervalModes: Object.freeze(["1h", "1d", "1mo"]),
      defaultProvider: "massive",
      ranking: "Reviewed 52-card U.S. stock watchlist. Massive supplies automatic 1d beats; Tickerbot remains available on demand for 1h/1d. Alpha Vantage covers a separate 1mo best-performing-ticker spotlight."
    }),
    Object.freeze({
      id: "fx", number: 2, name: "Fiat / FX", label: "Disc2 · Fiat / FX",
      assetClass: "fx", intervalModes: Object.freeze(["1d"]),
      defaultProvider: "massive",
      ranking: "BIS 2025 Triennial Survey. The released detailed tables name 23 non-USD currencies individually; the remainder are aggregated as other currencies, so a BIS-only top 52 cannot be ranked from the publication. Reviewed daily pairs route through Massive; no Tickerbot or Alpha Vantage fallback is implied."
    }),
    Object.freeze({
      id: "crypto", number: 3, name: "Crypto", label: "Disc3 · Crypto",
      assetClass: "crypto", intervalModes: Object.freeze(["1d"]),
      defaultProvider: "massive",
      ranking: "CoinGecko /coins/markets, volume_desc, USD total_volume over the trailing 24 hours; top 52 unique ticker symbols. The live ranking can change; reviewed daily USD-pair bars route through Massive without an Alpha Vantage fallback."
    }),
    Object.freeze({
      id: "commodities", number: 4, name: "Commodities", label: "Disc4 · Commodities",
      assetClass: "commodity", intervalModes: Object.freeze(["1d"]),
      defaultProvider: "massive",
      ranking: "Static reviewed commodity roster (crude oil, natural gas, industrial metals, agriculture). Massive futures-session bars are daily only; a stale contract is shown unavailable rather than silently rolled. Energy company shares remain in Disc1."
    }),
    Object.freeze({
      id: "indices", number: 5, name: "Indices", label: "Disc5 · Indices",
      assetClass: "index", intervalModes: Object.freeze(["1d"]),
      defaultProvider: "massive",
      ranking: "Static reviewed U.S. benchmark and volatility index roster. Massive supplies automatic daily bars; these are display-only reference series, not tradable instruments or advice."
    })
  ]);

  const api = Object.freeze({
    discs: DISCS,
    fxCurrencies: BIS_FX_CURRENCIES,
    commodities: COMMODITIES,
    indices: INDICES,
    disc(id) { return DISCS.find(entry => entry.id === String(id || "")) || null; },
    staticInstruments(id) {
      if (id === "fx") return BIS_FX_CURRENCIES;
      if (id === "commodities") return COMMODITIES;
      if (id === "indices") return INDICES;
      return Object.freeze([]);
    },
    rankingSource: Object.freeze({
      fx: "https://www.bis.org/publications/triennial-survey/rpfx25-fx-annex-2606.pdf",
      crypto: "https://docs.coingecko.com/reference/coins-markets",
      indices: "https://massive.com/docs/rest/indices/overview"
    })
  });
  Object.defineProperty(globalThis, "CharactersDiscCatalog", { configurable: true, enumerable: false, value: api });
})();
