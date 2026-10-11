import Foundation
import HarshalCore
import LocalAuthentication

#if canImport(WatchConnectivity)
import WatchConnectivity
#endif

/// The native Human-Key gate: on-device biometrics plus the paired Apple
/// Watch witness, evaluated strictly through `GateFormula` (the kernel's
/// legitimacy formula) with a fail-closed default.
///
/// Message contract `hn-watch-gate-v1`:
///
/// - Watch → phone `heartbeat`: `{schema, kind: "heartbeat", humanKey: true,
///   sentAt}` — the wearer's explicit "I am present" beat.
/// - Phone → watch application context: gate state summary (state,
///   legitimacy, threshold, freshness end) mirrored for the watch face.
///
/// The service holds no secret, no token, and no identity. A biometric result
/// is a *local acknowledgement factor* — never proof of who the human is, and
/// a watch heartbeat is a proximity witness — never an authorization. Both
/// merely feed factors into the formula, which refuses by default.
@MainActor
@Observable
final class WatchGateService: NSObject {
    enum SessionState: Equatable {
        case unsupported
        case notPaired
        case inactive
        case activating
        case active
    }

    enum WitnessReading: Equatable {
        case unavailable
        case reachableAwaitingBeat
        case beat(Date)
    }

    nonisolated static let schema = "hn-watch-gate-v1"

    // MARK: Observable state

    private(set) var sessionState: SessionState = .inactive
    private(set) var watchPaired = false
    private(set) var watchReachable = false
    private(set) var witness: WitnessReading = .unavailable
    private(set) var lastVerification: Date?
    private(set) var lastVerificationSucceeded = false
    private(set) var lastVerdict: GateFormula.Verdict?
    private(set) var lastRefusalReason: String?
    private(set) var biometricsAvailable = false
    private(set) var lastHeartbeatSentToWatch: Date?
    /// The freshness δ the last evaluation used. Mirrored to the watch so its
    /// countdown matches the dials instead of assuming the canonical 240 s.
    private var lastFreshnessSeconds: TimeInterval = GateFormula.maximumVerificationDelay
    /// Count of gate evaluations, permits and refusals, for the readout.
    private(set) var evaluationCount = 0

    /// Injected clock so the freshness window is testable.
    var now: () -> Date = { Date() }

    // MARK: Bootstrap

    func bootstrap() {
        refreshBiometricAvailability()

        #if canImport(WatchConnectivity)
        guard WCSession.isSupported() else {
            sessionState = .unsupported
            return
        }
        delegateBox.owner = self
        let session = WCSession.default
        session.delegate = delegateBox
        sessionState = .activating
        session.activate()
        refreshWatchState(session: session)
        #else
        sessionState = .unsupported
        #endif
    }

    func refreshBiometricAvailability() {
        let context = LAContext()
        var error: NSError?
        biometricsAvailable = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
    }

    #if canImport(WatchConnectivity)
    private let delegateBox = DelegateBox()
    #endif

    private func refreshWatchState(session: AnyObject) {
        #if canImport(WatchConnectivity)
        guard let session = session as? WCSession else { return }
        watchPaired = session.isPaired
        watchReachable = session.isReachable
        // Pairing is only meaningful on an activated session; before that the
        // property reports false and the readout would flash "no watch paired"
        // during a normal launch.
        if session.activationState == .activated {
            sessionState = watchPaired ? .active : .notPaired
        }
        if !watchPaired {
            witness = .unavailable
        } else if case .beat = witness {
            // keep an existing beat; freshness decays it
        } else {
            witness = watchReachable ? .reachableAwaitingBeat : .unavailable
        }
        #endif
    }

    // MARK: The gating formula

    /// Witness factor `W ∈ 0...1`: a fresh heartbeat decays on the same
    /// freshness clock as the biometric window; a merely-reachable watch
    /// without a beat contributes a bounded partial factor.
    func witnessFactor(settings: MarketsGateSettings) -> Double {
        switch witness {
        case let .beat(date):
            let elapsed = now().timeIntervalSince(date)
            return GateFormula.scope(at: elapsed, verificationDelay: settings.freshnessSeconds)
        case .reachableAwaitingBeat:
            return 0.25
        case .unavailable:
            return 0
        }
    }

