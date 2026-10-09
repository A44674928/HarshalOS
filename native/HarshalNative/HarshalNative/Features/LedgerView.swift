import HarshalLedger
import SwiftUI

struct LedgerView: View {
    @Environment(AppModel.self) private var appModel

    var body: some View {
        NavigationStack {
            List {
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
            .navigationTitle("Local ledger")
        }
    }
}
