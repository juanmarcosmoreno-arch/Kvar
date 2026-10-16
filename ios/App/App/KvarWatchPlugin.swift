import ActivityKit
import AppIntents
import Capacitor
import Foundation
import WatchConnectivity
import WidgetKit

/// Le pasa al Apple Watch lo necesario para sumarse al hogar (dirección de Supabase, clave pública,
/// código de invitación). El reloj después trabaja solo, como un miembro más.
@objc(KvarWatchPlugin)
public class KvarWatchPlugin: CAPPlugin, CAPBridgedPlugin, WCSessionDelegate {
    public let identifier = "KvarWatchPlugin"
    public let jsName = "KvarWatch"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "shareSnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearSnapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "takePendingShortcutActions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "listActivity", returnType: CAPPluginReturnPromise),
    ]

    private var pending: [String: Any]?

    override public func load() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    @objc func sync(_ call: CAPPluginCall) {
        guard WCSession.isSupported() else {
            call.resolve(["paired": false, "installed": false])
            return
        }
        var context: [String: Any] = [:]
        for key in ["supabaseUrl", "supabaseKey", "inviteCode", "householdId", "householdName", "memberName", "tickMode", "aisle"] {
            context[key] = call.getString(key) ?? ""
        }
        pending = context
        send()
        let session = WCSession.default
        call.resolve(["paired": session.isPaired, "installed": session.isWatchAppInstalled])
    }

    // Widget y Siri: ver «MARK: - Siri y widget» más abajo.

    /// Guarda en el App Group la foto que leen el widget y Siri (JSON armado en src/lib/watch.ts).
    @objc func shareSnapshot(_ call: CAPPluginCall) {
        guard let json = call.getString("json"), let data = json.data(using: .utf8),
              (try? JSONDecoder().decode(StokaShared.self, from: data)) != nil else {
            call.reject("Foto inválida")
            return
        }
        StokaShared.save(data)
        call.resolve()
    }

    /// Al cerrar sesión: el widget vuelve a «Abrí Stoka para conectar».
    @objc func clearSnapshot(_ call: CAPPluginCall) {
        StokaShared.clear()
        call.resolve()
    }

    /// Lo que Siri anotó sin conexión (o con la sesión vencida). Se lee y se borra.
    @objc func takePendingShortcutActions(_ call: CAPPluginCall) {
        call.resolve(["actions": StokaPending.take()])
    }

    /// «Estoy en el súper»: la lista en la pantalla bloqueada y en la Dynamic Island (ver StokaListActivity).
    @objc func listActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve(["supported": false])
            return
        }
        let active = call.getBool("active") ?? false
        let title = call.getString("title") ?? "Stoka"
        let state = StokaListAttributes.ContentState(
            items: (call.getArray("items") as? [String]) ?? [],
            left: call.getInt("left") ?? 0,
            done: call.getInt("done") ?? 0,
            subtitle: call.getString("subtitle") ?? ""
        )
        call.resolve(["supported": ActivityAuthorizationInfo().areActivitiesEnabled])
        Task {
            if active {
                await StokaListActivity.show(title: title, state: state)
            } else {
                await StokaListActivity.end()
            }
        }
    }

    private func send() {
        let session = WCSession.default
        guard let context = pending, session.activationState == .activated,
              session.isPaired, session.isWatchAppInstalled else { return }
        do {
            try session.updateApplicationContext(context)
            pending = nil
        } catch {
            // Se reintenta en la próxima sincronización
        }
    }

    public func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async { self.send() }
    }

    public func sessionWatchStateDidChange(_ session: WCSession) {
        DispatchQueue.main.async { self.send() } // por ejemplo, cuando se instala la app del reloj
    }

    public func sessionDidBecomeInactive(_ session: WCSession) {}

    public func sessionDidDeactivate(_ session: WCSession) {
        WCSession.default.activate()
    }
}

