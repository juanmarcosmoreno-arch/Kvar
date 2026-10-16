import Foundation

/// Lo que se puede decir en el reloj: «compré leche y dos paquetes de fideos», «se gastó el café»,
/// «queda poco aceite», «anotá yerba». Mismas reglas que en el iPhone (src/domain/voice.ts), en español e inglés.
enum VoiceKind: Equatable {
    case bought, out, low, list
}

struct VoiceAction: Identifiable {
    let id = UUID()
    var kind: VoiceKind
    /// Como lo dijo la persona («fideos»)
    var spoken: String
    var quantity: Int
    /// Producto del hogar que corresponde (nil = no está en el stock)
    var product: Product?
    var include: Bool
}

enum WatchVoice {
    static func fold(_ s: String) -> String {
        s.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: nil).lowercased()
    }

    private static let verbs: [(String, VoiceKind)] = [
        ("compre|compramos|compro|compraron|traje|trajimos|bought|got|picked up", .bought),
        ("se termino|se terminaron|se acabo|se acabaron|se gasto|se gastaron|gaste|gastamos|no hay mas|no queda|no quedan"
            + "|ran out of|run out of|out of|used up|finished", .out),
        ("queda poco|quedan pocos|quedan pocas|se esta terminando|se estan terminando|casi no hay|running low on|running low|low on", .low),
        ("agrega|agregar|agregame|anota|anotame|pone|poneme|hay que comprar|faltan|falta|add|need|buy", .list),
    ]

    private static let verbRegex: NSRegularExpression = {
        let pattern = verbs.map { "\\b(\($0.0))\\b" }.joined(separator: "|")
        return try! NSRegularExpression(pattern: pattern)
    }()

    private static let filler =
        "\\b(a la lista|en la lista|para la lista|en casa|de nuevo|todavia|ya|tambien|ademas|despues|hoy|por favor"
        + "|to the list|on the list|please|today|again)\\b"

    private static let numbers: [String: Int] = [
        "un": 1, "una": 1, "uno": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5, "seis": 6, "siete": 7, "ocho": 8,
        "nueve": 9, "diez": 10, "once": 11, "doce": 12, "docena": 12,
        "a": 1, "an": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8,
        "nine": 9, "ten": 10, "twelve": 12, "dozen": 12,
    ]
    private static let articles: Set<String> = ["el", "la", "los", "las", "unos", "unas", "de", "del", "mas", "algo", "the", "some", "more", "of"]
    private static let containers: Set<String> = [
        "paquete", "paquetes", "botella", "botellas", "lata", "latas", "caja", "cajas", "bolsa", "bolsas", "frasco",
        "frascos", "kilo", "kilos", "kg", "litro", "litros", "pote", "potes", "rollo", "rollos", "docenas", "unidad",
        "unidades", "pack", "packs", "sobre", "sobres", "sachet", "sachets",
        "bottle", "bottles", "can", "cans", "box", "boxes", "bag", "bags", "jar", "jars", "pound", "pounds", "liter",
        "liters", "roll", "rolls", "packet", "packets",
    ]

    /// Frase → acciones. Sin verbo («leche, yerba») va a la lista.
    static func parse(_ text: String, products: [Product]) -> [VoiceAction] {
        var t = fold(text)
        t = t.replacingOccurrences(of: "[¿?¡!.;:]", with: ",", options: .regularExpression)
        t = t.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression).trimmingCharacters(in: .whitespaces)
        guard !t.isEmpty else { return [] }
        let ns = t as NSString
        let matches = verbRegex.matches(in: t, range: NSRange(location: 0, length: ns.length))

        var segments: [(VoiceKind, String)] = []
        if matches.isEmpty {
            segments.append((.list, t))
        } else {
            for (i, m) in matches.enumerated() {
                var kind = VoiceKind.list
                for g in 0..<verbs.count where m.range(at: g + 1).location != NSNotFound {
                    kind = verbs[g].1
                    break
                }
                let start = m.range.location + m.range.length
                let end = i + 1 < matches.count ? matches[i + 1].range.location : ns.length
                var body = ns.substring(with: NSRange(location: start, length: max(0, end - start)))
                // Lo dicho antes del primer verbo («el aceite se terminó») va con ese verbo
                if i == 0 { body = ns.substring(to: m.range.location) + " , " + body }
                segments.append((kind, body))
            }
        }

        var actions: [VoiceAction] = []
        for (kind, body) in segments {
            let cleaned = body.replacingOccurrences(of: filler, with: " ", options: .regularExpression)
            let parts = cleaned
                .components(separatedBy: ",")
                .flatMap { $0.components(separatedBy: " y ") }
                .flatMap { $0.components(separatedBy: " e ") }
                .flatMap { $0.components(separatedBy: " and ") }
            for part in parts {
                let (quantity, folded) = splitQuantity(part)
                guard folded.count > 1 else { continue }
                let name = original(of: folded, in: text)
                let product = match(name, in: products)
                // «Compré X» de algo que no está en el stock no se puede aplicar: queda destildado
                actions.append(VoiceAction(kind: kind, spoken: name, quantity: quantity, product: product,
                                           include: product != nil || kind != .bought))
            }
        }
        return actions
    }

    /// Lo dicho con sus tildes («cafe» → «café»), buscándolo en la frase original
    private static func original(of folded: String, in text: String) -> String {
        let words = text.components(separatedBy: CharacterSet.alphanumerics.inverted).filter { !$0.isEmpty }
        let size = folded.split(separator: " ").count
        guard size > 0, words.count >= size else { return folded }
        for start in 0...(words.count - size) {
            let window = words[start..<(start + size)].joined(separator: " ")
            if fold(window) == folded { return window.lowercased() }
        }
        return folded
    }

    /// «dos paquetes de fideos» → (2, «fideos»)
    static func splitQuantity(_ raw: String) -> (Int, String) {
        var words = raw.split(separator: " ").map(String.init)
        var quantity = 1
        while let w = words.first, articles.contains(w) { words.removeFirst() }
        if let w = words.first {
            if let n = Int(w) {
                quantity = n
                words.removeFirst()
            } else if let n = numbers[w] {
                quantity = n
                words.removeFirst()
            }
        }
        if let w = words.first, containers.contains(w) { words.removeFirst() }
        while let w = words.first, ["de", "del", "of"].contains(w) { words.removeFirst() }
        return (max(1, quantity), words.joined(separator: " "))
    }

    /// El producto del hogar que mejor coincide con lo dicho (o nil).
    static func match(_ spoken: String, in products: [Product]) -> Product? {
        let s = fold(spoken).trimmingCharacters(in: .whitespaces)
        if let exact = products.first(where: { fold($0.name) == s }) { return exact }
        let said = stems(s)
        guard !said.isEmpty else { return nil }
        var best: Product?
        var bestScore = 0.0
        for product in products {
            let own = stems(fold(product.name))
            guard !own.isEmpty else { continue }
            var score: Double
            if said == own {
                score = 3
            } else if said.isSubset(of: own) {
                score = 2 // «leche» → «Leche entera»
            } else if own.isSubset(of: said) {
                score = 1.8 // «leche entera conaprole» → «Leche»
            } else {
                score = 0.8 * Double(said.intersection(own).count)
            }
            guard score > 0 else { continue }
            score -= Double(product.name.count) / 1000 // a igual puntaje, el nombre más corto
            if score > bestScore {
                bestScore = score
                best = product
            }
        }
        return bestScore >= 0.75 ? best : nil
    }

    private static func stems(_ s: String) -> Set<String> {
        Set(s.split(separator: " ").map { stem(String($0)) }.filter { $0.count >= 3 })
    }

    private static func stem(_ w: String) -> String {
        if w.count > 4, w.hasSuffix("es") { return String(w.dropLast(2)) }
        if w.count > 3, w.hasSuffix("s") { return String(w.dropLast()) }
        return w
    }

    /// «yerba mate» → «Yerba mate»
    static func niceName(_ s: String) -> String {
        let t = s.trimmingCharacters(in: .whitespaces)
        return t.prefix(1).uppercased() + t.dropFirst()
    }
}
