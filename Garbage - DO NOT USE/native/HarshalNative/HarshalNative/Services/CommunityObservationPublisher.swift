import Foundation
import HarshalCore

/// Thin, user-initiated adapter for the HarshalOS Community public-observation
/// handoff. It sends only a public note's phase snapshot, text, and selected
/// public pseudonym—never a personal universe-core ID, declaration label,
/// private note, CloudKit record, or gate state.
struct CommunityObservationPublisher {
    private let origin: URL
    private let session: URLSession

    private static let isolatedSession: URLSession = {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.httpShouldSetCookies = false
        configuration.httpCookieStorage = nil
        configuration.urlCache = nil
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
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
            throw CommunityObservationPublisherError.invalidConfiguration
        }
        self.origin = origin
        self.session = session ?? Self.isolatedSession
    }

    static func configured() throws -> CommunityObservationPublisher {
        guard let rawOrigin = Bundle.main.object(forInfoDictionaryKey: "HarshalCommunityOrigin") as? String,
              let origin = URL(string: rawOrigin),
              let host = origin.host?.lowercased(),
              host != "main.empty.domains" else {
            throw CommunityObservationPublisherError.notConfigured
        }
        return try CommunityObservationPublisher(origin: origin)
    }

    func prepare(
        note: ObservationNote,
        author: PublicProfilePseudonym
    ) async throws -> PreparedCommunityObservation {
        let projection = try HarshalDataEgressPolicy.publicObservation(from: note, author: author)
        let response: HandoffEnvelope = try await send(
            path: "api/community/observation-handoffs",
            method: "POST",
            body: projection
        )
        guard isPublisherURL(response.handoff.publisherURL) else {
            throw CommunityObservationPublisherError.invalidResponse
        }
        let capability = try PublicObservationHandoffCapability(
            claimCode: response.handoff.claimCode,
            statusToken: response.handoff.statusToken,
            expiresAt: response.handoff.expiresAt
        )
        let publication = try PublicObservationPublication(
            handoffID: response.handoff.id,
            author: author,
            publisherURL: response.handoff.publisherURL,
            expiresAt: response.handoff.expiresAt,
            state: .awaitingClaim
        )
        return PreparedCommunityObservation(publication: publication, capability: capability)
    }

    func refresh(
        _ publication: PublicObservationPublication,
        capability: PublicObservationHandoffCapability
    ) async throws -> PublicObservationPublication {
        guard capability.expiresAt > .now else {
            throw CommunityObservationPublisherError.handoffCapabilityExpired
        }
        var request = makeRequest(
            path: "api/community/observation-handoffs/\(publication.handoffID.uuidString.lowercased())",
            method: "GET"
        )
        request.setValue(capability.statusToken, forHTTPHeaderField: "X-HOS-Observation-Status")
        let response: HandoffStatusEnvelope = try await send(request)
        let handoff = response.handoff
        guard handoff.id == publication.handoffID else {
            throw CommunityObservationPublisherError.invalidResponse
        }
        let state: PublicObservationPublicationState
        var author = publication.author
        var publicObservationID: UUID?
        var publicURL: URL?
        var publishedAt: Date?

        switch handoff.state {
        case "pending":
            guard handoff.publication == nil, handoff.publicURL == nil else {
                throw CommunityObservationPublisherError.invalidResponse
            }
            state = .awaitingClaim
        case "claimed":
            guard handoff.publication == nil, handoff.publicURL == nil else {
                throw CommunityObservationPublisherError.invalidResponse
            }
            state = .claimed
        case "expired":
            guard handoff.publication == nil, handoff.publicURL == nil else {
                throw CommunityObservationPublisherError.invalidResponse
            }
            state = .expired
        case "published":
            guard let remotePublication = handoff.publication,
                  let remoteState = PublicObservationPublicationState(remoteState: remotePublication.state),
                  let remoteURL = handoff.publicURL,
                  isPublicObservationURL(remoteURL, observationID: remotePublication.id) else {
                throw CommunityObservationPublisherError.invalidResponse
            }
            state = remoteState
            if let remoteAuthor = remotePublication.author {
                author = try PublicProfilePseudonym(remoteAuthor)
            }
            publicObservationID = remotePublication.id
            publicURL = remoteURL
            publishedAt = remotePublication.publishedAt
        default:
            throw CommunityObservationPublisherError.invalidResponse
        }

        return try PublicObservationPublication(
            handoffID: publication.handoffID,
            author: author,
            publisherURL: publication.publisherURL,
            expiresAt: handoff.expiresAt,
            state: state,
            publicObservationID: publicObservationID,
            publicURL: publicURL,
            publishedAt: publishedAt
        )
    }

    private func makeRequest(path: String, method: String) -> URLRequest {
        let relativePath = path.hasPrefix("/") ? String(path.dropFirst()) : path
        var request = URLRequest(url: origin.appendingPathComponent(relativePath))
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        return request
    }

    private func send<Body: Encodable, Response: Decodable>(
        path: String,
        method: String,
        body: Body
    ) async throws -> Response {
        var request = makeRequest(path: path, method: method)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)
        return try await send(request)
    }

    private func send<Response: Decodable>(_ request: URLRequest) async throws -> Response {
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request, delegate: CommunityNoRedirectDelegate())
        } catch {
            throw CommunityObservationPublisherError.networkUnavailable
        }
        guard let http = response as? HTTPURLResponse else {
            throw CommunityObservationPublisherError.invalidResponse
        }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .millisecondsSince1970
        guard (200...299).contains(http.statusCode) else {
            let message = (try? decoder.decode(ErrorEnvelope.self, from: data))?.error
            throw CommunityObservationPublisherError.service(message ?? "The Community publisher rejected this request.")
        }
        do {
            return try decoder.decode(Response.self, from: data)
        } catch {
            throw CommunityObservationPublisherError.invalidResponse
        }
    }

    private func isPublisherURL(_ url: URL) -> Bool {
        isOnConfiguredOrigin(url)
            && url.user == nil
            && url.password == nil
            && url.path == "/observations"
            && url.query == nil
            && url.fragment == nil
    }

    private func isPublicObservationURL(_ url: URL, observationID: UUID) -> Bool {
        guard isOnConfiguredOrigin(url),
              url.user == nil,
              url.password == nil,
              url.path == "/observations",
              url.fragment == nil,
              let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let items = components.queryItems,
              items.count == 1,
              items.first?.name == "id",
              items.first?.value?.lowercased() == observationID.uuidString.lowercased() else {
            return false
        }
        return true
    }

    private func isOnConfiguredOrigin(_ url: URL) -> Bool {
        url.scheme?.lowercased() == origin.scheme?.lowercased()
            && url.host?.lowercased() == origin.host?.lowercased()
            && url.port == origin.port
    }
}

