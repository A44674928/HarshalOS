import Foundation

/// Narrow native adapter for the account-scoped HarshalOS PAPER_TEST ledger.
///
/// The app talks only to the HarshalOS Worker origin. It never receives a market
/// provider key, provider endpoint, browser cookie, brokerage authority, wallet
/// material, custody instruction, payment credential, or mining workload.
enum PaperMarketServiceError: LocalizedError {
    case notConfigured
    case invalidConfiguration
    case invalidResponse
    case networkUnavailable
    case service(String)
    case pairingExpired
    case secureStorage

    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "The HarshalOS Community origin is not configured in this build."
        case .invalidConfiguration:
            return "The HarshalOS Community origin configuration is invalid."
        case .invalidResponse:
            return "The PAPER_TEST service returned an invalid response. No local quote or valuation was substituted."
        case .networkUnavailable:
            return "The PAPER_TEST service is unavailable. Keep the last server snapshot labeled unavailable or offline; do not create a local quote."
        case let .service(message):
            return message
        case .pairingExpired:
            return "This native device pairing expired or was redeemed elsewhere. Start a new pairing from this device."
        case .secureStorage:
            return "Secure Keychain storage is unavailable. The PAPER_TEST credential was not retained on this device."
        }
    }
}

struct PaperMarketDeviceCredential: Codable, Sendable, Equatable {
    let accessToken: String
    let scope: String
    let deviceID: UUID
    let deviceLabel: String
    let expiresAt: Int64

    var isExpired: Bool {
        expiresAt <= Int64(Date().timeIntervalSince1970 * 1000)
    }

    func validate() throws {
        guard Self.isCapability(accessToken), scope == "PAPER_TEST", !deviceLabel.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              deviceLabel.count <= 80, expiresAt > 0 else {
            throw PaperMarketServiceError.invalidResponse
        }
    }

    fileprivate static func isCapability(_ value: String) -> Bool {
        value.range(of: "^[A-Za-z0-9_-]{43}$", options: .regularExpression) != nil
    }
}

/// Both the manual pairing code and status capability are short-lived secrets.
/// This payload is retained only in Keychain, never in app preferences, logs,
/// CloudKit, URL query strings, or a local paper record.
struct PaperMarketPairingCapability: Codable, Sendable, Equatable {
    let id: UUID
    let pairingCode: String
    let pollToken: String
    let deviceLabel: String
    let expiresAt: Int64
    let approvalURL: URL

    var isExpired: Bool {
        expiresAt <= Int64(Date().timeIntervalSince1970 * 1000)
    }

    func validate(for origin: URL) throws {
        guard pairingCode.range(of: "^[A-Z2-9]{4}(?:-[A-Z2-9]{4}){3}$", options: .regularExpression) != nil,
              PaperMarketDeviceCredential.isCapability(pollToken),
              !deviceLabel.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              deviceLabel.count <= 80,
              expiresAt > 0,
              approvalURL.scheme?.lowercased() == "https",
              approvalURL.host?.lowercased() == origin.host?.lowercased(),
              approvalURL.port == origin.port,
              approvalURL.path == "/account",
              approvalURL.query == nil,
              approvalURL.fragment == "paper-market" else {
            throw PaperMarketServiceError.invalidResponse
        }
    }
}

struct RemotePaperMarketPairingStatus: Decodable, Sendable {
    let id: UUID
    let state: String
    let deviceLabel: String
    let expiresAt: Int64
    let canRedeem: Bool
}

struct RemotePaperMarketSource: Decodable, Sendable {
    let provider: String
    let sourceLabel: String
    let interval: String
    let observedAt: Int64
    let freshness: String
}

struct RemotePaperMarketInstrument: Decodable, Sendable, Identifiable {
    let id: String
    let symbol: String
    let displayName: String
    let assetClass: String
    let venue: String
    let quoteCurrency: String
    let price: String?
    let availability: String
    let paperEligible: Bool
    let displayOnly: Bool
    let source: RemotePaperMarketSource
}

struct RemotePaperMarketCatalog: Decodable, Sendable {
    let schema: String
    let mode: String
    let generatedAt: Int64?
    let sourceAvailability: String
    let sourceMessage: String
    let instruments: [RemotePaperMarketInstrument]
    let boundary: String
}

