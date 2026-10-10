import Foundation

/// A non-executing activity that a declared body may record in the future
/// native paper-market feature. These activities do not create a brokerage
/// order, transfer money, or authorize an external market action.
public enum PaperTradingActivity: String, CaseIterable, Codable, Sendable, Identifiable, Hashable {
    case marketDeclaration = "MARKET_DECLARATION"
    case openPosition = "OPEN_PAPER_POSITION"
    case amendPosition = "AMEND_PAPER_POSITION"
    case closePosition = "CLOSE_PAPER_POSITION"

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .marketDeclaration: return "Market declaration"
        case .openPosition: return "Open paper position"
        case .amendPosition: return "Amend paper position"
        case .closePosition: return "Close paper position"
        }
    }
}

/// The phase-policy result for a paper-market record. It deliberately answers
/// only phase eligibility; a future feature must still require a valid local
/// declaration, explicit user action, and its own data/persistence checks.
public struct PaperTradingEligibility: Equatable, Sendable {
    public let phase: DeclaredPhase
    public let activity: PaperTradingActivity
    public let isEligible: Bool
    public let assurance: String
    public let executionScope: String
    public let reason: String

    public init(
        phase: DeclaredPhase,
        activity: PaperTradingActivity,
        isEligible: Bool,
        assurance: String,
        executionScope: String,
        reason: String
    ) {
        self.phase = phase
        self.activity = activity
        self.isEligible = isEligible
        self.assurance = assurance
        self.executionScope = executionScope
        self.reason = reason
    }
}

/// Phase-neutral policy for future paper-market records.
///
/// `RefusalGate` models a bounded external-action request and is intentionally
/// separate from this policy. A paper-market record is a local, simulated
/// declaration: no phase receives a brokerage, payment, or execution right.
public enum PaperTradingPolicy {
    public static let assurance = "SIMULATED-MARKET-RECORD-NOT-INVESTMENT-ADVICE"
    public static let executionScope = "PAPER-ONLY-NO-BROKERAGE-EXECUTION"

    public static func evaluate(
        phase: DeclaredPhase,
        activity: PaperTradingActivity
    ) -> PaperTradingEligibility {
        PaperTradingEligibility(
            phase: phase,
            activity: activity,
            isEligible: true,
            assurance: assurance,
            executionScope: executionScope,
            reason: "All declared phases, including \(phase.name), may record a \(activity.title.lowercased()) as a simulated market record. It creates no broker instruction, investment recommendation, identity proof, authorization, or external market effect."
        )
    }
}
