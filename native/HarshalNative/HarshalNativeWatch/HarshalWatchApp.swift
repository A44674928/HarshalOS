import SwiftUI

@main
struct HarshalWatchApp: App {
    @State private var link = WatchPhoneLink()

    var body: some Scene {
        WindowGroup {
            WatchGateWatchView()
                .environment(link)
                .task {
                    link.activate()
                }
        }
    }
}