struct RemotePaperMarketQuote: Decodable, Sendable, Identifiable {
    let id: UUID
    let instrumentID: String
    let symbol: String
    let displayName: String
    let assetClass: String
    let venue: String
    let quoteCurrency: String
    let price: String
    let availability: String
    let provenance: RemotePaperMarketQuoteProvenance
    let expiresAt: Int64
}

struct RemotePaperMarketQuoteProvenance: Decodable, Sendable {
    let provider: String
    let sourceLabel: String
    let interval: String
    let freshness: String
    let observedAt: Int64
    let retrievedAt: Int64
}

struct RemotePaperMarketDeclaration: Decodable, Sendable, Identifiable {
    let id: UUID
    let phase: String
    let instrumentID: String
    let direction: String
    let thesis: String
    let targetAt: Int64
    let createdAt: Int64
}

struct RemotePaperMarketPosition: Decodable, Sendable, Identifiable {
    let id: UUID
    let declarationID: UUID
    let phase: String
    let instrumentID: String
    let side: String
    let quantity: String
    let state: String
    let openedAt: Int64
    let closedAt: Int64?
    let entryQuote: RemotePaperMarketQuote
    let exitQuote: RemotePaperMarketQuote?
}

struct RemotePaperMarketEvent: Decodable, Sendable, Identifiable {
    let sequence: Int
    let id: String
    let kind: String
    let declarationID: UUID?
    let positionID: UUID?
    let quoteSnapshotID: UUID?
    let detail: String
    let createdAt: Int64
}

struct RemotePaperMarketLedger: Decodable, Sendable {
    let declarations: [RemotePaperMarketDeclaration]
    let positions: [RemotePaperMarketPosition]
    let events: [RemotePaperMarketEvent]
}

struct RemotePaperMarketOrbVector: Decodable, Sendable {
    let x: Double
    let y: Double
    let z: Double
}

struct RemotePaperMarketOrbNode: Decodable, Sendable, Identifiable {
    let id: String
    let label: String
    let symbol: String
    let assetClass: String
    let kind: String
    let paperEligible: Bool
    let displayOnly: Bool
    let availability: String
    let sector: Int
    let depth: Double
    let radialBand: Int
    /// Server-normalized display coordinate. Native rendering projects this
    /// value only; it does not recalculate market placement from source data.
    let position: RemotePaperMarketOrbVector
    let wasReslotted: Bool
}

struct RemotePaperMarketOrbWide: Decodable, Sendable {
    let formation: Double?
    let convergence: Double?
    let nodes: [RemotePaperMarketOrbNode]
}

struct RemotePaperMarketValuation: Decodable, Sendable, Identifiable {
    var id: UUID { positionID }
    let positionID: UUID
    let state: String
    let valuationState: String
    let mark: String?
    let quoteCurrency: String
    let profitLoss: String?
}

struct RemotePaperMarketOrbOverlay: Decodable, Sendable {
    let valuations: [RemotePaperMarketValuation]
    let boundary: String
}

struct RemotePaperMarketOrb: Decodable, Sendable {
    let schema: String
    let mode: String
    let availability: String
    let placementAuthority: String
    let placementMethod: String?
    let message: String?
    let marketWide: RemotePaperMarketOrbWide
    let accountOverlay: RemotePaperMarketOrbOverlay
    let cryptoBoundary: String?
}

struct RemotePaperMarketSnapshot: Decodable, Sendable {
    let schema: String
    let mode: String
    let generatedAt: Int64
    let market: RemotePaperMarketCatalog
    let ledger: RemotePaperMarketLedger
    let orb: RemotePaperMarketOrb
    let boundary: String

