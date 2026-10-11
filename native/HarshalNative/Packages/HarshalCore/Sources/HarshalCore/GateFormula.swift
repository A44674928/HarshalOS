import Foundation

/// The native gating formula — the Swift port of the browser kernel's
/// legitimacy gate (`js/kernel.js`) and the canonical six-stage minimum model
/// (`Identity → Representation → Authorization → Continuity → Accountability
/// → Decision`).
///
/// Every gated native action is evaluated as
///
///     L(t) = H · A · R · W · S(t) / S_MAX        (fail-closed: default Refuse)
///     Permit ⇔ H = 1 ∧ L(t) ≥ τ ∧ every prerequisite holds
///
/// where
///
/// - `H` — Human-key presence. `1` only after an explicit, successful
///   on-device biometric evaluation (Face ID / Touch ID) in this window.
///   It is a local acknowledgement factor, never proof of who the human is.
/// - `A` — Addressability/assertion factor (`0...1`). The device's ability to
///   make a bounded local assertion: active acknowledgement on this
///   installation.
/// - `R` — Representation factor (`0...1`): a declared, labelled context for
///   the request (why the gate is being opened).
/// - `W` — Witness factor (`0...1`): the paired Apple Watch's Human-Key
///   heartbeat. Reachable + fresh heartbeat = `1`; a stored-but-stale
///   heartbeat decays toward `0` on the same freshness clock; no watch
///   pairing contributes `0` — or fails the prerequisite entirely when the
///   gate requires a witness.
/// - `S(t)` — freshness scope: `S_MAX · max(0, 1 − Δt/δ)` seconds since the
///   last successful biometric evaluation, with the canonical `δ = 240 s`.
///
/// The formula is pure: identical inputs always produce an identical verdict,
/// so it is testable without any device, network, watch, or biometric
/// hardware. Callers own the human-facing labels and the ledger record
/// (Accountability is the caller's receipt, not a property of this struct).
public enum GateFormula {
    /// Canonical legitimacy threshold τ (canonical model).
    public static let legitimacyThreshold = 0.5
    /// Canonical maximum verification delay δ in seconds (canonical model).
    public static let maximumVerificationDelay: TimeInterval = 240
    /// Canonical maximum freshness scope.
    public static let maximumScope = 1.0

    /// Ordered inputs to the formula. All values are finite by construction.
    public struct Factors: Equatable, Sendable {
        /// Human-key presence `H ∈ {0, 1}` — biometric evaluation succeeded.
        public var humanKey: Bool
        /// Addressability/assertion `A ∈ 0...1`.
        public var addressability: Double
        /// Representation `R ∈ 0...1`.
        public var representation: Double
        /// Watch witness `W ∈ 0...1`.
        public var witness: Double
        /// Seconds elapsed since the biometric evaluation (`Δt ≥ 0`).
        public var secondsSinceVerification: TimeInterval

        public init(
            humanKey: Bool,
            addressability: Double,
            representation: Double,
            witness: Double,
            secondsSinceVerification: TimeInterval
        ) {
            self.humanKey = humanKey
            self.addressability = Self.clamp01(addressability)
            self.representation = Self.clamp01(representation)
            self.witness = Self.clamp01(witness)
            self.secondsSinceVerification = max(0, secondsSinceVerification.isFinite ? secondsSinceVerification : .infinity)
        }

        static func clamp01(_ value: Double) -> Double {
            guard value.isFinite else { return 0 }
            return min(1, max(0, value))
        }
    }

    /// Prerequisites that independently fail the gate before `L` is compared
    /// with `τ`. They mirror the canonical stage order.
    public struct Prerequisites: OptionSet, Equatable, Sendable {
        public let rawValue: UInt
        public init(rawValue: UInt) { self.rawValue = rawValue }

        /// Stage 1 — no Human key in this window.
        public static let missingHumanKey = Prerequisites(rawValue: 1 << 0)
        /// Stage 3 — biometric evaluation is required but was never attempted.
        public static let unverified = Prerequisites(rawValue: 1 << 1)
        /// Stage 4 — freshness exhausted (Δt ≥ δ).
        public static let expired = Prerequisites(rawValue: 1 << 2)
        /// Stage 4 — a fresh watch heartbeat is required by policy and absent.
        public static let missingWitness = Prerequisites(rawValue: 1 << 3)
    }

    /// The terminal stage-6 outcome. `permit` is never the default; a verdict
    /// is a permit only when every stage passes.
    public enum Verdict: Equatable, Sendable {
        case permit(legitimacy: Double)
        case refuse(reason: RefusalReason)

        public var isPermit: Bool {
            if case .permit = self { return true }
            return false
        }

        public var legitimacy: Double {
            switch self {
            case let .permit(legitimacy): return legitimacy
            case .refuse: return 0
            }
        }
    }

    public enum RefusalReason: Equatable, Sendable {
        case missingHumanKey
        case unverified
        case expired
        case missingWitness
        case belowThreshold(legitimacy: Double)

        public var label: String {
            switch self {
            case .missingHumanKey:
                return "REFUSED — NO HUMAN KEY"
            case .unverified:
                return "REFUSED — NOT VERIFIED IN THIS WINDOW"
            case .expired:
                return "REFUSED — VERIFICATION EXPIRED"
            case .missingWitness:
                return "REFUSED — NO FRESH WATCH WITNESS"
            case .belowThreshold:
                return "REFUSED — LEGITIMACY BELOW τ"
            }
        }
    }

    /// Evaluate the formula. The only terminal states are `permit` and
    /// `refuse`; there is no "maybe" and no default-open path.
    public static func evaluate(
        factors: Factors,
        prerequisites: Prerequisites = [],
        threshold: Double = legitimacyThreshold,
        verificationDelay: TimeInterval = maximumVerificationDelay
    ) -> Verdict {
        var failed = Prerequisites()
        if factors.humanKey == false {
            failed.insert(.missingHumanKey)
        }
        if factors.secondsSinceVerification >= verificationDelay {
            failed.insert(.expired)
        }
        if prerequisites.contains(.missingWitness), factors.witness <= 0 {
            failed.insert(.missingWitness)
        }
        if failed.contains(.missingHumanKey) {
            return .refuse(reason: .missingHumanKey)
        }
        if failed.contains(.unverified) {
            return .refuse(reason: .unverified)
        }
        if failed.contains(.expired) {
            return .refuse(reason: .expired)
        }
        if failed.contains(.missingWitness) {
            return .refuse(reason: .missingWitness)
        }

        let scope = maximumScope * max(0, min(1, 1 - factors.secondsSinceVerification / max(verificationDelay, 1)))
        let legitimacy = (factors.humanKey ? 1.0 : 0.0)
            * Factors.clamp01(factors.addressability)
            * Factors.clamp01(factors.representation)
            * Factors.clamp01(factors.witness)
            * scope

        if legitimacy >= threshold {
            return .permit(legitimacy: legitimacy)
        }
        return .refuse(reason: .belowThreshold(legitimacy: legitimacy))
    }

    /// Freshness scope `S(t)/S_MAX` for a given elapsed time — exposed for
    /// dials and readouts that show the countdown without re-deriving it.
    public static func scope(at secondsSinceVerification: TimeInterval, verificationDelay: TimeInterval = maximumVerificationDelay) -> Double {
        guard secondsSinceVerification.isFinite, secondsSinceVerification >= 0 else { return 0 }
        return max(0, min(1, 1 - secondsSinceVerification / max(verificationDelay, 1)))
    }
}
