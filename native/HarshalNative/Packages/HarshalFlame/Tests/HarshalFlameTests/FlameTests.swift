import XCTest

@testable import HarshalFlame

final class FlameTests: XCTestCase {
    /// A tiny two-transform document exercising camera, curves, parameters,
    /// and palette parsing.
    private let sampleText = """
    <flames name="Sample">
    <flame name="Sample-001" version="Apophysis 7x" size="512 512" center="0 0" scale="420" brightness="4" gamma="4" gamma_threshold="0.01">
    <palette count="16" format="RGB">
    FF0000
    00FF00
    0000FF
    FFFF00
    </palette>
    <xform weight="0.5" color="0.1" spherical="0.7" spiral="0.3" coefs="0.6 0 0 0 0.6 0.1"/>
    <xform weight="0.5" color="0.9" julian="1" julian_dist="-0.4" rings2="0.6" rings2_val="0.4" coefs="0.8 0 0 0 0.8 0"/>
    </flame>
    </flames>
    """

    func testParsesFramesCurvesAndParameters() {
        let document = FlameParser.parse(sampleText)
        XCTAssertEqual(document.rootName, "Sample")
        XCTAssertEqual(document.frames.count, 1)
        let frame = try! XCTUnwrap(document.frames.first)
        XCTAssertEqual(frame.transforms.count, 2)
        XCTAssertEqual(frame.brightness, 4)
        XCTAssertEqual(frame.gamma, 4)
        XCTAssertEqual(frame.gammaThreshold, 0.01, accuracy: 1e-12)
        XCTAssertEqual(frame.transforms[0].curves.map(\.name), ["spherical", "spiral"])
        // Convex renormalization: 0.7 + 0.3 → already 1.
        XCTAssertEqual(frame.transforms[0].curves.reduce(0) { $0 + $1.weight }, 1, accuracy: 1e-9)
        XCTAssertEqual(frame.transforms[1].parameters["julian_dist"] ?? 99, -0.4, accuracy: 1e-12)
        XCTAssertEqual(frame.transforms[1].parameters["rings2_val"] ?? 99, 0.4, accuracy: 1e-12)
        // color 0.9 → palette index round(0.9×255).
        XCTAssertEqual(frame.transforms[1].paletteIndex, Int((0.9 * 255).rounded()))
        // Palettes with fewer entries than 256 keep the documented tail repeat.
        XCTAssertEqual(frame.palette.at(300).red, frame.palette.at(3).red)
    }

    /// The browser engine parses attribute values with `parseFloat`, which
    /// takes the longest numeric prefix and ignores trailing text. Real
    /// Apophysis frames rely on it — `chaos` tables and `post` matrices are
    /// multi-token values, and their leading number participates in the convex
    /// curve blend, so dropping them would silently re-weight every other
    /// curve on the transform.
    func testLenientAttributeValuesMatchTheBrowserParser() {
        let text = """
        <flames name="Lenient">
        <flame name="Lenient-001" brightness="4" gamma="4">
        <palette count="4">
        FF0000
        00FF00
        0000FF
        FFFF00
        </palette>
        <xform weight="0.5abc" color="0.5x" spherical="0.7x" spiral="0.3" coefs="0.6 0 0 0 0.6 0.1"/>
        <xform weight="0.5" color="0.1" bubble="1" chaos="1 1 1 0 " post="0.736121164745961 0.104512980642036" coefs="0.78 0 0 0 0.78 0"/>
        </flame>
        </flames>
        """
        let document = FlameParser.parse(text)
        XCTAssertEqual(document.frames.count, 1)
        let frame = try! XCTUnwrap(document.frames.first)
        XCTAssertEqual(frame.transforms.count, 2)

        // "0.5abc" → 0.5 (a strict parse fell back to weight 1)…
        XCTAssertEqual(frame.transforms[0].weight, 0.5, accuracy: 1e-12)
        // …and "0.5x" → the same palette index as "0.5".
        XCTAssertEqual(frame.transforms[0].paletteIndex, Int((0.5 * 255).rounded()))
        XCTAssertEqual(frame.transforms[0].curves.map(\.name), ["spherical", "spiral"])

        // Multi-token values keep their leading number as a curve weight and
        // renormalize over the whole set, exactly like the site.
        var weights: [String: Double] = [:]
        for curve in frame.transforms[1].curves {
            weights[curve.name] = curve.weight
        }
        XCTAssertEqual(weights["post"] ?? 0, 0.26903821885910784, accuracy: 1e-12)
        XCTAssertEqual(weights["chaos"] ?? 0, 0.365480890570446, accuracy: 1e-12)
        XCTAssertEqual(weights["bubble"] ?? 0, 0.365480890570446, accuracy: 1e-12)
        XCTAssertEqual(weights.values.reduce(0, +), 1, accuracy: 1e-9)
    }

