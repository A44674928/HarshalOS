import Foundation
import XCTest
@testable import HarshalCore

final class ObservationNoteTests: XCTestCase {
    func testPrivateAndPublicIntentNotesPreserveOwnerSelectedVisibility() throws {
        let coreID = UUID()
        let privateNote = try ObservationNote(
            universeCoreID: coreID,
            phase: .cwo,
            text: "  Preserve the source context.  ",
            visibility: .privateNote,
            createdAt: Date(timeIntervalSince1970: 1_735_689_600)
        )
        let publicIntentNote = try ObservationNote(
            universeCoreID: coreID,
            phase: .cwo,
            text: "Share this observation only through a future explicit projection.",
            visibility: .publicProjectionRequested,
            createdAt: Date(timeIntervalSince1970: 1_735_689_601)
        )

        XCTAssertEqual(privateNote.text, "Preserve the source context.")
        XCTAssertFalse(privateNote.visibility.isPublicIntent)
        XCTAssertTrue(publicIntentNote.visibility.isPublicIntent)
        XCTAssertEqual(publicIntentNote.phase, .cwo)
        XCTAssertNoThrow(try privateNote.validate())
        XCTAssertNoThrow(try publicIntentNote.validate())
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
    }
}
