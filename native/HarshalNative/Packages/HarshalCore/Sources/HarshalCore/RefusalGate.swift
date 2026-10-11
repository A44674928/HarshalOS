import Foundation

public enum LocalAttestationState: String, Codable, Sendable, CaseIterable, Hashable {
    case absent
    case pending
    case active
    case failed
    case revoked
}

public enum GateDecision: String, Codable, Sendable, Hashable {
    case permit = "PERMIT"
    case refuse = "REFUSE"
}

/// Stable, user-presentable result identifiers for modeled external actions.
/// The model fails closed: any unknown or incomplete condition resolves to a
/// refusal. Non-executing paper-market records use `PaperTradingPolicy` rather
/// than this execution gate.
public enum GateCode: String, Codable, Sendable, Hashable {
    case localDemoPermitted = "LOCAL-DEMO-PERMITTED"
    case invalidAction = "INVALID-ACTION"
    case cwoExternalExecutionUnavailable = "CWO-EXTERNAL-EXECUTION-UNAVAILABLE"
    case gsrbNonExecuting = "GSRB-NON-EXECUTING"
    case attestationPending = "LOCAL-ATTESTATION-PENDING"
    case noLocalAttestation = "NO-LOCAL-ATTESTATION"
    case stalePermission = "STALE-PERMISSION"
    case authorizationMissing = "AUTHORIZATION-MISSING"
    case continuityBroken = "CONTINUITY-BROKEN"
    case accountabilityMissing = "ACCOUNTABILITY-MISSING"
    case invalidFactor = "INVALID-FACTOR"
    case legitimacyBelowThreshold = "L-BELOW-TAU"
}

public struct GateInput: Equatable, Sendable {
    public var actionName: String
    public var phase: DeclaredPhase
    public var attestation: LocalAttestationState
    public var attestedAt: Date?
    public var addressability: Double
    public var representation: Double
    public var authorizationActive: Bool
    public var sessionBound: Bool
    public var technicalAttribution: Bool
    public var operationalAccountability: Bool
    public var evaluatedAt: Date

    public init(
        actionName: String,
        phase: DeclaredPhase,
        attestation: LocalAttestationState,
        attestedAt: Date?,
        addressability: Double,
        representation: Double,
        authorizationActive: Bool,
        sessionBound: Bool,
        technicalAttribution: Bool,
        operationalAccountability: Bool,
        evaluatedAt: Date = .now
    ) {
        self.actionName = actionName
        self.phase = phase
        self.attestation = attestation
        self.attestedAt = attestedAt
        self.addressability = addressability
        self.representation = representation
        self.authorizationActive = authorizationActive
        self.sessionBound = sessionBound
        self.technicalAttribution = technicalAttribution
        self.operationalAccountability = operationalAccountability
        self.evaluatedAt = evaluatedAt
    }
}

public struct GateStages: Equatable, Sendable {
    public let identity: Bool
    public let representation: Bool
    public let authorization: Bool
    public let continuity: Bool
    public let accountability: Bool

    public init(
        identity: Bool,
        representation: Bool,
        authorization: Bool,
        continuity: Bool,
        accountability: Bool
    ) {
        self.identity = identity
        self.representation = representation
        self.authorization = authorization
        self.continuity = continuity
        self.accountability = accountability
    }
}

public struct GateEvaluation: Equatable, Sendable {
    public let decision: GateDecision
    public let code: GateCode
    public let reason: String
    public let legitimacy: Double
    public let temporalScope: Double
    public let elapsedVerificationSeconds: TimeInterval?
    public let stages: GateStages
    public let assurance: String
    public let executionScope: String

    public var permitted: Bool { decision == .permit }
}

