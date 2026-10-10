import Foundation

/// A non-geographic, opaque reference to a pre-authorized custody checkpoint.
/// The app does not infer that a physical arrival, network observation, or
/// location claim creates a valid checkpoint.
public struct ShipmentCheckpoint: Codable, Equatable, Sendable, Hashable, Identifiable {
    public let reference: String

    public var id: String { reference }

    public init(_ source: String) throws {
        let normalized = source.trimmingCharacters(in: .whitespacesAndNewlines)
        guard (1...128).contains(normalized.utf8.count),
              !normalized.contains("\n"),
              !normalized.contains("\r"),
              !normalized.contains("\0") else {
            throw ShipmentProvenanceError.invalidReference
        }
        reference = normalized
    }
}

/// A declared expected custody route. It is an opaque policy record, not a live
/// location tracker or a claim about a country, carrier, person, or incident.
public struct ShipmentManifest: Codable, Equatable, Sendable {
    public let manifestReference: String
    public let partReference: String
    public let lotReference: String
    public let expectedCheckpoints: [ShipmentCheckpoint]
    public let routePolicyReference: String

    public init(
        manifestReference: String,
        partReference: String,
        lotReference: String,
        expectedCheckpoints: [ShipmentCheckpoint],
        routePolicyReference: String
    ) throws {
        let manifest = try ShipmentCheckpoint(manifestReference).reference
        let part = try ShipmentCheckpoint(partReference).reference
        let lot = try ShipmentCheckpoint(lotReference).reference
        let policy = try ShipmentCheckpoint(routePolicyReference).reference
        guard !expectedCheckpoints.isEmpty,
              expectedCheckpoints.count <= 64,
              Set(expectedCheckpoints).count == expectedCheckpoints.count else {
            throw ShipmentProvenanceError.invalidManifest
        }
        self.manifestReference = manifest
        self.partReference = part
        self.lotReference = lot
        self.expectedCheckpoints = expectedCheckpoints
        self.routePolicyReference = policy
    }
}

/// A custody event supplied by a separately governed evidence source. The
/// policy records whether the evidence is verified; it does not independently
/// validate an issuer signature, carrier system, sensor, or physical item.
public struct ShipmentCustodyRecord: Codable, Equatable, Sendable {
    public let manifestReference: String
    public let partReference: String
    public let lotReference: String
    public let checkpoint: ShipmentCheckpoint
    public let sequence: Int
    public let issuerReference: String
    public let evidence: SupplyChainEvidence

    public init(
        manifestReference: String,
        partReference: String,
        lotReference: String,
        checkpoint: ShipmentCheckpoint,
        sequence: Int,
        issuerReference: String,
        evidence: SupplyChainEvidence
    ) throws {
        guard sequence > 0 else { throw ShipmentProvenanceError.invalidCustodyRecord }
        self.manifestReference = try ShipmentCheckpoint(manifestReference).reference
        self.partReference = try ShipmentCheckpoint(partReference).reference
        self.lotReference = try ShipmentCheckpoint(lotReference).reference
        self.checkpoint = checkpoint
        self.sequence = sequence
        self.issuerReference = try ShipmentCheckpoint(issuerReference).reference
        self.evidence = evidence
    }
}

/// A physical/receiving review is distinct from network or route observations.
/// It must bind the received references to the pre-authorized manifest before a
/// record can become review-ready.
public struct ShipmentReceivingInspection: Codable, Equatable, Sendable {
    public let manifestReference: String
    public let partReference: String
    public let lotReference: String
    public let physicalInspectionEvidence: SupplyChainEvidence
    public let artifactIntegrityEvidence: SupplyChainEvidence
    public let accountabilityEvidence: SupplyChainEvidence
    /// Opaque receiving-review role reference. It is not identity proof and is
    /// compared only to enforce a minimum separation-of-duties check.
    public let accountableOwnerReference: String

    public init(
        manifestReference: String,
        partReference: String,
        lotReference: String,
        physicalInspectionEvidence: SupplyChainEvidence,
        artifactIntegrityEvidence: SupplyChainEvidence,
        accountabilityEvidence: SupplyChainEvidence,
        accountableOwnerReference: String
    ) throws {
        self.manifestReference = try ShipmentCheckpoint(manifestReference).reference
        self.partReference = try ShipmentCheckpoint(partReference).reference
        self.lotReference = try ShipmentCheckpoint(lotReference).reference
        self.physicalInspectionEvidence = physicalInspectionEvidence
        self.artifactIntegrityEvidence = artifactIntegrityEvidence
        self.accountabilityEvidence = accountabilityEvidence
        self.accountableOwnerReference = try ShipmentCheckpoint(accountableOwnerReference).reference
    }
}

