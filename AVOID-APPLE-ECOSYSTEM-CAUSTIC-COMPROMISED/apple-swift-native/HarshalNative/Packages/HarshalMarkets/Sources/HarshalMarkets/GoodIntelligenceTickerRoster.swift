import Foundation

/// The reviewed Good Intelligence Tickerbot roster — the fixed 52-asset
/// heartbeat watchlist, transcribed one-for-one from
/// `js/good-intelligence-market-roster.js` (as-of 2026-10-02).
///
/// This is **roster metadata only**: names, sectors, attributed market-cap
/// snapshot values, and ordering. It is never a live market-data substitute.
/// The native allowlist exists so a symbol can only ever select an
/// already-reviewed upstream path — the same guarantee the Worker enforces.
public enum GoodIntelligenceTickerRoster {
    public static let asOf = "2026-10-02"
    public static let source = "StockTitan · U.S.-listed companies by sector market capitalization"
    public static let intervals = ["15m", "1h", "1d"]

    public enum MarketStage: String, Codable, Sendable, CaseIterable {
        case established
        case formation
    }

    public struct Asset: Codable, Equatable, Sendable, Identifiable, Hashable {
        public let symbol: String
        public let name: String
        public let sector: String
        public let sectorRank: Int
        public let marketCapUsd: Int
        public let marketCapLabel: String
        public let marketStage: MarketStage

        public var id: String { symbol }
    }

