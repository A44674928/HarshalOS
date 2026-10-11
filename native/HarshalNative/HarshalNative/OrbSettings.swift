import Foundation
import HarshalCore

/// Every dial for the combined **Markets · NEO ORB** surface, plus the gate
/// policy. Settings are non-private preferences: they are persisted to
/// `UserDefaults` as versioned JSON (never Keychain, never sync) and are the
/// single source the tucked-away Settings panel edits.
struct MarketsOrbSettings: Codable, Equatable, Sendable {
    // MARK: The Orb — dual fractal flame engines

    var flameInnerEnabled = true
    var flameOuterEnabled = true
    /// Additive "lighter" blend weights for each engine film.
    var flameInnerOpacity = 0.55
    var flameOuterOpacity = 0.35
    /// Relative draw scale of each film inside the orb silhouette.
    var flameInnerScale = 0.62
    var flameOuterScale = 1.0
    /// Global brightness multiplier over each frame's own brightness.
    var flameExposure = 1.0
    /// Bake quality: points multiplier (0.5 = fast preview, 2 = dense).
    var flameQuality = 1.0
    var flameAnimationEnabled = true

    // MARK: Orb 2 — Good Intelligence ticker orbs

    var orb2TickerOrbsEnabled = true
    var orb2ShowLabels = true
    var orb2BeatMotion = true
    /// The declared-phase display shift (NAB 0, CWO +60°, GSRB +120°) from
    /// the Orb 2 module — display-only, never a price or entitlement effect.
    var orb2PhaseShift = true
    var orb2HourlyGeometry = true
    var orb2SectorColors = true

    // MARK: Shared NEO ORB shape

    var formation = 0.72
    var axisX = 1.0
    var axisY = 1.0
    var axisZ = 1.0
    var berthSeparation = 1.0
    /// Rotations per minute of the spheroid.
    var rotationRPM = 2.4
    var showBands = true
    var showLongitudeArcs = true
    var showAttachments = true
    var nodeScale = 1.0

    // MARK: Markets — paper simulator

    var startingCash = 100_000.0
    var commissionFlat = 0.0
    var commissionBasisPoints = 1.0
    var slippageBasisPoints = 2.0
    /// Seconds between board ticks while the live feed is unavailable.
    var tickIntervalSeconds = 4.0
    /// Board sort: roster order, biggest day move, or market cap.
    var boardSort: BoardSort = .roster

    enum BoardSort: String, Codable, CaseIterable, Identifiable {
        case roster
        case dayMove
        case marketCap

        var id: String { rawValue }

        var label: String {
            switch self {
            case .roster: return "Roster"
            case .dayMove: return "Day move"
            case .marketCap: return "Market cap"
            }
        }
    }

    // MARK: Human-Key gate

    var gate = MarketsGateSettings()

    static let `default` = MarketsOrbSettings()
}

/// The biometric + watch gating policy that feeds `WatchGateService`.
struct MarketsGateSettings: Codable, Equatable, Sendable {
    /// Require the gate before submitting any paper order.
    var requireGateForOrders = true
    enum WitnessPolicy: String, Codable, CaseIterable, Identifiable {
        /// The watch heartbeat is a bonus factor only.
        case off
        /// The heartbeat contributes to legitimacy but cannot fail the gate by itself.
        case preferred
        /// A fresh heartbeat is a prerequisite: no beat, no permit.
        case required

        var id: String { rawValue }

        var label: String {
            switch self {
            case .off: return "Off"
            case .preferred: return "Preferred"
            case .required: return "Required"
            }
        }
    }
    var witnessPolicy: WitnessPolicy = .preferred
    /// Freshness window δ in seconds (canonical default 240).
    var freshnessSeconds: Double = GateFormula.maximumVerificationDelay
    /// Legitimacy threshold τ (canonical 0.5).
    var threshold: Double = GateFormula.legitimacyThreshold
    /// Allow device-passcode fallback when biometrics are unavailable.
    var allowPasscodeFallback = true
}

/// Loads and saves `MarketsOrbSettings` as versioned JSON in `UserDefaults`.
enum OrbSettingsStore {
    static let key = "org.harshalos.native.markets-orb-settings.v1"

    static func load() -> MarketsOrbSettings {
        guard let data = UserDefaults.standard.data(forKey: key) else {
            return .default
        }
        guard let decoded = try? JSONDecoder().decode(MarketsOrbSettings.self, from: data) else {
            // A corrupt settings blob falls back to defaults; nothing private
            // is lost and no partial state is trusted.
            return .default
        }
        return sanitize(decoded)
    }

    static func save(_ settings: MarketsOrbSettings) {
        guard let data = try? JSONEncoder().encode(sanitize(settings)) else { return }
        UserDefaults.standard.set(data, forKey: key)
    }

    static func reset() {
        UserDefaults.standard.removeObject(forKey: key)
    }

    /// Clamp every stored value back into its documented dial range so a
    /// hand-edited blob can never put the renderer or the gate into an
    /// invalid state.
    static func sanitize(_ settings: MarketsOrbSettings) -> MarketsOrbSettings {
        var s = settings
        func clamp(_ value: Double, _ range: ClosedRange<Double>) -> Double {
            value.isFinite ? min(max(value, range.lowerBound), range.upperBound) : (range.lowerBound + range.upperBound) / 2
        }
        s.flameInnerOpacity = clamp(s.flameInnerOpacity, 0...1)
        s.flameOuterOpacity = clamp(s.flameOuterOpacity, 0...1)
        s.flameInnerScale = clamp(s.flameInnerScale, 0.2...1)
        s.flameOuterScale = clamp(s.flameOuterScale, 0.2...1)
        s.flameExposure = clamp(s.flameExposure, 0.25...3)
        s.flameQuality = clamp(s.flameQuality, 0.25...2)
        s.formation = clamp(s.formation, 0...1)
        s.axisX = clamp(s.axisX, 0.7...1.3)
        s.axisY = clamp(s.axisY, 0.7...1.3)
        s.axisZ = clamp(s.axisZ, 0.7...1.3)
        s.berthSeparation = clamp(s.berthSeparation, 0...1)
        s.rotationRPM = clamp(s.rotationRPM, 0...12)
        s.nodeScale = clamp(s.nodeScale, 0.5...2)
        s.startingCash = clamp(s.startingCash, 1_000...10_000_000)
        s.commissionFlat = max(0, s.commissionFlat.isFinite ? s.commissionFlat : 0)
        s.commissionBasisPoints = max(0, s.commissionBasisPoints.isFinite ? s.commissionBasisPoints : 0)
        s.slippageBasisPoints = max(0, s.slippageBasisPoints.isFinite ? s.slippageBasisPoints : 0)
        s.tickIntervalSeconds = clamp(s.tickIntervalSeconds, 1...60)
        s.gate.freshnessSeconds = clamp(s.gate.freshnessSeconds, 30...900)
        s.gate.threshold = clamp(s.gate.threshold, 0.1...0.95)
        return s
    }
}
