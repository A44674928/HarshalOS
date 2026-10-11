import XCTest

@testable import HarshalMarkets

final class TradingSimulatorTests: XCTestCase {
    private let date = Date(timeIntervalSince1970: 1_780_000_000)
    private let quote = TickerQuote(symbol: "AAPL", price: 100, previousClose: 98, asOf: Date(timeIntervalSince1970: 1_780_000_000), source: .localSimulation)

    private func account(startingCash: Decimal = 10_000) -> TradingSimulator.Account {
        TradingSimulator.reset(startingCash: startingCash, at: Date(timeIntervalSince1970: 1_779_999_000))
    }

    private var fees: TradingSimulator.FeeModel {
        FeeModelForTests.model
    }

    private enum FeeModelForTests {
        static let model = TradingSimulator.FeeModel(flatCommission: 1, commissionBasisPoints: 10, slippageBasisPoints: 0)
    }

    private func order(_ side: TradingSimulator.OrderSide, _ type: TradingSimulator.OrderType = .market, quantity: Decimal = 10, limit: Decimal? = nil, symbol: String = "AAPL") -> TradingSimulator.Order {
        TradingSimulator.Order(symbol: symbol, side: side, type: type, quantity: quantity, limitPrice: limit, createdAt: date)
    }

    func testMarketBuyFillsAndMovesCashAndPosition() throws {
        let next = try TradingSimulator.submit(order(.buy), to: account(), quote: quote, fees: fees, at: date)
        // 10 × 100 = 1000 notional; commission = 1 + 1000×10bp = 1 + 1 = 2.
        XCTAssertEqual(next.cash, 8_998)
        XCTAssertEqual(next.positions.count, 1)
        XCTAssertEqual(next.positions[0].quantity, 10)
        XCTAssertEqual(next.positions[0].averagePrice, 100)
        XCTAssertEqual(next.orders.count, 1)
        XCTAssertEqual(next.orders[0].status, .filled)
        XCTAssertEqual(next.orders[0].commission, 2)
        XCTAssertEqual(next.fills.count, 1)
    }

    func testMarketSellWithoutPositionOpensShort() throws {
        let next = try TradingSimulator.submit(order(.sell), to: account(), quote: quote, fees: fees, at: date)
        // Short credit: +1000, commission 2 → cash 10,998; position −10 @ 100.
        XCTAssertEqual(next.cash, 10_998)
        XCTAssertEqual(next.positions[0].quantity, -10)
        XCTAssertTrue(next.positions[0].isShort)
    }

    func testInsufficientBuyingPowerRejects() throws {
        let next = try TradingSimulator.submit(order(.buy, quantity: 5_000), to: account(), quote: quote, fees: fees, at: date)
        XCTAssertEqual(next.cash, 10_000, "Cash must be untouched on rejection")
        XCTAssertEqual(next.orders.count, 1)
        XCTAssertEqual(next.orders[0].status, .rejected)
        XCTAssertFalse(next.orders[0].statusNote.isEmpty)
        XCTAssertTrue(next.positions.isEmpty)
    }

    func testClosingLongRealizesPL() throws {
        var state = try TradingSimulator.submit(order(.buy, quantity: 10), to: account(), quote: quote, fees: fees, at: date)
        let higher = TickerQuote(symbol: "AAPL", price: 110, previousClose: 100, asOf: date, source: .localSimulation)
        state = try TradingSimulator.closePosition(symbol: "AAPL", in: state, quote: higher, fees: fees, at: date)
        // Long 10 @100 closed at 110 → +100 realized.
        XCTAssertEqual(state.realizedPL, 100)
        XCTAssertTrue(state.positions.isEmpty)
        // Cash: 10000 − 1000 − 2 (open) + 1100 − 2.1 (close: 1 + 1100×10bp) = 10_095.9.
        XCTAssertEqual(state.cash, 10_095.9)
    }

    func testShortCloseRealizesNegativePL() throws {
        var state = try TradingSimulator.submit(order(.sell, quantity: 10), to: account(), quote: quote, fees: fees, at: date)
        let higher = TickerQuote(symbol: "AAPL", price: 110, previousClose: 100, asOf: date, source: .localSimulation)
        state = try TradingSimulator.closePosition(symbol: "AAPL", in: state, quote: higher, fees: fees, at: date)
        // Short 10 @100 covered at 110 → −100 realized.
        XCTAssertEqual(state.realizedPL, -100)
        XCTAssertTrue(state.positions.isEmpty)
    }

    func testLimitOrderRestsThenCrossesOnQuote() throws {
        var state = try TradingSimulator.submit(order(.buy, .limit, quantity: 10, limit: 95), to: account(), quote: quote, fees: fees, at: date)
        XCTAssertEqual(state.orders[0].status, .open)

        // Quote above the limit — no cross.
        let (resting, _) = TradingSimulator.matchOpenOrders(quotes: ["AAPL": quote], account: state, fees: fees, at: date)
        XCTAssertEqual(resting.orders[0].status, .open)
        state = resting

        // Quote at the limit — crossing buy fills at min(limit, quote) = 95.
        let dip = TickerQuote(symbol: "AAPL", price: 95, previousClose: 98, asOf: date, source: .localSimulation)
        let (crossed, fills) = TradingSimulator.matchOpenOrders(quotes: ["AAPL": dip], account: state, fees: fees, at: date)
        XCTAssertEqual(crossed.orders[0].status, .filled)
        XCTAssertEqual(crossed.orders[0].averageFillPrice, 95)
        XCTAssertEqual(fills.count, 1)
        XCTAssertEqual(crossed.positions[0].averagePrice, 95)
        XCTAssertEqual(crossed.cash, 10_000 - 950 - 1.95)
    }

