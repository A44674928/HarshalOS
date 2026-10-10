import XCTest
@testable import HarshalCore

final class PaperTradingPolicyTests: XCTestCase {
    func testEveryDeclaredPhaseIsEligibleForEveryPaperTradingActivity() {
        for phase in DeclaredPhase.allCases {
            for activity in PaperTradingActivity.allCases {
                let result = PaperTradingPolicy.evaluate(phase: phase, activity: activity)

                XCTAssertTrue(result.isEligible, "\(phase.rawValue) should be eligible for \(activity.rawValue)")
                XCTAssertEqual(result.phase, phase)
                XCTAssertEqual(result.activity, activity)
                XCTAssertEqual(result.assurance, PaperTradingPolicy.assurance)
                XCTAssertEqual(result.executionScope, PaperTradingPolicy.executionScope)
            }
        }
    }

    func testCWOEligibilityKeepsItsCustodialRoleWithoutCreatingExecutionAuthority() {
        let result = PaperTradingPolicy.evaluate(phase: .cwo, activity: .openPosition)

        XCTAssertTrue(result.isEligible)
        XCTAssertTrue(result.reason.contains("Custodial Witness Orb"))
        XCTAssertEqual(result.executionScope, "PAPER-ONLY-NO-BROKERAGE-EXECUTION")
        XCTAssertTrue(result.assurance.contains("NOT-INVESTMENT-ADVICE"))
    }
}
