import HarshalCore
import HarshalMarkets
import SwiftUI

/// The **Markets** pane of the combined tab: a fully-fledged paper trading
/// simulator over the Good Intelligence ticker board.
///
/// Everything is PAPER_TEST by construction: orders fill only inside the
/// local simulator, no brokerage/custody/payment/wallet path exists, and the
/// feed's live readings are labelled with their exact source. Order
/// submission can require the Human-Key gate (biometric + optional watch
/// witness) evaluated through the canonical formula.
struct TradingSimulatorView: View {
    @Environment(AppModel.self) private var appModel

    @State private var orderSymbol = GoodIntelligenceTickerRoster.assets[0].symbol
    @State private var orderSide: TradingSimulator.OrderSide = .buy
    @State private var orderType: TradingSimulator.OrderType = .market
    @State private var quantityText = "10"
    @State private var limitText = ""
    @State private var thesis = ""
    @State private var gateVerdictLine: String?
    @State private var gateVerdictPermitted = false
    @State private var gateInFlight = false
    @State private var showAllTickers = false

    var body: some View {
        List {
            feedSection
            boardSection
            accountSection
            equitySection
            if appModel.marketsOrb.settings.gate.requireGateForOrders {
                gateSection
            }
            orderTicketSection
            openOrdersSection
            positionsSection
            fillsSection
            paperBoundarySection
        }
        // `.insetGrouped` is iOS-only; it is marked unavailable on macOS, so
        // macOS falls back to its closest native equivalent.
        #if os(macOS)
        .listStyle(.inset)
        #else
        .listStyle(.insetGrouped)
        #endif
        .scrollContentBackground(.hidden)
        .background(HarshalTheme.canvas)
        .onAppear {
            if GoodIntelligenceTickerRoster.asset(for: orderSymbol) == nil {
                orderSymbol = GoodIntelligenceTickerRoster.assets[0].symbol
            }
        }
    }

    // MARK: Feed

    private var feedSection: some View {
        Section {
            switch appModel.marketsOrb.feedStatus {
            case .idle:
                Label("Ticker board starting…", systemImage: "dot.radiowaves.left.and.right")
                    .font(.footnote)
                    .foregroundStyle(HarshalTheme.secondaryText)
            case let .live(date):
                Label("Good Intelligence live readings — Worker route \(GoodIntelligenceTickerRoster.barsRoute), refreshed \(date.formatted(date: .omitted, time: .standard)). Symbols beyond the polled set run on the labelled simulated engine.",
                      systemImage: "dot.radiowaves.left.and.right")
                    .font(.footnote)
                    .foregroundStyle(HarshalTheme.verified)
            case .simulated:
                Label("Simulated tick engine — no configured Good Intelligence feed in this build. Reference prices are local display anchors, never market observations.",
                      systemImage: "waveform.path.ecg")
                    .font(.footnote)
                    .foregroundStyle(HarshalTheme.warning)
            case let .unreachable(message):
                VStack(alignment: .leading, spacing: 4) {
                    Label("Good Intelligence feed unreachable — the board fell back to the labelled simulated engine.",
                          systemImage: "wifi.exclamationmark")
                        .font(.footnote)
                        .foregroundStyle(HarshalTheme.warning)
                    Text(message)
                        .font(.caption2)
                        .foregroundStyle(HarshalTheme.mutedText)
                }
            }
        } header: {
            Text("Ticker source")
        }
    }

    // MARK: Board