    /// Evaluate the full formula for one gated action.
    /// - Parameters:
    ///   - acknowledged: an active local acknowledgement on this installation
    ///     (the kernel's attestation factor).
    ///   - reason: the bounded, human-readable purpose for this evaluation.
    func evaluate(
        context: GateRequestContext,
        settings: MarketsGateSettings
    ) async -> GateFormula.Verdict {
        lastFreshnessSeconds = settings.freshnessSeconds
        let biometricPassed = await runBiometricEvaluation(settings: settings)
        if biometricPassed {
            lastVerification = now()
            lastVerificationSucceeded = true
        }

        let secondsSince: TimeInterval
        if biometricPassed, let justVerified = lastVerification {
            secondsSince = now().timeIntervalSince(justVerified)
        } else if let last = lastVerification, lastVerificationSucceeded {
            secondsSince = now().timeIntervalSince(last)
        } else {
            secondsSince = .infinity
        }

        let factors = GateFormula.Factors(
            humanKey: biometricPassed,
            addressability: context.isAcknowledged ? 1 : 0.5,
            representation: 1,
            witness: witnessFactor(settings: settings),
            secondsSinceVerification: secondsSince
        )

        var prerequisites: GateFormula.Prerequisites = []
        switch settings.witnessPolicy {
        case .off:
            break
        case .preferred:
            break
        case .required:
            prerequisites.insert(.missingWitness)
        }

        let verdict = GateFormula.evaluate(
            factors: factors,
            prerequisites: prerequisites,
            threshold: settings.threshold,
            verificationDelay: settings.freshnessSeconds
        )
        lastVerdict = verdict
        lastRefusalReason = refusalLabel(for: verdict)
        evaluationCount += 1
        publishGateState(verdict: verdict)
        return verdict
    }

    private func refusalLabel(for verdict: GateFormula.Verdict) -> String? {
        if case let .refuse(reason) = verdict {
            return reason.label
        }
        return nil
    }