    public static let assets: [Asset] = [
        .init(symbol: "NVDA", name: "Nvidia Corp", sector: "Technology", sectorRank: 1, marketCapUsd: 5650000000000, marketCapLabel: "$5.65T", marketStage: .established),
        .init(symbol: "AAPL", name: "Apple Inc.", sector: "Technology", sectorRank: 2, marketCapUsd: 4820000000000, marketCapLabel: "$4.82T", marketStage: .established),
        .init(symbol: "MSFT", name: "Microsoft Corp", sector: "Technology", sectorRank: 3, marketCapUsd: 3840000000000, marketCapLabel: "$3.84T", marketStage: .established),
        .init(symbol: "AVGO", name: "Broadcom Inc.", sector: "Technology", sectorRank: 5, marketCapUsd: 1700000000000, marketCapLabel: "$1.70T", marketStage: .established),
        .init(symbol: "MU", name: "Micron Technology, Inc.", sector: "Technology", sectorRank: 7, marketCapUsd: 1210000000000, marketCapLabel: "$1.21T", marketStage: .established),
        .init(symbol: "AMD", name: "Advanced Micro Devices", sector: "Technology", sectorRank: 8, marketCapUsd: 1030000000000, marketCapLabel: "$1.03T", marketStage: .established),
        .init(symbol: "INTC", name: "Intel Corp", sector: "Technology", sectorRank: 10, marketCapUsd: 630790000000, marketCapLabel: "$630.79B", marketStage: .established),
        .init(symbol: "GOOGL", name: "Alphabet Inc.", sector: "Communication Services", sectorRank: 1, marketCapUsd: 4200000000000, marketCapLabel: "$4.20T", marketStage: .established),
        .init(symbol: "META", name: "Meta Platforms, Inc.", sector: "Communication Services", sectorRank: 2, marketCapUsd: 1850000000000, marketCapLabel: "$1.85T", marketStage: .established),
        .init(symbol: "NFLX", name: "NetFlix Inc", sector: "Communication Services", sectorRank: 3, marketCapUsd: 279230000000, marketCapLabel: "$279.23B", marketStage: .established),
        .init(symbol: "VZ", name: "Verizon Communications Inc.", sector: "Communication Services", sectorRank: 4, marketCapUsd: 190790000000, marketCapLabel: "$190.79B", marketStage: .established),
        .init(symbol: "TMUS", name: "T-Mobile US, Inc.", sector: "Communication Services", sectorRank: 5, marketCapUsd: 175530000000, marketCapLabel: "$175.53B", marketStage: .established),
        .init(symbol: "DIS", name: "Walt Disney Company", sector: "Communication Services", sectorRank: 6, marketCapUsd: 174970000000, marketCapLabel: "$174.97B", marketStage: .established),
        .init(symbol: "AMZN", name: "Amazon.com, Inc.", sector: "Consumer Cyclical", sectorRank: 1, marketCapUsd: 2710000000000, marketCapLabel: "$2.71T", marketStage: .established),
        .init(symbol: "TSLA", name: "Tesla, Inc.", sector: "Consumer Cyclical", sectorRank: 2, marketCapUsd: 1460000000000, marketCapLabel: "$1.46T", marketStage: .established),
        .init(symbol: "HD", name: "Home Depot, Inc.", sector: "Consumer Cyclical", sectorRank: 3, marketCapUsd: 282200000000, marketCapLabel: "$282.20B", marketStage: .established),
        .init(symbol: "MCD", name: "McDonald's Corporation", sector: "Consumer Cyclical", sectorRank: 6, marketCapUsd: 164090000000, marketCapLabel: "$164.09B", marketStage: .established),
        .init(symbol: "TJX", name: "The TJX Companies, Inc.", sector: "Consumer Cyclical", sectorRank: 7, marketCapUsd: 145940000000, marketCapLabel: "$145.94B", marketStage: .established),
        .init(symbol: "BKNG", name: "Booking Holdings Inc.", sector: "Consumer Cyclical", sectorRank: 8, marketCapUsd: 119480000000, marketCapLabel: "$119.48B", marketStage: .established),
        .init(symbol: "SPCX", name: "SpaceX", sector: "Industrials", sectorRank: 1, marketCapUsd: 2100000000000, marketCapLabel: "$2.10T", marketStage: .formation),
        .init(symbol: "CAT", name: "Caterpillar Inc.", sector: "Industrials", sectorRank: 2, marketCapUsd: 388620000000, marketCapLabel: "$388.62B", marketStage: .established),
        .init(symbol: "GE", name: "GE Aerospace", sector: "Industrials", sectorRank: 3, marketCapUsd: 321190000000, marketCapLabel: "$321.19B", marketStage: .established),
        .init(symbol: "GEV", name: "GE Vernova", sector: "Industrials", sectorRank: 4, marketCapUsd: 263320000000, marketCapLabel: "$263.32B", marketStage: .established),
        .init(symbol: "RTX", name: "RTX Corporation", sector: "Industrials", sectorRank: 5, marketCapUsd: 248900000000, marketCapLabel: "$248.90B", marketStage: .established),
        .init(symbol: "DE", name: "Deere & Company", sector: "Industrials", sectorRank: 6, marketCapUsd: 185230000000, marketCapLabel: "$185.23B", marketStage: .established),
        .init(symbol: "UNP", name: "Union Pacific Corp.", sector: "Industrials", sectorRank: 8, marketCapUsd: 165320000000, marketCapLabel: "$165.32B", marketStage: .established),
        .init(symbol: "LLY", name: "Eli Lilly and Company", sector: "Healthcare", sectorRank: 1, marketCapUsd: 1020000000000, marketCapLabel: "$1.02T", marketStage: .established),
        .init(symbol: "JNJ", name: "Johnson & Johnson", sector: "Healthcare", sectorRank: 2, marketCapUsd: 617010000000, marketCapLabel: "$617.01B", marketStage: .established),
        .init(symbol: "ABBV", name: "AbbVie Inc.", sector: "Healthcare", sectorRank: 3, marketCapUsd: 459330000000, marketCapLabel: "$459.33B", marketStage: .established),
        .init(symbol: "MRK", name: "Merck & Co., Inc.", sector: "Healthcare", sectorRank: 4, marketCapUsd: 356010000000, marketCapLabel: "$356.01B", marketStage: .established),
        .init(symbol: "UNH", name: "UnitedHealth Group Incorporated", sector: "Healthcare", sectorRank: 5, marketCapUsd: 333820000000, marketCapLabel: "$333.82B", marketStage: .established),
        .init(symbol: "TMO", name: "Thermo Fisher Scientific Inc.", sector: "Healthcare", sectorRank: 8, marketCapUsd: 242110000000, marketCapLabel: "$242.11B", marketStage: .established),
        .init(symbol: "AMGN", name: "Amgen Inc", sector: "Healthcare", sectorRank: 9, marketCapUsd: 217900000000, marketCapLabel: "$217.90B", marketStage: .established),
        .init(symbol: "JPM", name: "JPMorgan Chase & Co.", sector: "Financial Services", sectorRank: 1, marketCapUsd: 883530000000, marketCapLabel: "$883.53B", marketStage: .established),
        .init(symbol: "V", name: "VISA Inc.", sector: "Financial Services", sectorRank: 2, marketCapUsd: 677090000000, marketCapLabel: "$677.09B", marketStage: .established),
        .init(symbol: "MA", name: "Mastercard Incorporated", sector: "Financial Services", sectorRank: 3, marketCapUsd: 483790000000, marketCapLabel: "$483.79B", marketStage: .established),
        .init(symbol: "BAC", name: "Bank of America Corporation", sector: "Financial Services", sectorRank: 4, marketCapUsd: 375860000000, marketCapLabel: "$375.86B", marketStage: .established),
        .init(symbol: "MS", name: "Morgan Stanley", sector: "Financial Services", sectorRank: 6, marketCapUsd: 298890000000, marketCapLabel: "$298.89B", marketStage: .established),
        .init(symbol: "GS", name: "Goldman Sachs Group Inc.", sector: "Financial Services", sectorRank: 8, marketCapUsd: 262800000000, marketCapLabel: "$262.80B", marketStage: .established),
        .init(symbol: "WFC", name: "Wells Fargo & Co.", sector: "Financial Services", sectorRank: 10, marketCapUsd: 243280000000, marketCapLabel: "$243.28B", marketStage: .established),
        .init(symbol: "WMT", name: "Walmart Inc.", sector: "Consumer Defensive", sectorRank: 1, marketCapUsd: 827170000000, marketCapLabel: "$827.17B", marketStage: .established),
        .init(symbol: "COST", name: "Costco Wholesale Corporation", sector: "Consumer Defensive", sectorRank: 2, marketCapUsd: 408090000000, marketCapLabel: "$408.09B", marketStage: .established),
        .init(symbol: "KO", name: "Coca-Cola Company", sector: "Consumer Defensive", sectorRank: 3, marketCapUsd: 368510000000, marketCapLabel: "$368.51B", marketStage: .established),
        .init(symbol: "PG", name: "Procter & Gamble Company", sector: "Consumer Defensive", sectorRank: 4, marketCapUsd: 336580000000, marketCapLabel: "$336.58B", marketStage: .established),
        .init(symbol: "PM", name: "Philip Morris International Inc.", sector: "Consumer Defensive", sectorRank: 5, marketCapUsd: 292180000000, marketCapLabel: "$292.18B", marketStage: .established),
        .init(symbol: "PEP", name: "PepsiCo, Inc.", sector: "Consumer Defensive", sectorRank: 6, marketCapUsd: 171830000000, marketCapLabel: "$171.83B", marketStage: .established),
        .init(symbol: "XOM", name: "ExxonMobil", sector: "Energy", sectorRank: 1, marketCapUsd: 674390000000, marketCapLabel: "$674.39B", marketStage: .established),
        .init(symbol: "CVX", name: "Chevron Corporation", sector: "Energy", sectorRank: 2, marketCapUsd: 406250000000, marketCapLabel: "$406.25B", marketStage: .established),
        .init(symbol: "COP", name: "ConocoPhillips", sector: "Energy", sectorRank: 5, marketCapUsd: 152270000000, marketCapLabel: "$152.27B", marketStage: .established),
        .init(symbol: "MPC", name: "MARATHON PETROLEUM CORPORATION", sector: "Energy", sectorRank: 7, marketCapUsd: 118600000000, marketCapLabel: "$118.60B", marketStage: .established),
        .init(symbol: "VLO", name: "Valero Energy Corporation", sector: "Energy", sectorRank: 8, marketCapUsd: 116980000000, marketCapLabel: "$116.98B", marketStage: .established),
        .init(symbol: "PSX", name: "PHILLIPS 66", sector: "Energy", sectorRank: 10, marketCapUsd: 105570000000, marketCapLabel: "$105.57B", marketStage: .established)

    ]

