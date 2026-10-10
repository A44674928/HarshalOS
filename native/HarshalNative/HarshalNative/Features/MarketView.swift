import Foundation
import HarshalMarkets
import SwiftUI

/// First local paper-market surface. It uses bundled deterministic fixtures only
/// and makes no network, broker, payment, or public-publishing request.
struct MarketView: View {
    @Environment(AppModel.self) private var appModel

    @State private var selectedFixtureID = HarshalMarketFixtures.alpha.id
    @State private var thesis = ""
    @State private var direction: MarketDirection = .higher
    @State private var visibilityIntent: MarketVisibilityIntent = .privateRecord
    @State private var targetDate = Calendar.current.date(byAdding: .month, value: 3, to: .now) ?? .now.addingTimeInterval(7_776_000)
    @State private var selectedDeclarationID: UUID?
    @State private var positionSide: PaperPositionSide = .long
    @State private var quantityText = "1"

    var body: some View {
        NavigationStack {
            List {
                boundarySection
                fixtureSection
                declarationSection
                positionEntrySection
                positionSection
                recordSection
            }
            .navigationTitle("Paper market")
            .onAppear(perform: synchronizeSelections)
            .onChange(of: appModel.paperLedgerState.declarations.count) { _, _ in
                synchronizeSelections()
            }
        }
    }