    private var boardSection: some View {
        Section {
            let symbols = appModel.marketsOrb.sortedBoardSymbols
            let visible = showAllTickers ? symbols : Array(symbols.prefix(12))
            ForEach(visible, id: \.self) { symbol in
                if let quote = appModel.marketsOrb.quotes[symbol],
                   let asset = GoodIntelligenceTickerRoster.asset(for: symbol) {
                    Button {
                        orderSymbol = symbol
                    } label: {
                        HStack(spacing: 8) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(symbol)
                                    .font(.footnote.weight(.bold).monospaced())
                                Text(asset.sector)
                                    .font(.caption2)
                                    .foregroundStyle(HarshalTheme.mutedText)
                            }
                            Spacer()
                            VStack(alignment: .trailing, spacing: 2) {
                                Text(currency(quote.price))
                                    .font(.footnote.monospacedDigit())
                                Text(signedPercent(quote.dayChangeFraction))
                                    .font(.caption2.monospacedDigit())
                                    .foregroundStyle(quote.dayChangeFraction >= 0 ? HarshalTheme.verified : HarshalTheme.destructive)
                            }
                            Text(quote.isLive ? "LIVE" : "SIM")
                                .font(.system(size: 9, weight: .bold).monospaced())
                                .foregroundStyle(quote.isLive ? HarshalTheme.verified : HarshalTheme.warning)
                                .padding(.horizontal, 5)
                                .padding(.vertical, 2)
                                .background(Capsule().fill(HarshalTheme.surface))
                        }
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(symbol) \(asset.sector), \(currency(quote.price)), \(signedPercent(quote.dayChangeFraction)), \(quote.isLive ? "live" : "simulated") reading")
                }
            }
            Button(showAllTickers ? "Show fewer" : "Show all \(symbols.count) roster tickers") {
                showAllTickers.toggle()
            }
            .font(.footnote)
        } header: {
            Text("Good Intelligence board")
        } footer: {
            Text("Tap a ticker to load it into the order ticket. LIVE readings come from the Worker route; SIM readings are the labelled local tick engine.")
        }
    }

    // MARK: Account

    private var accountSection: some View {
        Section("Paper account") {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 132), spacing: 10)], alignment: .leading, spacing: 10) {
                SimulatorMetric(title: "Equity", value: currency(appModel.marketsOrb.currentEquity))
                SimulatorMetric(title: "Cash", value: currency(appModel.marketsOrb.account.cash))
                SimulatorMetric(title: "Unrealized P&L", value: signedCurrency(appModel.marketsOrb.unrealizedPL), color: plColor(appModel.marketsOrb.unrealizedPL))
                SimulatorMetric(title: "Realized P&L", value: signedCurrency(appModel.marketsOrb.account.realizedPL), color: plColor(appModel.marketsOrb.account.realizedPL))
                SimulatorMetric(title: "Open orders", value: "\(appModel.marketsOrb.account.openOrders.count)")
                SimulatorMetric(title: "Fills", value: "\(appModel.marketsOrb.account.fills.count)")
            }
            .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
            HStack {
                Button("Reset simulator", role: .destructive) {
                    appModel.marketsOrb.resetSimulator()
                }
                Spacer()
                if let summary = appModel.marketsOrb.lastActionSummary {
                    Text(summary)
                        .font(.caption2)
                        .foregroundStyle(HarshalTheme.mutedText)
                        .lineLimit(2)
                }
            }
        }
    }

    private var equitySection: some View {
        Section("Equity curve (session)") {
            EquitySparkline(samples: appModel.marketsOrb.equitySamples)
                .frame(height: 84)
                .accessibilityLabel("Session equity curve")
                .accessibilityValue("\(appModel.marketsOrb.equitySamples.count) samples, latest \(currency(appModel.marketsOrb.currentEquity))")
        }
    }

    // MARK: Gate

    private var gateSection: some View {
        Section("Human-Key gate") {
            GateStatusBanner()
                .listRowInsets(EdgeInsets(top: 8, leading: 8, bottom: 8, trailing: 8))
            if let line = gateVerdictLine {
                Text(line)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(gateVerdictPermitted ? HarshalTheme.verified : HarshalTheme.warning)
            }
        }
    }

    // MARK: Order ticket

    private var orderTicketSection: some View {
        Section("Order ticket") {
            Picker("Ticker", selection: $orderSymbol) {
                ForEach(GoodIntelligenceTickerRoster.sectors, id: \.self) { sector in
                    Section(sector) {
                        ForEach(GoodIntelligenceTickerRoster.assets.filter { $0.sector == sector }) { asset in
                            Text("\(asset.symbol) · \(asset.name)").tag(asset.symbol)
                        }
                    }
                }
            }
            Picker("Side", selection: $orderSide) {
                ForEach(TradingSimulator.OrderSide.allCases) { side in
                    Text(side.label).tag(side)
                }
            }
            .pickerStyle(.segmented)
            Picker("Type", selection: $orderType) {
                ForEach(TradingSimulator.OrderType.allCases) { type in
                    Text(type.rawValue.capitalized).tag(type)
                }
            }
            .pickerStyle(.segmented)
            HStack {
                Text("Quantity")
                TextField("10", text: $quantityText)
                    #if os(iOS)
                    .keyboardType(.decimalPad)
                    #endif
                    .multilineTextAlignment(.trailing)
            }
            if orderType == .limit {
                HStack {
                    Text("Limit price")
                    TextField("0.00", text: $limitText)
                        #if os(iOS)
                        .keyboardType(.decimalPad)
                        #endif
                        .multilineTextAlignment(.trailing)
                }
            }
            if let quote = appModel.marketsOrb.quotes[orderSymbol] {
                HStack {
                    Text("Current reading")
                    Spacer()
                    Text("\(currency(quote.price))  \(signedPercent(quote.dayChangeFraction))")
                        .font(.callout.monospacedDigit())
                        .foregroundStyle(quote.dayChangeFraction >= 0 ? HarshalTheme.verified : HarshalTheme.destructive)
                    Text(quote.isLive ? "LIVE" : "SIM")
                        .font(.caption2.weight(.bold).monospaced())
                        .foregroundStyle(quote.isLive ? HarshalTheme.verified : HarshalTheme.warning)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Capsule().fill(HarshalTheme.surface))
                }
            }
            TextField("Thesis (optional, ≤ 300 chars)", text: $thesis, axis: .vertical)
                .lineLimit(2...4)

            if let error = appModel.marketsOrb.simulatorError {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(HarshalTheme.destructive)
            }

            Button {
                Task { await submitOrder() }
            } label: {
                if gateInFlight {
                    HStack { ProgressView(); Text("Evaluating gate…") }
                } else {
                    Text("\(orderSide.label) \(orderType == .limit ? "limit" : "market") — paper")
                }
            }
            .buttonStyle(.borderedProminent)
        }
    }

    // MARK: Open orders / positions / fills

    private var openOrdersSection: some View {
        Section("Open orders") {
            let open = appModel.marketsOrb.account.openOrders
            if open.isEmpty {
                Text("No resting orders.")
                    .font(.footnote)
                    .foregroundStyle(HarshalTheme.mutedText)
            }
            ForEach(open) { order in
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("\(order.side.label) \(order.symbol) · \(order.quantity) @ limit \(order.limitPrice.map { currency($0) } ?? "—")")
                            .font(.footnote.weight(.medium))
                        Text(order.statusNote)
                            .font(.caption2)
                            .foregroundStyle(HarshalTheme.mutedText)
                    }
                    Spacer()
                    Button("Cancel") {
                        Task { await appModel.marketsOrb.cancelOrder(order.id) }
                    }
                    .buttonStyle(.bordered)
                    .font(.caption)
                }
            }
        }
    }

    private var positionsSection: some View {
        Section("Positions") {
            let positions = appModel.marketsOrb.account.positions
            if positions.isEmpty {
                Text("Flat — no open positions.")
                    .font(.footnote)
                    .foregroundStyle(HarshalTheme.mutedText)
            }
            ForEach(positions) { position in
                let mark = appModel.marketsOrb.accountMarks[position.symbol]
                let unrealized = mark.map { position.unrealizedPL(atMark: $0) }
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("\(position.isLong ? "LONG" : "SHORT") \(position.symbol) · \(abs(NSDecimalNumber(decimal: position.quantity).doubleValue), specifier: "%.2f") @ \(position.averagePrice.map { currency($0) } ?? "—")")
                            .font(.footnote.weight(.medium))
                        Text("Mark \(mark.map { currency($0) } ?? "no reading") · opened \(position.openedAt.formatted(date: .abbreviated, time: .omitted))")
                            .font(.caption2)
                            .foregroundStyle(HarshalTheme.mutedText)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 4) {
                        if let unrealized {
                            Text(signedCurrency(unrealized))
                                .font(.footnote.monospacedDigit())
                                .foregroundStyle(plColor(unrealized))
                        }
                        Button("Close") {
                            Task {
                                _ = await appModel.marketsOrb.closePosition(position.symbol)
                            }
                        }
                        .buttonStyle(.bordered)
                        .font(.caption)
                    }
                }
            }
        }
    }

    private var fillsSection: some View {
        Section("Trade log (latest first)") {
            let fills = appModel.marketsOrb.account.fills.suffix(30).reversed()
            if fills.isEmpty {
                Text("No paper fills yet.")
                    .font(.footnote)
                    .foregroundStyle(HarshalTheme.mutedText)
            }
            ForEach(fills) { fill in
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(fill.side.label) \(fill.symbol) · \(fill.quantity) @ \(currency(fill.price))")
                        .font(.footnote.monospacedDigit())
                    HStack(spacing: 8) {
                        Text("Commission \(currency(fill.commission))")
                        Text("·")
                        Text(fill.timestamp.formatted(date: .omitted, time: .standard))
                    }
                    .font(.caption2)
                    .foregroundStyle(HarshalTheme.mutedText)
                }
            }
        }
    }

    private var paperBoundarySection: some View {
        Section {
            Text("PAPER_TEST: this simulator is a local record. It creates no broker order, execution, custody, wallet, payment, token, or recommendation. Ticker readings are labelled at the source; the simulated engine never presents itself as a provider.")
                .font(.caption)
                .foregroundStyle(HarshalTheme.secondaryText)
        }
    }

    // MARK: Actions

    private func submitOrder() async {
        let quantity = Decimal(string: quantityText.replacingOccurrences(of: ",", with: "."))
        guard let quantity, quantity > 0 else {
            appModel.marketsOrb.simulatorError = "Quantity must be a positive number."
            return
        }
        var limit: Decimal?
        if orderType == .limit {
            let parsed = Decimal(string: limitText.replacingOccurrences(of: ",", with: "."))
            guard let parsed, parsed > 0 else {
                appModel.marketsOrb.simulatorError = "Limit orders need a positive limit price."
                return
            }
            limit = parsed
        }

        if appModel.marketsOrb.settings.gate.requireGateForOrders {
            gateInFlight = true
            defer { gateInFlight = false }
            let verdict = await appModel.marketsOrb.gate.evaluate(
                context: GateRequestContext(
                    reason: "Submit \(orderSide.rawValue) paper order for \(orderSymbol)",
                    isAcknowledged: appModel.localAttestation == .active
                ),
                settings: appModel.marketsOrb.settings.gate
            )
            switch verdict {
            case let .permit(legitimacy):
                gateVerdictPermitted = true
                gateVerdictLine = "Gate PERMIT — L = \(legitimacy.formatted(.number.precision(.fractionLength(3))))."
            case let .refuse(reason):
                gateVerdictPermitted = false
                gateVerdictLine = "\(reason.label) — the order was not placed."
                return
            }
        } else {
            gateVerdictLine = nil
        }

        let placed = await appModel.marketsOrb.placeOrder(
            symbol: orderSymbol,
            side: orderSide,
            type: orderType,
            quantity: quantity,
            limitPrice: limit,
            thesis: String(thesis.prefix(300))
        )
        if placed {
            thesis = ""
            gateVerdictLine = orderType == .market ? "Market order filled (paper)." : "Limit order resting (paper)."
        }
    }

    // MARK: Formatting

    private func currency(_ value: Decimal) -> String {
        value.formatted(.currency(code: "USD"))
    }

    private func signedCurrency(_ value: Decimal) -> String {
        let base = currency(abs(value))
        return value < 0 ? "−\(base)" : "+\(base)"
    }

    private func signedPercent(_ fraction: Double) -> String {
        let percent = fraction * 100
        let sign = percent >= 0 ? "+" : "−"
        return "\(sign)\(abs(percent).formatted(.number.precision(.fractionLength(2))))%"
    }

    private func plColor(_ value: Decimal) -> Color {
        value > 0 ? HarshalTheme.verified : (value < 0 ? HarshalTheme.destructive : HarshalTheme.secondaryText)
    }
}

