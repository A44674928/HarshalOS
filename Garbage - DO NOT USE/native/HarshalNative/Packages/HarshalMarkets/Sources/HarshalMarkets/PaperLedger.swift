import Foundation
import HarshalCore

public enum PaperLedgerEventKind: String, CaseIterable, Codable, Sendable, Identifiable, Hashable {
    case declarationRecorded = "DECLARATION_RECORDED"
    case positionOpened = "POSITION_OPENED"
    case positionAmended = "POSITION_AMENDED"
    case positionClosed = "POSITION_CLOSED"
    case positionWithdrawn = "POSITION_WITHDRAWN"

    public var id: String { rawValue }
}

/// A bounded, local event description. It is an application record, not an
/// independent signature, broker confirmation, or immutable public audit log.
public struct PaperLedgerEvent: Codable, Equatable, Sendable, Identifiable {
    public let id: UUID
    public let sequence: Int
    public let kind: PaperLedgerEventKind
    public let timestamp: Date
    public let subjectID: UUID
    public let declarationID: UUID?
    public let phase: DeclaredPhase
    public let instrumentID: String
    public let detail: String

    public init(
        id: UUID = UUID(),
        sequence: Int,
        kind: PaperLedgerEventKind,
        timestamp: Date,
        subjectID: UUID,
        declarationID: UUID?,
        phase: DeclaredPhase,
        instrumentID: String,
        detail: String
    ) throws {
        let normalizedInstrumentID = instrumentID.trimmingCharacters(in: .whitespacesAndNewlines)
        let normalizedDetail = detail.trimmingCharacters(in: .whitespacesAndNewlines)
        guard sequence > 0,
              !normalizedInstrumentID.isEmpty,
              (1...600).contains(normalizedDetail.count) else {
            throw HarshalMarketsError.invalidLedgerState("Paper-ledger events require a positive sequence, an instrument ID, and a bounded detail.")
        }

        self.id = id
        self.sequence = sequence
        self.kind = kind
        self.timestamp = timestamp
        self.subjectID = subjectID
        self.declarationID = declarationID
        self.phase = phase
        self.instrumentID = normalizedInstrumentID
        self.detail = normalizedDetail
    }

    public func validate() throws {
        guard sequence > 0,
              !instrumentID.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              (1...600).contains(detail.trimmingCharacters(in: .whitespacesAndNewlines).count) else {
            throw HarshalMarketsError.invalidLedgerState("Paper-ledger event fields are malformed.")
        }
    }
}

/// Codable recovery state for one private universe core's local paper ledger.
public struct PaperLedgerState: Codable, Equatable, Sendable {
    public static let schema = "harshal-paper-ledger-v1"

    public let schemaVersion: String
    public let declarations: [MarketDeclaration]
    public let positions: [PaperPosition]
    public let events: [PaperLedgerEvent]

    public init(
        schemaVersion: String = PaperLedgerState.schema,
        declarations: [MarketDeclaration] = [],
        positions: [PaperPosition] = [],
        events: [PaperLedgerEvent] = []
    ) {
        self.schemaVersion = schemaVersion
        self.declarations = declarations
        self.positions = positions
        self.events = events
    }

    public static let empty = PaperLedgerState()

    public func validate() throws {
        guard schemaVersion == Self.schema else {
            throw HarshalMarketsError.invalidLedgerState("The recovered paper ledger does not use the supported local schema.")
        }

        var declarationIDs = Set<UUID>()
        for declaration in declarations {
            try declaration.validate()
            guard declarationIDs.insert(declaration.id).inserted else {
                throw HarshalMarketsError.invalidLedgerState("The recovered paper ledger contains duplicate declaration IDs.")
            }
        }

        var positionIDs = Set<UUID>()
        for position in positions {
            try position.validate()
            guard positionIDs.insert(position.id).inserted else {
                throw HarshalMarketsError.invalidLedgerState("The recovered paper ledger contains duplicate position IDs.")
            }
            guard let declaration = declarations.first(where: { $0.id == position.declarationID }),
                  declaration.universeCoreID == position.universeCoreID,
                  declaration.phase == position.phase,
                  declaration.instrument.id == position.instrument.id else {
                throw HarshalMarketsError.invalidLedgerState("A recovered paper position does not match its declaration's core, phase, or instrument.")
            }
        }

        var eventIDs = Set<UUID>()
        for (index, event) in events.enumerated() {
            try event.validate()
            guard event.sequence == index + 1,
                  eventIDs.insert(event.id).inserted else {
                throw HarshalMarketsError.invalidLedgerState("Recovered paper-ledger event sequences must be contiguous and event IDs must be unique.")
            }
            switch event.kind {
            case .declarationRecorded:
                guard declarationIDs.contains(event.subjectID) else {
                    throw HarshalMarketsError.invalidLedgerState("A declaration event points to a missing declaration.")
                }
            case .positionOpened, .positionAmended, .positionClosed, .positionWithdrawn:
                guard positionIDs.contains(event.subjectID),
                      let declarationID = event.declarationID,
                      declarationIDs.contains(declarationID) else {
                    throw HarshalMarketsError.invalidLedgerState("A position event points to a missing position or declaration.")
                }
            }
        }
    }
}