/// An external governance record binds the expected manifest and route-policy
/// references to a separately governed evidence set. Its active state is
/// deliberately expiry/revocation-capable, but it never grants release,
/// dispatch, installation, or operational authority.
public struct ShipmentExternalGovernance: Codable, Equatable, Sendable {
    public let manifestReference: String
    public let partReference: String
    public let lotReference: String
    public let routePolicyReference: String
    /// Opaque external-governance role reference. It is not a claim that the
    /// app knows a person's identity, intent, honesty, or authority.
    public let authorityReference: String
    public let governanceRecordReference: String
    public let evidence: SupplyChainEvidence
    public let state: ShipmentGovernanceState
    public let expiresAt: Date

    public init(
        manifestReference: String,
        partReference: String,
        lotReference: String,
        routePolicyReference: String,
        authorityReference: String,
        governanceRecordReference: String,
        evidence: SupplyChainEvidence,
        state: ShipmentGovernanceState,
        expiresAt: Date
    ) throws {
        self.manifestReference = try ShipmentCheckpoint(manifestReference).reference
        self.partReference = try ShipmentCheckpoint(partReference).reference
        self.lotReference = try ShipmentCheckpoint(lotReference).reference
        self.routePolicyReference = try ShipmentCheckpoint(routePolicyReference).reference
        self.authorityReference = try ShipmentCheckpoint(authorityReference).reference
        self.governanceRecordReference = try ShipmentCheckpoint(governanceRecordReference).reference
        self.evidence = evidence
        self.state = state
        self.expiresAt = expiresAt
    }
}

/// `active` says only that the external governance record is presently usable
/// as evidence at the supplied assessment time. It is not a release approval.
public enum ShipmentGovernanceState: String, Codable, Sendable, Hashable {
    case active = "ACTIVE"
    case revoked = "REVOKED"
    case unavailable = "UNAVAILABLE"
}

/// A network-derived route signal is alerting/corroborating evidence only. It
/// is never sufficient to establish custody continuity or authorize release.
public enum ShipmentNetworkObservation: String, Codable, Sendable, Hashable {
    case notObserved = "NOT_OBSERVED"
    case consistent = "CONSISTENT_WITH_POLICY"
    case conflicted = "CONFLICTED_WITH_POLICY"
}

public struct ShipmentAdmissionRequest: Equatable, Sendable {
    public let manifest: ShipmentManifest
    public let custodyRecords: [ShipmentCustodyRecord]
    public let receivingInspection: ShipmentReceivingInspection
    public let governance: ShipmentExternalGovernance
    public let networkObservation: ShipmentNetworkObservation
    /// The explicit assessment instant keeps this pure policy from silently
    /// reading a local device clock. A future adapter must govern the source
    /// and verification of this value.
    public let assessedAt: Date

    public init(
        manifest: ShipmentManifest,
        custodyRecords: [ShipmentCustodyRecord],
        receivingInspection: ShipmentReceivingInspection,
        governance: ShipmentExternalGovernance,
        networkObservation: ShipmentNetworkObservation,
        assessedAt: Date
    ) {
        self.manifest = manifest
        self.custodyRecords = custodyRecords
        self.receivingInspection = receivingInspection
        self.governance = governance
        self.networkObservation = networkObservation
        self.assessedAt = assessedAt
    }
}

public struct ShipmentAdmissionStages: Equatable, Sendable {
    /// The external governance record binds the expected manifest and route
    /// policy references; it does not merely repeat the locally supplied input.
    public let manifestBound: Bool
    public let governanceEvidence: Bool
    public let governanceActive: Bool
    public let governanceNotExpired: Bool
    public let custodyContinuity: Bool
    public let custodyEvidence: Bool
    public let receivingIdentityBound: Bool
    public let physicalInspection: Bool
    public let artifactIntegrity: Bool
    public let accountableReview: Bool
    public let separationOfDuties: Bool
    public let networkNotConflicted: Bool
}

/// `reviewReady` deliberately is not a release, acceptance, shipment, install,
/// or operational authorization. An authorized process outside this model must
/// make any real-world disposition.
public enum ShipmentAdmissionDecision: String, Codable, Sendable, Hashable {
    case hold = "HOLD_FOR_AUTHORIZED_REVIEW"
    case reviewReady = "CONTINUITY_COMPLETE_REQUIRES_AUTHORIZED_RELEASE"
}

