import Foundation

/// What the app can honestly say about a principal reference. A local alias or
/// device account must never be presented as verified human identity.
public enum PrincipalVerification: String, Codable, Sendable, CaseIterable, Hashable {
    case selfDeclared = "SELF_DECLARED"
    case externalAttestationPending = "EXTERNAL_ATTESTATION_PENDING"
    case externallyAttested = "EXTERNALLY_ATTESTED"

    public var label: String {
        switch self {
        case .selfDeclared: return "Self-declared"
        case .externalAttestationPending: return "External attestation pending"
        case .externallyAttested: return "Externally attested"
        }
    }
}

/// Required confirmations for every local phase declaration. They are
/// disclosures and acknowledgements—not a character test, background check, or
/// identity proof.
public enum DeclarationAcknowledgment: String, CaseIterable, Codable, Sendable, Identifiable, Hashable {
    case localBoundary = "LOCAL_BOUNDARY"
    case noIdentityClaim = "NO_IDENTITY_CLAIM"
    case externalAuthorization = "EXTERNAL_AUTHORIZATION"
    case accountabilityDuty = "ACCOUNTABILITY_DUTY"
    case revocationDuty = "REVOCATION_DUTY"

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .localBoundary:
            return "I understand this is a local demonstration record."
        case .noIdentityClaim:
            return "I understand a local alias or device state does not prove identity, intent, or legal authority."
        case .externalAuthorization:
            return "I will not treat this declaration as external authorization for real-world action."
        case .accountabilityDuty:
            return "I acknowledge that accountable human and operational ownership must be established outside this app."
        case .revocationDuty:
            return "I understand a declaration or local acknowledgement can be withdrawn and must fail closed when withdrawn."
        }
    }

    public static func required(for _: DeclaredPhase) -> Set<DeclarationAcknowledgment> {
        [
            .localBoundary,
            .noIdentityClaim,
            .externalAuthorization,
            .accountabilityDuty,
            .revocationDuty
        ]
    }
}

/// The five ordered collapse disclosures carried from `js/data.js`. They model
/// a declaration into GSRB; they do not authorize an action or make GSRB
/// executable in this native starter.
public enum CollapseAcknowledgment: String, CaseIterable, Codable, Sendable, Identifiable, Hashable {
    case publicDeclarationOfInternalLegitimacy = "PUBLIC_DECLARATION_OF_INTERNAL_LEGITIMACY"
    case admissionOfExecutableSymbolism = "ADMISSION_OF_EXECUTABLE_SYMBOLISM"
    case acceptanceOfOverrideableRefusal = "ACCEPTANCE_OF_OVERRIDEABLE_REFUSAL"
    case acknowledgementOfLossOfMisuseResistance = "ACKNOWLEDGEMENT_OF_LOSS_OF_MISUSE_RESISTANCE"
    case resetOfPriorPhaseGuarantees = "RESET_OF_PRIOR_PHASE_GUARANTEES"

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .publicDeclarationOfInternalLegitimacy:
            return "Public declaration of internal legitimacy"
        case .admissionOfExecutableSymbolism:
            return "Admission of executable symbolism"
        case .acceptanceOfOverrideableRefusal:
            return "Acceptance of override-able refusal"
        case .acknowledgementOfLossOfMisuseResistance:
            return "Acknowledgement of loss of misuse resistance"
        case .resetOfPriorPhaseGuarantees:
            return "Reset of prior phase guarantees"
        }
    }
}

public struct PhaseDeclarationDraft: Codable, Equatable, Sendable {
    public var principalLabel: String
    public var verification: PrincipalVerification
    public var phase: DeclaredPhase
    public var acknowledgments: Set<DeclarationAcknowledgment>
    /// Ordered, append-only acknowledgements for a GSRB declaration.
    public var collapseAcknowledgments: [CollapseAcknowledgment]

    public init(
        principalLabel: String = "",
        verification: PrincipalVerification = .selfDeclared,
        phase: DeclaredPhase = .nab,
        acknowledgments: Set<DeclarationAcknowledgment> = [],
        collapseAcknowledgments: [CollapseAcknowledgment] = []
    ) {
        self.principalLabel = principalLabel
        self.verification = verification
        self.phase = phase
        self.acknowledgments = acknowledgments
        self.collapseAcknowledgments = collapseAcknowledgments
    }

    public var missingAcknowledgments: Set<DeclarationAcknowledgment> {
        DeclarationAcknowledgment.required(for: phase).subtracting(acknowledgments)
    }

