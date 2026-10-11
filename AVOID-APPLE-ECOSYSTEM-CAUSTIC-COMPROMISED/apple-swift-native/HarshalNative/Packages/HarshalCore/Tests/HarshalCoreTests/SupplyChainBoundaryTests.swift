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

    func testPublishedEditionSourceReferencesRemainExplicitlyBounded() {
        XCTAssertEqual(AGSv02PublishedCorpus.identifier, "AGS-V0.2-FULL-BOOK-2026-10-07")
        XCTAssertEqual(AGSv02PublishedCorpus.pdfPageCount, 548)
        XCTAssertEqual(
            AGSv02PublishedCorpus.sourceArtifactPath,
            "publications/book/AGS-v0.2-Harshal-s-Systems-Full-Book-KDP-interior-2026-10-07.pdf"
        )
        XCTAssertEqual(
            AGSv02PublishedCorpus.sourceSHA256,
            "6c67feae3881c11bab8e2654e1f58d23aabbbb1dfdcd536464218c2bbf839823"
        )

        XCTAssertEqual(AccountabilityResearchReference.sourcePart, "Part XVIII")
        XCTAssertEqual(AccountabilityResearchReference.documentID, "AGS-V0.2-PART-XVIII")
        XCTAssertEqual(AccountabilityResearchReference.printedStartPage, "203")
        XCTAssertEqual(AccountabilityResearchReference.pdfStartPage, 229)
        XCTAssertEqual(AccountabilityResearchReference.provenanceClass, "RESEARCH")
        XCTAssertEqual(AccountabilityResearchReference.evidenceStatus, "NOT_AN_INDEPENDENT_CERTIFICATION")
        XCTAssertEqual(AccountabilityResearchReference.legacyCompanionDocumentID, "HS-19-RESEARCH-PAPERS")

        XCTAssertEqual(SupplyChainResearchReference.identifier, "SCAV-PLUS-PLUS")
        XCTAssertEqual(SupplyChainResearchReference.sourcePart, "Part XIX")
        XCTAssertEqual(SupplyChainResearchReference.documentID, "AGS-V0.2-PART-XIX")
        XCTAssertEqual(SupplyChainResearchReference.printedStartPage, "213")
        XCTAssertEqual(SupplyChainResearchReference.pdfStartPage, 239)
        XCTAssertEqual(SupplyChainResearchReference.provenanceClass, "THREAT_RESEARCH")
        XCTAssertTrue(SupplyChainResearchReference.summary.contains("does not derive or operationalize Part XIX material"))
        XCTAssertTrue(SupplyChainBoundary.limitation.contains("does not independently verify"))
    }

    func testPublishedCorpusMapKeepsAllSectionsAndTheirLocalBoundaries() {
        XCTAssertEqual(AGSv02PublishedCorpus.sections.count, 37)
        XCTAssertEqual(Set(AGSv02PublishedCorpus.sections.map(\.id)).count, AGSv02PublishedCorpus.sections.count)
        let pdfStartPages = AGSv02PublishedCorpus.sections.map(\.pdfStartPage)
        XCTAssertTrue(zip(pdfStartPages, pdfStartPages.dropFirst()).allSatisfy { $0 < $1 })

        guard let accountability = AGSv02PublishedCorpus.section("PART-XVIII"),
              let threatResearch = AGSv02PublishedCorpus.section("PART-XIX"),
              let narrative = AGSv02PublishedCorpus.section("PART-XIX-B"),
              let companion = AGSv02PublishedCorpus.section("APPENDIX-G") else {
            return XCTFail("Expected published corpus sections are missing")
        }

        XCTAssertEqual(accountability.pdfStartPage, 229)
        XCTAssertEqual(accountability.nativeDisposition, .boundedDesignReference)
        XCTAssertEqual(threatResearch.pdfStartPage, 239)
        XCTAssertEqual(threatResearch.nativeDisposition, .threatResearchCatalogOnly)
        XCTAssertTrue(threatResearch.nativeDisposition.boundary.contains("Do not derive scenarios"))
        XCTAssertEqual(narrative.nativeDisposition, .narrativeOrFictionOnly)
        XCTAssertEqual(companion.nativeDisposition, .machineReadableReferenceOnly)
        XCTAssertTrue(AGSv02PublishedCorpus.runtimeBoundary.contains("does not package the PDF"))
    }

    func testRepositoryCompanionCatalogIsCuratedAndExternalOnly() {
        XCTAssertEqual(HarshalRepositoryCompanionCatalog.entries.count, 13)
        XCTAssertEqual(HarshalRepositoryCompanionCatalog.repositoryURL, "https://github.com/A44674928/HarshalOS")

        guard let publishedCorpus = HarshalRepositoryCompanionCatalog.entries.first(where: { $0.id == "PUBLISHED-CORPUS" }),
              let reader = HarshalRepositoryCompanionCatalog.entries.first(where: { $0.id == "LIBRARY-READER" }),
              let security = HarshalRepositoryCompanionCatalog.entries.first(where: { $0.id == "SECURITY" }) else {
            return XCTFail("Expected repository companion entries are missing")
        }

        XCTAssertEqual(publishedCorpus.repositoryPath, "native/HarshalNative/docs/AGS-V0.2-CORPUS.md")
        XCTAssertEqual(reader.repositoryPath, "native/HarshalNative/docs/LIBRARY-READER.md")
        XCTAssertEqual(security.githubURL?.host, "github.com")
        XCTAssertTrue(reader.boundary.contains("local and read-only"))
        XCTAssertTrue(HarshalRepositoryCompanionCatalog.summary.contains("Remote repository pages remain external"))
    }

    func testPublishedCorpusTranslationsRetainConstraintsWithoutClaimingHumanOrExternalAuthority() {
        XCTAssertEqual(PublishedCorpusNativeBoundaryTranslation.allCases.count, 5)
        XCTAssertEqual(
            PublishedCorpusNativeBoundaryTranslation.accountableEvidenceBeforeAuthority.sourcePart,
            "Part XVIII"
        )
        XCTAssertTrue(
            PublishedCorpusNativeBoundaryTranslation.accountableEvidenceBeforeAuthority.explicitLimit
                .contains("No identity")
        )
        XCTAssertTrue(
            PublishedCorpusNativeBoundaryTranslation.scopeContractsOnFailure.nativeTranslation
                .contains("non-acting hold or refusal")
        )
        XCTAssertEqual(
            PublishedCorpusNativeBoundaryTranslation.threatResearchRemainsCatalogOnly.sourcePart,
            "Part XIX"
        )
        XCTAssertTrue(
            PublishedCorpusNativeBoundaryTranslation.threatResearchRemainsCatalogOnly.explicitLimit
                .contains("No scenario")
        )
        XCTAssertTrue(
            PublishedCorpusNativeBoundaryTranslation.computationalComponentsRemainNonAuthoritative.nativeTranslation
                .contains("CWO remains a valid archival/custodial phase")
        )
        XCTAssertTrue(
            PublishedCorpusNativeBoundaryTranslation.computationalComponentsRemainNonAuthoritative.explicitLimit
                .contains("No body/neural-interface interpretation")
        )
    }
}
