import HarshalCore
import SwiftUI

struct DashboardView: View {
    var body: some View {
        TabView {
            OverviewView()
                .tabItem { Label("Overview", systemImage: "square.grid.2x2") }
            GateView()
                .tabItem { Label("Gate", systemImage: "checkmark.shield") }
            LedgerView()
                .tabItem { Label("Ledger", systemImage: "list.bullet.rectangle") }
            SyncView()
                .tabItem { Label("Sync", systemImage: "icloud") }
        }
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
                                .foregroundStyle(.secondary)
                            LabeledContent("Declaration label", value: declaration.principalLabel)
                            LabeledContent("Verification", value: declaration.verification.label)
                            LabeledContent("Created", value: declaration.createdAt.formatted(date: .abbreviated, time: .shortened))
                            LabeledContent("Scope", value: declaration.executionScope)
                        }
                        .padding()
                        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
                    }

                    GroupBox("Local acknowledgement") {
                        VStack(alignment: .leading, spacing: 12) {
                            Text(statusText)
                                .font(.headline)
                            Text("This is an explicit, on-device acknowledgement for exercising the local model. It is not a human identity authenticator, behavioral screening mechanism, or production permission.")
                                .foregroundStyle(.secondary)
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
                            Text("Use Gate to inspect the complete local decision inputs and see a refusal or local-only model result.")
                            Text("Use Ledger to inspect and verify the declaration receipt.")
                        }
                        .foregroundStyle(.secondary)
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
        case .absent: "No local acknowledgement"
        case .pending: "Local acknowledgement pending"
        case .active: "Local acknowledgement active (freshness window applies)"
        case .failed: "Local acknowledgement failed"
        case .revoked: "Local acknowledgement revoked"
        }
    }
}
