import Foundation
import HarshalCore

/// The source of a market instrument is intentionally modeled separately from
/// a human-readable label. The local first slice uses only fixture instruments.
public enum MarketAssetClass: String, CaseIterable, Codable, Sendable, Identifiable, Hashable {
    case equity = "EQUITY"
    case digitalAsset = "DIGITAL_ASSET"
    case index = "INDEX"
    case foreignExchange = "FOREIGN_EXCHANGE"
    case commodity = "COMMODITY"
    case custom = "CUSTOM"

    public var id: String { rawValue }

    public var label: String {
        switch self {
        case .equity: return "Equity"
        case .digitalAsset: return "Digital asset"
        case .index: return "Index"
        case .foreignExchange: return "Foreign exchange"
        case .commodity: return "Commodity"
        case .custom: return "Custom"
        }
    }
}

/// A stable, normalized market identity. It does not claim that a provider,
/// exchange, or ticker exists outside of a supplied observation or fixture.
public struct MarketInstrument: Codable, Equatable, Sendable, Identifiable, Hashable {
    public let id: String
    public let symbol: String
    public let displayName: String
    public let assetClass: MarketAssetClass
    public let venue: String
    public let quoteCurrency: String

    public init(
        symbol: String,
        displayName: String,
        assetClass: MarketAssetClass,
        venue: String,
        quoteCurrency: String
    ) throws {
        let normalizedSymbol = Self.normalizedToken(symbol)
        let normalizedVenue = Self.normalizedToken(venue)
        let normalizedCurrency = Self.normalizedToken(quoteCurrency)
        let normalizedName = displayName.trimmingCharacters(in: .whitespacesAndNewlines)

        guard Self.isSymbol(normalizedSymbol) else {
            throw HarshalMarketsError.invalidInstrument("Symbols must contain 1–32 uppercase letters, digits, dots, hyphens, or slashes.")
        }
        guard Self.isToken(normalizedVenue, maximumLength: 48) else {
            throw HarshalMarketsError.invalidInstrument("Venue must contain 1–48 uppercase letters, digits, dots, hyphens, or slashes.")
        }
        guard normalizedCurrency.count == 3, Self.isToken(normalizedCurrency, maximumLength: 3) else {
            throw HarshalMarketsError.invalidInstrument("Quote currency must be a three-character uppercase code.")
        }
        guard (1...120).contains(normalizedName.count) else {
            throw HarshalMarketsError.invalidInstrument("Instrument display names must contain 1–120 characters.")
        }

        self.id = Self.makeID(assetClass: assetClass, venue: normalizedVenue, symbol: normalizedSymbol)
        self.symbol = normalizedSymbol
        self.displayName = normalizedName
        self.assetClass = assetClass
        self.venue = normalizedVenue
        self.quoteCurrency = normalizedCurrency
    }

    public func validate() throws {
        let normalizedSymbol = Self.normalizedToken(symbol)
        let normalizedVenue = Self.normalizedToken(venue)
        let normalizedCurrency = Self.normalizedToken(quoteCurrency)
        guard symbol == normalizedSymbol,
              venue == normalizedVenue,
              quoteCurrency == normalizedCurrency,
              Self.isSymbol(symbol),
              Self.isToken(venue, maximumLength: 48),
              quoteCurrency.count == 3,
              Self.isToken(quoteCurrency, maximumLength: 3),
              (1...120).contains(displayName.trimmingCharacters(in: .whitespacesAndNewlines).count),
              id == Self.makeID(assetClass: assetClass, venue: venue, symbol: symbol) else {
            throw HarshalMarketsError.invalidInstrument("Instrument fields are malformed or its stable identifier does not match its normalized identity.")
        }
    }

    private static func makeID(assetClass: MarketAssetClass, venue: String, symbol: String) -> String {
        "\(assetClass.rawValue):\(venue):\(symbol)"
    }

