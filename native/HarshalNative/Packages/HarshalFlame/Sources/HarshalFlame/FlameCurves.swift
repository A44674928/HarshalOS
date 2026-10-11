import Foundation

/// The canonical Apophysix curve-warp library, ported one-for-one from
/// `js/flame.js` (which itself documents each map).
///
/// Each warp maps `(x, y, parameters) → (x', y')`. Curve names that are not in
/// this library fold into the affine term (identity warp) while their weight
/// still participates in the convex blend — the IFS stays exactly as weighted.
public enum FlameCurves {
    public static let knownNames: Set<String> = [
        "linear", "polar", "unpolar", "julian", "spiral", "whorl", "curl",
        "rings2", "sinusoidal", "spherical", "disc", "hyperbolic",
        "epispiral", "rectangles", "flatten", "bipolar"
    ]

    /// Resolve a curve by name; `nil` folds into the affine term.
    public static func apply(
        _ name: String,
        _ x: Double,
        _ y: Double,
        _ parameters: [String: Double]
    ) -> (x: Double, y: Double)? {
        switch name {
        case "linear":
            return (x, y)
        case "polar":
            let r = (x * x + y * y).squareRoot()
            return (r, atan2(y, x))
        case "unpolar":
            return (x * cos(y), x * sin(y))
        case "julian":
            // z² projected onto the unit circle — the julian circle map.
            let dist = parameters["julian_dist"] ?? 0
            let zy = y - (dist.isFinite ? dist : 0)
            let wx = x * x - zy * zy
            let wy = 2 * x * zy
            let m = (wx * wx + wy * wy).squareRoot()
            if m < 1e-9 { return (0, 0) }
            return (wx / m, wy / m)
        case "spiral":
            // θ ← θ + k·r — radius-proportional swirl.
            let r = (x * x + y * y).squareRoot()
            let th = atan2(y, x) + 1.6 * r
            return (r * cos(th), r * sin(th))
        case "whorl":
            let r = (x * x + y * y).squareRoot()
            let th = atan2(y, x) + 1.2 / (0.3 + r)
            return (r * cos(th), r * sin(th))
        case "curl":
            let k = finite(parameters["c1"]) ?? 2
            let r = (x * x + y * y).squareRoot()
            let th = atan2(y, x) + k / (1 + r)
            return (r * cos(th), r * sin(th))
        case "rings2":
            // Angular ripple r ← r(1 + v·sin 6θ).
            let v = finite(parameters["rings2_val"]) ?? 0.5
            let r = (x * x + y * y).squareRoot()
            let th = atan2(y, x)
            let rr = r * (1 + v * sin(6 * th))
            return (rr * cos(th), rr * sin(th))
        case "sinusoidal":
            // x ← x + ε·sin 2πy
            return (x + 0.32 * sin(6.283185307179586 * y), y)
        case "spherical":
            // p ← p / √(1+|p|²) — bounded spherical falloff.
            let k = 1 / (1 + x * x + y * y).squareRoot()
            return (x * k, y * k)
        case "disc":
            // Möbius projection into the unit disc.
            let k = 2 / (1 + x * x + y * y)
            return (x * k, y * k)
        case "hyperbolic":
            // Complex inversion 1/z.
            let m2 = x * x + y * y
            if m2 < 1e-12 { return (0, 0) }
            return (x / m2, -y / m2)
        case "epispiral":
            // Epispiral / epicycloid, n cusps: (n+1)e^{it} − e^{i(n+1)t}.
            let n = finite(parameters["epispiral_n"]) ?? 3
            let r = (x * x + y * y).squareRoot()
            let th = atan2(y, x)
            let k = n + 1
            let s = 0.6 / k
            return (s * (k * cos(th) - cos(k * th)), s * (k * sin(th) - sin(k * th)))
        case "rectangles":
            // Symmetric triangle fold (kaleidoscope) with period 2k.
            let kx = finite(parameters["rectangles_x"]) ?? 1
            let ky = finite(parameters["rectangles_y"]) ?? 1
            var fx = (x / kx).truncatingRemainder(dividingBy: 2)
            var fy = (y / ky).truncatingRemainder(dividingBy: 2)
            if fx < 0 { fx += 2 }
            if fy < 0 { fy += 2 }
            return (kx * (1 - abs(1 - fx)), ky * (1 - abs(1 - fy)))
        case "flatten":
            // Soft vertical squash.
            return (x, tanh(y) * 0.9)
        case "bipolar":
            // Bipolar lobe map.
            let m2 = x * x + y * y + 0.5
            return (1.2 * x / m2, 1.2 * y / m2)
        default:
            return nil
        }
    }

    private static func finite(_ value: Double?) -> Double? {
        guard let value, value.isFinite else { return nil }
        return value
    }
}

/// Deterministic mulberry32 PRNG — bit-identical to the browser engine's, so
/// a seeded native bake reproduces the same attractor sample sequence.
public struct Mulberry32: RandomNumberGenerator, Sendable {
    private var state: UInt32

    public init(seed: Int) {
        state = UInt32(truncatingIfNeeded: seed)
    }

    public mutating func next() -> UInt64 {
        UInt64(step())
    }

    /// The engine's canonical draw in `[0, 1)` — exactly one PRNG step,
    /// `uint32 / 2³²`, matching `mulberry32(seed)()` in `js/flame.js`.
    public mutating func draw() -> Double {
        Double(step()) / 4_294_967_296.0
    }

    private mutating func step() -> UInt32 {
        state = state &+ 0x6D2B79F5
        var t = (state ^ (state >> 15)) &* (1 | state)
        t = (t &+ ((t ^ (t >> 7)) &* (61 | t))) ^ t
        return t ^ (t >> 14)
    }
}
