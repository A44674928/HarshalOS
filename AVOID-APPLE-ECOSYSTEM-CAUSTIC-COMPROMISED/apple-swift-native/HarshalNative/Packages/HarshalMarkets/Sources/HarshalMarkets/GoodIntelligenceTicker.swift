import Foundation
import HarshalCore

/// One ticker reading on the Good Intelligence board.
///
/// `source` is part of the value: a **live** reading only ever comes from the
/// HarshalOS Worker route (`gi-market-context-v1`, provider key held
/// server-side). Without that configured feed the simulator runs on the local
/// deterministic tick engine and every reading is visibly labelled
/// `simulated` — a local engine never masquerades as a provider observation.
public struct TickerQuote: Codable, Equatable, Sendable, Identifiable {
    public enum Source: Codable, Equatable, Sendable {
        /// Server-issued reading through the reviewed Worker route.
        case goodIntelligenceTickerbot(observedAt: Date)
        /// Local deterministic tick engine — labelled simulated, never "live".
        case localSimulation

        private enum CodingKeys: String, CodingKey { case kind, observedAt }
        private enum Kind: String, Codable { case tickerbot, localSimulation }

        public init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            switch try container.decode(Kind.self, forKey: .kind) {
            case .tickerbot:
                self = .goodIntelligenceTickerbot(observedAt: try container.decode(Date.self, forKey: .observedAt))
            case .localSimulation:
                self = .localSimulation
            }
        }

        public func encode(to encoder: Encoder) throws {
            var container = encoder.container(keyedBy: CodingKeys.self)
            switch self {
            case let .goodIntelligenceTickerbot(observedAt):
                try container.encode(Kind.tickerbot, forKey: .kind)
                try container.encode(observedAt, forKey: .observedAt)
            case .localSimulation:
                try container.encode(Kind.localSimulation, forKey: .kind)
            }
        }
    }

    public let symbol: String
    public let price: Decimal
    /// The close this reading is compared against for the day-change readout.
    public let previousClose: Decimal
    public let asOf: Date
    public let source: Source

    public var id: String { symbol }

    public init(symbol: String, price: Decimal, previousClose: Decimal, asOf: Date, source: Source) {
        self.symbol = symbol.uppercased()
        self.price = price
        self.previousClose = previousClose
        self.asOf = asOf
        self.source = source
    }

    public var dayChangeFraction: Double {
        guard previousClose > 0 else { return 0 }
        return NSDecimalNumber(decimal: (price - previousClose) / previousClose).doubleValue
    }

    public var isLive: Bool {
        if case .goodIntelligenceTickerbot = source { return true }
        return false
    }
}

/// The deterministic offline tick engine.
///
/// When the Worker feed is not configured (or unreachable), the paper
/// simulator still needs motion. This engine derives a stable reference price
/// per roster symbol from attributed roster metadata and advances it with a
/// seeded geometric random walk. Every quote it emits is labelled
/// `.localSimulation`. It manufactures no provider claim, contacts nothing,
/// and never overwrites a live reading.
public struct LocalTickEngine: Sendable {
    public let referencePrices: [String: Decimal]
    private let seeds: [String: UInt64]

    public init(assets: [GoodIntelligenceTickerRoster.Asset] = GoodIntelligenceTickerRoster.assets) {
        var references: [String: Decimal] = [:]
        var seeds: [String: UInt64] = [:]
        for asset in assets {
            // Reference magnitude: a deterministic function of the symbol and
            // the attributed market cap — a display anchor, not an observed
            // market price. It exists so the offline simulator has a stable
            // board, and is always labelled simulated.
            var hash: UInt64 = 0xcbf29ce484222325
            for byte in asset.symbol.utf8 {
                hash = (hash ^ UInt64(byte)) &* 0x100000001b3
            }
            seeds[asset.symbol] = hash
            let base = log10(Double(asset.marketCapUsd) / 400_000_000.0)
            let jitter = Double(hash % 1000) / 1000.0
            let magnitude = max(3.0, min(1_400.0, pow(10, base * 0.42 + 0.9) * (0.8 + 0.4 * jitter)))
            references[asset.symbol] = Decimal(string: String(format: "%.2f", magnitude)) ?? 25
        }
        self.referencePrices = references
        self.seeds = seeds
    }