private struct SimulatorMetric: View {
    let title: String
    let value: String
    var color: Color = HarshalTheme.primaryText

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption2)
                .foregroundStyle(HarshalTheme.mutedText)
            Text(value)
                .font(.subheadline.weight(.semibold).monospacedDigit())
                .foregroundStyle(color)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(10)
        .harshalPanel(cornerRadius: 12)
    }
}

/// A dependency-free Canvas sparkline of the session equity samples.
private struct EquitySparkline: View {
    let samples: [MarketsOrbModel.EquitySample]

    var body: some View {
        Canvas { context, size in
            guard samples.count >= 2 else {
                var text = context
                text.draw(
                    Text("Waiting for the second board tick…")
                        .font(.caption)
                        .foregroundStyle(HarshalTheme.mutedText),
                    at: CGPoint(x: size.width / 2, y: size.height / 2),
                    anchor: .center
                )
                return
            }
            let values = samples.map { NSDecimalNumber(decimal: $0.equity).doubleValue }
            let minimum = values.min() ?? 0
            let maximum = max(values.max() ?? 1, minimum + 0.0001)
            let span = maximum - minimum
            let stepX = size.width / CGFloat(max(1, values.count - 1))

            var path = Path()
            for (index, value) in values.enumerated() {
                let x = CGFloat(index) * stepX
                let y = size.height - CGFloat((value - minimum) / span) * (size.height - 8) - 4
                let point = CGPoint(x: x, y: y)
                if index == 0 {
                    path.move(to: point)
                } else {
                    path.addLine(to: point)
                }
            }
            context.stroke(path, with: .color(HarshalTheme.electricBlue), style: StrokeStyle(lineWidth: 1.6, lineCap: .round, lineJoin: .round))

            let lastPoint = CGPoint(x: size.width, y: size.height - CGFloat((values.last! - minimum) / span) * (size.height - 8) - 4)
            context.fill(Path(ellipseIn: CGRect(x: lastPoint.x - 2.5, y: lastPoint.y - 2.5, width: 5, height: 5)), with: .color(HarshalTheme.verified))
        }
    }
}
