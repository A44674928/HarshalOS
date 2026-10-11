import Foundation

/// The classification used by Harshal Native before data reaches an adapter.
/// It describes an app-controlled disclosure boundary, not identity, consent,
/// truth, licensing, or external authorization.
public enum HarshalDataClassification: String, CaseIterable, Codable, Sendable, Identifiable, Hashable {
    /// Personal-universe state, declaration labels, private notes, and local
    /// account-like state. This class has no external projection path.
    case privateUniverseCore = "PRIVATE_UNIVERSE_CORE"
    /// Local integrity aids such as receipts and hash-chain entries. These are
    /// not an independent witness and cannot become a remote authority record.
    case localIntegrityRecord = "LOCAL_INTEGRITY_RECORD"
    /// The three-field, explicitly user-confirmed Community note projection.
    case boundedPublicObservation = "BOUNDED_PUBLIC_OBSERVATION"
    /// A user-approved mirror to the owner's private CloudKit database.
    case privateCloudMirror = "PRIVATE_CLOUD_MIRROR"

    public var id: String { rawValue }

    public var label: String {
        switch self {
        case .privateUniverseCore:
            return "Private universe core — no external projection"
        case .localIntegrityRecord:
            return "Local integrity record — not remote authority"
        case .boundedPublicObservation:
            return "Bounded public observation — explicit projection only"
        case .privateCloudMirror:
            return "Private CloudKit mirror — owner initiated only"
        }
    }
}

/// App-controlled surfaces are enumerated so a future adapter cannot silently
/// reinterpret a private surface as a general integration API.
public enum HarshalControlledSurface: String, CaseIterable, Codable, Sendable, Identifiable, Hashable {
    case personalUniverseCore = "PERSONAL_UNIVERSE_CORE"
    case localLedger = "LOCAL_LEDGER"
    case publicObservationProjection = "PUBLIC_OBSERVATION_PROJECTION"
    case privateCloudKitMirror = "PRIVATE_CLOUDKIT_MIRROR"

    public var id: String { rawValue }

    public var dataClassification: HarshalDataClassification {
        switch self {
        case .personalUniverseCore:
            return .privateUniverseCore
        case .localLedger:
            return .localIntegrityRecord
        case .publicObservationProjection:
            return .boundedPublicObservation
        case .privateCloudKitMirror:
            return .privateCloudMirror
        }
    }

    public var boundary: String {
        switch self {
        case .personalUniverseCore:
            return "No external integration, SDK, peer service, or public projection is available for private-core state."
        case .localLedger:
            return "Local ledger entries and receipts can detect ordinary local mutation only; they are never an external authority or signing service."
        case .publicObservationProjection:
            return "Only an explicit phase snapshot, exact note text, and self-chosen public pseudonym may reach the Community handoff."
        case .privateCloudKitMirror:
            return "Only an owner-initiated private sync adapter may mirror its separately documented declaration/receipt payload."
        }
    }
}

/// A minimal, purpose-built public payload. It intentionally has no universe
/// core identifier, declaration label, receipt, CloudKit record, gate state,
/// market record, device identifier, account identifier, or private-note field.
public struct PublicObservationProjection: Codable, Equatable, Sendable {
    public let phase: String
    public let text: String
    public let author: String

    public init(note: ObservationNote, author: PublicProfilePseudonym) throws {
        guard note.visibility.isPublicNote else {
            throw HarshalDataEgressError.privateDataCannotProject
        }
        try note.validate()
        try author.validate()
        phase = note.phase.rawValue
        text = note.text
        self.author = author.value
    }
}

public enum HarshalDataEgressError: Error, Equatable, Sendable, LocalizedError {
    case privateDataCannotProject

    public var errorDescription: String? {
        switch self {
        case .privateDataCannotProject:
            return "Private universe-core data has no public projection path. Only an explicitly public observation can be prepared for the Community handoff."
        }
    }
}

/// Stable local policy metadata for the enforced public-observation boundary.
/// This describes the payload shape the app can emit; it does not establish a
/// remote service's trustworthiness or independently verify a recipient.
public enum HarshalDataEgressPolicy {
    public static let version = "HOS-NATIVE-EGRESS-1"
    public static let publicObservationFields = ["author", "phase", "text"]

    public static func publicObservation(
        from note: ObservationNote,
        author: PublicProfilePseudonym
    ) throws -> PublicObservationProjection {
        try PublicObservationProjection(note: note, author: author)
    }
}
