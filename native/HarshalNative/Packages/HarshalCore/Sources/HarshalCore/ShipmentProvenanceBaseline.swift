import CryptoKit
import Foundation

/// Cryptographic roles accepted by the defensive shipment-admission baseline.
/// A role is a scoped key purpose, not proof of a person's identity, legal
/// authority, physical possession, or the truth of a shipment record.
public enum ShipmentProvenanceSignerRole: String, CaseIterable, Codable, Sendable, Hashable {
    case origin = "ORIGIN"
    case routeAuthority = "ROUTE_AUTHORITY"
    case custody = "CUSTODY"
    case revocationAuthority = "REVOCATION_AUTHORITY"
    case accountableReviewer = "ACCOUNTABLE_REVIEWER"
}

/// A build- or deployment-supplied public key with narrowly declared signing
/// roles. Trust-store enrollment is outside this local model and must be
/// governed by an accountable release/key-management process.
public struct ShipmentProvenanceSigner: Equatable, Hashable, Sendable {
    public let id: String
    public let publicKey: Data
    public let roles: Set<ShipmentProvenanceSignerRole>

    public init(
        id: String,
        publicKey: Data,
        roles: Set<ShipmentProvenanceSignerRole>
    ) throws {
        try ShipmentProvenanceCanonical.validateIdentifier(id)
        guard !roles.isEmpty else {
            throw ShipmentProvenanceError.invalidSigner
        }
        do {
            _ = try Curve25519.Signing.PublicKey(rawRepresentation: publicKey)
        } catch {
            throw ShipmentProvenanceError.invalidSigner
        }
        self.id = id
        self.publicKey = publicKey
        self.roles = roles
    }
}

/// A closed set of trusted public keys. The app never accepts a signer merely
/// because an incoming record names it; the signer must be present here with
/// the precise required role.
public struct ShipmentProvenanceTrustStore: Sendable {
    private let signersByID: [String: ShipmentProvenanceSigner]

    public init(signers: [ShipmentProvenanceSigner]) throws {
        var storage: [String: ShipmentProvenanceSigner] = [:]
        var enrolledKeys = Set<Data>()
        for signer in signers {
            guard storage[signer.id] == nil,
                  enrolledKeys.insert(signer.publicKey).inserted else {
                throw ShipmentProvenanceError.duplicateSigner
            }
            storage[signer.id] = signer
        }
        signersByID = storage
    }

    public func signer(id: String, requiring role: ShipmentProvenanceSignerRole) -> ShipmentProvenanceSigner? {
        guard let signer = signersByID[id], signer.roles.contains(role) else {
            return nil
        }
        return signer
    }
}

/// A signed origin record for a component/lot. It binds the component identity,
/// lot, and supplied artifact digest before custody events are considered.
public struct ShipmentComponentManifest: Codable, Equatable, Sendable {
    public static let schema = "HOS-SHIPMENT-MANIFEST-1"

    public let componentID: String
    public let lotID: String
    /// A SHA-256 digest supplied by the originating evidence process. The app
    /// verifies its syntax and signature binding, not the physical artifact.
    public let componentDigest: String
    public let originSignerID: String
    public let issuedAtMilliseconds: Int64
    public let expiresAtMilliseconds: Int64
    public let signature: Data

    public init(
        componentID: String,
        lotID: String,
        componentDigest: String,
        originSignerID: String,
        issuedAtMilliseconds: Int64,
        expiresAtMilliseconds: Int64,
        signature: Data
    ) throws {
        try ShipmentProvenanceCanonical.validateIdentifier(componentID)
        try ShipmentProvenanceCanonical.validateIdentifier(lotID)
        try ShipmentProvenanceCanonical.validateDigest(componentDigest)
        try ShipmentProvenanceCanonical.validateIdentifier(originSignerID)
        guard expiresAtMilliseconds > issuedAtMilliseconds,
              signature.count == 64 else {
            throw ShipmentProvenanceError.invalidManifest
        }
        self.componentID = componentID
        self.lotID = lotID
        self.componentDigest = componentDigest
        self.originSignerID = originSignerID
        self.issuedAtMilliseconds = issuedAtMilliseconds
        self.expiresAtMilliseconds = expiresAtMilliseconds
        self.signature = signature
    }

    public func signingPayload() -> Data {
        ShipmentProvenanceCanonical.payload(
            domain: Self.schema,
            fields: [
                componentID,
                lotID,
                componentDigest,
                originSignerID,
                String(issuedAtMilliseconds),
                String(expiresAtMilliseconds)
            ]
        )
    }

    private enum CodingKeys: String, CodingKey {
        case componentID, lotID, componentDigest, originSignerID
        case issuedAtMilliseconds, expiresAtMilliseconds, signature
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let componentID = try container.decode(String.self, forKey: .componentID)
        let lotID = try container.decode(String.self, forKey: .lotID)
        let componentDigest = try container.decode(String.self, forKey: .componentDigest)
        let originSignerID = try container.decode(String.self, forKey: .originSignerID)
        let issuedAtMilliseconds = try container.decode(Int64.self, forKey: .issuedAtMilliseconds)
        let expiresAtMilliseconds = try container.decode(Int64.self, forKey: .expiresAtMilliseconds)
        let signature = try container.decode(Data.self, forKey: .signature)
        try self.init(
            componentID: componentID,
            lotID: lotID,
            componentDigest: componentDigest,
            originSignerID: originSignerID,
            issuedAtMilliseconds: issuedAtMilliseconds,
            expiresAtMilliseconds: expiresAtMilliseconds,
            signature: signature
        )
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(componentID, forKey: .componentID)
        try container.encode(lotID, forKey: .lotID)
        try container.encode(componentDigest, forKey: .componentDigest)
        try container.encode(originSignerID, forKey: .originSignerID)
        try container.encode(issuedAtMilliseconds, forKey: .issuedAtMilliseconds)
        try container.encode(expiresAtMilliseconds, forKey: .expiresAtMilliseconds)
        try container.encode(signature, forKey: .signature)
    }

    public func replacingSignature(_ signature: Data) throws -> ShipmentComponentManifest {
        try ShipmentComponentManifest(
            componentID: componentID,
            lotID: lotID,
            componentDigest: componentDigest,
            originSignerID: originSignerID,
            issuedAtMilliseconds: issuedAtMilliseconds,
            expiresAtMilliseconds: expiresAtMilliseconds,
            signature: signature
        )
    }
}

