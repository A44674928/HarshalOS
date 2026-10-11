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
        case .nab: return "Neural Atomic Body"
        case .cwo: return "Custodial Witness Orb"
        case .gsrb: return "God-Sovereign Religious Body"
        }
    }

    public var shortDescription: String {
        switch self {
        case .nab:
            return "Refusal-bound local evaluation. All declared phases may record simulated paper-market positions; an execution permit remains a local demonstration result."
        case .cwo:
            return "Custodial/archival phase. CWO may record and preserve non-executing paper-market declarations; the external-execution gate remains unavailable."
        case .gsrb:
            return "God-Sovereign Religious Body declaration. It may record non-executing paper-market declarations; this starter exposes no execution override."
        }
    }

    public var requiresCollapseProtocol: Bool {
        self == .gsrb
    }
}