    private static func normalizedToken(_ value: String) -> String {
        value.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
    }

    private static func isSymbol(_ value: String) -> Bool {
        (1...32).contains(value.count) && isToken(value, maximumLength: 32)
    }

    private static func isToken(_ value: String, maximumLength: Int) -> Bool {
        guard (1...maximumLength).contains(value.count) else { return false }
        let allowed = CharacterSet(charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-/")
        return value.unicodeScalars.allSatisfy { allowed.contains($0) }
    }
}

public enum MarketObservationAvailability: String, CaseIterable, Codable, Sendable, Identifiable, Hashable {
    case available = "AVAILABLE"
    case held = "HELD"
    case unavailable = "UNAVAILABLE"

    public var id: String { rawValue }

    public var label: String {
        switch self {
        case .available: return "Available"
        case .held: return "Held"
        case .unavailable: return "Unavailable"
        }
    }
}

public enum MarketObservationInterval: String, CaseIterable, Codable, Sendable, Identifiable, Hashable {
    case fixture = "FIXTURE"
    case daily = "1D"
    case fifteenMinutes = "15M"

    public var id: String { rawValue }
}

/// Provider/source metadata is preserved with each supplied observation. A
/// fixture explicitly remains a fixture and must never be relabeled as live.
public struct MarketDataProvenance: Codable, Equatable, Sendable {
    public let contract: String
    public let provider: String
    public let sourceLabel: String
    public let retrievedAt: Date
    public let interval: MarketObservationInterval
    public let isFixture: Bool

    public init(
        contract: String = "harshal-market-observation-v1",
        provider: String,
        sourceLabel: String,
        retrievedAt: Date,
        interval: MarketObservationInterval,
        isFixture: Bool
    ) throws {
        let normalizedContract = contract.trimmingCharacters(in: .whitespacesAndNewlines)
        let normalizedProvider = provider.trimmingCharacters(in: .whitespacesAndNewlines)
        let normalizedSource = sourceLabel.trimmingCharacters(in: .whitespacesAndNewlines)
        guard (1...120).contains(normalizedContract.count),
              (1...120).contains(normalizedProvider.count),
              (1...240).contains(normalizedSource.count) else {
            throw HarshalMarketsError.invalidObservation("Observation provenance requires bounded contract, provider, and source labels.")
        }

        self.contract = normalizedContract
        self.provider = normalizedProvider
        self.sourceLabel = normalizedSource
        self.retrievedAt = retrievedAt
        self.interval = interval
        self.isFixture = isFixture
    }

    public func validate() throws {
        guard (1...120).contains(contract.trimmingCharacters(in: .whitespacesAndNewlines).count),
              (1...120).contains(provider.trimmingCharacters(in: .whitespacesAndNewlines).count),
              (1...240).contains(sourceLabel.trimmingCharacters(in: .whitespacesAndNewlines).count) else {
            throw HarshalMarketsError.invalidObservation("Observation provenance is malformed.")
        }
    }
}

/// A time-stamped supplied price. Availability is explicit so missing data
/// cannot quietly become a neutral or fabricated valuation.
public struct MarketObservation: Codable, Equatable, Sendable, Identifiable {
    public let id: UUID
    public let instrument: MarketInstrument
    public let observedAt: Date
    public let price: Decimal?
    public let availability: MarketObservationAvailability
    public let provenance: MarketDataProvenance

    public init(
        id: UUID = UUID(),
        instrument: MarketInstrument,
        observedAt: Date,
        price: Decimal?,
        availability: MarketObservationAvailability,
        provenance: MarketDataProvenance
    ) throws {
        self.id = id
        self.instrument = instrument
        self.observedAt = observedAt
        self.price = price
        self.availability = availability
        self.provenance = provenance
        try validate()
    }

