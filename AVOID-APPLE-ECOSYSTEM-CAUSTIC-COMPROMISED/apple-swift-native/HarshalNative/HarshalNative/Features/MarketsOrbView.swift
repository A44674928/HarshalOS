import HarshalCore
import SwiftUI

/// The combined **Markets · NEO ORB** tab.
///
/// One tab, two panes:
/// - **Markets** — the fully-fledged paper trading simulator over the
///   Good Intelligence ticker board (live Worker readings when configured,
///   labelled simulated ticks otherwise).
/// - **NEO ORB** — the combined orb: Orb 2 (the Good Intelligence ticker-orb
///   model) burning inside The Orb (the dual fractal flame engines).
///
/// The full NEO ORB + simulator + gate dial set lives in a single
/// tucked-away Settings panel behind the toolbar gear, so the orb itself
/// stays on stage.
struct MarketsOrbView: View {
    @Environment(AppModel.self) private var appModel

    enum Pane: String, CaseIterable, Identifiable {
        case markets
        case neoOrb

        var id: String { rawValue }

        var label: String {
            switch self {
            case .markets: return "Markets"
            case .neoOrb: return "NEO ORB"
            }
        }
    }

    @State private var pane: Pane = .markets
    @State private var settingsPresented = false
    @State private var ledgerPresented = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("Surface", selection: $pane) {
                    ForEach(Pane.allCases) { selectedPane in
                        Text(selectedPane.label).tag(selectedPane)
                    }
                }
                .pickerStyle(.segmented)
                .labelsHidden()
                .padding(.horizontal)
                .padding(.top, 8)

                Group {
                    switch pane {
                    case .markets:
                        TradingSimulatorView()
                    case .neoOrb:
                        NeoOrbCombinedView()
                    }
                }
                .frame(maxHeight: .infinity)
            }
            .background(HarshalTheme.canvas)
            .navigationTitle("Markets · NEO ORB")
            .toolbar {
                ToolbarItemGroup(placement: .primaryAction) {
                    Button {
                        settingsPresented = true
                    } label: {
                        Label("Dial in NEO ORB", systemImage: "gearshape")
                    }
                    .accessibilityLabel("Open Markets and NEO ORB settings")

                    Button {
                        ledgerPresented = true
                    } label: {
                        Label("Shared PAPER_TEST ledger", systemImage: "server.rack")
                    }
                }
            }
            .sheet(isPresented: $settingsPresented) {
                MarketsOrbSettingsView()
                    .environment(appModel)
            }
            .sheet(isPresented: $ledgerPresented) {
                MarketView()
                    .environment(appModel)
            }
            .onAppear {
                appModel.marketsOrb.startBoard()
            }
        }
    }
}

/// The live gate readout shown above the simulator: the gating formula's
/// factors, rendered as an honest fail-closed display. It never claims the
/// biometric proves identity — it reports exactly which factors are present.
struct GateStatusBanner: View {
    @Environment(AppModel.self) private var appModel

