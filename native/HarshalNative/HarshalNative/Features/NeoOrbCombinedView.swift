import CoreGraphics
import HarshalFlame
import HarshalMarkets
import NeoOrb
import SwiftUI

/// The **NEO ORB** pane — the combination of the two source concepts:
///
/// - **Orb 2** (powered by Good Intelligence): the 52-asset ticker roster
///   placed as display-only orbs on the spheroid — sectors, logarithmic
///   market-cap bands, beat motion, labelled live/simulated readings, and the
///   declared-phase rotation shift.
/// - **The Orb** (powered by the dual fractal flame engines): the author's
///   `Demo.flame` (inner, 120 frames) and `OuterOrb.flame` (outer, 600
///   frames) films, baked on-device by the native `HarshalFlame` engine and
///   composited additively — the core heartbeat inside the orbital shells.
///
/// The whole surface stays display-only: it renders roster metadata and
/// labelled readings; it resolves no address, gates nothing, and confers
/// nothing.
struct NeoOrbCombinedView: View {
    @Environment(AppModel.self) private var appModel

    @State private var selectedNodeID: String?
    @State private var innerFilm: FlameFilm?
    @State private var outerFilm: FlameFilm?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                CombinedOrbCanvas(
                    innerFilm: innerFilm,
                    outerFilm: outerFilm,
                    selectedNodeID: selectedNodeID,
                    onSelect: { nodeID in
                        selectedNodeID = (selectedNodeID == nodeID) ? nil : nodeID
                    }
                )
                .frame(minHeight: 420)
                .frame(maxWidth: 820)
                .clipShape(RoundedRectangle(cornerRadius: 22))
                .overlay {
                    RoundedRectangle(cornerRadius: 22)
                        .stroke(HarshalTheme.electricBlue.opacity(0.42), lineWidth: 1)
                }

