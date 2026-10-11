import Combine
import SwiftUI
import WatchKit

/// The watch face of the Human-Key gate.
///
/// Black/electric-blue mirror of the phone's gate state plus one loud,
/// deliberate action: sending the wearer's Human-Key heartbeat. The watch
/// never renders a "granted" state of its own — it mirrors what the phone's
/// formula decided, and a heartbeat is a presence witness, not an approval.
struct WatchGateWatchView: View {
    @Environment(WatchPhoneLink.self) private var link

    @State private var now = Date()
    private let ticker = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        ScrollView {
            VStack(spacing: 10) {
                stateHeader

                legitimacyBlock

                Button {
                    link.sendHeartbeat()
                    let haptic = WKHapticType.notification
                    WKInterfaceDevice.current().play(haptic)
                } label: {
                    Label(link.isSendingHeartbeat ? "Sending…" : "Present Human Key", systemImage: "hand.raised.fill")
                        .font(.system(size: 15, weight: .semibold))
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(link.phoneState == .unlocked ? .cyan : .blue)
                .disabled(link.isSendingHeartbeat)

                if let result = link.lastHeartbeatResult {
                    Text(result)
                        .font(.system(size: 12))
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("A biometric on the iPhone is a local acknowledgement — never identity. This heartbeat is a presence witness — never an authorization. The gate refuses by default.")
                        .font(.system(size: 11))
                        .foregroundStyle(Color(red: 0.33, green: 0.63, blue: 0.85))
                }
                .padding(.top, 4)
            }
            .padding(.horizontal, 4)
        }
        .background(Color.black)
        .navigationTitle("Gate")
        .onReceive(ticker) { date in
            now = date
        }
    }

    private var stateHeader: some View {
        VStack(spacing: 4) {
            Image(systemName: headerIcon)
                .font(.system(size: 26, weight: .semibold))
                .foregroundStyle(headerColor)
            Text(headerText)
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(headerColor)
            Text(link.activationStateText)
                .font(.system(size: 11))
                .foregroundStyle(.secondary)
        }
        .padding(.top, 6)
    }

    private var headerIcon: String {
        switch link.phoneState {
        case .unlocked: return "checkmark.shield.fill"
        case .locked: return "lock.shield"
        case .unreachable: return "wifi.exclamationmark"
        case .unavailable: return "iphone.slash"
        }
    }

    private var headerColor: Color {
        switch link.phoneState {
        case .unlocked: return Color(red: 0.22, green: 0.92, blue: 0.94)
        case .locked, .unreachable, .unavailable: return Color(red: 0.5, green: 0.86, blue: 1.0)
        }
    }

    private var headerText: String {
        switch link.phoneState {
        case .unlocked: return "GATE OPEN"
        case .locked: return "GATE LOCKED"
        case .unreachable: return "IPHONE UNREACHABLE"
        case .unavailable: return "NO GATE STATE"
        }
    }

    private var legitimacyBlock: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("L = \(link.legitimacy.formatted(.number.precision(.fractionLength(2))))")
                    .font(.system(size: 14, weight: .semibold).monospacedDigit())
                Spacer()
                Text("τ = \(link.threshold.formatted(.number.precision(.fractionLength(2))))")
                    .font(.system(size: 12).monospacedDigit())
                    .foregroundStyle(.secondary)
            }
            GeometryReader { proxy in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Color.white.opacity(0.12))
                    Capsule()
                        .fill(link.legitimacy >= link.threshold ? Color(red: 0.22, green: 0.92, blue: 0.94) : Color(red: 0.0, green: 0.69, blue: 1.0))
                        .frame(width: max(0, min(1, link.legitimacy)) * proxy.size.width)
                }
            }
            .frame(height: 6)

            if let remaining = link.freshnessRemaining, remaining > 0 {
                Text("Freshness \(Int(remaining.rounded()))s")
                    .font(.system(size: 12).monospacedDigit())
                    .foregroundStyle(.secondary)
            } else {
                Text("Freshness window closed — verify on the phone")
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
            }
        }
        .padding(10)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(red: 0.012, green: 0.031, blue: 0.071))
        )
    }
}
