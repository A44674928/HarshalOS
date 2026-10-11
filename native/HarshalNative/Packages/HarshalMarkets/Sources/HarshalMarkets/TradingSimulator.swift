import Foundation

/// A fully-fledged **paper** trading simulator — the engine behind the
/// Markets pane. It models a simulated brokerage account: cash, long/short
/// positions, market and limit orders, commissions, slippage, fills, and
/// realized/unrealized P&L.
///
/// Everything here is simulated by construction. No order reaches a broker,
/// exchange, wallet, custody account, payment rail, or any external system;
/// no method performs I/O; identical inputs always produce identical state
/// transitions, so the whole engine is replayable and unit-testable.
public enum TradingSimulator {
    // MARK: - Order model

    public enum OrderSide: String, Codable, CaseIterable, Sendable, Identifiable {
        case buy
        case sell

        public var id: String { rawValue }

        public var label: String {
            switch self {
            case .buy: return "Buy"
            case .sell: return "Sell"
            }
        }
    }

    public enum OrderType: String, Codable, CaseIterable, Sendable, Identifiable {
        case market
        case limit

        public var id: String { rawValue }
    }

    public enum OrderStatus: String, Codable, Sendable {
        case open
        case filled
        case cancelled
        case rejected
    }

    public struct Order: Codable, Equatable, Sendable, Identifiable {
        public let id: UUID
        public let symbol: String
        public let side: OrderSide
        public let type: OrderType
        /// Positive share quantity; shorts are modeled by selling beyond the held position.
        public let quantity: Decimal
        /// Required for limit orders; ignored for market orders.
        public let limitPrice: Decimal?
        public let thesis: String
        public let createdAt: Date
        public var status: OrderStatus
        public var filledAt: Date?
        public var averageFillPrice: Decimal?
        public var commission: Decimal
        public var statusNote: String

        public init(
            id: UUID = UUID(),
            symbol: String,
            side: OrderSide,
            type: OrderType,
            quantity: Decimal,
            limitPrice: Decimal? = nil,
            thesis: String = "",
            createdAt: Date,
            status: OrderStatus = .open,
            filledAt: Date? = nil,
            averageFillPrice: Decimal? = nil,
            commission: Decimal = 0,
            statusNote: String = ""
        ) {
            self.id = id
            self.symbol = symbol.uppercased()
            self.side = side
            self.type = type
            self.quantity = quantity
            self.limitPrice = limitPrice
            self.thesis = thesis
            self.createdAt = createdAt
            self.status = status
            self.filledAt = filledAt
            self.averageFillPrice = averageFillPrice
            self.commission = commission
            self.statusNote = statusNote
        }
    }

    // MARK: - Position & fill model

    /// A signed share position: positive is long, negative is short.
    public struct Position: Codable, Equatable, Sendable, Identifiable {
        public var symbol: String
        public var quantity: Decimal
        public var averagePrice: Decimal
        public var openedAt: Date
        public var updatedAt: Date

        public var id: String { symbol }

        public init(symbol: String, quantity: Decimal, averagePrice: Decimal, openedAt: Date, updatedAt: Date) {
            self.symbol = symbol.uppercased()
            self.quantity = quantity
            self.averagePrice = averagePrice
            self.openedAt = openedAt
            self.updatedAt = updatedAt
        }

        public var isLong: Bool { quantity > 0 }
        public var isShort: Bool { quantity < 0 }

        public func unrealizedPL(atMark mark: Decimal) -> Decimal {
            (mark - averagePrice) * quantity
        }

        public var notionalCost: Decimal {
            abs(quantity) * averagePrice
        }
    }

    public struct Fill: Codable, Equatable, Sendable, Identifiable {
        public let id: UUID
        public let orderID: UUID
        public let symbol: String
        public let side: OrderSide
        public let quantity: Decimal
        public let price: Decimal
        public let commission: Decimal
        public let timestamp: Date

        public init(id: UUID = UUID(), orderID: UUID, symbol: String, side: OrderSide, quantity: Decimal, price: Decimal, commission: Decimal, timestamp: Date) {
            self.id = id
            self.orderID = orderID
            self.symbol = symbol.uppercased()
            self.side = side
            self.quantity = quantity
            self.price = price
            self.commission = commission
            self.timestamp = timestamp
        }

        public var notional: Decimal { quantity * price }
    }

    // MARK: - Account model

    public struct Account: Codable, Equatable, Sendable {
        public static let schema = "harshal-paper-simulator-v1"

        public var schemaVersion: String
        public var startingCash: Decimal
        public var cash: Decimal
        public var positions: [Position]
        public var orders: [Order]
        public var fills: [Fill]
        public var realizedPL: Decimal
        public var createdAt: Date
        public var updatedAt: Date

