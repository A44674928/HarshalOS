import Foundation
import HarshalCore
import HarshalMarkets

/// The observable model behind the combined **Markets · NEO ORB** tab.
///
/// Owns: the tucked-away settings (persisted), the paper-simulator account
/// (persisted with the app's encrypted local state), the live-or-simulated
/// ticker board, and the Watch/biometric gate service. Nothing here talks to
/// a broker: the simulator is paper-only by construction and the feed is
/// read-only.
@MainActor
@Observable
final class MarketsOrbModel {
    // MARK: Settings

    private(set) var settings = MarketsOrbSettings.default

    func updateSettings(_ mutate: (inout MarketsOrbSettings) -> Void) {
        var next = settings
        mutate(&next)
        settings = OrbSettingsStore.sanitize(next)
        OrbSettingsStore.save(settings)
    }

    /// Replace the whole settings struct (used by the settings panel's
    /// live-apply draft). Sanitized and persisted on every apply.
    func apply(_ newSettings: MarketsOrbSettings) {
        settings = OrbSettingsStore.sanitize(newSettings)
        OrbSettingsStore.save(settings)
    }

    func resetSettings() {
        settings = .default
        OrbSettingsStore.reset()
    }

    // MARK: Simulator

    private(set) var account = TradingSimulator.Account(startingCash: 100_000)
    private(set) var simulatorError: String?
    private(set) var lastActionSummary: String?
    /// Rolling mark-to-market equity samples for the sparkline (bounded).
    private(set) var equitySamples: [EquitySample] = []

    struct EquitySample: Codable, Equatable, Sendable {
        let time: Date
        let equity: Decimal
    }

    var feeModel: TradingSimulator.FeeModel {
        TradingSimulator.FeeModel(
            flatCommission: Decimal(settings.commissionFlat),
            commissionBasisPoints: Decimal(settings.commissionBasisPoints),
            slippageBasisPoints: Decimal(settings.slippageBasisPoints)
        )
    }

    func restore(account: TradingSimulator.Account?) {
        guard let account else { return }
        do {
            try account.validate()
            self.account = account
        } catch {
            // Fail closed: an invalid stored account starts fresh rather than
            // partially restoring.
            self.account = TradingSimulator.Account(startingCash: Decimal(settings.startingCash))
        }
    }

    var accountMarks: [String: Decimal] {
        var marks: [String: Decimal] = [:]
        for quote in quotes.values {
            marks[quote.symbol] = quote.price
        }
        return marks
    }

    var currentEquity: Decimal {
        account.equity(marks: accountMarks)
    }

    var unrealizedPL: Decimal {
        account.unrealizedPL(marks: accountMarks)
    }

    // MARK: Ticker board

    private(set) var quotes: [String: TickerQuote] = [:]
    private(set) var boardStep = 0
    private(set) var feedStatus: FeedStatus = .idle
    private(set) var lastBoardRefresh: Date?

    enum FeedStatus: Equatable {
        case idle
        case simulated
        case live(Date)
        case unreachable(String)
    }

    var boardIsActive = false
    private var boardTask: Task<Void, Never>?
    private let tickEngine = LocalTickEngine()
    /// Stable per-installation seed so the simulated board is continuous
    /// across launches instead of re-rolling.
    private var sessionSeed: UInt64 = 0

    var sortedBoardSymbols: [String] {
        let symbols = Array(quotes.keys)
        switch settings.boardSort {
        case .roster:
            return GoodIntelligenceTickerRoster.assets.map(\.symbol).filter { quotes[$0] != nil }
        case .dayMove:
            return symbols.sorted {
                (quotes[$0]?.dayChangeFraction ?? 0) > (quotes[$1]?.dayChangeFraction ?? 0)
            }
        case .marketCap:
            let capOrder = Dictionary(uniqueKeysWithValues: GoodIntelligenceTickerRoster.assets.map { ($0.symbol, -$0.marketCapUsd) })
            return symbols.sorted { (capOrder[$0] ?? 0) < (capOrder[$1] ?? 0) }
        }
    }

    // MARK: Gate

    let gate = WatchGateService()

    // MARK: Bootstrap

    func bootstrap() {
        settings = OrbSettingsStore.load()
        sessionSeed = Self.loadSessionSeed()
        seedInitialBoard()
        gate.bootstrap()
    }

    /// Start the board loop: while active, refresh the board every
    /// `tickIntervalSeconds` — live readings when the Worker feed is
    /// configured, the labelled simulated engine otherwise.
    func startBoard() {
        guard !boardIsActive else { return }
        boardIsActive = true
        boardTask = Task { [weak self] in
            while !Task.isCancelled {
                guard let self else { return }
                await self.tickBoard()
                let interval = self.settings.tickIntervalSeconds
                try? await Task.sleep(nanoseconds: UInt64(max(0.5, interval) * 1_000_000_000))
                if Task.isCancelled { return }
            }
        }
    }

    func stopBoard() {
        boardIsActive = false
        boardTask?.cancel()
        boardTask = nil
    }