    private var boundarySection: some View {
        Section("Local paper-market boundary") {
            if let phase = appModel.declaration?.phase {
                LabeledContent("Declared phase", value: "\(phase.rawValue) · \(phase.name)")
            }
            Text("All declared body types may create local paper-market records. This feature uses deterministic bundled fixtures only; it does not publish, fetch live prices, transfer value, or send a broker instruction.")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
    }

    private var fixtureSection: some View {
        Section("Fixture market") {
            Picker("Fixture instrument", selection: $selectedFixtureID) {
                ForEach(appModel.marketFixtures) { fixture in
                    Text(fixture.label).tag(fixture.id)
                }
            }

            if let fixture = selectedFixture {
                LabeledContent("Instrument", value: fixture.instrument.symbol)
                LabeledContent("Entry fixture", value: money(fixture.entryObservation.price, currency: fixture.instrument.quoteCurrency))
                LabeledContent("Mark fixture", value: money(fixture.markObservation.price, currency: fixture.instrument.quoteCurrency))
                Text(fixture.note)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var declarationSection: some View {
        Section("Record market declaration") {
            Picker("Direction", selection: $direction) {
                ForEach(MarketDirection.allCases) { value in
                    Text(value.label).tag(value)
                }
            }
            DatePicker("Target date", selection: $targetDate, displayedComponents: .date)
            Picker("Visibility intent", selection: $visibilityIntent) {
                ForEach(MarketVisibilityIntent.allCases) { value in
                    Text(value.label).tag(value)
                }
            }
            TextEditor(text: $thesis)
                .frame(minHeight: 88)
                .accessibilityLabel("Market declaration thesis")

            Button("Record local market declaration") {
                guard let fixture = selectedFixture else { return }
                Task {
                    await appModel.recordMarketDeclaration(
                        instrument: fixture.instrument,
                        direction: direction,
                        thesis: thesis,
                        targetDate: targetDate,
                        visibilityIntent: visibilityIntent
                    )
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(selectedFixture == nil || thesis.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || targetDate <= .now)

            Text("A public-projection intent is metadata only in this build. It never publishes this declaration or exposes a private universe core.")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
    }

    @ViewBuilder
    private var positionEntrySection: some View {
        Section("Open simulated paper position") {
            if availableDeclarations.isEmpty {
                Text("Record a local market declaration before opening a simulated position.")
                    .foregroundStyle(.secondary)
            } else {
                Picker("Declaration", selection: $selectedDeclarationID) {
                    ForEach(availableDeclarations) { declaration in
                        Text("\(declaration.instrument.symbol) · \(declaration.direction.label)")
                            .tag(Optional(declaration.id))
                    }
                }
                Picker("Position side", selection: $positionSide) {
                    ForEach(PaperPositionSide.allCases) { side in
                        Text(side.label).tag(side)
                    }
                }
                TextField("Simulated quantity", text: $quantityText)
                    .textFieldStyle(.roundedBorder)

                Button("Open local paper position") {
                    guard let declaration = selectedDeclaration,
                          let fixture = fixture(for: declaration.instrument) else {
                        return
                    }
                    Task {
                        await appModel.openPaperPosition(
                            declarationID: declaration.id,
                            side: positionSide,
                            quantity: parsedQuantity ?? 0,
                            entryObservation: fixture.entryObservation
                        )
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(selectedDeclaration == nil || parsedQuantity == nil)

                Text("Opening records a simulation against the selected entry fixture. It does not create an order, custody arrangement, payment, or market effect.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
    }

    @ViewBuilder
    private var positionSection: some View {
        Section("Local paper positions") {
            if appModel.paperLedgerState.positions.isEmpty {
                Text("No local paper positions recorded.")
                    .foregroundStyle(.secondary)
            } else {
                ForEach(appModel.paperLedgerState.positions.reversed()) { position in
                    MarketPositionRow(
                        position: position,
                        fixture: fixture(for: position.instrument),
                        close: { observation in
                            Task { await appModel.closePaperPosition(id: position.id, observation: observation) }
                        },
                        withdraw: {
                            Task { await appModel.withdrawPaperPosition(id: position.id) }
                        }
                    )
                }
            }
        }
    }

    @ViewBuilder
    private var recordSection: some View {
        Section("Local paper ledger") {
            if appModel.paperLedgerState.events.isEmpty {
                Text("No paper-market events recorded.")
                    .foregroundStyle(.secondary)
            } else {
                ForEach(appModel.paperLedgerState.events.reversed()) { event in
                    VStack(alignment: .leading, spacing: 4) {
                        Text("#\(event.sequence) · \(event.kind.rawValue)")
                            .font(.caption.weight(.semibold))
                        Text(event.instrumentID)
                            .font(.subheadline)
                        Text(event.detail)
                            .font(.caption.monospaced())
                            .foregroundStyle(.secondary)
                    }
                    .padding(.vertical, 2)
                }
            }
        }
    }

    private var selectedFixture: MarketFixture? {
        appModel.marketFixtures.first(where: { $0.id == selectedFixtureID })
    }

    private var availableDeclarations: [MarketDeclaration] {
        appModel.paperLedgerState.declarations.sorted { $0.createdAt > $1.createdAt }
    }

    private var selectedDeclaration: MarketDeclaration? {
        guard let selectedDeclarationID else { return nil }
        return availableDeclarations.first(where: { $0.id == selectedDeclarationID })
    }

    private var parsedQuantity: Decimal? {
        let text = quantityText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let quantity = Decimal(string: text), quantity > 0 else { return nil }
        return quantity
    }

    private func fixture(for instrument: MarketInstrument) -> MarketFixture? {
        appModel.marketFixtures.first(where: { $0.instrument.id == instrument.id })
    }

    private func synchronizeSelections() {
        if selectedFixture == nil {
            selectedFixtureID = appModel.marketFixtures.first?.id ?? ""
        }
        if selectedDeclaration == nil {
            selectedDeclarationID = availableDeclarations.first?.id
        }
    }

    private func money(_ amount: Decimal?, currency: String) -> String {
        guard let amount else { return "Unavailable" }
        return "\(NSDecimalNumber(decimal: amount).stringValue) \(currency)"
    }
}

private struct MarketPositionRow: View {
    let position: PaperPosition
    let fixture: MarketFixture?
    let close: (MarketObservation) -> Void
    let withdraw: () -> Void

    private var valuation: PaperPositionValuation {
        switch position.status {
        case .open:
            guard let fixture else {
                return PaperValuation.finalValue(position: position)
            }
            return PaperValuation.markToMarket(position: position, observation: fixture.markObservation)
        case .closed, .withdrawn:
            return PaperValuation.finalValue(position: position)
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .firstTextBaseline) {
                Text("\(position.instrument.symbol) · \(position.side.label)")
                    .font(.headline)
                Spacer()
                Text(position.status.rawValue)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(statusColor)
            }
            LabeledContent("Phase", value: "\(position.phase.rawValue) · \(position.phase.name)")
            LabeledContent("Quantity", value: decimal(position.quantity))
            LabeledContent("P/L", value: money(valuation.profitLoss, currency: valuation.currency))
            Text(valuation.message)
                .font(.footnote)
                .foregroundStyle(.secondary)

            if position.status == .open, let fixture {
                HStack {
                    Button("Close at fixture mark") {
                        close(fixture.markObservation)
                    }
                    .buttonStyle(.bordered)

                    Button("Withdraw", role: .destructive) {
                        withdraw()
                    }
                    .buttonStyle(.bordered)
                }
            }
        }
        .padding(.vertical, 4)
    }

    private var statusColor: Color {
        switch position.status {
        case .open: return .blue
        case .closed: return .green
        case .withdrawn: return .orange
        }
    }

    private func decimal(_ value: Decimal) -> String {
        NSDecimalNumber(decimal: value).stringValue
    }

    private func money(_ value: Decimal?, currency: String) -> String {
        guard let value else { return "Unavailable" }
        return "\(decimal(value)) \(currency)"
    }
}