/// A signed, finite sequence of expected custody checkpoints. It is a policy
/// binding, not GPS tracking, a routing instruction, or proof that a physical
/// route actually occurred.
public struct ShipmentRouteAuthorization: Codable, Equatable, Sendable {
    public static let schema = "HOS-SHIPMENT-ROUTE-1"

    public let componentID: String
    public let componentDigest: String
    public let routeID: String
    public let checkpointIDs: [String]
    public let routeAuthoritySignerID: String
    public let issuedAtMilliseconds: Int64
    public let expiresAtMilliseconds: Int64
    public let signature: Data

    public init(
        componentID: String,
        componentDigest: String,
        routeID: String,
        checkpointIDs: [String],
        routeAuthoritySignerID: String,
        issuedAtMilliseconds: Int64,
        expiresAtMilliseconds: Int64,
        signature: Data
    ) throws {
        try ShipmentProvenanceCanonical.validateIdentifier(componentID)
        try ShipmentProvenanceCanonical.validateDigest(componentDigest)
        try ShipmentProvenanceCanonical.validateIdentifier(routeID)
        try ShipmentProvenanceCanonical.validateIdentifier(routeAuthoritySignerID)
        guard (1...64).contains(checkpointIDs.count),
              expiresAtMilliseconds > issuedAtMilliseconds,
              signature.count == 64 else {
            throw ShipmentProvenanceError.invalidRouteAuthorization
        }
        for checkpointID in checkpointIDs {
            try ShipmentProvenanceCanonical.validateIdentifier(checkpointID)
        }
        self.componentID = componentID
        self.componentDigest = componentDigest
        self.routeID = routeID
        self.checkpointIDs = checkpointIDs
        self.routeAuthoritySignerID = routeAuthoritySignerID
        self.issuedAtMilliseconds = issuedAtMilliseconds
        self.expiresAtMilliseconds = expiresAtMilliseconds
        self.signature = signature
    }

    public func signingPayload() -> Data {
        ShipmentProvenanceCanonical.payload(
            domain: Self.schema,
            fields: [
                componentID,
                componentDigest,
                routeID,
                routeAuthoritySignerID,
                String(issuedAtMilliseconds),
                String(expiresAtMilliseconds),
                String(checkpointIDs.count)
            ] + checkpointIDs
        )
    }

    private enum CodingKeys: String, CodingKey {
        case componentID, componentDigest, routeID, checkpointIDs
        case routeAuthoritySignerID, issuedAtMilliseconds, expiresAtMilliseconds, signature
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let componentID = try container.decode(String.self, forKey: .componentID)
        let componentDigest = try container.decode(String.self, forKey: .componentDigest)
        let routeID = try container.decode(String.self, forKey: .routeID)
        let checkpointIDs = try container.decode([String].self, forKey: .checkpointIDs)
        let routeAuthoritySignerID = try container.decode(String.self, forKey: .routeAuthoritySignerID)
        let issuedAtMilliseconds = try container.decode(Int64.self, forKey: .issuedAtMilliseconds)
        let expiresAtMilliseconds = try container.decode(Int64.self, forKey: .expiresAtMilliseconds)
        let signature = try container.decode(Data.self, forKey: .signature)
        try self.init(
            componentID: componentID,
            componentDigest: componentDigest,
            routeID: routeID,
            checkpointIDs: checkpointIDs,
            routeAuthoritySignerID: routeAuthoritySignerID,
            issuedAtMilliseconds: issuedAtMilliseconds,
            expiresAtMilliseconds: expiresAtMilliseconds,
            signature: signature
        )
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(componentID, forKey: .componentID)
        try container.encode(componentDigest, forKey: .componentDigest)
        try container.encode(routeID, forKey: .routeID)
        try container.encode(checkpointIDs, forKey: .checkpointIDs)
        try container.encode(routeAuthoritySignerID, forKey: .routeAuthoritySignerID)
        try container.encode(issuedAtMilliseconds, forKey: .issuedAtMilliseconds)
        try container.encode(expiresAtMilliseconds, forKey: .expiresAtMilliseconds)
        try container.encode(signature, forKey: .signature)
    }

    public func replacingSignature(_ signature: Data) throws -> ShipmentRouteAuthorization {
        try ShipmentRouteAuthorization(
            componentID: componentID,
            componentDigest: componentDigest,
            routeID: routeID,
            checkpointIDs: checkpointIDs,
            routeAuthoritySignerID: routeAuthoritySignerID,
            issuedAtMilliseconds: issuedAtMilliseconds,
            expiresAtMilliseconds: expiresAtMilliseconds,
            signature: signature
        )
    }
}

/// A dual-signed custody handoff. Both sender and receiver signatures are
/// required; a network/router observation alone cannot substitute for either.
public struct ShipmentCustodyReceipt: Codable, Equatable, Sendable {
    public static let schema = "HOS-SHIPMENT-CUSTODY-1"
    public static let genesisPreviousDigest = "GENESIS"

    public let componentID: String
    public let componentDigest: String
    public let routeID: String
    public let sequence: Int
    public let checkpointID: String
    public let previousReceiptDigest: String
    /// Digest of a separately retained handoff/inspection evidence artifact.
    /// It binds the receipt to evidence without embedding sensitive content.
    public let handoffEvidenceDigest: String
    public let transferredAtMilliseconds: Int64
    public let senderSignerID: String
    public let receiverSignerID: String
    public let senderSignature: Data
    public let receiverSignature: Data

