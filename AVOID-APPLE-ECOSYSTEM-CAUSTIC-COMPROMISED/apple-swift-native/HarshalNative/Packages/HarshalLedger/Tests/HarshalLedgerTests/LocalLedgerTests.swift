import Foundation
import XCTest
import HarshalCore
@testable import HarshalLedger

final class LocalLedgerTests: XCTestCase {
    func testReceiptVerifiesItsLedgerPrefix() async throws {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let ledger = LocalLedger(now: { now })
        let declarationID = UUID(uuidString: "AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA")!

        _ = try await ledger.append(
            severity: .info,
            event: "PHASE_DECLARATION_CREATED",
            declaredPhase: .nab
        )
        let receipt = try await ledger.issueReceipt(
            subjectType: "PHASE_DECLARATION",
            subjectID: declarationID
        )

        let result = await ledger.verify(receipt)

        XCTAssertTrue(result.verified)
        XCTAssertEqual(result.code, "LOCAL-LEDGER-VERIFIED")
        XCTAssertEqual(receipt.assurance, CanonicalModel.localAssurance)
    }

    func testTamperedLedgerEntryFailsVerification() async throws {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let ledger = LocalLedger(now: { now })
        let declarationID = UUID(uuidString: "AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA")!

        _ = try await ledger.append(
            severity: .info,
            event: "PHASE_DECLARATION_CREATED",
            declaredPhase: .nab
        )
        let receipt = try await ledger.issueReceipt(
            subjectType: "PHASE_DECLARATION",
            subjectID: declarationID
        )
        var entries = await ledger.snapshot()
        let first = entries[0]
        entries[0] = LedgerEntry(
            id: first.id,
            timestamp: first.timestamp,
            canonicalTimestamp: first.canonicalTimestamp,
            severity: first.severity,
            event: "TAMPERED",
            declaredPhase: first.declaredPhase,
            previousHash: first.previousHash,
            hash: first.hash
        )

        let result = await LedgerVerifier().verify(entries: entries, receipt: receipt)

        XCTAssertFalse(result.verified)
        XCTAssertEqual(result.code, "LEDGER-CHAIN-INVALID")
    }

    func testMissingLedgerPrefixFailsVerification() async throws {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let ledger = LocalLedger(now: { now })
        _ = try await ledger.append(severity: .info, event: "DECLARATION", declaredPhase: .nab)
        let receipt = try await ledger.issueReceipt(subjectType: "PHASE_DECLARATION", subjectID: UUID())
        let truncated = Array((await ledger.snapshot()).dropFirst())

        let result = await LedgerVerifier().verify(entries: truncated, receipt: receipt)

        XCTAssertFalse(result.verified)
        XCTAssertEqual(result.code, "LEDGER-SEQUENCE-INVALID")
    }

    func testCodableRecoveryPreservesCanonicalLedgerTimestamp() async throws {
        let now = Date(timeIntervalSince1970: 1_800_000_000.123)
        let ledger = LocalLedger(now: { now })
        _ = try await ledger.append(severity: .info, event: "DECLARATION", declaredPhase: .nab)
        let receipt = try await ledger.issueReceipt(subjectType: "PHASE_DECLARATION", subjectID: UUID())
        let originalEntries = await ledger.snapshot()
        let encoder = JSONEncoder()
        let decoder = JSONDecoder()
        let recoveredEntries = try decoder.decode([LedgerEntry].self, from: encoder.encode(originalEntries))
        let recoveredReceipt = try decoder.decode(LocalLedgerReceipt.self, from: encoder.encode(receipt))

        let result = await LedgerVerifier().verify(entries: recoveredEntries, receipt: recoveredReceipt)

        XCTAssertTrue(result.verified)
        XCTAssertEqual(recoveredEntries[0].canonicalTimestamp, originalEntries[0].canonicalTimestamp)
    }

    func testReceiptFailsWhenLedgerRootChanges() async throws {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let ledger = LocalLedger(now: { now })
        let receipt = try await ledger.issueReceipt(subjectType: "PHASE_DECLARATION", subjectID: UUID())
        let changedRoot = LocalLedgerReceipt(
            id: receipt.id,
            subjectType: receipt.subjectType,
            subjectID: receipt.subjectID,
            issuedAt: receipt.issuedAt,
            issuedAtCanonical: receipt.issuedAtCanonical,
            receiptEntryID: receipt.receiptEntryID,
            ledgerRoot: String(repeating: "f", count: 64)
        )

        let result = await ledger.verify(changedRoot)

        XCTAssertFalse(result.verified)
        XCTAssertEqual(result.code, "RECEIPT-ROOT-MISMATCH")
    }
}
