import Foundation
import XCTest
import HarshalCore
@testable import HarshalMarkets

final class PaperValuationTests: XCTestCase {
    private let now = Date(timeIntervalSince1970: 1_735_689_600)

    func testLongPositionUsesExplicitMarkAndCalculatesFixtureValue() throws {
        let fixture = HarshalMarketFixtures.alpha
        let position = try makePosition(
            fixture: fixture,
            phase: .nab,
            side: .long,
            quantity: 2
        )

        let result = PaperValuation.markToMarket(position: position, observation: fixture.markObservation)

        XCTAssertEqual(result.status, .available)
        XCTAssertEqual(result.entryNotional, Decimal(string: "200"))
        XCTAssertEqual(result.markNotional, Decimal(string: "217"))
        XCTAssertEqual(result.profitLoss, Decimal(string: "17"))
        XCTAssertEqual(result.returnFraction, Decimal(string: "0.085"))
        XCTAssertTrue(result.message.contains("simulation-only"))
    }

    func testShortPositionUsesInversePriceDifference() throws {
        let fixture = HarshalMarketFixtures.beta
        let position = try makePosition(
            fixture: fixture,
            phase: .cwo,
            side: .short,
            quantity: 2
        )

        let result = PaperValuation.markToMarket(position: position, observation: fixture.markObservation)

        XCTAssertEqual(result.status, .available)
        XCTAssertEqual(result.profitLoss, Decimal(string: "6.5"))
        XCTAssertEqual(result.returnFraction, Decimal(string: "0.08125"))
    }

    func testUnavailableMarkNeverFabricatesANeutralValuation() throws {
        let fixture = HarshalMarketFixtures.alpha
        let position = try makePosition(
            fixture: fixture,
            phase: .gsrb,
            side: .long,
            quantity: 1
        )
        let unavailable = try MarketObservation(
            instrument: fixture.instrument,
            observedAt: now,
            price: nil,
            availability: .unavailable,
            provenance: fixture.markObservation.provenance
        )

        let result = PaperValuation.markToMarket(position: position, observation: unavailable)

        XCTAssertEqual(result.status, .unavailable)
        XCTAssertNil(result.markPrice)
        XCTAssertNil(result.profitLoss)
        XCTAssertTrue(result.message.contains("unavailable"))
    }

    func testClosedPositionUsesRecordedExitObservation() throws {
        let fixture = HarshalMarketFixtures.alpha
        let open = try makePosition(
            fixture: fixture,
            phase: .cwo,
            side: .long,
            quantity: 1
        )
        let closed = try open.closed(with: fixture.markObservation, at: now.addingTimeInterval(3_600))

        let result = PaperValuation.finalValue(position: closed)

        XCTAssertEqual(result.status, .closed)
        XCTAssertEqual(result.profitLoss, Decimal(string: "8.5"))
    }

    private func makePosition(
        fixture: MarketFixture,
        phase: DeclaredPhase,
        side: PaperPositionSide,
        quantity: Decimal
    ) throws -> PaperPosition {
        try PaperPosition(
            universeCoreID: UUID(),
            declarationID: UUID(),
            phase: phase,
            instrument: fixture.instrument,
            side: side,
            quantity: quantity,
            entryObservation: fixture.entryObservation,
            openedAt: now
        )
    }
}