    public init(
        componentID: String,
        componentDigest: String,
        routeID: String,
        sequence: Int,
        checkpointID: String,
        previousReceiptDigest: String,
        handoffEvidenceDigest: String,
        transferredAtMilliseconds: Int64,
        senderSignerID: String,
        receiverSignerID: String,
        senderSignature: Data,
        receiverSignature: Data
    ) throws {
        try ShipmentProvenanceCanonical.validateIdentifier(componentID)
        try ShipmentProvenanceCanonical.validateDigest(componentDigest)
        try ShipmentProvenanceCanonical.validateIdentifier(routeID)
        try ShipmentProvenanceCanonical.validateIdentifier(checkpointID)
        try ShipmentProvenanceCanonical.validatePreviousReceiptDigest(previousReceiptDigest)
        try ShipmentProvenanceCanonical.validateDigest(handoffEvidenceDigest)
        try ShipmentProvenanceCanonical.validateIdentifier(senderSignerID)
        try ShipmentProvenanceCanonical.validateIdentifier(receiverSignerID)
        guard sequence >= 0,
              senderSignerID != receiverSignerID,
              senderSignature.count == 64,
              receiverSignature.count == 64 else {
            throw ShipmentProvenanceError.invalidCustodyReceipt
        }
        self.componentID = componentID
        self.componentDigest = componentDigest
        self.routeID = routeID
        self.sequence = sequence
        self.checkpointID = checkpointID
        self.previousReceiptDigest = previousReceiptDigest
        self.handoffEvidenceDigest = handoffEvidenceDigest
        self.transferredAtMilliseconds = transferredAtMilliseconds
        self.senderSignerID = senderSignerID
        self.receiverSignerID = receiverSignerID
        self.senderSignature = senderSignature
        self.receiverSignature = receiverSignature
    }

    public func signingPayload() -> Data {
        ShipmentProvenanceCanonical.payload(
            domain: Self.schema,
            fields: [
                componentID,
                componentDigest,
                routeID,
                String(sequence),
                checkpointID,
                previousReceiptDigest,
                handoffEvidenceDigest,
                String(transferredAtMilliseconds),
                senderSignerID,
                receiverSignerID
            ]
        )
    }

    /// The digest chained into the following receipt commits to both signatures
    /// as well as the signed handoff fields.
    public func receiptDigest() -> String {
        var payload = signingPayload()
        payload.append(senderSignature)
        payload.append(receiverSignature)
        return ShipmentProvenanceCanonical.sha256Hex(payload)
    }

    private enum CodingKeys: String, CodingKey {
        case componentID, componentDigest, routeID, sequence, checkpointID
        case previousReceiptDigest, handoffEvidenceDigest, transferredAtMilliseconds
        case senderSignerID, receiverSignerID, senderSignature, receiverSignature
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let componentID = try container.decode(String.self, forKey: .componentID)
        let componentDigest = try container.decode(String.self, forKey: .componentDigest)
        let routeID = try container.decode(String.self, forKey: .routeID)
        let sequence = try container.decode(Int.self, forKey: .sequence)
        let checkpointID = try container.decode(String.self, forKey: .checkpointID)
        let previousReceiptDigest = try container.decode(String.self, forKey: .previousReceiptDigest)
        let handoffEvidenceDigest = try container.decode(String.self, forKey: .handoffEvidenceDigest)
        let transferredAtMilliseconds = try container.decode(Int64.self, forKey: .transferredAtMilliseconds)
        let senderSignerID = try container.decode(String.self, forKey: .senderSignerID)
        let receiverSignerID = try container.decode(String.self, forKey: .receiverSignerID)
        let senderSignature = try container.decode(Data.self, forKey: .senderSignature)
        let receiverSignature = try container.decode(Data.self, forKey: .receiverSignature)
        try self.init(
            componentID: componentID,
            componentDigest: componentDigest,
            routeID: routeID,
            sequence: sequence,
            checkpointID: checkpointID,
            previousReceiptDigest: previousReceiptDigest,
            handoffEvidenceDigest: handoffEvidenceDigest,
            transferredAtMilliseconds: transferredAtMilliseconds,
            senderSignerID: senderSignerID,
            receiverSignerID: receiverSignerID,
            senderSignature: senderSignature,
            receiverSignature: receiverSignature
        )
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(componentID, forKey: .componentID)
        try container.encode(componentDigest, forKey: .componentDigest)
        try container.encode(routeID, forKey: .routeID)
        try container.encode(sequence, forKey: .sequence)
        try container.encode(checkpointID, forKey: .checkpointID)
        try container.encode(previousReceiptDigest, forKey: .previousReceiptDigest)
        try container.encode(handoffEvidenceDigest, forKey: .handoffEvidenceDigest)
        try container.encode(transferredAtMilliseconds, forKey: .transferredAtMilliseconds)
        try container.encode(senderSignerID, forKey: .senderSignerID)
        try container.encode(receiverSignerID, forKey: .receiverSignerID)
        try container.encode(senderSignature, forKey: .senderSignature)
        try container.encode(receiverSignature, forKey: .receiverSignature)
    }

    public func replacingSignatures(
        senderSignature: Data,
        receiverSignature: Data
    ) throws -> ShipmentCustodyReceipt {
        try ShipmentCustodyReceipt(
            componentID: componentID,
            componentDigest: componentDigest,
            routeID: routeID,
            sequence: sequence,
            checkpointID: checkpointID,
            previousReceiptDigest: previousReceiptDigest,
            handoffEvidenceDigest: handoffEvidenceDigest,
            transferredAtMilliseconds: transferredAtMilliseconds,
            senderSignerID: senderSignerID,
            receiverSignerID: receiverSignerID,
            senderSignature: senderSignature,
            receiverSignature: receiverSignature
        )
    }
}

/// A signed, time-bounded revocation snapshot. A current snapshot is required
/// even when all revoked lists are empty, so a verifier never silently treats
/// missing revocation information as clearance.
public struct ShipmentProvenanceRevocationSnapshot: Codable, Equatable, Sendable {
    public static let schema = "HOS-SHIPMENT-REVOCATION-1"

    public let snapshotID: String
    public let revocationAuthoritySignerID: String
    public let issuedAtMilliseconds: Int64
    public let expiresAtMilliseconds: Int64
    public let revokedSignerIDs: [String]
    public let revokedComponentIDs: [String]
    public let revokedComponentDigests: [String]
    public let revokedRouteIDs: [String]
    public let signature: Data