    var body: some View {
        let gate = appModel.marketsOrb.gate
        let settings = appModel.marketsOrb.settings.gate

        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: gateBadgeSystemImage)
                    .foregroundStyle(gateBadgeColor)
                Text(gateTitle)
                    .font(.subheadline.weight(.semibold))
                Spacer()
                if gate.lastVerdict?.isPermit == true {
                    Text("τ = \(settings.threshold.formatted(.number.precision(.fractionLength(2))))")
                        .font(.caption2.monospaced())
                        .foregroundStyle(HarshalTheme.secondaryText)
                }
            }

            GateFactorRow(
                name: "H · Human key",
                value: gate.lastVerificationSucceeded ? 1 : 0,
                detail: gate.biometricsAvailable
                    ? (gate.lastVerificationSucceeded ? "Verified in this window" : "Available — not yet verified")
                    : "No biometric authenticator on this device"
            )
            GateFactorRow(
                name: "A · Addressability",
                value: appModel.localAttestation == .active ? 1 : 0.5,
                detail: appModel.localAttestation == .active ? "Local acknowledgement active" : "No local acknowledgement"
            )
            GateFactorRow(
                name: "W · Watch witness",
                value: gate.witnessFactor(settings: settings),
                detail: witnessDetail
            )
            GateFactorRow(
                name: "S · Freshness δ=\(Int(settings.freshnessSeconds))s",
                value: freshnessScope,
                detail: freshnessDetail
            )

            if let verdict = gate.lastVerdict {
                switch verdict {
                case let .permit(legitimacy):
                    Text("PERMIT — L = \(legitimacy.formatted(.number.precision(.fractionLength(3)))). This gate is a local acknowledgement; it is not identity, and it authorizes nothing outside this app.")
                        .font(.caption)
                        .foregroundStyle(HarshalTheme.verified)
                case let .refuse(reason):
                    Text("\(reason.label) — \(refuseDetail(reason)). Default state: refusal.")
                        .font(.caption)
                        .foregroundStyle(HarshalTheme.warning)
                }
            }
        }
        .padding(12)
        .harshalPanel(cornerRadius: 14)
    }

    private var gateBadgeSystemImage: String {
        if appModel.marketsOrb.gate.lastVerdict?.isPermit == true {
            return "checkmark.shield.fill"
        }
        return "lock.shield"
    }

    private var gateBadgeColor: Color {
        appModel.marketsOrb.gate.lastVerdict?.isPermit == true ? HarshalTheme.verified : HarshalTheme.secondaryText
    }

    private var gateTitle: String {
        switch appModel.marketsOrb.gate.sessionState {
        case .unsupported:
            return "Human-Key gate · no watch link on this platform — no permit path"
        case .notPaired:
            return "Human-Key gate · no Apple Watch paired — no permit path"
        case .active, .activating, .inactive:
            return "Human-Key gate · Apple Watch link"
        }
    }

    private var witnessDetail: String {
        let gate = appModel.marketsOrb.gate
        switch gate.witness {
        case let .beat(date):
            return "Heartbeat received \(date.formatted(date: .omitted, time: .standard))"
        case .reachableAwaitingBeat:
            return "Watch reachable — no Human-Key beat yet"
        case .unavailable:
            return gate.watchPaired
                ? "Watch paired but not reachable — no beat can arrive"
                : "No Apple Watch paired — W = 0 in every policy"
        }
    }

    private var freshnessScope: Double {
        guard let verification = appModel.marketsOrb.gate.lastVerification,
              appModel.marketsOrb.gate.lastVerificationSucceeded else {
            return 0
        }
        return GateFormula.scope(
            at: Date().timeIntervalSince(verification),
            verificationDelay: appModel.marketsOrb.settings.gate.freshnessSeconds
        )
    }

    private var freshnessDetail: String {
        guard let verification = appModel.marketsOrb.gate.lastVerification,
              appModel.marketsOrb.gate.lastVerificationSucceeded else {
            return "No verification clock running"
        }
        let remaining = max(0, appModel.marketsOrb.settings.gate.freshnessSeconds - Date().timeIntervalSince(verification))
        return "\(Int(remaining.rounded()))s of window remaining"
    }

    private func refuseDetail(_ reason: GateFormula.RefusalReason) -> String {
        switch reason {
        case .missingHumanKey:
            return "verify the on-device Human key first"
        case .unverified:
            return "no successful verification is on record"
        case .expired:
            return "the freshness window has fully decayed"
        case .missingWitness:
            return "policy requires a fresh watch heartbeat"
        case .belowThreshold:
            return "the product of factors did not reach τ"
        }
    }
}

/// One formula factor with a plain capacity bar (deliberately not a Gauge,
/// so the readout renders identically on iOS and macOS).
struct GateFactorRow: View {
    let name: String
    let value: Double
    let detail: String

    var body: some View {
        HStack(spacing: 10) {
            Text(name)
                .font(.caption.monospaced())
                .foregroundStyle(HarshalTheme.secondaryText)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            GeometryReader { proxy in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(HarshalTheme.mutedText.opacity(0.25))
                    Capsule()
                        .fill(value >= 1 ? HarshalTheme.verified : HarshalTheme.electricBlue)
                        .frame(width: max(0, min(1, value.isFinite ? value : 0)) * proxy.size.width)
                }
            }
            .frame(width: 64, height: 6)
            .accessibilityLabel(name)
            .accessibilityValue("\(Int((value.isFinite ? value : 0) * 100)) percent")
            Text(detail)
                .font(.caption2)
                .foregroundStyle(HarshalTheme.mutedText)
                .lineLimit(1)
                .minimumScaleFactor(0.85)
        }
    }
}

