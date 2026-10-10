import XCTest
@testable import HarshalCore

final class ShipmentProvenancePolicyTests: XCTestCase {
    private func fixture(
        networkObservation: ShipmentNetworkObservation = .consistent
    ) throws -> ShipmentAdmissionRequest {
        let checkpoints = try [
            ShipmentCheckpoint("ORIGIN-RELEASE"),
            ShipmentCheckpoint("CUSTODY-TRANSFER-A"),
            ShipmentCheckpoint("RECEIVING-INSPECTION")
        ]
        let manifest = try ShipmentManifest(
            manifestReference: "MANIFEST-001",
            partReference: "PART-OPAQUE-001",
            lotReference: "LOT-OPAQUE-001",
            expectedCheckpoints: checkpoints,
            routePolicyReference: "ROUTE-POLICY-001"
        )
        let records = try checkpoints.enumerated().map { index, checkpoint in
            try ShipmentCustodyRecord(
                manifestReference: manifest.manifestReference,
                partReference: manifest.partReference,
                lotReference: manifest.lotReference,
                checkpoint: checkpoint,
                sequence: index + 1,
                issuerReference: "CUSTODY-ISSUER-\(index + 1)",
                evidence: .verified
            )
        }
        let inspection = try ShipmentReceivingInspection(
            manifestReference: manifest.manifestReference,
            partReference: manifest.partReference,
            lotReference: manifest.lotReference,
            physicalInspectionEvidence: .verified,
            artifactIntegrityEvidence: .verified,
            accountabilityEvidence: .verified,
            accountableOwnerReference: "RECEIVING-REVIEW-OWNER"
        )
        let assessedAt = Date(timeIntervalSince1970: 1_800_000_000)
        let governance = try ShipmentExternalGovernance(
            manifestReference: manifest.manifestReference,
            partReference: manifest.partReference,
            lotReference: manifest.lotReference,
            routePolicyReference: manifest.routePolicyReference,
            authorityReference: "GOVERNANCE-AUTHORITY",
            governanceRecordReference: "GOVERNANCE-RECORD-001",
            evidence: .verified,
            state: .active,
            expiresAt: assessedAt.addingTimeInterval(3_600)
        )
        return ShipmentAdmissionRequest(
            manifest: manifest,
            custodyRecords: records,
            receivingInspection: inspection,
            governance: governance,
            networkObservation: networkObservation,
            assessedAt: assessedAt
        )
    }

    func testCompleteIndependentContinuityIsReviewReadyButNeverAutomaticallyAccepted() throws {
        let result = ShipmentProvenancePolicy.evaluate(try fixture())

        XCTAssertEqual(result.decision, .reviewReady)
        XCTAssertEqual(result.code, .reviewReady)
        XCTAssertTrue(result.isReviewReady)
        XCTAssertTrue(result.requiresAuthorizedReview)
        XCTAssertTrue(result.stages.custodyContinuity)
        XCTAssertTrue(result.stages.custodyEvidence)
        XCTAssertTrue(result.reason.contains("does not accept"))
    }

    func testNetworkConflictForcesHoldEvenWhenCustodyLooksComplete() throws {
        let result = ShipmentProvenancePolicy.evaluate(
            try fixture(networkObservation: .conflicted)
        )

        XCTAssertEqual(result.decision, .hold)
        XCTAssertEqual(result.code, .networkObservationConflicted)
        XCTAssertFalse(result.stages.networkNotConflicted)
    }

    func testRouterOrNetworkSignalCannotSubstituteForMissingCustodyRecords() throws {
        var request = try fixture(networkObservation: .consistent)
        request = ShipmentAdmissionRequest(
            manifest: request.manifest,
            custodyRecords: [],
            receivingInspection: request.receivingInspection,
            governance: request.governance,
            networkObservation: .consistent,
            assessedAt: request.assessedAt
        )

        let result = ShipmentProvenancePolicy.evaluate(request)

        XCTAssertEqual(result.decision, .hold)
        XCTAssertEqual(result.code, .custodyChainIncomplete)
        XCTAssertFalse(result.stages.custodyContinuity)
        XCTAssertFalse(result.stages.custodyEvidence)
    }

