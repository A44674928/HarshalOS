import Foundation

/// How the native app may use a section of the published AGS v0.2 corpus.
/// These dispositions preserve the source edition's part-level evidence labels;
/// they do not convert prose into executable authority or a deployed control.
public enum AGSv02NativeDisposition: String, CaseIterable, Codable, Sendable, Identifiable, Hashable {
    case foundationReference = "FOUNDATION_REFERENCE"
    case boundedDesignReference = "BOUNDED_DESIGN_REFERENCE"
    case sourceScopedReference = "SOURCE_SCOPED_REFERENCE"
    case threatResearchCatalogOnly = "THREAT_RESEARCH_CATALOG_ONLY"
    case conceptualReferenceOnly = "CONCEPTUAL_REFERENCE_ONLY"
    case narrativeOrFictionOnly = "NARRATIVE_OR_FICTION_ONLY"
    case archivalReferenceOnly = "ARCHIVAL_REFERENCE_ONLY"
    case machineReadableReferenceOnly = "MACHINE_READABLE_REFERENCE_ONLY"

    public var id: String { rawValue }

    public var label: String {
        switch self {
        case .foundationReference:
            return "Foundation reference"
        case .boundedDesignReference:
            return "Bounded design reference"
        case .sourceScopedReference:
            return "Claim-scoped reference"
        case .threatResearchCatalogOnly:
            return "Threat-research catalog only"
        case .conceptualReferenceOnly:
            return "Conceptual reference only"
        case .narrativeOrFictionOnly:
            return "Narrative / fiction only"
        case .archivalReferenceOnly:
            return "Archival reference only"
        case .machineReadableReferenceOnly:
            return "Machine-readable reference only"
        }
    }

    public var boundary: String {
        switch self {
        case .foundationReference:
            return "May inform local terminology and bounded native models; it does not grant authority."
        case .boundedDesignReference:
            return "May inform refusal-first and least-privilege design only; deployment evidence remains separate."
        case .sourceScopedReference:
            return "Use only with the section's own claim-level provenance and evidence boundaries."
        case .threatResearchCatalogOnly:
            return "Render only as a read-only classified source; app behavior uses the defensive boundary only. Do not derive scenarios, target material, procedures, activation logic, or response workflows."
        case .conceptualReferenceOnly:
            return "Treat as a conceptual proposal; do not present it as a validated capability or physical control."
        case .narrativeOrFictionOnly:
            return "Keep separate from operational, evidentiary, or authorization-bearing features."
        case .archivalReferenceOnly:
            return "Preserve historical context without elevating it to an independent finding or current authority."
        case .machineReadableReferenceOnly:
            return "Reference data can support source navigation but never grants runtime permission or external authority."
        }
    }
}

/// A navigable, non-executable source record for one published corpus section.
public struct AGSv02CorpusSection: Identifiable, Hashable, Sendable {
    public let id: String
    public let title: String
    public let printedStartPage: String
    public let pdfStartPage: Int
    public let sourceClassification: String
    public let nativeDisposition: AGSv02NativeDisposition

    public init(
        id: String,
        title: String,
        printedStartPage: String,
        pdfStartPage: Int,
        sourceClassification: String,
        nativeDisposition: AGSv02NativeDisposition
    ) {
        self.id = id
        self.title = title
        self.printedStartPage = printedStartPage
        self.pdfStartPage = pdfStartPage
        self.sourceClassification = sourceClassification
        self.nativeDisposition = nativeDisposition
    }
}

/// Source-of-record map for the production AGS v0.2 full-book KDP interior.
///
/// The published volume is treated as one text-based source corpus, while each
/// section retains its own provenance/evidence constraints. This map is not a
/// PDF reader, executable operating system, implementation claim, identity
/// system, external authority, or authorization mechanism.
public enum AGSv02PublishedCorpus {
    public static let identifier = "AGS-V0.2-FULL-BOOK-2026-10-07"
    public static let title = "AGS v0.2: Harshal’s Systems — Full Book"
    public static let edition = "Production Edition · Version 0.2 · October 2026"
    public static let author = "Harshal Priyavadan Patel"
    public static let sourceArtifactPath = "publications/book/AGS-v0.2-Harshal-s-Systems-Full-Book-KDP-interior-2026-10-07.pdf"
    public static let sourceSHA256 = "6c67feae3881c11bab8e2654e1f58d23aabbbb1dfdcd536464218c2bbf839823"
    public static let pdfPageCount = 548
    public static let sourceRule = "Treat the full volume as a source corpus, but preserve each section’s local provenance, evidence, and non-deployment limits. No section upgrades another section’s evidence status."
    public static let runtimeBoundary = "The app records source navigation only. It does not package the PDF, execute its prose, claim deployment, determine identity or human state, or grant permission from a source citation."