        public init(startingCash: Decimal, createdAt: Date = Date()) {
            self.schemaVersion = Self.schema
            self.startingCash = startingCash
            self.cash = startingCash
            self.positions = []
            self.orders = []
            self.fills = []
            self.realizedPL = 0
            self.createdAt = createdAt
            self.updatedAt = createdAt
        }

        public func validate() throws {
            guard schemaVersion == Self.schema else {
                throw SimulatorError.invalidState("Unknown simulator schema \(schemaVersion).")
            }
            guard startingCash > 0 else {
                throw SimulatorError.invalidState("Starting cash must be positive.")
            }
            var seenSymbols = Set<String>()
            for position in positions {
                guard !position.symbol.isEmpty, position.quantity != 0, position.averagePrice > 0 else {
                    throw SimulatorError.invalidState("Position \(position.symbol) is malformed.")
                }
                guard seenSymbols.insert(position.symbol).inserted else {
                    throw SimulatorError.invalidState("Duplicate position for \(position.symbol).")
                }
            }
            for order in orders {
                guard !order.symbol.isEmpty, order.quantity > 0 else {
                    throw SimulatorError.invalidState("Order \(order.id) is malformed.")
                }
                if order.type == .limit {
                    guard let limit = order.limitPrice, limit > 0 else {
                        throw SimulatorError.invalidState("Limit order \(order.id) lacks a positive limit price.")
                    }
                }
            }
        }

        public func position(for symbol: String) -> Position? {
            positions.first { $0.symbol == symbol.uppercased() }
        }

        public var openOrders: [Order] {
            orders.filter { $0.status == .open }
        }

        /// Total mark-to-market account equity for the supplied marks.
        /// Positions without a mark contribute only their absence — the engine
        /// never invents a valuation.
        public func equity(marks: [String: Decimal]) -> Decimal {
            var total = cash
            for position in positions {
                guard let mark = marks[position.symbol] else { continue }
                total += position.quantity * mark
            }
            return total
        }

        public func unrealizedPL(marks: [String: Decimal]) -> Decimal {
            positions.reduce(Decimal(0)) { partial, position in
                guard let mark = marks[position.symbol] else { return partial }
                return partial + position.unrealizedPL(atMark: mark)
            }
        }

        public var returnFraction: Double {
            guard startingCash > 0 else { return 0 }
            return NSDecimalNumber(decimal: (cash - startingCash) / startingCash).doubleValue
        }
    }

    // MARK: - Fee model

    public struct FeeModel: Codable, Equatable, Sendable {
        /// Flat commission per fill in quote currency.
        public var flatCommission: Decimal
        /// Variable commission in basis points of the fill notional.
        public var commissionBasisPoints: Decimal
        /// Simulated slippage in basis points applied adversely to market orders.
        public var slippageBasisPoints: Decimal

        public init(flatCommission: Decimal = 0, commissionBasisPoints: Decimal = 0, slippageBasisPoints: Decimal = 2) {
            self.flatCommission = max(0, flatCommission)
            self.commissionBasisPoints = max(0, commissionBasisPoints)
            self.slippageBasisPoints = max(0, slippageBasisPoints)
        }

        public static let `default` = FeeModel()

        public func commission(for notional: Decimal) -> Decimal {
            let variable = notional * commissionBasisPoints / 10_000
            let total = flatCommission + variable
            return Self.rounded(total)
        }

        public func slippagePrice(for price: Decimal, side: OrderSide) -> Decimal {
            guard slippageBasisPoints > 0 else { return Self.rounded(price) }
            switch side {
            case .buy:
                return Self.rounded(price * (1 + slippageBasisPoints / 10_000))
            case .sell:
                return Self.rounded(price * (1 - slippageBasisPoints / 10_000))
            }
        }

        static func rounded(_ value: Decimal) -> Decimal {
            var mutable = value
            NSDecimalRound(&mutable, value, 2, .plain)
            return mutable
        }
    }

    // MARK: - Errors

    public enum SimulatorError: LocalizedError, Equatable {
        case unknownSymbol
        case invalidQuantity
        case invalidLimitPrice
        case insufficientBuyingPower(required: Decimal, available: Decimal)
        case noOpenPosition
        case orderNotFound
        case orderNotOpen
        case invalidState(String)

        public var errorDescription: String? {
            switch self {
            case .unknownSymbol:
                return "The symbol is not on the reviewed roster."
            case .invalidQuantity:
                return "Order quantity must be greater than zero."
            case .invalidLimitPrice:
                return "Limit orders need a positive limit price."
            case let .insufficientBuyingPower(required, available):
                return "Insufficient paper buying power: needs \(required), available \(available)."
            case .noOpenPosition:
                return "There is no open position for this symbol."
            case .orderNotFound:
                return "That order no longer exists."
            case .orderNotOpen:
                return "Only open orders can be cancelled."
            case let .invalidState(message):
                return message
            }
        }
    }

