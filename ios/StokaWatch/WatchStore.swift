import Combine
import Foundation
import SwiftUI
import WatchKit

struct ListItem: Decodable, Identifiable, Equatable {
    let id: String
    let name: String?
    let quantity: Int?
    let product_id: String?
    let reason: String
    let products: ProductInfo?
    struct ProductInfo: Decodable, Equatable {
        let name: String
        let category_id: String?
    }
    var title: String { products?.name ?? name ?? L10n.product }
}

struct Product: Decodable, Identifiable, Equatable {
    let id: String
    let name: String
    let status: String
    let is_staple: Bool
    let track_quantity: Bool
    let quantity: Int?
    let category_id: String?
}

struct Category: Decodable {
    let id: String
    let sort_order: Int
}

/// Lo tachado en esta compra (para deshacer con un toque)
struct CartEntry: Identifiable, Equatable {
    let item: ListItem
    /// true = solo se tachó (sin tocar el stock)
    let onlyChecked: Bool
    var id: String { item.id }
}

@MainActor
final class WatchStore: ObservableObject {
    enum Phase: Equatable { case needsPhone, connecting, ready, failed(String) }

    @Published var phase: Phase = .needsPhone
    @Published var items: [ListItem] = []
    @Published var cart: [CartEntry] = []
    @Published var products: [Product] = []
    @Published var householdName = ""

    private var config: WatchConfig?
    private var api: SupabaseREST?
    private var categoryOrder: [String: Int] = [:]
    private static let joinedKey = "stoka.watch.joinedHousehold"

    init() {
        PhoneLink.shared.onConfig = { [weak self] config in
            Task { @MainActor in self?.configure(config) }
        }
        PhoneLink.shared.activate()
        if let saved = WatchConfig.load() { configure(saved) }
    }

    /// «Solo tachar» (lo eligen en Ajustes del iPhone)
    var onlyCheck: Bool { config?.tickMode == "check" }

    func configure(_ newConfig: WatchConfig) {
        let connectionChanged = newConfig.connection != config?.connection
        config = newConfig
        newConfig.save()
        householdName = newConfig.householdName
        if connectionChanged || api == nil {
            api = SupabaseREST(url: newConfig.supabaseUrl, key: newConfig.supabaseKey)
            Task { await connect() }
        } else {
            items = sorted(items) // cambió el recorrido del súper o el modo de tachar
        }
    }

