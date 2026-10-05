/*
 * Static, attributed October 2, 2026 market-cap snapshot for the 52 ticker orbs.
 * Values and sector labels are transcribed from StockTitan's daily sector
 * rankings; only U.S.-country issuers were selected. `sectorRank` is the source
 * ranking position (so gaps are expected where a higher-ranked issuer is not
 * U.S.-domiciled). This is roster metadata, not a live market-data substitute.
 */
"use strict";

(() => {
  const asOf = "2026-10-02";
  const source = "StockTitan · U.S.-listed companies by sector market capitalization";
  const url = sector => `https://www.stocktitan.net/rankings/companies-market-cap/sector/${sector}`;
  const asset = (symbol, name, sector, sectorRank, marketCapLabel, marketCapUsd, sectorSlug) => Object.freeze({
    symbol, name, sector, country: "United States", sectorRank,
    marketCapLabel, marketCapUsd, marketCapAsOf: asOf,
    marketCapSource: source, marketCapSourceUrl: url(sectorSlug)
  });

  const roster = Object.freeze([
    // Technology · highest market cap first (StockTitan sector ranks 1, 2, 3, 5, 7, 8, 10)
    asset("NVDA", "Nvidia Corp", "Technology", 1, "$5.65T", 5_650_000_000_000, "technology"),
    asset("AAPL", "Apple Inc.", "Technology", 2, "$4.82T", 4_820_000_000_000, "technology"),
    asset("MSFT", "Microsoft Corp", "Technology", 3, "$3.84T", 3_840_000_000_000, "technology"),
    asset("AVGO", "Broadcom Inc.", "Technology", 5, "$1.70T", 1_700_000_000_000, "technology"),
    asset("MU", "Micron Technology, Inc.", "Technology", 7, "$1.21T", 1_210_000_000_000, "technology"),
    asset("AMD", "Advanced Micro Devices", "Technology", 8, "$1.03T", 1_030_000_000_000, "technology"),
    asset("INTC", "Intel Corp", "Technology", 10, "$630.79B", 630_790_000_000, "technology"),

    // Communication Services · source ranks 1–6
    asset("GOOGL", "Alphabet Inc.", "Communication Services", 1, "$4.20T", 4_200_000_000_000, "communication-services"),
    asset("META", "Meta Platforms, Inc.", "Communication Services", 2, "$1.85T", 1_850_000_000_000, "communication-services"),
    asset("NFLX", "NetFlix Inc", "Communication Services", 3, "$279.23B", 279_230_000_000, "communication-services"),
    asset("VZ", "Verizon Communications Inc.", "Communication Services", 4, "$190.79B", 190_790_000_000, "communication-services"),
    asset("TMUS", "T-Mobile US, Inc.", "Communication Services", 5, "$175.53B", 175_530_000_000, "communication-services"),
    asset("DIS", "Walt Disney Company", "Communication Services", 6, "$174.97B", 174_970_000_000, "communication-services"),

    // Consumer Cyclical · U.S. issuers at source ranks 1, 2, 3, 6, 7, 8
    asset("AMZN", "Amazon.com, Inc.", "Consumer Cyclical", 1, "$2.71T", 2_710_000_000_000, "consumer-cyclical"),
    asset("TSLA", "Tesla, Inc.", "Consumer Cyclical", 2, "$1.46T", 1_460_000_000_000, "consumer-cyclical"),
    asset("HD", "Home Depot, Inc.", "Consumer Cyclical", 3, "$282.20B", 282_200_000_000, "consumer-cyclical"),
    asset("MCD", "McDonald's Corporation", "Consumer Cyclical", 6, "$164.09B", 164_090_000_000, "consumer-cyclical"),
    asset("TJX", "The TJX Companies, Inc.", "Consumer Cyclical", 7, "$145.94B", 145_940_000_000, "consumer-cyclical"),
    asset("BKNG", "Booking Holdings Inc.", "Consumer Cyclical", 8, "$119.48B", 119_480_000_000, "consumer-cyclical"),

    // Industrials · U.S. issuers at source ranks 1–6 and 8
    asset("SPCX", "SpaceX", "Industrials", 1, "$2.10T", 2_100_000_000_000, "industrials"),
    asset("CAT", "Caterpillar Inc.", "Industrials", 2, "$388.62B", 388_620_000_000, "industrials"),
    asset("GE", "GE Aerospace", "Industrials", 3, "$321.19B", 321_190_000_000, "industrials"),
    asset("GEV", "GE Vernova", "Industrials", 4, "$263.32B", 263_320_000_000, "industrials"),
    asset("RTX", "RTX Corporation", "Industrials", 5, "$248.90B", 248_900_000_000, "industrials"),
    asset("DE", "Deere & Company", "Industrials", 6, "$185.23B", 185_230_000_000, "industrials"),
    asset("UNP", "Union Pacific Corp.", "Industrials", 8, "$165.32B", 165_320_000_000, "industrials"),

    // Healthcare · U.S. issuers at source ranks 1–5, 8, 9
    asset("LLY", "Eli Lilly and Company", "Healthcare", 1, "$1.02T", 1_020_000_000_000, "healthcare"),
    asset("JNJ", "Johnson & Johnson", "Healthcare", 2, "$617.01B", 617_010_000_000, "healthcare"),
    asset("ABBV", "AbbVie Inc.", "Healthcare", 3, "$459.33B", 459_330_000_000, "healthcare"),
    asset("MRK", "Merck & Co., Inc.", "Healthcare", 4, "$356.01B", 356_010_000_000, "healthcare"),
    asset("UNH", "UnitedHealth Group Incorporated", "Healthcare", 5, "$333.82B", 333_820_000_000, "healthcare"),
    asset("TMO", "Thermo Fisher Scientific Inc.", "Healthcare", 8, "$242.11B", 242_110_000_000, "healthcare"),
    asset("AMGN", "Amgen Inc", "Healthcare", 9, "$217.90B", 217_900_000_000, "healthcare"),

    // Financial Services · U.S. issuers at source ranks 1–4, 6, 8, 10
    asset("JPM", "JPMorgan Chase & Co.", "Financial Services", 1, "$883.53B", 883_530_000_000, "financial-services"),
    asset("V", "VISA Inc.", "Financial Services", 2, "$677.09B", 677_090_000_000, "financial-services"),
    asset("MA", "Mastercard Incorporated", "Financial Services", 3, "$483.79B", 483_790_000_000, "financial-services"),
    asset("BAC", "Bank of America Corporation", "Financial Services", 4, "$375.86B", 375_860_000_000, "financial-services"),
    asset("MS", "Morgan Stanley", "Financial Services", 6, "$298.89B", 298_890_000_000, "financial-services"),
    asset("GS", "Goldman Sachs Group Inc.", "Financial Services", 8, "$262.80B", 262_800_000_000, "financial-services"),
    asset("WFC", "Wells Fargo & Co.", "Financial Services", 10, "$243.28B", 243_280_000_000, "financial-services"),

    // Consumer Defensive · source ranks 1–6
    asset("WMT", "Walmart Inc.", "Consumer Defensive", 1, "$827.17B", 827_170_000_000, "consumer-defensive"),
    asset("COST", "Costco Wholesale Corporation", "Consumer Defensive", 2, "$408.09B", 408_090_000_000, "consumer-defensive"),
    asset("KO", "Coca-Cola Company", "Consumer Defensive", 3, "$368.51B", 368_510_000_000, "consumer-defensive"),
    asset("PG", "Procter & Gamble Company", "Consumer Defensive", 4, "$336.58B", 336_580_000_000, "consumer-defensive"),
    asset("PM", "Philip Morris International Inc.", "Consumer Defensive", 5, "$292.18B", 292_180_000_000, "consumer-defensive"),
    asset("PEP", "PepsiCo, Inc.", "Consumer Defensive", 6, "$171.83B", 171_830_000_000, "consumer-defensive"),

    // Energy · U.S. issuers at source ranks 1, 2, 5, 7, 8, 10
    asset("XOM", "ExxonMobil", "Energy", 1, "$674.39B", 674_390_000_000, "energy"),
    asset("CVX", "Chevron Corporation", "Energy", 2, "$406.25B", 406_250_000_000, "energy"),
    asset("COP", "ConocoPhillips", "Energy", 5, "$152.27B", 152_270_000_000, "energy"),
    asset("MPC", "MARATHON PETROLEUM CORPORATION", "Energy", 7, "$118.60B", 118_600_000_000, "energy"),
    asset("VLO", "Valero Energy Corporation", "Energy", 8, "$116.98B", 116_980_000_000, "energy"),
    asset("PSX", "PHILLIPS 66", "Energy", 10, "$105.57B", 105_570_000_000, "energy")
  ]);

  window.GoodIntelligenceMarketRoster = Object.freeze({
    SCHEMA: "good-intelligence-market-roster-v1",
    asOf,
    source,
    assets: roster
  });
})();