public enum ShipmentAdmissionCode: String, Codable, Sendable, Hashable {
    case networkObservationConflicted = "NETWORK-ROUTE-OBSERVATION-CONFLICTED"
    case expectedManifestMismatch = "EXPECTED-MANIFEST-MISMATCH"
    case externalGovernanceUnavailable = "EXTERNAL-GOVERNANCE-UNAVAILABLE"
    case externalGovernanceRevoked = "EXTERNAL-GOVERNANCE-REVOKED"
    case externalGovernanceExpired = "EXTERNAL-GOVERNANCE-EXPIRED"
    case externalGovernanceUnverified = "EXTERNAL-GOVERNANCE-UNVERIFIED"
    case receivingIdentityMismatch = "RECEIVING-IDENTITY-MISMATCH"
    case custodyChainIncomplete = "CUSTODY-CHAIN-INCOMPLETE"
    case routeDeviation = "ROUTE-DEVIATION"
    case custodyEvidenceUnverified = "CUSTODY-EVIDENCE-UNVERIFIED"
    case physicalInspectionUnverified = "PHYSICAL-INSPECTION-UNVERIFIED"
    case artifactIntegrityUnverified = "ARTIFACT-INTEGRITY-UNVERIFIED"
    case accountableReviewUnverified = "ACCOUNTABLE-REVIEW-UNVERIFIED"
    case separationOfDutiesNotMet = "SEPARATION-OF-DUTIES-NOT-MET"
    case reviewReady = "CONTINUITY-COMPLETE-REQUIRES-AUTHORIZED-RELEASE"
}

public struct ShipmentAdmissionAssessment: Equatable, Sendable {
    public let decision: ShipmentAdmissionDecision
    public let code: ShipmentAdmissionCode
    public let reason: String
    public let stages: ShipmentAdmissionStages

    public var requiresAuthorizedReview: Bool { true }
    public var isReviewReady: Bool { decision == .reviewReady }
}

/// Defensive admission baseline for a future shipping adapter. Physical arrival
/// is intentionally absent from the decision inputs: an item is not admitted
/// merely because it arrived, appeared in a routing system, or was observed by
/// a router. Unknown, missing, reordered, conflicted, or self-declared custody
/// evidence fails closed to an authorized-review hold. It also requires distinct
/// opaque governance and receiving-review role references; this is a minimum
/// separation check, never a claim of identity or human trustworthiness.
public enum ShipmentProvenancePolicy {
    public static let version = "HOS-SHIPMENT-PROVENANCE-1"

