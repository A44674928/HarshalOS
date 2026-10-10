import Foundation

/// Stable source metadata for the defensive research reference that informed
/// this local boundary model. The source remains a corpus document; this model
/// does not reproduce or operationalize its scenarios.
public enum SupplyChainResearchReference {
    public static let identifier = "SCAV-PLUS-PLUS"
    public static let documentID = "HS-20-SUPPLY-CHAIN"
    public static let title = "Supply Chain Attack Vector++"
    public static let provenanceClass = "CANONICAL_SOURCE"
    public static let statusTaxonomy = "RESEARCH_PAPER"
    public static let researchLayer = "THREAT_RESEARCH"
    public static let evidenceStatus = "MIXED_VERIFIED_AND_REPORTED"
    public static let sourcePath = "docs/harshal-systems/20-supply-chain.md"

    public static let summary = "A defensive research reference for provenance, build and release integrity, update continuity, accountable review, and refusal at integration boundaries."
}

/// The quality of evidence presented to the local boundary model. Selecting a
/// value in a UI is only a model input; it is not independent verification.
public enum SupplyChainEvidence: String, CaseIterable, Codable, Sendable, Identifiable, Hashable {
    case verified = "VERIFIED"
    case declared = "DECLARED"
    case unavailable = "UNAVAILABLE"
    case conflicted = "CONFLICTED"
    case revoked = "REVOKED"

    public var id: String { rawValue }

    public var label: String {
        switch self {
        case .verified: return "Verified evidence"
        case .declared: return "Declared, not independently verified"
        case .unavailable: return "Evidence unavailable"
        case .conflicted: return "Evidence conflicted"
        case .revoked: return "Evidence revoked"
        }
    }

    public var isVerified: Bool { self == .verified }
}

/// A requested relationship to the native application. Only a local, read-only
/// research reference can be contained by this starter. It is never a permit to
/// copy, embed, delegate to, or operationalize HarshalOS elsewhere.
public enum SupplyChainIntegrationPurpose: String, CaseIterable, Codable, Sendable, Identifiable, Hashable {
    case localResearchReference = "LOCAL_RESEARCH_REFERENCE"
    case componentEmbedding = "COMPONENT_EMBEDDING"
    case authorityDelegation = "AUTHORITY_DELEGATION"
    case externalAutomation = "EXTERNAL_AUTOMATION"

    public var id: String { rawValue }

    public var label: String {
        switch self {
        case .localResearchReference: return "Local read-only research reference"
        case .componentEmbedding: return "Embed HarshalOS as a component"
        case .authorityDelegation: return "Delegate authority to HarshalOS"
        case .externalAutomation: return "Automate an external action"
        }
    }

    public var description: String {
        switch self {
        case .localResearchReference:
            return "A local reader can inspect defensive research metadata without invoking an external service or decision authority."
        case .componentEmbedding:
            return "The native application is not an SDK, plug-in host, or downstream component contract."
        case .authorityDelegation:
            return "No local model, receipt, declaration, or app state may receive delegated authority."
        case .externalAutomation:
            return "The supply-chain layer does not create an execution channel or authorize external automation."
        }
    }
}

/// Capability requests are explicit so a proposed downstream relationship cannot
/// silently expand from reading research metadata into private state, identity,
/// network access, or external action.
public enum SupplyChainCapability: String, CaseIterable, Codable, Sendable, Identifiable, Hashable {
    case displayResearch = "DISPLAY_RESEARCH"
    case readPrivateState = "READ_PRIVATE_STATE"
    case writePrivateState = "WRITE_PRIVATE_STATE"
    case accessIdentity = "ACCESS_IDENTITY"
    case networkAccess = "NETWORK_ACCESS"
    case externalAction = "EXTERNAL_ACTION"

    public var id: String { rawValue }

    public var label: String {
        switch self {
        case .displayResearch: return "Display local research metadata"
        case .readPrivateState: return "Read private app state"
        case .writePrivateState: return "Write private app state"
        case .accessIdentity: return "Access identity or account data"
        case .networkAccess: return "Use network access"
        case .externalAction: return "Invoke an external action"
        }
    }
}