    func testReorderedCustodyForcesRouteDeviationHold() throws {
        let request = try fixture()
        var records = request.custodyRecords
        records.swapAt(0, 1)
        let changed = ShipmentAdmissionRequest(
            manifest: request.manifest,
            custodyRecords: records,
            receivingInspection: request.receivingInspection,
            governance: request.governance,
            networkObservation: .notObserved,
            assessedAt: request.assessedAt
        )

        let result = ShipmentProvenancePolicy.evaluate(changed)

        XCTAssertEqual(result.decision, .hold)
        XCTAssertEqual(result.code, .routeDeviation)
        XCTAssertFalse(result.stages.custodyContinuity)
    }

    func testDeclaredCustodyEvidenceDoesNotBecomeContinuityProof() throws {
        let request = try fixture()
        let declared = try ShipmentCustodyRecord(
            manifestReference: request.manifest.manifestReference,
            partReference: request.manifest.partReference,
            lotReference: request.manifest.lotReference,
            checkpoint: request.manifest.expectedCheckpoints[0],
            sequence: 1,
            issuerReference: "CUSTODY-ISSUER-1",
            evidence: .declared
        )
        var records = request.custodyRecords
        records[0] = declared
        let changed = ShipmentAdmissionRequest(
            manifest: request.manifest,
            custodyRecords: records,
            receivingInspection: request.receivingInspection,
            governance: request.governance,
            networkObservation: .notObserved,
            assessedAt: request.assessedAt
        )

        let result = ShipmentProvenancePolicy.evaluate(changed)

        XCTAssertEqual(result.decision, .hold)
        XCTAssertEqual(result.code, .custodyEvidenceUnverified)
        XCTAssertFalse(result.stages.custodyEvidence)
    }

    func testReceivingIdentityMismatchCannotBeOverriddenByCustodyHistory() throws {
        let request = try fixture()
        let mismatchedInspection = try ShipmentReceivingInspection(
            manifestReference: request.manifest.manifestReference,
            partReference: "DIFFERENT-PART",
            lotReference: request.manifest.lotReference,
            physicalInspectionEvidence: .verified,
            artifactIntegrityEvidence: .verified,
            accountabilityEvidence: .verified,
            accountableOwnerReference: "RECEIVING-REVIEW-OWNER"
        )
        let changed = ShipmentAdmissionRequest(
            manifest: request.manifest,
            custodyRecords: request.custodyRecords,
            receivingInspection: mismatchedInspection,
            governance: request.governance,
            networkObservation: .notObserved,
            assessedAt: request.assessedAt
        )

        let result = ShipmentProvenancePolicy.evaluate(changed)

        XCTAssertEqual(result.decision, .hold)
        XCTAssertEqual(result.code, .receivingIdentityMismatch)
        XCTAssertFalse(result.stages.receivingIdentityBound)
    }

    func testUnavailableExternalGovernanceFailsClosed() throws {
        let request = try fixture()
        let unavailableGovernance = try ShipmentExternalGovernance(
            manifestReference: request.manifest.manifestReference,
            partReference: request.manifest.partReference,
            lotReference: request.manifest.lotReference,
            routePolicyReference: request.manifest.routePolicyReference,
            authorityReference: "GOVERNANCE-AUTHORITY",
            governanceRecordReference: "GOVERNANCE-RECORD-UNAVAILABLE",
            evidence: .unavailable,
            state: .unavailable,
            expiresAt: request.assessedAt.addingTimeInterval(3_600)
        )
        let changed = ShipmentAdmissionRequest(
            manifest: request.manifest,
            custodyRecords: request.custodyRecords,
            receivingInspection: request.receivingInspection,
            governance: unavailableGovernance,
            networkObservation: .notObserved,
            assessedAt: request.assessedAt
        )

        let result = ShipmentProvenancePolicy.evaluate(changed)

        XCTAssertEqual(result.decision, .hold)
        XCTAssertEqual(result.code, .externalGovernanceUnavailable)
        XCTAssertFalse(result.stages.governanceActive)
    }

