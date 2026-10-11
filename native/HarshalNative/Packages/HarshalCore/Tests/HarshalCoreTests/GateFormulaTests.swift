import XCTest

@testable import HarshalCore

final class GateFormulaTests: XCTestCase {
    private func factors(
        humanKey: Bool = true,
        addressability: Double = 1,
        representation: Double = 1,
        witness: Double = 1,
        seconds: TimeInterval = 0
    ) -> GateFormula.Factors {
        GateFormula.Factors(
            humanKey: humanKey,
            addressability: addressability,
            representation: representation,
            witness: witness,
            secondsSinceVerification: seconds
        )
    }

    func testFreshCompleteFactorsPermit() {
        let verdict = GateFormula.evaluate(factors: factors())
        XCTAssertEqual(verdict, .permit(legitimacy: 1.0))
        XCTAssertTrue(verdict.isPermit)
    }

    func testMissingHumanKeyAlwaysRefusesRegardlessOfOtherFactors() {
        let verdict = GateFormula.evaluate(factors: factors(humanKey: false))
        XCTAssertEqual(verdict, .refuse(reason: .missingHumanKey))
    }

    func testExpiryAtExactlyDeltaRefuses() {
        let verdict = GateFormula.evaluate(factors: factors(seconds: GateFormula.maximumVerificationDelay))
        XCTAssertEqual(verdict, .refuse(reason: .expired))
    }

    func testJustBeforeExpiryPermitsWithDecayedLegitimacy() {
        let seconds = GateFormula.maximumVerificationDelay - 1
        let verdict = GateFormula.evaluate(factors: factors(seconds: seconds))
        guard case let .permit(legitimacy) = verdict else {
            return XCTFail("Expected permit, got \(verdict)")
        }
        XCTAssertEqual(legitimacy, 1 - seconds / GateFormula.maximumVerificationDelay, accuracy: 1e-12)
    }

    func testWitnessWeightReducesLegitimacyAndCanCrossBelowThreshold() {
        // W = 0.4 halves legitimacy; at half-freshness L = 0.2 < τ.
        let seconds = GateFormula.maximumVerificationDelay / 2
        let verdict = GateFormula.evaluate(factors: factors(witness: 0.4, seconds: seconds))
        XCTAssertEqual(verdict, .refuse(reason: .belowThreshold(legitimacy: 0.2)))

        // Same moment with a fresh heartbeat permits.
        let fresh = GateFormula.evaluate(factors: factors(witness: 1, seconds: seconds))
        XCTAssertTrue(fresh.isPermit)
    }

    func testRequiredWitnessPrerequisiteFailsClosedWhenAbsent() {
        let verdict = GateFormula.evaluate(
            factors: factors(witness: 0),
            prerequisites: [.missingWitness]
        )
        XCTAssertEqual(verdict, .refuse(reason: .missingWitness))
    }

    func testBelowThresholdRefusalCarriesComputedLegitimacy() {
        let verdict = GateFormula.evaluate(factors: factors(addressability: 0.5, seconds: GateFormula.maximumVerificationDelay * 0.6))
        XCTAssertEqual(verdict, .refuse(reason: .belowThreshold(legitimacy: 0.2)))
    }

    func testNonFiniteFactorsClampToFailingClosed() {
        let verdict = GateFormula.evaluate(
            factors: GateFormula.Factors(
                humanKey: true,
                addressability: .infinity,
                representation: .nan,
                witness: -1,
                secondsSinceVerification: -100
            )
        )
        // Clamps collapse A/R/W to 0 → legitimacy 0 → refused by threshold,
        // and the negative Δt is floored at 0 rather than "freezing" freshness.
        guard case let .refuse(reason) = verdict, case let .belowThreshold(legitimacy) = reason else {
            return XCTFail("Expected threshold refusal, got \(verdict)")
        }
        XCTAssertEqual(legitimacy, 0, accuracy: 1e-12)
    }

    func testScopeMonotonicallyDecaysToZero() {
        var previous = GateFormula.scope(at: 0)
        XCTAssertEqual(previous, 1)
        let step = GateFormula.maximumVerificationDelay / 8
        for index in 1...8 {
            let current = GateFormula.scope(at: Double(index) * step)
            XCTAssertLessThanOrEqual(current, previous)
            previous = current
        }
        XCTAssertEqual(GateFormula.scope(at: GateFormula.maximumVerificationDelay + 1), 0)
        XCTAssertEqual(GateFormula.scope(at: .infinity), 0)
    }

    func testDeterminismIdenticalInputsIdenticalVerdict() {
        let first = GateFormula.evaluate(factors: factors(seconds: 37))
        let second = GateFormula.evaluate(factors: factors(seconds: 37))
        XCTAssertEqual(first, second)
    }
}
