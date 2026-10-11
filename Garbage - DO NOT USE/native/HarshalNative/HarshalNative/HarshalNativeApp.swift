import SwiftUI

@main
struct HarshalNativeApp: App {
    @State private var appModel = AppModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(appModel)
                .harshalAppTheme()
                .task {
                    await appModel.bootstrap()
                }
        }
    }
}
