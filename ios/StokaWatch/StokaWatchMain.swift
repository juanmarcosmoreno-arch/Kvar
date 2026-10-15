import SwiftUI

/// App de Stoka para Apple Watch: la lista de compras en la muñeca y «¿Se terminó algo?» con un toque.
@main
struct StokaWatchMain: App {
    @StateObject private var store = WatchStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
                .tint(Color(red: 0.36, green: 0.73, blue: 0.48))
        }
    }
}
