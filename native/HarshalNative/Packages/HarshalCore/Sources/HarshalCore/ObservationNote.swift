import Foundation

/// Visibility selected by the owner of a local observation. A public note
/// remains a local draft until the owner completes the separate, explicit
/// HarshalOS Community publication flow and receives a public receipt.
public enum ObservationNoteVisibility: String, CaseIterable, Codable, Sendable, Identifiable, Hashable {
    case privateNote = "PRIVATE_NOTE"
    /// The raw value is retained for compatibility with notes written before
    /// public publication support. It now means a public-note draft, not a
    /// claim that anything has already reached a peer or public feed.
    case publicProjectionRequested = "PUBLIC_PROJECTION_REQUESTED"

    public var id: String { rawValue }

    public var label: String {
        switch self {
        case .privateNote:
            return "Private note"
        case .publicProjectionRequested:
            return "Public note"
        }
    }

    public var isPublicNote: Bool {
        self == .publicProjectionRequested
    }

    @available(*, deprecated, message: "Use isPublicNote. A local public-note draft is not automatically published.")
    public var isPublicIntent: Bool {
        isPublicNote
    }
}

/// A self-chosen label used by the Community publisher. It is deliberately
/// separate from a local declaration label and never represents verified
/// identity, a credential, or a role.
public struct PublicProfilePseudonym: Codable, Equatable, Sendable, Hashable {
    public let value: String

    public init(_ source: String) throws {
        let normalized = source.trimmingCharacters(in: .whitespacesAndNewlines)
        // Community enforces JavaScript string-length bounds (UTF-16 code
        // units), so mirror that limit here rather than accepting an emoji-only
        // label that the eventual server handoff would reject.
        guard (1...80).contains(normalized.utf16.count),
              !normalized.contains("\n"),
              !normalized.contains("\r"),
              !normalized.contains("\0") else {
            throw PublicProfilePseudonymError.invalidValue
        }
        value = normalized
    }

    public func validate() throws {
        _ = try PublicProfilePseudonym(value)
    }
}

public enum PublicProfilePseudonymError: Error, Equatable, Sendable, LocalizedError {
    case invalidValue

    public var errorDescription: String? {
        switch self {
        case .invalidValue:
            return "A public profile pseudonym must contain 1–80 single-line characters within the publisher’s length limit."
        }
    }
}

/// Local metadata for an explicitly staged/public Community note. Capability
/// material is intentionally transient: current builds keep it in the native
/// Keychain vault rather than in a persisted observation record. The optional
/// fields below exist only to recover records written by an older app build;
/// custom encoding never writes either value back to local state.
public struct PublicObservationPublication: Codable, Equatable, Sendable {
    public let handoffID: UUID
    public let author: PublicProfilePseudonym
    /// Legacy in-memory recovery material. A current publication record must
    /// source a claim code from the app's Keychain-backed capability vault.
    public let claimCode: String?
    /// Legacy in-memory recovery material. A current publication record must
    /// source the status capability from the app's Keychain-backed vault.
    public let statusToken: String?
    public let publisherURL: URL
    public let expiresAt: Date
    public let state: PublicObservationPublicationState
    public let publicObservationID: UUID?
    public let publicURL: URL?
    public let publishedAt: Date?

