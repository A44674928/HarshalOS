import Foundation

/// The fractal flame bake engine — a faithful Swift port of the browser IFS
/// interpreter in `js/flame.js`.
///
/// Points are streamed through the IFS
///
///     p_{j+1} = T_{k_j}(p_j),   k_j ~ geometric(weights)
///
/// and every post-warmup iteration splats the transform's palette color into
/// an accumulation buffer with the classic Apophysis 3×3 soft falloff
/// (4 2 1 / 2 8 2 / 1 2 1 over 16). The final pixel is
///
///     v = (acc / max) · brightness
///     F(v) = v < γ_thr ? 0 : 255 · v^(1/γ)
///
/// Everything is deterministic: the same document, options, and seed always
/// bake to the same buffer, on any device, in any order of calls.
public enum FlameEngine {
    public struct Options: Sendable, Equatable {
        /// Bake resolution in pixels (square).
        public var size: Int
        /// Number of starting points streamed through the system.
        public var points: Int
        /// Iterations per starting point.
        public var iterations: Int
        /// Warmup iterations skipped before splatting.
        public var warmup: Int
        /// Auto-framing padding — the attractor core spans 1/pad of the canvas.
        public var padding: Double
        /// PRNG seed for the point stream.
        public var seed: Int
        /// Extra brightness multiplier over the frame's own `brightness`.
        public var exposure: Double

        public init(
            size: Int = 160,
            points: Int = 45_000,
            iterations: Int = 24,
            warmup: Int = 8,
            padding: Double = 1.7,
            seed: Int = 7_919,
            exposure: Double = 1.0
        ) {
            self.size = max(16, size)
            self.points = max(1, points)
            self.iterations = max(4, iterations)
            self.warmup = max(0, warmup)
            self.padding = padding > 0 && padding.isFinite ? padding : 1.7
            self.seed = seed
            self.exposure = exposure.isFinite && exposure > 0 ? exposure : 1.0
        }

        public static let inner = Options(size: 200, points: 46_000, iterations: 24, warmup: 8, padding: 1.7, seed: 7_919)
        public static let outer = Options(size: 200, points: 60_000, iterations: 26, warmup: 10, padding: 2.1, seed: 424_242)
    }

    /// An sRGB byte buffer, row-major, 3 bytes per pixel, black background —
    /// premultiplied-onto-black like the site, so SwiftUI's plusLighter
    /// compositing is mathematically the same "lighter" blend.
    public struct Buffer: Sendable, Equatable {
        public let width: Int
        public let height: Int
        public let pixels: [UInt8]

        public init(width: Int, height: Int, pixels: [UInt8]) {
            self.width = width
            self.height = height
            self.pixels = pixels
        }

        public static let empty = Buffer(width: 0, height: 0, pixels: [])
    }

    /// Robust attractor auto-framing: a deterministic trajectory trace samples
    /// the limit set, and the camera maps the 2nd–98th percentile core onto
    /// the canvas — resistant to the escape tails of expansive transforms.
    public static func camera(frame: FlameFrame, samples: Int = 800, depth: Int = 24, padding: Double) -> Camera {
        let transforms = frame.transforms
        let count = transforms.count
        var cumulative = [Double](repeating: 0, count: count)
        var total = 0.0
        for (index, transform) in transforms.enumerated() {
            total += transform.weight
            cumulative[index] = total
        }
        guard total > 0 else {
            return Camera(centerX: 0, centerY: 0, span: 0.5, isDegenerate: true)
        }

        var random = Mulberry32(seed: 424_242)
        var xs: [Double] = []
        var ys: [Double] = []
        xs.reserveCapacity(samples * depth)
        ys.reserveCapacity(samples * depth)

        for _ in 0..<samples {
            var x = (random.draw() * 2 - 1) * 1.8
            var y = (random.draw() * 2 - 1) * 1.8
            for iteration in 0..<depth {
                let transform = pickTransform(transforms, cumulative: cumulative, total: total, random: &random)
                let (ax, ay) = transform.affine(x, y)
                var nx = ax
                var ny = ay
                if !transform.curves.isEmpty {
                    nx = 0
                    ny = 0
                    for curve in transform.curves {
                        if let warped = FlameCurves.apply(curve.name, ax, ay, transform.parameters) {
                            nx += curve.weight * warped.x
                            ny += curve.weight * warped.y
                        } else {
                            nx += curve.weight * ax
                            ny += curve.weight * ay
                        }
                    }
                }
                x = nx
                y = ny
                if iteration < 8 || !x.isFinite || !y.isFinite || abs(x) > 1e3 || abs(y) > 1e3 {
                    continue
                }
                xs.append(x)
                ys.append(y)
            }
        }

        guard xs.count >= 64 else {
            return Camera(centerX: 0, centerY: 0, span: 0.5, isDegenerate: true)
        }
        xs.sort()
        ys.sort()
        let x0 = quantile(xs, 0.02)
        let x1 = quantile(xs, 0.98)
        let y0 = quantile(ys, 0.02)
        let y1 = quantile(ys, 0.98)
        let centerX = (x0 + x1) / 2
        let centerY = (y0 + y1) / 2
        var span = max(x1 - x0, y1 - y0)
        if !(span > 1e-4) { span = 0.5 }
        return Camera(centerX: centerX, centerY: centerY, span: span, isDegenerate: false)
    }

