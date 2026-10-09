import CryptoKit
import Foundation
import HarshalCore

public enum LedgerSeverity: String, Codable, CaseIterable, Sendable, Hashable {
    case info
    case warning
    case refusal
    case permit
    case breach
}

public struct LedgerEntry: Codable, Equatable, Sendable, Identifiable {
    public let id: Int
    public let timestamp: Date
    /// The exact timestamp representation included in the digest payload. It is
    /// persisted so Codable Date precision cannot change a recovered hash.
    public let canonicalTimestamp: String
    public let severity: LedgerSeverity
    public let event: String
    public let declaredPhase: DeclaredPhase?
    public let previousHash: String
    public let hash: String

    public init(
        id: Int,
        timestamp: Date,
        canonicalTimestamp: String,
        severity: LedgerSeverity,
        event: String,
        declaredPhase: DeclaredPhase?,
        previousHash: String,
        hash: String
    ) {
        self.id = id
        self.timestamp = timestamp
        self.canonicalTimestamp = canonicalTimestamp
        self.severity = severity
        self.event = event
        self.declaredPhase = declaredPhase
        self.previousHash = previousHash
        self.hash = hash
    }
}

/// A receipt identifies a locally hash-chained ledger prefix. It is deliberately
/// not called a signature and is not independent evidence, authentication, or
/// proof of identity.
public struct LocalLedgerReceipt: Codable, Equatable, Sendable, Identifiable {
    public let id: UUID
    public let schema: String
    public let assurance: String
    public let executionScope: String
    public let subjectType: String
    public let subjectID: UUID
    public let issuedAt: Date
    /// The exact issuance representation bound into the receipt event.
    public let issuedAtCanonical: String
    public let receiptEntryID: Int
    public let ledgerRoot: String

    public init(
        id: UUID = UUID(),
        schema: String = "HOS-NATIVE-LOCAL-RECEIPT-1",
        assurance: String = CanonicalModel.localAssurance,
        executionScope: String = CanonicalModel.localExecutionScope,
        subjectType: String,
        subjectID: UUID,
        issuedAt: Date,
        issuedAtCanonical: String,
        receiptEntryID: Int,
        ledgerRoot: String
    ) {
        self.id = id
        self.schema = schema
        self.assurance = assurance
        self.executionScope = executionScope
        self.subjectType = subjectType
        self.subjectID = subjectID
        self.issuedAt = issuedAt
        self.issuedAtCanonical = issuedAtCanonical
        self.receiptEntryID = receiptEntryID
        self.ledgerRoot = ledgerRoot
    }
}

public struct LedgerVerification: Equatable, Sendable {
    public let verified: Bool
    public let code: String
    public let message: String

    public init(verified: Bool, code: String, message: String) {
        self.verified = verified
        self.code = code
        self.message = message
    }
}

public protocol LedgerDigesting: Sendable {
    func digest(_ value: String) async throws -> String
}

public struct SHA256LedgerDigest: LedgerDigesting {
    public init() {}