    func validate() throws {
        let validInstruments = market.instruments.allSatisfy { instrument in
            !instrument.id.isEmpty && !instrument.symbol.isEmpty && !instrument.source.provider.isEmpty
                && instrument.id.count <= 128 && instrument.symbol.count <= 32
                && ["AVAILABLE", "HELD", "UNAVAILABLE"].contains(instrument.availability)
        }
        let validNodes = orb.marketWide.nodes.allSatisfy { node in
            !node.id.isEmpty && (0...359).contains(node.sector) && (0...5).contains(node.radialBand)
                && node.depth.isFinite && (0...1).contains(node.depth)
                && node.position.x.isFinite && node.position.y.isFinite && node.position.z.isFinite
                && abs(node.position.x) <= 10 && abs(node.position.y) <= 10 && abs(node.position.z) <= 10
        }
        let validDeclarations = ledger.declarations.allSatisfy { declaration in
            ["NAB", "CWO", "GSRB"].contains(declaration.phase)
                && ["HIGHER", "LOWER", "NEUTRAL"].contains(declaration.direction)
                && !declaration.instrumentID.isEmpty && (1...2000).contains(declaration.thesis.count)
        }
        let validPositions = ledger.positions.allSatisfy { position in
            ["NAB", "CWO", "GSRB"].contains(position.phase)
                && ["LONG", "SHORT"].contains(position.side)
                && ["OPEN", "CLOSED", "WITHDRAWN"].contains(position.state)
                && position.entryQuote.instrumentID == position.instrumentID
                && (position.exitQuote == nil || position.exitQuote?.instrumentID == position.instrumentID)
        }
        guard schema == "harshal-paper-market-mobile-snapshot-v1", mode == "PAPER_TEST",
              market.mode == "PAPER_TEST", orb.mode == "PAPER_TEST", validInstruments, validNodes,
              validDeclarations, validPositions else {
            throw PaperMarketServiceError.invalidResponse
        }
    }
}

struct RemotePaperMarketDevice: Decodable, Sendable, Identifiable {
    let id: UUID
    let deviceLabel: String
    let scope: String
    let createdAt: Int64
    let expiresAt: Int64
    let lastUsedAt: Int64?
    let status: String
}

private struct DevicePairingStartEnvelope: Decodable {
    let pairing: DevicePairingStartDTO
}

private struct DevicePairingStartDTO: Decodable {
    let id: UUID
    let deviceLabel: String
    let pairingCode: String
    let pollToken: String
    let expiresAt: Int64
    let approvalURL: URL
}

private struct DevicePairingStatusEnvelope: Decodable {
    let pairing: RemotePaperMarketPairingStatus
}

private struct DeviceCredentialEnvelope: Decodable {
    let credential: PaperMarketDeviceCredential
}

private struct SnapshotEnvelope: Decodable {
    let schema: String
    let mode: String
    let generatedAt: Int64
    let market: RemotePaperMarketCatalog
    let ledger: RemotePaperMarketLedger
    let orb: RemotePaperMarketOrb
    let boundary: String

    var snapshot: RemotePaperMarketSnapshot {
        RemotePaperMarketSnapshot(schema: schema, mode: mode, generatedAt: generatedAt, market: market, ledger: ledger, orb: orb, boundary: boundary)
    }
}

private struct QuoteEnvelope: Decodable { let quote: RemotePaperMarketQuote }
private struct DeclarationEnvelope: Decodable { let declaration: RemotePaperMarketDeclaration }
private struct PositionEnvelope: Decodable { let position: RemotePaperMarketPosition }
private struct DevicesEnvelope: Decodable { let devices: [RemotePaperMarketDevice] }
private struct ErrorEnvelope: Decodable { let error: String? }
private struct EmptyRequest: Encodable {}
private struct PairingRequest: Encodable { let deviceLabel: String }
private struct PairingApprovalRequest: Encodable { let approvalCode: String; let acknowledgement: String }
private struct QuoteRequest: Encodable { let instrumentID: String }
private struct DeclarationRequest: Encodable {
    let phase: String
    let instrumentID: String
    let direction: String
    let thesis: String
    let targetAt: Int64
}
private struct PositionRequest: Encodable {
    let declarationID: UUID
    let side: String
    let quantity: String
    let quoteSnapshotID: UUID
}
private struct ClosePositionRequest: Encodable { let quoteSnapshotID: UUID }

