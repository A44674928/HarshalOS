import Foundation

/// Short-lived bearer material for an already-staged Community handoff. This
/// is intentionally separate from persisted observation metadata: it belongs
/// in Keychain, is never placed in a URL, and is discarded at terminal state.
struct PublicObservationHandoffCapability: Codable, Equatable, Sendable {
    let claimCode: String
    let statusToken: String
    let expiresAt: Date

    init(claimCode: String, statusToken: String, expiresAt: Date) throws {
        guard claimCode.range(of: "^[A-Z2-9]{4}(?:-[A-Z2-9]{4}){3}$", options: .regularExpression) != nil,
              statusToken.range(of: "^[A-Za-z0-9_-]{43}$", options: .regularExpression) != nil else {
            throw PublicObservationCapabilityVaultError.invalidCapability
        }
        self.claimCode = claimCode
        self.statusToken = statusToken
        self.expiresAt = expiresAt
    }

    func replacingExpiration(_ expiration: Date) throws -> PublicObservationHandoffCapability {
        try PublicObservationHandoffCapability(
            claimCode: claimCode,
            statusToken: statusToken,
            expiresAt: expiration
        )
    }
}

enum PublicObservationCapabilityVaultError: LocalizedError {
    case invalidCapability
    case encodingFailed
    case decodingFailed
    case secureStorageUnavailable

    var errorDescription: String? {
        switch self {
        case .invalidCapability:
            return "The local public-observation capability is invalid."
        case .encodingFailed:
            return "The local public-observation capability could not be prepared for secure storage."
        case .decodingFailed:
            return "A stored public-observation capability could not be recovered safely."
        case .secureStorageUnavailable:
            return "Secure local storage is unavailable, so the public-observation handoff was not retained."
        }
    }
}

enum PublicObservationCapabilityVault {
    private static let service = "org.harshalos.native.public-observation-capability.v1"

    static func store(
        _ capability: PublicObservationHandoffCapability,
        for handoffID: UUID
    ) throws {
        let data: Data
        do {
            data = try JSONEncoder().encode(capability)
        } catch {
            throw PublicObservationCapabilityVaultError.encodingFailed
        }
        do {
            try NativeKeychainStore.save(data, service: service, account: account(for: handoffID))
        } catch {
            throw PublicObservationCapabilityVaultError.secureStorageUnavailable
        }
    }

    static func load(
        for handoffID: UUID,
        now: Date = .now
    ) throws -> PublicObservationHandoffCapability? {
        let data: Data?
        do {
            data = try NativeKeychainStore.load(service: service, account: account(for: handoffID))
        } catch {
            throw PublicObservationCapabilityVaultError.secureStorageUnavailable
        }
        guard let data else { return nil }

        let capability: PublicObservationHandoffCapability
        do {
            capability = try JSONDecoder().decode(PublicObservationHandoffCapability.self, from: data)
        } catch {
            try? remove(for: handoffID)
            throw PublicObservationCapabilityVaultError.decodingFailed
        }

        if capability.expiresAt <= now {
            try? remove(for: handoffID)
            return nil
        }
        return capability
    }

    static func remove(for handoffID: UUID) throws {
        do {
            try NativeKeychainStore.remove(service: service, account: account(for: handoffID))
        } catch {
            throw PublicObservationCapabilityVaultError.secureStorageUnavailable
        }
    }

    private static func account(for handoffID: UUID) -> String {
        handoffID.uuidString.lowercased()
    }
}