    public init(
        handoffID: UUID,
        author: PublicProfilePseudonym,
        claimCode: String? = nil,
        statusToken: String? = nil,
        publisherURL: URL,
        expiresAt: Date,
        state: PublicObservationPublicationState,
        publicObservationID: UUID? = nil,
        publicURL: URL? = nil,
        publishedAt: Date? = nil
    ) throws {
        try author.validate()
        guard publisherURL.scheme?.lowercased() == "https",
              publisherURL.host != nil else {
            throw ObservationNoteError.invalidPublication
        }
        if let statusToken {
            guard statusToken.range(of: "^[A-Za-z0-9_-]{43}$", options: .regularExpression) != nil else {
                throw ObservationNoteError.invalidPublication
            }
        }
        if let claimCode {
            guard claimCode.range(of: "^[A-Z2-9]{4}(?:-[A-Z2-9]{4}){3}$", options: .regularExpression) != nil else {
                throw ObservationNoteError.invalidPublication
            }
        }

        switch state {
        case .published, .withdrawn, .hidden:
            guard claimCode == nil,
                  publicObservationID != nil,
                  publicURL?.scheme?.lowercased() == "https",
                  publicURL?.host != nil,
                  publishedAt != nil else {
                throw ObservationNoteError.invalidPublication
            }
        case .expired:
            guard claimCode == nil,
                  publicObservationID == nil, publicURL == nil, publishedAt == nil else {
                throw ObservationNoteError.invalidPublication
            }
        case .awaitingClaim, .claimed:
            guard publicObservationID == nil, publicURL == nil, publishedAt == nil else {
                throw ObservationNoteError.invalidPublication
            }
        }

        self.handoffID = handoffID
        self.author = author
        self.claimCode = claimCode
        self.statusToken = statusToken
        self.publisherURL = publisherURL
        self.expiresAt = expiresAt
        self.state = state
        self.publicObservationID = publicObservationID
        self.publicURL = publicURL
        self.publishedAt = publishedAt
    }

    public func validate() throws {
        _ = try PublicObservationPublication(
            handoffID: handoffID,
            author: author,
            claimCode: claimCode,
            statusToken: statusToken,
            publisherURL: publisherURL,
            expiresAt: expiresAt,
            state: state,
            publicObservationID: publicObservationID,
            publicURL: publicURL,
            publishedAt: publishedAt
        )
    }

    /// Returns metadata that is safe to persist in an observation record.
    public func strippingLocalCapabilities() throws -> PublicObservationPublication {
        try PublicObservationPublication(
            handoffID: handoffID,
            author: author,
            publisherURL: publisherURL,
            expiresAt: expiresAt,
            state: state,
            publicObservationID: publicObservationID,
            publicURL: publicURL,
            publishedAt: publishedAt
        )
    }

    private enum CodingKeys: String, CodingKey {
        case handoffID
        case author
        case claimCode
        case statusToken
        case publisherURL
        case expiresAt
        case state
        case publicObservationID
        case publicURL
        case publishedAt
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let handoffID = try container.decode(UUID.self, forKey: .handoffID)
        let author = try container.decode(PublicProfilePseudonym.self, forKey: .author)
        let claimCode = try container.decodeIfPresent(String.self, forKey: .claimCode)
        let statusToken = try container.decodeIfPresent(String.self, forKey: .statusToken)
        let publisherURL = try container.decode(URL.self, forKey: .publisherURL)
        let expiresAt = try container.decode(Date.self, forKey: .expiresAt)
        let state = try container.decode(PublicObservationPublicationState.self, forKey: .state)
        let publicObservationID = try container.decodeIfPresent(UUID.self, forKey: .publicObservationID)
        let publicURL = try container.decodeIfPresent(URL.self, forKey: .publicURL)
        let publishedAt = try container.decodeIfPresent(Date.self, forKey: .publishedAt)
        try self.init(
            handoffID: handoffID,
            author: author,
            claimCode: claimCode,
            statusToken: statusToken,
            publisherURL: publisherURL,
            expiresAt: expiresAt,
            state: state,
            publicObservationID: publicObservationID,
            publicURL: publicURL,
            publishedAt: publishedAt
        )
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(handoffID, forKey: .handoffID)
        try container.encode(author, forKey: .author)
        // Never persist bearer material in ObservationNote / UserDefaults / file
        // storage. Legacy fields are decoded only for one-way Keychain migration.
        try container.encode(publisherURL, forKey: .publisherURL)
        try container.encode(expiresAt, forKey: .expiresAt)
        try container.encode(state, forKey: .state)
        try container.encodeIfPresent(publicObservationID, forKey: .publicObservationID)
        try container.encodeIfPresent(publicURL, forKey: .publicURL)
        try container.encodeIfPresent(publishedAt, forKey: .publishedAt)
    }
}