public struct SupplyChainBoundaryRequest: Equatable, Sendable {
    public var subject: String
    public var purpose: SupplyChainIntegrationPurpose
    public var originEvidence: SupplyChainEvidence
    public var buildIntegrityEvidence: SupplyChainEvidence
    public var updateContinuityEvidence: SupplyChainEvidence
    public var accountabilityEvidence: SupplyChainEvidence
    /// A local responsibility label for the review record. It is required to
    /// avoid an anonymous containment result, but it is not identity proof.
    public var accountableOwnerReference: String
    public var humanReviewRecorded: Bool
    public var requestedCapabilities: Set<SupplyChainCapability>

    public init(
        subject: String,
        purpose: SupplyChainIntegrationPurpose,
        originEvidence: SupplyChainEvidence,
        buildIntegrityEvidence: SupplyChainEvidence,
        updateContinuityEvidence: SupplyChainEvidence,
        accountabilityEvidence: SupplyChainEvidence,
        accountableOwnerReference: String,
        humanReviewRecorded: Bool,
        requestedCapabilities: Set<SupplyChainCapability>
    ) {
        self.subject = subject
        self.purpose = purpose
        self.originEvidence = originEvidence
        self.buildIntegrityEvidence = buildIntegrityEvidence
        self.updateContinuityEvidence = updateContinuityEvidence
        self.accountabilityEvidence = accountabilityEvidence
        self.accountableOwnerReference = accountableOwnerReference
        self.humanReviewRecorded = humanReviewRecorded
        self.requestedCapabilities = requestedCapabilities
    }
}

public struct SupplyChainBoundaryStages: Equatable, Sendable {
    public let origin: Bool
    public let buildIntegrity: Bool
    public let updateContinuity: Bool
    public let accountability: Bool
    public let purposeBound: Bool
    public let capabilityBound: Bool

    public init(
        origin: Bool,
        buildIntegrity: Bool,
        updateContinuity: Bool,
        accountability: Bool,
        purposeBound: Bool,
        capabilityBound: Bool
    ) {
        self.origin = origin
        self.buildIntegrity = buildIntegrity
        self.updateContinuity = updateContinuity
        self.accountability = accountability
        self.purposeBound = purposeBound
        self.capabilityBound = capabilityBound
    }
}

/// `contained` means only that the proposed relationship remains a local,
/// read-only reference inside this starter. It is intentionally not a permit.
public enum SupplyChainBoundaryDecision: String, Codable, Sendable, Hashable {
    case contained = "CONTAINED_LOCAL_REFERENCE"
    case refuse = "REFUSE"
}

public enum SupplyChainBoundaryCode: String, Codable, Sendable, Hashable {
    case containedLocalReference = "CONTAINED-LOCAL-REFERENCE"
    case invalidSubject = "INVALID-SUBJECT"
    case componentEmbeddingRefused = "COMPONENT-EMBEDDING-REFUSED"
    case authorityDelegationRefused = "AUTHORITY-DELEGATION-REFUSED"
    case externalAutomationRefused = "EXTERNAL-AUTOMATION-REFUSED"
    case capabilityExceedsBoundary = "CAPABILITY-EXCEEDS-LOCAL-BOUNDARY"
    case originUnverified = "ORIGIN-UNVERIFIED"
    case buildIntegrityUnverified = "BUILD-INTEGRITY-UNVERIFIED"
    case updateContinuityUnverified = "UPDATE-CONTINUITY-UNVERIFIED"
    case accountabilityUnverified = "ACCOUNTABILITY-UNVERIFIED"
    case accountableOwnerMissing = "ACCOUNTABLE-OWNER-MISSING"
    case humanReviewMissing = "HUMAN-REVIEW-MISSING"
}

public struct SupplyChainBoundaryAssessment: Equatable, Sendable {
    public let decision: SupplyChainBoundaryDecision
    public let code: SupplyChainBoundaryCode
    public let reason: String
    public let stages: SupplyChainBoundaryStages
    public let limitation: String

    public var isContainedLocalReference: Bool { decision == .contained }
}

/// SCAV++-informed, refusal-first boundary for this native starter.
///
/// This is deliberately narrow: it evaluates a declared proposed relationship
/// to the app, never scans a device/network, never validates a signature, never
/// authorizes a third party, and never offers an attack or response workflow.
/// It can enforce refusal only at interfaces controlled by this code. It cannot
/// technically stop source copying, binary modification, independent packaging,
/// or behavior outside HarshalOS.
public enum SupplyChainBoundary {
    public static let limitation = "This local boundary model does not independently verify provenance, scan for compromise, enforce a license, or prevent source copying or binary modification outside interfaces HarshalOS controls. A contained result is not certification, authorization, or a downstream integration approval."