/// The native status token is a capability. Do not let a Worker redirect carry
/// its custom header to another origin; redirects are an invalid protocol result.
private final class CommunityNoRedirectDelegate: NSObject, URLSessionTaskDelegate {
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

/// The remote response is split before it reaches app state: metadata can be
/// persisted with the note, while bearer material goes to Keychain only.
struct PreparedCommunityObservation {
    let publication: PublicObservationPublication
    let capability: PublicObservationHandoffCapability
}

private struct HandoffEnvelope: Decodable {
    let handoff: HandoffDTO
}

private struct HandoffStatusEnvelope: Decodable {
    let handoff: HandoffStatusDTO
}

private struct HandoffDTO: Decodable {
    let id: UUID
    let claimCode: String
    let statusToken: String
    let expiresAt: Date
    let publisherURL: URL
}

private struct HandoffStatusDTO: Decodable {
    let id: UUID
    let state: String
    let expiresAt: Date
    let publication: RemotePublicObservation?
    let publicURL: URL?
}

private struct RemotePublicObservation: Decodable {
    let id: UUID
    let state: String
    let author: String?
    let publishedAt: Date
}

private struct ErrorEnvelope: Decodable {
    let error: String
}

private extension PublicObservationPublicationState {
    init?(remoteState: String) {
        switch remoteState {
        case "published": self = .published
        case "withdrawn": self = .withdrawn
        case "hidden": self = .hidden
        default: return nil
        }
    }
}

enum CommunityObservationPublisherError: LocalizedError {
    case notConfigured
    case invalidConfiguration
    case privateNoteCannotPublish
    case handoffCapabilityExpired
    case networkUnavailable
    case invalidResponse
    case service(String)

    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "The HarshalOS Community publisher is not configured in this app build."
        case .invalidConfiguration:
            return "The HarshalOS Community publisher configuration is invalid."
        case .privateNoteCannotPublish:
            return "Only a note explicitly marked Public can enter the publication flow."
        case .handoffCapabilityExpired:
            return "The local handoff capability has expired. The note remains unpublished; prepare a fresh explicit handoff if needed."
        case .networkUnavailable:
            return "The Community publisher could not be reached. The note remains local and unpublished."
        case .invalidResponse:
            return "The Community publisher returned an invalid response. The note remains unpublished until a confirmed receipt is recovered."
        case let .service(message):
            return message
        }
    }
}
