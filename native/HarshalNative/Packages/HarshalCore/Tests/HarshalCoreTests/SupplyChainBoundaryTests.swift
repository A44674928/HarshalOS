import XCTest
@testable import HarshalCore

final class SupplyChainBoundaryTests: XCTestCase {
    private func verifiedReferenceRequest(
        purpose: SupplyChainIntegrationPurpose = .localResearchReference,
        capabilities: Set<SupplyChainCapability> = [.displayResearch]
    ) -> SupplyChainBoundaryRequest {
        SupplyChainBoundaryRequest(
            subject: "Local Harshal Native research reader",
            purpose: purpose,
            originEvidence: .verified,
            buildIntegrityEvidence: .verified,
            updateContinuityEvidence: .verified,
            accountabilityEvidence: .verified,
            accountableOwnerReference: "Local release review owner",
            humanReviewRecorded: true,
            requestedCapabilities: capabilities
        )
    }

    func testVerifiedReadOnlyReferenceIsContainedButNeverPermitted() {
        let result = SupplyChainBoundary.evaluate(verifiedReferenceRequest())

        XCTAssertEqual(result.decision, .contained)
        XCTAssertEqual(result.code, .containedLocalReference)
        XCTAssertTrue(result.isContainedLocalReference)
        XCTAssertTrue(result.stages.origin)
        XCTAssertTrue(result.stages.buildIntegrity)
        XCTAssertTrue(result.stages.updateContinuity)
        XCTAssertTrue(result.stages.accountability)
        XCTAssertTrue(result.stages.purposeBound)
        XCTAssertTrue(result.stages.capabilityBound)
        XCTAssertTrue(result.reason.contains("not a permit"))
    }

    func testComponentEmbeddingRefusesEvenWhenEveryEvidenceFieldIsVerified() {
        let result = SupplyChainBoundary.evaluate(verifiedReferenceRequest(purpose: .componentEmbedding))

        XCTAssertEqual(result.decision, .refuse)
        XCTAssertEqual(result.code, .componentEmbeddingRefused)
        XCTAssertFalse(result.stages.purposeBound)
        XCTAssertTrue(result.reason.contains("not an SDK"))
    }

    func testDelegatedAuthorityAndExternalAutomationAlwaysRefuse() {
        let delegated = SupplyChainBoundary.evaluate(verifiedReferenceRequest(purpose: .authorityDelegation))
        let automation = SupplyChainBoundary.evaluate(verifiedReferenceRequest(purpose: .externalAutomation))

        XCTAssertEqual(delegated.decision, .refuse)
        XCTAssertEqual(delegated.code, .authorityDelegationRefused)
        XCTAssertEqual(automation.decision, .refuse)
        XCTAssertEqual(automation.code, .externalAutomationRefused)
    }

    func testUnverifiedOriginFailsClosedBeforeLocalReferenceCanBeContained() {
        var request = verifiedReferenceRequest()
        request.originEvidence = .declared

        let result = SupplyChainBoundary.evaluate(request)

        XCTAssertEqual(result.decision, .refuse)
        XCTAssertEqual(result.code, .originUnverified)
        XCTAssertFalse(result.stages.origin)
    }

    func testUnnamedDownstreamSubjectFailsClosed() {
        var request = verifiedReferenceRequest()
        request.subject = " \n"

        let result = SupplyChainBoundary.evaluate(request)

        XCTAssertEqual(result.decision, .refuse)
        XCTAssertEqual(result.code, .invalidSubject)
    }

    func testPrivilegedRequestIsRefusedEvenWithVerifiedEvidence() {
        let result = SupplyChainBoundary.evaluate(
            verifiedReferenceRequest(capabilities: [.displayResearch, .readPrivateState, .networkAccess])
        )

        XCTAssertEqual(result.decision, .refuse)
        XCTAssertEqual(result.code, .capabilityExceedsBoundary)
        XCTAssertFalse(result.stages.capabilityBound)
    }

    func testBuildUpdateAndAccountabilityEvidenceEachFailClosed() {
        var build = verifiedReferenceRequest()
        build.buildIntegrityEvidence = .conflicted
        XCTAssertEqual(SupplyChainBoundary.evaluate(build).code, .buildIntegrityUnverified)

        var update = verifiedReferenceRequest()
        update.updateContinuityEvidence = .revoked
        XCTAssertEqual(SupplyChainBoundary.evaluate(update).code, .updateContinuityUnverified)

        var accountability = verifiedReferenceRequest()
        accountability.accountabilityEvidence = .declared
        XCTAssertEqual(SupplyChainBoundary.evaluate(accountability).code, .accountabilityUnverified)
    }

    func testMissingHumanReviewFailsClosed() {
        var request = verifiedReferenceRequest()
        request.humanReviewRecorded = false

        let result = SupplyChainBoundary.evaluate(request)

        XCTAssertEqual(result.decision, .refuse)
        XCTAssertEqual(result.code, .humanReviewMissing)
        XCTAssertFalse(result.stages.accountability)
    }

    func testMissingAccountableOwnerReferenceFailsClosedWithoutClaimingIdentityProof() {
        var request = verifiedReferenceRequest()
        request.accountableOwnerReference = "   "

        let result = SupplyChainBoundary.evaluate(request)

        XCTAssertEqual(result.decision, .refuse)
        XCTAssertEqual(result.code, .accountableOwnerMissing)
        XCTAssertFalse(result.stages.accountability)
        XCTAssertTrue(result.reason.contains("not identity proof"))
    }

    func testResearchReferenceMetadataRemainsExplicitlyBounded() {
        XCTAssertEqual(SupplyChainResearchReference.identifier, "SCAV-PLUS-PLUS")
        XCTAssertEqual(SupplyChainResearchReference.documentID, "HS-20-SUPPLY-CHAIN")
        XCTAssertEqual(SupplyChainResearchReference.provenanceClass, "CANONICAL_SOURCE")
        XCTAssertEqual(SupplyChainResearchReference.statusTaxonomy, "RESEARCH_PAPER")
        XCTAssertEqual(SupplyChainResearchReference.researchLayer, "THREAT_RESEARCH")
        XCTAssertEqual(SupplyChainResearchReference.evidenceStatus, "MIXED_VERIFIED_AND_REPORTED")
        XCTAssertEqual(SupplyChainResearchReference.sourcePath, "docs/harshal-systems/20-supply-chain.md")
        XCTAssertTrue(SupplyChainResearchReference.summary.contains("defensive"))
        XCTAssertTrue(SupplyChainBoundary.limitation.contains("does not independently verify"))
    }
}
