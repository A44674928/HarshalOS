import Foundation
import NeoOrb
import SwiftUI

/// Native, display-only exploration surface for the NEO ORB geometry package.
/// It deliberately accepts only local synthetic fixture nodes in this first
/// slice; it does not create routes, requests, market facts, permissions, or
/// authority effects.
struct NeoOrbView: View {
    let isPreview: Bool

    @Environment(\.dismiss) private var dismiss
    @State private var formation = NeoOrbFixture.preview.formation
    @State private var axisX = NeoOrbFixture.preview.axes.x
    @State private var axisY = NeoOrbFixture.preview.axes.y
    @State private var axisZ = NeoOrbFixture.preview.axes.z
    @State private var berthSeparation = NeoOrbFixture.preview.berthSeparation
    @State private var selectedNodeID = NeoOrbFixture.previewNodes.first?.id

    init(isPreview: Bool = false) {
        self.isPreview = isPreview
    }

    private var configuration: NeoOrbConfiguration {
        NeoOrbConfiguration(
            formation: formation,
            axes: NeoOrbAxes(x: axisX, y: axisY, z: axisZ),
            nodes: NeoOrbFixture.previewNodes,
            berthSeparation: berthSeparation
        )
    }

    private var shape: NeoOrbShape? {
        try? NeoOrbGeometry.make(configuration: configuration)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    intro

                    if let shape = shape {
                        NeoOrbCanvas(shape: shape, selectedNodeID: selectedNodeID)
                            .frame(minHeight: 330)
                            .frame(maxWidth: 760)

                        metrics(shape: shape)
                        formationControls
                        axisControls
                        berthControls(shape: shape)
                        nodeControls(shape: shape)
                        nodeInspector(shape: shape)
                    } else {
                        ContentUnavailableView(
                            "NEO ORB shape unavailable",
                            systemImage: "exclamationmark.triangle",
                            description: Text("The local geometry controls produced an invalid display state.")
                        )
                    }

                    displayOnlyBoundary
                }
                .padding()
                .frame(maxWidth: 800, alignment: .leading)
            }
            .navigationTitle("NEO ORB")
            .toolbar {
                if isPreview {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Close") {
                            dismiss()
                        }
                    }
                }
                ToolbarItem(placement: .primaryAction) {
                    Button("Restore sample", action: restoreSample)
                }
            }
        }
    }

    private var intro: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Center-origin shape study")
                .font(.title2.bold())
            Text("A native visual model that joins The Orb’s disc-to-sphere formation and direct center attachments with Orb 2’s measured spheroid axes, logarithmic bands, and convergence reading.")
                .foregroundStyle(HarshalTheme.secondaryText)
        }
    }

    private func metrics(shape: NeoOrbShape) -> some View {
        LazyVGrid(
            columns: [GridItem(.adaptive(minimum: 130), spacing: 12)],
            alignment: .leading,
            spacing: 12
        ) {
            NeoOrbMetric(title: "Center origin", value: shape.centerAddress)
            NeoOrbMetric(title: "Formation", value: "\(Int((shape.formation * 100).rounded()))%")
            NeoOrbMetric(title: "Convergence", value: "\(Int((shape.convergence * 100).rounded()))%")
            NeoOrbMetric(title: "Berth resolver", value: berthSummary(shape.berthSeparation))
            NeoOrbMetric(title: "Display nodes", value: "\(shape.nodes.count) synthetic")
        }
    }

    private var formationControls: some View {
        GroupBox("Disc → spheroid formation") {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 12) {
                    Text("Disc")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(HarshalTheme.secondaryText)
                    Slider(value: $formation, in: 0...1, step: 0.01)
                        .accessibilityLabel("Disc to spheroid formation")
                    Text("Spheroid")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(HarshalTheme.secondaryText)
                }
                Text("\(Int((formation * 100).rounded()))% formed. At zero, all nodes share the center plane; at one, their equal-area latitudes and measured axes are visible.")
                    .font(.footnote)
                    .foregroundStyle(HarshalTheme.secondaryText)
            }
            .padding(.vertical, 4)
        }
    }

    private var axisControls: some View {
        GroupBox("Measured spheroid axes") {
            VStack(alignment: .leading, spacing: 12) {
                NeoOrbAxisControl(label: "X axis", value: $axisX)
                NeoOrbAxisControl(label: "Y axis", value: $axisY)
                NeoOrbAxisControl(label: "Z axis", value: $axisZ)
                Text("An ideal sphere is 1.00 / 1.00 / 1.00. These controls affect display geometry only; they are not a measurement claim about a person, device, market, or route.")
                    .font(.footnote)
                    .foregroundStyle(HarshalTheme.secondaryText)
            }
            .padding(.vertical, 4)
        }
    }

    private func berthControls(shape: NeoOrbShape) -> some View {
        GroupBox("Display berth separation") {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 12) {
                    Text("Exact")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(HarshalTheme.secondaryText)
                    Slider(value: $berthSeparation, in: 0...1, step: 0.01)
                        .accessibilityLabel("Display berth separation")
                    Text("Clear")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(HarshalTheme.secondaryText)
                }
                Text("\(Int((berthSeparation * 100).rounded()))% separation · \(berthDetail(shape.berthSeparation))")
                    .font(.footnote)
                    .foregroundStyle(HarshalTheme.secondaryText)
                Text("This only re-slots overlapping drawn nodes on their own local display geometry. It does not change sectors, source inputs, ranking, market data, routes, permissions, or authority.")
                    .font(.footnote)
                    .foregroundStyle(HarshalTheme.secondaryText)
            }
            .padding(.vertical, 4)
        }
    }

    private func nodeControls(shape: NeoOrbShape) -> some View {
        GroupBox("Synthetic display nodes") {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(shape.nodes) { placedNode in
                        NeoOrbNodeChip(
                            placedNode: placedNode,
                            isSelected: placedNode.id == selectedNodeID,
                            onSelect: {
                                selectedNodeID = placedNode.id
                            }
                        )
                    }
                }
                .padding(.vertical, 3)
            }
            .padding(.vertical, 4)
        }
    }

    @ViewBuilder
    private func nodeInspector(shape: NeoOrbShape) -> some View {
        if let selectedNode = shape.nodes.first(where: { $0.id == selectedNodeID }) {
            GroupBox("Selected display node") {
                VStack(alignment: .leading, spacing: 7) {
                    LabeledContent("Label", value: selectedNode.node.label)
                    LabeledContent("Sector", value: String(format: "%03d", selectedNode.node.sector))
                    LabeledContent("Kind", value: selectedNode.node.kind.neoOrbDisplayLabel)
                    LabeledContent("Depth", value: selectedNode.node.depth.formatted(.number.precision(.fractionLength(2))))
                    LabeledContent("Logarithmic band", value: "\(selectedNode.node.radialBand)")
                    LabeledContent("Display berth", value: selectedNode.wasReslotted ? "Re-slotted for visibility" : "Source position retained")
                    Text("This sector and its position are local, synthetic visualization inputs—not an OCM address resolution, destination, ownership record, or external assertion.")
                        .font(.footnote)
                        .foregroundStyle(HarshalTheme.secondaryText)
                        .padding(.top, 3)
                }
                .padding(.vertical, 4)
            }
        }
    }

    private var displayOnlyBoundary: some View {
        GroupBox("Display-only boundary") {
            VStack(alignment: .leading, spacing: 8) {
                Text("NEO ORB does not invoke the refusal gate, change a declaration, contact CloudKit, read a market/provider, route a request, authenticate a person, or confer authority.")
                    .font(.subheadline)
                Text("The shown nodes are deterministic synthetic fixtures for visual and geometry validation. Any future external field must arrive through a separately reviewed, read-only adapter with traceable provenance and tests.")
                    .font(.footnote)
                    .foregroundStyle(HarshalTheme.secondaryText)
            }
            .padding(.vertical, 4)
        }
    }

    private func restoreSample() {
        withAnimation(.easeInOut(duration: 0.25)) {
            formation = NeoOrbFixture.preview.formation
            axisX = NeoOrbFixture.preview.axes.x
            axisY = NeoOrbFixture.preview.axes.y
            axisZ = NeoOrbFixture.preview.axes.z
            berthSeparation = NeoOrbFixture.preview.berthSeparation
            selectedNodeID = NeoOrbFixture.previewNodes.first?.id
        }
    }

    private func berthSummary(_ report: NeoOrbBerthSeparation) -> String {
        if report.amount == 0 {
            return "Off"
        }
        if report.hasReslottedNodes {
            return "\(report.movedNodeIDs.count) moved"
        }
        return "Clear"
    }

    private func berthDetail(_ report: NeoOrbBerthSeparation) -> String {
        if report.amount == 0 {
            return "overlapping geometry is preserved"
        }
        if report.hasReslottedNodes {
            return "\(report.movedNodeIDs.count) of \(report.crowdedNodeCount) crowded nodes re-slotted"
        }
        return "no synthetic nodes currently share a display berth"
    }

}