/// Keychain-only persistence for bearer and pairing capabilities. Remote market
/// snapshots, ledger content, and capability values are intentionally never put
/// in UserDefaults/LocalStateStore or CloudKit by this adapter.
enum PaperMarketCapabilityVault {
    private static let service = "org.harshalos.native.paper-market"
    private static let credentialAccount = "paper-test-device-credential-v1"
    private static let pairingAccount = "paper-test-pairing-capability-v1"

    static func loadCredential() throws -> PaperMarketDeviceCredential? {
        guard let data = try NativeKeychainStore.load(service: service, account: credentialAccount) else { return nil }
        do {
            let credential = try JSONDecoder().decode(PaperMarketDeviceCredential.self, from: data)
            try credential.validate()
            if credential.isExpired {
                try NativeKeychainStore.remove(service: service, account: credentialAccount)
                return nil
            }
            return credential
        } catch {
            try? NativeKeychainStore.remove(service: service, account: credentialAccount)
            throw PaperMarketServiceError.secureStorage
        }
    }

    static func store(_ credential: PaperMarketDeviceCredential) throws {
        try credential.validate()
        do {
            try NativeKeychainStore.save(try JSONEncoder().encode(credential), service: service, account: credentialAccount)
        } catch {
            throw PaperMarketServiceError.secureStorage
        }
    }

    static func removeCredential() throws {
        do { try NativeKeychainStore.remove(service: service, account: credentialAccount) }
        catch { throw PaperMarketServiceError.secureStorage }
    }

    static func loadPairing(origin: URL) throws -> PaperMarketPairingCapability? {
        guard let data = try NativeKeychainStore.load(service: service, account: pairingAccount) else { return nil }
        do {
            let pairing = try JSONDecoder().decode(PaperMarketPairingCapability.self, from: data)
            try pairing.validate(for: origin)
            if pairing.isExpired {
                try NativeKeychainStore.remove(service: service, account: pairingAccount)
                return nil
            }
            return pairing
        } catch {
            try? NativeKeychainStore.remove(service: service, account: pairingAccount)
            throw PaperMarketServiceError.secureStorage
        }
    }

    static func store(_ pairing: PaperMarketPairingCapability, origin: URL) throws {
        try pairing.validate(for: origin)
        do {
            try NativeKeychainStore.save(try JSONEncoder().encode(pairing), service: service, account: pairingAccount)
        } catch {
            throw PaperMarketServiceError.secureStorage
        }
    }

    static func removePairing() throws {
        do { try NativeKeychainStore.remove(service: service, account: pairingAccount) }
        catch { throw PaperMarketServiceError.secureStorage }
    }
}

struct PaperMarketService {
    private let origin: URL
    private let session: URLSession

    private static let isolatedSession: URLSession = {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.httpShouldSetCookies = false
        configuration.httpCookieStorage = nil
        configuration.urlCache = nil
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
        configuration.timeoutIntervalForRequest = 20
        configuration.timeoutIntervalForResource = 25
        return URLSession(configuration: configuration)
    }()

    init(origin: URL, session: URLSession? = nil) throws {
        guard origin.scheme?.lowercased() == "https",
              origin.host != nil,
              origin.user == nil,
              origin.password == nil,
              origin.path.isEmpty || origin.path == "/",
              origin.query == nil,
              origin.fragment == nil else {
            throw PaperMarketServiceError.invalidConfiguration
        }
        self.origin = origin
        self.session = session ?? Self.isolatedSession
    }

    static func configured() throws -> PaperMarketService {
        guard let rawOrigin = Bundle.main.object(forInfoDictionaryKey: "HarshalCommunityOrigin") as? String,
              let origin = URL(string: rawOrigin),
              let host = origin.host?.lowercased(),
              host != "main.empty.domains" else {
            throw PaperMarketServiceError.notConfigured
        }
        return try PaperMarketService(origin: origin)
    }

    func restoreCredential() throws -> PaperMarketDeviceCredential? {
        try PaperMarketCapabilityVault.loadCredential()
    }

    func restorePairing() throws -> PaperMarketPairingCapability? {
        try PaperMarketCapabilityVault.loadPairing(origin: origin)
    }

