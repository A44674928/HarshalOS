import SwiftUI

struct SyncView: View {
    @Environment(AppModel.self) private var appModel

    var body: some View {
        NavigationStack {
            Form {
                Section("CloudKit private database") {
                    Text(appModel.cloudKitState.title)
                    Text("CloudKit is optional private-device synchronization. It is not an identity verifier, an independent witness, a replacement for backups, or an authorization system.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    Button("Check iCloud availability") {
                        Task { await appModel.checkCloudKit() }
                    }
                    Button("Mirror declaration and receipt") {
                        Task { await appModel.syncDeclarationToCloudKit() }
                    }
                    .disabled(!appModel.cloudKitState.isConfigured)
                }

                Section("Before enabling sync") {
                    Text("Set a real bundle identifier and Apple Developer team, add the iCloud/CloudKit capability in Xcode, create a private container, set HarshalCloudKitEnabled to YES, and deploy the HarshalPhaseDeclaration record type. See native/HarshalNative/docs/ARCHITECTURE.md.")
                        .font(.footnote)
                }
            }
            .navigationTitle("Private sync")
        }
    }
}