    public init(
        snapshotID: String,
        revocationAuthoritySignerID: String,
        issuedAtMilliseconds: Int64,
        expiresAtMilliseconds: Int64,
        revokedSignerIDs: [String],
        revokedComponentIDs: [String],
        revokedComponentDigests: [String],
        revokedRouteIDs: [String],
        signature: Data
    ) throws {
        try ShipmentProvenanceCanonical.validateIdentifier(snapshotID)
        try ShipmentProvenanceCanonical.validateIdentifier(revocationAuthoritySignerID)
        guard expiresAtMilliseconds > issuedAtMilliseconds,
              signature.count == 64 else {
            throw ShipmentProvenanceError.invalidRevocationSnapshot
        }
        self.snapshotID = snapshotID
        self.revocationAuthoritySignerID = revocationAuthoritySignerID
        self.issuedAtMilliseconds = issuedAtMilliseconds
        self.expiresAtMilliseconds = expiresAtMilliseconds
        self.revokedSignerIDs = try ShipmentProvenanceCanonical.canonicalIdentifiers(revokedSignerIDs)
        self.revokedComponentIDs = try ShipmentProvenanceCanonical.canonicalIdentifiers(revokedComponentIDs)
        self.revokedComponentDigests = try ShipmentProvenanceCanonical.canonicalDigests(revokedComponentDigests)
        self.revokedRouteIDs = try ShipmentProvenanceCanonical.canonicalIdentifiers(revokedRouteIDs)
        self.signature = signature
    }

    public func signingPayload() -> Data {
        ShipmentProvenanceCanonical.payload(
            domain: Self.schema,
            fields: [
                snapshotID,
                revocationAuthoritySignerID,
                String(issuedAtMilliseconds),
                String(expiresAtMilliseconds),
                String(revokedSignerIDs.count)
            ] + revokedSignerIDs + [
                String(revokedComponentIDs.count)
            ] + revokedComponentIDs + [
                String(revokedComponentDigests.count)
            ] + revokedComponentDigests + [
                String(revokedRouteIDs.count)
            ] + revokedRouteIDs
        )
    }

    public func revokes(signerID: String) -> Bool {
        revokedSignerIDs.contains(signerID)
    }

    public func revokes(componentID: String, componentDigest: String, routeID: String) -> Bool {
        revokedComponentIDs.contains(componentID) ||
            revokedComponentDigests.contains(componentDigest) ||
            revokedRouteIDs.contains(routeID)
    }

    private enum CodingKeys: String, CodingKey {
        case snapshotID, revocationAuthoritySignerID, issuedAtMilliseconds, expiresAtMilliseconds
        case revokedSignerIDs, revokedComponentIDs, revokedComponentDigests, revokedRouteIDs, signature
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let snapshotID = try container.decode(String.self, forKey: .snapshotID)
        let revocationAuthoritySignerID = try container.decode(String.self, forKey: .revocationAuthoritySignerID)
        let issuedAtMilliseconds = try container.decode(Int64.self, forKey: .issuedAtMilliseconds)
        let expiresAtMilliseconds = try container.decode(Int64.self, forKey: .expiresAtMilliseconds)
        let revokedSignerIDs = try container.decode([String].self, forKey: .revokedSignerIDs)
        let revokedComponentIDs = try container.decode([String].self, forKey: .revokedComponentIDs)
        let revokedComponentDigests = try container.decode([String].self, forKey: .revokedComponentDigests)
        let revokedRouteIDs = try container.decode([String].self, forKey: .revokedRouteIDs)
        let signature = try container.decode(Data.self, forKey: .signature)
        try self.init(
            snapshotID: snapshotID,
            revocationAuthoritySignerID: revocationAuthoritySignerID,
            issuedAtMilliseconds: issuedAtMilliseconds,
            expiresAtMilliseconds: expiresAtMilliseconds,
            revokedSignerIDs: revokedSignerIDs,
            revokedComponentIDs: revokedComponentIDs,
            revokedComponentDigests: revokedComponentDigests,
            revokedRouteIDs: revokedRouteIDs,
            signature: signature
        )
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(snapshotID, forKey: .snapshotID)
        try container.encode(revocationAuthoritySignerID, forKey: .revocationAuthoritySignerID)
        try container.encode(issuedAtMilliseconds, forKey: .issuedAtMilliseconds)
        try container.encode(expiresAtMilliseconds, forKey: .expiresAtMilliseconds)
        try container.encode(revokedSignerIDs, forKey: .revokedSignerIDs)
        try container.encode(revokedComponentIDs, forKey: .revokedComponentIDs)
        try container.encode(revokedComponentDigests, forKey: .revokedComponentDigests)
        try container.encode(revokedRouteIDs, forKey: .revokedRouteIDs)
        try container.encode(signature, forKey: .signature)
    }

    public func replacingSignature(_ signature: Data) throws -> ShipmentProvenanceRevocationSnapshot {
        try ShipmentProvenanceRevocationSnapshot(
            snapshotID: snapshotID,
            revocationAuthoritySignerID: revocationAuthoritySignerID,
            issuedAtMilliseconds: issuedAtMilliseconds,
            expiresAtMilliseconds: expiresAtMilliseconds,
            revokedSignerIDs: revokedSignerIDs,
            revokedComponentIDs: revokedComponentIDs,
            revokedComponentDigests: revokedComponentDigests,
            revokedRouteIDs: revokedRouteIDs,
            signature: signature
        )
    }
}

/// The only accepted review scope in this baseline. It records that an
/// accountable reviewer signed the completed evidence chain; it does not make
/// the reviewer or app able to authorize real-world release or deployment.
public enum ShipmentProvenanceReviewScope: String, Codable, Sendable, Hashable {
    case continuityReview = "CONTINUITY_REVIEW"
}

/// A signed, bounded review record tied to the exact final dual-signed custody
/// receipt. Its reviewer key must be separately enrolled and cannot be any
/// origin, route-authority, or custody key used by the reviewed chain.
public struct ShipmentAccountableReview: Codable, Equatable, Sendable {
    public static let schema = "HOS-SHIPMENT-ACCOUNTABLE-REVIEW-1"

    public let reviewID: String
    public let reviewerReferenceID: String
    public let reviewScope: ShipmentProvenanceReviewScope
    /// Digest of separately retained review evidence; it keeps any sensitive
    /// review material outside the transportable continuity record.
    public let reviewEvidenceDigest: String
    public let componentID: String
    public let componentDigest: String
    public let routeID: String
    public let reviewedReceiptDigest: String
    public let reviewerSignerID: String
    public let reviewedAtMilliseconds: Int64
    public let expiresAtMilliseconds: Int64
    public let signature: Data