    public static func evaluate(_ request: SupplyChainBoundaryRequest) -> SupplyChainBoundaryAssessment {
        let subject = request.subject.trimmingCharacters(in: .whitespacesAndNewlines)
        let accountableOwnerReference = request.accountableOwnerReference.trimmingCharacters(in: .whitespacesAndNewlines)
        let purposeBound = request.purpose == .localResearchReference
        let allowableCapabilities: Set<SupplyChainCapability> = [.displayResearch]
        let capabilityBound = request.requestedCapabilities.isSubset(of: allowableCapabilities)
        let stages = SupplyChainBoundaryStages(
            origin: request.originEvidence.isVerified,
            buildIntegrity: request.buildIntegrityEvidence.isVerified,
            updateContinuity: request.updateContinuityEvidence.isVerified,
            accountability: request.accountabilityEvidence.isVerified
                && !accountableOwnerReference.isEmpty
                && request.humanReviewRecorded,
            purposeBound: purposeBound,
            capabilityBound: capabilityBound
        )

        func result(
            _ decision: SupplyChainBoundaryDecision,
            _ code: SupplyChainBoundaryCode,
            _ reason: String
        ) -> SupplyChainBoundaryAssessment {
            SupplyChainBoundaryAssessment(
                decision: decision,
                code: code,
                reason: reason,
                stages: stages,
                limitation: limitation
            )
        }

        guard !subject.isEmpty else {
            return result(
                .refuse,
                .invalidSubject,
                "A proposed downstream subject must be named before the local boundary can evaluate it."
            )
        }

        switch request.purpose {
        case .componentEmbedding:
            return result(
                .refuse,
                .componentEmbeddingRefused,
                "HarshalOS refuses component embedding. This native application is not an SDK, plug-in host, authority service, or downstream dependency contract."
            )
        case .authorityDelegation:
            return result(
                .refuse,
                .authorityDelegationRefused,
                "HarshalOS refuses delegated authority. A declaration, local receipt, model result, or app state cannot authorize another system or person."
            )
        case .externalAutomation:
            return result(
                .refuse,
                .externalAutomationRefused,
                "HarshalOS refuses external automation through this boundary. No execution channel is created by a supply-chain assessment."
            )
        case .localResearchReference:
            break
        }

        guard capabilityBound else {
            return result(
                .refuse,
                .capabilityExceedsBoundary,
                "A local research reference may display bounded research metadata only. Requests for private state, identity, network access, or external action are refused."
            )
        }
        guard request.originEvidence.isVerified else {
            return result(
                .refuse,
                .originUnverified,
                "Origin evidence is not independently verified. The local boundary refuses rather than treating a declaration as provenance."
            )
        }
        guard request.buildIntegrityEvidence.isVerified else {
            return result(
                .refuse,
                .buildIntegrityUnverified,
                "Build or release integrity evidence is not independently verified. The local boundary does not infer artifact integrity."
            )
        }
        guard request.updateContinuityEvidence.isVerified else {
            return result(
                .refuse,
                .updateContinuityUnverified,
                "Update continuity evidence is not independently verified. The local boundary does not assume a trusted update path."
            )
        }
        guard request.accountabilityEvidence.isVerified else {
            return result(
                .refuse,
                .accountabilityUnverified,
                "An accountable human review record is not independently verified. The local boundary refuses anonymous or unverifiable accountability."
            )
        }
        guard !accountableOwnerReference.isEmpty else {
            return result(
                .refuse,
                .accountableOwnerMissing,
                "A local reference for the accountable review owner is required. The reference is not identity proof, but containment cannot be anonymous."
            )
        }
        guard request.humanReviewRecorded else {
            return result(
                .refuse,
                .humanReviewMissing,
                "A bounded human review record is required. This app never substitutes a model decision for accountable human review."
            )
        }

        return result(
            .contained,
            .containedLocalReference,
            "Contained as a local, read-only research reference only. This is not a permit to embed, copy, delegate to, network, or operationalize HarshalOS."
        )
    }
}
