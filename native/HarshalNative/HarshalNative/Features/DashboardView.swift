import HarshalCore
import SwiftUI

struct DashboardView: View {
    var body: some View {
        TabView {
            OverviewView()
                .tabItem { Label("Overview", systemImage: "square.grid.2x2") }
            LibraryView()
                .tabItem { Label("Library", systemImage: "books.vertical") }
            MarketView()
                .tabItem { Label("Markets", systemImage: "chart.line.uptrend.xyaxis") }
            NeoOrbView()
                .tabItem { Label("NEO ORB", systemImage: "circle.dotted") }
            GateView()
                .tabItem { Label("Gate", systemImage: "checkmark.shield") }
            SupplyChainView()
                .tabItem { Label("SCAV++", systemImage: "shield.lefthalf.filled") }
            LedgerView()
                .tabItem { Label("Ledger", systemImage: "list.bullet.rectangle") }
            SyncView()
                .tabItem { Label("Sync", systemImage: "icloud") }
        }
        .tint(HarshalTheme.electricBlue)
        .background(HarshalTheme.canvas)
    }
}

private struct OverviewView: View {
    @Environment(AppModel.self) private var appModel

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    if let declaration = appModel.declaration {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("\(declaration.phase.rawValue) · \(declaration.phase.name)")
                                .font(.title.bold())
                            Text(declaration.phase.shortDescription)
                                .foregroundStyle(HarshalTheme.secondaryText)
                            LabeledContent("Declaration label", value: declaration.principalLabel)
                            LabeledContent("Verification", value: declaration.verification.label)
                            LabeledContent("Created", value: declaration.createdAt.formatted(date: .abbreviated, time: .shortened))
                            LabeledContent("Scope", value: declaration.executionScope)
                        }
                        .padding()
                        .harshalPanel()
                    }

                    GroupBox("Local acknowledgement") {
                        VStack(alignment: .leading, spacing: 12) {
                            Text(statusText)
                                .font(.headline)
                            Text("This is an explicit, on-device acknowledgement for exercising the local model. It is not a human identity authenticator, behavioral screening mechanism, or production permission.")
                                .foregroundStyle(HarshalTheme.secondaryText)
                            HStack {
                                Button("Record local acknowledgement") {
                                    Task { await appModel.activateLocalAcknowledgement() }
                                }
                                .buttonStyle(.borderedProminent)
                                .disabled(appModel.localAttestation == .pending)

                                Button("Revoke", role: .destructive) {
                                    Task { await appModel.revokeLocalAcknowledgement() }
                                }
                                .disabled(appModel.localAttestation == .absent || appModel.localAttestation == .revoked)
                            }
                        }
                        .padding(.vertical, 4)
                    }

                    GroupBox("Next") {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Use Library to read the locally bundled AGS v0.2 full book, navigate its source map, and open curated repository companions in your platform browser.")
                            Text("Use Markets to record fixture-only paper declarations and simulated positions for any declared phase.")
                            Text("Use Gate to inspect modeled external-action inputs and see a refusal or local-only model result.")
                            Text("Use SCAV++ to examine the defensive supply-chain boundary. It refuses component embedding, delegated authority, external automation, and privileged downstream requests.")
                            Text("Use Ledger to inspect the declaration receipt, record private/public observations, and explicitly publish a bounded public note through the Community handoff.")
                        }
                        .foregroundStyle(HarshalTheme.secondaryText)
                        .padding(.vertical, 4)
                    }

                    Button("Start a new declaration", role: .destructive) {
                        Task { await appModel.startNewDeclaration() }
                    }
                    .padding(.top, 8)
                }
                .padding()
                .frame(maxWidth: 760, alignment: .leading)
            }
            .navigationTitle("Harshal Native")
        }
    }

    private var statusText: String {
        switch appModel.localAttestation {
        case .absent: return "No local acknowledgement"
        case .pending: return "Local acknowledgement pending"
        case .active: return "Local acknowledgement active (freshness window applies)"
        case .failed: return "Local acknowledgement failed"
        case .revoked: return "Local acknowledgement revoked"
        }
    }
}
