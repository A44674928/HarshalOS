import XCTest
@testable import HarshalCore

final class RefusalGateTests: XCTestCase {
    private let now = Date(timeIntervalSince1970: 1_800_000_000)

    private func completeInput(phase: DeclaredPhase = .nab) -> GateInput {
        GateInput(
            actionName: "read-only example",
            phase: phase,
            attestation: .active,
            attestedAt: now,
            addressability: 1,
            representation: 1,
            authorizationActive: true,
            sessionBound: true,
            technicalAttribution: true,
            operationalAccountability: true,
            evaluatedAt: now
        )
    }

    func testDefaultStateRefusesWithoutLocalAcknowledgement() {
        var input = completeInput()
        input.attestation = .absent
        input.attestedAt = nil

        let result = RefusalGate.evaluate(input)

        XCTAssertEqual(result.decision, .refuse)
        XCTAssertEqual(result.code, .noLocalAttestation)
        XCTAssertEqual(result.legitimacy, 0)
    }

    func testFreshCompleteNABInputIsLocalOnlyPermit() {
        let result = RefusalGate.evaluate(completeInput())

        XCTAssertEqual(result.decision, .permit)
        XCTAssertEqual(result.code, .localDemoPermitted)
        XCTAssertEqual(result.legitimacy, 1)
        XCTAssertEqual(result.executionScope, CanonicalModel.localExecutionScope)
    }

    func testPendingAcknowledgementRefusesBeforeAnyPermit() {
        var input = completeInput()
        input.attestation = .pending

        let result = RefusalGate.evaluate(input)

        XCTAssertEqual(result.decision, .refuse)
        XCTAssertEqual(result.code, .attestationPending)
        XCTAssertFalse(result.stages.identity)
    }

    func testMissingOperationalAccountabilityRefuses() {
        var input = completeInput()
        input.operationalAccountability = false

        let result = RefusalGate.evaluate(input)

        XCTAssertEqual(result.decision, .refuse)
        XCTAssertEqual(result.code, .accountabilityMissing)
        XCTAssertFalse(result.stages.accountability)
        XCTAssertEqual(result.legitimacy, 0)
    }

    func testCWOAlwaysRefusesEvenWithCompleteInput() {
        let result = RefusalGate.evaluate(completeInput(phase: .cwo))

        XCTAssertEqual(result.decision, .refuse)
        XCTAssertEqual(result.code, .cwoForbidden)
    }

    func testStaleAcknowledgementFailsClosed() {
        var input = completeInput()
        input.evaluatedAt = now.addingTimeInterval(CanonicalModel.maximumVerificationDelay)

        let result = RefusalGate.evaluate(input)

        XCTAssertEqual(result.decision, .refuse)
        XCTAssertEqual(result.code, .stalePermission)
        XCTAssertEqual(result.temporalScope, 0)
    }

    func testBelowThresholdRefuses() {
        var input = completeInput()
        input.addressability = 0.49

        let result = RefusalGate.evaluate(input)

        XCTAssertEqual(result.decision, .refuse)
        XCTAssertEqual(result.code, .legitimacyBelowThreshold)
        XCTAssertLessThan(result.legitimacy, CanonicalModel.legitimacyThreshold)
    }

    func testGSrbDoesNotExposeNativeStarterOverride() {
        let result = RefusalGate.evaluate(completeInput(phase: .gsrb))

        XCTAssertEqual(result.decision, .refuse)
        XCTAssertEqual(result.code, .gsrbNonExecuting)
    }
}
