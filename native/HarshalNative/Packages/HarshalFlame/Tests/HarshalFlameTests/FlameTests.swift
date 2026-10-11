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
