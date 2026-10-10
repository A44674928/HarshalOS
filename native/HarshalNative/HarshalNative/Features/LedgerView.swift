import HarshalCore
import HarshalLedger
import SwiftUI

struct LedgerView: View {
    @Environment(AppModel.self) private var appModel

    @State private var observationText = ""
    @State private var newObservationVisibility: ObservationNoteVisibility = .privateNote
    @State private var observationFilter: ObservationNoteFilter = .privateNotes

    var body: some View {
        NavigationStack {
            List {
                receiptSection
                observationSection
                ledgerEntriesSection
            }
            .navigationTitle("Local ledger")
        }
    }

    @ViewBuilder
    private var receiptSection: some View {
        if let receipt = appModel.receipt {
            Section("Local receipt") {
                LabeledContent("Schema", value: receipt.schema)
                LabeledContent("Subject", value: receipt.subjectType)
                LabeledContent("Receipt row", value: "#\(receipt.receiptEntryID)")
                VStack(alignment: .leading, spacing: 4) {
                    Text("Ledger root")
                    Text(receipt.ledgerRoot)
                        .font(.caption.monospaced())
                        .textSelection(.enabled)
                }
                if let verification = appModel.receiptVerification {
                    Label(verification.message, systemImage: verification.verified ? "checkmark.seal.fill" : "exclamationmark.triangle.fill")
                        .foregroundStyle(verification.verified ? .green : .orange)
                }
                Button("Verify local receipt") {
                    Task { await appModel.verifyReceipt() }
                }
            }
        }
    }

    private var observationSection: some View {
        Section("Observations") {
            Picker("View notes", selection: $observationFilter) {
                ForEach(ObservationNoteFilter.allCases) { filter in
                    Text(filter.label).tag(filter)
                }
            }
            .pickerStyle(.segmented)

            Picker("New note visibility", selection: $newObservationVisibility) {
                ForEach(ObservationNoteVisibility.allCases) { visibility in
                    Text(visibility.label).tag(visibility)
                }
            }

            TextEditor(text: $observationText)
                .frame(minHeight: 84)
                .accessibilityLabel("Observation note")

            Button("Record observation") {
                let text = observationText
                let visibility = newObservationVisibility
                Task {
                    await appModel.recordObservation(text: text, visibility: visibility)
                    observationText = ""
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(observationText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

            Text("Private notes remain in local app state. Public-note intent is viewable here but does not publish a note, add it to Orb 2, or make it visible to any peer.")
                .font(.footnote)
                .foregroundStyle(.secondary)

            if filteredObservations.isEmpty {
                Text(observationFilter.emptyState)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(filteredObservations) { note in
                    VStack(alignment: .leading, spacing: 5) {
                        HStack(alignment: .firstTextBaseline) {
                            Text(note.visibility.label)
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(note.visibility.isPublicIntent ? .orange : .secondary)
                            Spacer()
                            Text(note.createdAt, format: .dateTime.year().month().day().hour().minute())
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        Text(note.text)
                            .textSelection(.enabled)
                        Text("\(note.phase.rawValue) · \(note.phase.name)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 3)
                }
            }
        }
    }

    private var ledgerEntriesSection: some View {
        Section("Local hash-chain entries") {
            if appModel.ledgerEntries.isEmpty {
                Text("No entries recorded yet.")
                    .foregroundStyle(.secondary)
            }
            ForEach(appModel.ledgerEntries.reversed()) { entry in
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("#\(entry.id) · \(entry.severity.rawValue.uppercased())")
                            .font(.caption.weight(.semibold))
                        Spacer()
                        Text(entry.timestamp, format: .dateTime.year().month().day().hour().minute().second())
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    Text(entry.event)
                        .font(.subheadline)
                    Text(entry.hash)
                        .font(.caption2.monospaced())
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                .padding(.vertical, 3)
            }
        }
    }

    private var filteredObservations: [ObservationNote] {
        appModel.observationNotes
            .filter { observationFilter.includes($0) }
            .sorted { $0.createdAt > $1.createdAt }
    }
}

private enum ObservationNoteFilter: String, CaseIterable, Identifiable {
    case privateNotes
    case publicIntent

    var id: String { rawValue }

    var label: String {
        switch self {
        case .privateNotes: return "Private"
        case .publicIntent: return "Public intent"
        }
    }

    var emptyState: String {
        switch self {
        case .privateNotes: return "No private observations recorded."
        case .publicIntent: return "No public-intent observations recorded."
        }
    }

    func includes(_ note: ObservationNote) -> Bool {
        switch self {
        case .privateNotes:
            return note.visibility == .privateNote
        case .publicIntent:
            return note.visibility == .publicProjectionRequested
        }
    }
}