    public func validate() throws {
        try instrument.validate()
        try provenance.validate()
        switch availability {
        case .available:
            guard let price, price > 0 else {
                throw HarshalMarketsError.invalidObservation("Available observations require a positive price.")
            }
        case .held:
            guard price == nil || price! > 0 else {
                throw HarshalMarketsError.invalidObservation("Held observations may carry only a positive last-known price.")
            }
        case .unavailable:
            guard price == nil else {
                throw HarshalMarketsError.invalidObservation("Unavailable observations must not carry a price.")
            }
        }
    }
}

public enum MarketDirection: String, CaseIterable, Codable, Sendable, Identifiable, Hashable {
    case higher = "HIGHER"
    case lower = "LOWER"
    case neutral = "NEUTRAL"

    public var id: String { rawValue }

    public var label: String {
        switch self {
        case .higher: return "Higher"
        case .lower: return "Lower"
        case .neutral: return "Neutral"
        }
    }
}

/// This is an intent only. The local first slice does not publish anything.
public enum MarketVisibilityIntent: String, CaseIterable, Codable, Sendable, Identifiable, Hashable {
    case privateRecord = "PRIVATE_RECORD"
    case publicProjectionRequested = "PUBLIC_PROJECTION_REQUESTED"

    public var id: String { rawValue }

    public var label: String {
        switch self {
        case .privateRecord: return "Private record"
        case .publicProjectionRequested: return "Public projection intent (not published)"
        }
    }
}

/// A local thesis tied to a phase snapshot and a target date. The record is a
/// simulated declaration, not a prediction certified by HarshalOS.
public struct MarketDeclaration: Codable, Equatable, Sendable, Identifiable {
    public let id: UUID
    public let universeCoreID: UUID
    public let phase: DeclaredPhase
    public let instrument: MarketInstrument
    public let direction: MarketDirection
    public let thesis: String
    public let targetDate: Date
    public let visibilityIntent: MarketVisibilityIntent
    public let createdAt: Date
    public let revision: Int
    public let supersedesID: UUID?

    public init(
        id: UUID = UUID(),
        universeCoreID: UUID,
        phase: DeclaredPhase,
        instrument: MarketInstrument,
        direction: MarketDirection,
        thesis: String,
        targetDate: Date,
        visibilityIntent: MarketVisibilityIntent = .privateRecord,
        createdAt: Date = .now,
        revision: Int = 1,
        supersedesID: UUID? = nil
    ) throws {
        let normalizedThesis = thesis.trimmingCharacters(in: .whitespacesAndNewlines)
        guard (1...600).contains(normalizedThesis.count) else {
            throw HarshalMarketsError.invalidDeclaration("A market declaration thesis must contain 1–600 characters.")
        }
        guard targetDate > createdAt else {
            throw HarshalMarketsError.invalidDeclaration("A market declaration target date must be later than its creation time.")
        }
        guard revision >= 1 else {
            throw HarshalMarketsError.invalidDeclaration("Market declaration revisions start at 1.")
        }
        guard (revision == 1) == (supersedesID == nil) else {
            throw HarshalMarketsError.invalidDeclaration("Only the first declaration revision may omit its superseded declaration ID.")
        }
        try instrument.validate()

        self.id = id
        self.universeCoreID = universeCoreID
        self.phase = phase
        self.instrument = instrument
        self.direction = direction
        self.thesis = normalizedThesis
        self.targetDate = targetDate
        self.visibilityIntent = visibilityIntent
        self.createdAt = createdAt
        self.revision = revision
        self.supersedesID = supersedesID
    }

    public func validate() throws {
        guard (1...600).contains(thesis.trimmingCharacters(in: .whitespacesAndNewlines).count),
              targetDate > createdAt,
              revision >= 1,
              (revision == 1) == (supersedesID == nil) else {
            throw HarshalMarketsError.invalidDeclaration("Market declaration fields are malformed.")
        }
        try instrument.validate()
    }
}

public enum PaperPositionSide: String, CaseIterable, Codable, Sendable, Identifiable, Hashable {
    case long = "LONG"
    case short = "SHORT"

