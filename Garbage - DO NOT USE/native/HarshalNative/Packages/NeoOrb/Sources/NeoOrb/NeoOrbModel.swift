import Foundation

/// NEO ORB is a display-only shape model that combines two existing HarshalOS
/// visual ideas:
/// - The Orb: a center-origin disc that can form into a sphere.
/// - Orb 2: a topology-derived spheroid, logarithmic radial bands, and a
///   convergence measure with collision-aware display berths.
///
/// This package has no networking, market-provider, routing, authorization, or
/// authority capability. Its nodes are geometry inputs only.
public enum NeoOrbModel {
    public static let schema = "neo-orb-v1"
    public static let centerAddress = "0•000•000•0000"
    public static let sectorDomain = 0...359
    public static let latitudeSpread = 0.62
    public static let radialBandBase = 0.44
    public static let radialBandRatio = 1.45
    public static let maximumRadialBand = 5
    public static let convergenceTolerance = 0.35
    public static let defaultBerthSeparation = 1.0
    public static let maximumBerthSeparation = 1.0
    public static let berthMinimumChordDistance = 0.12
}

public struct NeoOrbVector3: Codable, Equatable, Sendable {
    public let x: Double
    public let y: Double
    public let z: Double

    public init(x: Double, y: Double, z: Double) {
        self.x = x
        self.y = y
        self.z = z
    }
}

/// The three shape axes are pure display geometry. A value of `(1, 1, 1)` is
/// the ideal spherical reference; other values form a spheroid.
public struct NeoOrbAxes: Codable, Equatable, Sendable {
    public let x: Double
    public let y: Double
    public let z: Double

    public init(x: Double = 1, y: Double = 1, z: Double = 1) {
        self.x = x
        self.y = y
        self.z = z
    }

    public static let sphere = NeoOrbAxes()
}

public enum NeoOrbNodeKind: String, Codable, CaseIterable, Sendable, Hashable {
    case structural
    case field
    case interaction
}

/// A named display node. `sector` belongs to the discrete Z_360 address ring;
/// it is not a network endpoint or a grant of ownership/authority.
public struct NeoOrbNode: Codable, Equatable, Sendable, Identifiable {
    public let id: String
    public let label: String
    public let sector: Int
    /// Bounded local radial variation within the selected display band.
    public let depth: Double
    /// The explicitly logarithmic display band, from 0 through 5.
    public let radialBand: Int
    public let kind: NeoOrbNodeKind

    public init(
        id: String,
        label: String,
        sector: Int,
        depth: Double,
        radialBand: Int,
        kind: NeoOrbNodeKind
    ) {
        self.id = id
        self.label = label
        self.sector = sector
        self.depth = depth
        self.radialBand = radialBand
        self.kind = kind
    }
}

public struct NeoOrbConfiguration: Codable, Equatable, Sendable {
    /// `0` is the pedagogical disc; `1` is the formed 3D spheroid.
    public let formation: Double
    public let axes: NeoOrbAxes
    /// `0` preserves overlapping geometry; `1` enables full display-only berth separation.
    public let berthSeparation: Double
    public let nodes: [NeoOrbNode]

    public init(
        formation: Double,
        axes: NeoOrbAxes,
        nodes: [NeoOrbNode],
        berthSeparation: Double = NeoOrbModel.defaultBerthSeparation
    ) {
        self.formation = formation
        self.axes = axes
        self.berthSeparation = berthSeparation
        self.nodes = nodes
    }
}

public struct NeoOrbRadialBand: Codable, Equatable, Sendable, Identifiable {
    public let index: Int
    public let radius: Double

    public var id: Int {
        return index
    }

    public init(index: Int, radius: Double) {
        self.index = index
        self.radius = radius
    }
}

/// A report of a purely visual berth-resolution pass. No source metric, sector,
/// node identity, route, or authorization property is modified.
public struct NeoOrbBerthSeparation: Codable, Equatable, Sendable {
    public let amount: Double
    public let minimumChordDistance: Double
    public let crowdedNodeCount: Int
    public let movedNodeIDs: [String]

    public var hasReslottedNodes: Bool {
        return !movedNodeIDs.isEmpty
    }

    public init(
        amount: Double,
        minimumChordDistance: Double,
        crowdedNodeCount: Int,
        movedNodeIDs: [String]
    ) {
        self.amount = amount
        self.minimumChordDistance = minimumChordDistance
        self.crowdedNodeCount = crowdedNodeCount
        self.movedNodeIDs = movedNodeIDs
    }
}

