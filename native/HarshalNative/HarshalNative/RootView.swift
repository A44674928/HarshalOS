import SwiftUI

struct RootView: View {
    @Environment(AppModel.self) private var appModel

    var body: some View {
        ZStack {
            HarshalTheme.canvas.ignoresSafeArea()

            Group {
                if appModel.declaration == nil {
                    OnboardingFlowView()
                } else {
                    DashboardView()
                }
            }
        }
        .alert(
            "Harshal Native",
            isPresented: Binding(
                get: { appModel.errorMessage != nil },
                set: { isPresented in
                    if !isPresented { appModel.errorMessage = nil }
                }
            ),
            actions: {
                Button("OK", role: .cancel) { appModel.errorMessage = nil }
            },
            message: {
                Text(appModel.errorMessage ?? "")
            }
        )
    }
}
