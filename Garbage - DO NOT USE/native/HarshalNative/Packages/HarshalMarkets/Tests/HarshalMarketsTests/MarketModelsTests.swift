import Foundation
import XCTest
@testable import HarshalMarkets

final class MarketModelsTests: XCTestCase {
    private let createdAt = Date(timeIntervalSince1970: 1_735_689_600)

    func testBundledFixturesRemainExplicitlySyntheticAndOrdered() {
        XCTAssertEqual(HarshalMarketFixtures.all.count, 2)
        for fixture in HarshalMarketFixtures.all {
            XCTAssertTrue(fixture.entryObservation.provenance.isFixture)
            XCTAssertTrue(fixture.markObservation.provenance.isFixture)
            XCTAssertEqual(fixture.entryObservation.instrument.id, fixture.markObservation.instrument.id)
            XCTAssertLessThanOrEqual(fixture.entryObservation.observedAt, fixture.markObservation.observedAt)
            XCTAssertTrue(fixture.note.contains("fixture"))
        }
    }

    func testMarketDeclarationRejectsBlankThesisAndNonFutureTarget() throws {
        let fixture = HarshalMarketFixtures.alpha

        XCTAssertThrowsError(try MarketDeclaration(
            universeCoreID: UUID(),
            phase: .cwo,
            instrument: fixture.instrument,
            direction: .higher,
            thesis: "   ",
            targetDate: createdAt.addingTimeInterval(86_400),
            createdAt: createdAt
        ))

        XCTAssertThrowsError(try MarketDeclaration(
            universeCoreID: UUID(),
            phase: .cwo,
            instrument: fixture.instrument,
            direction: .higher,
            thesis: "A local fixture thesis",
            targetDate: createdAt,
            createdAt: createdAt
        ))
    }

    func testMarketInstrumentUsesNormalizedStableIdentity() throws {
        let instrument = try MarketInstrument(
            symbol: " test-1 ",
            displayName: "Test instrument",
            assetClass: .custom,
            venue: " local-fixture ",
            quoteCurrency: " usd "
        )

        XCTAssertEqual(instrument.symbol, "TEST-1")
        XCTAssertEqual(instrument.venue, "LOCAL-FIXTURE")
        XCTAssertEqual(instrument.quoteCurrency, "USD")
        XCTAssertEqual(instrument.id, "CUSTOM:LOCAL-FIXTURE:TEST-1")
    }
}