public struct NeoOrbPlacedNode: Codable, Equatable, Sendable, Identifiable {
    public let node: NeoOrbNode
    public let position: NeoOrbVector3
    /// Sector-derived position before the berth resolver runs.
    public let sourceLongitude: Double
    /// Stable equal-area position before the berth resolver runs.
    public let sourceLatitude: Double
    /// Final display longitude after optional berth separation.
    public let longitude: Double
    /// Final display latitude after optional berth separation.
    public let latitude: Double
    public let nodeRadius: Double
    public let radialBandRadius: Double
    public let wasReslotted: Bool

    public var id: String {
        return node.id
    }

    public init(
        node: NeoOrbNode,
        position: NeoOrbVector3,
        sourceLongitude: Double,
        sourceLatitude: Double,
        longitude: Double,
        latitude: Double,
        nodeRadius: Double,
        radialBandRadius: Double,
        wasReslotted: Bool
    ) {
        self.node = node
        self.position = position
        self.sourceLongitude = sourceLongitude
        self.sourceLatitude = sourceLatitude
        self.longitude = longitude
        self.latitude = latitude
        self.nodeRadius = nodeRadius
        self.radialBandRadius = radialBandRadius
        self.wasReslotted = wasReslotted
    }
}

public struct NeoOrbShape: Codable, Equatable, Sendable {
    public let schema: String
    public let centerAddress: String
    public let formation: Double
    public let axes: NeoOrbAxes
    public let convergence: Double
    public let idealSphere: Bool
    public let radialBands: [NeoOrbRadialBand]
    public let berthSeparation: NeoOrbBerthSeparation
    public let nodes: [NeoOrbPlacedNode]

    public init(
        schema: String,
        centerAddress: String,
        formation: Double,
        axes: NeoOrbAxes,
        convergence: Double,
        idealSphere: Bool,
        radialBands: [NeoOrbRadialBand],
        berthSeparation: NeoOrbBerthSeparation,
        nodes: [NeoOrbPlacedNode]
    ) {
        self.schema = schema
        self.centerAddress = centerAddress
        self.formation = formation
        self.axes = axes
        self.convergence = convergence
        self.idealSphere = idealSphere
        self.radialBands = radialBands
        self.berthSeparation = berthSeparation
        self.nodes = nodes
    }
}

public enum NeoOrbError: Error, Equatable, Sendable, LocalizedError {
    case invalidFormation(Double)
    case invalidAxis(name: String, value: Double)
    case invalidBerthSeparation(Double)
    case invalidSector(nodeID: String, sector: Int)
    case invalidDepth(nodeID: String, depth: Double)
    case invalidRadialBand(nodeID: String, radialBand: Int)
    case duplicateNodeID(String)
    case emptyNodeID

    public var errorDescription: String? {
        switch self {
        case let .invalidFormation(value):
            return "Formation must be a finite number from 0 through 1; received \(value)."
        case let .invalidAxis(name, value):
            return "The \(name) spheroid axis must be a finite value from 0.25 through 2; received \(value)."
        case let .invalidBerthSeparation(value):
            return "Berth separation must be a finite number from 0 through 1; received \(value)."
        case let .invalidSector(nodeID, sector):
            return "Node \(nodeID) uses sector \(sector); NEO ORB accepts only Z_360 sectors 0 through 359."
        case let .invalidDepth(nodeID, depth):
            return "Node \(nodeID) uses depth \(depth); depth must be a finite value from 0 through 1."
        case let .invalidRadialBand(nodeID, radialBand):
            return "Node \(nodeID) uses radial band \(radialBand); valid bands are 0 through \(NeoOrbModel.maximumRadialBand)."
        case let .duplicateNodeID(id):
            return "NEO ORB node IDs must be unique; \(id) appears more than once."
        case .emptyNodeID:
            return "NEO ORB nodes require a non-empty stable display identifier."
        }
    }
}