/// The tucked-away, full-featured dial-in panel for the combined surface:
/// The Orb's flame engines, Orb 2's ticker model, the shared shape, the
/// paper-simulator fee/tick model, and the Human-Key gate policy.
///
/// Edits land in a local draft and apply (sanitize + persist) live, so
/// moving a slider while the orb is visible updates it immediately; the
/// draft reverts if the panel is dismissed without the user changing
/// anything after a settings reset.
struct MarketsOrbSettingsView: View {
    @Environment(AppModel.self) private var appModel
    @Environment(\.dismiss) private var dismiss
    @State private var draft = MarketsOrbSettings.default
    @State private var loadedDraft = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text("These dials change local display and simulation behavior only. No dial changes a declaration, a market fact, or any authority.")
                        .font(.footnote)
                        .foregroundStyle(HarshalTheme.secondaryText)
                }

                flameSection
                orb2Section
                shapeSection
                simulatorSection
                gateSection

                Section("Reset") {
                    Button("Restore default dials", role: .destructive) {
                        appModel.marketsOrb.resetSettings()
                        draft = appModel.marketsOrb.settings
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(HarshalTheme.canvas)
            .navigationTitle("Markets · ORB settings")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .onAppear {
                guard !loadedDraft else { return }
                loadedDraft = true
                draft = appModel.marketsOrb.settings
            }
            .onChange(of: draft) { _, newValue in
                appModel.marketsOrb.apply(newValue)
            }
        }
        #if os(macOS)
        .frame(minWidth: 480, idealWidth: 540, minHeight: 540)
        #endif
    }

    // MARK: Flame engines

    private var flameSection: some View {
        Section("The Orb — dual fractal flame engines") {
            Toggle("Inner engine · Demo.flame · 120 frames", isOn: $draft.flameInnerEnabled)
            Toggle("Outer engine · OuterOrb.flame · 600 frames", isOn: $draft.flameOuterEnabled)
            Toggle("Animate films", isOn: $draft.flameAnimationEnabled)

            HStack {
                Text("Inner opacity")
                Slider(value: $draft.flameInnerOpacity, in: 0...1)
                settingsValue(draft.flameInnerOpacity)
            }
            HStack {
                Text("Outer opacity")
                Slider(value: $draft.flameOuterOpacity, in: 0...1)
                settingsValue(draft.flameOuterOpacity)
            }
            HStack {
                Text("Inner scale")
                Slider(value: $draft.flameInnerScale, in: 0.2...1)
                settingsValue(draft.flameInnerScale)
            }
            HStack {
                Text("Outer scale")
                Slider(value: $draft.flameOuterScale, in: 0.2...1)
                settingsValue(draft.flameOuterScale)
            }
            HStack {
                Text("Exposure")
                Slider(value: $draft.flameExposure, in: 0.25...3)
                settingsValue(draft.flameExposure)
            }
            HStack {
                Text("Bake quality")
                Slider(value: $draft.flameQuality, in: 0.25...2)
                settingsValue(draft.flameQuality)
            }
            Text("Both films are the author's own .flame renders, interpreted on-device by the native engine. Higher bake quality costs more CPU per frame.")
                .font(.caption2)
                .foregroundStyle(HarshalTheme.mutedText)
        }
    }

    // MARK: Orb 2

    private var orb2Section: some View {
        Section("Orb 2 — Good Intelligence ticker model") {
            Toggle("Ticker orbs (52-asset roster)", isOn: $draft.orb2TickerOrbsEnabled)
            Toggle("Ticker labels", isOn: $draft.orb2ShowLabels)
            Toggle("Beat motion", isOn: $draft.orb2BeatMotion)
            Toggle("Declared-phase rotation shift", isOn: $draft.orb2PhaseShift)
            Toggle("Sector colors", isOn: $draft.orb2SectorColors)
            Toggle("Hourly geometry ring", isOn: $draft.orb2HourlyGeometry)
            Text("Ticker placement and color are display-only geometry over roster metadata and labelled readings. The Dollar Strength benchmark stays unavailable unless the Worker feed supplies six aligned, confirmed daily FX inputs.")
                .font(.caption2)
                .foregroundStyle(HarshalTheme.mutedText)
        }
    }

    // MARK: Shared shape

    private var shapeSection: some View {
        Section("NEO ORB shape") {
            HStack {
                Text("Formation")
                Slider(value: $draft.formation, in: 0...1)
                settingsValue(draft.formation)
            }
            HStack {
                Text("X axis")
                Slider(value: $draft.axisX, in: 0.7...1.3)
                settingsValue(draft.axisX)
            }
            HStack {
                Text("Y axis")
                Slider(value: $draft.axisY, in: 0.7...1.3)
                settingsValue(draft.axisY)
            }
            HStack {
                Text("Z axis")
                Slider(value: $draft.axisZ, in: 0.7...1.3)
                settingsValue(draft.axisZ)
            }
            HStack {
                Text("Berths")
                Slider(value: $draft.berthSeparation, in: 0...1)
                settingsValue(draft.berthSeparation)
            }
            HStack {
                Text("Rotation")
                Slider(value: $draft.rotationRPM, in: 0...12)
                settingsValue(draft.rotationRPM)
            }
            HStack {
                Text("Node scale")
                Slider(value: $draft.nodeScale, in: 0.5...2)
                settingsValue(draft.nodeScale)
            }
            Toggle("Latitude bands", isOn: $draft.showBands)
            Toggle("Longitude arcs", isOn: $draft.showLongitudeArcs)
            Toggle("Center attachments", isOn: $draft.showAttachments)
        }
    }

    // MARK: Simulator

    private var simulatorSection: some View {
        Section("Markets — paper simulator") {
            HStack {
                Text("Starting cash")
                TextField("", value: $draft.startingCash, format: .number)
                    .multilineTextAlignment(.trailing)
                    .frame(maxWidth: 120)
            }
            HStack {
                Text("Flat commission")
                TextField("", value: $draft.commissionFlat, format: .number)
                    .multilineTextAlignment(.trailing)
                    .frame(maxWidth: 120)
            }
            HStack {
                Text("Commission (bps)")
                Slider(value: $draft.commissionBasisPoints, in: 0...50)
                settingsValue(draft.commissionBasisPoints)
            }
            HStack {
                Text("Slippage (bps)")
                Slider(value: $draft.slippageBasisPoints, in: 0...50)
                settingsValue(draft.slippageBasisPoints)
            }
            HStack {
                Text("Tick interval (s)")
                Slider(value: $draft.tickIntervalSeconds, in: 1...30, step: 1)
                settingsValue(draft.tickIntervalSeconds)
            }
            Picker("Board sort", selection: $draft.boardSort) {
                ForEach(MarketsOrbSettings.BoardSort.allCases) { sort in
                    Text(sort.label).tag(sort)
                }
            }
            Text("Changing starting cash applies on the next simulator reset. Changing fees applies to the next order. Everything remains PAPER_TEST: no brokerage, custody, payment, or wallet action exists.")
                .font(.caption2)
                .foregroundStyle(HarshalTheme.mutedText)
        }
    }

    // MARK: Gate

    private var gateSection: some View {
        Section("Human-Key gate") {
            Toggle("Gate paper orders", isOn: $draft.gate.requireGateForOrders)
            Picker("Watch witness policy", selection: $draft.gate.witnessPolicy) {
                ForEach(MarketsGateSettings.WitnessPolicy.allCases) { policy in
                    Text(policy.label).tag(policy)
                }
            }
            HStack {
                Text("Freshness δ (s)")
                Slider(value: $draft.gate.freshnessSeconds, in: 30...900, step: 10)
                settingsValue(draft.gate.freshnessSeconds)
            }
            HStack {
                Text("Threshold τ")
                Slider(value: $draft.gate.threshold, in: 0.1...0.95, step: 0.05)
                settingsValue(draft.gate.threshold)
            }
            Toggle("Allow passcode fallback", isOn: $draft.gate.allowPasscodeFallback)
            Text("The gate follows the kernel's formula: L = H·A·R·W·S(t), permit only at or above τ with every prerequisite present. A biometric is a local acknowledgement factor — never identity — and the watch heartbeat is a proximity witness — never an authorization. The gate fails closed.")
                .font(.caption2)
                .foregroundStyle(HarshalTheme.mutedText)
        }
    }

    private func settingsValue(_ value: Double) -> some View {
        Text(value.formatted(.number.precision(.fractionLength(2))))
            .monospacedDigit()
            .frame(width: 44, alignment: .trailing)
            .font(.caption)
    }
}
