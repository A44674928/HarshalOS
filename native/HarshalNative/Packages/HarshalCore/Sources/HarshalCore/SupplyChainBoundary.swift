import Foundation

/// Published-edition source metadata for the accountability/continuity concepts
/// used by the native boundary. In AGS v0.2, this is Part XVIII—not Part XIX.
/// The legacy repository source retains its earlier Part XIX path and is kept
/// only as a companion record, never as a reason to mislabel the published book.
public enum AccountabilityResearchReference {
    public static let documentID = "AGS-V0.2-PART-XVIII"
    public static let sourcePart = "Part XVIII"
    public static let title = "Accountability in Keyed Human–Machine Hybrid Systems"
    public static let provenanceClass = "RESEARCH"
    public static let statusTaxonomy = "AUTHOR-PROPOSED RESEARCH"
    public static let researchLayer = "CONCEPTUAL_RESEARCH_PROPOSAL"
    public static let evidenceStatus = "NOT_AN_INDEPENDENT_CERTIFICATION"
    public static let printedStartPage = "203"
    public static let pdfStartPage = 229
    public static let sourceArtifactPath = AGSv02PublishedCorpus.sourceArtifactPath
    public static let sourceEdition = AGSv02PublishedCorpus.edition
    public static let legacyCompanionDocumentID = "HS-19-RESEARCH-PAPERS"
    public static let legacyCompanionPath = "docs/harshal-systems/19-research-papers.md"
    public static let summary = "A published conceptual research reference for Minimum Viable Keying, accountable continuity, scoped review, non-agency of computational components, and refusal when accountable evidence is absent."
}

/// Published-edition metadata for the defensive SCAV++ context. `SCAV-PLUS-PLUS`
/// remains a local boundary identifier, not a claimed scanner or implementation.
/// The app catalogs Part XIX at this level only and intentionally imports none of
/// its scenario, procedural, target, activation, device, or response material.
public enum SupplyChainResearchReference {
    public static let identifier = "SCAV-PLUS-PLUS"
    public static let documentID = "AGS-V0.2-PART-XIX"
    public static let sourcePart = "Part XIX"
    public static let title = "Supply Chain and Implanted-Device Threat Research"
    public static let provenanceClass = "THREAT_RESEARCH"
    public static let statusTaxonomy = "DEFENSIVE_THREAT_RESEARCH_AND_CONTAINMENT_MODELING"
    public static let researchLayer = "THREAT_RESEARCH"
    public static let evidenceStatus = "PART-LOCAL / SOURCE-SCOPED"
    public static let printedStartPage = "213"
    public static let pdfStartPage = 239
    public static let sourceArtifactPath = AGSv02PublishedCorpus.sourceArtifactPath
    public static let sourceEdition = AGSv02PublishedCorpus.edition
    public static let summary = "A published defensive threat-research context. The SCAV++ model uses only its source classification and refusal-first boundary; it does not derive or operationalize Part XIX material."
}

/// The only published-corpus concepts represented in the native SCAV++ surface.
/// They are bounded application constraints—not an implementation of human-key
/// verification, liveness assessment, healthcare functionality, attack research,
/// or operational authority from the source text.
public enum PublishedCorpusNativeBoundaryTranslation: String, CaseIterable, Codable, Sendable, Identifiable, Hashable {
    case accountableEvidenceBeforeAuthority = "ACCOUNTABLE_EVIDENCE_BEFORE_AUTHORITY"
    case continuityMustBeBound = "CONTINUITY_MUST_BE_BOUND"
    case scopeContractsOnFailure = "SCOPE_CONTRACTS_ON_FAILURE"
    case threatResearchRemainsCatalogOnly = "THREAT_RESEARCH_REMAINS_CATALOG_ONLY"
    case computationalComponentsRemainNonAuthoritative = "COMPUTATIONAL_COMPONENTS_REMAIN_NON_AUTHORITATIVE"

    public var id: String { rawValue }

    public var sourcePart: String {
        switch self {
        case .accountableEvidenceBeforeAuthority, .continuityMustBeBound, .scopeContractsOnFailure, .computationalComponentsRemainNonAuthoritative:
            return AccountabilityResearchReference.sourcePart
        case .threatResearchRemainsCatalogOnly:
            return SupplyChainResearchReference.sourcePart
        }
    }

    public var title: String {
        switch self {
        case .accountableEvidenceBeforeAuthority:
            return "Accountability before authority"
        case .continuityMustBeBound:
            return "Continuity must be bound"
        case .scopeContractsOnFailure:
            return "Scope contracts on failure"
        case .threatResearchRemainsCatalogOnly:
            return "Threat research remains catalog-only"
        case .computationalComponentsRemainNonAuthoritative:
            return "Computational components remain non-authoritative"
        }
    }

    public var nativeTranslation: String {
        switch self {
        case .accountableEvidenceBeforeAuthority:
            return "A local declaration, alias, or receipt never grants authority. The app requires bounded evidence and accountable review before it can describe a record as continuous."
        case .continuityMustBeBound:
            return "The shipping baseline binds pre-registered origin/release, route, revocation, custody, and review evidence to the same record rather than inferring continuity from present possession."
        case .scopeContractsOnFailure:
            return "Missing, stale, altered, revoked, replayed, or untrusted evidence contracts the result to a non-acting hold or refusal."
        case .threatResearchRemainsCatalogOnly:
            return "The SCAV++ model records the published Part XIX classification and boundary only. It does not derive or operationalize threat-research material."
        case .computationalComponentsRemainNonAuthoritative:
            return "The app offers no delegated authority, external automation, medical/clinical function, or physical-world control. CWO remains a valid archival/custodial phase."
        }
    }

    public var explicitLimit: String {
        switch self {
        case .accountableEvidenceBeforeAuthority:
            return "No identity, intent, consent, coercion, or truth determination."
        case .continuityMustBeBound:
            return "No physical inspection, trusted-time service, or independent witness."
        case .scopeContractsOnFailure:
            return "No reroute, release, deployment, or external action."
        case .threatResearchRemainsCatalogOnly:
            return "No scenario, procedure, target material, activation logic, device guidance, or response workflow."
        case .computationalComponentsRemainNonAuthoritative:
            return "No body/neural-interface interpretation, distress signaling, or real-world intervention workflow."
        }
    }
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
    public static let limitation = "This local boundary model does not independently verify provenance, scan for compromise, enforce a license, reproduce threat-research material, or prevent source copying or binary modification outside interfaces HarshalOS controls. A contained result is not certification, authorization, or a downstream integration approval."

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
