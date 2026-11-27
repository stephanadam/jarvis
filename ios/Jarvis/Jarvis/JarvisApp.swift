import SwiftUI

@main
struct JarvisApp: App {
    @StateObject private var session = JarvisSession()

    var body: some Scene {
        WindowGroup {
            TalkView()
                .environmentObject(session)
                .preferredColorScheme(.dark)
        }
    }
}
