import Foundation
import XCTest
@testable import NeoOrb

final class NeoOrbGeometryTests: XCTestCase {
    func testDiscFormationKeepsEveryNodeOnEquatorialPlane() throws {
        let configuration = NeoOrbConfiguration(
            formation: 0,
            axes: NeoOrbAxes(x: 1.35, y: 0.55, z: 1.6),
            nodes: NeoOrbFixture.previewNodes
        )

        let shape = try NeoOrbGeometry.make(configuration: configuration)

        XCTAssertTrue(shape.nodes.allSatisfy { abs($0.position.y) < 0.000_000_1 })
    }

    func testSphericalAxesHaveFullConvergence() throws {
        let configuration = NeoOrbConfiguration(
            formation: 1,
            axes: .sphere,
            nodes: NeoOrbFixture.previewNodes
        )

        let shape = try NeoOrbGeometry.make(configuration: configuration)

        XCTAssertEqual(shape.convergence, 1, accuracy: 0.000_000_1)
        XCTAssertTrue(shape.idealSphere)
    }

    func testDeformedAxesReduceConvergenceWithoutChangingNodeIdentity() throws {
        let configuration = NeoOrbConfiguration(
            formation: 1,
            axes: NeoOrbAxes(x: 1.2, y: 0.8, z: 1.1),
            nodes: NeoOrbFixture.previewNodes
        )

        let shape = try NeoOrbGeometry.make(configuration: configuration)

        XCTAssertLessThan(shape.convergence, 1)
        XCTAssertEqual(shape.nodes.map(\.id), NeoOrbFixture.previewNodes.map(\.id))
    }

    func testSector360IsRejectedBecauseRingEndsAt359() {
        let invalid = NeoOrbNode(
            id: "invalid",
            label: "Invalid",
            sector: 360,
            depth: 0.5,
            radialBand: 0,
            kind: .structural
        )
        let configuration = NeoOrbConfiguration(formation: 1, axes: .sphere, nodes: [invalid])

        XCTAssertThrowsError(try NeoOrbGeometry.make(configuration: configuration)) { error in
            guard let neoOrbError = error as? NeoOrbError else {
                XCTFail("Expected NeoOrbError, received \(error)")
                return
            }
            XCTAssertEqual(neoOrbError, .invalidSector(nodeID: "invalid", sector: 360))
        }
    }

    func testRadialBandsExpandGeometrically() {
        let bands = NeoOrbGeometry.radialBands()

        XCTAssertEqual(bands.count, NeoOrbModel.maximumRadialBand + 1)
        XCTAssertEqual(bands[1].radius / bands[0].radius, NeoOrbModel.radialBandRatio, accuracy: 0.000_000_1)
    }

    func testHigherBandReceivesLargerDisplayRadius() throws {
        let lowerBand = NeoOrbNode(id: "lower", label: "Lower", sector: 20, depth: 1, radialBand: 0, kind: .field)
        let upperBand = NeoOrbNode(id: "upper", label: "Upper", sector: 200, depth: 1, radialBand: 5, kind: .field)
        let shape = try NeoOrbGeometry.make(
            configuration: NeoOrbConfiguration(
                formation: 1,
                axes: .sphere,
                nodes: [lowerBand, upperBand],
                berthSeparation: 0
            )
        )

        XCTAssertLessThan(length(of: shape.nodes[0].position), length(of: shape.nodes[1].position))
    }

    func testCollidingDisplayNodesAreReslottedWithoutChangingIdentityOrSector() throws {
        let first = NeoOrbNode(id: "same-sector-a", label: "A", sector: 90, depth: 0.5, radialBand: 2, kind: .structural)
        let second = NeoOrbNode(id: "same-sector-b", label: "B", sector: 90, depth: 0.5, radialBand: 2, kind: .structural)
        let shape = try NeoOrbGeometry.make(
            configuration: NeoOrbConfiguration(
                formation: 0,
                axes: .sphere,
                nodes: [first, second],
                berthSeparation: 1
            )
        )

        XCTAssertEqual(shape.nodes.map(\.node.id), ["same-sector-a", "same-sector-b"])
        XCTAssertEqual(shape.nodes.map(\.node.sector), [90, 90])
        XCTAssertEqual(shape.berthSeparation.crowdedNodeCount, 1)
        XCTAssertEqual(shape.berthSeparation.movedNodeIDs.count, 1)
        XCTAssertGreaterThanOrEqual(
            distance(shape.nodes[0].position, shape.nodes[1].position),
            shape.berthSeparation.minimumChordDistance
        )
    }

    func testZeroBerthSeparationPreservesAnOverlappingDisplayPlacement() throws {
        let first = NeoOrbNode(id: "overlap-a", label: "A", sector: 45, depth: 0.5, radialBand: 2, kind: .field)
        let second = NeoOrbNode(id: "overlap-b", label: "B", sector: 45, depth: 0.5, radialBand: 2, kind: .field)
        let shape = try NeoOrbGeometry.make(
            configuration: NeoOrbConfiguration(
                formation: 0,
                axes: .sphere,
                nodes: [first, second],
                berthSeparation: 0
            )
        )

        XCTAssertFalse(shape.berthSeparation.hasReslottedNodes)
        XCTAssertEqual(shape.nodes[0].position, shape.nodes[1].position)
    }

    private func length(of point: NeoOrbVector3) -> Double {
        sqrt(point.x * point.x + point.y * point.y + point.z * point.z)
    }

    private func distance(_ left: NeoOrbVector3, _ right: NeoOrbVector3) -> Double {
        let x = left.x - right.x
        let y = left.y - right.y
        let z = left.z - right.z
        return sqrt(x * x + y * y + z * z)
    }
}