    /// `coefs` tokens stay positional: a token without a numeric prefix is a
    /// NaN *in place*, so a corrupted string rejects its own transform (the
    /// first six coefficients must be finite) instead of silently shifting the
    /// affine map onto the surviving numbers.
    func testCoefsTokensStayPositional() {
        func frameCount(coefs: String) -> Int {
            let text = """
            <flames name="Coefs"><flame name="Coefs-001">
            <palette count="4">FF00000000FF00FF00</palette>
            <xform weight="1" color="0.1" spherical="1" coefs="\(coefs)"/>
            </flame></flames>
            """
            return FlameParser.parse(text).frames.count
        }
        XCTAssertEqual(frameCount(coefs: "oops 0.6 0 0 0 0.6 0.1"), 0, "NaN in the first six must reject the transform")
        XCTAssertEqual(frameCount(coefs: "0.6 nope 0 0 0 0.6 0.1 0.2"), 0)
        XCTAssertEqual(frameCount(coefs: "0.6 0 0 0 0.6 0.1 0.9"), 1, "Seven valid tokens keep the first six")
        // Whitespace beyond space/tab/newline still separates tokens — NBSP is
        // `\s` to the browser — so a frame is never silently lost.
        XCTAssertEqual(frameCount(coefs: "0.6\u{00A0}0\u{00A0}0\u{00A0}0\u{00A0}0.6\u{00A0}0.1"), 1)
    }

    /// Parameters are keyed by their full .flame attribute name — the
    /// vocabulary `FlameCurves` reads — and they actually reach the curves.
    func testParameterVocabularyIsTheFullAttributeName() {
        let text = """
        <flames name="Params">
        <flame name="Params-001">
        <palette count="4">
        FF0000
        00FF00
        0000FF
        FFFF00
        </palette>
        <xform weight="1" color="0.1" julian="1" julian_dist="-0.4" curl="0.2" curl_c1="0.7" rings2="0.6" rings2_val="0.4" rectangles="1" rectangles_x="2" rectangles_y="3" epispiral="1" epispiral_n="5" coefs="0.8 0 0 0 0.8 0"/>
        </flame>
        </flames>
        """
        let transform = try! XCTUnwrap(FlameParser.parse(text).frames.first?.transforms.first)
        XCTAssertEqual(transform.parameters, [
            "julian_dist": -0.4,
            "curl_c1": 0.7,
            "rings2_val": 0.4,
            "rectangles_x": 2,
            "rectangles_y": 3,
            "epispiral_n": 5
        ])
        XCTAssertNil(transform.parameters["val"], "The suffix after the first underscore is not the key")

        let warped = FlameCurves.apply("rings2", 0.4, 0.3, transform.parameters)
        let defaulted = FlameCurves.apply("rings2", 0.4, 0.3, [:])
        XCTAssertNotNil(warped)
        XCTAssertNotEqual(warped?.x, defaulted?.x, "rings2 must read rings2_val, not its default")
    }

    /// `<palette count="0">` means "unspecified" (the browser reads
    /// `count || 256`), so a file that declares 0 still decodes its entries.
    func testDeclaredPaletteCountZeroStillDecodesEntries() {
        let text = """
        <flames name="Zero">
        <flame name="Zero-001">
        <palette count="0">
        FF0000
        00FF00
        0000FF
        FFFF00
        </palette>
        <xform weight="1" color="0.1" spherical="1" coefs="0.8 0 0 0 0.8 0"/>
        </flame>
        </flames>
        """
        let frame = try! XCTUnwrap(FlameParser.parse(text).frames.first)
        XCTAssertEqual(frame.palette.at(0).red, 255)
        XCTAssertEqual(frame.palette.at(0).green, 0)
        XCTAssertEqual(frame.palette.at(1).green, 255)
        // The tail repeats the last decoded entry (documented divergence).
        XCTAssertEqual(frame.palette.at(4).red, 255)
        XCTAssertEqual(frame.palette.at(4).green, 255)
    }

    /// Deliberate divergence from `js/flame.js`, which drops a frame whose
    /// palette has no usable entries: this engine keeps the frame and renders
    /// it through the ice fallback, so an animation never loses a frame and a
    /// bake never comes out dark.
    func testFrameWithUnusablePaletteIsKeptAndRendersIce() {
        let text = """
        <flames name="NoPalette">
        <flame name="NoPalette-001">
        <palette count="8">ZZZZ</palette>
        <xform weight="1" color="0.1" spherical="1" coefs="0.8 0 0 0 0.8 0"/>
        </flame>
        </flames>
        """
        let frame = try! XCTUnwrap(FlameParser.parse(text).frames.first)
        XCTAssertEqual(frame.palette, FlamePalette.iceFallback)
    }

    /// The bundled films carry Apophysis parameters (`rings2_val`) that the
    /// suffix-keyed parser used to drop — the curves must receive them.
    func testBundledFilmParametersReachTheCurves() {
        guard let inner = FlameFilm.bundled(role: .inner) else {
            XCTFail("Demo.flame must load from package resources")
            return
        }
        let rings2 = inner.document.frames.first?.transforms.first { transform in
            transform.curves.contains { $0.name == "rings2" }
        }
        let transform = try! XCTUnwrap(rings2)
        XCTAssertEqual(transform.parameters["rings2_val"] ?? 0, 0.35, accuracy: 1e-12)
    }

