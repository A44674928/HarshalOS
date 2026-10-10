import Foundation
import Security

/// Minimal generic-password Keychain wrapper for small native capabilities and
/// locally generated key material. It never logs account names, values, or
/// OSStatus details that could reveal a secret-bearing surface.
enum NativeKeychainStore {
    enum StoreError: LocalizedError {
        case unavailable
        case invalidStoredValue

        var errorDescription: String? {
            switch self {
            case .unavailable:
                return "Secure Keychain storage is unavailable on this device."
            case .invalidStoredValue:
                return "A secure local Keychain value is invalid."
            }
        }
    }

    static func load(service: String, account: String) throws -> Data? {
        var query = baseQuery(service: service, account: account)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        switch status {
        case errSecSuccess:
            guard let data = result as? Data else {
                throw StoreError.invalidStoredValue
            }
            return data
        case errSecItemNotFound:
            return nil
        default:
            throw StoreError.unavailable
        }
    }

    static func save(_ data: Data, service: String, account: String) throws {
        let query = baseQuery(service: service, account: account)
        let update = [kSecValueData as String: data] as CFDictionary
        let updateStatus = SecItemUpdate(query as CFDictionary, update)

        switch updateStatus {
        case errSecSuccess:
            return
        case errSecItemNotFound:
            var add = query
            add[kSecValueData as String] = data
            #if os(iOS) || os(tvOS) || os(watchOS)
            add[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
            #endif
            guard SecItemAdd(add as CFDictionary, nil) == errSecSuccess else {
                throw StoreError.unavailable
            }
        default:
            throw StoreError.unavailable
        }
    }

    static func remove(service: String, account: String) throws {
        let status = SecItemDelete(baseQuery(service: service, account: account) as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw StoreError.unavailable
        }
    }

    private static func baseQuery(service: String, account: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
    }
}
