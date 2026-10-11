import Foundation
import WatchConnectivity

/// The watch-side half of the `hn-watch-gate-v1` contract.
///
/// The watch does not decide anything. It renders the phone's mirrored gate
/// state and sends the wearer's explicit Human-Key heartbeat; the phone's
/// `WatchGateService` alone evaluates the gating formula and answers with
/// the verdict. A heartbeat is a presence witness — never an authorization.
@MainActor
@Observable
final class WatchPhoneLink: NSObject {
    enum PhoneState: String {
        case locked
        case unlocked
        case unavailable
        case unreachable
    }

    nonisolated static let schema = "hn-watch-gate-v1"

    /// Written by the file-local `DelegateBox` below when activation
    /// completes, so the setter is file-scoped rather than private to this
    /// type — `private(set)` would be reachable only from this class and its
    /// same-file extensions, not from `DelegateBox`.
    fileprivate(set) var activationStateText = "Activating…"
    private(set) var phoneState: PhoneState = .unavailable
    private(set) var legitimacy = 0.0
    private(set) var threshold = 0.5
    private(set) var verifiedAtInterval: TimeInterval?
    private(set) var updatedAtInterval: TimeInterval?
    /// Freshness window δ mirrored from the phone's dials (canonical 240 s
    /// until the phone pushes its own value).
    private(set) var freshnessSeconds: TimeInterval = 240
    private(set) var lastHeartbeatResult: String?
    private(set) var isSendingHeartbeat = false

    private let delegateBox = DelegateBox()

    func activate() {
        guard WCSession.isSupported() else {
            activationStateText = "WatchConnectivity unsupported"
            return
        }
        let session = WCSession.default
        session.delegate = delegateBox
        delegateBox.owner = self
        session.activate()
    }

    var isPhoneReachable: Bool {
        WCSession.isSupported() && WCSession.default.isReachable
    }

    var freshnessRemaining: TimeInterval? {
        guard let verifiedAtInterval else { return nil }
        let elapsed = Date().timeIntervalSince1970 - verifiedAtInterval
        return max(0, freshnessSeconds - elapsed)
    }

    /// Send the wearer's Human-Key heartbeat. The phone still runs its own
    /// biometric + formula evaluation; this only witnesses presence.
    func sendHeartbeat() {
        guard WCSession.isSupported() else {
            lastHeartbeatResult = "WatchConnectivity is unavailable."
            return
        }
        let session = WCSession.default
        guard session.activationState == .activated else {
            lastHeartbeatResult = "Link is still activating."
            return
        }
        isSendingHeartbeat = true
        let message: [String: Any] = [
            Self.schema + ".kind": "heartbeat",
            "humanKey": true,
            "sentAt": Date().timeIntervalSince1970
        ]
        session.sendMessage(message, replyHandler: { [weak self] reply in
            Task { @MainActor [weak self] in
                guard let self else { return }
                self.isSendingHeartbeat = false
                if let state = reply["state"] as? String {
                    self.lastHeartbeatResult = state == "unlocked"
                        ? "Gate opened on phone (its own checks passed)."
                        : "Delivered — phone gate still refuses."
                } else {
                    self.lastHeartbeatResult = "Delivered."
                }
                self.apply(reply: reply)
            }
        }, errorHandler: { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self else { return }
                self.isSendingHeartbeat = false
                // Live delivery failed: the phone app is not reachable right
                // now (backgrounded or not running). Queue the same stamped
                // beat instead of dropping the wearer's explicit tap — the
                // phone ingests it on its next activation, and the witness
                // decays from the moment the tap happened. The queue survives
                // either app being suspended.
                let session = WCSession.default
                guard session.activationState == .activated else {
                    self.lastHeartbeatResult = "Phone unreachable — open the app on the phone once, then retry."
                    return
                }
                _ = session.transferUserInfo(message)
                self.lastHeartbeatResult = "Phone unreachable — beat queued and will land when the phone app runs."
            }
        })
    }

    func apply(context: [String: Any]) {
        guard let kind = context[Self.schema + ".kind"] as? String, kind == "state" else { return }
        apply(reply: context)
    }

    private func apply(reply: [String: Any]) {
        if let stateRaw = reply["state"] as? String, let state = PhoneState(rawValue: stateRaw) {
            phoneState = state
        }
        if let value = reply["legitimacy"] as? Double {
            legitimacy = value.isFinite ? value : 0
        }
        if let value = reply["threshold"] as? Double, value.isFinite {
            threshold = value
        }
        if let value = reply["verifiedAt"] as? Double, value > 0 {
            verifiedAtInterval = value
        }
        if let value = reply["updatedAt"] as? Double, value > 0 {
            updatedAtInterval = value
        }
        if let value = reply["freshnessSeconds"] as? Double, value > 0 {
            freshnessSeconds = value
        }
    }
}

/// Nonisolated WCSessionDelegate that hops onto the MainActor.
final class DelegateBox: NSObject, WCSessionDelegate {
    fileprivate weak var owner: WatchPhoneLink?

    nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        Task { @MainActor [weak self] in
            guard let owner = self?.owner else { return }
            switch activationState {
            case .activated:
                // `WCSession.isPaired` and `isWatchAppInstalled` are
                // iOS-only, so the watch asks the mirror-image question
                // (`isCompanionAppInstalled`) and reads the last gate state
                // the phone pushed from `receivedApplicationContext`.
                owner.activationStateText = session.isCompanionAppInstalled ? "Linked to iPhone" : "No iPhone app installed"
                let context = session.receivedApplicationContext
                if !context.isEmpty {
                    owner.apply(context: context)
                }
            case .inactive:
                owner.activationStateText = "Link inactive"
            case .notActivated:
                owner.activationStateText = "Link not activated"
            @unknown default:
                owner.activationStateText = "Link state unknown"
            }
        }
    }

    nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        Task { @MainActor [weak self] in
            self?.owner?.apply(context: applicationContext)
        }
    }

    nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        Task { @MainActor [weak self] in
            self?.owner?.apply(context: message)
        }
    }

    nonisolated func sessionReachabilityDidChange(_ session: WCSession) {
        Task { @MainActor [weak self] in
            _ = self?.owner
        }
    }
}
