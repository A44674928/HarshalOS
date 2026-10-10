import CryptoKit
import Foundation
import XCTest
@testable import HarshalCore

final class ShipmentProvenanceBaselineTests: XCTestCase {
    func testCompletePreRegisteredDualSignedCustodyChainWithCurrentReviewVerifiesContinuityOnly() throws {
        let fixture = try ProvenanceFixture()

        let assessment = ShipmentProvenanceBaseline.evaluate(
            fixture.bundle,
            trustStore: fixture.trustStore,
            nowMilliseconds: fixture.nowMilliseconds
        )

        XCTAssertEqual(assessment.decision, .verifiedContinuity)
        XCTAssertEqual(assessment.code, .verifiedContinuity)
        XCTAssertTrue(assessment.hasVerifiedContinuity)
        XCTAssertEqual(assessment.verifiedReceiptCount, 2)
        XCTAssertTrue(assessment.reason.contains("not a release or deployment authority"))
        XCTAssertTrue(assessment.limitation.contains("cannot independently inspect a physical component"))
    }

    func testUntrustedNetworkObservationCannotSubstituteForMissingCustodyRecords() throws {
        let fixture = try ProvenanceFixture()
        let bundle = ShipmentProvenanceBundle(
            manifest: fixture.bundle.manifest,
            routeAuthorization: fixture.bundle.routeAuthorization,
            revocationSnapshot: fixture.bundle.revocationSnapshot,
            custodyReceipts: [],
            accountableReview: fixture.bundle.accountableReview
        )

        let assessment = ShipmentProvenanceBaseline.evaluate(
            bundle,
            trustStore: fixture.trustStore,
            nowMilliseconds: fixture.nowMilliseconds
        )

        XCTAssertEqual(assessment.decision, .holdForAuthorizedReview)
        XCTAssertEqual(assessment.code, .custodySequenceIncomplete)
        XCTAssertFalse(assessment.hasVerifiedContinuity)
    }

    func testAlteredManifestDoesNotVerifyWithOriginalOriginSignature() throws {
        let fixture = try ProvenanceFixture()
        let alteredManifest = try ShipmentComponentManifest(
            componentID: fixture.bundle.manifest.componentID,
            lotID: fixture.bundle.manifest.lotID,
            componentDigest: Self.sha256("substituted-component"),
            originSignerID: fixture.bundle.manifest.originSignerID,
            issuedAtMilliseconds: fixture.bundle.manifest.issuedAtMilliseconds,
            expiresAtMilliseconds: fixture.bundle.manifest.expiresAtMilliseconds,
            signature: fixture.bundle.manifest.signature
        )
        let bundle = ShipmentProvenanceBundle(
            manifest: alteredManifest,
            routeAuthorization: fixture.bundle.routeAuthorization,
            revocationSnapshot: fixture.bundle.revocationSnapshot,
            custodyReceipts: fixture.bundle.custodyReceipts,
            accountableReview: fixture.bundle.accountableReview
        )

        let assessment = ShipmentProvenanceBaseline.evaluate(
            bundle,
            trustStore: fixture.trustStore,
            nowMilliseconds: fixture.nowMilliseconds
        )

        XCTAssertEqual(assessment.decision, .holdForAuthorizedReview)
        XCTAssertEqual(assessment.code, .originSignatureInvalid)
    }

    func testUnplannedCheckpointIsHeldBeforeSignaturesCanBeTreatedAsContinuity() throws {
        let fixture = try ProvenanceFixture()
        let original = fixture.bundle.custodyReceipts[1]
        let deviatedReceipt = try ShipmentCustodyReceipt(
            componentID: original.componentID,
            componentDigest: original.componentDigest,
            routeID: original.routeID,
            sequence: original.sequence,
            checkpointID: "UNPLANNED-HUB",
            previousReceiptDigest: original.previousReceiptDigest,
            handoffEvidenceDigest: original.handoffEvidenceDigest,
            transferredAtMilliseconds: original.transferredAtMilliseconds,
            senderSignerID: original.senderSignerID,
            receiverSignerID: original.receiverSignerID,
            senderSignature: original.senderSignature,
            receiverSignature: original.receiverSignature
        )
        var receipts = fixture.bundle.custodyReceipts
        receipts[1] = deviatedReceipt
        let bundle = ShipmentProvenanceBundle(
            manifest: fixture.bundle.manifest,
            routeAuthorization: fixture.bundle.routeAuthorization,
            revocationSnapshot: fixture.bundle.revocationSnapshot,
            custodyReceipts: receipts,
            accountableReview: fixture.bundle.accountableReview
        )

        let assessment = ShipmentProvenanceBaseline.evaluate(
            bundle,
            trustStore: fixture.trustStore,
            nowMilliseconds: fixture.nowMilliseconds
        )

        XCTAssertEqual(assessment.decision, .holdForAuthorizedReview)
        XCTAssertEqual(assessment.code, .custodyReceiptMismatch)
    }