    public struct Camera: Sendable, Equatable {
        public let centerX: Double
        public let centerY: Double
        public let span: Double
        public let isDegenerate: Bool
    }

    /// Bake one animation frame into an sRGB byte buffer.
    public static func bake(frame: FlameFrame, options: Options = Options()) -> Buffer {
        let width = options.size
        let height = options.size
        let transforms = frame.transforms
        guard !transforms.isEmpty else {
            return Buffer(width: width, height: height, pixels: [UInt8](repeating: 0, count: width * height * 3))
        }

        var cumulative = [Double](repeating: 0, count: transforms.count)
        var total = 0.0
        for (index, transform) in transforms.enumerated() {
            total += transform.weight
            cumulative[index] = total
        }

        let camera = Self.camera(frame: frame, padding: options.padding)
        let scale = camera.isDegenerate ? (Double(width) / 2) / 0.5 : (Double(width) / 2) / (camera.span / 2 * options.padding)
        let halfWidth = Double(width) / 2
        let halfHeight = Double(height) / 2

        var accumulation = [Float](repeating: 0, count: width * height * 3)
        var random = Mulberry32(seed: options.seed)

        for _ in 0..<options.points {
            var x = (random.draw() * 2 - 1) * 1.8
            var y = (random.draw() * 2 - 1) * 1.8
            for iteration in 0..<options.iterations {
                let transform = pickTransform(transforms, cumulative: cumulative, total: total, random: &random)
                let (ax, ay) = transform.affine(x, y)
                var nx = ax
                var ny = ay
                if !transform.curves.isEmpty {
                    nx = 0
                    ny = 0
                    for curve in transform.curves {
                        if let warped = FlameCurves.apply(curve.name, ax, ay, transform.parameters) {
                            nx += curve.weight * warped.x
                            ny += curve.weight * warped.y
                        } else {
                            nx += curve.weight * ax
                            ny += curve.weight * ay
                        }
                    }
                }
                x = nx
                y = ny
                if !x.isFinite || !y.isFinite || abs(x) > 1e4 || abs(y) > 1e4 {
                    // Diverged → respawn (classic IFS escape guard).
                    x = (random.draw() * 2 - 1) * 1.8
                    y = (random.draw() * 2 - 1) * 1.8
                    continue
                }
                if iteration < options.warmup { continue }

                let px = (x - camera.centerX) * scale + halfWidth
                let py = (y - camera.centerY) * scale + halfHeight
                let color = frame.palette.at(transform.paletteIndex)
                let baseRed = Double(color.red)
                let baseGreen = Double(color.green)
                let baseBlue = Double(color.blue)

                // 3×3 soft draw — classic Apophysis falloff. Row/column
                // truncate the offset position itself, matching `(py+dy)|0`.
                for dy in -1...1 {
                    let row = Int(py + Double(dy))
                    guard row >= 0, row < height else { continue }
                    for dx in -1...1 {
                        let column = Int(px + Double(dx))
                        guard column >= 0, column < width else { continue }
                        let weight = Double(dx == 0 ? (dy == 0 ? 4 : 2) : (dy == 0 ? 2 : 1)) / 16
                        let offset = (row * width + column) * 3
                        accumulation[offset] += Float(baseRed * weight)
                        accumulation[offset + 1] += Float(baseGreen * weight)
                        accumulation[offset + 2] += Float(baseBlue * weight)
                    }
                }
            }
        }

        // Finalize: normalize · brightness · gamma · threshold.
        var maximum: Float = 0
        for index in stride(from: 0, to: accumulation.count, by: 3) {
            let red = accumulation[index]
            let green = accumulation[index + 1]
            let blue = accumulation[index + 2]
            let largest = max(red, max(green, blue))
            if largest > maximum { maximum = largest }
        }

        var pixels = [UInt8](repeating: 0, count: width * height * 3)
        if maximum > 0 {
            let brightness = frame.brightness.isFinite && frame.brightness > 0 ? frame.brightness : 4
            let gamma = frame.gamma.isFinite && frame.gamma > 0 ? frame.gamma : 4
            let threshold = frame.gammaThreshold.isFinite ? frame.gammaThreshold : 0.01
            let gain = brightness * options.exposure
            let inverseGamma = 1 / gamma
            for index in 0..<pixels.count {
                let v = Double(accumulation[index] / maximum) * gain
                if v >= threshold {
                    pixels[index] = UInt8((255 * pow(v, inverseGamma)).rounded().clamped(to: 0...255))
                }
            }
        }
        return Buffer(width: width, height: height, pixels: pixels)
    }

    private static func pickTransform(
        _ transforms: [FlameTransform],
        cumulative: [Double],
        total: Double,
        random: inout Mulberry32
    ) -> FlameTransform {
        let draw = random.draw() * total
        var index = 0
        while index < transforms.count - 1, draw > cumulative[index] {
            index += 1
        }
        return transforms[index]
    }

    private static func quantile(_ sorted: [Double], _ q: Double) -> Double {
        let index = Int((Double(sorted.count - 1) * q).rounded())
        return sorted[min(max(index, 0), sorted.count - 1)]
    }
}

private extension Comparable {
    func clamped(to range: ClosedRange<Self>) -> Self {
        min(max(self, range.lowerBound), range.upperBound)
    }
}