    public func digest(_ value: String) async throws -> String {
        SHA256.hash(data: Data(value.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}

public enum LocalLedgerError: Error, Equatable, Sendable, LocalizedError {
    case invalidEvent
    case invalidReceiptSubject

    public var errorDescription: String? {
        switch self {
        case .invalidEvent:
            "Ledger events must be non-empty and no longer than 4,096 characters."
        case .invalidReceiptSubject:
            "Receipts require a non-empty subject type."
        }
    }
}

/// An actor serializes append order and exposes value snapshots only. It guards
/// accidental concurrent mutation, not a compromised device or an attacker who
/// can rewrite on-device storage.
public actor LocalLedger {
    public static let genesisPreviousHash = String(repeating: "0", count: 64)

    private let digester: any LedgerDigesting
    private let now: @Sendable () -> Date
    private var entries: [LedgerEntry]

    public init(
        entries: [LedgerEntry] = [],
        digester: any LedgerDigesting = SHA256LedgerDigest(),
        now: @escaping @Sendable () -> Date = { .now }
    ) {
        self.entries = entries
        self.digester = digester
        self.now = now
    }

    @discardableResult
    public func append(
        severity: LedgerSeverity,
        event: String,
        declaredPhase: DeclaredPhase? = nil
    ) async throws -> LedgerEntry {
        let normalizedEvent = event.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !normalizedEvent.isEmpty, normalizedEvent.count <= 4_096 else {
            throw LocalLedgerError.invalidEvent
        }

        let entryID = (entries.last?.id ?? 0) + 1
        let timestamp = now()
        let canonicalTimestamp = Self.canonicalTimestamp(timestamp)
        let previousHash = entries.last?.hash ?? Self.genesisPreviousHash
        let hash = try await digester.digest(
            Self.canonicalPayload(
                id: entryID,
                canonicalTimestamp: canonicalTimestamp,
                severity: severity,
                event: normalizedEvent,
                declaredPhase: declaredPhase,
                previousHash: previousHash
            )
        )
        let entry = LedgerEntry(
            id: entryID,
            timestamp: timestamp,
            canonicalTimestamp: canonicalTimestamp,
            severity: severity,
            event: normalizedEvent,
            declaredPhase: declaredPhase,
            previousHash: previousHash,
            hash: hash
        )
        entries.append(entry)
        return entry
    }

    public func snapshot() -> [LedgerEntry] {
        entries
    }

    /// Restoring is intentionally separate from normal append behavior. Callers
    /// should verify the recovered snapshot and fail closed on a failed check.
    public func replaceRecoveredEntries(_ recoveredEntries: [LedgerEntry]) {
        entries = recoveredEntries
    }

    public func issueReceipt(subjectType: String, subjectID: UUID) async throws -> LocalLedgerReceipt {
        let normalizedSubject = subjectType.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !normalizedSubject.isEmpty, !normalizedSubject.contains("|") else {
            throw LocalLedgerError.invalidReceiptSubject
        }

        let issuedAt = now()
        let issuedAtCanonical = Self.canonicalTimestamp(issuedAt)
        let receiptID = UUID()
        let event = Self.receiptEvent(
            receiptID: receiptID,
            subjectType: normalizedSubject,
            subjectID: subjectID,
            issuedAtCanonical: issuedAtCanonical
        )
        let row = try await append(severity: .info, event: event)
        return LocalLedgerReceipt(
            id: receiptID,
            subjectType: normalizedSubject,
            subjectID: subjectID,
            issuedAt: issuedAt,
            issuedAtCanonical: issuedAtCanonical,
            receiptEntryID: row.id,
            ledgerRoot: row.hash
        )
    }

    public func verify(_ receipt: LocalLedgerReceipt) async -> LedgerVerification {
        await LedgerVerifier(digester: digester).verify(entries: entries, receipt: receipt)
    }

    static func canonicalTimestamp(_ date: Date) -> String {
        date.ISO8601Format()
    }

    static func canonicalPayload(
        id: Int,
        canonicalTimestamp: String,
        severity: LedgerSeverity,
        event: String,
        declaredPhase: DeclaredPhase?,
        previousHash: String
    ) -> String {
        [
            String(id),
            canonicalTimestamp,
            severity.rawValue,
            event,
            declaredPhase?.rawValue ?? "NONE",
            previousHash,
            CanonicalModel.specificationID
        ].joined(separator: "|")
    }

    static func receiptEvent(
        receiptID: UUID,
        subjectType: String,
        subjectID: UUID,
        issuedAtCanonical: String
    ) -> String {
        [
            "HOS_NATIVE_LOCAL_RECEIPT",
            "receiptID=\(receiptID.uuidString.uppercased())",
            "subjectType=\(subjectType)",
            "subjectID=\(subjectID.uuidString.uppercased())",
            "issuedAt=\(issuedAtCanonical)"
        ].joined(separator: "|")
    }
}

public struct LedgerVerifier: Sendable {
    private let digester: any LedgerDigesting

    public init(digester: any LedgerDigesting = SHA256LedgerDigest()) {
        self.digester = digester
    }

    public func verify(entries: [LedgerEntry], receipt: LocalLedgerReceipt) async -> LedgerVerification {
        guard receipt.schema == "HOS-NATIVE-LOCAL-RECEIPT-1",
              receipt.assurance == CanonicalModel.localAssurance,
              receipt.executionScope == CanonicalModel.localExecutionScope,
              !receipt.subjectType.isEmpty,
              !receipt.issuedAtCanonical.isEmpty,
              !receipt.ledgerRoot.isEmpty else {
            return LedgerVerification(
                verified: false,
                code: "INVALID-LOCAL-RECEIPT",
                message: "Receipt fields do not match the local-only receipt schema."
            )
        }

        guard let receiptIndex = entries.firstIndex(where: { $0.id == receipt.receiptEntryID }) else {
            return LedgerVerification(
                verified: false,
                code: "RECEIPT-ROOT-MISSING",
                message: "The receipt row is not present in this ledger snapshot."
            )
        }

        var previousHash = LocalLedger.genesisPreviousHash
        var expectedEntryID = 1
        for entry in entries.prefix(through: receiptIndex) {
            guard entry.id == expectedEntryID else {
                return LedgerVerification(
                    verified: false,
                    code: "LEDGER-SEQUENCE-INVALID",
                    message: "The ledger sequence is incomplete or reordered at row \(entry.id)."
                )
            }
            guard entry.previousHash == previousHash else {
                return LedgerVerification(
                    verified: false,
                    code: "LEDGER-CHAIN-INVALID",
                    message: "The previous-hash link failed at ledger row \(entry.id)."
                )
            }
            do {
                let expectedHash = try await digester.digest(
                    LocalLedger.canonicalPayload(
                        id: entry.id,
                        canonicalTimestamp: entry.canonicalTimestamp,
                        severity: entry.severity,
                        event: entry.event,
                        declaredPhase: entry.declaredPhase,
                        previousHash: entry.previousHash
                    )
                )
                guard entry.hash == expectedHash else {
                    return LedgerVerification(
                        verified: false,
                        code: "LEDGER-CHAIN-INVALID",
                        message: "The digest failed at ledger row \(entry.id)."
                    )
                }
            } catch {
                return LedgerVerification(
                    verified: false,
                    code: "LEDGER-DIGEST-UNAVAILABLE",
                    message: "The local digest provider could not verify the receipt."
                )
            }
            previousHash = entry.hash
            expectedEntryID += 1
        }

        let row = entries[receiptIndex]
        guard row.hash == receipt.ledgerRoot else {
            return LedgerVerification(
                verified: false,
                code: "RECEIPT-ROOT-MISMATCH",
                message: "The receipt root does not match its ledger row."
            )
        }

        let expectedEvent = LocalLedger.receiptEvent(
            receiptID: receipt.id,
            subjectType: receipt.subjectType,
            subjectID: receipt.subjectID,
            issuedAtCanonical: receipt.issuedAtCanonical
        )
        guard row.event == expectedEvent else {
            return LedgerVerification(
                verified: false,
                code: "RECEIPT-EVENT-MISMATCH",
                message: "The ledger receipt event does not bind the supplied receipt fields."
            )
        }

        return LedgerVerification(
            verified: true,
            code: "LOCAL-LEDGER-VERIFIED",
            message: "The local ledger prefix is internally consistent. This is not an independent signature or production proof."
        )
    }
}
