import Foundation

/// The bundled `.flame` films and their playback clocks.
///
/// **The Orb is powered by two fractal flame engines:**
///
/// - **Inner** — `Demo.flame`, the author's 120-frame core system driving the
///   attractor at The Orb's center (the AI Inner Shell core), 12 fps.
/// - **Outer** — `OuterOrb.flame`, the 600-frame macro-orbital system driving
///   the moving orbs, outer depth shells, and gold nodes, 24 fps.
///
/// Playback is the honest maximum of the source renders: a hard ping-pong
/// bounce (`0 → last → 0`) with pure-clock framing — `frameAt(t)` has no
/// accumulated state and cannot drift. A frame index beyond a file's own
/// count wraps within that file; the two films never claim to be one render.
public struct FlameFilm: Sendable, Equatable {
    public enum Role: String, Sendable, CaseIterable {
        case inner
        case outer
    }

    public let role: Role
    public let document: FlameDocument
    public let framesPerSecond: Double
    public let bundledFileName: String

    public init(role: Role, document: FlameDocument, framesPerSecond: Double, bundledFileName: String) {
        self.role = role
        self.document = document
        self.framesPerSecond = framesPerSecond > 0 && framesPerSecond.isFinite ? framesPerSecond : 12
        self.bundledFileName = bundledFileName
    }

    public var frameCount: Int {
        document.frames.count
    }

    /// Ping-pong bounce index at time `t` seconds: `0 → last → 0`.
    public func frameIndex(at time: TimeInterval) -> Int {
        guard frameCount > 1 else { return 0 }
        let period = 2 * Double(frameCount - 1)
        let raw = (time * framesPerSecond).truncatingRemainder(dividingBy: period)
        let bounded = raw < 0 ? raw + period : raw
        let bounce = bounded < Double(frameCount - 1) ? bounded : period - bounded
        return min(frameCount - 1, max(0, Int(bounce.rounded(.down))))
    }

    /// Load the bundled document for a role. Each role maps to exactly one
    /// bundled file; a missing or unreadable file returns `nil` and the
    /// surface must stay visibly off — never substituted with a fake render.
    public static func bundled(role: Role) -> FlameFilm? {
        switch role {
        case .inner:
            return Self.load(role: role, fileName: "Demo.flame", framesPerSecond: 12)
        case .outer:
            return Self.load(role: role, fileName: "OuterOrb.flame", framesPerSecond: 24)
        }
    }

    private static func load(role: Role, fileName: String, framesPerSecond: Double) -> FlameFilm? {
        guard let url = Bundle.module.url(forResource: fileName.replacingOccurrences(of: ".flame", with: ""), withExtension: "flame"),
              let text = try? String(contentsOf: url, encoding: .utf8) else {
            return nil
        }
        let document = FlameParser.parse(text)
        guard !document.frames.isEmpty else { return nil }
        return FlameFilm(role: role, document: document, framesPerSecond: framesPerSecond, bundledFileName: fileName)
    }
}
