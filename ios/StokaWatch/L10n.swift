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
    static var speak: String { t("speak") }
    static var voicePrompt: String { t("voicePrompt") }
    static var atStore: String { t("atStore") }
    static func left(_ n: Int) -> String { t(n == 1 ? "left1" : "left").replacingOccurrences(of: "%d", with: "\(n)") }
    static func inCart(_ n: Int) -> String { t("inCart").replacingOccurrences(of: "%d", with: "\(n)") }
    static var allDone: String { t("allDone") }
    static var tickStockHint: String { t("tickStock") }
    static var tickCheckHint: String { t("tickCheck") }
    static var tapToUndo: String { t("tapToUndo") }
    static var heard: String { t("heard") }
    static var confirm: String { t("confirm") }
    static var saving: String { t("saving") }
    static var didntGet: String { t("didntGet") }
    static var kindBought: String { t("kindBought") }
    static var kindOut: String { t("kindOut") }
    static var kindLow: String { t("kindLow") }
    static var kindList: String { t("kindList") }
    static var notFound: String { t("notFound") }
    static var newItem: String { t("newItem") }

    private static let table: [String: [String: String]] = [
        "es": [
            "openPhone": "Abrí Stoka en el iPhone para conectar el reloj.", "connecting": "Conectando…", "retry": "Reintentar",
            "nothingMissing": "No falta nada", "out": "No hay", "low": "Queda poco", "add": "Agregar…", "list": "Lista",
            "ranOut": "¿Se terminó?", "home": "Casa", "product": "Producto", "watch": "Reloj", "watchOf": "Reloj de %@",
            "reconnecting": "Reconectando…", "noSession": "Sin sesión",
            "speak": "Decime",
            "voicePrompt": "Ej.: compré leche, se gastó el café",
            "atStore": "En el súper",
            "left": "Faltan %d",
            "left1": "Falta 1",
            "inCart": "En el carrito (%d)",
            "allDone": "¡Listo! No falta nada",
            "tickStock": "Al tachar, pasa a «Hay».",
            "tickCheck": "Al tachar, solo se tacha: el stock lo cargás después.",
            "tapToUndo": "Tocá para deshacer.",
            "heard": "Entendí",
            "confirm": "Confirmar",
            "saving": "Guardando…",
            "didntGet": "No entendí. Probá: «compré leche» o «se terminó el café».",
            "kindBought": "Compraste",
            "kindOut": "Se terminó",
            "kindLow": "Queda poco",
            "kindList": "A la lista",
            "notFound": "No lo encontré en el stock",
            "newItem": "nuevo",
        ],
        "en": [
            "openPhone": "Open Stoka on your iPhone to connect the watch.", "connecting": "Connecting…", "retry": "Try again",
            "nothingMissing": "Nothing missing", "out": "Out", "low": "Running low", "add": "Add…", "list": "List",
            "ranOut": "Ran out?", "home": "Home", "product": "Product", "watch": "Watch", "watchOf": "%@’s Watch",
            "reconnecting": "Reconnecting…", "noSession": "Not signed in",
            "speak": "Tell me",
            "voicePrompt": "E.g. bought milk, ran out of coffee",
            "atStore": "At the store",
            "left": "%d left",
            "left1": "1 left",
            "inCart": "In the cart (%d)",
            "allDone": "Done! Nothing missing",
            "tickStock": "Ticking off marks it “In stock”.",
            "tickCheck": "Ticking off only ticks it: update stock later.",
            "tapToUndo": "Tap to undo.",
            "heard": "I heard",
            "confirm": "Confirm",
            "saving": "Saving…",
            "didntGet": "I didn’t get that. Try “bought milk” or “ran out of coffee”.",
            "kindBought": "Bought",
            "kindOut": "Ran out",
            "kindLow": "Running low",
            "kindList": "To the list",
            "notFound": "Not in your stock",
            "newItem": "new",
        ],
        "pt": [
            "openPhone": "Abra o Stoka no iPhone para conectar o relógio.", "connecting": "Conectando…", "retry": "Tentar de novo",
            "nothingMissing": "Não falta nada", "out": "Acabou", "low": "Está acabando", "add": "Adicionar…", "list": "Lista",
            "ranOut": "Acabou?", "home": "Casa", "product": "Produto", "watch": "Relógio", "watchOf": "Relógio de %@",
            "reconnecting": "Reconectando…", "noSession": "Sem sessão",
            "speak": "Fale",
            "voicePrompt": "Ex.: comprei leite, acabou o café",
            "atStore": "No mercado",
            "left": "Faltam %d",
            "left1": "Falta 1",
            "inCart": "No carrinho (%d)",
            "allDone": "Pronto! Não falta nada",
            "tickStock": "Ao marcar, passa para «Tem».",
            "tickCheck": "Ao marcar, só marca: o estoque você atualiza depois.",
            "tapToUndo": "Toque para desfazer.",
            "heard": "Entendi",
            "confirm": "Confirmar",
            "saving": "Salvando…",
            "didntGet": "Não entendi. Tente: «comprei leite» ou «acabou o café».",
            "kindBought": "Comprou",
            "kindOut": "Acabou",
            "kindLow": "Está acabando",
            "kindList": "Para a lista",
            "notFound": "Não está no estoque",
            "newItem": "novo",
        ],
        "fr": [
            "openPhone": "Ouvrez Stoka sur l’iPhone pour connecter la montre.", "connecting": "Connexion…", "retry": "Réessayer",
            "nothingMissing": "Rien ne manque", "out": "Épuisé", "low": "Bientôt fini", "add": "Ajouter…", "list": "Liste",
            "ranOut": "C’est fini ?", "home": "Maison", "product": "Produit", "watch": "Montre", "watchOf": "Montre de %@",
            "reconnecting": "Reconnexion…", "noSession": "Non connecté",
            "speak": "Dites-moi",
            "voicePrompt": "Ex. : acheté du lait, plus de café",
            "atStore": "Au magasin",
            "left": "Encore %d",
            "left1": "Encore 1",
            "inCart": "Dans le chariot (%d)",
            "allDone": "C’est fait ! Rien ne manque",
            "tickStock": "Cocher le passe à « En stock ».",
            "tickCheck": "Cocher coche seulement : le stock se met à jour plus tard.",
            "tapToUndo": "Touchez pour annuler.",
            "heard": "J’ai compris",
            "confirm": "Confirmer",
            "saving": "Enregistrement…",
            "didntGet": "Je n’ai pas compris. Essayez « acheté du lait ».",
            "kindBought": "Acheté",
            "kindOut": "Épuisé",
            "kindLow": "Bientôt fini",
            "kindList": "À la liste",
            "notFound": "Pas dans votre stock",
            "newItem": "nouveau",
        ],
        "it": [
            "openPhone": "Apri Stoka sull’iPhone per collegare l’orologio.", "connecting": "Connessione…", "retry": "Riprova",
            "nothingMissing": "Non manca niente", "out": "Finito", "low": "Sta finendo", "add": "Aggiungi…", "list": "Lista",
            "ranOut": "È finito?", "home": "Casa", "product": "Prodotto", "watch": "Orologio", "watchOf": "Orologio di %@",
            "reconnecting": "Riconnessione…", "noSession": "Non connesso",
            "speak": "Dimmi",
            "voicePrompt": "Es.: comprato latte, finito il caffè",
            "atStore": "Al supermercato",
            "left": "Ne mancano %d",
            "left1": "Ne manca 1",
            "inCart": "Nel carrello (%d)",
            "allDone": "Fatto! Non manca niente",
            "tickStock": "Spuntando passa a «C’è».",
            "tickCheck": "Spuntando si spunta solo: la dispensa la aggiorni dopo.",
            "tapToUndo": "Tocca per annullare.",
            "heard": "Ho capito",
            "confirm": "Conferma",
            "saving": "Salvataggio…",
            "didntGet": "Non ho capito. Prova «comprato latte».",
            "kindBought": "Comprato",
            "kindOut": "Finito",
            "kindLow": "Sta finendo",
            "kindList": "In lista",
            "notFound": "Non è in dispensa",
            "newItem": "nuovo",
        ],
        "sv": [
            "openPhone": "Öppna Stoka på iPhone för att ansluta klockan.", "connecting": "Ansluter…", "retry": "Försök igen",
            "nothingMissing": "Inget saknas", "out": "Slut", "low": "Snart slut", "add": "Lägg till…", "list": "Lista",
            "ranOut": "Tog det slut?", "home": "Hemma", "product": "Vara", "watch": "Klocka", "watchOf": "%@s klocka",
            "reconnecting": "Ansluter igen…", "noSession": "Inte inloggad",
            "speak": "Säg det",
            "voicePrompt": "T.ex. köpte mjölk, kaffet är slut",
            "atStore": "I butiken",
            "left": "%d kvar",
            "left1": "1 kvar",
            "inCart": "I vagnen (%d)",
            "allDone": "Klart! Inget saknas",
            "tickStock": "När du bockar av blir det ”Finns”.",
            "tickCheck": "Avbockning bockar bara av: uppdatera förrådet senare.",
            "tapToUndo": "Tryck för att ångra.",
            "heard": "Jag hörde",
            "confirm": "Bekräfta",
            "saving": "Sparar…",
            "didntGet": "Jag förstod inte. Prova ”bought milk”.",
            "kindBought": "Köpt",
            "kindOut": "Slut",
            "kindLow": "Snart slut",
            "kindList": "Till listan",
            "notFound": "Finns inte i förrådet",
            "newItem": "ny",
        ],
        "da": [
            "openPhone": "Åbn Stoka på iPhone for at forbinde uret.", "connecting": "Forbinder…", "retry": "Prøv igen",
            "nothingMissing": "Der mangler intet", "out": "Tom", "low": "Næsten tom", "add": "Tilføj…", "list": "Liste",
            "ranOut": "Sluppet op?", "home": "Hjem", "product": "Vare", "watch": "Ur", "watchOf": "%@s ur",
            "reconnecting": "Forbinder igen…", "noSession": "Ikke logget ind",
            "speak": "Sig det",
            "voicePrompt": "F.eks. købte mælk, kaffen er sluppet op",
            "atStore": "I butikken",
            "left": "%d tilbage",
            "left1": "1 tilbage",
            "inCart": "I kurven (%d)",
            "allDone": "Færdig! Intet mangler",
            "tickStock": "Når du krydser af, bliver det ”Der er”.",
            "tickCheck": "Afkrydsning krydser kun af: opdater lageret senere.",
            "tapToUndo": "Tryk for at fortryde.",
            "heard": "Jeg hørte",
            "confirm": "Bekræft",
            "saving": "Gemmer…",
            "didntGet": "Det forstod jeg ikke. Prøv ”bought milk”.",
            "kindBought": "Købt",
            "kindOut": "Sluppet op",
            "kindLow": "Næsten tom",
            "kindList": "På listen",
            "notFound": "Ikke på lageret",
            "newItem": "ny",
        ],
        "zh": [
            "openPhone": "在 iPhone 上打开 Stoka 以连接手表。", "connecting": "正在连接…", "retry": "重试",
            "nothingMissing": "什么都不缺", "out": "没有了", "low": "快用完了", "add": "添加…", "list": "清单",
            "ranOut": "用完了？", "home": "家", "product": "商品", "watch": "手表", "watchOf": "%@的手表",
            "reconnecting": "正在重新连接…", "noSession": "未登录",
            "speak": "说给我听",
            "voicePrompt": "例如：bought milk",
            "atStore": "在超市",
            "left": "还差 %d 件",
            "left1": "还差 1 件",
            "inCart": "购物车（%d）",
            "allDone": "都买齐了！",
            "tickStock": "勾选后变为“有”。",
            "tickCheck": "勾选只是勾掉：库存之后再更新。",
            "tapToUndo": "轻点可撤销。",
            "heard": "我听到的",
            "confirm": "确认",
            "saving": "正在保存…",
            "didntGet": "没听懂。试试“bought milk”。",
            "kindBought": "买了",
            "kindOut": "用完了",
            "kindLow": "快用完了",
            "kindList": "加入清单",
            "notFound": "库存里没有",
            "newItem": "新",
        ],
        "ja": [
            "openPhone": "iPhone で Stoka を開いて時計と接続してください。", "connecting": "接続中…", "retry": "再試行",
            "nothingMissing": "足りないものはありません", "out": "なし", "low": "残り少ない", "add": "追加…", "list": "リスト",
            "ranOut": "切れた？", "home": "わが家", "product": "商品", "watch": "時計", "watchOf": "%@の時計",
            "reconnecting": "再接続中…", "noSession": "未ログイン",
            "speak": "話しかける",
            "voicePrompt": "例：bought milk",
            "atStore": "買い物中",
            "left": "残り%d件",
            "left1": "残り1件",
            "inCart": "カート（%d）",
            "allDone": "全部そろいました！",
            "tickStock": "チェックすると「ある」になります。",
            "tickCheck": "チェックするだけ：在庫はあとで反映します。",
            "tapToUndo": "タップで取り消し。",
            "heard": "聞き取った内容",
            "confirm": "確定",
            "saving": "保存中…",
            "didntGet": "聞き取れませんでした。「bought milk」のように話してください。",
            "kindBought": "買った",
            "kindOut": "切れた",
            "kindLow": "残り少ない",
            "kindList": "リストへ",
            "notFound": "在庫にありません",
            "newItem": "新規",
        ],
    ]
}
