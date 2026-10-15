import Foundation

/// Textos del widget en los idiomas de Stoka (según el idioma del iPhone).
enum WidgetL10n {
    private static let lang: String = {
        for tag in Locale.preferredLanguages {
            let base = String(tag.lowercased().split(separator: "-").first ?? "")
            if table.keys.contains(base) { return base }
            if ["nb", "no", "nn"].contains(base) { return "da" }
        }
        return "en"
    }()

    static func t(_ key: String) -> String { table[lang]?[key] ?? table["es"]![key]! }

    private static let table: [String: [String: String]] = [
        "es": ["list": "Lista", "toBuy": "Falta comprar", "running": "Se está terminando", "nothing": "No falta nada",
               "allGood": "Todo bien", "connect": "Abrí Stoka para conectar.", "description": "La lista y lo que se está terminando."],
        "en": ["list": "List", "toBuy": "To buy", "running": "Running low", "nothing": "Nothing missing",
               "allGood": "All good", "connect": "Open Stoka to connect.", "description": "Your list and what’s running low."],
        "pt": ["list": "Lista", "toBuy": "Falta comprar", "running": "Está acabando", "nothing": "Não falta nada",
               "allGood": "Tudo certo", "connect": "Abra o Stoka para conectar.", "description": "A lista e o que está acabando."],
        "fr": ["list": "Liste", "toBuy": "À acheter", "running": "Bientôt fini", "nothing": "Rien ne manque",
               "allGood": "Tout va bien", "connect": "Ouvrez Stoka pour connecter.", "description": "Votre liste et ce qui est bientôt fini."],
        "it": ["list": "Lista", "toBuy": "Da comprare", "running": "Sta finendo", "nothing": "Non manca niente",
               "allGood": "Tutto a posto", "connect": "Apri Stoka per collegare.", "description": "La lista e ciò che sta finendo."],
        "sv": ["list": "Lista", "toBuy": "Att köpa", "running": "Snart slut", "nothing": "Inget saknas",
               "allGood": "Allt bra", "connect": "Öppna Stoka för att ansluta.", "description": "Listan och det som snart tar slut."],
        "da": ["list": "Liste", "toBuy": "Skal købes", "running": "Næsten tom", "nothing": "Der mangler intet",
               "allGood": "Alt er godt", "connect": "Åbn Stoka for at forbinde.", "description": "Listen og det, der snart slipper op."],
        "zh": ["list": "清单", "toBuy": "要买的", "running": "快用完了", "nothing": "什么都不缺",
               "allGood": "都还有", "connect": "打开 Stoka 以连接。", "description": "购物清单和快用完的东西。"],
        "ja": ["list": "リスト", "toBuy": "買うもの", "running": "残り少ない", "nothing": "足りないものはありません",
               "allGood": "問題なし", "connect": "Stoka を開いて接続してください。", "description": "買い物リストと残り少ないもの。"],
    ]
}