    func testReceiptReplayAcrossDifferentSignedRouteIsHeld() throws {
        let fixture = try ProvenanceFixture()
        let unsignedRoute = try ShipmentRouteAuthorization(
            componentID: fixture.bundle.manifest.componentID,
            componentDigest: fixture.bundle.manifest.componentDigest,
            routeID: "ROUTE-SECOND-ATTEMPT",
            checkpointIDs: fixture.bundle.routeAuthorization.checkpointIDs,
            routeAuthoritySignerID: "ROUTE-1",
            issuedAtMilliseconds: fixture.bundle.routeAuthorization.issuedAtMilliseconds,
            expiresAtMilliseconds: fixture.bundle.routeAuthorization.expiresAtMilliseconds,
            signature: Self.placeholderSignature
        )
        let replacementSignature = try fixture.routePrivateKey.signature(for: unsignedRoute.signingPayload())
        let replacementRoute = try unsignedRoute.replacingSignature(replacementSignature)
        let replayedBundle = ShipmentProvenanceBundle(
            manifest: fixture.bundle.manifest,
            routeAuthorization: replacementRoute,
            revocationSnapshot: fixture.bundle.revocationSnapshot,
            custodyReceipts: fixture.bundle.custodyReceipts,
            accountableReview: fixture.bundle.accountableReview
        )

        let assessment = ShipmentProvenanceBaseline.evaluate(
            replayedBundle,
            trustStore: fixture.trustStore,
            nowMilliseconds: fixture.nowMilliseconds
        )

        XCTAssertEqual(assessment.decision, .holdForAuthorizedReview)
        XCTAssertEqual(assessment.code, .custodyReceiptMismatch)
    }

    func testUnenrolledOriginSignerCannotBeIntroducedByIncomingRecord() throws {
        let fixture = try ProvenanceFixture()
        let replacementOrigin = Curve25519.Signing.PrivateKey()
        let unsignedManifest = try ShipmentComponentManifest(
            componentID: fixture.bundle.manifest.componentID,
            lotID: fixture.bundle.manifest.lotID,
            componentDigest: fixture.bundle.manifest.componentDigest,
            originSignerID: "UNKNOWN-ORIGIN",
            issuedAtMilliseconds: fixture.bundle.manifest.issuedAtMilliseconds,
            expiresAtMilliseconds: fixture.bundle.manifest.expiresAtMilliseconds,
            signature: Self.placeholderSignature
        )
        let replacementSignature = try replacementOrigin.signature(for: unsignedManifest.signingPayload())
        let unknownOriginManifest = try unsignedManifest.replacingSignature(replacementSignature)
        let bundle = ShipmentProvenanceBundle(
            manifest: unknownOriginManifest,
            routeAuthorization: fixture.bundle.routeAuthorization,
            revocationSnapshot: fixture.bundle.revocationSnapshot,
            custodyReceipts: fixture.bundle.custodyReceipts,
            accountableReview: fixture.bundle.accountableReview
        )

        let assessment = ShipmentProvenanceBaseline.evaluate(
            bundle,
            trustStore: fixture.trustStore,
            nowMilliseconds: fixture.nowMilliseconds
        )

        XCTAssertEqual(assessment.decision, .holdForAuthorizedReview)
        XCTAssertEqual(assessment.code, .originSignerUntrusted)
    }

