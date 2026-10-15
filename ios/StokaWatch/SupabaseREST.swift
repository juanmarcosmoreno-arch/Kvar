import Foundation

/// Cliente mínimo de Supabase para el reloj: usuario propio (sin correo), consultas y RPC.
/// El reloj es un miembro más del hogar; la seguridad por hogar (RLS) aplica igual que en el iPhone.
actor SupabaseREST {
    struct Session: Codable {
        var accessToken: String
        var refreshToken: String
        var expiresAt: Date
        var userId: String
    }

    enum Failure: LocalizedError {
        case http(Int, String)
        case noSession
        var errorDescription: String? {
            switch self {
            case .http(let code, let body): return "Error \(code): \(body.prefix(140))"
            case .noSession: return "Sin sesión"
            }
        }
    }

    private let base: URL
    private let key: String
    private(set) var session: Session?
    private static let sessionKey = "stoka.watch.session"

    init(url: String, key: String) {
        self.base = URL(string: url)!
        self.key = key
        if let data = UserDefaults.standard.data(forKey: Self.sessionKey),
           let s = try? JSONDecoder().decode(Session.self, from: data) {
            session = s
        }
    }

    var hasSession: Bool { session != nil }

    func forgetSession() {
        session = nil
        UserDefaults.standard.removeObject(forKey: Self.sessionKey)
    }

    private func store(_ s: Session) {
        session = s
        if let data = try? JSONEncoder().encode(s) { UserDefaults.standard.set(data, forKey: Self.sessionKey) }
    }

    // MARK: Auth

    private struct AuthResponse: Decodable {
        let access_token: String
        let refresh_token: String
        let expires_in: Double
        let user: User
        struct User: Decodable { let id: String }
    }

    private func authRequest(_ path: String, body: [String: Any]) async throws {
        var req = URLRequest(url: base.appendingPathComponent(path))
        req.httpMethod = "POST"
        req.setValue(key, forHTTPHeaderField: "apikey")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, response) = try await URLSession.shared.data(for: req)
        let code = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(code) else { throw Failure.http(code, String(decoding: data, as: UTF8.self)) }
        let r = try JSONDecoder().decode(AuthResponse.self, from: data)
        store(Session(accessToken: r.access_token, refreshToken: r.refresh_token,
                      expiresAt: Date().addingTimeInterval(r.expires_in - 60), userId: r.user.id))
    }

    /// Usuario anónimo propio del reloj (requiere «Allow anonymous sign-ins» en Supabase).
    func signUpAnonymously() async throws {
        try await authRequest("auth/v1/signup", body: [:])
    }

    private func refreshIfNeeded() async throws {
        guard let s = session else { throw Failure.noSession }
        if s.expiresAt > Date() { return }
        var comps = URLComponents(url: base.appendingPathComponent("auth/v1/token"), resolvingAgainstBaseURL: false)!
        comps.queryItems = [URLQueryItem(name: "grant_type", value: "refresh_token")]
        var req = URLRequest(url: comps.url!)
        req.httpMethod = "POST"
        req.setValue(key, forHTTPHeaderField: "apikey")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: ["refresh_token": s.refreshToken])
        let (data, response) = try await URLSession.shared.data(for: req)
        let code = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(code) else {
            forgetSession()
            throw Failure.noSession
        }
        let r = try JSONDecoder().decode(AuthResponse.self, from: data)
        store(Session(accessToken: r.access_token, refreshToken: r.refresh_token,
                      expiresAt: Date().addingTimeInterval(r.expires_in - 60), userId: r.user.id))
    }

    // MARK: REST

    func get(_ table: String, query: [URLQueryItem]) async throws -> Data {
        var comps = URLComponents(url: base.appendingPathComponent("rest/v1/\(table)"), resolvingAgainstBaseURL: false)!
        comps.queryItems = query
        return try await send(URLRequest(url: comps.url!))
    }

    func post(_ path: String, body: [String: Any]) async throws -> Data {
        var req = URLRequest(url: base.appendingPathComponent("rest/v1/\(path)"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("return=minimal", forHTTPHeaderField: "Prefer")
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        return try await send(req)
    }

    func rpc(_ name: String, _ params: [String: Any]) async throws -> Data {
        try await post("rpc/\(name)", body: params)
    }

    private func send(_ original: URLRequest) async throws -> Data {
        try await refreshIfNeeded()
        var req = original
        req.setValue(key, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(session?.accessToken ?? "")", forHTTPHeaderField: "Authorization")
        let (data, response) = try await URLSession.shared.data(for: req)
        let code = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(code) else { throw Failure.http(code, String(decoding: data, as: UTF8.self)) }
        return data
    }
}
