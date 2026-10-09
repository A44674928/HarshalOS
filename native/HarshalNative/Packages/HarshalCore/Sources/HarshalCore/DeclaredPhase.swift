import Foundation

/// The three public operational declaration phases. Diagnostic classifications
/// are intentionally not represented here; they belong to a future Ground-0
/// assessment module, not to a self-declared phase record.
public enum DeclaredPhase: String, CaseIterable, Codable, Sendable, Identifiable, Hashable {
    case nab = "NAB"
    case cwo = "CWO"
    case gsrb = "GSRB"

    public var id: String { rawValue }

    public var name: String {
        switch self {
        case .nab: "Neural Atomic Body"
        case .cwo: "Custodial Witness Orb"
        case .gsrb: "Ground-State Rebuild"
        }
    }

    public var shortDescription: String {
        switch self {
        case .nab:
            "Refusal-bound local evaluation. A permit is only a local demonstration result."
        case .cwo:
            "Witness-only. The native gate never permits an action in this phase."
        case .gsrb:
            "Rebuild state. This starter application does not expose an execution override."
        }
    }

    public var requiresCollapseProtocol: Bool {
        self == .gsrb
    }
}