    func testAOneSidedCustodyStatementCannotReplaceDualSignatures() throws {
        let fixture = try ProvenanceFixture()
        let original = fixture.bundle.custodyReceipts[0]
        let oneSided = try original.replacingSignatures(
            senderSignature: original.senderSignature,
            receiverSignature: Self.placeholderSignature
        )
        var receipts = fixture.bundle.custodyReceipts
        receipts[0] = oneSided
        let bundle = ShipmentProvenanceBundle(
            manifest: fixture.bundle.manifest,
            routeAuthorization: fixture.bundle.routeAuthorization,
            revocationSnapshot: fixture.bundle.revocationSnapshot,
            custodyReceipts: receipts,
            accountableReview: fixture.bundle.accountableReview
        )

        let assessment = ShipmentProvenanceBaseline.evaluate(
            bundle,
            trustStore: fixture.trustStore,
            nowMilliseconds: fixture.nowMilliseconds
        )

        XCTAssertEqual(assessment.decision, .holdForAuthorizedReview)
        XCTAssertEqual(assessment.code, .custodySignatureInvalid)
    }

    func testExpiredSignedRevocationSnapshotFailsClosed() throws {
        let fixture = try ProvenanceFixture()

        let assessment = ShipmentProvenanceBaseline.evaluate(
            fixture.bundle,
            trustStore: fixture.trustStore,
            nowMilliseconds: fixture.bundle.revocationSnapshot.expiresAtMilliseconds
        )

        XCTAssertEqual(assessment.decision, .holdForAuthorizedReview)
        XCTAssertEqual(assessment.code, .revocationSnapshotExpired)
    }

    func testDecodingRoutesSecurityRecordsThroughTheirValidationInitializers() throws {
        let fixture = try ProvenanceFixture()
        let encoded = try JSONEncoder().encode(fixture.bundle.manifest)
        let recovered = try JSONDecoder().decode(ShipmentComponentManifest.self, from: encoded)
        XCTAssertEqual(recovered, fixture.bundle.manifest)
        var object = try XCTUnwrap(JSONSerialization.jsonObject(with: encoded) as? [String: Any])
        object["componentID"] = ""
        let malformed = try JSONSerialization.data(withJSONObject: object)

        XCTAssertThrowsError(
            try JSONDecoder().decode(ShipmentComponentManifest.self, from: malformed)
        ) { error in
            XCTAssertEqual(error as? ShipmentProvenanceError, .invalidIdentifier)
        }
    }

    func testSignedRevocationSnapshotHoldsRevokedCustodyKey() throws {
        let fixture = try ProvenanceFixture()
        let revocationSnapshot = try fixture.signedRevocationSnapshot(revokedSignerIDs: ["CUSTODY-ALPHA"])
        let bundle = ShipmentProvenanceBundle(
            manifest: fixture.bundle.manifest,
            routeAuthorization: fixture.bundle.routeAuthorization,
            revocationSnapshot: revocationSnapshot,
            custodyReceipts: fixture.bundle.custodyReceipts,
            accountableReview: fixture.bundle.accountableReview
        )

        let assessment = ShipmentProvenanceBaseline.evaluate(
            bundle,
            trustStore: fixture.trustStore,
            nowMilliseconds: fixture.nowMilliseconds
        )

        XCTAssertEqual(assessment.decision, .holdForAuthorizedReview)
        XCTAssertEqual(assessment.code, .evidenceRevoked)
    }

    func testOperationalSignerCannotSelfReviewEvenWhenGivenReviewerRole() throws {
        let fixture = try ProvenanceFixture()
        let original = fixture.bundle.accountableReview
        let unsignedReview = try ShipmentAccountableReview(
            reviewID: original.reviewID,
            reviewerReferenceID: original.reviewerReferenceID,
            reviewScope: original.reviewScope,
            reviewEvidenceDigest: original.reviewEvidenceDigest,
            componentID: original.componentID,
            componentDigest: original.componentDigest,
            routeID: original.routeID,
            reviewedReceiptDigest: original.reviewedReceiptDigest,
            reviewerSignerID: "ORIGIN-1",
            reviewedAtMilliseconds: original.reviewedAtMilliseconds,
            expiresAtMilliseconds: original.expiresAtMilliseconds,
            signature: Self.placeholderSignature
        )
        let signature = try fixture.originPrivateKey.signature(for: unsignedReview.signingPayload())
        let selfReviewed = try unsignedReview.replacingSignature(signature)
        let bundle = ShipmentProvenanceBundle(
            manifest: fixture.bundle.manifest,
            routeAuthorization: fixture.bundle.routeAuthorization,
            revocationSnapshot: fixture.bundle.revocationSnapshot,
            custodyReceipts: fixture.bundle.custodyReceipts,
            accountableReview: selfReviewed
        )

        let assessment = ShipmentProvenanceBaseline.evaluate(
            bundle,
            trustStore: try fixture.trustStoreWithOriginAlsoReviewer(),
            nowMilliseconds: fixture.nowMilliseconds
        )

        XCTAssertEqual(assessment.decision, .holdForAuthorizedReview)
        XCTAssertEqual(assessment.code, .reviewSeparationOfDutiesFailed)
    }

