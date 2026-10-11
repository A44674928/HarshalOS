import Foundation
import HarshalMarkets

/// The live Good Intelligence ticker feed.
///
/// Read-only GET against the HarshalOS Worker origin's reviewed Tickerbot
/// route using the already-paired PAPER_TEST device credential. The provider
/// key stays inside the Worker; this service never sees one. A symbol is
/// always matched against the reviewed roster before any path is formed, and
/// a failed or unavailable response never becomes a substituted reading —
/// the board simply keeps its labelled simulated engine.
struct TickerFeedService {
    enum FeedError: LocalizedError, Equatable {
        case notConfigured
        case invalidConfiguration
        case credentialUnavailable
        case http(Int)
        case invalidResponse

        var errorDescription: String? {
            switch self {
            case .notConfigured:
                return "The Good Intelligence Worker origin is not configured in this build."
            case .invalidConfiguration:
                return "The configured origin is invalid."
            case .credentialUnavailable:
                return "No paired PAPER_TEST credential is stored on this device."
            case let .http(status):
                return "The feed answered HTTP \(status)."
            case .invalidResponse:
                return "The feed response was not a valid gi-market-context-v1 packet."
            }
        }
    }

    private let origin: URL
    private let session: URLSession

    private static let isolatedSession: URLSession = {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.httpShouldSetCookies = false
        configuration.httpCookieStorage = nil
        configuration.urlCache = nil
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
        configuration.timeoutIntervalForRequest = 12
        configuration.timeoutIntervalForResource = 15
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
            throw FeedError.invalidConfiguration
        }
        self.origin = origin
        self.session = session ?? Self.isolatedSession
    }

    /// Mirror of `PaperMarketService.configured()` origin rules.
    static func configured() throws -> TickerFeedService {
        guard let rawOrigin = Bundle.main.object(forInfoDictionaryKey: "HarshalCommunityOrigin") as? String,
              let origin = URL(string: rawOrigin),
              let host = origin.host?.lowercased(),
              host != "main.empty.domains" else {
            throw FeedError.notConfigured
        }
        return try TickerFeedService(origin: origin)
    }

    static func isConfigured() -> Bool {
        (try? configured()) != nil
    }

    /// Fetch one symbol's bars. Only roster symbols can ever form a path.
    func fetchBars(
        symbol: String,
        interval: String = "1h",
        credential: PaperMarketDeviceCredential,
        now: Date = Date()
    ) async throws -> TickerbotBarsPacket {
        guard let asset = GoodIntelligenceTickerRoster.asset(for: symbol) else {
            throw TickerFeedError.rosterSymbolRejected(symbol)
        }
        var components = URLComponents(url: origin, resolvingAgainstBaseURL: false)
        components?.path = GoodIntelligenceTickerRoster.barsRoute
        components?.queryItems = [
            URLQueryItem(name: "symbol", value: asset.symbol),
            URLQueryItem(name: "interval", value: interval)
        ]
        guard let url = components?.url else {
            throw FeedError.invalidConfiguration
        }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("Bearer \(credential.accessToken)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw FeedError.invalidResponse
        }
        guard http.statusCode == 200 else {
            throw FeedError.http(http.statusCode)
        }
        switch TickerbotBarsPacket.validate(data) {
        case let .success(packet):
            return packet
        case .failure:
            throw FeedError.invalidResponse
        }
    }
}