    public init(
        reviewID: String,
        reviewerReferenceID: String,
        reviewScope: ShipmentProvenanceReviewScope,
        reviewEvidenceDigest: String,
        componentID: String,
        componentDigest: String,
        routeID: String,
        reviewedReceiptDigest: String,
        reviewerSignerID: String,
        reviewedAtMilliseconds: Int64,
        expiresAtMilliseconds: Int64,
        signature: Data
    ) throws {
        try ShipmentProvenanceCanonical.validateIdentifier(reviewID)
        try ShipmentProvenanceCanonical.validateIdentifier(reviewerReferenceID)
        try ShipmentProvenanceCanonical.validateDigest(reviewEvidenceDigest)
        try ShipmentProvenanceCanonical.validateIdentifier(componentID)
        try ShipmentProvenanceCanonical.validateDigest(componentDigest)
        try ShipmentProvenanceCanonical.validateIdentifier(routeID)
        try ShipmentProvenanceCanonical.validateDigest(reviewedReceiptDigest)
        try ShipmentProvenanceCanonical.validateIdentifier(reviewerSignerID)
        guard expiresAtMilliseconds > reviewedAtMilliseconds,
              signature.count == 64 else {
            throw ShipmentProvenanceError.invalidAccountableReview
        }
        self.reviewID = reviewID
        self.reviewerReferenceID = reviewerReferenceID
        self.reviewScope = reviewScope
        self.reviewEvidenceDigest = reviewEvidenceDigest
        self.componentID = componentID
        self.componentDigest = componentDigest
        self.routeID = routeID
        self.reviewedReceiptDigest = reviewedReceiptDigest
        self.reviewerSignerID = reviewerSignerID
        self.reviewedAtMilliseconds = reviewedAtMilliseconds
        self.expiresAtMilliseconds = expiresAtMilliseconds
        self.signature = signature
    }

    public func signingPayload() -> Data {
        ShipmentProvenanceCanonical.payload(
            domain: Self.schema,
            fields: [
                reviewID,
                reviewerReferenceID,
                reviewScope.rawValue,
                reviewEvidenceDigest,
                componentID,
                componentDigest,
                routeID,
                reviewedReceiptDigest,
                reviewerSignerID,
                String(reviewedAtMilliseconds),
                String(expiresAtMilliseconds)
            ]
        )
    }

    private enum CodingKeys: String, CodingKey {
        case reviewID, reviewerReferenceID, reviewScope, reviewEvidenceDigest, componentID, componentDigest
        case routeID, reviewedReceiptDigest, reviewerSignerID, reviewedAtMilliseconds
        case expiresAtMilliseconds, signature
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let reviewID = try container.decode(String.self, forKey: .reviewID)
        let reviewerReferenceID = try container.decode(String.self, forKey: .reviewerReferenceID)
        let reviewScope = try container.decode(ShipmentProvenanceReviewScope.self, forKey: .reviewScope)
        let reviewEvidenceDigest = try container.decode(String.self, forKey: .reviewEvidenceDigest)
        let componentID = try container.decode(String.self, forKey: .componentID)
        let componentDigest = try container.decode(String.self, forKey: .componentDigest)
        let routeID = try container.decode(String.self, forKey: .routeID)
        let reviewedReceiptDigest = try container.decode(String.self, forKey: .reviewedReceiptDigest)
        let reviewerSignerID = try container.decode(String.self, forKey: .reviewerSignerID)
        let reviewedAtMilliseconds = try container.decode(Int64.self, forKey: .reviewedAtMilliseconds)
        let expiresAtMilliseconds = try container.decode(Int64.self, forKey: .expiresAtMilliseconds)
        let signature = try container.decode(Data.self, forKey: .signature)
        try self.init(
            reviewID: reviewID,
            reviewerReferenceID: reviewerReferenceID,
            reviewScope: reviewScope,
            reviewEvidenceDigest: reviewEvidenceDigest,
            componentID: componentID,
            componentDigest: componentDigest,
            routeID: routeID,
            reviewedReceiptDigest: reviewedReceiptDigest,
            reviewerSignerID: reviewerSignerID,
            reviewedAtMilliseconds: reviewedAtMilliseconds,
            expiresAtMilliseconds: expiresAtMilliseconds,
            signature: signature
        )
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(reviewID, forKey: .reviewID)
        try container.encode(reviewerReferenceID, forKey: .reviewerReferenceID)
        try container.encode(reviewScope, forKey: .reviewScope)
        try container.encode(reviewEvidenceDigest, forKey: .reviewEvidenceDigest)
        try container.encode(componentID, forKey: .componentID)
        try container.encode(componentDigest, forKey: .componentDigest)
        try container.encode(routeID, forKey: .routeID)
        try container.encode(reviewedReceiptDigest, forKey: .reviewedReceiptDigest)
        try container.encode(reviewerSignerID, forKey: .reviewerSignerID)
        try container.encode(reviewedAtMilliseconds, forKey: .reviewedAtMilliseconds)
        try container.encode(expiresAtMilliseconds, forKey: .expiresAtMilliseconds)
        try container.encode(signature, forKey: .signature)
    }

    public func replacingSignature(_ signature: Data) throws -> ShipmentAccountableReview {
        try ShipmentAccountableReview(
            reviewID: reviewID,
            reviewerReferenceID: reviewerReferenceID,
            reviewScope: reviewScope,
            reviewEvidenceDigest: reviewEvidenceDigest,
            componentID: componentID,
            componentDigest: componentDigest,
            routeID: routeID,
            reviewedReceiptDigest: reviewedReceiptDigest,
            reviewerSignerID: reviewerSignerID,
            reviewedAtMilliseconds: reviewedAtMilliseconds,
            expiresAtMilliseconds: expiresAtMilliseconds,
            signature: signature
        )
    }
}

public struct ShipmentProvenanceBundle: Equatable, Sendable {
    public let manifest: ShipmentComponentManifest
    public let routeAuthorization: ShipmentRouteAuthorization
    public let revocationSnapshot: ShipmentProvenanceRevocationSnapshot
    public let custodyReceipts: [ShipmentCustodyReceipt]
    public let accountableReview: ShipmentAccountableReview

    public init(
        manifest: ShipmentComponentManifest,
        routeAuthorization: ShipmentRouteAuthorization,
        revocationSnapshot: ShipmentProvenanceRevocationSnapshot,
        custodyReceipts: [ShipmentCustodyReceipt],
        accountableReview: ShipmentAccountableReview
    ) {
        self.manifest = manifest
        self.routeAuthorization = routeAuthorization
        self.revocationSnapshot = revocationSnapshot
        self.custodyReceipts = custodyReceipts
        self.accountableReview = accountableReview
    }
}

