import HarshalCore
import SwiftUI

struct OnboardingFlowView: View {
    @Environment(AppModel.self) private var appModel
    @State private var isNeoOrbPreviewPresented = false

    var body: some View {
        @Bindable var model = appModel

        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Harshal Native")
                            .font(.largeTitle.bold())
                        Text("A Swift-native, refusal-first local demonstration")
                            .font(.title3)
                            .foregroundStyle(.secondary)
                    }

                    GroupBox("NEO ORB — display-only shape study") {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Preview the native NEO ORB now. It is a local visual/geometry study and does not create or modify a declaration, acknowledgement, gate result, ledger entry, sync record, route, or permission.")
                                .foregroundStyle(.secondary)
                            Button("Preview NEO ORB") {
                                isNeoOrbPreviewPresented = true
                            }
                            .buttonStyle(.bordered)
                        }
                        .padding(.vertical, 4)
                    }

                    DisclosureGroup("What this onboarding does—and does not do", isExpanded: .constant(true)) {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("This flow records an explicit phase declaration, required acknowledgements, and a local receipt.")
                            Text("It does not determine whether someone is honest, prevent theft or betrayal, prove identity, perform a background check, or confer legal authority. Those claims require separately designed external identity, authorization, review, privacy, and appeal processes.")
                                .foregroundStyle(.secondary)
                        }
                        .padding(.top, 4)
                    }
                    .padding()
                    .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))

                    GroupBox("1. Local principal reference") {
                        VStack(alignment: .leading, spacing: 12) {
                            TextField("Declaration label (not an identity claim)", text: $model.declarationDraft.principalLabel)
                                .textFieldStyle(.roundedBorder)
                            LabeledContent("Verification", value: "Self-declared")
                            Text("No external identity/attestation provider is configured in this build. The app will not let a local declaration self-label as externally attested.")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 4)
                    }

                    GroupBox("2. Declare an operating phase") {
                        VStack(alignment: .leading, spacing: 12) {
                            Picker("Declared phase", selection: $model.declarationDraft.phase) {
                                ForEach(DeclaredPhase.allCases) { phase in
                                    Text("\(phase.rawValue) — \(phase.name)").tag(phase)
                                }
                            }
                            .pickerStyle(.segmented)
                            .onChange(of: model.declarationDraft.phase) { _, _ in
                                // Collapse acknowledgements are bound to one explicit GSRB declaration attempt.
                                model.declarationDraft.collapseAcknowledgments = []
                            }
                            Text(model.declarationDraft.phase.shortDescription)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 4)
                    }

                    if model.declarationDraft.phase == .gsrb {
                        GroupBox("3. GSRB — God-Sovereign Religious Body protocol") {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("God-Sovereign Religious Body (GSRB) remains non-executing in this starter. To record this declaration, acknowledge the five canonical collapse statements once and in order.")
                                    .foregroundStyle(.secondary)
                                ForEach(CollapseAcknowledgment.allCases) { step in
                                    let index = CollapseAcknowledgment.allCases.firstIndex(of: step) ?? 0
                                    let completed = index < model.declarationDraft.collapseAcknowledgments.count
                                    Label(
                                        step.title,
                                        systemImage: completed ? "checkmark.circle.fill" : "circle"
                                    )
                                    .foregroundStyle(completed ? .green : .secondary)
                                }
                                if let next = model.declarationDraft.nextGSrbCollapseAcknowledgment {
                                    Button("Acknowledge step \(model.declarationDraft.collapseAcknowledgments.count + 1): \(next.title)") {
                                        model.acknowledgeNextGSrbCollapseStep()
                                    }
                                    .buttonStyle(.bordered)
                                } else if model.declarationDraft.hasCompleteGSrbCollapseProtocol {
                                    Label("Canonical collapse protocol complete", systemImage: "checkmark.seal.fill")
                                        .foregroundStyle(.green)
                                } else {
                                    Label("Collapse protocol is malformed; restart this declaration phase.", systemImage: "exclamationmark.triangle.fill")
                                        .foregroundStyle(.orange)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }

                    GroupBox(model.declarationDraft.phase == .gsrb ? "4. Required acknowledgements" : "3. Required acknowledgements") {
                        VStack(alignment: .leading, spacing: 12) {
                            ForEach(
                                DeclarationAcknowledgment.required(for: model.declarationDraft.phase)
                                    .sorted { $0.rawValue < $1.rawValue }
                            ) { acknowledgement in
                                Toggle(
                                    acknowledgement.title,
                                    isOn: Binding(
                                        get: { model.declarationDraft.acknowledgments.contains(acknowledgement) },
                                        set: { accepted in
                                            if accepted {
                                                model.declarationDraft.acknowledgments.insert(acknowledgement)
                                            } else {
                                                model.declarationDraft.acknowledgments.remove(acknowledgement)
                                            }
                                        }
                                    )
                                )
                            }
                        }
                        .padding(.vertical, 4)
                    }

                    Button {
                        Task { await model.createDeclaration() }
                    } label: {
                        HStack {
                            Spacer()
                            if model.isSubmittingDeclaration {
                                ProgressView().tint(.white)
                            } else {
                                Text("Create local phase declaration")
                            }
                            Spacer()
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .disabled(model.isSubmittingDeclaration)

                    Text("A declaration produces a device-local, SHA-256 hash-chain receipt. It is not a signature, external witness, production credential, or authority grant.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                .padding()
                .frame(maxWidth: 760, alignment: .leading)
            }
            .navigationTitle("Native declaration")
            .sheet(isPresented: $isNeoOrbPreviewPresented) {
                NeoOrbView(isPreview: true)
            }
        }
    }
}
