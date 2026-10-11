import Foundation

/// The `.flame` document model — a faithful Swift port of the lenient browser
/// parser in `js/flame.js`.
///
/// A `.flame` file is an *animation of iterated function systems*: every
/// `<flame>` block holds a camera, a 256-entry palette, and a small set of
/// weighted affine transforms, each folded by named Apophysix curve warps.
///
/// The parser is deliberately lenient, matching the browser engine: a BOM and
/// CRLF line endings are tolerated, and an individual malformed frame is
/// skipped — never fatal for the rest of the animation.
public struct FlameDocument: Sendable, Equatable {
    public var rootName: String
    public var frames: [FlameFrame]

    public struct Stats: Sendable, Equatable {
        public let frames: Int
        public let minimumTransforms: Int
        public let maximumTransforms: Int
        public let curveCounts: [String: Int]
        public let versions: [String]
    }

    public var stats: Stats? {
        guard let first = frames.first else { return nil }
        var minimum = first.transforms.count
        var maximum = minimum
        var curveCounts: [String: Int] = [:]
        var versions: Set<String> = []
        for frame in frames {
            minimum = min(minimum, frame.transforms.count)
            maximum = max(maximum, frame.transforms.count)
            for transform in frame.transforms {
                for curve in transform.curves {
                    curveCounts[curve.name, default: 0] += 1
                }
            }
            if !frame.version.isEmpty {
                versions.insert(frame.version)
            }
        }
        return Stats(
            frames: frames.count,
            minimumTransforms: minimum,
            maximumTransforms: maximum,
            curveCounts: curveCounts,
            versions: versions.sorted()
        )
    }
}

public struct FlameFrame: Sendable, Equatable {
    public let name: String
    public let version: String
    public let brightness: Double
    public let gamma: Double
    public let gammaThreshold: Double
    public let palette: FlamePalette
    public let transforms: [FlameTransform]
}

/// A single affine core `L(p) = A·p + t` plus the convex blend of named curve
/// warps applied over the affine image.
public struct FlameTransform: Sendable, Equatable {
    public let a: Double
    public let b: Double
    public let c: Double
    public let d: Double
    public let e: Double
    public let f: Double
    /// Selection weight (renormalized by the parser to Σw = 1 across transforms).
    public let weight: Double
    /// Palette index (0...255) splatted by this transform's iterations.
    public let paletteIndex: Int
    /// Convex-blended named curves: `{name, weight}` with Σweight = 1.
    public let curves: [FlameCurve]
    /// Per-curve named parameters (e.g. `julian_dist`, `rings2_val`).
    public let parameters: [String: Double]

    public func affine(_ x: Double, _ y: Double) -> (x: Double, y: Double) {
        (a * x + b * y + c, d * x + e * y + f)
    }
}

public struct FlameCurve: Sendable, Equatable {
    public let name: String
    public let weight: Double
}

/// A 256-entry RGB palette. A palette with zero usable entries falls back to
/// the browser engine's ice→white ramp so a render is never dark.
public struct FlamePalette: Sendable, Equatable {
    public static let entryCount = 256

    public let red: [UInt8]
    public let green: [UInt8]
    public let blue: [UInt8]

    public init(red: [UInt8], green: [UInt8], blue: [UInt8]) {
        precondition(red.count == Self.entryCount && green.count == Self.entryCount && blue.count == Self.entryCount)
        self.red = red
        self.green = green
        self.blue = blue
    }

    public static let iceFallback = FlamePalette.makeFallback()

    static func makeFallback() -> FlamePalette {
        var red: [UInt8] = []
        var green: [UInt8] = []
        var blue: [UInt8] = []
        red.reserveCapacity(Self.entryCount)
        green.reserveCapacity(Self.entryCount)
        blue.reserveCapacity(Self.entryCount)
        for index in 0..<Self.entryCount {
            let t = Double(index) / 255.0
            red.append(UInt8((40 + 215 * t).rounded().clamped(to: 0...255)))
            green.append(UInt8((110 + 145 * t).rounded().clamped(to: 0...255)))
            blue.append(UInt8((160 + 95 * t).rounded().clamped(to: 0...255)))
        }
        return FlamePalette(red: red, green: green, blue: blue)
    }