/// Evaluates a bounded modeled external action. It does not decide whether a
/// declared body may create a local archival record or a simulated paper-market
/// declaration; those non-executing records are phase-neutral under
/// `PaperTradingPolicy`.
public enum RefusalGate {
    public static func evaluate(_ input: GateInput) -> GateEvaluation {
        let actionName = input.actionName.trimmingCharacters(in: .whitespacesAndNewlines)
        let validFactors = (0...1).contains(input.addressability) && (0...1).contains(input.representation)
        let elapsed = input.attestedAt.map { max(0, input.evaluatedAt.timeIntervalSince($0)) }
        let scope = elapsed.map(scopeCapacity) ?? 0
        let isFresh = elapsed.map { $0 < CanonicalModel.maximumVerificationDelay } ?? false
        let identity = input.attestation == .active && isFresh
        let representation = validFactors && input.representation > 0
        let authorization = input.authorizationActive
        let continuity = authorization && input.sessionBound && isFresh
        let accountability = input.technicalAttribution && input.operationalAccountability
        let stages = GateStages(
            identity: identity,
            representation: representation,
            authorization: authorization,
            continuity: continuity,
            accountability: accountability
        )
        let legitimacy = identity && continuity && accountability && validFactors
            ? input.addressability * input.representation * scope
            : 0

        func refusal(_ code: GateCode, _ reason: String) -> GateEvaluation {
            GateEvaluation(
                decision: .refuse,
                code: code,
                reason: reason,
                legitimacy: legitimacy,
                temporalScope: scope,
                elapsedVerificationSeconds: elapsed,
                stages: stages,
                assurance: CanonicalModel.localAssurance,
                executionScope: CanonicalModel.localExecutionScope
            )
        }

        guard !actionName.isEmpty else {
            return refusal(.invalidAction, "A non-empty action name is required. The local gate refuses malformed requests.")
        }
        guard validFactors else {
            return refusal(.invalidFactor, "Addressability and representation must each be finite values from 0 through 1.")
        }
        if input.phase == .cwo {
            return refusal(
                .cwoExternalExecutionUnavailable,
                "CWO is a custodial witness phase, so this modeled external-execution gate is unavailable. This does not block archival records or non-executing paper-market declarations."
            )
        }
        if input.attestation == .pending {
            return refusal(.attestationPending, "The local acknowledgement is pending. The identity gate remains false until it completes.")
        }
        guard input.attestation == .active else {
            return refusal(.noLocalAttestation, "No active local acknowledgement is present. This app does not claim that acknowledgement authenticates a person.")
        }
        guard isFresh else {
            return refusal(.stalePermission, "The local freshness interval has elapsed. The app fails closed and does not treat device time as independently verified liveness.")
        }
        guard authorization else {
            return refusal(.authorizationMissing, "No bounded authorization is active for this local evaluation.")
        }
        guard input.sessionBound else {
            return refusal(.continuityBroken, "The local session tuple is not bound, so continuity is false.")
        }
        guard accountability else {
            return refusal(.accountabilityMissing, "Technical attribution and operational accountability must both be recorded before the gate can evaluate legitimacy.")
        }
        if input.phase == .gsrb {
            return refusal(.gsrbNonExecuting, "God-Sovereign Religious Body is non-executing in this native starter. No local override is exposed or implied.")
        }
        guard legitimacy >= CanonicalModel.legitimacyThreshold else {
            return refusal(.legitimacyBelowThreshold, "L(t) = \(String(format: "%.3f", legitimacy)) is below τ = \(CanonicalModel.legitimacyThreshold). The local gate refuses by default.")
        }

        return GateEvaluation(
            decision: .permit,
            code: .localDemoPermitted,
            reason: "LOCAL DEMONSTRATION ONLY — the modeled gate evaluates to Permit. This is not production authorization and must not authorize an external action.",
            legitimacy: legitimacy,
            temporalScope: scope,
            elapsedVerificationSeconds: elapsed,
            stages: stages,
            assurance: CanonicalModel.localAssurance,
            executionScope: CanonicalModel.localExecutionScope
        )
    }

    public static func scopeCapacity(elapsedVerificationSeconds: TimeInterval) -> Double {
        max(0, CanonicalModel.maximumScope * (1 - elapsedVerificationSeconds / CanonicalModel.maximumVerificationDelay))
    }
}