    public static let sectors: [String] = {
        var seen: [String] = []
        for asset in assets where !seen.contains(asset.sector) {
            seen.append(asset.sector)
        }
        return seen
    }()

    public static func asset(for symbol: String) -> Asset? {
        let normalized = symbol.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        return assets.first { $0.symbol == normalized }
    }

    /// The Worker route that carries reviewed Tickerbot bars. The app talks
    /// only to the HarshalOS Worker origin; it never receives or sends a
    /// provider key, and a symbol is matched against this roster before any
    /// path is formed.
    public static let barsRoute = "/api/good-intelligence/v1/market/tickerbot/bars"
    public static let barsResponseSchema = "gi-market-context-v1"

    /// Deterministic display anchors derived from roster order. A ticker's
    /// symbol hash places it on the NEO ORB spheroid — pure display
    /// geometry, never an OCM address, ranking claim, or market value.
    public static func sectorAngle(for symbol: String) -> Double {
        var hash: UInt64 = 0xcbf29ce484222325
        for byte in symbol.uppercased().utf8 {
            hash = (hash ^ UInt64(byte)) &* 0x100000001b3
        }
        return Double(hash % 360)
    }

    /// Logarithmic radial band 0...5 for a market-cap value. Larger caps sit
    /// closer to the center shell. This is the Orb 2 display convention.
    public static func radialBand(forMarketCapUsd marketCapUsd: Int) -> Int {
        guard marketCapUsd > 0 else { return 5 }
        let logCap = log10(Double(marketCapUsd))
        // $10B → band 3, $100B → 2, $1T → 1 — clamped to 0...5.
        let band = 4 - Int(logCap.rounded(.down))
        return min(5, max(0, band))
    }
}