public enum PublicObservationPublicationState: String, Codable, Equatable, Sendable {
    case awaitingClaim = "AWAITING_CLAIM"
    case claimed = "CLAIMED"
    case published = "PUBLISHED"
    case withdrawn = "WITHDRAWN"
    case hidden = "HIDDEN"
    case expired = "EXPIRED"

    public var label: String {
        switch self {
        case .awaitingClaim: return "Awaiting manual claim"
        case .claimed: return "Claimed — awaiting publish"
        case .published: return "Published"
        case .withdrawn: return "Withdrawn from public feed"
        case .hidden: return "Hidden from public feed"
        case .expired: return "Handoff expired"
        }
    }
}

/// A local personal-universe observation. It stores a phase snapshot and local
/// publication metadata without treating an alias, device, or local ledger row
/// as an identity, authorization, or peer service.
public struct ObservationNote: Codable, Equatable, Sendable, Identifiable {
    public let id: UUID
    public let universeCoreID: UUID
    public let phase: DeclaredPhase
    public let text: String
    public let visibility: ObservationNoteVisibility
    public let createdAt: Date
    /// Nil means a public-note draft has not been sent to the short-lived
    /// publication handoff yet. It never changes a private note into public.
    public let publicPublication: PublicObservationPublication?

    public init(
        id: UUID = UUID(),
        universeCoreID: UUID,
        phase: DeclaredPhase,
        text: String,
        visibility: ObservationNoteVisibility = .privateNote,
        createdAt: Date = .now,
        publicPublication: PublicObservationPublication? = nil
    ) throws {
        let normalizedText = text.trimmingCharacters(in: .whitespacesAndNewlines)
        // Match the Community payload limit, which is measured as JavaScript
        // UTF-16 string length at the Worker boundary.
        guard (1...2_000).contains(normalizedText.utf16.count),
              !normalizedText.contains("\0") else {
            throw ObservationNoteError.invalidText
        }
        if visibility == .privateNote, publicPublication != nil {
            throw ObservationNoteError.invalidPublication
        }
        if let publicPublication {
            try publicPublication.validate()
        }

        self.id = id
        self.universeCoreID = universeCoreID
        self.phase = phase
        self.text = normalizedText
        self.visibility = visibility
        self.createdAt = createdAt
        self.publicPublication = publicPublication
    }

    public func replacingPublicPublication(
        _ publication: PublicObservationPublication?
    ) throws -> ObservationNote {
        try ObservationNote(
            id: id,
            universeCoreID: universeCoreID,
            phase: phase,
            text: text,
            visibility: visibility,
            createdAt: createdAt,
            publicPublication: publication
        )
    }

    public func validate() throws {
        guard text == text.trimmingCharacters(in: .whitespacesAndNewlines),
              (1...2_000).contains(text.utf16.count),
              !text.contains("\0"),
              !(visibility == .privateNote && publicPublication != nil) else {
            throw ObservationNoteError.invalidText
        }
        // Rebuild to validate a decoded optional publication record without
        // exposing a mutating validation surface on the value model.
        _ = try ObservationNote(
            id: id,
            universeCoreID: universeCoreID,
            phase: phase,
            text: text,
            visibility: visibility,
            createdAt: createdAt,
            publicPublication: publicPublication
        )
    }
}

public enum ObservationNoteError: Error, Equatable, Sendable, LocalizedError {
    case invalidText
    case invalidPublication

    public var errorDescription: String? {
        switch self {
        case .invalidText:
            return "Observation notes must contain 1–2,000 non-whitespace characters."
        case .invalidPublication:
            return "Public-observation publication metadata is invalid for this local note."
        }
    }
}