// MARK: - Siri y widget
//
// La app web guarda en el App Group («group.» + el bundle id) una foto chica del hogar: la lista, lo que se está
// por terminar y los productos (para que Siri encuentre «la leche»). El widget la muestra y Siri la usa.
// Siri nunca renueva la sesión (eso podría cerrar la sesión de la app): usa el token mientras sea válido y,
// si venció o no hay conexión, anota el pedido y la app lo aplica al abrirse.

struct StokaShared: Codable {
    struct Item: Codable {
        var name: String
        var quantity: Int?
        var status: String?
    }
    struct Product: Codable {
        var id: String
        var name: String
    }
    var householdId: String
    var householdName: String
    var supabaseUrl: String
    var supabaseKey: String
    var accessToken: String?
    /** Segundos desde 1970 */
    var tokenExpiresAt: Double?
    var list: [Item]
    var running: [Item]
    var products: [Product]
    var updatedAt: Double

    static var groupId: String { "group." + (Bundle.main.bundleIdentifier ?? "stoka") }
    static var defaults: UserDefaults { UserDefaults(suiteName: groupId) ?? .standard }
    private static let key = "stoka.snapshot"

    static func load() -> StokaShared? {
        guard let data = defaults.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(StokaShared.self, from: data)
    }

    static func save(_ data: Data) {
        defaults.set(data, forKey: key)
        if #available(iOS 14.0, *) { WidgetCenter.shared.reloadAllTimelines() }
    }

    static func clear() {
        defaults.removeObject(forKey: key)
        if #available(iOS 14.0, *) { WidgetCenter.shared.reloadAllTimelines() }
    }

    var tokenValid: Bool {
        guard let token = accessToken, !token.isEmpty, let exp = tokenExpiresAt else { return false }
        return exp > Date().timeIntervalSince1970 + 60
    }

    /// «la leche», «Leches», «LECHE» → el producto «Leche»
    func findProduct(_ spoken: String) -> Product? {
        let target = StokaShared.fold(spoken)
        guard !target.isEmpty else { return nil }
        if let exact = products.first(where: { StokaShared.fold($0.name) == target }) { return exact }
        return products.first { p in
            let name = StokaShared.fold(p.name)
            return name.hasPrefix(target) || target.hasPrefix(name)
        }
    }

    static func fold(_ s: String) -> String {
        var t = s.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: nil).lowercased()
        for article in ["el ", "la ", "los ", "las ", "un ", "una ", "the ", "le ", "les ", "il ", "lo ", "o ", "a ", "os ", "as "] where t.hasPrefix(article) {
            t.removeFirst(article.count)
        }
        t = t.trimmingCharacters(in: .whitespacesAndNewlines.union(.punctuationCharacters))
        if t.hasSuffix("es"), t.count > 4 { t.removeLast(2) } else if t.hasSuffix("s"), t.count > 3 { t.removeLast() }
        return t
    }
}

/// Pedidos de Siri que todavía no llegaron a la base (sin conexión o con la sesión vencida).
enum StokaPending {
    private static let key = "stoka.pending"

    static func add(_ action: [String: Any]) {
        var all = (StokaShared.defaults.array(forKey: key) as? [[String: Any]]) ?? []
        var a = action
        a["at"] = ISO8601DateFormatter().string(from: Date())
        all.append(a)
        StokaShared.defaults.set(all, forKey: key)
    }

    static func take() -> [[String: Any]] {
        let all = (StokaShared.defaults.array(forKey: key) as? [[String: Any]]) ?? []
        StokaShared.defaults.removeObject(forKey: key)
        return all
    }
}

/// Llamadas mínimas a Supabase desde Siri (con el token de la app, sin renovarlo).
enum StokaREST {
    static func post(_ shared: StokaShared, path: String, body: [String: Any]) async -> Bool {
        guard shared.tokenValid, let token = shared.accessToken,
              let url = URL(string: shared.supabaseUrl + path) else { return false }
        var req = URLRequest(url: url, timeoutInterval: 8)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(shared.supabaseKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("return=minimal", forHTTPHeaderField: "Prefer")
        req.httpBody = try? JSONSerialization.data(withJSONObject: body)
        guard let result = try? await URLSession.shared.data(for: req),
              let http = result.1 as? HTTPURLResponse else { return false }
        return (200..<300).contains(http.statusCode)
    }
}

/// Textos de Siri en los idiomas de Stoka (según el idioma del iPhone).
enum ShortcutL10n {
    private static let lang: String = {
        for tag in Locale.preferredLanguages {
            let base = String(tag.lowercased().split(separator: "-").first ?? "")
            if table.keys.contains(base) { return base }
            if ["nb", "no", "nn"].contains(base) { return "da" }
        }
        return "en"
    }()

