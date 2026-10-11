import Foundation

public enum PaperValuationStatus: String, Codable, Sendable, Hashable {
    case available = "AVAILABLE"
    case closed = "CLOSED"
    case unavailable = "UNAVAILABLE"
}

/// A deterministic display calculation over supplied observations. It is not a
/// performance guarantee, recommendation, trade signal, or broker statement.
public struct PaperPositionValuation: Equatable, Sendable, Identifiable {
    public let positionID: UUID
    public let status: PaperValuationStatus
    public let currency: String
    public let entryPrice: Decimal?
    public let markPrice: Decimal?
    public let entryNotional: Decimal?
    public let markNotional: Decimal?
    public let profitLoss: Decimal?
    public let returnFraction: Decimal?
    public let observationID: UUID?
    public let message: String

    public var id: UUID { positionID }

    public init(
        positionID: UUID,
        status: PaperValuationStatus,
        currency: String,
        entryPrice: Decimal?,
        markPrice: Decimal?,
        entryNotional: Decimal?,
        markNotional: Decimal?,
        profitLoss: Decimal?,
        returnFraction: Decimal?,
        observationID: UUID?,
        message: String
    ) {
        self.positionID = positionID
        self.status = status
        self.currency = currency
        self.entryPrice = entryPrice
        self.markPrice = markPrice
        self.entryNotional = entryNotional
        self.markNotional = markNotional
        self.profitLoss = profitLoss
        self.returnFraction = returnFraction
        self.observationID = observationID
        self.message = message
    }
}

public enum PaperValuation {
    /// Values an open position using one explicit supplied mark. A held or
    /// unavailable observation remains unavailable; it is never turned into a
    /// neutral price or zero gain/loss.
    public static func markToMarket(
        position: PaperPosition,
        observation: MarketObservation
    ) -> PaperPositionValuation {
        guard position.instrument.id == observation.instrument.id else {
            return unavailable(
                position: position,
                message: "The supplied mark belongs to a different instrument. No paper valuation was calculated."
            )
        }
        guard observation.availability == .available, let price = observation.price else {
            return unavailable(
                position: position,
                message: "The supplied market observation is \(observation.availability.label.lowercased()). No paper valuation was calculated."
            )
        }
        return calculate(position: position, price: price, observationID: observation.id, status: .available)
    }

    /// Closed positions derive their final simulated result only from their
    /// recorded closure observation. Withdrawn positions have no valuation.
    public static func finalValue(position: PaperPosition) -> PaperPositionValuation {
        switch position.status {
        case .open:
            return unavailable(
                position: position,
                message: "The position is still open and requires an explicit available mark."
            )
        case .withdrawn:
            return unavailable(
                position: position,
                message: "The paper position was withdrawn and has no closure valuation."
            )
        case .closed:
            guard let observation = position.exitObservation,
                  observation.availability == .available,
                  let price = observation.price else {
                return unavailable(
                    position: position,
                    message: "The closed position has no available closure observation."
                )
            }
            return calculate(position: position, price: price, observationID: observation.id, status: .closed)
        }
    }

    private static func calculate(
        position: PaperPosition,
        price: Decimal,
        observationID: UUID,
        status: PaperValuationStatus
    ) -> PaperPositionValuation {
        guard let entryPrice = position.entryObservation.price, entryPrice > 0 else {
            return unavailable(
                position: position,
                message: "The position has no valid entry price. No paper valuation was calculated."
            )
        }

        let entryNotional = entryPrice * position.quantity
        let markNotional = price * position.quantity
        let profitLoss: Decimal
        switch position.side {
        case .long:
            profitLoss = (price - entryPrice) * position.quantity
        case .short:
            profitLoss = (entryPrice - price) * position.quantity
        }
        let returnFraction: Decimal? = entryNotional == 0 ? nil : profitLoss / entryNotional
        let label = status == .closed ? "Closed simulated result" : "Open simulated mark"

        return PaperPositionValuation(
            positionID: position.id,
            status: status,
            currency: position.instrument.quoteCurrency,
            entryPrice: entryPrice,
            markPrice: price,
            entryNotional: entryNotional,
            markNotional: markNotional,
            profitLoss: profitLoss,
            returnFraction: returnFraction,
            observationID: observationID,
            message: "\(label) from an explicit supplied observation. It is simulation-only and not a broker statement or investment recommendation."
        )
    }

    private static func unavailable(position: PaperPosition, message: String) -> PaperPositionValuation {
        PaperPositionValuation(
            positionID: position.id,
            status: .unavailable,
            currency: position.instrument.quoteCurrency,
            entryPrice: position.entryObservation.price,
            markPrice: nil,
            entryNotional: nil,
            markNotional: nil,
            profitLoss: nil,
            returnFraction: nil,
            observationID: nil,
            message: message
        )
    }
}
