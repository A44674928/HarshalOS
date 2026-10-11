import CryptoKit
import Foundation
import HarshalCore
import HarshalLedger
import HarshalMarkets
import Security

struct PersistedNativeState: Codable {
    var declaration: PhaseDeclaration?
    var receipt: LocalLedgerReceipt?
    var ledgerEntries: [LedgerEntry]
    /// Optional to preserve recovery of local state written before HarshalMarkets.
    var paperLedgerState: PaperLedgerState?
    /// Optional to preserve recovery of local state written before observations.
    var observationNotes: [ObservationNote]?
    /// A self-chosen reusable public label. It is separate from the private
    /// declaration label and is never treated as verified identity.
    var publicProfilePseudonym: String?
}

/// Encrypted local persistence for private native state. The encrypted file is
/// app-private; its per-installation AES key is retained separately in Keychain.
/// This improves ordinary at-rest confidentiality but is not a claim of
/// protection from a compromised/unlocked device, modified app, backup access,
/// or independent external witness.
enum LocalStateStore {
    private static let legacyDefaultsKey = "org.harshalos.native.local-state.v1"
    private static let keyService = "org.harshalos.native.local-state-key.v1"
    private static let keyAccount = "primary"
    private static let directoryName = "org.harshalos.native"
    private static let fileName = "private-state-v2.bin"

    static func load() -> PersistedNativeState? {
        if let fileURL = try? stateFileURL(),
           FileManager.default.fileExists(atPath: fileURL.path) {
            return loadEncrypted(from: fileURL)
        }

        // One-way migration of the early foundation's UserDefaults cache is
        // finalized by AppModel only after legacy handoff material has moved to
        // Keychain and the redacted state has been encrypted successfully.
        guard let legacyData = UserDefaults.standard.data(forKey: legacyDefaultsKey),
              let legacyState = try? JSONDecoder().decode(PersistedNativeState.self, from: legacyData) else {
            return nil
        }
        return legacyState
    }

    @discardableResult
    static func save(_ state: PersistedNativeState) -> Bool {
        do {
            let encoded = try JSONEncoder().encode(state)
            guard let key = try encryptionKey(createIfNeeded: true) else {
                return false
            }
            let sealed = try AES.GCM.seal(encoded, using: key)
            guard let combined = sealed.combined else {
                return false
            }
            let fileURL = try stateFileURL()
            try combined.write(to: fileURL, options: [.atomic])
            return true
        } catch {
            return false
        }
    }

    static func removeLegacyCache() {
        UserDefaults.standard.removeObject(forKey: legacyDefaultsKey)
    }

    static func removeAll() {
        if let fileURL = try? stateFileURL() {
            try? FileManager.default.removeItem(at: fileURL)
        }
        removeLegacyCache()
        try? NativeKeychainStore.remove(service: keyService, account: keyAccount)
    }

    private static func loadEncrypted(from fileURL: URL) -> PersistedNativeState? {
        do {
            guard let key = try encryptionKey(createIfNeeded: false) else {
                return nil
            }
            let combined = try Data(contentsOf: fileURL)
            let sealed = try AES.GCM.SealedBox(combined: combined)
            let decoded = try AES.GCM.open(sealed, using: key)
            return try JSONDecoder().decode(PersistedNativeState.self, from: decoded)
        } catch {
            return nil
        }
    }

    private static func encryptionKey(createIfNeeded: Bool) throws -> SymmetricKey? {
        if let existing = try NativeKeychainStore.load(service: keyService, account: keyAccount) {
            guard existing.count == 32 else {
                throw NativeKeychainStore.StoreError.invalidStoredValue
            }
            return SymmetricKey(data: existing)
        }
        guard createIfNeeded else { return nil }

        let keyLength = 32
        var material = Data(count: keyLength)
        let randomStatus = material.withUnsafeMutableBytes { buffer in
            guard let baseAddress = buffer.baseAddress else { return errSecParam }
            return SecRandomCopyBytes(kSecRandomDefault, keyLength, baseAddress)
        }
        guard randomStatus == errSecSuccess else {
            throw NativeKeychainStore.StoreError.unavailable
        }
        try NativeKeychainStore.save(material, service: keyService, account: keyAccount)
        return SymmetricKey(data: material)
    }

    private static func stateFileURL() throws -> URL {
        guard let applicationSupport = FileManager.default.urls(
            for: .applicationSupportDirectory,
            in: .userDomainMask
        ).first else {
            throw NativeKeychainStore.StoreError.unavailable
        }
        let directory = applicationSupport.appendingPathComponent(directoryName, isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        return directory.appendingPathComponent(fileName, isDirectory: false)
    }
}