    public static let sections: [AGSv02CorpusSection] = [
        .init(
            id: "FRONT-MATTER",
            title: "Front Matter and Editorial Material",
            printedStartPage: "i",
            pdfStartPage: 1,
            sourceClassification: "EDITORIAL / SOURCE-GOVERNANCE",
            nativeDisposition: .sourceScopedReference
        ),
        .init(id: "PART-I", title: "The Core Book", printedStartPage: "1", pdfStartPage: 27, sourceClassification: "CANONICAL_SOURCE", nativeDisposition: .foundationReference),
        .init(id: "PART-II", title: "Formalization", printedStartPage: "25", pdfStartPage: 51, sourceClassification: "CANONICAL_SOURCE", nativeDisposition: .foundationReference),
        .init(id: "PART-III", title: "AGS: Accountability-Gated Systems", printedStartPage: "29", pdfStartPage: 55, sourceClassification: "CANONICAL_SOURCE", nativeDisposition: .boundedDesignReference),
        .init(id: "PART-IV", title: "OCM: Orb Communicator Model", printedStartPage: "41", pdfStartPage: 67, sourceClassification: "CANONICAL_SOURCE", nativeDisposition: .boundedDesignReference),
        .init(id: "PART-V", title: "AI Inner Shell", printedStartPage: "47", pdfStartPage: 73, sourceClassification: "CANONICAL_SOURCE", nativeDisposition: .boundedDesignReference),
        .init(id: "PART-VI", title: "Addressing and Spherical Topology", printedStartPage: "51", pdfStartPage: 77, sourceClassification: "CANONICAL_SOURCE", nativeDisposition: .boundedDesignReference),
        .init(id: "PART-VII", title: "Operator Model", printedStartPage: "65", pdfStartPage: 91, sourceClassification: "CANONICAL_SOURCE", nativeDisposition: .boundedDesignReference),
        .init(id: "PART-VIII", title: "Disc Primitives, Routing, and Lifecycle", printedStartPage: "71", pdfStartPage: 97, sourceClassification: "CANONICAL_SOURCE", nativeDisposition: .boundedDesignReference),
        .init(id: "PART-IX", title: "AGS Layering and Conformance", printedStartPage: "85", pdfStartPage: 111, sourceClassification: "CANONICAL_SOURCE", nativeDisposition: .boundedDesignReference),
        .init(id: "PART-X", title: "AGS Accessory Pack", printedStartPage: "89", pdfStartPage: 115, sourceClassification: "CANONICAL_SOURCE", nativeDisposition: .boundedDesignReference),
        .init(id: "PART-XI", title: "Ground-0 and Duty Collation", printedStartPage: "97", pdfStartPage: 123, sourceClassification: "MIXED", nativeDisposition: .sourceScopedReference),
        .init(id: "PART-XII", title: "Whyland Standards", printedStartPage: "137", pdfStartPage: 163, sourceClassification: "CANONICAL_SOURCE", nativeDisposition: .boundedDesignReference),
        .init(id: "PART-XIII", title: "Neural Atomic Bodies Compendium", printedStartPage: "141", pdfStartPage: 167, sourceClassification: "CANONICAL_SOURCE", nativeDisposition: .boundedDesignReference),
        .init(id: "PART-XIV", title: "Keyed Human–Machine Hybrid Controls", printedStartPage: "145", pdfStartPage: 171, sourceClassification: "CANONICAL_SOURCE", nativeDisposition: .boundedDesignReference),
        .init(id: "PART-XV", title: "Threat Modeling and Context-Dependent Guarantees", printedStartPage: "153", pdfStartPage: 179, sourceClassification: "THREAT_RESEARCH", nativeDisposition: .threatResearchCatalogOnly),
        .init(id: "PART-XVI", title: "Atomic-Body Classes and Reactor Doctrine", printedStartPage: "171", pdfStartPage: 197, sourceClassification: "CONCEPTUAL_MODEL", nativeDisposition: .conceptualReferenceOnly),
        .init(id: "PART-XVII", title: "Institutional Application", printedStartPage: "195", pdfStartPage: 221, sourceClassification: "MIXED", nativeDisposition: .sourceScopedReference),
        .init(id: "PART-XVIII", title: "Flagship Research: Accountability in Keyed Human–Machine Hybrid Systems", printedStartPage: "203", pdfStartPage: 229, sourceClassification: "RESEARCH", nativeDisposition: .boundedDesignReference),
        .init(id: "PART-XIX", title: "Supply Chain and Implanted-Device Threat Research", printedStartPage: "213", pdfStartPage: 239, sourceClassification: "THREAT_RESEARCH", nativeDisposition: .threatResearchCatalogOnly),
        .init(id: "PART-XIX-B", title: "Illustrative Narrative Sandbox", printedStartPage: "241", pdfStartPage: 267, sourceClassification: "FICTION / NARRATIVE_SANDBOX", nativeDisposition: .narrativeOrFictionOnly),
        .init(id: "PART-XX", title: "MicroConvergence and Signal Encoding", printedStartPage: "281", pdfStartPage: 307, sourceClassification: "CONCEPTUAL_RESEARCH", nativeDisposition: .conceptualReferenceOnly),
        .init(id: "PART-XXI", title: "Policy and Governance Archive", printedStartPage: "295", pdfStartPage: 321, sourceClassification: "ARCHIVE / RESEARCH", nativeDisposition: .sourceScopedReference),
        .init(id: "PART-XXII", title: "Specification Series", printedStartPage: "313", pdfStartPage: 339, sourceClassification: "PROPOSED_SPECIFICATION", nativeDisposition: .conceptualReferenceOnly),
        .init(id: "PART-XXIII", title: "The Grand River Foundation", printedStartPage: "345", pdfStartPage: 371, sourceClassification: "FICTION", nativeDisposition: .narrativeOrFictionOnly),
        .init(id: "PART-XXIV", title: "Anti-Denial of Justice and NAB I/O", printedStartPage: "373", pdfStartPage: 399, sourceClassification: "MIXED / CONCEPTUAL", nativeDisposition: .sourceScopedReference),
        .init(id: "PART-XXV", title: "Whole Corpus / Complete Work", printedStartPage: "427", pdfStartPage: 453, sourceClassification: "DERIVATIVE_BUILD / MIXED", nativeDisposition: .archivalReferenceOnly),
        .init(id: "APPENDIX-A", title: "Formal Constraint Equations and Term Notes", printedStartPage: "435", pdfStartPage: 461, sourceClassification: "COLLECTED_REFERENCE", nativeDisposition: .conceptualReferenceOnly),
        .init(id: "APPENDIX-B", title: "Safety Rationale for Adversarial Scenarios", printedStartPage: "442", pdfStartPage: 468, sourceClassification: "COLLECTED_HISTORICAL_PROPOSAL", nativeDisposition: .threatResearchCatalogOnly),
        .init(id: "APPENDIX-C", title: "Ground-0 Supplementary Exercises", printedStartPage: "444", pdfStartPage: 470, sourceClassification: "COLLECTED_EXERCISES", nativeDisposition: .sourceScopedReference),
        .init(id: "APPENDIX-D", title: "Historical AI Audit Record", printedStartPage: "446", pdfStartPage: 472, sourceClassification: "HISTORICAL_AUDIT_CONTAINER", nativeDisposition: .archivalReferenceOnly),
        .init(id: "APPENDIX-D.1", title: "Audit A: Claude", printedStartPage: "447", pdfStartPage: 473, sourceClassification: "HISTORICAL_AUDIT_RECORD", nativeDisposition: .archivalReferenceOnly),
        .init(id: "APPENDIX-D.2", title: "Audit B: Anonymous AI via Arena.ai", printedStartPage: "452", pdfStartPage: 478, sourceClassification: "HISTORICAL_AUDIT_RECORD", nativeDisposition: .archivalReferenceOnly),
        .init(id: "APPENDIX-E", title: "Integration & Operations Guide", printedStartPage: "458", pdfStartPage: 484, sourceClassification: "COLLECTED_PROPOSAL", nativeDisposition: .conceptualReferenceOnly),
        .init(id: "APPENDIX-F", title: "Signal Class Quick Reference", printedStartPage: "459", pdfStartPage: 485, sourceClassification: "COLLECTED_REFERENCE", nativeDisposition: .conceptualReferenceOnly),
        .init(id: "APPENDIX-G", title: "Core Book AI Companion", printedStartPage: "460", pdfStartPage: 486, sourceClassification: "MACHINE_READABLE_COMPANION", nativeDisposition: .machineReadableReferenceOnly),
        .init(id: "GLOSSARY", title: "Consolidated Glossary", printedStartPage: "519", pdfStartPage: 545, sourceClassification: "REFERENCE_INDEX", nativeDisposition: .machineReadableReferenceOnly)
    ]