    func beginPairing(deviceLabel: String) async throws -> PaperMarketPairingCapability {
        let label = deviceLabel.trimmingCharacters(in: .whitespacesAndNewlines)
        guard (1...80).contains(label.count) else { throw PaperMarketServiceError.service("Give this native device a 1–80 character label.") }
        let envelope: DevicePairingStartEnvelope = try await send(
            request(path: "device-pairings", method: "POST", body: PairingRequest(deviceLabel: label))
        )
        let capability = PaperMarketPairingCapability(
            id: envelope.pairing.id,
            pairingCode: envelope.pairing.pairingCode,
            pollToken: envelope.pairing.pollToken,
            deviceLabel: envelope.pairing.deviceLabel,
            expiresAt: envelope.pairing.expiresAt,
            approvalURL: envelope.pairing.approvalURL
        )
        try capability.validate(for: origin)
        try PaperMarketCapabilityVault.store(capability, origin: origin)
        return capability
    }

    func pairingStatus(_ pairing: PaperMarketPairingCapability) async throws -> RemotePaperMarketPairingStatus {
        guard !pairing.isExpired else { throw PaperMarketServiceError.pairingExpired }
        var request = request(path: "device-pairings/\(pairing.id.uuidString.lowercased())", method: "GET")
        request.setValue(pairing.pollToken, forHTTPHeaderField: "X-HOS-Paper-Pairing")
        let envelope: DevicePairingStatusEnvelope = try await send(request)
        guard envelope.pairing.id == pairing.id, envelope.pairing.deviceLabel == pairing.deviceLabel else {
            throw PaperMarketServiceError.invalidResponse
        }
        return envelope.pairing
    }

    func redeemPairing(_ pairing: PaperMarketPairingCapability) async throws -> PaperMarketDeviceCredential {
        guard !pairing.isExpired else { throw PaperMarketServiceError.pairingExpired }
        var request = request(path: "device-pairings/\(pairing.id.uuidString.lowercased())/redeem", method: "POST", body: EmptyRequest())
        request.setValue(pairing.pollToken, forHTTPHeaderField: "X-HOS-Paper-Pairing")
        let envelope: DeviceCredentialEnvelope = try await send(request)
        try envelope.credential.validate()
        try PaperMarketCapabilityVault.store(envelope.credential)
        try PaperMarketCapabilityVault.removePairing()
        return envelope.credential
    }

    func snapshot(credential: PaperMarketDeviceCredential) async throws -> RemotePaperMarketSnapshot {
        try credential.validate()
        let envelope: SnapshotEnvelope = try await send(request(path: "snapshot", method: "GET", credential: credential))
        let snapshot = envelope.snapshot
        try snapshot.validate()
        return snapshot
    }

    func quote(instrumentID: String, credential: PaperMarketDeviceCredential) async throws -> RemotePaperMarketQuote {
        let envelope: QuoteEnvelope = try await send(request(
            path: "quotes", method: "POST", credential: credential, idempotencyKey: UUID().uuidString.lowercased(),
            body: QuoteRequest(instrumentID: instrumentID)
        ))
        guard envelope.quote.instrumentID == instrumentID, envelope.quote.availability == "AVAILABLE" else {
            throw PaperMarketServiceError.invalidResponse
        }
        return envelope.quote
    }

    func recordDeclaration(
        phase: String,
        instrumentID: String,
        direction: String,
        thesis: String,
        targetAt: Date,
        credential: PaperMarketDeviceCredential
    ) async throws -> RemotePaperMarketDeclaration {
        let requestBody = DeclarationRequest(
            phase: phase,
            instrumentID: instrumentID,
            direction: direction,
            thesis: thesis,
            targetAt: Int64(targetAt.timeIntervalSince1970 * 1000)
        )
        let envelope: DeclarationEnvelope = try await send(request(
            path: "declarations", method: "POST", credential: credential, idempotencyKey: UUID().uuidString.lowercased(), body: requestBody
        ))
        guard envelope.declaration.phase == phase, envelope.declaration.instrumentID == instrumentID else {
            throw PaperMarketServiceError.invalidResponse
        }
        return envelope.declaration
    }