    static func t(_ key: String, _ arg: String = "") -> String {
        let s = table[lang]?[key] ?? table["es"]![key]!
        return s.replacingOccurrences(of: "%@", with: arg)
    }

    private static let table: [String: [String: String]] = [
        "es": ["askOut": "¿Qué se terminó?", "askAdd": "¿Qué agrego a la lista?", "doneOut": "Listo: %@ pasó a «No hay» y va a la lista.",
               "doneAdd": "Agregué %@ a la lista.", "queued": "Anotado: %@. Lo paso apenas abras Stoka.", "noData": "Abrí Stoka una vez en el iPhone para conectar Siri.",
               "list": "En la lista: %@.", "empty": "No falta nada.", "notFound": "No encontré %@ en tus productos; lo agregué a la lista."],
        "en": ["askOut": "What ran out?", "askAdd": "What should I add to the list?", "doneOut": "Done: %@ is out and on the list.",
               "doneAdd": "Added %@ to the list.", "queued": "Got it: %@. I’ll sync it when you open Stoka.", "noData": "Open Stoka on your iPhone once to connect Siri.",
               "list": "On the list: %@.", "empty": "Nothing missing.", "notFound": "I couldn’t find %@ in your products, so I added it to the list."],
        "pt": ["askOut": "O que acabou?", "askAdd": "O que eu adiciono à lista?", "doneOut": "Pronto: %@ acabou e foi para a lista.",
               "doneAdd": "Adicionei %@ à lista.", "queued": "Anotado: %@. Sincronizo quando você abrir o Stoka.", "noData": "Abra o Stoka no iPhone uma vez para conectar a Siri.",
               "list": "Na lista: %@.", "empty": "Não falta nada.", "notFound": "Não encontrei %@ nos seus produtos; adicionei à lista."],
        "fr": ["askOut": "Qu’est-ce qui est épuisé ?", "askAdd": "Qu’est-ce que j’ajoute à la liste ?", "doneOut": "C’est fait : %@ est épuisé et ajouté à la liste.",
               "doneAdd": "J’ai ajouté %@ à la liste.", "queued": "Noté : %@. Je synchronise à l’ouverture de Stoka.", "noData": "Ouvrez Stoka une fois sur l’iPhone pour connecter Siri.",
               "list": "Sur la liste : %@.", "empty": "Rien ne manque.", "notFound": "Je n’ai pas trouvé %@ dans vos produits ; je l’ai ajouté à la liste."],
        "it": ["askOut": "Cosa è finito?", "askAdd": "Cosa aggiungo alla lista?", "doneOut": "Fatto: %@ è finito ed è nella lista.",
               "doneAdd": "Ho aggiunto %@ alla lista.", "queued": "Segnato: %@. Lo sincronizzo quando apri Stoka.", "noData": "Apri Stoka sull’iPhone una volta per collegare Siri.",
               "list": "Nella lista: %@.", "empty": "Non manca niente.", "notFound": "Non ho trovato %@ tra i tuoi prodotti; l’ho aggiunto alla lista."],
        "sv": ["askOut": "Vad har tagit slut?", "askAdd": "Vad ska jag lägga till på listan?", "doneOut": "Klart: %@ är slut och står på listan.",
               "doneAdd": "Jag lade till %@ på listan.", "queued": "Noterat: %@. Jag synkar när du öppnar Stoka.", "noData": "Öppna Stoka på iPhone en gång för att ansluta Siri.",
               "list": "På listan: %@.", "empty": "Inget saknas.", "notFound": "Jag hittade inte %@ bland dina varor, så jag lade till det på listan."],
        "da": ["askOut": "Hvad er sluppet op?", "askAdd": "Hvad skal jeg tilføje til listen?", "doneOut": "Færdig: %@ er sluppet op og står på listen.",
               "doneAdd": "Jeg tilføjede %@ til listen.", "queued": "Noteret: %@. Jeg synkroniserer, når du åbner Stoka.", "noData": "Åbn Stoka på iPhone én gang for at forbinde Siri.",
               "list": "På listen: %@.", "empty": "Der mangler intet.", "notFound": "Jeg fandt ikke %@ blandt dine varer, så jeg tilføjede det til listen."],
        "zh": ["askOut": "什么用完了？", "askAdd": "要往清单里加什么？", "doneOut": "好了：%@ 已标为用完并加入清单。",
               "doneAdd": "已把 %@ 加入清单。", "queued": "已记下：%@。打开 Stoka 时会同步。", "noData": "请先在 iPhone 上打开一次 Stoka 来连接 Siri。",
               "list": "清单上有：%@。", "empty": "什么都不缺。", "notFound": "没在你的商品里找到 %@，已加入清单。"],
        "ja": ["askOut": "何が切れましたか？", "askAdd": "リストに何を追加しますか？", "doneOut": "%@ を「なし」にしてリストに追加しました。",
               "doneAdd": "%@ をリストに追加しました。", "queued": "%@ を記録しました。Stoka を開いたときに同期します。", "noData": "Siri と連携するには、iPhone で Stoka を一度開いてください。",
               "list": "リスト：%@。", "empty": "足りないものはありません。", "notFound": "%@ は商品に見つからなかったので、リストに追加しました。"],
    ]
}

@available(iOS 16.0, *)
struct RanOutIntent: AppIntent {
    static var title: LocalizedStringResource = "Se terminó algo"
    static var description = IntentDescription("Marca un producto como «No hay» y lo agrega a la lista de compras.")
    static var openAppWhenRun = false