    public static func section(_ id: String) -> AGSv02CorpusSection? {
        sections.first { $0.id == id }
    }
}

/// The local PDF editions that the native Library may render. The published
/// edition is the source-of-record artifact. The night reading edition has the
/// same page map and text continuity, but is explicitly a visual derivative
/// rather than a replacement source or new evidence record.
public enum AGSv02LibraryEdition: String, CaseIterable, Identifiable, Sendable, Hashable {
    case published = "PUBLISHED_KDP_INTERIOR"
    case nightReading = "NIGHT_READING_DERIVATIVE"

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .published:
            return "Published Edition"
        case .nightReading:
            return "Night Reading Edition"
        }
    }

    public var symbolName: String {
        switch self {
        case .published:
            return "book.closed.fill"
        case .nightReading:
            return "moon.stars.fill"
        }
    }

    public var classification: String {
        switch self {
        case .published:
            return "EXACT_PUBLISHED_ARTIFACT"
        case .nightReading:
            return "PRESENTATION_ONLY_DERIVATIVE"
        }
    }

    public var resourceName: String {
        switch self {
        case .published:
            return "AGS-v0.2-Harshal-s-Systems-Full-Book-KDP-interior-2026-10-07"
        case .nightReading:
            return "AGS-v0.2-Harshal-s-Systems-Night-Reading-Edition-2026-10-10"
        }
    }

    public var artifactPath: String {
        switch self {
        case .published:
            return AGSv02PublishedCorpus.sourceArtifactPath
        case .nightReading:
            return "publications/book/AGS-v0.2-Harshal-s-Systems-Night-Reading-Edition-2026-10-10.pdf"
        }
    }

    public var expectedSHA256: String {
        switch self {
        case .published:
            return AGSv02PublishedCorpus.sourceSHA256
        case .nightReading:
            return "cd46c3c47aea1deb2e54dd32ebc324e3f1ce6106c13a6eeb9b3ccec07e348f7c"
        }
    }

    public var expectedPageCount: Int {
        AGSv02PublishedCorpus.pdfPageCount
    }

    public var summary: String {
        switch self {
        case .published:
            return "Exact 548-page KDP publication artifact, verified against the published source checksum."
        case .nightReading:
            return "Optional black-and-electric-blue local reading presentation with the same 548-page map and source-text continuity."
        }
    }

    public var integrityBoundary: String {
        switch self {
        case .published:
            return "This is the source-of-record KDP interior. The Library renders it read-only and never alters its pages."
        case .nightReading:
            return "This is a locally bundled visual derivative of the verified published edition. It does not supersede, replace, or claim to be the exact KDP source artifact."
        }
    }

    public var isExactPublishedArtifact: Bool {
        self == .published
    }
}

