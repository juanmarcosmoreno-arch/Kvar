import Foundation
import SwiftUI
import WatchKit

struct ListItem: Decodable, Identifiable {
    let id: String
    let name: String?
    let quantity: Int?
    let product_id: String?
    let reason: String
    let products: ProductName?
    struct ProductName: Decodable { let name: String }
    var title: String { products?.name ?? name ?? "Producto" }
}

struct Product: Decodable, Identifiable {
    let id: String
    let name: String
    let status: String
    let is_staple: Bool
}

@MainActor
final class WatchStore: ObservableObject {
    enum Phase: Equatable { case needsPhone, connecting, ready, failed(String) }

    @Published var phase: Phase = .needsPhone
    @Published var items: [ListItem] = []
    @Published var products: [Product] = []
    @Published var householdName = ""

    private var config: WatchConfig?
    private var api: SupabaseREST?
    private static let joinedKey = "stoka.watch.joinedHousehold"

    init() {
        PhoneLink.shared.onConfig = { [weak self] config in
            Task { @MainActor in self?.configure(config) }
        }
        PhoneLink.shared.activate()
        if let saved = WatchConfig.load() { configure(saved) }
    }

    func configure(_ newConfig: WatchConfig) {
        let changed = newConfig != config
        config = newConfig
        newConfig.save()
        householdName = newConfig.householdName
        if changed || api == nil { api = SupabaseREST(url: newConfig.supabaseUrl, key: newConfig.supabaseKey) }
        Task { await connect() }
    }

    /// El reloj entra como un miembro más del hogar, con el código de invitación.
    func connect() async {
        guard let config, let api else { phase = .needsPhone; return }
        if phase != .ready { phase = .connecting }
        do {
            if !(await api.hasSession) { try await api.signUpAnonymously() }
            if UserDefaults.standard.string(forKey: Self.joinedKey) != config.householdId {
                let name = config.memberName.isEmpty ? "Reloj" : "Reloj de \(config.memberName)"
                _ = try await api.rpc("join_household", ["p_code": config.inviteCode, "p_display_name": name])
                UserDefaults.standard.set(config.householdId, forKey: Self.joinedKey)
            }
            try await refresh()
            phase = .ready
        } catch SupabaseREST.Failure.noSession {
            // La sesión venció del todo: se crea una nueva y se vuelve a entrar con el código
            UserDefaults.standard.removeObject(forKey: Self.joinedKey)
            phase = .failed("Reconectando…")
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
            URLQueryItem(name: "select", value: "id,name,quantity,product_id,reason,products(name)"),
            URLQueryItem(name: "household_id", value: hh),
            URLQueryItem(name: "checked_at", value: "is.null"),
        ])
        let productsData = try await api.get("products", query: [
            URLQueryItem(name: "select", value: "id,name,status,is_staple"),
            URLQueryItem(name: "household_id", value: hh),
            URLQueryItem(name: "order", value: "name"),
        ])
        let decoder = JSONDecoder()
        items = try decoder.decode([ListItem].self, from: itemsData)
            .sorted { ($0.reason == "out" ? 0 : 1, $0.title) < ($1.reason == "out" ? 0 : 1, $1.title) }
        products = try decoder.decode([Product].self, from: productsData)
    }

    func reload() async {
        do { try await refresh() } catch { phase = .failed(error.localizedDescription) }
    }

    private var now: String { ISO8601DateFormatter().string(from: Date()) }

    /// Tachar en el súper: el producto pasa a «Hay».
    func buy(_ item: ListItem) async {
        guard let api else { return }
        withAnimation { items.removeAll { $0.id == item.id } }
        WKInterfaceDevice.current().play(.success)
        do {
            _ = try await api.rpc("purchase_list_item", [
                "p_item_id": item.id, "p_event_id": UUID().uuidString.lowercased(), "p_client_time": now,
            ])
        } catch {
            WKInterfaceDevice.current().play(.failure)
            await reload()
        }
    }

    /// «Se terminó»: pasa a «No hay» y va a la lista.
    func ranOut(_ product: Product) async {
        guard let api else { return }
        WKInterfaceDevice.current().play(.success)
        do {
            _ = try await api.rpc("set_product_status", [
                "p_product_id": product.id, "p_status": "out", "p_source": "quick_out",
                "p_event_id": UUID().uuidString.lowercased(), "p_client_time": now,
            ])
            await reload()
        } catch {
            WKInterfaceDevice.current().play(.failure)
        }
    }

    /// Agregar a la lista dictando en el reloj. Si coincide con un producto, se vincula.
    func add(_ text: String) async {
        guard let api, let config else { return }
        let name = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }
        let match = products.first { $0.name.compare(name, options: [.caseInsensitive, .diacriticInsensitive]) == .orderedSame }
        var body: [String: Any] = ["household_id": config.householdId, "reason": "manual"]
        if let match { body["product_id"] = match.id } else { body["name"] = name.prefix(1).uppercased() + name.dropFirst() }
        do {
            _ = try await api.post("shopping_list_items", body: body)
            WKInterfaceDevice.current().play(.success)
            await reload()
        } catch {
            WKInterfaceDevice.current().play(.failure)
        }
    }
}