    /// El reloj entra como un miembro más del hogar, con el código de invitación.
    func connect() async {
        guard let config, let api else { phase = .needsPhone; return }
        if phase != .ready { phase = .connecting }
        do {
            if !(await api.hasSession) { try await api.signUpAnonymously() }
            if UserDefaults.standard.string(forKey: Self.joinedKey) != config.householdId {
                let name = config.memberName.isEmpty ? L10n.watch : L10n.watchOf(config.memberName)
                _ = try await api.rpc("join_household", ["p_code": config.inviteCode, "p_display_name": name])
                UserDefaults.standard.set(config.householdId, forKey: Self.joinedKey)
            }
            try await refresh()
            phase = .ready
        } catch SupabaseREST.Failure.noSession {
            // La sesión venció del todo: se crea una nueva y se vuelve a entrar con el código
            UserDefaults.standard.removeObject(forKey: Self.joinedKey)
            phase = .failed(L10n.reconnecting)
            try? await Task.sleep(nanoseconds: 500_000_000)
            await connect()
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    func refresh() async throws {
        guard let config, let api else { return }
        let hh = "eq.\(config.householdId)"
        let itemsData = try await api.get("shopping_list_items", query: [
            URLQueryItem(name: "select", value: "id,name,quantity,product_id,reason,products(name,category_id)"),
            URLQueryItem(name: "household_id", value: hh),
            URLQueryItem(name: "checked_at", value: "is.null"),
        ])
        let productsData = try await api.get("products", query: [
            URLQueryItem(name: "select", value: "id,name,status,is_staple,track_quantity,quantity,category_id"),
            URLQueryItem(name: "household_id", value: hh),
            URLQueryItem(name: "order", value: "name"),
        ])
        let categoriesData = try await api.get("categories", query: [
            URLQueryItem(name: "select", value: "id,sort_order"),
            URLQueryItem(name: "household_id", value: hh),
        ])
        let decoder = JSONDecoder()
        let categories = try decoder.decode([Category].self, from: categoriesData)
        categoryOrder = Dictionary(categories.map { ($0.id, $0.sort_order) }, uniquingKeysWith: { a, _ in a })
        let open = try decoder.decode([ListItem].self, from: itemsData)
        // Lo que ya está en el carrito no vuelve a la lista (por si el servidor tarda en enterarse)
        let inCart = Set(cart.map(\.id))
        items = sorted(open.filter { !inCart.contains($0.id) })
        products = try decoder.decode([Product].self, from: productsData)
    }

    func reload() async {
        do { try await refresh() } catch { phase = .failed(error.localizedDescription) }
    }

    /// Para refrescar seguido en el súper: si falla (sin señal), no se sale de la pantalla
    func reloadQuietly() async {
        try? await refresh()
    }

    /// En el orden en que se recorre el súper (aprendido en el iPhone); si no, por categoría.
    private func sorted(_ list: [ListItem]) -> [ListItem] {
        let aisle = config?.aisle ?? [:]
        func key(_ item: ListItem) -> (Double, Int, String) {
            let category = item.products?.category_id
            let byProduct = item.product_id.flatMap { aisle["p:\($0)"] }
            let byCategory = category.flatMap { aisle["c:\($0)"] }
            let order = category.flatMap { categoryOrder[$0] } ?? 999
            return (byProduct ?? byCategory ?? 2, order, item.title.lowercased())
        }
        return list.sorted { key($0) < key($1) }
    }

    private var now: String { ISO8601DateFormatter().string(from: Date()) }
    private var eventId: String { UUID().uuidString.lowercased() }

    // MARK: - En el súper

    /// Tachar: según Ajustes del iPhone, pasa a «Hay» o solo se tacha.
    func tick(_ item: ListItem) async {
        guard let api else { return }
        let only = onlyCheck
        withAnimation {
            items.removeAll { $0.id == item.id }
            cart.insert(CartEntry(item: item, onlyChecked: only), at: 0)
        }
        WKInterfaceDevice.current().play(.click)
        do {
            if only {
                _ = try await api.patch("shopping_list_items", query: [URLQueryItem(name: "id", value: "eq.\(item.id)")],
                                        body: ["checked_at": now])
            } else {
                _ = try await api.rpc("purchase_list_item", ["p_item_id": item.id, "p_event_id": eventId, "p_client_time": now])
            }
            if items.isEmpty { WKInterfaceDevice.current().play(.success) }
        } catch {
            WKInterfaceDevice.current().play(.failure)
            withAnimation { cart.removeAll { $0.id == item.id } }
            await reloadQuietly()
        }
    }

    /// Deshacer un tachado (vuelve a la lista).
    func untick(_ entry: CartEntry) async {
        guard let api else { return }
        withAnimation {
            cart.removeAll { $0.id == entry.id }
            items = sorted(items + [entry.item])
        }
        do {
            if entry.onlyChecked {
                _ = try await api.patch("shopping_list_items", query: [URLQueryItem(name: "id", value: "eq.\(entry.item.id)")],
                                        body: ["checked_at": NSNull()])
            } else {
                _ = try await api.rpc("unpurchase_list_item", ["p_item_id": entry.item.id])
            }
        } catch {
            WKInterfaceDevice.current().play(.failure)
        }
        await reloadQuietly()
    }

    func clearCart() {
        cart.removeAll()
    }

    // MARK: - «¿Se terminó?» y voz

    /// «Se terminó»: pasa a «No hay» y va a la lista.
    func ranOut(_ product: Product) async {
        guard let api else { return }
        WKInterfaceDevice.current().play(.success)
        do {
            _ = try await api.rpc("set_product_status", [
                "p_product_id": product.id, "p_status": "out", "p_source": "quick_out",
                "p_event_id": eventId, "p_client_time": now,
            ])
            await reload()
        } catch {
            WKInterfaceDevice.current().play(.failure)
        }
    }

    /// Agregar a la lista (escrito o dictado). Si coincide con un producto, se vincula.
    func add(_ text: String) async {
        let name = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }
        do {
            try await addToList(product: WatchVoice.match(name, in: products), name: name, quantity: 1)
            WKInterfaceDevice.current().play(.success)
        } catch {
            WKInterfaceDevice.current().play(.failure)
        }
        await reloadQuietly()
    }

    private func addToList(product: Product?, name: String, quantity: Int) async throws {
        guard let api, let config else { return }
        if let product, items.contains(where: { $0.product_id == product.id }) { return } // ya está
        var body: [String: Any] = ["household_id": config.householdId, "reason": "manual"]
        if let product { body["product_id"] = product.id } else { body["name"] = WatchVoice.niceName(name) }
        if quantity > 1 { body["quantity"] = quantity }
        _ = try await api.post("shopping_list_items", body: body)
    }

    private func setStatus(_ product: Product, _ status: String, quantity: Int? = nil) async throws {
        guard let api else { return }
        var params: [String: Any] = [
            "p_product_id": product.id, "p_status": status, "p_source": "voice",
            "p_event_id": eventId, "p_client_time": now,
        ]
        if let quantity { params["p_quantity"] = quantity }
        _ = try await api.rpc("set_product_status", params)
    }

    /// Lo que se dijo (ya confirmado): compré, se terminó, queda poco, a la lista. Devuelve cuántas se aplicaron.
    @discardableResult
    func apply(_ actions: [VoiceAction]) async -> Int {
        guard let api else { return 0 }
        var done = 0
        for action in actions where action.include {
            do {
                switch action.kind {
                case .bought:
                    guard let product = action.product else { continue }
                    if let item = items.first(where: { $0.product_id == product.id }) {
                        _ = try await api.rpc("purchase_list_item", ["p_item_id": item.id, "p_event_id": eventId, "p_client_time": now])
                    } else if product.track_quantity {
                        try await setStatus(product, "ok", quantity: (product.quantity ?? 0) + action.quantity)
                    } else {
                        try await setStatus(product, "ok")
                    }
                case .out, .low:
                    if let product = action.product {
                        try await setStatus(product, action.kind == .out ? "out" : "low")
                    } else {
                        try await addToList(product: nil, name: action.spoken, quantity: action.quantity)
                    }
                case .list:
                    try await addToList(product: action.product, name: action.spoken, quantity: action.quantity)
                }
                done += 1
            } catch {
                continue
            }
        }
        WKInterfaceDevice.current().play(done > 0 ? .success : .failure)
        await reloadQuietly()
        return done
    }
}
