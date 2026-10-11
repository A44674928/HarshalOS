import Foundation
import XCTest
@testable import HarshalCore

final class DataEgressPolicyTests: XCTestCase {
    func testPublicObservationProjectionContainsOnlyBoundedFields() throws {
        let note = try ObservationNote(
            universeCoreID: UUID(),
            phase: .cwo,
            text: "A bounded public observation.",
            visibility: .publicProjectionRequested
        )
        let author = try PublicProfilePseudonym("Field Witness")

        let projection = try HarshalDataEgressPolicy.publicObservation(from: note, author: author)
        let encoded = try JSONEncoder().encode(projection)
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: encoded) as? [String: Any])

        XCTAssertEqual(projection.phase, "CWO")
        XCTAssertEqual(projection.text, "A bounded public observation.")
        XCTAssertEqual(projection.author, "Field Witness")
        XCTAssertEqual(Set(object.keys), Set(HarshalDataEgressPolicy.publicObservationFields))
        XCTAssertNil(object["universeCoreID"])
        XCTAssertNil(object["declarationLabel"])
        XCTAssertNil(object["ledgerRoot"])
        XCTAssertNil(object["statusToken"])
    }

    func testPrivateNoteCannotBecomeAnExternalProjection() throws {
        let privateNote = try ObservationNote(
            universeCoreID: UUID(),
            phase: .nab,
            text: "Remain private.",
            visibility: .privateNote
        )
        let author = try PublicProfilePseudonym("Private Keeper")

        XCTAssertThrowsError(
            try HarshalDataEgressPolicy.publicObservation(from: privateNote, author: author)
        ) { error in
            XCTAssertEqual(error as? HarshalDataEgressError, .privateDataCannotProject)
        }
    }

    func testControlledSurfacesKeepPrivateAndPublicBoundariesDistinct() {
        XCTAssertEqual(
            HarshalControlledSurface.personalUniverseCore.dataClassification,
            .privateUniverseCore
        )
        XCTAssertEqual(
            HarshalControlledSurface.publicObservationProjection.dataClassification,
            .boundedPublicObservation
        )
        XCTAssertTrue(
            HarshalControlledSurface.personalUniverseCore.boundary.contains("No external integration")
        )
        XCTAssertTrue(
            HarshalControlledSurface.publicObservationProjection.boundary.contains("phase snapshot")
        )
        XCTAssertEqual(HarshalDataEgressPolicy.version, "HOS-NATIVE-EGRESS-1")
    }
}