private struct NeoOrbNodeChip: View {
    let placedNode: NeoOrbPlacedNode
    let isSelected: Bool
    let onSelect: () -> Void

    private var node: NeoOrbNode {
        return placedNode.node
    }

    private var metadataText: String {
        return "Band \(node.radialBand) · \(node.kind.neoOrbDisplayLabel)"
    }

    private var metadataColor: Color {
        if isSelected {
            return HarshalTheme.primaryText.opacity(0.90)
        }
        return HarshalTheme.secondaryText
    }

    private var borderColor: Color {
        let opacity = isSelected ? 0.9 : 0.35
        return node.kind.neoOrbDisplayColor.opacity(opacity)
    }

    private var borderWidth: CGFloat {
        return isSelected ? 1.5 : 1
    }

    private var backgroundColor: Color {
        return isSelected ? HarshalTheme.electricBlue.opacity(0.16) : HarshalTheme.elevatedSurface
    }

    private var accessibilityText: String {
        return "\(node.label), \(node.kind.neoOrbDisplayLabel) node"
    }

    var body: some View {
        Button(action: onSelect) {
            VStack(alignment: .leading, spacing: 4) {
                Text(node.label)
                    .font(.subheadline.weight(.semibold))
                Text(metadataText)
                    .font(.caption2)
                    .foregroundStyle(metadataColor)
            }
            .frame(minWidth: 122, alignment: .leading)
            .padding(10)
            .background(backgroundColor, in: RoundedRectangle(cornerRadius: 12))
            .overlay {
                RoundedRectangle(cornerRadius: 12)
                    .stroke(borderColor, lineWidth: borderWidth)
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(accessibilityText)
        .accessibilityValue(isSelected ? "Selected" : "Not selected")
    }
}

private extension NeoOrbNodeKind {
    var neoOrbDisplayLabel: String {
        switch self {
        case .structural:
            return "Structural"
        case .field:
            return "Field"
        case .interaction:
            return "Interaction"
        }
    }

    var neoOrbDisplayColor: Color {
        switch self {
        case .structural:
            return HarshalTheme.electricBlue
        case .field:
            return HarshalTheme.primaryText
        case .interaction:
            return HarshalTheme.warning
        }
    }
}

private struct NeoOrbCanvas: View {
    let shape: NeoOrbShape
    let selectedNodeID: String?

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
                        colors: [HarshalTheme.surface, HarshalTheme.elevatedSurface],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
        }
        .clipShape(RoundedRectangle(cornerRadius: 22))
        .overlay {
            RoundedRectangle(cornerRadius: 22)
                .stroke(HarshalTheme.electricBlue.opacity(0.42), lineWidth: 1)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Animated NEO ORB display")
        .accessibilityValue("\(shape.nodes.count) synthetic nodes, \(Int((shape.convergence * 100).rounded())) percent convergence")
    }

    private func draw(in context: inout GraphicsContext, size: CGSize, timestamp: TimeInterval) {
        guard size.width > 0, size.height > 0 else {
            return
        }

        let center = CGPoint(x: size.width / 2, y: size.height / 2)
        let outerRadius = min(size.width, size.height) * 0.34
        let yaw = timestamp * 0.12
        let projectedNodes = shape.nodes
            .map { project($0, center: center, outerRadius: outerRadius, yaw: yaw) }
            .sorted { $0.depth < $1.depth }

        drawLatitudeBands(in: &context, center: center, outerRadius: outerRadius)
        drawLongitudeArcs(in: &context, center: center, outerRadius: outerRadius, yaw: yaw)
        drawDirectAttachments(in: &context, center: center, nodes: projectedNodes)
        drawNodes(in: &context, nodes: projectedNodes, outerRadius: outerRadius)
        drawCenterOrigin(in: &context, center: center)
    }

    private func drawLatitudeBands(in context: inout GraphicsContext, center: CGPoint, outerRadius: CGFloat) {
        let largestRadius = shape.radialBands.last?.radius ?? 1
        let verticalScale = CGFloat(0.18 + 0.58 * shape.formation * shape.axes.y)
        for band in shape.radialBands.dropFirst() {
            let fraction = CGFloat(band.radius / largestRadius)
            let ellipseWidth = outerRadius * 2 * fraction * CGFloat(shape.axes.x)
            let ellipseHeight = outerRadius * 2 * fraction * verticalScale
            let rect = CGRect(
                x: center.x - ellipseWidth / 2,
                y: center.y - ellipseHeight / 2,
                width: ellipseWidth,
                height: ellipseHeight
            )
            var ring = Path()
            ring.addEllipse(in: rect)
            context.stroke(ring, with: .color(.cyan.opacity(0.10 + 0.018 * Double(band.index))), lineWidth: 0.8)
        }
    }

    private func drawLongitudeArcs(in context: inout GraphicsContext, center: CGPoint, outerRadius: CGFloat, yaw: Double) {
        let longitudeCount = 8
        for index in 0..<longitudeCount {
            let baseAngle = (Double(index) / Double(longitudeCount)) * .pi
            var path = Path()
            let samples = 36
            for sample in 0...samples {
                let latitude = -Double.pi / 2 + (Double(sample) / Double(samples)) * .pi
                let vector = NeoOrbVector3(
                    x: cos(latitude) * cos(baseAngle),
                    y: sin(latitude),
                    z: cos(latitude) * sin(baseAngle)
                )
                let point = project(vector, center: center, outerRadius: outerRadius, yaw: yaw).point
                if sample == 0 {
                    path.move(to: point)
                } else {
                    path.addLine(to: point)
                }
            }
            context.stroke(path, with: .color(.white.opacity(0.075)), lineWidth: 0.7)
        }
    }

    private func drawDirectAttachments(in context: inout GraphicsContext, center: CGPoint, nodes: [NeoOrbProjectedNode]) {
        for node in nodes {
            var attachment = Path()
            attachment.move(to: center)
            attachment.addLine(to: node.point)
            let isSelected = node.placedNode.id == selectedNodeID
            context.stroke(
                attachment,
                with: .color(color(for: node.placedNode.node.kind).opacity(isSelected ? 0.68 : 0.26)),
                lineWidth: isSelected ? 1.55 : 0.75
            )
        }
    }

    private func drawNodes(in context: inout GraphicsContext, nodes: [NeoOrbProjectedNode], outerRadius: CGFloat) {
        for node in nodes {
            let isSelected = node.placedNode.id == selectedNodeID
            let radius = max(4, outerRadius * CGFloat(node.placedNode.nodeRadius) * node.scale * 1.35)
            let rect = CGRect(x: node.point.x - radius, y: node.point.y - radius, width: radius * 2, height: radius * 2)
            let color = color(for: node.placedNode.node.kind)

            if isSelected {
                let glowRadius = radius * 2.35
                let glow = CGRect(
                    x: node.point.x - glowRadius,
                    y: node.point.y - glowRadius,
                    width: glowRadius * 2,
                    height: glowRadius * 2
                )
                context.fill(Path(ellipseIn: glow), with: .color(color.opacity(0.16)))
            }

            context.fill(Path(ellipseIn: rect), with: .color(color.opacity(0.96)))
            context.stroke(Path(ellipseIn: rect), with: .color(.white.opacity(0.85)), lineWidth: isSelected ? 1.5 : 0.8)
        }
    }

    private func drawCenterOrigin(in context: inout GraphicsContext, center: CGPoint) {
        let halo = CGRect(x: center.x - 19, y: center.y - 19, width: 38, height: 38)
        let core = CGRect(x: center.x - 7, y: center.y - 7, width: 14, height: 14)
        context.fill(Path(ellipseIn: halo), with: .color(.cyan.opacity(0.14)))
        context.fill(Path(ellipseIn: core), with: .color(.white.opacity(0.97)))
        context.stroke(Path(ellipseIn: core), with: .color(.cyan.opacity(0.9)), lineWidth: 1.2)
    }

    private func project(
        _ placedNode: NeoOrbPlacedNode,
        center: CGPoint,
        outerRadius: CGFloat,
        yaw: Double
    ) -> NeoOrbProjectedNode {
        let projected = project(placedNode.position, center: center, outerRadius: outerRadius, yaw: yaw)
        return NeoOrbProjectedNode(
            placedNode: placedNode,
            point: projected.point,
            depth: projected.depth,
            scale: projected.scale
        )
    }

    private func project(
        _ vector: NeoOrbVector3,
        center: CGPoint,
        outerRadius: CGFloat,
        yaw: Double
    ) -> (point: CGPoint, depth: Double, scale: CGFloat) {
        let cosine = cos(yaw)
        let sine = sin(yaw)
        let rotatedX = vector.x * cosine - vector.z * sine
        let rotatedZ = vector.x * sine + vector.z * cosine
        let tilt = 0.28
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

    private func color(for kind: NeoOrbNodeKind) -> Color {
        switch kind {
        case .structural:
            return HarshalTheme.electricBlue
        case .field:
            return HarshalTheme.primaryText
        case .interaction:
            return HarshalTheme.warning
        }
    }
}

private struct NeoOrbProjectedNode {
    let placedNode: NeoOrbPlacedNode
    let point: CGPoint
    let depth: Double
    let scale: CGFloat
}

private struct NeoOrbAxisControl: View {
    let label: String
    @Binding var value: Double

    var body: some View {
        HStack(spacing: 12) {
            Text(label)
                .frame(width: 46, alignment: .leading)
            Slider(value: $value, in: 0.70...1.30, step: 0.01)
                .accessibilityLabel(label)
            Text(value.formatted(.number.precision(.fractionLength(2))))
                .monospacedDigit()
                .frame(width: 36, alignment: .trailing)
        }
    }
}

private struct NeoOrbMetric: View {
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