    @Parameter(title: "Producto", requestValueDialog: IntentDialog(stringLiteral: ShortcutL10n.t("askOut")))
    var product: String

    func perform() async throws -> some IntentResult & ProvidesDialog {
        guard let shared = StokaShared.load() else {
            return .result(dialog: IntentDialog(stringLiteral: ShortcutL10n.t("noData")))
        }
        let spoken = product.trimmingCharacters(in: .whitespacesAndNewlines)
        if let p = shared.findProduct(spoken) {
            let body: [String: Any] = [
                "p_product_id": p.id, "p_status": "out", "p_source": "voice",
                "p_event_id": UUID().uuidString.lowercased(),
                "p_client_time": ISO8601DateFormatter().string(from: Date()),
            ]
            if await StokaREST.post(shared, path: "/rest/v1/rpc/set_product_status", body: body) {
                return .result(dialog: IntentDialog(stringLiteral: ShortcutL10n.t("doneOut", p.name)))
            }
            StokaPending.add(["productId": p.id, "name": p.name, "status": "out"])
            return .result(dialog: IntentDialog(stringLiteral: ShortcutL10n.t("queued", p.name)))
        }
        // No es un producto conocido: va a la lista con ese nombre
        let message = await AddToListIntent.add(spoken, shared: shared, notFound: true)
        return .result(dialog: IntentDialog(stringLiteral: message))
    }
}

@available(iOS 16.0, *)
struct AddToListIntent: AppIntent {
    static var title: LocalizedStringResource = "Agregar a la lista"
    static var description = IntentDescription("Agrega algo a la lista de compras de Stoka.")
    static var openAppWhenRun = false

    @Parameter(title: "Qué", requestValueDialog: IntentDialog(stringLiteral: ShortcutL10n.t("askAdd")))
    var item: String

