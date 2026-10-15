import SwiftUI

/// App de Stoka para Apple Watch: la lista de compras en la muñeca y «¿Se terminó algo?» con un toque.
@main
struct StokaWatchMain: App {
    @StateObject private var store = WatchStore()
    @AppStorage("introVisto") private var introSeen = false

    var body: some Scene {
        WindowGroup {
            ZStack {
                RootView()
                    .environmentObject(store)
                    .tint(Color(red: 0.36, green: 0.73, blue: 0.48))
                if !introSeen {
                    IntroView { introSeen = true }
                        .transition(.opacity)
                }
            }
        }
    }
}