/// A successful result means the supplied records cryptographically bind a
/// complete expected custody sequence to enrolled keys. It is never a release,
/// deployment, safety, export, legal, or operational permission.
public enum ShipmentProvenanceDecision: String, Codable, Sendable, Hashable {
    case verifiedContinuity = "VERIFIED_CONTINUITY_NOT_RELEASE_AUTHORITY"
    case holdForAuthorizedReview = "HOLD_FOR_AUTHORIZED_REVIEW"
}

public enum ShipmentProvenanceCode: String, Codable, Sendable, Hashable {
    case verifiedContinuity = "CONTINUITY-VERIFIED"
    case evidenceNotYetActive = "EVIDENCE-NOT-YET-ACTIVE"
    case manifestExpired = "MANIFEST-EXPIRED"
    case routeAuthorizationExpired = "ROUTE-AUTHORIZATION-EXPIRED"
    case revocationSnapshotExpired = "REVOCATION-SNAPSHOT-EXPIRED"
    case revocationSignerUntrusted = "REVOCATION-SIGNER-UNTRUSTED"
    case revocationSignatureInvalid = "REVOCATION-SIGNATURE-INVALID"
    case evidenceRevoked = "EVIDENCE-REVOKED"
    case originSignerUntrusted = "ORIGIN-SIGNER-UNTRUSTED"
    case originSignatureInvalid = "ORIGIN-SIGNATURE-INVALID"
    case routeSignerUntrusted = "ROUTE-SIGNER-UNTRUSTED"
    case routeSignatureInvalid = "ROUTE-SIGNATURE-INVALID"
    case routeDoesNotBindManifest = "ROUTE-DOES-NOT-BIND-MANIFEST"
    case custodySequenceIncomplete = "CUSTODY-SEQUENCE-INCOMPLETE"
    case custodyReceiptMismatch = "CUSTODY-RECEIPT-MISMATCH"
    case custodySignerUntrusted = "CUSTODY-SIGNER-UNTRUSTED"
    case custodySignatureInvalid = "CUSTODY-SIGNATURE-INVALID"
    case accountableReviewExpired = "ACCOUNTABLE-REVIEW-EXPIRED"
    case reviewerUntrusted = "REVIEWER-UNTRUSTED"
    case reviewSignatureInvalid = "REVIEW-SIGNATURE-INVALID"
    case reviewDoesNotBindContinuity = "REVIEW-DOES-NOT-BIND-CONTINUITY"
    case roleSeparationOfDutiesFailed = "ROLE-SEPARATION-OF-DUTIES-FAILED"
    case reviewSeparationOfDutiesFailed = "REVIEW-SEPARATION-OF-DUTIES-FAILED"
}

public struct ShipmentProvenanceAssessment: Equatable, Sendable {
    public let decision: ShipmentProvenanceDecision
    public let code: ShipmentProvenanceCode
    public let reason: String
    public let verifiedReceiptCount: Int
    public let limitation: String

    public var hasVerifiedContinuity: Bool {
        decision == .verifiedContinuity
    }
}

/// Fail-closed verifier for a pre-registered component, a pre-signed finite
/// route authorization, and dual-signed custody records. It intentionally has
/// no facility to "adopt" an unexpected part after the fact.
public enum ShipmentProvenanceBaseline {
    public static let version = "HOS-SHIPMENT-PROVENANCE-1"
    public static let limitation = "This baseline verifies only supplied signatures, enrolled public-key roles, record bindings, a signed revocation snapshot, accountable-review evidence, and a local clock comparison. It cannot independently inspect a physical component, establish a real-world route, prove possession, establish signer identity, trust an unmanaged router, detect key compromise, supply trusted time, or authorize deployment."

