import XCTest
@testable import HarshalCore

final class PhaseDeclarationTests: XCTestCase {
    private var baselineAcknowledgments: Set<DeclarationAcknowledgment> {
        Set(DeclarationAcknowledgment.allCases)
    }

    func testDeclarationRequiresEveryBaselineAcknowledgment() {
        let draft = PhaseDeclarationDraft(principalLabel: "Local operator")

        XCTAssertThrowsError(try PhaseDeclarationFactory.make(from: draft)) { error in
            guard case let PhaseDeclarationError.missingAcknowledgments(missing) = error else {
                return XCTFail("Unexpected error: \(error)")
            }
            XCTAssertTrue(missing.contains(.localBoundary))
            XCTAssertTrue(missing.contains(.externalAuthorization))
        }
    }

    func testGSrbUsesGodSovereignReligiousBodyDisplayName() {
        XCTAssertEqual(DeclaredPhase.gsrb.name, "God-Sovereign Religious Body")
        XCTAssertTrue(DeclaredPhase.gsrb.shortDescription.contains("God-Sovereign Religious Body"))
    }

    func testGSrbRequiresAllFiveOrderedCollapseAcknowledgments() {
        let draft = PhaseDeclarationDraft(
            principalLabel: "Local operator",
            phase: .gsrb,
            acknowledgments: baselineAcknowledgments
        )

        XCTAssertThrowsError(try PhaseDeclarationFactory.make(from: draft)) { error in
            XCTAssertEqual(error as? PhaseDeclarationError, .incompleteGSrbCollapseProtocol)
        }
    }

    func testGSrbRejectsOutOfOrderCollapseAcknowledgments() {
        let draft = PhaseDeclarationDraft(
            principalLabel: "Local operator",
            phase: .gsrb,
            acknowledgments: baselineAcknowledgments,
            collapseAcknowledgments: Array(CollapseAcknowledgment.allCases.reversed())
        )

        XCTAssertThrowsError(try PhaseDeclarationFactory.make(from: draft)) { error in
            XCTAssertEqual(error as? PhaseDeclarationError, .incompleteGSrbCollapseProtocol)
        }
    }

    func testGSrbPersistsCompleteCanonicalCollapseProtocol() throws {
        let declaration = try PhaseDeclarationFactory.make(from: .init(
            principalLabel: "Local operator",
            phase: .gsrb,
            acknowledgments: baselineAcknowledgments,
            collapseAcknowledgments: CollapseAcknowledgment.allCases
        ))

        XCTAssertEqual(declaration.collapseAcknowledgments, CollapseAcknowledgment.allCases)
        XCTAssertEqual(declaration.phase, .gsrb)
    }

    func testNonGSrbRejectsCollapseAcknowledgments() {
        let draft = PhaseDeclarationDraft(
            principalLabel: "Local operator",
            phase: .nab,
            acknowledgments: baselineAcknowledgments,
            collapseAcknowledgments: CollapseAcknowledgment.allCases
        )

        XCTAssertThrowsError(try PhaseDeclarationFactory.make(from: draft)) { error in
            XCTAssertEqual(error as? PhaseDeclarationError, .incompleteGSrbCollapseProtocol)
        }
    }

    func testLocalFlowCannotSelfLabelAsExternallyAttested() {
        let draft = PhaseDeclarationDraft(
            principalLabel: "Local operator",
            verification: .externallyAttested,
            phase: .nab,
            acknowledgments: baselineAcknowledgments
        )

        XCTAssertThrowsError(try PhaseDeclarationFactory.make(from: draft)) { error in
            XCTAssertEqual(error as? PhaseDeclarationError, .externalAttestationUnavailable)
        }
    }

    func testDeclarationRetainsLocalOnlyBoundary() throws {
        let declaration = try PhaseDeclarationFactory.make(from: .init(
            principalLabel: "  Local operator  ",
            verification: .selfDeclared,
            phase: .nab,
            acknowledgments: baselineAcknowledgments
        ))

        XCTAssertEqual(declaration.principalLabel, "Local operator")
        XCTAssertEqual(declaration.assurance, CanonicalModel.localAssurance)
        XCTAssertEqual(declaration.executionScope, CanonicalModel.localExecutionScope)
        XCTAssertEqual(declaration.verification, .selfDeclared)
    }
}