    // MARK: - Actions

    /// Submit an order.
    ///
    /// - Market orders fill immediately at the quote with adverse slippage,
    ///   or are rejected when buying power is insufficient.
    /// - Limit orders rest until `matchOpenOrders(quotes:...)` crosses them.
    public static func submit(
        _ draft: Order,
        to account: Account,
        quote: TickerQuote?,
        fees: FeeModel,
        at date: Date = Date()
    ) throws -> Account {
        var next = account
        let symbol = draft.symbol.uppercased()

        guard GoodIntelligenceTickerRoster.asset(for: symbol) != nil else {
            var rejected = draft
            rejected.status = .rejected
            rejected.statusNote = "Symbol is not on the reviewed roster."
            next.orders.append(rejected)
            next.updatedAt = date
            return next
        }
        guard draft.quantity > 0, draft.quantity < 10_000_000 else {
            var rejected = draft
            rejected.status = .rejected
            rejected.statusNote = "Quantity must be between 0 and 10,000,000."
            next.orders.append(rejected)
            next.updatedAt = date
            return next
        }

        switch draft.type {
        case .market:
            guard let quote, quote.price > 0 else {
                var rejected = draft
                rejected.status = .rejected
                rejected.statusNote = "No current reading for this symbol."
                next.orders.append(rejected)
                next.updatedAt = date
                return next
            }
            let fillPrice = fees.slippagePrice(for: quote.price, side: draft.side)
            var order = draft
            order.status = .filled
            order.filledAt = date
            order.averageFillPrice = fillPrice
            do {
                let fill = try applyFill(side: draft.side, symbol: symbol, quantity: draft.quantity, price: fillPrice, orderID: order.id, date: date, fees: fees, to: &next)
                order.commission = fill.commission
                next.orders.append(order)
                next.fills.append(fill)
            } catch let error as SimulatorError {
                var rejected = draft
                rejected.status = .rejected
                rejected.statusNote = error.errorDescription ?? "Rejected."
                next.orders.append(rejected)
            }
            next.updatedAt = date
            return next

        case .limit:
            guard let limit = draft.limitPrice, limit > 0 else {
                var rejected = draft
                rejected.status = .rejected
                rejected.statusNote = SimulatorError.invalidLimitPrice.errorDescription ?? "Rejected."
                next.orders.append(rejected)
                next.updatedAt = date
                return next
            }
            // Reserve nothing for resting buys — a resting limit only consumes
            // buying power when it crosses. Cash is validated again at fill.
            var order = draft
            order.status = .open
            order.statusNote = "Resting until price \(limit) is reached."
            next.orders.append(order)
            next.updatedAt = date
            return next
        }
    }

    /// Cancel a resting order.
    public static func cancel(orderID: UUID, in account: Account, at date: Date = Date()) throws -> Account {
        var next = account
        guard let index = next.orders.firstIndex(where: { $0.id == orderID }) else {
            throw SimulatorError.orderNotFound
        }
        guard next.orders[index].status == .open else {
            throw SimulatorError.orderNotOpen
        }
        next.orders[index].status = .cancelled
        next.orders[index].statusNote = "Cancelled before crossing."
        next.updatedAt = date
        return next
    }

    /// Cross resting limit orders against the current board. A resting buy
    /// fills at `min(limit, quote)` when `quote ≤ limit`; a resting sell fills
    /// at `max(limit, quote)` when `quote ≥ limit`. Returns the new account
    /// and the fills it produced.
    public static func matchOpenOrders(
        quotes: [String: TickerQuote],
        account: Account,
        fees: FeeModel,
        at date: Date = Date()
    ) -> (account: Account, fills: [Fill]) {
        var next = account
        var fills: [Fill] = []

        for index in next.orders.indices where next.orders[index].status == .open {
            let order = next.orders[index]
            guard let quote = quotes[order.symbol], quote.price > 0, let limit = order.limitPrice else { continue }
            let crosses: Bool
            let fillPrice: Decimal
            switch order.side {
            case .buy:
                guard quote.price <= limit else { continue }
                crosses = true
                fillPrice = FeeModel.rounded(min(limit, quote.price))
            case .sell:
                guard quote.price >= limit else { continue }
                crosses = true
                fillPrice = FeeModel.rounded(max(limit, quote.price))
            }
            guard crosses else { continue }

            var filled = next.orders[index]
            do {
                let fill = try applyFill(side: order.side, symbol: order.symbol, quantity: order.quantity, price: fillPrice, orderID: order.id, date: date, fees: fees, to: &next)
                filled.status = .filled
                filled.filledAt = date
                filled.averageFillPrice = fillPrice
                filled.commission = fill.commission
                filled.statusNote = "Filled at \(fillPrice)."
                next.orders[index] = filled
                next.fills.append(fill)
                fills.append(fill)
            } catch let error as SimulatorError {
                var rejected = next.orders[index]
                rejected.status = .rejected
                rejected.statusNote = error.errorDescription ?? "Rejected at cross."
                next.orders[index] = rejected
            }
        }
        next.updatedAt = date
        return (next, fills)
    }

