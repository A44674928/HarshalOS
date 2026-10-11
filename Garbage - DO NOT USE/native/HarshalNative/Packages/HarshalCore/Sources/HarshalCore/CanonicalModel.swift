import Foundation

/// Constants carried from `specs/normative/canonical.json`.
///
/// These values define a local demonstration model. They do not establish a
/// person's identity, consent, legal responsibility, or production authority.
public enum CanonicalModel {
    public static let specificationID = "HS-SPEC-CANONICAL-MODEL-V1"
    public static let version = "1.0.0"
    public static let origin = "0•000•000•0000"
    public static let legitimacyThreshold = 0.5
    public static let maximumVerificationDelay: TimeInterval = 240
    public static let maximumScope = 1.0
    public static let localAssurance = "LOCAL-DEMONSTRATION-NOT-AUTHENTICATION"
    public static let localExecutionScope = "LOCAL-DEMO-ONLY"

    public static let canonicalPipeline = [
        "Identity",
        "Representation",
        "Authorization",
        "Continuity",
        "Accountability",
        "Decision"
    ]
}