    public var id: String { rawValue }

    public var label: String {
        switch self {
        case .long: return "Long"
        case .short: return "Short"
        }
    }
}

public enum PaperPositionStatus: String, CaseIterable, Codable, Sendable, Identifiable, Hashable {
    case open = "OPEN"
    case closed = "CLOSED"
    case withdrawn = "WITHDRAWN"

    public var id: String { rawValue }
}

/// An immutable current position snapshot. Changes create a newer revision and
/// a corresponding `PaperLedgerEvent`; neither revision executes a trade.
public struct PaperPosition: Codable, Equatable, Sendable, Identifiable {
    public let id: UUID
    public let universeCoreID: UUID
    public let declarationID: UUID
    public let phase: DeclaredPhase
    public let instrument: MarketInstrument
    public let side: PaperPositionSide
    public let quantity: Decimal
    public let entryObservation: MarketObservation
    public let openedAt: Date
    public let status: PaperPositionStatus
    public let revision: Int
    public let lastAmendedAt: Date?
    public let closedAt: Date?
    public let exitObservation: MarketObservation?

    public init(
        id: UUID = UUID(),
        universeCoreID: UUID,
        declarationID: UUID,
        phase: DeclaredPhase,
        instrument: MarketInstrument,
        side: PaperPositionSide,
        quantity: Decimal,
        entryObservation: MarketObservation,
        openedAt: Date = .now
    ) throws {
        guard quantity > 0 else {
            throw HarshalMarketsError.invalidPosition("Paper position quantity must be greater than zero.")
        }
        guard entryObservation.instrument.id == instrument.id,
              entryObservation.availability == .available,
              entryObservation.price != nil else {
            throw HarshalMarketsError.invalidPosition("Opening a paper position requires an available observation for the same instrument.")
        }
        try instrument.validate()
        try entryObservation.validate()

        self.id = id
        self.universeCoreID = universeCoreID
        self.declarationID = declarationID
        self.phase = phase
        self.instrument = instrument
        self.side = side
        self.quantity = quantity
        self.entryObservation = entryObservation
        self.openedAt = openedAt
        self.status = .open
        self.revision = 1
        self.lastAmendedAt = nil
        self.closedAt = nil
        self.exitObservation = nil
    }

    public func amended(quantity: Decimal, at date: Date) throws -> PaperPosition {
        guard status == .open else {
            throw HarshalMarketsError.invalidPosition("Only an open paper position may be amended.")
        }
        guard quantity > 0 else {
            throw HarshalMarketsError.invalidPosition("Paper position quantity must be greater than zero.")
        }
        return PaperPosition(
            id: id,
            universeCoreID: universeCoreID,
            declarationID: declarationID,
            phase: phase,
            instrument: instrument,
            side: side,
            quantity: quantity,
            entryObservation: entryObservation,
            openedAt: openedAt,
            status: .open,
            revision: revision + 1,
            lastAmendedAt: date,
            closedAt: nil,
            exitObservation: nil
        )
    }

    public func closed(with observation: MarketObservation, at date: Date) throws -> PaperPosition {
        guard status == .open else {
            throw HarshalMarketsError.invalidPosition("Only an open paper position may be closed.")
        }
        guard observation.instrument.id == instrument.id,
              observation.availability == .available,
              observation.price != nil else {
            throw HarshalMarketsError.invalidPosition("Closing a paper position requires an available observation for the same instrument.")
        }
        try observation.validate()
        return PaperPosition(
            id: id,
            universeCoreID: universeCoreID,
            declarationID: declarationID,
            phase: phase,
            instrument: instrument,
            side: side,
            quantity: quantity,
            entryObservation: entryObservation,
            openedAt: openedAt,
            status: .closed,
            revision: revision + 1,
            lastAmendedAt: lastAmendedAt,
            closedAt: date,
            exitObservation: observation
        )
    }