    public var hasCompleteGSrbCollapseProtocol: Bool {
        !phase.requiresCollapseProtocol || collapseAcknowledgments == CollapseAcknowledgment.allCases
    }

    public var hasValidCollapseProtocol: Bool {
        phase.requiresCollapseProtocol
            ? collapseAcknowledgments == CollapseAcknowledgment.allCases
            : collapseAcknowledgments.isEmpty
    }

    public var nextGSrbCollapseAcknowledgment: CollapseAcknowledgment? {
        guard phase.requiresCollapseProtocol,
              collapseAcknowledgments.count < CollapseAcknowledgment.allCases.count,
              collapseAcknowledgments == Array(CollapseAcknowledgment.allCases.prefix(collapseAcknowledgments.count)) else {
            return nil
        }
        return CollapseAcknowledgment.allCases[collapseAcknowledgments.count]
    }
}

public struct PhaseDeclaration: Codable, Equatable, Sendable, Identifiable {
    public let id: UUID
    public let specificationID: String
    public let specificationVersion: String
    public let origin: String
    public let principalLabel: String
    public let verification: PrincipalVerification
    public let phase: DeclaredPhase
    public let acknowledgments: Set<DeclarationAcknowledgment>
    public let collapseAcknowledgments: [CollapseAcknowledgment]
    public let createdAt: Date
    public let assurance: String
    public let executionScope: String

    init(
        id: UUID = UUID(),
        specificationID: String = CanonicalModel.specificationID,
        specificationVersion: String = CanonicalModel.version,
        origin: String = CanonicalModel.origin,
        principalLabel: String,
        verification: PrincipalVerification,
        phase: DeclaredPhase,
        acknowledgments: Set<DeclarationAcknowledgment>,
        collapseAcknowledgments: [CollapseAcknowledgment],
        createdAt: Date = .now,
        assurance: String = CanonicalModel.localAssurance,
        executionScope: String = CanonicalModel.localExecutionScope
    ) {
        self.id = id
        self.specificationID = specificationID
        self.specificationVersion = specificationVersion
        self.origin = origin
        self.principalLabel = principalLabel
        self.verification = verification
        self.phase = phase
        self.acknowledgments = acknowledgments
        self.collapseAcknowledgments = collapseAcknowledgments
        self.createdAt = createdAt
        self.assurance = assurance
        self.executionScope = executionScope
    }
}

public enum PhaseDeclarationError: Error, Equatable, Sendable, LocalizedError {
    case invalidPrincipalLabel
    case externalAttestationUnavailable
    case missingAcknowledgments(Set<DeclarationAcknowledgment>)
    case incompleteGSrbCollapseProtocol

    public var errorDescription: String? {
        switch self {
        case .invalidPrincipalLabel:
            return "Enter a declaration label of 2–80 characters. This label is not proof of identity."
        case .externalAttestationUnavailable:
            return "This build has no independently approved external-attestation provider. It will not let a local declaration self-label as externally attested."
        case let .missingAcknowledgments(missing):
            let labels = missing.map(\.rawValue).sorted().joined(separator: ", ")
            return "Confirm every required declaration acknowledgement before continuing: \(labels)."
        case .incompleteGSrbCollapseProtocol:
            return "A God-Sovereign Religious Body (GSRB) declaration requires all five collapse acknowledgements in their canonical order; other phases require no collapse acknowledgements. This starter remains non-executing."
        }
    }
}

public enum PhaseDeclarationFactory {
    public static func make(
        from draft: PhaseDeclarationDraft,
        at date: Date = .now,
        id: UUID = UUID()
    ) throws -> PhaseDeclaration {
        let label = draft.principalLabel.trimmingCharacters(in: .whitespacesAndNewlines)
        guard (2...80).contains(label.count) else {
            throw PhaseDeclarationError.invalidPrincipalLabel
        }

        guard draft.verification != .externallyAttested else {
            throw PhaseDeclarationError.externalAttestationUnavailable
        }

        let missing = draft.missingAcknowledgments
        guard missing.isEmpty else {
            throw PhaseDeclarationError.missingAcknowledgments(missing)
        }

        guard draft.hasValidCollapseProtocol else {
            throw PhaseDeclarationError.incompleteGSrbCollapseProtocol
        }

        return PhaseDeclaration(
            id: id,
            principalLabel: label,
            verification: draft.verification,
            phase: draft.phase,
            acknowledgments: draft.acknowledgments,
            collapseAcknowledgments: draft.collapseAcknowledgments,
            createdAt: date
        )
    }
}