    /// The scanner matches the document's *shape*, never its content: regex
    /// metacharacters inside `.flame` values (`$`, `|`, `(`, `)`, `[`, `]`) are
    /// ordinary data. This pins the switch from regex literals to compiled
    /// patterns — nothing may re-interpret a value as syntax.
    func testAttributeValuesWithRegexMetacharactersAreLiteralData() {
        let text = """
        <flames name="Meta$1">
        <flame name="Meta$1-001" version="a|b(c)[d]">
        <palette count="4">FF0000</palette>
        <xform weight="1" color="0.1" spherical="1" coefs="0.8 0 0 0 0.8 0"/>
        </flame>
        </flames>
        """
        let document = FlameParser.parse(text)
        XCTAssertEqual(document.rootName, "Meta$1")
        XCTAssertEqual(document.frames.count, 1)
        XCTAssertEqual(document.frames.first?.name, "Meta$1-001")
        XCTAssertEqual(document.frames.first?.version, "a|b(c)[d]")
    }

    func testLenientParserSkipsBrokenFrames() {
        let broken = sampleText + "\n<flame name=\"broken\"><palette count=\"8\">ZZZZ</palette><xform weight=\"1\" coefs=\"bad\"></flame>"
        let document = FlameParser.parse(broken)
        XCTAssertEqual(document.frames.count, 1, "The malformed frame must be skipped, never fatal")
    }

    func testEmptyAndGarbageInputsAreSafe() {
        XCTAssertEqual(FlameParser.parse("").frames.count, 0)
        XCTAssertEqual(FlameParser.parse("not a flame at all").frames.count, 0)
    }

    func testPaletteFallbackNeverDark() {
        let fallback = FlamePalette.iceFallback
        let sample = fallback.at(255)
        XCTAssertGreaterThan(sample.red, 200)
        XCTAssertGreaterThan(sample.green, 200)
        XCTAssertGreaterThan(sample.blue, 200)
    }

    func testBakeIsDeterministicAndProducesLitPixels() {
        let frame = try! XCTUnwrap(FlameParser.parse(sampleText).frames.first)
        var options = FlameEngine.Options(size: 96, points: 4_000, iterations: 20, warmup: 6)
        options.seed = 7919
        let first = FlameEngine.bake(frame: frame, options: options)
        options.seed = 7919
        let second = FlameEngine.bake(frame: frame, options: options)
        XCTAssertEqual(first, second, "Identical seeds must produce identical buffers")

        let lit = first.pixels.filter { $0 > 12 }.count
        XCTAssertGreaterThan(lit, 200, "A bake of a valid frame must light part of the canvas")
        XCTAssertEqual(first.pixels.count, first.width * first.height * 3)
    }

    func testKnownCurveLibraryResolvesAllParserCurves() {
        for name in ["linear", "polar", "unpolar", "julian", "spiral", "whorl", "curl",
                     "rings2", "sinusoidal", "spherical", "disc", "hyperbolic",
                     "epispiral", "rectangles", "flatten", "bipolar"] {
            XCTAssertNotNil(FlameCurves.apply(name, 0.3, -0.4, [:]), "\(name) must resolve")
        }
        XCTAssertNil(FlameCurves.apply("unknown_warp", 0.3, -0.4, [:]))
        XCTAssertEqual(FlameCurves.knownNames.count, 16)
    }

    func testFilmPingPongClock() {
        var document = FlameDocument(rootName: "clock", frames: [])
        let base = FlameParser.parse(sampleText).frames[0]
        document.frames = Array(repeating: base, count: 5)
        let film = FlameFilm(role: .inner, document: document, framesPerSecond: 10, bundledFileName: "test.flame")

        XCTAssertEqual(film.frameIndex(at: 0), 0)
        XCTAssertEqual(film.frameIndex(at: 0.5), 3, "t·fps = 5 → period 8 → pos 5 bounces to 3")
        XCTAssertEqual(film.frameIndex(at: 1.6), 0, "Full period wraps exactly to 0")
        XCTAssertEqual(film.frameIndex(at: 3.2), 0, "Two periods wrap exactly to 0")
        XCTAssertEqual(film.frameIndex(at: -0.2), film.frameIndex(at: 3.4), "Negative time wraps deterministically")
    }

    func testBundledFilmsLoadAndFrameCountsMatchSource() {
        guard let inner = FlameFilm.bundled(role: .inner), let outer = FlameFilm.bundled(role: .outer) else {
            XCTFail("Both bundled .flame films must load from package resources")
            return
        }
        XCTAssertEqual(inner.role, .inner)
        XCTAssertEqual(inner.document.rootName, "Demo")
        XCTAssertEqual(inner.frameCount, 120, "Demo.flame ships 120 animated frames")
        XCTAssertEqual(outer.role, .outer)
        XCTAssertEqual(outer.document.rootName, "OuterOrb")
        XCTAssertEqual(outer.frameCount, 600, "OuterOrb.flame ships 600 animated frames")
        XCTAssertGreaterThan(inner.framesPerSecond, 0)
        XCTAssertGreaterThan(outer.framesPerSecond, 0)
    }
}
