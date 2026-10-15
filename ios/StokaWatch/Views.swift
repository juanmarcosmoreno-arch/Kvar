import Combine
import SwiftUI

struct RootView: View {
    @EnvironmentObject var store: WatchStore

    var body: some View {
        switch store.phase {
        case .needsPhone:
            Message(icon: "iphone", text: L10n.openPhone)
        case .connecting:
            ProgressView(L10n.connecting)
        case .failed(let message):
            VStack(spacing: 8) {
                Message(icon: "exclamationmark.triangle", text: message)
                Button(L10n.retry) { Task { await store.connect() } }
            }
        case .ready:
            TabView {
                ShoppingListView()
                RanOutView()
            }
            .tabViewStyle(.verticalPage)
        }
    }
}

struct Message: View {
    let icon: String
    let text: String
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon).font(.title2)
            Text(text).font(.footnote).multilineTextAlignment(.center)
        }
        .padding()
    }
}

/// La lista de compras: tocar = comprado (pasa a «Hay»).
struct ShoppingListView: View {
    @EnvironmentObject var store: WatchStore
    @State private var adding = false
    @State private var newItem = ""

    var body: some View {
        NavigationStack {
            List {
                if store.items.isEmpty {
                    Text(L10n.nothingMissing).foregroundStyle(.secondary)
                }
                ForEach(store.items) { item in
                    Button {
                        Task { await store.buy(item) }
                    } label: {
                        HStack {
                            Image(systemName: "circle")
                            VStack(alignment: .leading) {
                                Text(item.title).lineLimit(2)
                                if item.reason == "out" {
                                    Text(L10n.out).font(.caption2).foregroundStyle(.red)
                                } else if item.reason == "low" {
                                    Text(L10n.low).font(.caption2).foregroundStyle(.orange)
                                }
                            }
                            Spacer()
                            if let q = item.quantity, q > 1 { Text("×\(q)").foregroundStyle(.secondary) }
                        }
                    }
                }
                TextField(L10n.addPlaceholder, text: $newItem)
                    .onSubmit {
                        let text = newItem
                        newItem = ""
                        Task { await store.add(text) }
                    }
            }
            .navigationTitle(L10n.list)
            .refreshable { await store.reload() }
        }
        .task { await store.reload() }
    }
}

/// «¿Se terminó algo?»: un toque y va a la lista. Los básicos primero.
struct RanOutView: View {
    @EnvironmentObject var store: WatchStore

    private var candidates: [Product] {
        store.products
            .filter { $0.status != "out" }
            .sorted { ($0.is_staple ? 0 : 1, $0.name) < ($1.is_staple ? 0 : 1, $1.name) }
    }

    var body: some View {
        NavigationStack {
            List(candidates) { product in
                Button {
                    Task { await store.ranOut(product) }
                } label: {
                    HStack {
                        Text(product.name).lineLimit(2)
                        Spacer()
                        if product.status == "low" {
                            Circle().fill(.orange).frame(width: 8, height: 8)
                        }
                    }
                }
            }
            .navigationTitle(L10n.ranOut)
            .refreshable { await store.reload() }
        }
    }
}