    func perform() async throws -> some IntentResult & ProvidesDialog {
        guard let shared = StokaShared.load() else {
            return .result(dialog: IntentDialog(stringLiteral: ShortcutL10n.t("noData")))
        }
        let message = await AddToListIntent.add(item.trimmingCharacters(in: .whitespacesAndNewlines), shared: shared, notFound: false)
        return .result(dialog: IntentDialog(stringLiteral: message))
    }

    /// Agrega a la lista (o lo deja anotado) y devuelve lo que contesta Siri.
    static func add(_ spoken: String, shared: StokaShared, notFound: Bool) async -> String {
        let product = shared.findProduct(spoken)
        let name = product?.name ?? (spoken.prefix(1).uppercased() + spoken.dropFirst())
        var body: [String: Any] = [
            "id": UUID().uuidString.lowercased(), "household_id": shared.householdId, "reason": "manual",
        ]
        if let product { body["product_id"] = product.id } else { body["name"] = name }
        let ok = await StokaREST.post(shared, path: "/rest/v1/shopping_list_items", body: body)
        if !ok { StokaPending.add(["productId": product?.id ?? "", "name": name, "list": true]) }
        let key = !ok ? "queued" : notFound ? "notFound" : "doneAdd"
        return ShortcutL10n.t(key, name)
    }
}

@available(iOS 16.0, *)
struct WhatsMissingIntent: AppIntent {
    static var title: LocalizedStringResource = "¿Qué falta?"
    static var description = IntentDescription("Lee la lista de compras de Stoka.")
    static var openAppWhenRun = false

    func perform() async throws -> some IntentResult & ProvidesDialog {
        guard let shared = StokaShared.load() else {
            return .result(dialog: IntentDialog(stringLiteral: ShortcutL10n.t("noData")))
        }
        if shared.list.isEmpty {
            return .result(dialog: IntentDialog(stringLiteral: ShortcutL10n.t("empty")))
        }
        let names = shared.list.prefix(15).map { $0.name }
        let joined = ListFormatter.localizedString(byJoining: Array(names))
        return .result(dialog: IntentDialog(stringLiteral: ShortcutL10n.t("list", joined)))
    }
}

@available(iOS 16.0, *)
struct StokaShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: RanOutIntent(),
            phrases: [
                "Se terminó algo en \(.applicationName)",
                "Anotá que se terminó algo en \(.applicationName)",
                "Something ran out in \(.applicationName)",
            ],
            shortTitle: "Se terminó algo",
            systemImageName: "xmark.circle"
        )
        AppShortcut(
            intent: AddToListIntent(),
            phrases: [
                "Anotá algo en la lista de \(.applicationName)",
                "Agregá algo a la lista de \(.applicationName)",
                "Add something to the \(.applicationName) list",
            ],
            shortTitle: "Agregar a la lista",
            systemImageName: "cart.badge.plus"
        )
        AppShortcut(
            intent: WhatsMissingIntent(),
            phrases: [
                "¿Qué falta en \(.applicationName)?",
                "Qué falta comprar en \(.applicationName)",
                "What’s missing in \(.applicationName)",
            ],
            shortTitle: "¿Qué falta?",
            systemImageName: "list.bullet"
        )
    }
}

// MARK: - Live Activity («Estoy en el súper»)
//
// La vista vive en el widget (ios/StokaWidget/StokaListActivity.swift, con una copia idéntica de
// StokaListAttributes). La app la prende, la actualiza cuando cambia la lista y la cierra al salir del súper.

@available(iOS 16.2, *)
struct StokaListAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var items: [String]
        var left: Int
        var done: Int
        var subtitle: String
    }

    var title: String
}

@available(iOS 16.2, *)
enum StokaListActivity {
    static func show(title: String, state: StokaListAttributes.ContentState) async {
        let content = ActivityContent(state: state, staleDate: nil)
        if let current = Activity<StokaListAttributes>.activities.first {
            await current.update(content)
            return
        }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        _ = try? Activity.request(attributes: StokaListAttributes(title: title), content: content, pushType: nil)
    }

    static func end() async {
        for activity in Activity<StokaListAttributes>.activities {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
    }
}