    /// Flatten a position at the current mark.
    public static func closePosition(
        symbol: String,
        in account: Account,
        quote: TickerQuote?,
        fees: FeeModel,
        at date: Date = Date()
    ) throws -> Account {
        let symbol = symbol.uppercased()
        guard let position = account.position(for: symbol) else {
            throw SimulatorError.noOpenPosition
        }
        guard let quote, quote.price > 0 else {
            throw SimulatorError.invalidState("No current reading for \(symbol); the position stays open.")
        }
        let side: OrderSide = position.isLong ? .sell : .buy
        let draft = Order(
            symbol: symbol,
            side: side,
            type: .market,
            quantity: abs(position.quantity),
            thesis: "Close \(position.isLong ? "long" : "short") position",
            createdAt: date
        )
        return try submit(draft, to: account, quote: quote, fees: fees, at: date)
    }

    /// Reset to a fresh account with the supplied starting cash.
    public static func reset(startingCash: Decimal, at date: Date = Date()) -> Account {
        Account(startingCash: startingCash, createdAt: date)
    }

    // MARK: - Fill mechanics

    /// Apply one fill to `account` (in place): cash movement, weighted-average
    /// position maintenance, closing P&L realization, and commission.
    private static func applyFill(
        side: OrderSide,
        symbol: String,
        quantity: Decimal,
        price: Decimal,
        orderID: UUID,
        date: Date,
        fees: FeeModel,
        to account: inout Account
    ) throws -> Fill {
        guard price > 0 else { throw SimulatorError.invalidState("Fill price must be positive.") }
        let notional = FeeModel.rounded(quantity * price)
        let commission = fees.commission(for: notional)
        let signedDelta: Decimal = side == .buy ? quantity : -quantity

        // Buying-power guard: cash (plus proceeds) must cover cost + fees.
        let cashAfter = account.cash - signedDelta * price - commission
        guard cashAfter >= 0 else {
            throw SimulatorError.insufficientBuyingPower(
                required: FeeModel.rounded(signedDelta * price + commission),
                available: FeeModel.rounded(account.cash)
            )
        }

        var fill = Fill(orderID: orderID, symbol: symbol, side: side, quantity: quantity, price: price, commission: commission, timestamp: date)

        if let index = account.positions.firstIndex(where: { $0.symbol == symbol }) {
            var position = account.positions[index]
            let sameDirection = (position.quantity > 0 && signedDelta > 0) || (position.quantity < 0 && signedDelta < 0)
            if position.quantity == 0 || sameDirection {
                // Increasing (or flipping into) the same direction: weighted average.
                let totalQuantity = position.quantity + signedDelta
                if totalQuantity != 0 {
                    let existingCost = position.averagePrice * position.quantity
                    let addedCost = price * signedDelta
                    position.averagePrice = FeeModel.rounded((existingCost + addedCost) / totalQuantity)
                } else {
                    position.averagePrice = 0
                }
                position.quantity = totalQuantity
            } else {
                // Reducing or closing across the average.
                let closingQuantity = min(abs(signedDelta), abs(position.quantity))
                let realized = (price - position.averagePrice) * Decimal(signOf: signedDelta, magnitudeOf: closingQuantity)
                account.realizedPL = FeeModel.rounded(account.realizedPL + realized)

                let remaining = position.quantity + signedDelta
                let flipped = remaining != 0 && (remaining > 0) != (position.quantity > 0)
                position.quantity = remaining
                if flipped {
                    // Crossed beyond flat: the overflow opens a new position
                    // at the fill price.
                    position.averagePrice = price
                } else if remaining == 0 {
                    position.averagePrice = 0
                }
            }
            position.updatedAt = date
            account.positions[index] = position
            if account.positions[index].quantity == 0 {
                account.positions.removeAll { $0.symbol == symbol }
            }
        } else {
            let position = Position(symbol: symbol, quantity: signedDelta, averagePrice: price, openedAt: date, updatedAt: date)
            account.positions.append(position)
        }

        account.cash = FeeModel.rounded(account.cash - signedDelta * price - commission)
        fill.price = price
        return fill
    }
}