    public static func evaluate(
        _ bundle: ShipmentProvenanceBundle,
        trustStore: ShipmentProvenanceTrustStore,
        nowMilliseconds: Int64
    ) -> ShipmentProvenanceAssessment {
        func result(
            _ decision: ShipmentProvenanceDecision,
            _ code: ShipmentProvenanceCode,
            _ reason: String,
            count: Int = 0
        ) -> ShipmentProvenanceAssessment {
            ShipmentProvenanceAssessment(
                decision: decision,
                code: code,
                reason: reason,
                verifiedReceiptCount: count,
                limitation: limitation
            )
        }

        let manifest = bundle.manifest
        let route = bundle.routeAuthorization
        let revocation = bundle.revocationSnapshot
        let review = bundle.accountableReview

        guard manifest.issuedAtMilliseconds <= nowMilliseconds,
              route.issuedAtMilliseconds <= nowMilliseconds,
              revocation.issuedAtMilliseconds <= nowMilliseconds,
              review.reviewedAtMilliseconds <= nowMilliseconds else {
            return result(
                .holdForAuthorizedReview,
                .evidenceNotYetActive,
                "At least one signed provenance or review record is dated in the future relative to the supplied local evaluation time."
            )
        }
        guard manifest.expiresAtMilliseconds > nowMilliseconds else {
            return result(
                .holdForAuthorizedReview,
                .manifestExpired,
                "The signed component manifest is expired. An expired origin record cannot be used to describe continuity."
            )
        }
        guard route.expiresAtMilliseconds > nowMilliseconds else {
            return result(
                .holdForAuthorizedReview,
                .routeAuthorizationExpired,
                "The signed route authorization is expired. No continuity decision is available."
            )
        }
        guard revocation.expiresAtMilliseconds > nowMilliseconds else {
            return result(
                .holdForAuthorizedReview,
                .revocationSnapshotExpired,
                "The signed revocation snapshot is expired. Missing current revocation evidence fails closed."
            )
        }

        guard let revocationSigner = trustStore.signer(
            id: revocation.revocationAuthoritySignerID,
            requiring: .revocationAuthority
        ) else {
            return result(
                .holdForAuthorizedReview,
                .revocationSignerUntrusted,
                "The revocation snapshot signer is absent from the enrolled revocation-authority trust set."
            )
        }
        guard !revocation.revokes(signerID: revocation.revocationAuthoritySignerID) else {
            return result(
                .holdForAuthorizedReview,
                .evidenceRevoked,
                "The revocation snapshot names its own signing authority as revoked and cannot be used as current revocation evidence."
            )
        }
        guard verifies(revocation.signature, payload: revocation.signingPayload(), signer: revocationSigner) else {
            return result(
                .holdForAuthorizedReview,
                .revocationSignatureInvalid,
                "The revocation-authority signature does not verify the supplied revocation snapshot."
            )
        }
        guard !revocation.revokes(
            componentID: manifest.componentID,
            componentDigest: manifest.componentDigest,
            routeID: route.routeID
        ) else {
            return result(
                .holdForAuthorizedReview,
                .evidenceRevoked,
                "The current signed revocation snapshot revokes this component, digest, or route."
            )
        }

        guard manifest.originSignerID != route.routeAuthoritySignerID,
              revocation.revocationAuthoritySignerID != manifest.originSignerID,
              revocation.revocationAuthoritySignerID != route.routeAuthoritySignerID else {
            return result(
                .holdForAuthorizedReview,
                .roleSeparationOfDutiesFailed,
                "Origin, route-authorization, and revocation evidence must be signed by separately enrolled keys."
            )
        }
        guard !revocation.revokes(signerID: manifest.originSignerID) else {
            return result(
                .holdForAuthorizedReview,
                .evidenceRevoked,
                "The current signed revocation snapshot revokes the origin signing key."
            )
        }
        guard let originSigner = trustStore.signer(id: manifest.originSignerID, requiring: .origin) else {
            return result(
                .holdForAuthorizedReview,
                .originSignerUntrusted,
                "The manifest names an origin signer that is absent from the enrolled origin trust set."
            )
        }
        guard verifies(manifest.signature, payload: manifest.signingPayload(), signer: originSigner) else {
            return result(
                .holdForAuthorizedReview,
                .originSignatureInvalid,
                "The origin signature does not verify the supplied component manifest."
            )
        }

        guard route.componentID == manifest.componentID,
              route.componentDigest == manifest.componentDigest else {
            return result(
                .holdForAuthorizedReview,
                .routeDoesNotBindManifest,
                "The route authorization is not bound to the signed component identity and digest."
            )
        }
        guard !revocation.revokes(signerID: route.routeAuthoritySignerID) else {
            return result(
                .holdForAuthorizedReview,
                .evidenceRevoked,
                "The current signed revocation snapshot revokes the route-authority signing key."
            )
        }
        guard let routeSigner = trustStore.signer(
            id: route.routeAuthoritySignerID,
            requiring: .routeAuthority
        ) else {
            return result(
                .holdForAuthorizedReview,
                .routeSignerUntrusted,
                "The route authority signer is absent from the enrolled route-authority trust set."
            )
        }
        guard verifies(route.signature, payload: route.signingPayload(), signer: routeSigner) else {
            return result(
                .holdForAuthorizedReview,
                .routeSignatureInvalid,
                "The route-authority signature does not verify the supplied route authorization."
            )
        }

        guard bundle.custodyReceipts.count == route.checkpointIDs.count else {
            return result(
                .holdForAuthorizedReview,
                .custodySequenceIncomplete,
                "The custody sequence is incomplete or contains an unexpected number of handoffs."
            )
        }

        var expectedPreviousDigest = ShipmentCustodyReceipt.genesisPreviousDigest
        var priorTransferAtMilliseconds: Int64?
        var operationalSignerIDs: Set<String> = [
            manifest.originSignerID,
            route.routeAuthoritySignerID
        ]
        for (index, receipt) in bundle.custodyReceipts.enumerated() {
            let transferIsChronological = priorTransferAtMilliseconds.map {
                receipt.transferredAtMilliseconds >= $0
            } ?? true
            guard receipt.componentID == manifest.componentID,
                  receipt.componentDigest == manifest.componentDigest,
                  receipt.routeID == route.routeID,
                  receipt.sequence == index,
                  receipt.checkpointID == route.checkpointIDs[index],
                  receipt.previousReceiptDigest == expectedPreviousDigest,
                  receipt.transferredAtMilliseconds >= manifest.issuedAtMilliseconds,
                  receipt.transferredAtMilliseconds >= route.issuedAtMilliseconds,
                  receipt.transferredAtMilliseconds <= manifest.expiresAtMilliseconds,
                  receipt.transferredAtMilliseconds <= route.expiresAtMilliseconds,
                  receipt.transferredAtMilliseconds <= nowMilliseconds,
                  transferIsChronological else {
                return result(
                    .holdForAuthorizedReview,
                    .custodyReceiptMismatch,
                    "A custody receipt does not exactly match the pre-signed component, route, checkpoint, sequence, time window, or prior receipt digest.",
                    count: index
                )
            }
            guard receipt.senderSignerID != manifest.originSignerID,
                  receipt.senderSignerID != route.routeAuthoritySignerID,
                  receipt.senderSignerID != revocation.revocationAuthoritySignerID,
                  receipt.receiverSignerID != manifest.originSignerID,
                  receipt.receiverSignerID != route.routeAuthoritySignerID,
                  receipt.receiverSignerID != revocation.revocationAuthoritySignerID else {
                return result(
                    .holdForAuthorizedReview,
                    .roleSeparationOfDutiesFailed,
                    "Origin, route-authority, or revocation-authority signing keys cannot also serve as custody-handoff keys in the same continuity record.",
                    count: index
                )
            }
            guard !revocation.revokes(signerID: receipt.senderSignerID),
                  !revocation.revokes(signerID: receipt.receiverSignerID) else {
                return result(
                    .holdForAuthorizedReview,
                    .evidenceRevoked,
                    "The current signed revocation snapshot revokes a custody-handoff signing key.",
                    count: index
                )
            }
            guard let sender = trustStore.signer(id: receipt.senderSignerID, requiring: .custody),
                  let receiver = trustStore.signer(id: receipt.receiverSignerID, requiring: .custody) else {
                return result(
                    .holdForAuthorizedReview,
                    .custodySignerUntrusted,
                    "A custody handoff signer is absent from the enrolled custody trust set.",
                    count: index
                )
            }
            guard verifies(receipt.senderSignature, payload: receipt.signingPayload(), signer: sender),
                  verifies(receipt.receiverSignature, payload: receipt.signingPayload(), signer: receiver) else {
                return result(
                    .holdForAuthorizedReview,
                    .custodySignatureInvalid,
                    "A required sender or receiver custody signature does not verify the exact handoff record.",
                    count: index
                )
            }
            operationalSignerIDs.insert(receipt.senderSignerID)
            operationalSignerIDs.insert(receipt.receiverSignerID)
            expectedPreviousDigest = receipt.receiptDigest()
            priorTransferAtMilliseconds = receipt.transferredAtMilliseconds
        }

        guard let finalTransferAtMilliseconds = priorTransferAtMilliseconds else {
            return result(
                .holdForAuthorizedReview,
                .custodySequenceIncomplete,
                "A completed route requires at least one verified custody handoff before review."
            )
        }
        guard review.expiresAtMilliseconds > nowMilliseconds else {
            return result(
                .holdForAuthorizedReview,
                .accountableReviewExpired,
                "The signed accountable review is expired. A stale review cannot establish current continuity."
            )
        }
        guard review.reviewScope == .continuityReview,
              review.componentID == manifest.componentID,
              review.componentDigest == manifest.componentDigest,
              review.routeID == route.routeID,
              review.reviewedReceiptDigest == expectedPreviousDigest,
              review.reviewedAtMilliseconds >= finalTransferAtMilliseconds else {
            return result(
                .holdForAuthorizedReview,
                .reviewDoesNotBindContinuity,
                "The accountable review does not bind the exact completed component, route, and final custody receipt after the final handoff."
            )
        }
        guard !operationalSignerIDs.contains(review.reviewerSignerID),
              review.reviewerSignerID != revocation.revocationAuthoritySignerID else {
            return result(
                .holdForAuthorizedReview,
                .reviewSeparationOfDutiesFailed,
                "The accountable reviewer must use a separately enrolled key that did not originate, authorize revocation or the route, or execute a custody handoff."
            )
        }
        guard !revocation.revokes(signerID: review.reviewerSignerID) else {
            return result(
                .holdForAuthorizedReview,
                .evidenceRevoked,
                "The current signed revocation snapshot revokes the accountable reviewer signing key."
            )
        }
        guard let reviewer = trustStore.signer(
            id: review.reviewerSignerID,
            requiring: .accountableReviewer
        ) else {
            return result(
                .holdForAuthorizedReview,
                .reviewerUntrusted,
                "The accountable reviewer signer is absent from the enrolled reviewer trust set."
            )
        }
        guard verifies(review.signature, payload: review.signingPayload(), signer: reviewer) else {
            return result(
                .holdForAuthorizedReview,
                .reviewSignatureInvalid,
                "The accountable-review signature does not verify the supplied review record."
            )
        }

        return result(
            .verifiedContinuity,
            .verifiedContinuity,
            "The supplied pre-registered manifest, route authorization, current signed revocation snapshot, every expected dual-signed custody receipt, and separated accountable review verify against enrolled keys. This verifies record continuity only; it is not a release or deployment authority.",
            count: bundle.custodyReceipts.count
        )
    }

