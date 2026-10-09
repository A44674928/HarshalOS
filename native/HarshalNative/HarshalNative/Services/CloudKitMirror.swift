import CloudKit
import Foundation
import HarshalCore
import HarshalLedger

enum CloudKitMirrorState: Equatable {
    case notConfigured
    case checking
    case available
    case unavailable(String)
    case syncing
    case synced(Date)
    case failed(String)

    var title: String {
        switch self {
        case .notConfigured: "CloudKit is not configured"
        case .checking: "Checking iCloud account"
        case .available: "Private CloudKit database available"
        case let .unavailable(reason): "iCloud unavailable: \(reason)"
        case .syncing: "Syncing declaration"
        case let .synced(date): "Synced \(date.formatted(date: .abbreviated, time: .shortened))"
        case let .failed(message): "Sync failed: \(message)"
        }
    }

    var isConfigured: Bool {
        if case .notConfigured = self { return false }
        return true
    }
}

enum CloudKitMirrorError: LocalizedError {
    case disabledByBuildConfiguration
    case noICloudAccount
    case restricted
    case unavailable

    var errorDescription: String? {
        switch self {
        case .disabledByBuildConfiguration:
            "CloudKit mirroring is disabled until this app is signed with a real Apple Developer team, CloudKit capability, and private container."
        case .noICloudAccount:
            "No usable iCloud account is available on this device."
        case .restricted:
            "The current iCloud account is restricted."
        case .unavailable:
            "The iCloud account status is temporarily unavailable."
        }
    }
}

/// Mirrors only a phase declaration and its local receipt to the user's private
/// CloudKit database after an explicit user action. It neither authenticates a
/// person nor upgrades a local receipt into independent proof.
struct CloudKitMirror {
    static var isEnabledByBuildConfiguration: Bool {
        Bundle.main.object(forInfoDictionaryKey: "HarshalCloudKitEnabled") as? Bool ?? false
    }

    static func accountState() async -> CloudKitMirrorState {
        guard isEnabledByBuildConfiguration else { return .notConfigured }
        do {
            switch try await CKContainer.default().accountStatus() {
            case .available:
                return .available
            case .noAccount:
                return .unavailable("sign in to iCloud")
            case .restricted:
                return .unavailable("account restricted")
            case .couldNotDetermine:
                return .unavailable("status could not be determined")
            case .temporarilyUnavailable:
                return .unavailable("temporarily unavailable")
            @unknown default:
                return .unavailable("unknown account status")
            }
        } catch {
            return .failed(error.localizedDescription)
        }
    }

    static func mirror(
        declaration: PhaseDeclaration,
        receipt: LocalLedgerReceipt
    ) async throws {
        guard isEnabledByBuildConfiguration else {
            throw CloudKitMirrorError.disabledByBuildConfiguration
        }

        switch try await CKContainer.default().accountStatus() {
        case .available:
            break
        case .noAccount:
            throw CloudKitMirrorError.noICloudAccount
        case .restricted:
            throw CloudKitMirrorError.restricted
        case .couldNotDetermine, .temporarilyUnavailable:
            throw CloudKitMirrorError.unavailable
        @unknown default:
            throw CloudKitMirrorError.unavailable
        }

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let recordID = CKRecord.ID(recordName: "phase-declaration-\(declaration.id.uuidString.lowercased())")
        let record = CKRecord(recordType: "HarshalPhaseDeclaration", recordID: recordID)
        record["declarationJSON"] = try encoder.encode(declaration) as CKRecordValue
        record["receiptJSON"] = try encoder.encode(receipt) as CKRecordValue
        record["schema"] = receipt.schema as CKRecordValue
        record["assurance"] = receipt.assurance as CKRecordValue
        record["updatedAt"] = Date() as CKRecordValue

        _ = try await CKContainer.default().privateCloudDatabase.save(record)
    }
}
