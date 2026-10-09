import Foundation
import HarshalCore
import SwiftUI

struct GateView: View {
    @Environment(AppModel.self) private var appModel

    var body: some View {
        @Bindable var model = appModel

        NavigationStack {
            Form {
                Section("Local model input") {
                    TextField("Action label", text: $model.actionName)
                    factorRow("Addressability A(t)", value: $model.addressability)
                    factorRow("Representation R(t)", value: $model.representation)
                }

                Section("Recorded preconditions") {
                    Toggle("Bounded authorization recorded for this local model", isOn: $model.authorizationActive)
                    Toggle("Local session tuple bound", isOn: $model.sessionBound)
                    Toggle("Technical attribution recorded", isOn: $model.technicalAttribution)
                    Toggle("Operational accountability recorded", isOn: $model.operationalAccountability)
                    Text("These switches are transparent model inputs. Switching one on does not create external approval, independent attribution, or legal accountability.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section {
                    Button("Evaluate refusal-first gate") {
                        model.evaluateGate()
                    }
                    .buttonStyle(.borderedProminent)
                }

                if let result = model.gateEvaluation {
                    Section("Decision") {
                        LabeledContent("Outcome", value: result.decision.rawValue)
                        LabeledContent("Code", value: result.code.rawValue)
                        LabeledContent("L(t)", value: String(format: "%.3f", result.legitimacy))
                        LabeledContent("Scope S(t)", value: String(format: "%.3f", result.temporalScope))
                        if let elapsed = result.elapsedVerificationSeconds {
                            LabeledContent("Elapsed", value: String(format: "%.0f seconds", elapsed))
                        }
                        Text(result.reason)
                            .foregroundStyle(result.permitted ? .green : .orange)
                        Text("\(result.assurance) · \(result.executionScope)")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }

                    Section("Canonical stages") {
                        stageRow("Identity", result.stages.identity)
                        stageRow("Representation", result.stages.representation)
                        stageRow("Authorization", result.stages.authorization)
                        stageRow("Continuity", result.stages.continuity)
                        stageRow("Accountability", result.stages.accountability)
                        Text("Decision is terminal: Permit is a local model result only; Refuse is the default.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("Refusal-first gate")
        }
    }

    private func factorRow(_ title: String, value: Binding<Double>) -> some View {
        VStack(alignment: .leading) {
            HStack {
                Text(title)
                Spacer()
                Text(value.wrappedValue, format: .number.precision(.fractionLength(2)))
                    .monospacedDigit()
            }
            Slider(value: value, in: 0...1)
        }
    }

    private func stageRow(_ title: String, _ passes: Bool) -> some View {
        LabeledContent(title) {
            Label(passes ? "Pass" : "Fail", systemImage: passes ? "checkmark.circle.fill" : "xmark.circle.fill")
                .foregroundStyle(passes ? .green : .red)
        }
    }
}