public enum NeoOrbGeometry {
    public static func make(configuration: NeoOrbConfiguration) throws -> NeoOrbShape {
        try validate(configuration)

        let formation = configuration.formation
        let axes = configuration.axes
        let bands = radialBands()
        let maximumBandRadius = bands.last?.radius ?? 1
        let nodeCount = max(1, configuration.nodes.count)
        let sourcePlacements = configuration.nodes.enumerated().map { index, node in
            let sourceLongitude = (Double(node.sector) / 360.0) * (2.0 * Double.pi) - (Double.pi / 2.0)
            // Equal-area latitude distribution is stable from node order, not a rank.
            let normalizedIndex = (Double(index) + 0.5) / Double(nodeCount)
            let sourceLatitude = asin(clamp(1 - 2 * normalizedIndex, minimum: -1, maximum: 1)) * NeoOrbModel.latitudeSpread
            let radialBandRadius = bands[node.radialBand].radius
            let normalizedBandRadius = radialBandRadius / maximumBandRadius
            let radius = (0.24 + 0.76 * normalizedBandRadius) * (0.88 + 0.12 * node.depth)
            let nodeRadius = 0.038 + 0.012 * Double(node.radialBand)
            return NeoOrbSourcePlacement(
                node: node,
                radius: radius,
                sourceLongitude: sourceLongitude,
                sourceLatitude: sourceLatitude,
                nodeRadius: nodeRadius,
                radialBandRadius: radialBandRadius
            )
        }

        let berthResolution = resolveBerths(
            sourcePlacements,
            formation: formation,
            axes: axes,
            amount: configuration.berthSeparation
        )
        let placedNodes = berthResolution.placements.map { placement in
            let position = position(
                radius: placement.source.radius,
                longitude: placement.longitude,
                latitude: placement.latitude,
                formation: formation,
                axes: axes
            )
            return NeoOrbPlacedNode(
                node: placement.source.node,
                position: position,
                sourceLongitude: placement.source.sourceLongitude,
                sourceLatitude: placement.source.sourceLatitude,
                longitude: placement.longitude,
                latitude: placement.latitude,
                nodeRadius: placement.source.nodeRadius,
                radialBandRadius: placement.source.radialBandRadius,
                wasReslotted: placement.wasReslotted
            )
        }

        let convergence = convergence(for: axes)
        return NeoOrbShape(
            schema: NeoOrbModel.schema,
            centerAddress: NeoOrbModel.centerAddress,
            formation: formation,
            axes: axes,
            convergence: convergence,
            idealSphere: axes == .sphere,
            radialBands: bands,
            berthSeparation: berthResolution.report,
            nodes: placedNodes
        )
    }

    public static func radialBands() -> [NeoOrbRadialBand] {
        return (0...NeoOrbModel.maximumRadialBand).map { index in
            NeoOrbRadialBand(
                index: index,
                radius: NeoOrbModel.radialBandBase * pow(NeoOrbModel.radialBandRatio, Double(index))
            )
        }
    }

    public static func convergence(for axes: NeoOrbAxes) -> Double {
        let deviation = max(abs(axes.x - 1), abs(axes.y - 1), abs(axes.z - 1))
        return clamp(1 - deviation / NeoOrbModel.convergenceTolerance, minimum: 0, maximum: 1)
    }