    public func at(_ index: Int) -> (red: UInt8, green: UInt8, blue: UInt8) {
        let clamped = index & 255
        return (red[clamped], green[clamped], blue[clamped])
    }
}

public enum FlameParserError: Error, Equatable {
    case noFrames
}

public enum FlameParser {
    /// Parse a `.flame` document. Lenient: broken frames are skipped.
    public static func parse(_ text: String) -> FlameDocument {
        var document = FlameDocument(rootName: "", frames: [])
        guard !text.isEmpty else { return document }

        let normalized = text
            .replacingOccurrences(of: "\u{FEFF}", with: "")
            .replacingOccurrences(of: "\r\n", with: "\n")

        if let match = normalized.firstMatch(of: /<flames[^>]*name="([^"]*)"/) {
            document.rootName = String(match.1)
        }

        // Split on `<flame\b` (word boundary — never on the `<flames` root).
        var blocks: [Substring] = []
        var nextBoundary = normalized.range(of: /<flame\b/, range: normalized.startIndex..<normalized.endIndex)
        while let boundary = nextBoundary {
            let blockStart = boundary.upperBound
            nextBoundary = normalized.range(of: /<flame\b/, range: blockStart..<normalized.endIndex)
            let blockEnd = nextBoundary?.lowerBound ?? normalized.endIndex
            blocks.append(normalized[blockStart..<blockEnd])
        }

        for (partIndex, block) in blocks.enumerated() {
            guard let headEnd = block.firstIndex(of: ">") else { continue }
            let head = Self.attributes(String(block[block.startIndex..<headEnd]))
            let body = String(block[block.index(after: headEnd)...])

            guard let paletteMatch = body.firstMatch(of: /<palette[^>]*count="(\d+)"[^>]*>([\s\S]*?)<\/palette>/) else {
                continue
            }
            let palette = Self.parsePalette(
                String(paletteMatch.2),
                declaredCount: Int(paletteMatch.1).flatMap { $0 } ?? 256
            )

            let size = Self.numbers(head["size"]) ?? [1_024, 1_024]
            let center = Self.numbers(head["center"]) ?? [0, 0]
            let background = Self.numbers(head["background"]) ?? [0, 0, 0]
            _ = size          // The native engine auto-frames; camera W/H is informational.
            _ = center
            _ = background

            // Pass 1: collect no-underscore attribute names — data-driven
            // curve discovery, exactly like the browser engine.
            var noUnderscoreNames = Set<String>()
            var transformTags: [String] = []
            for match in body.matches(of: /<xform\b[^>]*?\/?>/) {
                let tag = String(match.0)
                transformTags.append(tag)
                for attribute in Self.attributes(tag).keys where !attribute.contains("_") {
                    noUnderscoreNames.insert(attribute)
                }
            }

            var transforms: [FlameTransform] = []
            for tag in transformTags {
                let attributes = Self.attributes(tag)
                guard let coefs = Self.numbers(attributes["coefs"]), coefs.count >= 6,
                      coefs.prefix(6).allSatisfy({ $0.isFinite }) else {
                    continue
                }
                let colorRatio = attributes["color"].flatMap(Self.finite) ?? 0
                let paletteIndex = Int((min(1, max(0, colorRatio)) * 255).rounded()) & 255
                let (curves, parameters) = Self.classify(
                    attributes: attributes,
                    noUnderscoreNames: noUnderscoreNames
                )
                transforms.append(
                    FlameTransform(
                        a: coefs[0], b: coefs[1], c: coefs[2],
                        d: coefs[3], e: coefs[4], f: coefs[5],
                        weight: Self.finite(attributes["weight"]).flatMap { $0 > 0 ? $0 : nil } ?? 1,
                        paletteIndex: paletteIndex,
                        curves: curves,
                        parameters: parameters
                    )
                )
            }
            guard !transforms.isEmpty else { continue }

            document.frames.append(
                FlameFrame(
                    name: head["name"] ?? "frame-\(partIndex)",
                    version: head["version"] ?? "",
                    brightness: Self.finite(head["brightness"]) ?? 4,
                    gamma: Self.finite(head["gamma"]).flatMap { $0 > 0 ? $0 : nil } ?? 4,
                    gammaThreshold: Self.finite(head["gamma_threshold"]) ?? 0.01,
                    palette: palette,
                    transforms: transforms
                )
            )
        }
        return document
    }

    /// `attr="value"` scanner tolerant of whitespace and attribute order.
    static func attributes(_ tag: String) -> [String: String] {
        var out: [String: String] = [:]
        for match in tag.matches(of: /([\w.-]+)\s*=\s*"([^"]*)"/) {
            out[String(match.1)] = String(match.2)
        }
        return out
    }

    static func finite(_ value: String?) -> Double? {
        guard let value, let parsed = Double(value.trimmingCharacters(in: .whitespaces)), parsed.isFinite else {
            return nil
        }
        return parsed
    }

    static func numbers(_ value: String?) -> [Double]? {
        guard let value else { return nil }
        let parts = value.split(whereSeparator: { $0 == " " || $0 == "\t" || $0 == "\n" }).compactMap { Double($0) }
        return parts.isEmpty ? nil : parts
    }

    static func parsePalette(_ body: String, declaredCount: Int) -> FlamePalette {
        let hex = body.unicodeScalars.filter { CharacterSet(charactersIn: "0123456789abcdefABCDEF").contains($0) }
        var characters = ""
        characters.unicodeScalars.append(contentsOf: hex)

        var red = [UInt8](repeating: 0, count: FlamePalette.entryCount)
        var green = [UInt8](repeating: 0, count: FlamePalette.entryCount)
        var blue = [UInt8](repeating: 0, count: FlamePalette.entryCount)
        let usable = min(min(declaredCount, FlamePalette.entryCount), characters.count / 6)

        if usable == 0 {
            return .iceFallback
        }
        for index in 0..<usable {
            let start = characters.index(characters.startIndex, offsetBy: index * 6)
            let chunk = characters[start..<characters.index(start, offsetBy: 6)]
            red[index] = UInt8(strtoul(String(chunk.prefix(2)), nil, 16))
            green[index] = UInt8(strtoul(String(chunk.dropFirst(2).prefix(2)), nil, 16))
            blue[index] = UInt8(strtoul(String(chunk.suffix(2)), nil, 16))
        }
        // Fill the tail by repeating the last written entry (browser behavior
        // leaves zeros; the JS renderer reads a shared Uint8Array that keeps
        // the last decoded byte — a tail repeat is the closest safe port and
        // the engine's files always ship 256 entries anyway).
        if usable < FlamePalette.entryCount {
            for index in usable..<FlamePalette.entryCount {
                red[index] = red[usable - 1]
                green[index] = green[usable - 1]
                blue[index] = blue[usable - 1]
            }
        }
        return FlamePalette(red: red, green: green, blue: blue)
    }

    /// Attribute → (curve weight | named parameter | ignored pipeline stage).
    /// Curves are renormalized to Σw = 1 (convex blend invariant). Keys are
    /// visited in sorted order so the blend order is process-independent.
    static func classify(
        attributes: [String: String],
        noUnderscoreNames: Set<String>
    ) -> (curves: [FlameCurve], parameters: [String: Double]) {
        var curves: [(name: String, weight: Double)] = []
        var parameters: [String: Double] = [:]

        for name in attributes.keys.sorted() {
            let rawValue = attributes[name]!
            if name == "weight" || name == "color" || name == "opacity" || name == "coefs" { continue }
            if name.hasPrefix("pre_") || name.hasPrefix("post_") { continue }
            guard let weight = Self.finite(rawValue) else { continue }

            if name.contains("_") {
                // Underscore attribute: parameter if it extends a known
                // no-underscore curve name (e.g. `julian_dist`, `rings2_val`).
                if let underscore = name.firstIndex(of: "_") {
                    let base = String(name[name.startIndex..<underscore])
                    if noUnderscoreNames.contains(base) {
                        parameters[String(name[name.index(after: underscore)...])] = weight
                        continue
                    }
                }
                continue
            }
            guard noUnderscoreNames.contains(name), weight > 0 else { continue }
            curves.append((name, weight))
        }

        let total = curves.reduce(0) { $0 + $1.weight }
        if total > 0, abs(total - 1) > 1e-3 {
            curves = curves.map { (name: $0.name, weight: $0.weight / total) }
        }
        return (curves.map { FlameCurve(name: $0.name, weight: $0.weight) }, parameters)
    }
}

private extension Comparable {
    func clamped(to range: ClosedRange<Self>) -> Self {
        min(max(self, range.lowerBound), range.upperBound)
    }
}
