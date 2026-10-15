import Foundation

/// Lo que el iPhone le pasa al reloj para que se sume al hogar (por WatchConnectivity).
struct WatchConfig: Codable, Equatable {
    var supabaseUrl: String
    var supabaseKey: String
    var inviteCode: String
    var householdId: String
    var householdName: String
    var memberName: String

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
        householdName = dict["householdName"] as? String ?? "Casa"
        memberName = dict["memberName"] as? String ?? ""
    }

    static let storageKey = "stoka.watch.config"

    static func load() -> WatchConfig? {
        guard let data = UserDefaults.standard.data(forKey: storageKey) else { return nil }
        return try? JSONDecoder().decode(WatchConfig.self, from: data)
    }

    func save() {
        if let data = try? JSONEncoder().encode(self) { UserDefaults.standard.set(data, forKey: Self.storageKey) }
    }
}