    private static func validate(_ configuration: NeoOrbConfiguration) throws {
        guard configuration.formation.isFinite, (0...1).contains(configuration.formation) else {
            throw NeoOrbError.invalidFormation(configuration.formation)
        }
        for (name, value) in [("x", configuration.axes.x), ("y", configuration.axes.y), ("z", configuration.axes.z)] {
            guard value.isFinite, (0.25...2).contains(value) else {
                throw NeoOrbError.invalidAxis(name: name, value: value)
            }
        }
        guard configuration.berthSeparation.isFinite, (0...NeoOrbModel.maximumBerthSeparation).contains(configuration.berthSeparation) else {
            throw NeoOrbError.invalidBerthSeparation(configuration.berthSeparation)
        }

        var identifiers = Set<String>()
        for node in configuration.nodes {
            guard !node.id.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                throw NeoOrbError.emptyNodeID
            }
            guard identifiers.insert(node.id).inserted else {
                throw NeoOrbError.duplicateNodeID(node.id)
            }
            guard NeoOrbModel.sectorDomain.contains(node.sector) else {
                throw NeoOrbError.invalidSector(nodeID: node.id, sector: node.sector)
            }
            guard node.depth.isFinite, (0...1).contains(node.depth) else {
                throw NeoOrbError.invalidDepth(nodeID: node.id, depth: node.depth)
            }
            guard (0...NeoOrbModel.maximumRadialBand).contains(node.radialBand) else {
                throw NeoOrbError.invalidRadialBand(nodeID: node.id, radialBand: node.radialBand)
            }
        }
    }

    private static func resolveBerths(
        _ sourcePlacements: [NeoOrbSourcePlacement],
        formation: Double,
        axes: NeoOrbAxes,
        amount: Double
    ) -> NeoOrbBerthResolution {
        let minimum = NeoOrbModel.berthMinimumChordDistance * amount
        var resolved = sourcePlacements.map { NeoOrbResolvedPlacement(source: $0) }
        guard minimum > 0, resolved.count > 1 else {
            return NeoOrbBerthResolution(
                placements: resolved,
                report: NeoOrbBerthSeparation(
                    amount: amount,
                    minimumChordDistance: minimum,
                    crowdedNodeCount: 0,
                    movedNodeIDs: []
                )
            )
        }

        let order = sourcePlacements.indices.sorted { left, right in
            let leftPhase = stableIdentityPhase(sourcePlacements[left].node.id)
            let rightPhase = stableIdentityPhase(sourcePlacements[right].node.id)
            if abs(leftPhase - rightPhase) < 0.000_000_001 {
                return sourcePlacements[left].node.id < sourcePlacements[right].node.id
            }
            return leftPhase < rightPhase
        }

        var occupied: [NeoOrbVector3] = []
        var crowdedNodeCount = 0
        for index in order {
            let base = resolved[index]
            let basePoint = position(
                radius: base.source.radius,
                longitude: base.longitude,
                latitude: base.latitude,
                formation: formation,
                axes: axes
            )
            guard !clears(basePoint, from: occupied, minimumDistance: minimum) else {
                occupied.append(basePoint)
                continue
            }

            crowdedNodeCount += 1
            let candidate = nearestAvailableBerth(
                for: base,
                occupied: occupied,
                formation: formation,
                axes: axes,
                minimumDistance: minimum
            )
            resolved[index].longitude = candidate.longitude
            resolved[index].latitude = candidate.latitude
            resolved[index].wasReslotted = true
            occupied.append(position(
                radius: base.source.radius,
                longitude: candidate.longitude,
                latitude: candidate.latitude,
                formation: formation,
                axes: axes
            ))
        }

        let movedNodeIDs = resolved.compactMap { placement in
            placement.wasReslotted ? placement.source.node.id : nil
        }
        return NeoOrbBerthResolution(
            placements: resolved,
            report: NeoOrbBerthSeparation(
                amount: amount,
                minimumChordDistance: minimum,
                crowdedNodeCount: crowdedNodeCount,
                movedNodeIDs: movedNodeIDs
            )
        )
    }

    private static func nearestAvailableBerth(
        for placement: NeoOrbResolvedPlacement,
        occupied: [NeoOrbVector3],
        formation: Double,
        axes: NeoOrbAxes,
        minimumDistance: Double
    ) -> (longitude: Double, latitude: Double) {
        let radius = placement.source.radius
        let sourceLongitude = placement.source.sourceLongitude
        let sourceLatitude = placement.source.sourceLatitude
        let circumference = max(0.12, radius * max(0.20, abs(cos(sourceLatitude))))
        let longitudeStep = (minimumDistance / circumference) * 1.10
        let latitudeStep = min(0.42, (minimumDistance / max(0.12, radius)) * 1.10)
        let latitudeLimit = 1.20

        for latitudeRing in 0...4 {
            let latitudeOffsets: [Double]
            if latitudeRing == 0 || formation < 0.02 {
                latitudeOffsets = [0]
            } else {
                let offset = Double(latitudeRing) * latitudeStep
                latitudeOffsets = [offset, -offset]
            }

            for latitudeOffset in latitudeOffsets {
                let latitude = clamp(sourceLatitude + latitudeOffset, minimum: -latitudeLimit, maximum: latitudeLimit)
                for step in 1...16 {
                    for direction in [-1.0, 1.0] {
                        let longitude = sourceLongitude + direction * Double(step) * longitudeStep
                        let point = position(
                            radius: radius,
                            longitude: longitude,
                            latitude: latitude,
                            formation: formation,
                            axes: axes
                        )
                        if clears(point, from: occupied, minimumDistance: minimumDistance) {
                            return (longitude, latitude)
                        }
                    }
                }
            }
        }

        // Saturated fields choose the widest visible angle around their own
        // latitude. This remains geometry-only and deterministic by stable ID.
        var bestLongitude = sourceLongitude
        var bestLatitude = sourceLatitude
        var bestClearance = -Double.infinity
        for sample in 0..<72 {
            let longitude = sourceLongitude + (2.0 * Double.pi * Double(sample) / 72.0)
            let point = position(
                radius: radius,
                longitude: longitude,
                latitude: sourceLatitude,
                formation: formation,
                axes: axes
            )
            let clearance = occupied.map { chordDistance(point, $0) }.min() ?? Double.infinity
            if clearance > bestClearance {
                bestClearance = clearance
                bestLongitude = longitude
                bestLatitude = sourceLatitude
            }
        }
        return (bestLongitude, bestLatitude)
    }

    private static func position(
        radius: Double,
        longitude: Double,
        latitude: Double,
        formation: Double,
        axes: NeoOrbAxes
    ) -> NeoOrbVector3 {
        let disc = NeoOrbVector3(
            x: radius * cos(longitude),
            y: 0,
            z: radius * sin(longitude)
        )
        let sphere = NeoOrbVector3(
            x: radius * cos(latitude) * cos(longitude),
            y: radius * sin(latitude),
            z: radius * cos(latitude) * sin(longitude)
        )
        let blended = interpolate(disc, sphere, amount: formation)
        let axisFactor = NeoOrbAxes(
            x: 1 + (axes.x - 1) * formation,
            y: 1 + (axes.y - 1) * formation,
            z: 1 + (axes.z - 1) * formation
        )
        return NeoOrbVector3(
            x: blended.x * axisFactor.x,
            y: blended.y * axisFactor.y,
            z: blended.z * axisFactor.z
        )
    }

    private static func clears(_ point: NeoOrbVector3, from occupied: [NeoOrbVector3], minimumDistance: Double) -> Bool {
        return occupied.allSatisfy { chordDistance(point, $0) >= minimumDistance }
    }

    private static func chordDistance(_ left: NeoOrbVector3, _ right: NeoOrbVector3) -> Double {
        let x = left.x - right.x
        let y = left.y - right.y
        let z = left.z - right.z
        return sqrt(x * x + y * y + z * z)
    }

    private static func stableIdentityPhase(_ identity: String) -> Double {
        var hash: UInt64 = 14_695_981_039_346_656_037
        for byte in identity.utf8 {
            hash ^= UInt64(byte)
            hash &*= 1_099_511_628_211
        }
        let normalized = Double(hash) / Double(UInt64.max)
        return normalized * (2.0 * Double.pi) - Double.pi
    }

    private static func interpolate(_ from: NeoOrbVector3, _ to: NeoOrbVector3, amount: Double) -> NeoOrbVector3 {
        return NeoOrbVector3(
            x: from.x + (to.x - from.x) * amount,
            y: from.y + (to.y - from.y) * amount,
            z: from.z + (to.z - from.z) * amount
        )
    }

    private static func clamp(_ value: Double, minimum: Double, maximum: Double) -> Double {
        return min(maximum, max(minimum, value))
    }
}