    public func withdrawn(at date: Date) throws -> PaperPosition {
        guard status == .open else {
            throw HarshalMarketsError.invalidPosition("Only an open paper position may be withdrawn.")
        }
        return PaperPosition(
            id: id,
            universeCoreID: universeCoreID,
            declarationID: declarationID,
            phase: phase,
            instrument: instrument,
            side: side,
            quantity: quantity,
            entryObservation: entryObservation,
            openedAt: openedAt,
            status: .withdrawn,
            revision: revision + 1,
            lastAmendedAt: lastAmendedAt,
            closedAt: date,
            exitObservation: nil
        )
    }

    public func validate() throws {
        guard quantity > 0,
              revision >= 1,
              entryObservation.instrument.id == instrument.id,
              entryObservation.availability == .available,
              entryObservation.price != nil else {
            throw HarshalMarketsError.invalidPosition("Paper position fields are malformed.")
        }
        try instrument.validate()
        try entryObservation.validate()

        switch status {
        case .open:
            guard closedAt == nil, exitObservation == nil else {
                throw HarshalMarketsError.invalidPosition("Open paper positions cannot carry a closure observation.")
            }
        case .closed:
            guard closedAt != nil,
                  let exitObservation,
                  exitObservation.instrument.id == instrument.id,
                  exitObservation.availability == .available,
                  exitObservation.price != nil else {
                throw HarshalMarketsError.invalidPosition("Closed paper positions require an available closure observation for the same instrument.")
            }
            try exitObservation.validate()
        case .withdrawn:
            guard closedAt != nil, exitObservation == nil else {
                throw HarshalMarketsError.invalidPosition("Withdrawn paper positions require a withdrawal time and no closure observation.")
            }
        }
    }

    private init(
        id: UUID,
        universeCoreID: UUID,
        declarationID: UUID,
        phase: DeclaredPhase,
        instrument: MarketInstrument,
        side: PaperPositionSide,
        quantity: Decimal,
        entryObservation: MarketObservation,
        openedAt: Date,
        status: PaperPositionStatus,
        revision: Int,
        lastAmendedAt: Date?,
        closedAt: Date?,
        exitObservation: MarketObservation?
    ) {
        self.id = id
        self.universeCoreID = universeCoreID
        self.declarationID = declarationID
        self.phase = phase
        self.instrument = instrument
        self.side = side
        self.quantity = quantity
        self.entryObservation = entryObservation
        self.openedAt = openedAt
        self.status = status
        self.revision = revision
        self.lastAmendedAt = lastAmendedAt
        self.closedAt = closedAt
        self.exitObservation = exitObservation
    }
}

public enum HarshalMarketsError: Error, Equatable, Sendable, LocalizedError {
    case invalidInstrument(String)
    case invalidObservation(String)
    case invalidDeclaration(String)
    case invalidPosition(String)
    case duplicateDeclaration(UUID)
    case duplicatePosition(UUID)
    case declarationNotFound(UUID)
    case positionNotFound(UUID)
    case declarationPositionMismatch(String)
    case invalidLedgerState(String)
    case phaseIneligible(String)

    public var errorDescription: String? {
        switch self {
        case let .invalidInstrument(message),
             let .invalidObservation(message),
             let .invalidDeclaration(message),
             let .invalidPosition(message),
             let .declarationPositionMismatch(message),
             let .invalidLedgerState(message),
             let .phaseIneligible(message):
            return message
        case let .duplicateDeclaration(id):
            return "A market declaration with ID \(id.uuidString) already exists in this local paper ledger."
        case let .duplicatePosition(id):
            return "A paper position with ID \(id.uuidString) already exists in this local paper ledger."
        case let .declarationNotFound(id):
            return "No local market declaration exists for ID \(id.uuidString)."
        case let .positionNotFound(id):
            return "No local paper position exists for ID \(id.uuidString)."
        }
    }
}
