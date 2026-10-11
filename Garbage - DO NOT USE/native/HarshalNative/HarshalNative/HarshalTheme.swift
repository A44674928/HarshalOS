import SwiftUI

/// The native HarshalOS visual system: an OLED-friendly black field with
/// accessible electric-blue text and controls. Semantic warning/error colors
/// remain distinct so a color theme never hides an important app state.
enum HarshalTheme {
    static let canvas = Color.black
    static let surface = Color(red: 0.012, green: 0.031, blue: 0.071)
    static let elevatedSurface = Color(red: 0.020, green: 0.075, blue: 0.145)
    static let panelStroke = Color(red: 0.065, green: 0.420, blue: 0.690)

    static let electricBlue = Color(red: 0.000, green: 0.690, blue: 1.000)
    static let primaryText = Color(red: 0.500, green: 0.860, blue: 1.000)
    static let secondaryText = Color(red: 0.330, green: 0.630, blue: 0.850)
    static let mutedText = Color(red: 0.220, green: 0.440, blue: 0.620)

    static let verified = Color(red: 0.220, green: 0.920, blue: 0.940)
    static let warning = Color(red: 1.000, green: 0.680, blue: 0.170)
    static let destructive = Color(red: 1.000, green: 0.350, blue: 0.420)
}

private struct HarshalGroupBoxStyle: GroupBoxStyle {
    func makeBody(configuration: Configuration) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            configuration.label
                .font(.headline)
                .foregroundStyle(HarshalTheme.electricBlue)
            configuration.content
        }
        .padding()
        .background(
            HarshalTheme.surface,
            in: RoundedRectangle(cornerRadius: 16, style: .continuous)
        )
        .overlay {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(HarshalTheme.panelStroke.opacity(0.65), lineWidth: 1)
        }
    }
}

private struct HarshalAppThemeModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .preferredColorScheme(.dark)
            .tint(HarshalTheme.electricBlue)
            .foregroundStyle(HarshalTheme.primaryText)
            .groupBoxStyle(HarshalGroupBoxStyle())
            .background(HarshalTheme.canvas.ignoresSafeArea())
    }
}

extension View {
    func harshalAppTheme() -> some View {
        modifier(HarshalAppThemeModifier())
    }

    func harshalPanel(cornerRadius: CGFloat = 16) -> some View {
        background(
            HarshalTheme.surface,
            in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
        )
        .overlay {
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .stroke(HarshalTheme.panelStroke.opacity(0.65), lineWidth: 1)
        }
    }
}