    private static func verifies(
        _ signature: Data,
        payload: Data,
        signer: ShipmentProvenanceSigner
    ) -> Bool {
        guard let publicKey = try? Curve25519.Signing.PublicKey(rawRepresentation: signer.publicKey) else {
            return false
        }
        return publicKey.isValidSignature(signature, for: payload)
    }
}

public enum ShipmentProvenanceError: Error, Equatable, Sendable, LocalizedError {
    case invalidIdentifier
    case invalidDigest
    case invalidSigner
    case duplicateSigner
    case invalidManifest
    case invalidRouteAuthorization
    case invalidCustodyReceipt
    case invalidRevocationSnapshot
    case invalidAccountableReview

    public var errorDescription: String? {
        switch self {
        case .invalidIdentifier:
            return "Shipment-provenance identifiers must use the bounded canonical identifier format."
        case .invalidDigest:
            return "Shipment-provenance evidence must use a lowercase SHA-256 digest."
        case .invalidSigner:
            return "A shipment-provenance signer key or role declaration is invalid."
        case .duplicateSigner:
            return "A shipment-provenance trust store cannot enroll the same signer identifier or public key twice."
        case .invalidManifest:
            return "The signed component manifest is invalid."
        case .invalidRouteAuthorization:
            return "The signed route authorization is invalid."
        case .invalidCustodyReceipt:
            return "The dual-signed custody receipt is invalid."
        case .invalidRevocationSnapshot:
            return "The signed revocation snapshot is invalid."
        case .invalidAccountableReview:
            return "The signed accountable review record is invalid."
        }
    }
}

private enum ShipmentProvenanceCanonical {
    static func validateIdentifier(_ value: String) throws {
        guard value.range(
            of: "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$",
            options: .regularExpression
        ) != nil else {
            throw ShipmentProvenanceError.invalidIdentifier
        }
    }

    static func validateDigest(_ value: String) throws {
        guard value.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil else {
            throw ShipmentProvenanceError.invalidDigest
        }
    }

    static func validatePreviousReceiptDigest(_ value: String) throws {
        guard value == ShipmentCustodyReceipt.genesisPreviousDigest ||
                value.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil else {
            throw ShipmentProvenanceError.invalidDigest
        }
    }

    static func canonicalIdentifiers(_ values: [String]) throws -> [String] {
        guard values.count <= 512 else {
            throw ShipmentProvenanceError.invalidRevocationSnapshot
        }
        for value in values {
            try validateIdentifier(value)
        }
        let sorted = values.sorted()
        guard Set(sorted).count == sorted.count else {
            throw ShipmentProvenanceError.invalidRevocationSnapshot
        }
        return sorted
    }

    static func canonicalDigests(_ values: [String]) throws -> [String] {
        guard values.count <= 512 else {
            throw ShipmentProvenanceError.invalidRevocationSnapshot
        }
        for value in values {
            try validateDigest(value)
        }
        let sorted = values.sorted()
        guard Set(sorted).count == sorted.count else {
            throw ShipmentProvenanceError.invalidRevocationSnapshot
        }
        return sorted
    }

    static func payload(domain: String, fields: [String]) -> Data {
        let encodedFields = fields.map { field in
            "\(field.utf8.count):\(field)"
        }
        return Data(([domain] + encodedFields).joined(separator: "|").utf8)
    }

    static func sha256Hex(_ data: Data) -> String {
        SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
    }
}
