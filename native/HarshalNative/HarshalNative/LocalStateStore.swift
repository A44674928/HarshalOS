import Foundation
import HarshalCore
import HarshalLedger
import HarshalMarkets

struct PersistedNativeState: Codable {
    var declaration: PhaseDeclaration?
    var receipt: LocalLedgerReceipt?
    var ledgerEntries: [LedgerEntry]
    /// Optional to preserve recovery of local state written before HarshalMarkets.
    var paperLedgerState: PaperLedgerState?
    /// Optional to preserve recovery of local state written before observations.
    var observationNotes: [ObservationNote]?
}

/// Local persistence is a convenience cache, not a trust anchor. The ledger
/// should be re-verified after recovery, and an active acknowledgement is never
/// restored across an app launch.
enum LocalStateStore {
    private static let key = "org.harshalos.native.local-state.v1"

    static func load() -> PersistedNativeState? {
        guard let data = UserDefaults.standard.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(PersistedNativeState.self, from: data)
    }

    static func save(_ state: PersistedNativeState) {
        guard let data = try? JSONEncoder().encode(state) else { return }
        UserDefaults.standard.set(data, forKey: key)
    }

    static func removeAll() {
        UserDefaults.standard.removeObject(forKey: key)
    }
}
