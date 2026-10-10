import Foundation

/// Visibility chosen by the owner of a local observation. A public projection
/// intent is deliberately not a network publication, peer-field insertion, or
/// proof that another person has seen the note.
public enum ObservationNoteVisibility: String, CaseIterable, Codable, Sendable, Identifiable, Hashable {
    case privateNote = "PRIVATE_NOTE"
    case publicProjectionRequested = "PUBLIC_PROJECTION_REQUESTED"

    public var id: String { rawValue }

    public var label: String {
        switch self {
        case .privateNote:
            return "Private note"
        case .publicProjectionRequested:
            return "Public note intent (not published)"
        }
    }

    public var isPublicIntent: Bool {
        self == .publicProjectionRequested
    }
}

/// A local personal-universe observation. It stores the phase snapshot and
/// owner-selected visibility intent without treating an alias, a device, or a
/// local ledger row as an identity or publication service.
public struct ObservationNote: Codable, Equatable, Sendable, Identifiable {
    public let id: UUID
    public let universeCoreID: UUID
    public let phase: DeclaredPhase
    public let text: String
    public let visibility: ObservationNoteVisibility
    public let createdAt: Date

    public init(
        id: UUID = UUID(),
        universeCoreID: UUID,
        phase: DeclaredPhase,
        text: String,
        visibility: ObservationNoteVisibility = .privateNote,
        createdAt: Date = .now
    ) throws {
        let normalizedText = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard (1...2_000).contains(normalizedText.count) else {
            throw ObservationNoteError.invalidText
        }

        self.id = id
        self.universeCoreID = universeCoreID
        self.phase = phase
        self.text = normalizedText
        self.visibility = visibility
        self.createdAt = createdAt
    }

    public func validate() throws {
        guard text == text.trimmingCharacters(in: .whitespacesAndNewlines),
              (1...2_000).contains(text.count) else {
            throw ObservationNoteError.invalidText
        }
    }
}

public enum ObservationNoteError: Error, Equatable, Sendable, LocalizedError {
    case invalidText

    public var errorDescription: String? {
        switch self {
        case .invalidText:
            return "Observation notes must contain 1–2,000 non-whitespace characters."
        }
    }
}