    func tickBoard() async {
        let now = Date()
        if TickerFeedService.isConfigured() {
            await refreshLiveQuotes(symbols: Array(quotes.keys.prefix(8)), at: now)
        }
        // Advance the simulated engine for every roster symbol lacking a
        // fresh live reading this tick. Live readings are never overwritten.
        boardStep += 1
        let simulated = tickEngine.quotes(
            step: boardStep,
            sessionSeed: sessionSeed,
            at: now
        )
        for quote in simulated {
            if let existing = quotes[quote.symbol], existing.isLive, now.timeIntervalSince(existing.asOf) < 300 {
                continue
            }
            quotes[quote.symbol] = quote
        }
        lastBoardRefresh = now
        switch feedStatus {
        case .idle, .simulated:
            feedStatus = .simulated
        case .live, .unreachable:
            // A live label survives this tick only until the next feed poll;
            // an unreachable label surfaces the feed error verbatim.
            break
        }
        recordEquitySample(at: now)
    }

    /// Poll the Worker bars route for a bounded slice of the roster. Failures
    /// set an explicit unreachable status and never fabricate readings.
    private func refreshLiveQuotes(symbols: [String], at now: Date) async {
        // `try?` on a throwing call whose result is already optional flattens
        // (SE-0230), so `loadCredential()` binds a non-optional value directly —
        // the guard fails when it throws *or* when there is no stored credential.
        guard let service = try? TickerFeedService.configured(),
              let credential = try? PaperMarketCapabilityVault.loadCredential() else {
            return
        }
        var liveCount = 0
        for symbol in symbols {
            do {
                let packet = try await service.fetchBars(symbol: symbol, credential: credential)
                guard let close = packet.lastClose, close > 0 else { continue }
                let price = Decimal(string: String(format: "%.2f", close)) ?? Decimal(close)
                let previous = packet.bars.count > 1 ? Decimal(string: String(format: "%.2f", packet.bars[packet.bars.count - 2].close)) ?? price : price
                quotes[symbol] = TickerQuote(
                    symbol: symbol,
                    price: price,
                    previousClose: previous,
                    asOf: now,
                    source: .goodIntelligenceTickerbot(observedAt: now)
                )
                liveCount += 1
            } catch {
                feedStatus = .unreachable(error.localizedDescription)
                return
            }
        }
        if liveCount > 0 {
            feedStatus = .live(now)
        }
    }

    private func seedInitialBoard() {
        guard quotes.isEmpty else { return }
        boardStep = 0
        let now = Date()
        for quote in tickEngine.quotes(step: 0, sessionSeed: sessionSeed, at: now) {
            quotes[quote.symbol] = quote
        }
    }

    private func recordEquitySample(at date: Date) {
        let sample = EquitySample(time: date, equity: currentEquity)
        equitySamples.append(sample)
        if equitySamples.count > 600 {
            equitySamples.removeFirst(equitySamples.count - 600)
        }
    }

    private static func loadSessionSeed() -> UInt64 {
        let key = "org.harshalos.native.markets-simulator-session-seed"
        if let stored = UserDefaults.standard.string(forKey: key), let value = UInt64(stored) {
            return value
        }
        let value = UInt64.random(in: UInt64.min...UInt64.max)
        UserDefaults.standard.set(String(value), forKey: key)
        return value
    }

    // MARK: Simulator actions

    func placeOrder(
        symbol: String,
        side: TradingSimulator.OrderSide,
        type: TradingSimulator.OrderType,
        quantity: Decimal,
        limitPrice: Decimal?,
        thesis: String
    ) async -> Bool {
        await submitSimulatorChange { account, fees, now in
            let draft = TradingSimulator.Order(
                symbol: symbol,
                side: side,
                type: type,
                quantity: quantity,
                limitPrice: limitPrice,
                thesis: thesis,
                createdAt: now
            )
            return try TradingSimulator.submit(
                draft,
                to: account,
                quote: self.quotes[symbol.uppercased()],
                fees: fees,
                at: now
            )
        }
    }

    func cancelOrder(_ id: UUID) async {
        _ = await submitSimulatorChange { account, _, now in
            try TradingSimulator.cancel(orderID: id, in: account, at: now)
        }
    }

    func closePosition(_ symbol: String) async -> Bool {
        await submitSimulatorChange { account, fees, now in
            try TradingSimulator.closePosition(
                symbol: symbol,
                in: account,
                quote: self.quotes[symbol.uppercased()],
                fees: fees,
                at: now
            )
        }
    }

    func resetSimulator() {
        account = TradingSimulator.reset(startingCash: Decimal(settings.startingCash))
        equitySamples = []
        simulatorError = nil
        lastActionSummary = "Paper simulator reset: fresh \(settings.startingCash) simulated account. No broker, wallet, or external system was ever involved."
    }

    private func submitSimulatorChange(
        _ change: (TradingSimulator.Account, TradingSimulator.FeeModel, Date) throws -> TradingSimulator.Account
    ) async -> Bool {
        do {
            let next = try change(account, feeModel, Date())
            try next.validate()
            account = next
            simulatorError = nil
            await persistAccount()
            return true
        } catch {
            simulatorError = error.localizedDescription
            return false
        }
    }

    // MARK: Persistence (via AppModel)

    /// Set by AppModel at bootstrap so the model can persist through the
    /// app's encrypted local-state pipeline.
    weak var appModel: AppModel?

    private func persistAccount() async {
        await appModel?.persistSimulatorAccount(account)
    }
}