    func testInvalidAccountableReviewSignatureCannotBeUsedAsReviewEvidence() throws {
        let fixture = try ProvenanceFixture()
        let invalidReview = try fixture.bundle.accountableReview.replacingSignature(Self.placeholderSignature)
        let bundle = ShipmentProvenanceBundle(
            manifest: fixture.bundle.manifest,
            routeAuthorization: fixture.bundle.routeAuthorization,
            revocationSnapshot: fixture.bundle.revocationSnapshot,
            custodyReceipts: fixture.bundle.custodyReceipts,
            accountableReview: invalidReview
        )

        let assessment = ShipmentProvenanceBaseline.evaluate(
            bundle,
            trustStore: fixture.trustStore,
            nowMilliseconds: fixture.nowMilliseconds
        )

        XCTAssertEqual(assessment.decision, .holdForAuthorizedReview)
        XCTAssertEqual(assessment.code, .reviewSignatureInvalid)
    }

    private static let placeholderSignature = Data(repeating: 0, count: 64)

    private static func sha256(_ value: String) -> String {
        SHA256.hash(data: Data(value.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}

private struct ProvenanceFixture {
    let nowMilliseconds: Int64
    let originPrivateKey: Curve25519.Signing.PrivateKey
    let routePrivateKey: Curve25519.Signing.PrivateKey
    let sourceCustodyPrivateKey: Curve25519.Signing.PrivateKey
    let alphaCustodyPrivateKey: Curve25519.Signing.PrivateKey
    let bravoCustodyPrivateKey: Curve25519.Signing.PrivateKey
    let revocationPrivateKey: Curve25519.Signing.PrivateKey
    let reviewerPrivateKey: Curve25519.Signing.PrivateKey

    let trustStore: ShipmentProvenanceTrustStore
    let bundle: ShipmentProvenanceBundle

    init() throws {
        let originPrivateKey = Curve25519.Signing.PrivateKey()
        let routePrivateKey = Curve25519.Signing.PrivateKey()
        let sourceCustodyPrivateKey = Curve25519.Signing.PrivateKey()
        let alphaCustodyPrivateKey = Curve25519.Signing.PrivateKey()
        let bravoCustodyPrivateKey = Curve25519.Signing.PrivateKey()
        let revocationPrivateKey = Curve25519.Signing.PrivateKey()
        let reviewerPrivateKey = Curve25519.Signing.PrivateKey()
        let nowMilliseconds: Int64 = 1_800_000_000_000
        let issuedAtMilliseconds = nowMilliseconds - 60_000
        let expiresAtMilliseconds = nowMilliseconds + 3_600_000
        let componentDigest = Self.sha256("component-evidence")

        trustStore = try ShipmentProvenanceTrustStore(signers: [
            try ShipmentProvenanceSigner(
                id: "ORIGIN-1",
                publicKey: originPrivateKey.publicKey.rawRepresentation,
                roles: [.origin]
            ),
            try ShipmentProvenanceSigner(
                id: "ROUTE-1",
                publicKey: routePrivateKey.publicKey.rawRepresentation,
                roles: [.routeAuthority]
            ),
            try ShipmentProvenanceSigner(
                id: "CUSTODY-SOURCE",
                publicKey: sourceCustodyPrivateKey.publicKey.rawRepresentation,
                roles: [.custody]
            ),
            try ShipmentProvenanceSigner(
                id: "CUSTODY-ALPHA",
                publicKey: alphaCustodyPrivateKey.publicKey.rawRepresentation,
                roles: [.custody]
            ),
            try ShipmentProvenanceSigner(
                id: "CUSTODY-BRAVO",
                publicKey: bravoCustodyPrivateKey.publicKey.rawRepresentation,
                roles: [.custody]
            ),
            try ShipmentProvenanceSigner(
                id: "REVOCATION-1",
                publicKey: revocationPrivateKey.publicKey.rawRepresentation,
                roles: [.revocationAuthority]
            ),
            try ShipmentProvenanceSigner(
                id: "REVIEWER-1",
                publicKey: reviewerPrivateKey.publicKey.rawRepresentation,
                roles: [.accountableReviewer]
            )
        ])

        let unsignedManifest = try ShipmentComponentManifest(
            componentID: "COMPONENT-42",
            lotID: "LOT-2026-A",
            componentDigest: componentDigest,
            originSignerID: "ORIGIN-1",
            issuedAtMilliseconds: issuedAtMilliseconds,
            expiresAtMilliseconds: expiresAtMilliseconds,
            signature: Self.placeholderSignature
        )
        let manifestSignature = try originPrivateKey.signature(for: unsignedManifest.signingPayload())
        let manifest = try unsignedManifest.replacingSignature(manifestSignature)

        let unsignedRoute = try ShipmentRouteAuthorization(
            componentID: manifest.componentID,
            componentDigest: manifest.componentDigest,
            routeID: "ROUTE-42",
            checkpointIDs: ["HUB-ALPHA", "HUB-BRAVO"],
            routeAuthoritySignerID: "ROUTE-1",
            issuedAtMilliseconds: issuedAtMilliseconds,
            expiresAtMilliseconds: expiresAtMilliseconds,
            signature: Self.placeholderSignature
        )
        let routeSignature = try routePrivateKey.signature(for: unsignedRoute.signingPayload())
        let route = try unsignedRoute.replacingSignature(routeSignature)

        let unsignedRevocation = try ShipmentProvenanceRevocationSnapshot(
            snapshotID: "REVOCATION-SNAPSHOT-42",
            revocationAuthoritySignerID: "REVOCATION-1",
            issuedAtMilliseconds: nowMilliseconds - 30_000,
            expiresAtMilliseconds: nowMilliseconds + 900_000,
            revokedSignerIDs: [],
            revokedComponentIDs: [],
            revokedComponentDigests: [],
            revokedRouteIDs: [],
            signature: Self.placeholderSignature
        )
        let revocationSignature = try revocationPrivateKey.signature(for: unsignedRevocation.signingPayload())
        let revocationSnapshot = try unsignedRevocation.replacingSignature(revocationSignature)

        let firstUnsignedReceipt = try ShipmentCustodyReceipt(
            componentID: manifest.componentID,
            componentDigest: manifest.componentDigest,
            routeID: route.routeID,
            sequence: 0,
            checkpointID: "HUB-ALPHA",
            previousReceiptDigest: ShipmentCustodyReceipt.genesisPreviousDigest,
            handoffEvidenceDigest: Self.sha256("handoff-alpha-evidence"),
            transferredAtMilliseconds: issuedAtMilliseconds + 10_000,
            senderSignerID: "CUSTODY-SOURCE",
            receiverSignerID: "CUSTODY-ALPHA",
            senderSignature: Self.placeholderSignature,
            receiverSignature: Self.placeholderSignature
        )
        let firstSenderSignature = try sourceCustodyPrivateKey.signature(for: firstUnsignedReceipt.signingPayload())
        let firstReceiverSignature = try alphaCustodyPrivateKey.signature(for: firstUnsignedReceipt.signingPayload())
        let firstReceipt = try firstUnsignedReceipt.replacingSignatures(
            senderSignature: firstSenderSignature,
            receiverSignature: firstReceiverSignature
        )

        let secondUnsignedReceipt = try ShipmentCustodyReceipt(
            componentID: manifest.componentID,
            componentDigest: manifest.componentDigest,
            routeID: route.routeID,
            sequence: 1,
            checkpointID: "HUB-BRAVO",
            previousReceiptDigest: firstReceipt.receiptDigest(),
            handoffEvidenceDigest: Self.sha256("handoff-bravo-evidence"),
            transferredAtMilliseconds: issuedAtMilliseconds + 20_000,
            senderSignerID: "CUSTODY-ALPHA",
            receiverSignerID: "CUSTODY-BRAVO",
            senderSignature: Self.placeholderSignature,
            receiverSignature: Self.placeholderSignature
        )
        let secondSenderSignature = try alphaCustodyPrivateKey.signature(for: secondUnsignedReceipt.signingPayload())
        let secondReceiverSignature = try bravoCustodyPrivateKey.signature(for: secondUnsignedReceipt.signingPayload())
        let secondReceipt = try secondUnsignedReceipt.replacingSignatures(
            senderSignature: secondSenderSignature,
            receiverSignature: secondReceiverSignature
        )

        let unsignedReview = try ShipmentAccountableReview(
            reviewID: "REVIEW-42",
            reviewerReferenceID: "REVIEW-CASE-42",
            reviewScope: .continuityReview,
            reviewEvidenceDigest: Self.sha256("review-evidence-42"),
            componentID: manifest.componentID,
            componentDigest: manifest.componentDigest,
            routeID: route.routeID,
            reviewedReceiptDigest: secondReceipt.receiptDigest(),
            reviewerSignerID: "REVIEWER-1",
            reviewedAtMilliseconds: issuedAtMilliseconds + 30_000,
            expiresAtMilliseconds: nowMilliseconds + 1_800_000,
            signature: Self.placeholderSignature
        )
        let reviewSignature = try reviewerPrivateKey.signature(for: unsignedReview.signingPayload())
        let accountableReview = try unsignedReview.replacingSignature(reviewSignature)

        bundle = ShipmentProvenanceBundle(
            manifest: manifest,
            routeAuthorization: route,
            revocationSnapshot: revocationSnapshot,
            custodyReceipts: [firstReceipt, secondReceipt],
            accountableReview: accountableReview
        )
        self.originPrivateKey = originPrivateKey
        self.routePrivateKey = routePrivateKey
        self.sourceCustodyPrivateKey = sourceCustodyPrivateKey
        self.alphaCustodyPrivateKey = alphaCustodyPrivateKey
        self.bravoCustodyPrivateKey = bravoCustodyPrivateKey
        self.revocationPrivateKey = revocationPrivateKey
        self.reviewerPrivateKey = reviewerPrivateKey
        self.nowMilliseconds = nowMilliseconds
    }

    func trustStoreWithOriginAlsoReviewer() throws -> ShipmentProvenanceTrustStore {
        try ShipmentProvenanceTrustStore(signers: [
            try ShipmentProvenanceSigner(
                id: "ORIGIN-1",
                publicKey: originPrivateKey.publicKey.rawRepresentation,
                roles: [.origin, .accountableReviewer]
            ),
            try ShipmentProvenanceSigner(
                id: "ROUTE-1",
                publicKey: routePrivateKey.publicKey.rawRepresentation,
                roles: [.routeAuthority]
            ),
            try ShipmentProvenanceSigner(
                id: "CUSTODY-SOURCE",
                publicKey: sourceCustodyPrivateKey.publicKey.rawRepresentation,
                roles: [.custody]
            ),
            try ShipmentProvenanceSigner(
                id: "CUSTODY-ALPHA",
                publicKey: alphaCustodyPrivateKey.publicKey.rawRepresentation,
                roles: [.custody]
            ),
            try ShipmentProvenanceSigner(
                id: "CUSTODY-BRAVO",
                publicKey: bravoCustodyPrivateKey.publicKey.rawRepresentation,
                roles: [.custody]
            ),
            try ShipmentProvenanceSigner(
                id: "REVOCATION-1",
                publicKey: revocationPrivateKey.publicKey.rawRepresentation,
                roles: [.revocationAuthority]
            ),
            try ShipmentProvenanceSigner(
                id: "REVIEWER-1",
                publicKey: reviewerPrivateKey.publicKey.rawRepresentation,
                roles: [.accountableReviewer]
            )
        ])
    }

    func signedRevocationSnapshot(revokedSignerIDs: [String]) throws -> ShipmentProvenanceRevocationSnapshot {
        let existing = bundle.revocationSnapshot
        let unsigned = try ShipmentProvenanceRevocationSnapshot(
            snapshotID: existing.snapshotID,
            revocationAuthoritySignerID: existing.revocationAuthoritySignerID,
            issuedAtMilliseconds: existing.issuedAtMilliseconds,
            expiresAtMilliseconds: existing.expiresAtMilliseconds,
            revokedSignerIDs: revokedSignerIDs,
            revokedComponentIDs: existing.revokedComponentIDs,
            revokedComponentDigests: existing.revokedComponentDigests,
            revokedRouteIDs: existing.revokedRouteIDs,
            signature: Self.placeholderSignature
        )
        let signature = try revocationPrivateKey.signature(for: unsigned.signingPayload())
        return try unsigned.replacingSignature(signature)
    }

    private static let placeholderSignature = Data(repeating: 0, count: 64)

    private static func sha256(_ value: String) -> String {
        SHA256.hash(data: Data(value.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}