    /// Deterministic walk: the same symbol, session seed, and step always
    /// produce the same price, so the whole board can be replayed and tested.
    public func quote(symbol: String, step: Int, sessionSeed: UInt64, at date: Date) -> TickerQuote? {
        guard let reference = referencePrices[symbol], let symbolSeed = seeds[symbol] else {
            return nil
        }
        let previous = Self.price(
            symbolSeed: symbolSeed,
            sessionSeed: sessionSeed,
            reference: reference,
            step: max(0, step - 1)
        )
        let current = Self.price(
            symbolSeed: symbolSeed,
            sessionSeed: sessionSeed,
            reference: reference,
            step: max(0, step)
        )
        return TickerQuote(
            symbol: symbol,
            price: current,
            previousClose: step <= 0 ? current : previous,
            asOf: date,
            source: .localSimulation
        )
    }

    public func quotes(step: Int, sessionSeed: UInt64, at date: Date, symbols: [String]? = nil) -> [TickerQuote] {
        let requested = symbols ?? Array(referencePrices.keys)
        return requested
            .compactMap { quote(symbol: $0, step: step, sessionSeed: sessionSeed, at: date) }
            .sorted { $0.symbol < $1.symbol }
    }

    private static func price(symbolSeed: UInt64, sessionSeed: UInt64, reference: Decimal, step: Int) -> Decimal {
        // mulberry32-style step hash over (symbol, session, step).
        var state = symbolSeed ^ (sessionSeed &* 0x9E3779B97F4A7C15) ^ (UInt64(truncatingIfNeeded: step) &* 0x100000001b3)
        state = state &+ 0x6D2B79F5
        var t = (state ^ (state >> 15)) &* (1 | state)
        t = (t &+ ((t ^ (t >> 7)) &* (61 | t))) ^ t
        let draw = Double(t ^ (t >> 14)) / 4_294_967_296.0

        // Bounded lognormal-ish step: ±2.2% per tick, mean-reverting to the
        // reference through a mild pull at distance.
        let shock = (draw - 0.5) * 0.044
        let doubleReference = NSDecimalNumber(decimal: reference).doubleValue
        var next = doubleReference * (1 + shock)
        let drift = (doubleReference - next) * 0.002
        next += drift
        let clamped = max(0.05, next)
        return Decimal(string: String(format: "%.2f", clamped)) ?? reference
    }
}

/// A decoded `gi-market-context-v1` packet from the Worker Tickerbot route —
/// the only live-quote path. The app renders the server-issued close; it does
/// not derive, average, or otherwise manufacture a price.
public struct TickerbotBarsPacket: Decodable, Equatable, Sendable {
    public struct Bar: Decodable, Equatable, Sendable {
        public let time: String
        public let open: Double
        public let high: Double
        public let low: Double
        public let close: Double
        public let volume: Double?
    }

    public let schema: String
    public let synthetic: Bool
    public let source: String
    public let symbol: String
    public let timeframe: String
    public let bars: [Bar]

    public var lastClose: Double? {
        bars.last?.close
    }

    public static func validate(_ data: Data) -> Result<TickerbotBarsPacket, TickerFeedError> {
        guard let packet = try? JSONDecoder().decode(TickerbotBarsPacket.self, from: data) else {
            return .failure(.invalidResponse)
        }
        guard packet.schema == GoodIntelligenceTickerRoster.barsResponseSchema,
              packet.synthetic == false,
              !packet.bars.isEmpty else {
            return .failure(.invalidResponse)
        }
        return .success(packet)
    }
}

public enum TickerFeedError: LocalizedError, Equatable {
    case notConfigured
    case rosterSymbolRejected(String)
    case invalidResponse
    case unavailable(String)

    public var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "The Good Intelligence feed is not configured. The board is running the local simulated tick engine."
        case let .rosterSymbolRejected(symbol):
            return "\(symbol) is not on the reviewed Tickerbot roster; no upstream path was formed."
        case .invalidResponse:
            return "The feed response was not a valid gi-market-context-v1 packet. No substitute reading was created."
        case let .unavailable(message):
            return message
        }
    }
}
