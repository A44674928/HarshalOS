import Foundation
import XCTest
import HarshalCore
@testable import HarshalMarkets

final class PaperLedgerTests: XCTestCase {
    private let now = Date(timeIntervalSince1970: 1_735_689_600)

    func testEveryDeclaredPhaseCanRecordAndCloseASimulatedPaperPosition() async throws {
        let fixture = HarshalMarketFixtures.alpha

        for phase in DeclaredPhase.allCases {
            let fixedNow = now
            let coreID = UUID()
            let ledger = PaperLedger(now: { fixedNow })
            let declaration = try MarketDeclaration(
                universeCoreID: coreID,
                phase: phase,
                instrument: fixture.instrument,
                direction: .higher,
                thesis: "Fixture-only simulated thesis for \(phase.rawValue).",
                targetDate: now.addingTimeInterval(86_400),
                createdAt: now
            )
            _ = try await ledger.recordDeclaration(declaration)

            let position = try PaperPosition(
                universeCoreID: coreID,
                declarationID: declaration.id,
                phase: phase,
                instrument: fixture.instrument,
                side: .long,
                quantity: 2,
                entryObservation: fixture.entryObservation,
                openedAt: now
            )
            _ = try await ledger.openPosition(position)
            _ = try await ledger.closePosition(
                id: position.id,
                observation: fixture.markObservation,
                at: now.addingTimeInterval(3_600)
            )

            let state = await ledger.snapshot()
            XCTAssertEqual(state.declarations, [declaration])
            XCTAssertEqual(state.positions.count, 1)
            XCTAssertEqual(state.positions[0].status, .closed)
            XCTAssertEqual(state.events.map(\.kind), [.declarationRecorded, .positionOpened, .positionClosed])
            XCTAssertEqual(state.events.map(\.sequence), [1, 2, 3])
            XCTAssertEqual(state.positions[0].phase, phase)
        }
    }

    func testLedgerPreservesAmendmentAndWithdrawalEvents() async throws {
        let fixture = HarshalMarketFixtures.beta
        let fixedNow = now
        let coreID = UUID()
        let ledger = PaperLedger(now: { fixedNow })
        let declaration = try MarketDeclaration(
            universeCoreID: coreID,
            phase: .cwo,
            instrument: fixture.instrument,
            direction: .lower,
            thesis: "Fixture-only archival record.",
            targetDate: now.addingTimeInterval(86_400),
            createdAt: now
        )
        _ = try await ledger.recordDeclaration(declaration)
        let position = try PaperPosition(
            universeCoreID: coreID,
            declarationID: declaration.id,
            phase: .cwo,
            instrument: fixture.instrument,
            side: .short,
            quantity: 1,
            entryObservation: fixture.entryObservation,
            openedAt: now
        )
        _ = try await ledger.openPosition(position)
        _ = try await ledger.amendPosition(id: position.id, quantity: 3, at: now.addingTimeInterval(60))
        _ = try await ledger.withdrawPosition(id: position.id, at: now.addingTimeInterval(120))

        let state = await ledger.snapshot()
        XCTAssertEqual(state.positions[0].status, .withdrawn)
        XCTAssertEqual(state.positions[0].quantity, 3)
        XCTAssertEqual(
            state.events.map(\.kind),
            [.declarationRecorded, .positionOpened, .positionAmended, .positionWithdrawn]
        )
        XCTAssertNoThrow(try state.validate())
    }

    func testLedgerRejectsPositionThatDoesNotMatchDeclarationInstrument() async throws {
        let alpha = HarshalMarketFixtures.alpha
        let beta = HarshalMarketFixtures.beta
        let fixedNow = now
        let coreID = UUID()
        let ledger = PaperLedger(now: { fixedNow })
        let declaration = try MarketDeclaration(
            universeCoreID: coreID,
            phase: .nab,
            instrument: alpha.instrument,
            direction: .higher,
            thesis: "Fixture-only declaration.",
            targetDate: now.addingTimeInterval(86_400),
            createdAt: now
        )
        _ = try await ledger.recordDeclaration(declaration)
        let invalidPosition = try PaperPosition(
            universeCoreID: coreID,
            declarationID: declaration.id,
            phase: .nab,
            instrument: beta.instrument,
            side: .long,
            quantity: 1,
            entryObservation: beta.entryObservation,
            openedAt: now
        )

        do {
            _ = try await ledger.openPosition(invalidPosition)
            XCTFail("Expected instrument mismatch refusal")
        } catch let error as HarshalMarketsError {
            guard case .declarationPositionMismatch(_) = error else {
                return XCTFail("Unexpected market error: \(error)")
            }
        } catch {
            throw error
        }
    }

    func testRecoveryRejectsNonContiguousEventSequence() throws {
        let fixture = HarshalMarketFixtures.alpha
        let declaration = try MarketDeclaration(
            universeCoreID: UUID(),
            phase: .gsrb,
            instrument: fixture.instrument,
            direction: .neutral,
            thesis: "Fixture-only declaration.",
            targetDate: now.addingTimeInterval(86_400),
            createdAt: now
        )
        let corruptEvent = try PaperLedgerEvent(
            sequence: 2,
            kind: .declarationRecorded,
            timestamp: now,
            subjectID: declaration.id,
            declarationID: declaration.id,
            phase: declaration.phase,
            instrumentID: declaration.instrument.id,
            detail: "corrupt sequence"
        )
        let state = PaperLedgerState(declarations: [declaration], events: [corruptEvent])

        XCTAssertThrowsError(try state.validate())
    }
}