    /// Run one explicit biometric evaluation. This is a *local acknowledgement
    /// factor* — it never proves identity, predicts intent, or authorizes
    /// anything beyond feeding the formula.
    private func runBiometricEvaluation(settings: MarketsGateSettings) async -> Bool {
        let context = LAContext()
        context.localizedReason = "Open the Harshal Native gate"
        context.localizedFallbackTitle = "Use passcode"

        let policy: LAPolicy = settings.allowPasscodeFallback
            ? .deviceOwnerAuthentication
            : .deviceOwnerAuthenticationWithBiometrics

        var available = false
        var evaluationError: NSError?
        available = context.canEvaluatePolicy(policy, error: &evaluationError)
        if !available {
            biometricsAvailable = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
            return false
        }
        do {
            let success = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Bool, Error>) in
                context.evaluatePolicy(policy, localizedReason: context.localizedReason ?? "Open the gate") { success, error in
                    if let error {
                        continuation.resume(throwing: error)
                    } else {
                        continuation.resume(returning: success)
                    }
                }
            }
            biometricsAvailable = true
            return success
        } catch {
            return false
        }
    }

    // MARK: Watch link

    /// Push the latest gate summary to the watch face.
    func publishGateState(verdict: GateFormula.Verdict? = nil) {
        #if canImport(WatchConnectivity)
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        guard session.activationState == .activated else { return }
        let resolved = verdict ?? lastVerdict
        var context: [String: Any] = [
            Self.schema + ".kind": "state",
            "state": resolved?.isPermit == true ? "unlocked" : "locked",
            "threshold": GateFormula.legitimacyThreshold,
            "freshnessSeconds": lastFreshnessSeconds,
            "updatedAt": Date().timeIntervalSince1970
        ]
        if let resolved {
            context["legitimacy"] = resolved.legitimacy
        }
        if let last = lastVerification {
            context["verifiedAt"] = last.timeIntervalSince1970
        }
        // `updateApplicationContext` is a throwing call: a context pushed
        // before activation (or one rejected by the system) leaves the watch on
        // its previous snapshot, which the next gate state replaces. Nothing to
        // surface to the user, but the call still needs a `try`.
        do {
            try session.updateApplicationContext(context)
        } catch {
            // Keep the local state machine authoritative; the watch shows the
            // last context it received until a later push succeeds.
        }
        lastHeartbeatSentToWatch = now()
        #endif
    }

    func ingestWatchHeartbeat(humanKeyPresent: Bool, sentAt: Date) {
        guard humanKeyPresent else {
            witness = watchPaired ? .reachableAwaitingBeat : .unavailable
            return
        }
        witness = .beat(sentAt)
        publishGateState()
    }

    #if canImport(WatchConnectivity)
    /// Nonisolated delegate box that hops every callback onto the MainActor.
    final class DelegateBox: NSObject, WCSessionDelegate {
        fileprivate weak var owner: WatchGateService?

        nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
            Task { @MainActor [weak self] in
                guard let owner = self?.owner else { return }
                owner.sessionState = activationState == .activated ? .active : .inactive
                owner.refreshWatchState(session: session)
                owner.publishGateState()
            }
        }

        #if os(iOS)
        nonisolated func sessionDidBecomeInactive(_ session: WCSession) {
            Task { @MainActor [weak self] in
                self?.owner?.sessionState = .inactive
            }
        }

        nonisolated func sessionDidDeactivate(_ session: WCSession) {
            // Re-activate for the newly activated watch (multi-watch handoff).
            session.activate()
            Task { @MainActor [weak self] in
                self?.owner?.sessionState = .activating
            }
        }
        #endif

        nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
            let schema = message[WatchGateService.schema + ".kind"] as? String
            guard schema == "heartbeat" else {
                replyHandler([WatchGateService.schema + ".kind": "unknown"])
                return
            }
            let humanKey = (message["humanKey"] as? Bool) ?? false
            let sentAtInterval = (message["sentAt"] as? TimeInterval) ?? 0
            let sentAt = sentAtInterval > 0 ? Date(timeIntervalSince1970: sentAtInterval) : Date()
            Task { @MainActor [weak self] in
                guard let owner = self?.owner else {
                    replyHandler([WatchGateService.schema + ".kind": "state", "state": "locked"])
                    return
                }
                owner.refreshWatchState(session: session)
                owner.ingestWatchHeartbeat(humanKeyPresent: humanKey, sentAt: sentAt)
                let unlocked = owner.lastVerdict?.isPermit == true
                replyHandler([
                    WatchGateService.schema + ".kind": "state",
                    "state": unlocked ? "unlocked" : "locked",
                    "legitimacy": owner.lastVerdict?.legitimacy ?? 0
                ])
            }
        }

        nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
            Task { @MainActor [weak self] in
                self?.owner?.refreshWatchState(session: session)
            }
        }

        /// Beats the watch queued with `transferUserInfo` arrive here when live
        /// delivery was not possible (the phone app was not running, or the
        /// watch could not reach it). The beat keeps its original `sentAt`, so
        /// the witness decays from the moment the wearer actually tapped
        /// rather than from the moment the queue drained.
        nonisolated func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
            let schema = userInfo[WatchGateService.schema + ".kind"] as? String
            guard schema == "heartbeat" else { return }
            let humanKey = (userInfo["humanKey"] as? Bool) ?? false
            let sentAtInterval = (userInfo["sentAt"] as? TimeInterval) ?? 0
            let sentAt = sentAtInterval > 0 ? Date(timeIntervalSince1970: sentAtInterval) : Date()
            Task { @MainActor [weak self] in
                guard let owner = self?.owner else { return }
                owner.refreshWatchState(session: session)
                owner.ingestWatchHeartbeat(humanKeyPresent: humanKey, sentAt: sentAt)
                owner.publishGateState()
            }
        }

        nonisolated func sessionReachabilityDidChange(_ session: WCSession) {
            Task { @MainActor [weak self] in
                self?.owner?.refreshWatchState(session: session)
            }
        }
    }
    #endif
}

/// Everything the gate needs to know about the requesting context. Kept
/// small and labelled: it is display/decision context, not identity.
struct GateRequestContext: Sendable {
    /// A bounded, human-readable purpose for the evaluation.
    let reason: String
    /// Whether this installation holds an active local acknowledgement.
    let isAcknowledged: Bool
}
