import Foundation
import HarshalMarkets
import SwiftUI

/// Account-scoped server PAPER_TEST surface with an explicit legacy local-fixture
/// review section below it. The shared server ledger is authoritative only after
/// native device pairing; neither surface creates a broker, payment, custody,
/// wallet, mining, or public-publishing action.
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

    // Account-scoped server PAPER_TEST controls. These values are input only;
    // credentials and pairing capabilities remain in Keychain through the
    // service layer and are never bound into persisted app state.
    @State private var remoteDeviceLabel = "My Harshal Native device"
    @State private var remoteInstrumentID = ""
    @State private var remoteThesis = ""
    @State private var remoteDirection = "HIGHER"
    @State private var remoteTargetDate = Calendar.current.date(byAdding: .month, value: 3, to: .now) ?? .now.addingTimeInterval(7_776_000)
    @State private var remoteDeclarationID: UUID?
    @State private var remotePositionSide = "LONG"
    @State private var remoteQuantity = "1"

    var body: some View {
        NavigationStack {
            List {
                remoteBoundarySection
                remotePairingSection
                remoteSnapshotSection
                remoteDeclarationSection
                remotePositionEntrySection
                remotePositionSection
                remoteOrbSection
                Section("Legacy on-device paper records") {
                    Text("The sections below are retained only for local review and migration awareness. They are not uploaded, merged, or treated as the shared account authority. Pair this device to use the server-side PAPER_TEST ledger above.")
                        .font(.footnote)
                        .foregroundStyle(HarshalTheme.secondaryText)
                }
                boundarySection
                fixtureSection
                declarationSection
                positionEntrySection
                positionSection
                recordSection
            }
            .scrollContentBackground(.hidden)
            .background(HarshalTheme.canvas)
            .navigationTitle("Paper market")
            .onAppear {
                synchronizeSelections()
                synchronizeRemoteSelections()
            }
            .onChange(of: appModel.paperLedgerState.declarations.count) { _, _ in
                synchronizeSelections()
            }
            .onChange(of: appModel.remotePaperMarketSnapshot?.generatedAt) { _, _ in
                synchronizeRemoteSelections()
            }
        }
    }

    private var remoteBoundarySection: some View {
        Section("Shared PAPER_TEST market authority") {
            if let phase = appModel.declaration?.phase {
                LabeledContent("This device phase", value: "\(phase.rawValue) · \(phase.name)")
            }
            Text(appModel.remotePaperMarketStatus)
                .font(.footnote)
                .foregroundStyle(appModel.hasRemotePaperMarketCredential ? HarshalTheme.secondaryText : HarshalTheme.warning)
            Text("The account-scoped Worker ledger is authoritative for shared paper declarations, positions, event history, server-issued quote references, valuation, and Market Orb placement. This native app renders validated server data; it contains no provider secret and makes no direct provider request.")
                .font(.footnote)
                .foregroundStyle(HarshalTheme.secondaryText)
            Text("PAPER_TEST only: no brokerage, trade execution, custody, payment, wallet, token issuance, recommendation, or device mining is available.")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(HarshalTheme.warning)
            Button("Refresh shared server snapshot") {
                Task { await appModel.refreshRemotePaperMarket() }
            }
            .buttonStyle(.borderedProminent)
            .disabled(!appModel.hasRemotePaperMarketCredential || appModel.isRemotePaperMarketBusy)
        }
    }

    @ViewBuilder
    private var remotePairingSection: some View {
        Section("Pair this native device") {
            if let pairing = appModel.remotePaperMarketPairing {
                LabeledContent("Device label", value: pairing.deviceLabel)
                LabeledContent("Pairing code") {
                    Text(pairing.pairingCode)
                        .font(.body.monospaced())
                }
                LabeledContent("Expires", value: dateString(milliseconds: pairing.expiresAt))
                Text("On a trusted browser, sign in to HarshalOS, open Account → PAPER_TEST market ledger, and enter this code exactly. The browser must explicitly approve it before this device can redeem a scoped credential.")
                    .font(.footnote)
                    .foregroundStyle(HarshalTheme.secondaryText)
                Text(pairing.approvalURL.absoluteString)
                    .font(.caption.monospaced())
                    .foregroundStyle(HarshalTheme.secondaryText)
                    .textSelection(.enabled)
                if let status = appModel.remotePaperMarketPairingStatus {
                    LabeledContent("Browser status", value: status.state.uppercased())
                    if status.canRedeem {
                        Button("Redeem approved PAPER_TEST credential") {
                            Task { await appModel.redeemRemotePaperMarketPairing() }
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(appModel.isRemotePaperMarketBusy)
                    }
                }
                HStack {
                    Button("Check pairing status") {
                        Task { await appModel.refreshRemotePaperMarketPairing() }
                    }
                    .buttonStyle(.bordered)
                    .disabled(appModel.isRemotePaperMarketBusy)

                    Button("Cancel local pairing", role: .destructive) {
                        appModel.cancelRemotePaperMarketPairing()
                        // Removing a local pairing capability never approves,
                        // revokes, or alters the server account.
                    }
                    .buttonStyle(.bordered)
                    .disabled(appModel.isRemotePaperMarketBusy)
                }
            } else if appModel.hasRemotePaperMarketCredential {
                Text("This device holds a Keychain-only scoped PAPER_TEST credential. Device revocation remains an explicit action in the signed-in browser account.")
                    .font(.footnote)
                    .foregroundStyle(HarshalTheme.secondaryText)
                Button("Forget credential on this device", role: .destructive) {
                    appModel.forgetRemotePaperMarketCredential()
                }
                .buttonStyle(.bordered)
                .disabled(appModel.isRemotePaperMarketBusy)
            } else {
                TextField("Device label", text: $remoteDeviceLabel)
                    .textFieldStyle(.roundedBorder)
                Button("Start native device pairing") {
                    Task { await appModel.beginRemotePaperMarketPairing(deviceLabel: remoteDeviceLabel) }
                }
                .buttonStyle(.borderedProminent)
                .disabled(appModel.isRemotePaperMarketBusy || remoteDeviceLabel.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                Text("Pairing creates a short-lived manual code and a private polling capability. Both are stored only in Keychain on this device; approval happens only after a browser session reviews the code.")
                    .font(.footnote)
                    .foregroundStyle(HarshalTheme.secondaryText)
            }
        }
    }

    @ViewBuilder
    private var remoteSnapshotSection: some View {
        Section("Server market field") {
            if let snapshot = appModel.remotePaperMarketSnapshot {
                LabeledContent("Snapshot", value: dateString(milliseconds: snapshot.generatedAt))
                LabeledContent("Field availability", value: snapshot.market.sourceAvailability)
                Text(snapshot.market.sourceMessage)
                    .font(.footnote)
                    .foregroundStyle(snapshot.market.sourceAvailability == "UNAVAILABLE" ? HarshalTheme.warning : HarshalTheme.secondaryText)
                if snapshot.market.instruments.isEmpty {
                    Text("No reviewed instruments are currently available. The app will not fabricate a price, quote, valuation, or Market Orb node.")
                        .font(.footnote)
                        .foregroundStyle(HarshalTheme.warning)
                } else {
                    Picker("Reviewed instrument", selection: $remoteInstrumentID) {
                        ForEach(remotePaperInstruments) { instrument in
                            Text("\(instrument.symbol) · \(instrument.availability)").tag(instrument.id)
                        }
                    }
                    if let instrument = selectedRemoteInstrument {
                        LabeledContent("Instrument", value: "\(instrument.displayName) · \(instrument.assetClass)")
                        LabeledContent("Server field", value: instrument.price.map { "\($0) \(instrument.quoteCurrency)" } ?? "\(instrument.availability) · no price")
                        LabeledContent("Source", value: "\(instrument.source.provider) · \(instrument.source.interval) · \(instrument.source.freshness)")
                        Text(instrument.paperEligible
                            ? "A new PAPER_TEST quote reference is requested from the Worker only when opening or closing a simulated position. This displayed field value is not itself executable."
                            : "This is display-only server-observed data. It cannot be selected for a paper position.")
                            .font(.footnote)
                            .foregroundStyle(HarshalTheme.secondaryText)
                    }
                }
            } else {
                Text("No shared server snapshot is loaded. Pair this device and refresh; local fixtures are not a substitute.")
                    .foregroundStyle(HarshalTheme.secondaryText)
            }
        }
    }

    @ViewBuilder
    private var remoteDeclarationSection: some View {
        Section("Record shared PAPER_TEST declaration") {
            if !appModel.hasRemotePaperMarketCredential {
                Text("Pair this device before recording a shared declaration. The legacy fixture declaration below remains separate and does not synchronize.")
                    .foregroundStyle(HarshalTheme.secondaryText)
            } else if let instrument = selectedRemoteInstrument {
                Picker("Direction", selection: $remoteDirection) {
                    Text("Higher").tag("HIGHER")
                    Text("Lower").tag("LOWER")
                    Text("Neutral").tag("NEUTRAL")
                }
                DatePicker("Target date", selection: $remoteTargetDate, displayedComponents: .date)
                TextEditor(text: $remoteThesis)
                    .frame(minHeight: 88)
                    .accessibilityLabel("Shared PAPER_TEST declaration thesis")
                Button("Record server PAPER_TEST declaration") {
                    Task {
                        await appModel.recordRemotePaperMarketDeclaration(
                            instrumentID: instrument.id,
                            direction: remoteDirection,
                            thesis: remoteThesis,
                            targetDate: remoteTargetDate
                        )
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(appModel.isRemotePaperMarketBusy || !instrument.paperEligible || instrument.availability != "AVAILABLE" || remoteThesis.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || remoteTargetDate <= .now)
                Text("The Worker validates the selected reviewed instrument and writes an append-only owner-scoped PAPER_TEST declaration. No private universe-core ID, declaration label, CloudKit record, or authorization claim leaves this app.")
                    .font(.footnote)
                    .foregroundStyle(HarshalTheme.secondaryText)
            } else {
                Text("Refresh a server field snapshot and select an available paper-eligible instrument.")
                    .foregroundStyle(HarshalTheme.secondaryText)
            }
        }
    }

    @ViewBuilder
    private var remotePositionEntrySection: some View {
        Section("Open shared PAPER_TEST position") {
            if remoteDeclarations.isEmpty {
                Text("Record a shared server declaration first. The Worker will issue a fresh immutable quote reference at the moment you open a simulation.")
                    .foregroundStyle(HarshalTheme.secondaryText)
            } else {
                Picker("Server declaration", selection: $remoteDeclarationID) {
                    ForEach(remoteDeclarations) { declaration in
                        Text("\(declaration.instrumentID) · \(declaration.direction) · \(declaration.phase)")
                            .tag(Optional(declaration.id))
                    }
                }
                Picker("Position side", selection: $remotePositionSide) {
                    Text("Long").tag("LONG")
                    Text("Short").tag("SHORT")
                }
                TextField("Simulated quantity", text: $remoteQuantity)
                    .textFieldStyle(.roundedBorder)
                Button("Open server PAPER_TEST position") {
                    guard let declarationID = remoteDeclarationID else { return }
                    Task {
                        await appModel.openRemotePaperMarketPosition(
                            declarationID: declarationID,
                            side: remotePositionSide,
                            quantity: remoteQuantity.trimmingCharacters(in: .whitespacesAndNewlines)
                        )
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(appModel.isRemotePaperMarketBusy || remoteDeclarationID == nil || !validRemoteQuantity)
                Text("The Worker, not this client, obtains and stores the entry quote reference. This creates no order, transfer, brokerage instruction, custody arrangement, payment, or market effect.")
                    .font(.footnote)
                    .foregroundStyle(HarshalTheme.secondaryText)
            }
        }
    }

    @ViewBuilder
    private var remotePositionSection: some View {
        Section("Shared server PAPER_TEST positions") {
            if remotePositions.isEmpty {
                Text("No shared positions are recorded for this account.")
                    .foregroundStyle(HarshalTheme.secondaryText)
            } else {
                ForEach(remotePositions) { position in
                    VStack(alignment: .leading, spacing: 7) {
                        HStack {
                            Text("\(position.instrumentID) · \(position.side)")
                                .font(.headline)
                            Spacer()
                            Text(position.state)
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(remoteStatusColor(position.state))
                        }
                        LabeledContent("Phase", value: position.phase)
                        LabeledContent("Quantity", value: position.quantity)
                        LabeledContent("Entry quote", value: "\(position.entryQuote.price) \(position.entryQuote.quoteCurrency)")
                        if let valuation = remoteValuation(for: position.id) {
                            LabeledContent("Server valuation", value: valuation.profitLoss.map { "\($0) \(valuation.quoteCurrency) · \(valuation.valuationState)" } ?? valuation.valuationState)
                        } else {
                            Text("Current valuation unavailable; no number was fabricated.")
                                .font(.footnote)
                                .foregroundStyle(HarshalTheme.warning)
                        }
                        if position.state == "OPEN" {
                            HStack {
                                Button("Close with fresh server quote") {
                                    Task { await appModel.closeRemotePaperMarketPosition(id: position.id) }
                                }
                                .buttonStyle(.bordered)
                                .disabled(appModel.isRemotePaperMarketBusy)
                                Button("Withdraw", role: .destructive) {
                                    Task { await appModel.withdrawRemotePaperMarketPosition(id: position.id) }
                                }
                                .buttonStyle(.bordered)
                                .disabled(appModel.isRemotePaperMarketBusy)
                            }
                        } else if let exitQuote = position.exitQuote {
                            LabeledContent("Exit quote", value: "\(exitQuote.price) \(exitQuote.quoteCurrency)")
                        }
                    }
                    .padding(.vertical, 3)
                }
            }
        }
    }

    @ViewBuilder
    private var remoteOrbSection: some View {
        Section("Server Market Orb") {
            if let orb = appModel.remotePaperMarketSnapshot?.orb {
                LabeledContent("Availability", value: orb.availability)
            LabeledContent("Placement authority", value: orb.placementAuthority)
            if let formation = orb.marketWide.formation, let convergence = orb.marketWide.convergence {
                LabeledContent("Formation / convergence", value: "\(Int((formation * 100).rounded()))% / \(Int((convergence * 100).rounded()))%")
            }
            Text(orb.placementMethod ?? orb.message ?? "Server-normalized display placement is unavailable.")
                .font(.footnote)
                .foregroundStyle(orb.availability == "UNAVAILABLE" ? HarshalTheme.warning : HarshalTheme.secondaryText)
            if !orb.marketWide.nodes.isEmpty {
                RemoteMarketOrbCanvas(nodes: orb.marketWide.nodes)
                    .frame(minHeight: 245)
                    .accessibilityLabel("Server-normalized Market Orb")
                    .accessibilityValue("\(orb.marketWide.nodes.count) server-placed market nodes")
                ForEach(orb.marketWide.nodes.prefix(12)) { node in
                    HStack {
                        Text("\(node.symbol) · sector \(String(format: "%03d", node.sector))")
                        Spacer()
                        Text(node.displayOnly ? "DISPLAY ONLY" : node.availability)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(node.displayOnly ? HarshalTheme.warning : HarshalTheme.secondaryText)
                    }
                }
            }
            Text(orb.cryptoBoundary ?? "Crypto display state is unavailable.")
                .font(.footnote)
                .foregroundStyle(HarshalTheme.secondaryText)
            } else {
                Text("A server Market Orb appears only with a validated shared snapshot.")
                    .foregroundStyle(HarshalTheme.secondaryText)
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
                .foregroundStyle(HarshalTheme.secondaryText)
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
                    .foregroundStyle(HarshalTheme.secondaryText)
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
                .foregroundStyle(HarshalTheme.secondaryText)
        }
    }

    @ViewBuilder
    private var positionEntrySection: some View {
        Section("Open simulated paper position") {
            if availableDeclarations.isEmpty {
                Text("Record a local market declaration before opening a simulated position.")
                    .foregroundStyle(HarshalTheme.secondaryText)
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
                    .foregroundStyle(HarshalTheme.secondaryText)
            }
        }
    }

    @ViewBuilder
    private var positionSection: some View {
        Section("Local paper positions") {
            if appModel.paperLedgerState.positions.isEmpty {
                Text("No local paper positions recorded.")
                    .foregroundStyle(HarshalTheme.secondaryText)
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
                    .foregroundStyle(HarshalTheme.secondaryText)
            } else {
                ForEach(appModel.paperLedgerState.events.reversed()) { event in
                    VStack(alignment: .leading, spacing: 4) {
                        Text("#\(event.sequence) · \(event.kind.rawValue)")
                            .font(.caption.weight(.semibold))
                        Text(event.instrumentID)
                            .font(.subheadline)
                        Text(event.detail)
                            .font(.caption.monospaced())
                            .foregroundStyle(HarshalTheme.secondaryText)
                    }
                    .padding(.vertical, 2)
                }
            }
        }
    }

    private var remotePaperInstruments: [RemotePaperMarketInstrument] {
        (appModel.remotePaperMarketSnapshot?.market.instruments ?? []).sorted { left, right in
            left.symbol < right.symbol
        }
    }

    private var selectedRemoteInstrument: RemotePaperMarketInstrument? {
        remotePaperInstruments.first(where: { $0.id == remoteInstrumentID })
    }

    private var remoteDeclarations: [RemotePaperMarketDeclaration] {
        (appModel.remotePaperMarketSnapshot?.ledger.declarations ?? []).sorted { $0.createdAt > $1.createdAt }
    }

    private var remotePositions: [RemotePaperMarketPosition] {
        (appModel.remotePaperMarketSnapshot?.ledger.positions ?? []).sorted { $0.openedAt > $1.openedAt }
    }

    private var validRemoteQuantity: Bool {
        let value = remoteQuantity.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let decimal = Decimal(string: value), decimal > 0 else { return false }
        return value.range(of: "^(?:0|[1-9][0-9]{0,17})(?:\\.[0-9]{1,12})?$", options: .regularExpression) != nil
    }

    private func remoteValuation(for positionID: UUID) -> RemotePaperMarketValuation? {
        appModel.remotePaperMarketSnapshot?.orb.accountOverlay.valuations.first(where: { $0.positionID == positionID })
    }

    private func remoteStatusColor(_ value: String) -> Color {
        switch value {
        case "OPEN": return HarshalTheme.electricBlue
        case "CLOSED": return HarshalTheme.verified
        case "WITHDRAWN": return HarshalTheme.warning
        default: return HarshalTheme.secondaryText
        }
    }

    private func dateString(milliseconds: Int64) -> String {
        Date(timeIntervalSince1970: TimeInterval(milliseconds) / 1000).formatted(date: .abbreviated, time: .shortened)
    }

    private func synchronizeRemoteSelections() {
        if selectedRemoteInstrument == nil {
            remoteInstrumentID = remotePaperInstruments.first(where: { $0.paperEligible && $0.availability == "AVAILABLE" })?.id
                ?? remotePaperInstruments.first?.id
                ?? ""
        }
        if let selected = remoteDeclarationID,
           !remoteDeclarations.contains(where: { $0.id == selected }) {
            remoteDeclarationID = nil
        }
        if remoteDeclarationID == nil {
            remoteDeclarationID = remoteDeclarations.first?.id
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

/// A renderer, not a placement engine: the Worker has already selected every
/// node's normalized x/y/z location and berth. This canvas applies only a fixed
/// camera projection so SwiftUI can draw that server-issued display directive.
private struct RemoteMarketOrbCanvas: View {
    let nodes: [RemotePaperMarketOrbNode]

    var body: some View {
        Canvas { context, size in
            guard size.width > 0, size.height > 0 else { return }
            let center = CGPoint(x: size.width / 2, y: size.height / 2)
            let radius = min(size.width, size.height) * 0.39
            let maxExtent = max(1.0, nodes.reduce(0.0) { current, node in
                max(current, max(abs(node.position.x), max(abs(node.position.y), abs(node.position.z))))
            })

            for fraction in [0.28, 0.52, 0.76, 1.0] {
                let ringRadius = radius * fraction
                let rect = CGRect(x: center.x - ringRadius, y: center.y - ringRadius * 0.42, width: ringRadius * 2, height: ringRadius * 0.84)
                context.stroke(Path(ellipseIn: rect), with: .color(HarshalTheme.electricBlue.opacity(0.16)), lineWidth: 0.7)
            }

            let projected = nodes.map { node -> (node: RemotePaperMarketOrbNode, point: CGPoint, depth: Double) in
                let x = node.position.x
                let y = node.position.y
                let z = node.position.z
                // Fixed camera transform only. It does not use raw market data,
                // recompute a radial band, or re-slot a node.
                let rotatedX = x * 0.93 - z * 0.37
                let rotatedZ = x * 0.37 + z * 0.93
                let tiltedY = y * 0.92 - rotatedZ * 0.24
                let depth = y * 0.24 + rotatedZ * 0.92
                let perspective = 1 / (2.75 + depth / maxExtent)
                let point = CGPoint(
                    x: center.x + CGFloat(rotatedX / maxExtent) * radius * CGFloat(perspective * 2.25),
                    y: center.y - CGFloat(tiltedY / maxExtent) * radius * CGFloat(perspective * 2.25)
                )
                return (node, point, depth)
            }.sorted { $0.depth < $1.depth }

            for item in projected {
                var attachment = Path()
                attachment.move(to: center)
                attachment.addLine(to: item.point)
                context.stroke(attachment, with: .color(color(for: item.node).opacity(0.28)), lineWidth: 0.65)
            }
            for item in projected {
                let nodeRadius = 4.4 + CGFloat(item.node.radialBand) * 0.9
                let rect = CGRect(x: item.point.x - nodeRadius, y: item.point.y - nodeRadius, width: nodeRadius * 2, height: nodeRadius * 2)
                context.fill(Path(ellipseIn: rect), with: .color(color(for: item.node).opacity(0.94)))
                context.stroke(Path(ellipseIn: rect), with: .color(.white.opacity(0.8)), lineWidth: 0.75)
            }
            let core = CGRect(x: center.x - 6, y: center.y - 6, width: 12, height: 12)
            context.fill(Path(ellipseIn: core), with: .color(.white.opacity(0.95)))
            context.stroke(Path(ellipseIn: core), with: .color(HarshalTheme.electricBlue), lineWidth: 1.2)
        }
        .background(HarshalTheme.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(HarshalTheme.electricBlue.opacity(0.35), lineWidth: 1))
    }

    private func color(for node: RemotePaperMarketOrbNode) -> Color {
        if node.displayOnly { return HarshalTheme.warning }
        if node.kind == "interaction" { return HarshalTheme.verified }
        return node.availability == "AVAILABLE" ? HarshalTheme.electricBlue : HarshalTheme.secondaryText
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
                .foregroundStyle(HarshalTheme.secondaryText)

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
        case .open: return HarshalTheme.electricBlue
        case .closed: return HarshalTheme.verified
        case .withdrawn: return HarshalTheme.warning
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
