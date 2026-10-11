import Foundation

/// A local, deterministic instrument fixture. It is intentionally not a live
/// quote or provider assertion and exists so the first paper-market slice can
/// be exercised without network access or an account.
public struct MarketFixture: Codable, Equatable, Sendable, Identifiable {
    public let instrument: MarketInstrument
    public let entryObservation: MarketObservation
    public let markObservation: MarketObservation
    public let label: String
    public let note: String

    public var id: String { instrument.id }

    public init(
        instrument: MarketInstrument,
        entryObservation: MarketObservation,
        markObservation: MarketObservation,
        label: String,
        note: String
    ) throws {
        let normalizedLabel = label.trimmingCharacters(in: .whitespacesAndNewlines)
        let normalizedNote = note.trimmingCharacters(in: .whitespacesAndNewlines)
        guard (1...120).contains(normalizedLabel.count),
              (1...360).contains(normalizedNote.count),
              entryObservation.instrument.id == instrument.id,
              markObservation.instrument.id == instrument.id,
              entryObservation.provenance.isFixture,
              markObservation.provenance.isFixture,
              entryObservation.observedAt <= markObservation.observedAt else {
            throw HarshalMarketsError.invalidObservation("A market fixture requires ordered fixture observations for one instrument and bounded labels.")
        }
        try instrument.validate()
        try entryObservation.validate()
        try markObservation.validate()

        self.instrument = instrument
        self.entryObservation = entryObservation
        self.markObservation = markObservation
        self.label = normalizedLabel
        self.note = normalizedNote
    }
}

public enum HarshalMarketFixtures {
    public static let alpha: MarketFixture = makeFixture(
        symbol: "HOS-ALPHA",
        displayName: "Harshal Alpha Fixture",
        assetClass: .equity,
        entryPrice: "100.00",
        markPrice: "108.50",
        label: "ALPHA · fixture market",
        note: "Deterministic local fixture only. These values are not a live quote, historical claim, market recommendation, or provider feed."
    )

    public static let beta: MarketFixture = makeFixture(
        symbol: "HOS-BETA",
        displayName: "Harshal Beta Fixture",
        assetClass: .digitalAsset,
        entryPrice: "40.00",
        markPrice: "36.75",
        label: "BETA · fixture market",
        note: "Deterministic local fixture only. These values are not a live quote, historical claim, market recommendation, or provider feed."
    )

    public static let all = [alpha, beta]

    private static func makeFixture(
        symbol: String,
        displayName: String,
        assetClass: MarketAssetClass,
        entryPrice: String,
        markPrice: String,
        label: String,
        note: String
    ) -> MarketFixture {
        let instrument = try! MarketInstrument(
            symbol: symbol,
            displayName: displayName,
            assetClass: assetClass,
            venue: "HARSHAL-LOCAL-FIXTURE",
            quoteCurrency: "USD"
        )
        let entryDate = Date(timeIntervalSince1970: 1_704_067_200)
        let markDate = Date(timeIntervalSince1970: 1_704_153_600)
        let provenance = try! MarketDataProvenance(
            provider: "HARSHAL-LOCAL-FIXTURE",
            sourceLabel: "Bundled deterministic fixture",
            retrievedAt: markDate,
            interval: .fixture,
            isFixture: true
        )
        let entry = try! MarketObservation(
            instrument: instrument,
            observedAt: entryDate,
            price: Decimal(string: entryPrice),
            availability: .available,
            provenance: provenance
        )
        let mark = try! MarketObservation(
            instrument: instrument,
            observedAt: markDate,
            price: Decimal(string: markPrice),
            availability: .available,
            provenance: provenance
        )
        return try! MarketFixture(
            instrument: instrument,
            entryObservation: entry,
            markObservation: mark,
            label: label,
            note: note
        )
    }
}
