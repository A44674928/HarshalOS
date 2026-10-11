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
///
/// Two divergences from `js/flame.js` are deliberate and pinned by tests:
/// frames whose palette has no usable entries are *kept* (they render through
/// the ice fallback) where the browser drops them, and a short palette's tail
/// repeats its last entry where the browser leaves zeros. Both exist so a bake
/// can never come out dark; neither changes any bundled film.
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
    // MARK: - Patterns
    //
    // The document is scanned with `NSRegularExpression` rather than regex
    // *literals* (`/.../`) on purpose. The literal syntax needs the
    // `BareSlashRegexLiterals` upcoming feature whenever the language mode is
    // Swift 5 — which is what the Xcode project (`SWIFT_VERSION = 5.0`) and
    // this package's `swift-tools-version: 5.10` both compile in — and a build
    // without that opt-in rejects `/…/` outright. Compiling the same pattern
    // strings at runtime behaves identically on every toolchain, every
    // language mode, and every platform this package supports.
    //
    // The pattern strings are the browser engine's own (`js/flame.js`), held in
    // raw string literals so they read exactly as they do there.

    private nonisolated(unsafe) static let rootNameExpression =
        Self.expression(#"<flames[^>]*name="([^"]*)""#)
    /// `<flame` — with a word boundary, so it never matches the `<flames` root.
    private nonisolated(unsafe) static let frameBoundaryExpression =
        Self.expression(#"<flame\b"#)
    private nonisolated(unsafe) static let paletteExpression =
        Self.expression(#"<palette[^>]*count="(\d+)"[^>]*>([\s\S]*?)</palette>"#)
    private nonisolated(unsafe) static let transformExpression =
        Self.expression(#"<xform\b[^>]*?/?>"#)
    private nonisolated(unsafe) static let attributeExpression =
        Self.expression(#"([\w.-]+)\s*=\s*"([^"]*)""#)

    /// Parse a `.flame` document. Lenient: broken frames are skipped.
    public static func parse(_ text: String) -> FlameDocument {
        var document = FlameDocument(rootName: "", frames: [])
        guard !text.isEmpty else { return document }

        let normalized = text
            .replacingOccurrences(of: "\u{FEFF}", with: "")
            .replacingOccurrences(of: "\r\n", with: "\n")

        if let match = Self.matches(Self.rootNameExpression, in: normalized).first,
           let rootName = Self.substring(match.range(at: 1), in: normalized) {
            document.rootName = rootName
        }

        // Split on `<flame\b` (word boundary — never on the `<flames` root).
        let boundaries = Self.matches(Self.frameBoundaryExpression, in: normalized)
            .compactMap { Range($0.range, in: normalized) }
        var blocks: [Substring] = []
        for (index, boundary) in boundaries.enumerated() {
            let blockStart = boundary.upperBound
            let blockEnd = index + 1 < boundaries.count ? boundaries[index + 1].lowerBound : normalized.endIndex
            blocks.append(normalized[blockStart..<blockEnd])
        }

        for (partIndex, block) in blocks.enumerated() {
            guard let headEnd = block.firstIndex(of: ">") else { continue }
            let head = Self.attributes(String(block[block.startIndex..<headEnd]))
            let body = String(block[block.index(after: headEnd)...])

            guard let paletteMatch = Self.matches(Self.paletteExpression, in: body).first,
                  let declaredCount = Self.substring(paletteMatch.range(at: 1), in: body),
                  let paletteBody = Self.substring(paletteMatch.range(at: 2), in: body) else {
                continue
            }
            let palette = Self.parsePalette(
                paletteBody,
                declaredCount: Int(declaredCount) ?? FlamePalette.entryCount
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
            for match in Self.matches(Self.transformExpression, in: body) {
                guard let tag = Self.substring(match.range, in: body) else { continue }
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
        for match in Self.matches(Self.attributeExpression, in: tag) {
            guard let name = Self.substring(match.range(at: 1), in: tag),
                  let value = Self.substring(match.range(at: 2), in: tag) else { continue }
            out[name] = value
        }
        return out
    }

    // MARK: - Matching

    /// A compiled expression from one of this type's literal patterns. The
    /// patterns are constants, so a failure here is a programmer error.
    private static func expression(_ pattern: String) -> NSRegularExpression {
        do {
            return try NSRegularExpression(pattern: pattern)
        } catch {
            preconditionFailure("invalid .flame pattern \(pattern): \(error)")
        }
    }

    /// Every non-overlapping match of `expression` in `text`, in order.
    private static func matches(_ expression: NSRegularExpression, in text: String) -> [NSTextCheckingResult] {
        expression.matches(in: text, range: NSRange(text.startIndex..<text.endIndex, in: text))
    }

    /// The text a match range covers, or `nil` when that group did not
    /// participate in the match (or the range is out of bounds).
    private static func substring(_ range: NSRange, in text: String) -> String? {
        guard range.location != NSNotFound, let range = Range(range, in: text) else { return nil }
        return String(text[range])
    }

    /// The browser engine's `parseFloat` rule, which is lenient about
    /// *trailing* text: `"0.5"` → 0.5, and so are `"0.5 0.5"` → 0.5,
    /// `"0.5abc"` → 0.5, `"0x10"` → 0 and `"1e"` → 1.
    ///
    /// Apophysis frames rely on this: `chaos` tables, `post` matrices and
    /// `var_order` lists are multi-token values, and the browser folds their
    /// leading number into the curve blend as an ordinary curve weight. The
    /// strict `Double(_:)` used before this returned nil for those, so the
    /// transform was left with fewer curves and the convex blend renormalized
    /// over that smaller set — every *other* curve on the transform silently
    /// changed weight, and the native bake drifted from the site on 19,622
    /// transforms of the local corpus alone.
    static func finite(_ value: String?) -> Double? {
        guard let value, let parsed = prefixDouble(value), parsed.isFinite else {
            return nil
        }
        return parsed
    }

    /// Longest numeric prefix of `text`, under `parseFloat` semantics: optional
    /// leading whitespace, optional sign, digits with an optional fraction, and
    /// an optional exponent that is consumed only when a digit follows it.
    /// Returns `nil` when the text has no numeric prefix at all.
    static func prefixDouble(_ text: String) -> Double? {
        var index = text.startIndex
        while index < text.endIndex, text[index].isWhitespace {
            index = text.index(after: index)
        }
        let start = index
        if index < text.endIndex, text[index] == "+" || text[index] == "-" {
            index = text.index(after: index)
        }

        var integerDigits = 0
        while index < text.endIndex, Self.isASCIIDigit(text[index]) {
            index = text.index(after: index)
            integerDigits += 1
        }
        var fractionDigits = 0
        if index < text.endIndex, text[index] == "." {
            var probe = text.index(after: index)
            while probe < text.endIndex, Self.isASCIIDigit(text[probe]) {
                probe = text.index(after: probe)
                fractionDigits += 1
            }
            if integerDigits > 0 || fractionDigits > 0 {
                index = probe
            }
        }
        guard integerDigits + fractionDigits > 0 else { return nil }

        if index < text.endIndex, text[index] == "e" || text[index] == "E" {
            var probe = text.index(after: index)
            if probe < text.endIndex, text[probe] == "+" || text[probe] == "-" {
                probe = text.index(after: probe)
            }
            let exponentStart = probe
            while probe < text.endIndex, Self.isASCIIDigit(text[probe]) {
                probe = text.index(after: probe)
            }
            if probe > exponentStart {
                index = probe
            }
        }

        // Normalize the scanned prefix into a literal `Double(_:)` always
        // accepts — ".5" → "0.5", "5." → "5.0", "+1" → "1".
        var literal = String(text[start..<index])
        var sign = ""
        if literal.hasPrefix("+") || literal.hasPrefix("-") {
            sign = String(literal.removeFirst())
        }
        var exponent = ""
        if let marker = literal.firstIndex(where: { $0 == "e" || $0 == "E" }) {
            exponent = String(literal[marker...])
            literal = String(literal[..<marker])
        }
        if literal.hasPrefix(".") {
            literal = "0" + literal
        }
        if literal.hasSuffix(".") {
            literal += "0"
        }
        return Double(sign == "+" ? literal + exponent : sign + literal + exponent)
    }

    /// ASCII-only digit test — `Character.isNumber` would also accept non-ASCII
    /// digits and numeric graphemes, which `parseFloat` rejects.
    private static func isASCIIDigit(_ character: Character) -> Bool {
        guard character.unicodeScalars.count == 1, let scalar = character.unicodeScalars.first else {
            return false
        }
        return scalar.value >= 0x30 && scalar.value <= 0x39
    }

    /// The browser engine's `.trim().split(/\s+/).map(parseFloat)` rule.
    ///
    /// Tokens are kept *positionally*: a token without a numeric prefix stays
    /// in place as `.nan` instead of being dropped, so a corrupted `coefs`
    /// string can only reject its own transform (the first six coefficients
    /// must be finite) and can never shift the coefficients of a transform
    /// that survives — dropping tokens turned `"oops 0.6 0 0 0 0.6 0.1"` into
    /// a silently *different* affine map. `nil` means the attribute is absent.
    static func numbers(_ value: String?) -> [Double]? {
        guard let value else { return nil }
        var parts: [Double] = []
        var token = ""
        for character in value {
            if character.isWhitespace {
                if !token.isEmpty {
                    parts.append(Self.finite(token) ?? .nan)
                    token = ""
                }
            } else {
                token.append(character)
            }
        }
        if !token.isEmpty {
            parts.append(Self.finite(token) ?? .nan)
        }
        return parts
    }

    static func parsePalette(_ body: String, declaredCount: Int) -> FlamePalette {
        let hex = body.unicodeScalars.filter { CharacterSet(charactersIn: "0123456789abcdefABCDEF").contains($0) }
        var characters = ""
        characters.unicodeScalars.append(contentsOf: hex)

        var red = [UInt8](repeating: 0, count: FlamePalette.entryCount)
        var green = [UInt8](repeating: 0, count: FlamePalette.entryCount)
        var blue = [UInt8](repeating: 0, count: FlamePalette.entryCount)
        // A declared count of 0 means "unspecified" — the browser reads
        // `count || 256`, so a `<palette count="0">` that does carry entries
        // still decodes them instead of falling back to ice.
        let declared = declaredCount > 0 ? declaredCount : FlamePalette.entryCount
        let usable = min(min(declared, FlamePalette.entryCount), characters.count / 6)

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
        // Fill the tail by repeating the last written entry. This is a
        // deliberate, tested divergence: the browser leaves the unwritten tail
        // at zero, so any palette index beyond the file's entry count splats
        // black there. Repeating the last entry (with the ice fallback above
        // covering a palette that has no entries at all) is this engine's
        // "a render is never dark" rule; the bundled films ship all 256
        // entries, so the two agree on every file in the repo.
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
    ///
    /// Parameters are keyed by their **full attribute name** (`rings2_val`,
    /// `julian_dist`, `curl_c1`, `epispiral_n`, `rectangles_x`) — the
    /// vocabulary `FlameCurves` reads. Keying them by the suffix after the
    /// first underscore (`val`, `dist`, `c1`) made every parameter in every
    /// file unreachable: 10,868 parameterized library curves in the local
    /// corpus all silently fell back to their default values.
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
                // Underscore attribute: a parameter if it extends a known
                // no-underscore curve name (e.g. `julian_dist`, `rings2_val`,
                // `curl_c1`). Part of a 3D variation's vocabulary
                // (`hypertile_p`, `julia3D_power`) is kept too — the curves
                // simply never ask for it.
                if let underscore = name.firstIndex(of: "_") {
                    let base = String(name[name.startIndex..<underscore])
                    if noUnderscoreNames.contains(base) {
                        parameters[name] = weight
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