/// Actor-isolated state for local paper records. It serializes the record order
/// and validates transitions; it does not supply a brokerage connection,
/// payment mechanism, public feed, or independent tamper-proof guarantee.
public actor PaperLedger {
    private let now: @Sendable () -> Date
    private var state: PaperLedgerState

    public init(now: @escaping @Sendable () -> Date = { .now }) {
        self.state = .empty
        self.now = now
    }

    public init(
        recoveredState: PaperLedgerState,
        now: @escaping @Sendable () -> Date = { .now }
    ) throws {
        try recoveredState.validate()
        self.state = recoveredState
        self.now = now
    }

    public func replaceRecoveredState(_ recoveredState: PaperLedgerState) throws {
        try recoveredState.validate()
        state = recoveredState
    }

    public func snapshot() -> PaperLedgerState {
        state
    }

    @discardableResult
    public func recordDeclaration(_ declaration: MarketDeclaration) throws -> MarketDeclaration {
        try declaration.validate()
        let eligibility = PaperTradingPolicy.evaluate(phase: declaration.phase, activity: .marketDeclaration)
        guard eligibility.isEligible else {
            throw HarshalMarketsError.phaseIneligible(eligibility.reason)
        }
        guard !state.declarations.contains(where: { $0.id == declaration.id }) else {
            throw HarshalMarketsError.duplicateDeclaration(declaration.id)
        }

        state = PaperLedgerState(
            declarations: state.declarations + [declaration],
            positions: state.positions,
            events: state.events + [
                try makeEvent(
                    kind: .declarationRecorded,
                    subjectID: declaration.id,
                    declarationID: declaration.id,
                    phase: declaration.phase,
                    instrumentID: declaration.instrument.id,
                    detail: "direction=\(declaration.direction.rawValue) revision=\(declaration.revision) visibility=\(declaration.visibilityIntent.rawValue)"
                )
            ]
        )
        return declaration
    }

    @discardableResult
    public func openPosition(_ position: PaperPosition) throws -> PaperPosition {
        try position.validate()
        let declaration = try declaration(for: position.declarationID)
        guard declaration.universeCoreID == position.universeCoreID,
              declaration.phase == position.phase,
              declaration.instrument.id == position.instrument.id else {
            throw HarshalMarketsError.declarationPositionMismatch("A paper position must use the same personal universe core, phase snapshot, and instrument as its market declaration.")
        }
        let eligibility = PaperTradingPolicy.evaluate(phase: position.phase, activity: .openPosition)
        guard eligibility.isEligible else {
            throw HarshalMarketsError.phaseIneligible(eligibility.reason)
        }
        guard !state.positions.contains(where: { $0.id == position.id }) else {
            throw HarshalMarketsError.duplicatePosition(position.id)
        }

        state = PaperLedgerState(
            declarations: state.declarations,
            positions: state.positions + [position],
            events: state.events + [
                try makeEvent(
                    kind: .positionOpened,
                    subjectID: position.id,
                    declarationID: position.declarationID,
                    phase: position.phase,
                    instrumentID: position.instrument.id,
                    detail: "side=\(position.side.rawValue) quantity=\(Self.decimalString(position.quantity)) entry=\(Self.decimalString(position.entryObservation.price ?? 0))"
                )
            ]
        )
        return position
    }

    @discardableResult
    public func amendPosition(
        id: UUID,
        quantity: Decimal,
        at timestamp: Date? = nil
    ) throws -> PaperPosition {
        let index = try positionIndex(for: id)
        let existing = state.positions[index]
        let eligibility = PaperTradingPolicy.evaluate(phase: existing.phase, activity: .amendPosition)
        guard eligibility.isEligible else {
            throw HarshalMarketsError.phaseIneligible(eligibility.reason)
        }
        let updated = try existing.amended(quantity: quantity, at: timestamp ?? now())
        var positions = state.positions
        positions[index] = updated
        state = PaperLedgerState(
            declarations: state.declarations,
            positions: positions,
            events: state.events + [
                try makeEvent(
                    kind: .positionAmended,
                    subjectID: updated.id,
                    declarationID: updated.declarationID,
                    phase: updated.phase,
                    instrumentID: updated.instrument.id,
                    detail: "revision=\(updated.revision) quantity=\(Self.decimalString(updated.quantity))"
                )
            ]
        )
        return updated
    }

    @discardableResult
    public func closePosition(
        id: UUID,
        observation: MarketObservation,
        at timestamp: Date? = nil
    ) throws -> PaperPosition {
        let index = try positionIndex(for: id)
        let existing = state.positions[index]
        let eligibility = PaperTradingPolicy.evaluate(phase: existing.phase, activity: .closePosition)
        guard eligibility.isEligible else {
            throw HarshalMarketsError.phaseIneligible(eligibility.reason)
        }
        let updated = try existing.closed(with: observation, at: timestamp ?? now())
        var positions = state.positions
        positions[index] = updated
        state = PaperLedgerState(
            declarations: state.declarations,
            positions: positions,
            events: state.events + [
                try makeEvent(
                    kind: .positionClosed,
                    subjectID: updated.id,
                    declarationID: updated.declarationID,
                    phase: updated.phase,
                    instrumentID: updated.instrument.id,
                    detail: "revision=\(updated.revision) exit=\(Self.decimalString(observation.price ?? 0))"
                )
            ]
        )
        return updated
    }

    @discardableResult
    public func withdrawPosition(id: UUID, at timestamp: Date? = nil) throws -> PaperPosition {
        let index = try positionIndex(for: id)
        let existing = state.positions[index]
        let eligibility = PaperTradingPolicy.evaluate(phase: existing.phase, activity: .withdrawPosition)
        guard eligibility.isEligible else {
            throw HarshalMarketsError.phaseIneligible(eligibility.reason)
        }
        let updated = try existing.withdrawn(at: timestamp ?? now())
        var positions = state.positions
        positions[index] = updated
        state = PaperLedgerState(
            declarations: state.declarations,
            positions: positions,
            events: state.events + [
                try makeEvent(
                    kind: .positionWithdrawn,
                    subjectID: updated.id,
                    declarationID: updated.declarationID,
                    phase: updated.phase,
                    instrumentID: updated.instrument.id,
                    detail: "revision=\(updated.revision)"
                )
            ]
        )
        return updated
    }

    private func declaration(for id: UUID) throws -> MarketDeclaration {
        guard let declaration = state.declarations.first(where: { $0.id == id }) else {
            throw HarshalMarketsError.declarationNotFound(id)
        }
        return declaration
    }

    private func positionIndex(for id: UUID) throws -> Int {
        guard let index = state.positions.firstIndex(where: { $0.id == id }) else {
            throw HarshalMarketsError.positionNotFound(id)
        }
        return index
    }

    private func makeEvent(
        kind: PaperLedgerEventKind,
        subjectID: UUID,
        declarationID: UUID?,
        phase: DeclaredPhase,
        instrumentID: String,
        detail: String
    ) throws -> PaperLedgerEvent {
        try PaperLedgerEvent(
            sequence: state.events.count + 1,
            kind: kind,
            timestamp: now(),
            subjectID: subjectID,
            declarationID: declarationID,
            phase: phase,
            instrumentID: instrumentID,
            detail: detail
        )
    }

    private static func decimalString(_ value: Decimal) -> String {
        NSDecimalNumber(decimal: value).stringValue
    }
}