    func openPosition(
        declarationID: UUID,
        side: String,
        quantity: String,
        quote: RemotePaperMarketQuote,
        credential: PaperMarketDeviceCredential
    ) async throws -> RemotePaperMarketPosition {
        let envelope: PositionEnvelope = try await send(request(
            path: "positions", method: "POST", credential: credential, idempotencyKey: UUID().uuidString.lowercased(),
            body: PositionRequest(declarationID: declarationID, side: side, quantity: quantity, quoteSnapshotID: quote.id)
        ))
        guard envelope.position.declarationID == declarationID, envelope.position.entryQuote.id == quote.id else {
            throw PaperMarketServiceError.invalidResponse
        }
        return envelope.position
    }

    func closePosition(
        _ positionID: UUID,
        quote: RemotePaperMarketQuote,
        credential: PaperMarketDeviceCredential
    ) async throws -> RemotePaperMarketPosition {
        let envelope: PositionEnvelope = try await send(request(
            path: "positions/\(positionID.uuidString.lowercased())/close", method: "POST", credential: credential,
            idempotencyKey: UUID().uuidString.lowercased(), body: ClosePositionRequest(quoteSnapshotID: quote.id)
        ))
        guard envelope.position.id == positionID, envelope.position.state == "CLOSED", envelope.position.exitQuote?.id == quote.id else {
            throw PaperMarketServiceError.invalidResponse
        }
        return envelope.position
    }

    func withdrawPosition(_ positionID: UUID, credential: PaperMarketDeviceCredential) async throws -> RemotePaperMarketPosition {
        let envelope: PositionEnvelope = try await send(request(
            path: "positions/\(positionID.uuidString.lowercased())/withdraw", method: "POST", credential: credential,
            idempotencyKey: UUID().uuidString.lowercased(), body: EmptyRequest()
        ))
        guard envelope.position.id == positionID, envelope.position.state == "WITHDRAWN" else {
            throw PaperMarketServiceError.invalidResponse
        }
        return envelope.position
    }

    private func request(path: String, method: String, credential: PaperMarketDeviceCredential? = nil) -> URLRequest {
        let safePath = path.split(separator: "/").map(String.init)
        precondition(!safePath.isEmpty && safePath.allSatisfy { !$0.isEmpty && !$0.contains("?") && !$0.contains("#") })
        var url = origin
        for component in ["api", "community", "paper-market", "v1"] + safePath {
            url.appendPathComponent(component)
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("no-store", forHTTPHeaderField: "Cache-Control")
        if let credential {
            request.setValue("Bearer \(credential.accessToken)", forHTTPHeaderField: "Authorization")
        }
        return request
    }

    private func request<Body: Encodable>(
        path: String,
        method: String,
        credential: PaperMarketDeviceCredential? = nil,
        idempotencyKey: String? = nil,
        body: Body
    ) throws -> URLRequest {
        var request = request(path: path, method: method, credential: credential)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let idempotencyKey {
            request.setValue(idempotencyKey, forHTTPHeaderField: "Idempotency-Key")
        }
        request.httpBody = try JSONEncoder().encode(body)
        return request
    }

    private func send<Response: Decodable>(_ request: URLRequest) async throws -> Response {
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request, delegate: PaperMarketNoRedirectDelegate())
        } catch {
            throw PaperMarketServiceError.networkUnavailable
        }
        guard let http = response as? HTTPURLResponse else { throw PaperMarketServiceError.invalidResponse }
        guard (200...299).contains(http.statusCode) else {
            let message = (try? JSONDecoder().decode(ErrorEnvelope.self, from: data))?.error
            throw PaperMarketServiceError.service(message ?? "The PAPER_TEST service rejected this request.")
        }
        do {
            return try JSONDecoder().decode(Response.self, from: data)
        } catch {
            throw PaperMarketServiceError.invalidResponse
        }
    }
}

/// A device bearer or pairing capability must never survive a redirect to an
/// arbitrary origin. Redirects are a protocol failure, not a retriable hop.
private final class PaperMarketNoRedirectDelegate: NSObject, URLSessionTaskDelegate {
    func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        willPerformHTTPRedirection response: HTTPURLResponse,
        newRequest request: URLRequest,
        completionHandler: @escaping (URLRequest?) -> Void
    ) {
        completionHandler(nil)
    }
}