/// A curated, versioned companion index for the public HarshalOS repository.
/// It intentionally provides source locations rather than treating repository
/// prose as executable policy, an API, or an authority-bearing integration.
public struct HarshalRepositoryCompanion: Identifiable, Hashable, Sendable {
    public let id: String
    public let title: String
    public let repositoryPath: String
    public let classification: String
    public let summary: String
    public let boundary: String

    public init(
        id: String,
        title: String,
        repositoryPath: String,
        classification: String,
        summary: String,
        boundary: String
    ) {
        self.id = id
        self.title = title
        self.repositoryPath = repositoryPath
        self.classification = classification
        self.summary = summary
        self.boundary = boundary
    }

    public var githubURL: URL? {
        URL(string: "https://github.com/A44674928/HarshalOS/blob/main/\(repositoryPath)")
    }
}

/// Repository companions surfaced beside the embedded published book. The app
/// opens them only through the platform browser; it does not embed a browser,
/// fetch remote source into private state, or execute any repository material.
public enum HarshalRepositoryCompanionCatalog {
    public static let repositoryURL = "https://github.com/A44674928/HarshalOS"
    public static let summary = "Curated GitHub companion materials for source navigation. Remote repository pages remain external, versioned references and do not alter the bundled book or the app’s local security boundary."

