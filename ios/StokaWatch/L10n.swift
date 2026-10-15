import Foundation

/// Textos del reloj en los idiomas de Stoka. Se elige por el idioma del reloj (sin archivos .strings,
/// así no hay que configurar nada en Xcode).
enum L10n {
    private static let lang: String = {
        for tag in Locale.preferredLanguages {
            let base = String(tag.lowercased().split(separator: "-").first ?? "")
            if table.keys.contains(base) { return base }
            if ["nb", "no", "nn"].contains(base) { return "da" }
        }
        return "en"
    }()

    private static func t(_ key: String) -> String { table[lang]?[key] ?? table["es"]![key]! }

    static var openPhone: String { t("openPhone") }
    static var connecting: String { t("connecting") }
    static var retry: String { t("retry") }
    static var nothingMissing: String { t("nothingMissing") }
    static var out: String { t("out") }
    static var low: String { t("low") }
    static var addPlaceholder: String { t("add") }
    static var list: String { t("list") }
    static var ranOut: String { t("ranOut") }
    static var home: String { t("home") }
    static var product: String { t("product") }
    static var watch: String { t("watch") }
    static func watchOf(_ name: String) -> String { t("watchOf").replacingOccurrences(of: "%@", with: name) }
    static var reconnecting: String { t("reconnecting") }
    static var noSession: String { t("noSession") }

    private static let table: [String: [String: String]] = [
        "es": [
            "openPhone": "Abrí Stoka en el iPhone para conectar el reloj.", "connecting": "Conectando…", "retry": "Reintentar",
            "nothingMissing": "No falta nada", "out": "No hay", "low": "Queda poco", "add": "Agregar…", "list": "Lista",
            "ranOut": "¿Se terminó?", "home": "Casa", "product": "Producto", "watch": "Reloj", "watchOf": "Reloj de %@",
            "reconnecting": "Reconectando…", "noSession": "Sin sesión",
        ],
        "en": [
            "openPhone": "Open Stoka on your iPhone to connect the watch.", "connecting": "Connecting…", "retry": "Try again",
            "nothingMissing": "Nothing missing", "out": "Out", "low": "Running low", "add": "Add…", "list": "List",
            "ranOut": "Ran out?", "home": "Home", "product": "Product", "watch": "Watch", "watchOf": "%@’s Watch",
            "reconnecting": "Reconnecting…", "noSession": "Not signed in",
        ],
        "pt": [
            "openPhone": "Abra o Stoka no iPhone para conectar o relógio.", "connecting": "Conectando…", "retry": "Tentar de novo",
            "nothingMissing": "Não falta nada", "out": "Acabou", "low": "Está acabando", "add": "Adicionar…", "list": "Lista",
            "ranOut": "Acabou?", "home": "Casa", "product": "Produto", "watch": "Relógio", "watchOf": "Relógio de %@",
            "reconnecting": "Reconectando…", "noSession": "Sem sessão",
        ],
        "fr": [
            "openPhone": "Ouvrez Stoka sur l’iPhone pour connecter la montre.", "connecting": "Connexion…", "retry": "Réessayer",
            "nothingMissing": "Rien ne manque", "out": "Épuisé", "low": "Bientôt fini", "add": "Ajouter…", "list": "Liste",
            "ranOut": "C’est fini ?", "home": "Maison", "product": "Produit", "watch": "Montre", "watchOf": "Montre de %@",
            "reconnecting": "Reconnexion…", "noSession": "Non connecté",
        ],
        "it": [
            "openPhone": "Apri Stoka sull’iPhone per collegare l’orologio.", "connecting": "Connessione…", "retry": "Riprova",
            "nothingMissing": "Non manca niente", "out": "Finito", "low": "Sta finendo", "add": "Aggiungi…", "list": "Lista",
            "ranOut": "È finito?", "home": "Casa", "product": "Prodotto", "watch": "Orologio", "watchOf": "Orologio di %@",
            "reconnecting": "Riconnessione…", "noSession": "Non connesso",
        ],
        "sv": [
            "openPhone": "Öppna Stoka på iPhone för att ansluta klockan.", "connecting": "Ansluter…", "retry": "Försök igen",
            "nothingMissing": "Inget saknas", "out": "Slut", "low": "Snart slut", "add": "Lägg till…", "list": "Lista",
            "ranOut": "Tog det slut?", "home": "Hemma", "product": "Vara", "watch": "Klocka", "watchOf": "%@s klocka",
            "reconnecting": "Ansluter igen…", "noSession": "Inte inloggad",
        ],
        "da": [
            "openPhone": "Åbn Stoka på iPhone for at forbinde uret.", "connecting": "Forbinder…", "retry": "Prøv igen",
            "nothingMissing": "Der mangler intet", "out": "Tom", "low": "Næsten tom", "add": "Tilføj…", "list": "Liste",
            "ranOut": "Sluppet op?", "home": "Hjem", "product": "Vare", "watch": "Ur", "watchOf": "%@s ur",
            "reconnecting": "Forbinder igen…", "noSession": "Ikke logget ind",
        ],
        "zh": [
            "openPhone": "在 iPhone 上打开 Stoka 以连接手表。", "connecting": "正在连接…", "retry": "重试",
            "nothingMissing": "什么都不缺", "out": "没有了", "low": "快用完了", "add": "添加…", "list": "清单",
            "ranOut": "用完了？", "home": "家", "product": "商品", "watch": "手表", "watchOf": "%@的手表",
            "reconnecting": "正在重新连接…", "noSession": "未登录",
        ],
        "ja": [
            "openPhone": "iPhone で Stoka を開いて時計と接続してください。", "connecting": "接続中…", "retry": "再試行",
            "nothingMissing": "足りないものはありません", "out": "なし", "low": "残り少ない", "add": "追加…", "list": "リスト",
            "ranOut": "切れた？", "home": "わが家", "product": "商品", "watch": "時計", "watchOf": "%@の時計",
            "reconnecting": "再接続中…", "noSession": "未ログイン",
        ],
    ]
}