                metrics
                selectedInspector
                boundary
            }
            .padding()
            .frame(maxWidth: 860, alignment: .leading)
        }
        .task {
            if innerFilm == nil { innerFilm = FlameFilm.bundled(role: .inner) }
            if outerFilm == nil { outerFilm = FlameFilm.bundled(role: .outer) }
        }
    }

    private var metrics: some View {
        let settings = appModel.marketsOrb.settings
        let liveCount = appModel.marketsOrb.quotes.values.filter(\.isLive).count

        return LazyVGrid(columns: [GridItem(.adaptive(minimum: 136), spacing: 10)], alignment: .leading, spacing: 10) {
            OrbMetric(title: "Center origin", value: NeoOrbModel.centerAddress)
            OrbMetric(title: "Formation", value: "\(Int((settings.formation * 100).rounded()))%")
            OrbMetric(title: "Convergence", value: convergenceSummary)
            OrbMetric(title: "Ticker orbs", value: "\(nodeCount) placed")
            OrbMetric(title: "Live readings", value: "\(liveCount) / \(appModel.marketsOrb.quotes.count)")
            OrbMetric(
                title: "Inner engine",
                value: innerFilm.map { "Demo · \($0.frameCount) frames" } ?? "unavailable"
            )
            OrbMetric(
                title: "Outer engine",
                value: outerFilm.map { "OuterOrb · \($0.frameCount) frames" } ?? "unavailable"
            )
            OrbMetric(title: "DS benchmark", value: "needs 6 aligned daily FX inputs")
        }
    }

    private var convergenceSummary: String {
        guard let convergence = currentShape?.convergence else { return "—" }
        return "\(Int((convergence * 100).rounded()))%"
    }

    private var nodeCount: Int {
        CombinedOrbCanvas.tickerNodes(showTickerOrbs: appModel.marketsOrb.settings.orb2TickerOrbsEnabled).count
    }

    private var currentShape: NeoOrbShape? {
        let settings = appModel.marketsOrb.settings
        return try? NeoOrbGeometry.make(
            configuration: NeoOrbConfiguration(
                formation: settings.formation,
                axes: NeoOrbAxes(x: settings.axisX, y: settings.axisY, z: settings.axisZ),
                nodes: CombinedOrbCanvas.tickerNodes(showTickerOrbs: settings.orb2TickerOrbsEnabled),
                berthSeparation: settings.berthSeparation
            )
        )
    }

    @ViewBuilder
    private var selectedInspector: some View {
        if let selectedNodeID,
           let placed = currentShape?.nodes.first(where: { $0.node.id == selectedNodeID }) {
            let quote = appModel.marketsOrb.quotes[selectedNodeID]
            let asset = GoodIntelligenceTickerRoster.asset(for: selectedNodeID)
            GroupBox("Ticker orb · \(placed.node.label)") {
                VStack(alignment: .leading, spacing: 6) {
                    LabeledContent("Issuer", value: asset?.name ?? "—")
                    LabeledContent("Sector", value: asset?.sector ?? "—")
                    LabeledContent("Sector rank (snapshot)", value: asset.map { "\($0.sectorRank) · \($0.marketCapLabel)" } ?? "—")
                    LabeledContent("Display sector", value: String(format: "%03d", placed.node.sector))
                    LabeledContent("Log band", value: "\(placed.node.radialBand)")
                    LabeledContent("Reading", value: quote.map { "\($0.price) (\($0.isLive ? "live" : "simulated"))" } ?? "none")
                    LabeledContent("Display berth", value: placed.wasReslotted ? "Re-slotted for visibility" : "Source position retained")
                    Text("Placement is display geometry from roster metadata — not an OCM address, a ranking claim, or a market value.")
                        .font(.caption2)
                        .foregroundStyle(HarshalTheme.mutedText)
                }
                .font(.footnote)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    private var boundary: some View {
        GroupBox("Display-only boundary") {
            Text("NEO ORB renders the reviewed roster and labelled readings as local geometry. It does not invoke the refusal gate, change a declaration, route a request, authenticate a person, or confer authority. The Dollar Strength benchmark appears only when the Worker supplies six aligned, confirmed daily FX inputs; it is never synthesized locally.")
                .font(.caption)
                .foregroundStyle(HarshalTheme.secondaryText)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

// MARK: - Canvas

/// The combined orb renderer: two flame films composited additively behind
/// the NEO ORB spheroid with its ticker nodes.
private struct CombinedOrbCanvas: View {
    let innerFilm: FlameFilm?
    let outerFilm: FlameFilm?
    let selectedNodeID: String?
    let onSelect: (String) -> Void

    @Environment(AppModel.self) private var appModel
    @State private var flameCache = FlameFrameCache()
    @State private var drawState = DrawStateMirror()

    /// Reference-type mirror of the values the Canvas closure computes, so
    /// the tap hit-test can re-project node positions without storing view
    /// state inside a draw call.
    final class DrawStateMirror {
        var size: CGSize = .zero
        var yaw = 0.0
    }

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { timeline in
            Canvas { context, size in
                draw(in: &context, size: size, timestamp: timeline.date.timeIntervalSinceReferenceDate)
            }
        }
        .background {
            RoundedRectangle(cornerRadius: 22)
                .fill(
                    LinearGradient(
                        colors: [HarshalTheme.surface, Color.black],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
        }
        .contentShape(RoundedRectangle(cornerRadius: 22))
        .onTapGesture(coordinateSpace: .local) { location in
            handleTap(at: location)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Animated NEO ORB combining The Orb's flame engines with Orb 2 ticker orbs")
        .accessibilityValue("\(nodeCount) ticker orbs, formation \(Int((appModel.marketsOrb.settings.formation * 100).rounded())) percent")
    }

    private var nodeCount: Int {
        Self.tickerNodes(showTickerOrbs: appModel.marketsOrb.settings.orb2TickerOrbsEnabled).count
    }

    // MARK: Node construction (Orb 2 layer)

    /// The 52-asset roster as display-only NEO ORB nodes. Sector placement is
    /// a deterministic symbol hash; the radial band is the logarithmic
    /// market-cap band; the kind maps the issuer's sector to a display color.
    static func tickerNodes(showTickerOrbs: Bool) -> [NeoOrbNode] {
        guard showTickerOrbs else { return [] }
        return GoodIntelligenceTickerRoster.assets.map { asset in
            NeoOrbNode(
                id: asset.symbol,
                label: asset.symbol,
                sector: Int(GoodIntelligenceTickerRoster.sectorAngle(for: asset.symbol)) % 360,
                depth: 0.5,
                radialBand: GoodIntelligenceTickerRoster.radialBand(forMarketCapUsd: asset.marketCapUsd),
                kind: displayKind(forSector: asset.sector)
            )
        }
    }

    static func displayKind(forSector sector: String) -> NeoOrbNodeKind {
        switch sector {
        case "Technology", "Industrials":
            return .structural
        case "Financial Services", "Energy":
            return .interaction
        default:
            return .field
        }
    }

    // MARK: Drawing

    private struct ProjectedNode {
        let placed: NeoOrbPlacedNode
        let point: CGPoint
        let depth: Double
        let scale: CGFloat
        let beatPhase: Double
    }

    private func configuration() -> NeoOrbConfiguration? {
        let settings = appModel.marketsOrb.settings
        let nodes = Self.tickerNodes(showTickerOrbs: settings.orb2TickerOrbsEnabled)
        guard !nodes.isEmpty else { return nil }
        return NeoOrbConfiguration(
            formation: settings.formation,
            axes: NeoOrbAxes(x: settings.axisX, y: settings.axisY, z: settings.axisZ),
            nodes: nodes,
            berthSeparation: settings.berthSeparation
        )
    }

    private func draw(in context: inout GraphicsContext, size: CGSize, timestamp: TimeInterval) {
        let settings = appModel.marketsOrb.settings
        // `configuration` is a method, so it has to be called to bind its
        // optional result — `let configuration` alone would bind the function.
        guard size.width > 0, size.height > 0, let configuration = configuration() else { return }

        let center = CGPoint(x: size.width / 2, y: size.height / 2)
        let outerRadius = min(size.width, size.height) * 0.36

        // Declared-phase display shift (Orb 2 convention): NAB +0, CWO +60°,
        // GSRB +120° — display-only, and only when a declaration exists.
        var phaseShift = 0.0
        if settings.orb2PhaseShift, let phase = appModel.declaration?.phase {
            switch phase {
            case .nab: phaseShift = 0
            case .cwo: phaseShift = Double.pi / 3
            case .gsrb: phaseShift = (2 * Double.pi) / 3
            }
        }

        let yaw = timestamp * settings.rotationRPM * 2 * Double.pi / 60 + phaseShift
        drawState.size = size
        drawState.yaw = yaw

        // 1. Outer engine — macro-orbital film behind everything.
        if settings.flameOuterEnabled {
            drawFilm(
                in: &context,
                center: center,
                radius: outerRadius * 2.05 * settings.flameOuterScale,
                film: outerFilm,
                timestamp: timestamp,
                opacity: settings.flameOuterOpacity * settings.flameExposure
            )
        }

        // 2. Inner engine — the core heartbeat inside the silhouette.
        if settings.flameInnerEnabled {
            drawFilm(
                in: &context,
                center: center,
                radius: outerRadius * 1.35 * settings.flameInnerScale,
                film: innerFilm,
                timestamp: timestamp,
                opacity: settings.flameInnerOpacity * settings.flameExposure
            )
        }

        guard let shape = try? NeoOrbGeometry.make(configuration: configuration) else { return }

        let projected = shape.nodes
            .map { placed -> ProjectedNode in
                let beatPhase = Double(placed.node.id.unicodeScalars.reduce(0) { ($0 &+ Int($1.value)) & 0x3FF }) / 1024.0
                var position = placed.position
                if settings.orb2BeatMotion {
                    // Bounded ±4% radial beat, phase-offset per symbol —
                    // the Orb 2 motion reading, display-only.
                    let beat = 1 + 0.04 * sin(timestamp * 1.4 + beatPhase * 2 * Double.pi)
                    position = NeoOrbVector3(x: position.x * beat, y: position.y * beat, z: position.z * beat)
                }
                let projectedPoint = project(position, center: center, outerRadius: outerRadius, yaw: yaw, tilt: 0.28)
                return ProjectedNode(
                    placed: placed,
                    point: projectedPoint.point,
                    depth: projectedPoint.depth,
                    scale: projectedPoint.scale,
                    beatPhase: beatPhase
                )
            }
            .sorted { $0.depth < $1.depth }

        if settings.showBands {
            drawLatitudeBands(in: &context, center: center, outerRadius: outerRadius, shape: shape)
        }
        if settings.showLongitudeArcs {
            drawLongitudeArcs(in: &context, center: center, outerRadius: outerRadius, yaw: yaw, formation: shape.formation)
        }
        if settings.showAttachments {
            drawAttachments(in: &context, center: center, nodes: projected)
        }
        drawNodes(in: &context, nodes: projected, settings: settings)
        drawCenterOrigin(in: &context, center: center)
    }

    // MARK: Flame films

    private func drawFilm(
        in context: inout GraphicsContext,
        center: CGPoint,
        radius: CGFloat,
        film: FlameFilm?,
        timestamp: TimeInterval,
        opacity: Double
    ) {
        guard let film, opacity > 0.01, film.frameCount > 0 else { return }
        let frameIndex = film.frameIndex(at: timestamp)
        guard film.document.frames.indices.contains(frameIndex) else { return }
        let quality = appModel.marketsOrb.settings.flameQuality
        guard let image = flameCache.image(
            for: .init(role: film.role, index: frameIndex, size: FlameFrameCache.bakeSize, quality: quality),
            frame: film.document.frames[frameIndex],
            quality: quality
        ) else {
            // The bake is in flight; this pass draws without the film and the
            // next pass picks it up. Never a placeholder lie.
            return
        }
        let drawRect = CGRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2)
        context.draw(
            Image(decorative: image, scale: 1, orientation: .up),
            in: drawRect,
            opacity: min(1, max(0, opacity))
        )
    }

    // MARK: Shape layers

    private func drawLatitudeBands(
        in context: inout GraphicsContext,
        center: CGPoint,
        outerRadius: CGFloat,
        shape: NeoOrbShape
    ) {
        let largest = shape.radialBands.last?.radius ?? 1
        let verticalScale = CGFloat(0.18 + 0.58 * shape.formation * shape.axes.y)
        for band in shape.radialBands.dropFirst() {
            let fraction = CGFloat(band.radius / largest)
            let width = outerRadius * 2 * fraction * CGFloat(shape.axes.x)
            let height = outerRadius * 2 * fraction * verticalScale
            let rect = CGRect(x: center.x - width / 2, y: center.y - height / 2, width: width, height: height)
            var ring = Path()
            ring.addEllipse(in: rect)
            context.stroke(ring, with: .color(.cyan.opacity(0.08 + 0.015 * Double(band.index))), lineWidth: 0.8)
        }
    }

    private func drawLongitudeArcs(
        in context: inout GraphicsContext,
        center: CGPoint,
        outerRadius: CGFloat,
        yaw: Double,
        formation: Double
    ) {
        let longitudeCount = 8
        for index in 0..<longitudeCount {
            let baseAngle = (Double(index) / Double(longitudeCount)) * .pi
            var path = Path()
            let samples = 36
            for sample in 0...samples {
                let latitude = -Double.pi / 2 + (Double(sample) / Double(samples)) * .pi
                let vector = NeoOrbVector3(
                    x: cos(latitude) * cos(baseAngle),
                    y: sin(latitude) * formation,
                    z: cos(latitude) * sin(baseAngle)
                )
                let point = project(vector, center: center, outerRadius: outerRadius, yaw: yaw, tilt: 0.28).point
                if sample == 0 {
                    path.move(to: point)
                } else {
                    path.addLine(to: point)
                }
            }
            context.stroke(path, with: .color(.white.opacity(0.06)), lineWidth: 0.7)
        }
    }

    private func drawAttachments(
        in context: inout GraphicsContext,
        center: CGPoint,
        nodes: [ProjectedNode]
    ) {
        for node in nodes {
            var attachment = Path()
            attachment.move(to: center)
            attachment.addLine(to: node.point)
            let isSelected = node.placed.node.id == selectedNodeID
            let hasReading = appModel.marketsOrb.quotes[node.placed.node.id] != nil
            let baseOpacity: Double = hasReading ? 0.22 : 0.10
            context.stroke(
                attachment,
                with: .color(nodeColor(node).opacity(isSelected ? 0.7 : baseOpacity)),
                lineWidth: isSelected ? 1.5 : 0.6
            )
        }
    }

    private func drawNodes(
        in context: inout GraphicsContext,
        nodes: [ProjectedNode],
        settings: MarketsOrbSettings
    ) {
        for node in nodes {
            let isSelected = node.placed.node.id == selectedNodeID
            let radius = nodeRadius(node, settings: settings)
            let rect = CGRect(x: node.point.x - radius, y: node.point.y - radius, width: radius * 2, height: radius * 2)
            let color = nodeColor(node)

            if isSelected {
                let glowRadius = radius * 2.6
                let glow = CGRect(x: node.point.x - glowRadius, y: node.point.y - glowRadius, width: glowRadius * 2, height: glowRadius * 2)
                context.fill(Path(ellipseIn: glow), with: .color(color.opacity(0.16)))
            }

            context.fill(Path(ellipseIn: rect), with: .color(color.opacity(0.92)))
            context.stroke(Path(ellipseIn: rect), with: .color(.white.opacity(0.75)), lineWidth: isSelected ? 1.4 : 0.6)
        }

        if settings.orb2ShowLabels {
            let labels = nodes
                .sorted { $0.depth > $1.depth }
                .prefix(14)
            for node in labels {
                context.draw(
                    Text(node.placed.node.label)
                        .font(.system(size: 8.5, weight: .medium))
                        .foregroundStyle(HarshalTheme.primaryText.opacity(0.8)),
                    at: CGPoint(x: node.point.x, y: node.point.y - nodeRadius(node, settings: settings) - 6),
                    anchor: .center
                )
            }
        }
    }

    private func nodeRadius(_ node: ProjectedNode, settings: MarketsOrbSettings) -> CGFloat {
        max(3.5, 7.5 * node.scale * settings.nodeScale)
    }

    private func drawCenterOrigin(in context: inout GraphicsContext, center: CGPoint) {
        let halo = CGRect(x: center.x - 18, y: center.y - 18, width: 36, height: 36)
        let core = CGRect(x: center.x - 6, y: center.y - 6, width: 12, height: 12)
        context.fill(Path(ellipseIn: halo), with: .color(.cyan.opacity(0.14)))
        context.fill(Path(ellipseIn: core), with: .color(.white.opacity(0.97)))
        context.stroke(Path(ellipseIn: core), with: .color(.cyan.opacity(0.9)), lineWidth: 1.2)
    }

    // MARK: Projection & colors

    private func project(
        _ vector: NeoOrbVector3,
        center: CGPoint,
        outerRadius: CGFloat,
        yaw: Double,
        tilt: Double
    ) -> (point: CGPoint, depth: Double, scale: CGFloat) {
        let cosine = cos(yaw)
        let sine = sin(yaw)
        let rotatedX = vector.x * cosine - vector.z * sine
        let rotatedZ = vector.x * sine + vector.z * cosine
        let projectedY = vector.y * cos(tilt) - rotatedZ * sin(tilt)
        let depth = vector.y * sin(tilt) + rotatedZ * cos(tilt)
        let perspective = 1 / (2.75 + depth)
        let scale = CGFloat(perspective * 2.35)
        let point = CGPoint(
            x: center.x + CGFloat(rotatedX) * outerRadius * scale * 1.65,
            y: center.y - CGFloat(projectedY) * outerRadius * scale * 1.65
        )
        return (point, depth, scale)
    }

    private func nodeColor(_ node: ProjectedNode) -> Color {
        let settings = appModel.marketsOrb.settings
        if settings.orb2SectorColors, let quote = appModel.marketsOrb.quotes[node.placed.node.id] {
            // The Orb 2 candle colors: up green, down red, flat gold.
            let change = quote.dayChangeFraction
            if change > 0.0005 { return Color(red: 0.216, green: 0.890, blue: 0.631) }
            if change < -0.0005 { return Color(red: 1.0, green: 0.443, blue: 0.545) }
            return Color(red: 0.953, green: 0.784, blue: 0.416)
        }
        switch node.placed.node.kind {
        case .structural: return HarshalTheme.electricBlue
        case .field: return HarshalTheme.primaryText
        case .interaction: return HarshalTheme.warning
        }
    }

    // MARK: Tap selection

    private func handleTap(at location: CGPoint) {
        let settings = appModel.marketsOrb.settings
        guard let configuration = configuration(), drawState.size.width > 0 else { return }
        guard let shape = try? NeoOrbGeometry.make(configuration: configuration) else { return }

        let canvasSize = drawState.size
        let center = CGPoint(x: canvasSize.width / 2, y: canvasSize.height / 2)
        let outerRadius = min(canvasSize.width, canvasSize.height) * 0.36
        let yaw = drawState.yaw

        var bestID: String?
        var bestDistance = CGFloat.greatestFiniteMagnitude
        for placed in shape.nodes {
            let projected = project(placed.position, center: center, outerRadius: outerRadius, yaw: yaw, tilt: 0.28)
            let hitRadius = max(3.5, 7.5 * projected.scale * settings.nodeScale) + 8
            let dx = location.x - projected.point.x
            let dy = location.y - projected.point.y
            let distance = (dx * dx + dy * dy).squareRoot()
            if distance < hitRadius, distance < bestDistance {
                bestDistance = distance
                bestID = placed.node.id
            }
        }
        if let bestID {
            onSelect(bestID)
        }
    }
}

// MARK: - Flame frame cache

/// A small, thread-safe, bounded bake cache. Baking happens off the main
/// actor; the map is keyed by (film role, frame, quality) so an exposure
/// change does not need a re-bake, and Canvas draws never block on a bake.
private final class FlameFrameCache {
    struct Key: Hashable {
        let role: FlameFilm.Role
        let index: Int
        let size: Int
        let quality: Double
    }

    static let bakeSize = 220
    private static let limit = 48

    private let lock = NSLock()
    private var storage: [Key: CGImage] = [:]
    private var pending: Set<Key> = []

    func image(for key: Key, frame: FlameFrame, quality: Double) -> CGImage? {
        lock.lock()
        if let cached = storage[key] {
            lock.unlock()
            return cached
        }
        if pending.contains(key) {
            lock.unlock()
            return nil
        }
        pending.insert(key)
        lock.unlock()

        let size = key.size
        let role = key.role
        Task.detached(priority: .userInitiated) { [weak self] in
            var options = FlameEngine.Options(
                size: size,
                points: Int((46_000 * quality).rounded()),
                iterations: 24,
                warmup: 8,
                padding: role == .inner ? 1.7 : 2.1,
                seed: role == .inner ? 7_919 : 424_242
            )
            options.exposure = 1
            let buffer = FlameEngine.bake(frame: frame, options: options)
            let image = Self.cgImage(from: buffer)
            self?.complete(key: key, image: image)
        }
        return nil
    }

    private func complete(key: Key, image: CGImage?) {
        lock.lock()
        pending.remove(key)
        if let image {
            storage[key] = image
            if storage.count > Self.limit {
                for dropKey in storage.keys.prefix(storage.count - Self.limit) {
                    storage.removeValue(forKey: dropKey)
                }
            }
        }
        lock.unlock()
    }

    static func cgImage(from buffer: FlameEngine.Buffer) -> CGImage? {
        guard buffer.width > 0, buffer.height > 0,
              buffer.pixels.count == buffer.width * buffer.height * 3 else {
            return nil
        }
        var data = buffer.pixels
        let context = data.withUnsafeMutableBytes { pointer -> CGContext? in
            guard let baseAddress = pointer.baseAddress else { return nil }
            return CGContext(
                data: baseAddress,
                width: buffer.width,
                height: buffer.height,
                bitsPerComponent: 8,
                bytesPerRow: buffer.width * 3,
                space: CGColorSpaceCreateDeviceRGB(),
                bitmapInfo: CGImageAlphaInfo.none.rawValue
            )
        }
        return context?.makeImage()
    }
}

private struct OrbMetric: View {
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundStyle(HarshalTheme.secondaryText)
            Text(value)
                .font(.subheadline.weight(.semibold))
                .lineLimit(1)
                .minimumScaleFactor(0.72)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .harshalPanel(cornerRadius: 14)
    }
}