    func testSellLimitOnlyCrossesUpward() throws {
        let state = try TradingSimulator.submit(order(.sell, .limit, quantity: 10, limit: 105), to: account(), quote: quote, fees: fees, at: date)
        let (unchanged, _) = TradingSimulator.matchOpenOrders(quotes: ["AAPL": quote], account: state, fees: fees, at: date)
        XCTAssertEqual(unchanged.orders[0].status, .open)
    }

    func testCancelRestingOrder() throws {
        let state = try TradingSimulator.submit(order(.buy, .limit, quantity: 10, limit: 95), to: account(), quote: quote, fees: fees, at: date)
        let cancelled = try TradingSimulator.cancel(orderID: state.orders[0].id, in: state, at: date)
        XCTAssertEqual(cancelled.orders[0].status, .cancelled)
        XCTAssertThrowsError(try TradingSimulator.cancel(orderID: state.orders[0].id, in: cancelled))
    }

    func testNonRosterSymbolRejected() throws {
        let next = try TradingSimulator.submit(order(.buy, symbol: "FAKE"), to: account(), quote: quote, fees: fees, at: date)
        XCTAssertEqual(next.orders[0].status, .rejected)
        XCTAssertTrue(next.fills.isEmpty)
    }

    func testWeightedAverageAcrossAdds() throws {
        var state = try TradingSimulator.submit(order(.buy, quantity: 10), to: account(), quote: quote, fees: fees, at: date)
        let higher = TickerQuote(symbol: "AAPL", price: 120, previousClose: 100, asOf: date, source: .localSimulation)
        state = try TradingSimulator.submit(order(.buy, quantity: 10), to: state, quote: higher, fees: fees, at: date)
        XCTAssertEqual(state.positions[0].quantity, 20)
        XCTAssertEqual(state.positions[0].averagePrice, 110)
    }

    func testReducingLongRealizesPartialPL() throws {
        var state = try TradingSimulator.submit(order(.buy, quantity: 10), to: account(), quote: quote, fees: fees, at: date)
        let higher = TickerQuote(symbol: "AAPL", price: 110, previousClose: 100, asOf: date, source: .localSimulation)
        state = try TradingSimulator.submit(order(.sell, quantity: 4), to: state, quote: higher, fees: fees, at: date)
        XCTAssertEqual(state.positions[0].quantity, 6)
        XCTAssertEqual(state.positions[0].averagePrice, 100, "Reducing must not change the average")
        XCTAssertEqual(state.realizedPL, 40)
    }

    func testEquityAndUnrealized() throws {
        let state = try TradingSimulator.submit(order(.buy, quantity: 10), to: account(), quote: quote, fees: fees, at: date)
        let marks = ["AAPL": Decimal(120)]
        XCTAssertEqual(state.equity(marks: marks), 8_998 + 1_200)
        XCTAssertEqual(state.unrealizedPL(marks: marks), 200)
    }

    func testValidationRejectsCorruptAccounts() {
        var bad = account()
        bad.schemaVersion = "harshal-paper-simulator-v0"
        XCTAssertThrowsError(try bad.validate())
        var badCash = account()
        badCash.startingCash = 0
        badCash.cash = 0
        XCTAssertThrowsError(try badCash.validate())
    }

    func testDeterministicTickEngine() {
        let engine = LocalTickEngine()
        let seed: UInt64 = 42
        let first = engine.quote(symbol: "NVDA", step: 10, sessionSeed: seed, at: date)
        let second = engine.quote(symbol: "NVDA", step: 10, sessionSeed: seed, at: date)
        XCTAssertEqual(first, second, "Same symbol/seed/step must produce the same quote")
        XCTAssertNotNil(first)
        XCTAssertEqual(first?.source, .localSimulation)
        XCTAssertEqual(engine.quotes(step: 3, sessionSeed: seed, at: date).count, 52)
    }

    func testRosterIntegrity() {
        XCTAssertEqual(GoodIntelligenceTickerRoster.assets.count, 52)
        XCTAssertEqual(Set(GoodIntelligenceTickerRoster.assets.map(\.symbol)).count, 52, "Symbols must be unique")
        XCTAssertEqual(GoodIntelligenceTickerRoster.sectors.count, 8)
        XCTAssertEqual(GoodIntelligenceTickerRoster.radialBand(forMarketCapUsd: 5_650_000_000_000), 1)
        XCTAssertEqual(GoodIntelligenceTickerRoster.radialBand(forMarketCapUsd: 105_570_000_000), 2)
        XCTAssertNotNil(GoodIntelligenceTickerRoster.asset(for: "nvda"))
    }

    func testTickerbotPacketValidation() throws {
        let json = """
        {"schema":"gi-market-context-v1","synthetic":false,"source":"Tickerbot","symbol":"AAPL","timeframe":"1h","bars":[{"time":"2026-10-10T14:00:00Z","open":100,"high":101,"low":99,"close":100.5,"volume":10}]}
        """
        let result = TickerbotBarsPacket.validate(Data(json.utf8))
        guard case let .success(packet) = result else {
            return XCTFail("Valid packet must decode")
        }
        XCTAssertEqual(packet.lastClose ?? 0, 100.5, accuracy: 1e-9)

        let wrongSchema = json.replacingOccurrences(of: "gi-market-context-v1", with: "other-schema")
        guard case .failure = TickerbotBarsPacket.validate(Data(wrongSchema.utf8)) else {
            return XCTFail("Wrong schema must fail validation")
        }
    }
}