    public static func evaluate(_ request: ShipmentAdmissionRequest) -> ShipmentAdmissionAssessment {
        let manifest = request.manifest
        let inspection = request.receivingInspection
        let governance = request.governance
        let manifestBound = governance.manifestReference == manifest.manifestReference
            && governance.partReference == manifest.partReference
            && governance.lotReference == manifest.lotReference
            && governance.routePolicyReference == manifest.routePolicyReference
        let governanceEvidence = governance.evidence.isVerified
        let governanceActive = governance.state == .active
        let governanceNotExpired = governance.expiresAt > request.assessedAt
        let receivingIdentityBound = inspection.manifestReference == manifest.manifestReference
            && inspection.partReference == manifest.partReference
            && inspection.lotReference == manifest.lotReference

        let custodyContinuity = request.custodyRecords.count == manifest.expectedCheckpoints.count
            && zip(request.custodyRecords, manifest.expectedCheckpoints).enumerated().allSatisfy { index, pair in
                let (record, expectedCheckpoint) = pair
                return record.sequence == index + 1
                    && record.manifestReference == manifest.manifestReference
                    && record.partReference == manifest.partReference
                    && record.lotReference == manifest.lotReference
                    && record.checkpoint == expectedCheckpoint
            }
        let custodyEvidence = custodyContinuity
            && request.custodyRecords.allSatisfy { $0.evidence.isVerified }
        let physicalInspection = inspection.physicalInspectionEvidence.isVerified
        let artifactIntegrity = inspection.artifactIntegrityEvidence.isVerified
        let accountableReview = inspection.accountabilityEvidence.isVerified
            && !inspection.accountableOwnerReference.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        // This is a bounded reference comparison, not identity verification.
        // A matching role reference fails closed; distinct references still
        // require independently accountable human review outside this model.
        let separationOfDuties = governance.authorityReference != inspection.accountableOwnerReference
        let networkNotConflicted = request.networkObservation != .conflicted
        let stages = ShipmentAdmissionStages(
            manifestBound: manifestBound,
            governanceEvidence: governanceEvidence,
            governanceActive: governanceActive,
            governanceNotExpired: governanceNotExpired,
            custodyContinuity: custodyContinuity,
            custodyEvidence: custodyEvidence,
            receivingIdentityBound: receivingIdentityBound,
            physicalInspection: physicalInspection,
            artifactIntegrity: artifactIntegrity,
            accountableReview: accountableReview,
            separationOfDuties: separationOfDuties,
            networkNotConflicted: networkNotConflicted
        )

        func result(
            _ decision: ShipmentAdmissionDecision,
            _ code: ShipmentAdmissionCode,
            _ reason: String
        ) -> ShipmentAdmissionAssessment {
            ShipmentAdmissionAssessment(
                decision: decision,
                code: code,
                reason: reason,
                stages: stages
            )
        }

        guard networkNotConflicted else {
            return result(
                .hold,
                .networkObservationConflicted,
                "A network-derived route observation conflicts with the expected policy. It is an alert, not proof of cause; preserve the record and require authorized review."
            )
        }
        guard manifestBound else {
            return result(
                .hold,
                .expectedManifestMismatch,
                "The external governance record does not bind the expected manifest and route-policy references. Do not infer admission from a local manifest or physical arrival."
            )
        }
        switch governance.state {
        case .unavailable:
            return result(
                .hold,
                .externalGovernanceUnavailable,
                "External governance status is unavailable. Missing expiry/revocation-capable governance evidence fails closed to authorized review."
            )
        case .revoked:
            return result(
                .hold,
                .externalGovernanceRevoked,
                "The external governance record is revoked. Preserve the evidence and require authorized review; do not release or install the item."
            )
        case .active:
            break
        }
        guard governanceNotExpired else {
            return result(
                .hold,
                .externalGovernanceExpired,
                "The external governance record has expired at the supplied assessment time. A prior record cannot silently remain valid."
            )
        }
        guard governanceEvidence else {
            return result(
                .hold,
                .externalGovernanceUnverified,
                "External governance evidence is not independently verified. The policy does not treat a declared record as active governance."
            )
        }
        guard receivingIdentityBound else {
            return result(
                .hold,
                .receivingIdentityMismatch,
                "The receiving inspection does not bind to the expected manifest, part, and lot references. Physical arrival does not establish admission."
            )
        }
        guard request.custodyRecords.count == manifest.expectedCheckpoints.count else {
            return result(
                .hold,
                .custodyChainIncomplete,
                "The required custody chain is incomplete. An item cannot become admissible merely because it appears at a receiving point."
            )
        }
        guard custodyContinuity else {
            return result(
                .hold,
                .routeDeviation,
                "Custody records do not exactly match the pre-authorized checkpoint order and references. Require authorized review."
            )
        }
        guard custodyEvidence else {
            return result(
                .hold,
                .custodyEvidenceUnverified,
                "One or more custody records lack independently verified evidence. A declared route is not continuity proof."
            )
        }
        guard physicalInspection else {
            return result(
                .hold,
                .physicalInspectionUnverified,
                "Physical receiving inspection evidence is not independently verified. Do not release or install the item."
            )
        }
        guard artifactIntegrity else {
            return result(
                .hold,
                .artifactIntegrityUnverified,
                "Artifact integrity evidence is not independently verified. Do not infer that the item matches an approved release."
            )
        }
        guard accountableReview else {
            return result(
                .hold,
                .accountableReviewUnverified,
                "An accountable receiving review record is incomplete or unverified. The app cannot replace that review."
            )
        }
        guard separationOfDuties else {
            return result(
                .hold,
                .separationOfDutiesNotMet,
                "The same opaque role reference appears for external governance and receiving review. Keep the record on hold for a separately accountable review; this comparison is not identity proof."
            )
        }

        return result(
            .reviewReady,
            .reviewReady,
            "Custody continuity and receiving evidence are complete enough for an authorized external release process to review. This model does not accept, dispatch, install, or operate the item."
        )
    }
}

public enum ShipmentProvenanceError: Error, Equatable, Sendable, LocalizedError {
    case invalidReference
    case invalidManifest
    case invalidCustodyRecord

    public var errorDescription: String? {
        switch self {
        case .invalidReference:
            return "A shipment provenance reference must be a non-empty single-line opaque value."
        case .invalidManifest:
            return "A shipment manifest must have a non-empty, non-duplicated expected custody sequence."
        case .invalidCustodyRecord:
            return "A custody record must have a positive sequence number."
        }
    }
}