    func testExpiredExternalGovernanceForcesHold() throws {
        let request = try fixture()
        let expiredGovernance = try ShipmentExternalGovernance(
            manifestReference: request.manifest.manifestReference,
            partReference: request.manifest.partReference,
            lotReference: request.manifest.lotReference,
            routePolicyReference: request.manifest.routePolicyReference,
            authorityReference: "GOVERNANCE-AUTHORITY",
            governanceRecordReference: "GOVERNANCE-RECORD-EXPIRED",
            evidence: .verified,
            state: .active,
            expiresAt: request.assessedAt
        )
        let changed = ShipmentAdmissionRequest(
            manifest: request.manifest,
            custodyRecords: request.custodyRecords,
            receivingInspection: request.receivingInspection,
            governance: expiredGovernance,
            networkObservation: .notObserved,
            assessedAt: request.assessedAt
        )

        let result = ShipmentProvenancePolicy.evaluate(changed)

        XCTAssertEqual(result.decision, .hold)
        XCTAssertEqual(result.code, .externalGovernanceExpired)
        XCTAssertFalse(result.stages.governanceNotExpired)
    }

    func testRevokedExternalGovernanceForcesHold() throws {
        let request = try fixture()
        let revokedGovernance = try ShipmentExternalGovernance(
            manifestReference: request.manifest.manifestReference,
            partReference: request.manifest.partReference,
            lotReference: request.manifest.lotReference,
            routePolicyReference: request.manifest.routePolicyReference,
            authorityReference: "GOVERNANCE-AUTHORITY",
            governanceRecordReference: "GOVERNANCE-RECORD-REVOKED",
            evidence: .verified,
            state: .revoked,
            expiresAt: request.assessedAt.addingTimeInterval(3_600)
        )
        let changed = ShipmentAdmissionRequest(
            manifest: request.manifest,
            custodyRecords: request.custodyRecords,
            receivingInspection: request.receivingInspection,
            governance: revokedGovernance,
            networkObservation: .notObserved,
            assessedAt: request.assessedAt
        )

        let result = ShipmentProvenancePolicy.evaluate(changed)

        XCTAssertEqual(result.decision, .hold)
        XCTAssertEqual(result.code, .externalGovernanceRevoked)
        XCTAssertFalse(result.stages.governanceActive)
    }

    func testSameKnownGovernanceAndReceivingRoleFailsSeparationOfDuties() throws {
        let request = try fixture()
        let sameRoleGovernance = try ShipmentExternalGovernance(
            manifestReference: request.manifest.manifestReference,
            partReference: request.manifest.partReference,
            lotReference: request.manifest.lotReference,
            routePolicyReference: request.manifest.routePolicyReference,
            authorityReference: request.receivingInspection.accountableOwnerReference,
            governanceRecordReference: "GOVERNANCE-RECORD-SAME-ROLE",
            evidence: .verified,
            state: .active,
            expiresAt: request.assessedAt.addingTimeInterval(3_600)
        )
        let changed = ShipmentAdmissionRequest(
            manifest: request.manifest,
            custodyRecords: request.custodyRecords,
            receivingInspection: request.receivingInspection,
            governance: sameRoleGovernance,
            networkObservation: .notObserved,
            assessedAt: request.assessedAt
        )

        let result = ShipmentProvenancePolicy.evaluate(changed)

        XCTAssertEqual(result.decision, .hold)
        XCTAssertEqual(result.code, .separationOfDutiesNotMet)
        XCTAssertFalse(result.stages.separationOfDuties)
    }

    func testMismatchedExpectedManifestFailsClosed() throws {
        let request = try fixture()
        let mismatchedGovernance = try ShipmentExternalGovernance(
            manifestReference: "OTHER-MANIFEST",
            partReference: request.manifest.partReference,
            lotReference: request.manifest.lotReference,
            routePolicyReference: request.manifest.routePolicyReference,
            authorityReference: "GOVERNANCE-AUTHORITY",
            governanceRecordReference: "GOVERNANCE-RECORD-MISMATCH",
            evidence: .verified,
            state: .active,
            expiresAt: request.assessedAt.addingTimeInterval(3_600)
        )
        let changed = ShipmentAdmissionRequest(
            manifest: request.manifest,
            custodyRecords: request.custodyRecords,
            receivingInspection: request.receivingInspection,
            governance: mismatchedGovernance,
            networkObservation: .notObserved,
            assessedAt: request.assessedAt
        )

        let result = ShipmentProvenancePolicy.evaluate(changed)

        XCTAssertEqual(result.decision, .hold)
        XCTAssertEqual(result.code, .expectedManifestMismatch)
        XCTAssertFalse(result.stages.manifestBound)
    }
}
