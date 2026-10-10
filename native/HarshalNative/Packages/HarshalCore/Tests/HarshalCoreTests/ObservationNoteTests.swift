import Foundation
import XCTest
@testable import HarshalCore

final class ObservationNoteTests: XCTestCase {
    func testPrivateAndPublicNotesPreserveOwnerSelectedVisibility() throws {
        let coreID = UUID()
        let privateNote = try ObservationNote(
            universeCoreID: coreID,
            phase: .cwo,
            text: "  Preserve the source context.  ",
            visibility: .privateNote,
            createdAt: Date(timeIntervalSince1970: 1_735_689_600)
        )
        let publicNote = try ObservationNote(
            universeCoreID: coreID,
            phase: .cwo,
            text: "Share this observation only through an explicit public publication.",
            visibility: .publicProjectionRequested,
            createdAt: Date(timeIntervalSince1970: 1_735_689_601)
        )

        XCTAssertEqual(privateNote.text, "Preserve the source context.")
        XCTAssertFalse(privateNote.visibility.isPublicNote)
        XCTAssertTrue(publicNote.visibility.isPublicNote)
        XCTAssertEqual(publicNote.visibility.label, "Public note")
        XCTAssertEqual(publicNote.phase, .cwo)
        XCTAssertNoThrow(try privateNote.validate())
        XCTAssertNoThrow(try publicNote.validate())
    }

    func testPublicPublicationMetadataRequiresExplicitPublicNoteAndValidReceiptShape() throws {
        let pseudonym = try PublicProfilePseudonym("  Orbit Keeper  ")
        XCTAssertEqual(pseudonym.value, "Orbit Keeper")
        XCTAssertThrowsError(try PublicProfilePseudonym("line\nbreak"))

        let publication = try PublicObservationPublication(
            handoffID: UUID(),
            author: pseudonym,
            claimCode: "ABCD-EFGH-JKLM-NPQR",
            statusToken: String(repeating: "a", count: 43),
            publisherURL: try XCTUnwrap(URL(string: "https://main.empty.domains/observations")),
            expiresAt: Date(timeIntervalSince1970: 1_735_689_900),
            state: .awaitingClaim
        )
        let publicNote = try ObservationNote(
            universeCoreID: UUID(),
            phase: .nab,
            text: "This remains a local public-note draft until a remote receipt exists.",
            visibility: .publicProjectionRequested
        )
        let staged = try publicNote.replacingPublicPublication(publication)
        XCTAssertEqual(staged.publicPublication?.state, .awaitingClaim)
        XCTAssertNoThrow(try staged.validate())

        XCTAssertThrowsError(try ObservationNote(
            universeCoreID: UUID(),
            phase: .nab,
            text: "A private note cannot carry public publication metadata.",
            visibility: .privateNote,
            publicPublication: publication
        ))
        XCTAssertThrowsError(try PublicObservationPublication(
            handoffID: UUID(),
            author: pseudonym,
            claimCode: nil,
            statusToken: "invalid",
            publisherURL: try XCTUnwrap(URL(string: "https://main.empty.domains/observations")),
            expiresAt: .now,
            state: .awaitingClaim
        ))

        let encoded = try JSONEncoder().encode(publication)
        let encodedObject = try XCTUnwrap(JSONSerialization.jsonObject(with: encoded) as? [String: Any])
        XCTAssertNil(encodedObject["claimCode"])
        XCTAssertNil(encodedObject["statusToken"])

        let redacted = try publication.strippingLocalCapabilities()
        XCTAssertNil(redacted.claimCode)
        XCTAssertNil(redacted.statusToken)
    }

    func testPublishedMetadataRequiresPublicReceiptIdentifiers() throws {
        let pseudonym = try PublicProfilePseudonym("Ledger Witness")
        let handoffID = UUID()
        let publicID = UUID()
        let published = try PublicObservationPublication(
            handoffID: handoffID,
            author: pseudonym,
            claimCode: nil,
            statusToken: String(repeating: "b", count: 43),
            publisherURL: try XCTUnwrap(URL(string: "https://main.empty.domains/observations")),
            expiresAt: Date(timeIntervalSince1970: 1_735_689_900),
            state: .published,
            publicObservationID: publicID,
            publicURL: try XCTUnwrap(URL(string: "https://main.empty.domains/observations?id=\(publicID.uuidString)")),
            publishedAt: Date(timeIntervalSince1970: 1_735_689_800)
        )
        XCTAssertEqual(published.publicObservationID, publicID)
        XCTAssertThrowsError(try PublicObservationPublication(
            handoffID: handoffID,
            author: pseudonym,
            claimCode: nil,
            statusToken: String(repeating: "b", count: 43),
            publisherURL: try XCTUnwrap(URL(string: "https://main.empty.domains/observations")),
            expiresAt: Date(timeIntervalSince1970: 1_735_689_900),
            state: .published
        ))
        XCTAssertThrowsError(try PublicObservationPublication(
            handoffID: handoffID,
            author: pseudonym,
            claimCode: "ABCD-EFGH-JKLM-NPQR",
            statusToken: String(repeating: "b", count: 43),
            publisherURL: try XCTUnwrap(URL(string: "https://main.empty.domains/observations")),
            expiresAt: Date(timeIntervalSince1970: 1_735_689_900),
            state: .published,
            publicObservationID: publicID,
            publicURL: try XCTUnwrap(URL(string: "https://main.empty.domains/observations?id=\(publicID.uuidString)")),
            publishedAt: Date(timeIntervalSince1970: 1_735_689_800)
        ))
    }

    func testNoteRejectsBlankOrOversizedText() {
        XCTAssertThrowsError(try ObservationNote(
            universeCoreID: UUID(),
            phase: .nab,
            text: "   "
        ))
        XCTAssertThrowsError(try ObservationNote(
            universeCoreID: UUID(),
            phase: .gsrb,
            text: String(repeating: "x", count: 2_001)
        ))
        // Community's JavaScript validator measures UTF-16 code units; mirror
        // it so a native handoff does not accept 2,000 supplementary scalars.
        XCTAssertThrowsError(try ObservationNote(
            universeCoreID: UUID(),
            phase: .gsrb,
            text: String(repeating: "🙂", count: 1_001)
        ))
        XCTAssertThrowsError(try PublicProfilePseudonym(String(repeating: "🙂", count: 41)))
    }
}
