import Foundation
import HarshalCore
import HarshalLedger
import SwiftUI

struct LedgerView: View {
    @Environment(AppModel.self) private var appModel

    @State private var observationText = ""
    @State private var newObservationVisibility: ObservationNoteVisibility = .privateNote
    @State private var observationFilter: ObservationNoteFilter = .privateNotes
    @State private var publicPseudonymDraft = ""
    @State private var pendingPublicationNoteID: UUID?

    var body: some View {
        NavigationStack {
            List {
                receiptSection
                observationSection
                ledgerEntriesSection
            }
            .navigationTitle("Local ledger")
        }
        .onAppear {
            if publicPseudonymDraft.isEmpty {
                publicPseudonymDraft = appModel.publicProfilePseudonym
            }
        }
        .confirmationDialog(
            "Prepare an unlisted public handoff?",
            isPresented: Binding(
                get: { pendingPublicationNoteID != nil },
                set: { presented in
                    if !presented { pendingPublicationNoteID = nil }
                }
            ),
            titleVisibility: .visible
        ) {
            if let noteID = pendingPublicationNoteID {
                Button("Send unlisted handoff") {
                    pendingPublicationNoteID = nil
                    Task { await appModel.preparePublicObservationPublication(noteID: noteID) }
                }
            }
            Button("Cancel", role: .cancel) {
                pendingPublicationNoteID = nil
            }
        } message: {
            Text("This sends only this note’s phase snapshot, exact text, and public pseudonym to HarshalOS Community. It does not publish the note. Publication still requires browser sign-in, code claim, review, consent, and a confirmed public receipt.")
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

            publicProfileEditor

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

            Text("Private notes remain in local app state. A Public note stays local until you deliberately prepare its Community handoff, manually claim it in the browser, review the exact text, and publish it. The app shows Published only after the public feed confirms a receipt.")
                .font(.footnote)
                .foregroundStyle(.secondary)

            if filteredObservations.isEmpty {
                Text(observationFilter.emptyState)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(filteredObservations) { note in
                    observationRow(note)
                }
            }
        }
    }

    private var publicProfileEditor: some View {
        VStack(alignment: .leading, spacing: 8) {
            TextField("Reusable public profile pseudonym", text: $publicPseudonymDraft)

            HStack {
                Button("Save public pseudonym") {
                    let source = publicPseudonymDraft
                    Task {
                        await appModel.savePublicProfilePseudonym(source)
                        publicPseudonymDraft = appModel.publicProfilePseudonym
                    }
                }
                .buttonStyle(.bordered)
                .disabled(publicPseudonymDraft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

                if !appModel.publicProfilePseudonym.isEmpty {
                    Label("Saved locally", systemImage: "checkmark.circle")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Text("This self-chosen label is separate from your declaration label. The HarshalOS site asks you to save or confirm it before a note becomes public; it is not verified identity.")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }

    @ViewBuilder
    private func observationRow(_ note: ObservationNote) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline) {
                Text(note.visibility.label)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(note.visibility.isPublicNote ? .orange : .secondary)
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

            if note.visibility.isPublicNote {
                publicPublicationControls(for: note)
            }
        }
        .padding(.vertical, 4)
    }

    @ViewBuilder
    private func publicPublicationControls(for note: ObservationNote) -> some View {
        if let publication = note.publicPublication {
            Divider()
            Text(publication.state.label)
                .font(.caption.weight(.semibold))
                .foregroundStyle(publicationColor(publication.state))

            switch publication.state {
            case .awaitingClaim:
                if let claimCode = appModel.claimCode(for: note.id) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("One-time browser claim code")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(claimCode)
                            .font(.caption.monospaced().weight(.semibold))
                            .textSelection(.enabled)
                    }
                } else {
                    Text("The local claim capability is unavailable or expired. This note remains unpublished; prepare a new explicit handoff if needed.")
                        .font(.footnote)
                        .foregroundStyle(.orange)
                }
                Link("Open HarshalOS publisher", destination: publication.publisherURL)
                    .font(.subheadline.weight(.semibold))
                Text("Sign in on the HarshalOS site, enter this code, review the exact note, and explicitly publish it. A code alone does not publish.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                publicationRefreshButton(note.id)

            case .claimed:
                if let claimCode = appModel.claimCode(for: note.id) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Browser recovery code")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(claimCode)
                            .font(.caption.monospaced().weight(.semibold))
                            .textSelection(.enabled)
                    }
                } else {
                    Text("The local recovery capability is unavailable or expired. The browser may still show an account-bound review record, but this app cannot confirm its status without a stored status capability.")
                        .font(.footnote)
                        .foregroundStyle(.orange)
                }
                Link("Open HarshalOS publisher", destination: publication.publisherURL)
                    .font(.subheadline.weight(.semibold))
                Text("The code has been claimed on the site. Complete the explicit Publish action there, then check this receipt. If the browser review screen was reloaded, the same signed-in account can enter this short-lived code again.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                publicationRefreshButton(note.id)

            case .published:
                if let publicURL = publication.publicURL {
                    Link("View published public note", destination: publicURL)
                        .font(.subheadline.weight(.semibold))
                }
                if let publishedAt = publication.publishedAt {
                    Text("Feed confirmation: \(publishedAt.formatted(date: .abbreviated, time: .shortened))")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                publicationRefreshButton(note.id, title: "Refresh public receipt")

            case .withdrawn, .hidden:
                if let publicURL = publication.publicURL {
                    Link("View public record", destination: publicURL)
                        .font(.subheadline.weight(.semibold))
                }
                Text("The public service reports this note is no longer visible in its active feed. External copies cannot be recalled.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                publicationRefreshButton(note.id, title: "Refresh public receipt")

            case .expired:
                Text("The unlisted handoff expired without publication. The local note remains available; preparing a new handoff sends a fresh, explicit public candidate.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                preparePublicationButton(note.id)
            }
        } else {
            Divider()
            Text("Local public-note draft — not yet sent to the public publisher.")
                .font(.footnote)
                .foregroundStyle(.secondary)
            preparePublicationButton(note.id)
        }
    }

    private func preparePublicationButton(_ noteID: UUID) -> some View {
        Button("Prepare public publication") {
            pendingPublicationNoteID = noteID
        }
        .buttonStyle(.bordered)
        .disabled(appModel.publicProfilePseudonym.isEmpty || appModel.isPreparingPublicObservation)
    }

    private func publicationRefreshButton(_ noteID: UUID, title: String = "Check publication") -> some View {
        Button(title) {
            Task { await appModel.refreshPublicObservationPublication(noteID: noteID) }
        }
        .buttonStyle(.bordered)
    }

    private func publicationColor(_ state: PublicObservationPublicationState) -> Color {
        switch state {
        case .published:
            return .green
        case .awaitingClaim, .claimed:
            return .orange
        case .withdrawn, .hidden, .expired:
            return .secondary
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
    case publicNotes

    var id: String { rawValue }

    var label: String {
        switch self {
        case .privateNotes: return "Private"
        case .publicNotes: return "Public"
        }
    }

    var emptyState: String {
        switch self {
        case .privateNotes: return "No private observations recorded."
        case .publicNotes: return "No public observations recorded."
        }
    }

    func includes(_ note: ObservationNote) -> Bool {
        switch self {
        case .privateNotes:
            return note.visibility == .privateNote
        case .publicNotes:
            return note.visibility.isPublicNote
        }
    }
}
