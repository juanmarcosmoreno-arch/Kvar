import Foundation

/// Lo que el iPhone le pasa al reloj para que se sume al hogar (por WatchConnectivity).
struct WatchConfig: Codable, Equatable {
    var supabaseUrl: String
    var supabaseKey: String
    var inviteCode: String
    var householdId: String
    var householdName: String
    var memberName: String
    /// Al tachar en el súper: «stock» (pasa a «Hay») o «check» (solo se tacha). Lo elige el iPhone (Ajustes).
    var tickMode: String?
    /// Recorrido del súper aprendido en el iPhone: «p:<producto>» / «c:<categoría>» → posición de 0 a 1
    var aisle: [String: Double]?
    /// Orden de la lista, el mismo que en el iPhone: «priority» (lo básico que no hay primero), «aisle» o «category»
    var listOrder: String?

    init?(dict: [String: Any]) {
        guard let url = dict["supabaseUrl"] as? String, !url.isEmpty,
              let key = dict["supabaseKey"] as? String, !key.isEmpty,
              let code = dict["inviteCode"] as? String, !code.isEmpty,
              let hh = dict["householdId"] as? String, !hh.isEmpty
        else { return nil }
        supabaseUrl = url
        supabaseKey = key
        inviteCode = code
        householdId = hh
        householdName = dict["householdName"] as? String ?? L10n.home
        memberName = dict["memberName"] as? String ?? ""
        tickMode = dict["tickMode"] as? String
        listOrder = dict["listOrder"] as? String
        if let json = dict["aisle"] as? String, let data = json.data(using: .utf8) {
            aisle = try? JSONDecoder().decode([String: Double].self, from: data)
        }
    }

    /// Lo que identifica la conexión (si cambia, hay que volver a entrar)
    var connection: [String] { [supabaseUrl, supabaseKey, inviteCode, householdId] }

    static let storageKey = "stoka.watch.config"

    static func load() -> WatchConfig? {
        guard let data = UserDefaults.standard.data(forKey: storageKey) else { return nil }
        return try? JSONDecoder().decode(WatchConfig.self, from: data)
    }

    func save() {
        if let data = try? JSONEncoder().encode(self) { UserDefaults.standard.set(data, forKey: Self.storageKey) }
    }
}