    public static let entries: [HarshalRepositoryCompanion] = [
        .init(id: "ROOT-README", title: "HarshalOS repository overview", repositoryPath: "README.md", classification: "PROJECT_OVERVIEW", summary: "Top-level project map, native-app entry point, and operational boundaries.", boundary: "Read as repository documentation; it does not grant authority or configure a deployment."),
        .init(id: "SECURITY", title: "Security boundary", repositoryPath: "SECURITY.md", classification: "SECURITY_DOCUMENTATION", summary: "Repository security expectations and limits.", boundary: "A security document is not an attestation, incident finding, or guarantee."),
        .init(id: "CANONICAL-MODEL", title: "Canonical model", repositoryPath: "specs/normative/canonical-model.md", classification: "NORMATIVE_REFERENCE", summary: "Versioned canonical model and semantic registry reference.", boundary: "Source rules still require a separately implemented and reviewed action boundary."),
        .init(id: "WORKING-LIBRARY", title: "Working-draft library index", repositoryPath: "docs/harshal-systems/README.md", classification: "WORKING_DRAFT_LIBRARY", summary: "Repository-era corpus index and its published-edition mapping note.", boundary: "Its legacy numbering does not override the published AGS v0.2 page map."),
        .init(id: "LEGACY-ACCOUNTABILITY", title: "Legacy accountability research companion", repositoryPath: "docs/harshal-systems/19-research-papers.md", classification: "LEGACY_COMPANION_RECORD", summary: "Repository companion record for accountability research.", boundary: "Use as historical companion material; published AGS v0.2 locates accountability research in Part XVIII."),
        .init(id: "NATIVE-ARCHITECTURE", title: "Native architecture", repositoryPath: "native/HarshalNative/docs/ARCHITECTURE.md", classification: "NATIVE_ARCHITECTURE", summary: "Swift app modules, trust boundaries, and migration map.", boundary: "Architecture documentation does not configure CloudKit, sign-in, or external authority."),
        .init(id: "PUBLISHED-CORPUS", title: "Published AGS v0.2 corpus map", repositoryPath: "native/HarshalNative/docs/AGS-V0.2-CORPUS.md", classification: "PUBLISHED_SOURCE_MAP", summary: "Source-of-record map for the bundled 548-page KDP interior.", boundary: "Part-level source/evidence classifications remain distinct; no source citation becomes runtime permission."),
        .init(id: "LIBRARY-READER", title: "Native Library reader boundary", repositoryPath: "native/HarshalNative/docs/LIBRARY-READER.md", classification: "NATIVE_READER_DOCUMENTATION", summary: "Bundled-book integrity, reader behavior, and companion-index limits.", boundary: "The reader is local and read-only; it does not execute text or load arbitrary remote documents."),
        .init(id: "SCAV-BOUNDARY", title: "SCAV++ boundary", repositoryPath: "native/HarshalNative/docs/SUPPLY-CHAIN-BOUNDARY.md", classification: "DEFENSIVE_BOUNDARY", summary: "Refusal-first integration boundary and source treatment.", boundary: "It is not a scanner, attack workflow, or external-action service."),
        .init(id: "SHIPPING-PROVENANCE", title: "Shipping provenance baseline", repositoryPath: "native/HarshalNative/docs/SHIPPING-PROVENANCE-BASELINE.md", classification: "CRYPTOGRAPHIC_BASELINE", summary: "Generic evidence-continuity verification limits and hold behavior.", boundary: "It is not logistics control, physical inspection, or release authority."),
        .init(id: "NEO-ORB", title: "NEO ORB geometry", repositoryPath: "native/HarshalNative/docs/NEO-ORB.md", classification: "DISPLAY_ONLY_MODEL", summary: "Native display geometry, topology, and fixture limits.", boundary: "Visual topology does not establish a route, provider fact, market claim, or authority effect."),
        .init(id: "PAPER-MARKETS", title: "Paper-market boundary", repositoryPath: "native/HarshalNative/docs/PAPER-TRADING.md", classification: "SIMULATION_DOCUMENTATION", summary: "Phase-neutral, local paper-market records and their limits.", boundary: "It is not a broker, payment path, market-data provider, or investment recommendation."),
        .init(id: "COMMUNITY-D1", title: "Community D1 deployment guide", repositoryPath: "docs/deployment/COMMUNITY-D1.md", classification: "OWNER_RUN_DEPLOYMENT_GUIDE", summary: "Owner-managed Community deployment and migration requirements.", boundary: "It is a deployment reference; the app never runs migrations or embeds credentials.")
    ]
}