private struct NeoOrbSourcePlacement {
    let node: NeoOrbNode
    let radius: Double
    let sourceLongitude: Double
    let sourceLatitude: Double
    let nodeRadius: Double
    let radialBandRadius: Double
}

private struct NeoOrbResolvedPlacement {
    let source: NeoOrbSourcePlacement
    var longitude: Double
    var latitude: Double
    var wasReslotted: Bool

    init(source: NeoOrbSourcePlacement) {
        self.source = source
        self.longitude = source.sourceLongitude
        self.latitude = source.sourceLatitude
        self.wasReslotted = false
    }
}

private struct NeoOrbBerthResolution {
    let placements: [NeoOrbResolvedPlacement]
    let report: NeoOrbBerthSeparation
}

/// Clearly synthetic, local geometry used only to demonstrate the NEO ORB shape
/// model before any reviewed external field is connected.
public enum NeoOrbFixture {
    public static let previewNodes: [NeoOrbNode] = [
        .init(id: "neo-018", label: "Sector 018", sector: 18, depth: 0.48, radialBand: 1, kind: .structural),
        .init(id: "neo-063", label: "Sector 063", sector: 63, depth: 0.66, radialBand: 2, kind: .field),
        .init(id: "neo-108", label: "Sector 108", sector: 108, depth: 0.82, radialBand: 3, kind: .interaction),
        .init(id: "neo-153", label: "Sector 153", sector: 153, depth: 0.58, radialBand: 2, kind: .structural),
        .init(id: "neo-198", label: "Sector 198", sector: 198, depth: 0.91, radialBand: 4, kind: .field),
        .init(id: "neo-243", label: "Sector 243", sector: 243, depth: 0.73, radialBand: 3, kind: .interaction),
        .init(id: "neo-288", label: "Sector 288", sector: 288, depth: 0.52, radialBand: 1, kind: .structural),
        .init(id: "neo-333", label: "Sector 333", sector: 333, depth: 0.86, radialBand: 4, kind: .field)
    ]

    public static let preview = NeoOrbConfiguration(
        formation: 1,
        axes: NeoOrbAxes(x: 1.10, y: 0.84, z: 1.18),
        nodes: previewNodes,
        berthSeparation: NeoOrbModel.defaultBerthSeparation
    )
}
