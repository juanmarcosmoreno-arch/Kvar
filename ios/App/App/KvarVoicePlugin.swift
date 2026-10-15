import AVFoundation
import Capacitor
import Speech
#if canImport(FoundationModels)
import FoundationModels
#endif

/// Voz: dictado con el reconocimiento de voz de iOS (en el dispositivo cuando se puede) e
/// interpretación con Apple Intelligence (Foundation Models, iOS 26+). Nada sale del teléfono.
@objc(KvarVoicePlugin)
public class KvarVoicePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "KvarVoicePlugin"
    public let jsName = "KvarVoice"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "availability", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "interpret", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "recipeIdeas", returnType: CAPPluginReturnPromise),
    ]

    private let audioEngine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var lastText = ""

    // MARK: - Disponibilidad

    @objc func availability(_ call: CAPPluginCall) {
        call.resolve([
            "speech": recognizer() != nil,
            "appleIntelligence": appleIntelligenceStatus(),
        ])
    }

    /// available | notEnabled | notEligible | notReady | unsupported
    private func appleIntelligenceStatus() -> String {
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            switch SystemLanguageModel.default.availability {
            case .available:
                return "available"
            case .unavailable(let reason):
                switch reason {
                case .appleIntelligenceNotEnabled: return "notEnabled"
                case .deviceNotEligible: return "notEligible"
                case .modelNotReady: return "notReady"
                @unknown default: return "unsupported"
                }
            }
        }
        #endif
        return "unsupported"
    }

    // MARK: - Dictado

    /// Idioma del dictado: el de la app (lo manda la web, ej. «en-US»); si no, el del teléfono; si no, español.
    private var preferredLocale: String?

    private func recognizer() -> SFSpeechRecognizer? {
        var ids: [String] = []
        if let p = preferredLocale { ids.append(p) }
        ids.append(Locale.current.identifier)
        ids += ["es-UY", "es-AR", "es-419", "es-ES", "es-MX", "en-US"]
        for id in ids {
            if let r = SFSpeechRecognizer(locale: Locale(identifier: id)), r.isAvailable { return r }
        }
        return nil
    }

    @objc func start(_ call: CAPPluginCall) {
        preferredLocale = call.getString("locale")
        SFSpeechRecognizer.requestAuthorization { status in
            guard status == .authorized else {
                call.reject("Stoka no tiene permiso para reconocer la voz. Activalo en Ajustes → Stoka.", "SPEECH_DENIED")
                return
            }
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                guard granted else {
                    call.reject("Stoka no tiene permiso para usar el micrófono. Activalo en Ajustes → Stoka.", "MIC_DENIED")
                    return
                }
                DispatchQueue.main.async {
                    do {
                        try self.begin()
                        call.resolve()
                    } catch {
                        self.finish()
                        call.reject(error.localizedDescription, "START_FAILED")
                    }
                }
            }
        }
    }

    private func begin() throws {
        task?.cancel()
        task = nil
        guard let rec = recognizer() else {
            throw NSError(domain: "Stoka", code: 1, userInfo: [NSLocalizedDescriptionKey: "El reconocimiento de voz no está disponible."])
        }
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.record, mode: .measurement, options: .duckOthers)
        try session.setActive(true, options: .notifyOthersOnDeactivation)

        let req = SFSpeechAudioBufferRecognitionRequest()
        req.shouldReportPartialResults = true
        if rec.supportsOnDeviceRecognition { req.requiresOnDeviceRecognition = true }
        request = req
        lastText = ""

        let input = audioEngine.inputNode
        input.removeTap(onBus: 0)
        input.installTap(onBus: 0, bufferSize: 1024, format: input.outputFormat(forBus: 0)) { [weak self] buffer, _ in
            self?.request?.append(buffer)
        }
        audioEngine.prepare()
        try audioEngine.start()

        task = rec.recognitionTask(with: req) { [weak self] result, error in
            guard let self = self else { return }
            if let result = result {
                self.lastText = result.bestTranscription.formattedString
                self.notifyListeners("partial", data: ["text": self.lastText, "final": result.isFinal])
            }
            if error != nil || (result?.isFinal ?? false) { self.finish() }
        }
    }

    private func finish() {
        if audioEngine.isRunning { audioEngine.stop() }
        audioEngine.inputNode.removeTap(onBus: 0)
        request?.endAudio()
        request = nil
        task = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    @objc func stop(_ call: CAPPluginCall) {
        request?.endAudio()
        if audioEngine.isRunning { audioEngine.stop() }
        // Un instante para que llegue el resultado final
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
            let text = self.lastText
            self.task?.cancel()
            self.finish()
            call.resolve(["text": text])
        }
    }

    // MARK: - Apple Intelligence

    @objc func interpret(_ call: CAPPluginCall) {
        guard let text = call.getString("text"), !text.isEmpty else {
            call.reject("Falta el texto", "NO_TEXT")
            return
        }
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            guard case .available = SystemLanguageModel.default.availability else {
                call.unavailable("Apple Intelligence no está disponible")
                return
            }
            Task {
                do {
                    let session = LanguageModelSession(instructions: """
                    Sos el asistente de Stoka, una app para el stock de la casa.
                    Convertí lo que dice la persona en acciones sobre productos de la casa.
                    No inventes productos que no dijo. El producto va sin cantidad ni envase
                    («dos paquetes de fideos» → producto «fideos», cantidad 2).
                    La persona puede hablar en cualquier idioma: escribí el producto en el mismo idioma
                    en que lo dijo («two cartons of milk» → producto «milk», cantidad 2).
                    """)
                    let response = try await session.respond(to: text, generating: StokaVoiceCommand.self)
                    let actions = response.content.actions.map { action in
                        ["kind": action.kind, "product": action.product, "quantity": max(1, action.quantity)] as [String: Any]
                    }
                    call.resolve(["actions": actions])
                } catch {
                    call.reject(error.localizedDescription, "MODEL_ERROR", error)
                }
            }
            return
        }
        #endif
        call.unavailable("Apple Intelligence no está disponible")
    }

    /// «Pensar recetas con lo que hay»: ideas nuevas con los productos que hay, en el idioma de la app.
    @objc func recipeIdeas(_ call: CAPPluginCall) {
        let have = call.getArray("have", String.self) ?? []
        let expiring = call.getArray("expiring", String.self) ?? []
        let avoid = call.getArray("avoid", String.self) ?? []
        let servings = call.getInt("servings") ?? 2
        let language = call.getString("language") ?? "español"
        guard !have.isEmpty else {
            call.reject("No hay productos", "NO_PRODUCTS")
            return
        }
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            guard case .available = SystemLanguageModel.default.availability else {
                call.unavailable("Apple Intelligence no está disponible")
                return
            }
            Task {
                do {
                    let session = LanguageModelSession(instructions: """
                    Sos un cocinero casero práctico. Proponés comidas simples y ricas para el día a día,
                    usando lo que hay en la casa. Se puede dar por hecho que hay sal, pimienta, aceite y agua.
                    Escribí todo (títulos, ingredientes y pasos) en \(language).
                    """)
                    var prompt = "Lo que hay en la casa: \(have.joined(separator: ", ")).\n"
                    if !expiring.isEmpty { prompt += "Conviene usar primero lo que vence pronto: \(expiring.joined(separator: ", ")).\n" }
                    if !avoid.isEmpty { prompt += "No repitas estas recetas: \(avoid.joined(separator: ", ")).\n" }
                    prompt += "Proponé 3 recetas distintas para \(servings) personas que usen casi solo lo que hay. "
                    prompt += "Las cantidades son para \(servings) personas."
                    let response = try await session.respond(to: prompt, generating: StokaRecipeIdeas.self)
                    let recipes = response.content.recipes.prefix(3).map { r -> [String: Any] in
                        [
                            "title": r.title,
                            "minutes": max(5, r.minutes),
                            "ingredients": r.ingredients.map { i in
                                ["name": i.name, "quantity": max(0, i.quantity), "unit": i.unit] as [String: Any]
                            },
                            "steps": r.steps,
                        ]
                    }
                    call.resolve(["recipes": Array(recipes)])
                } catch {
                    call.reject(error.localizedDescription, "MODEL_ERROR", error)
                }
            }
            return
        }
        #endif
        call.unavailable("Apple Intelligence no está disponible")
    }
}

#if canImport(FoundationModels)
@available(iOS 26.0, *)
@Generable
struct StokaRecipeIdeas {
    @Guide(description: "Tres recetas distintas")
    var recipes: [StokaRecipeIdea]
}

@available(iOS 26.0, *)
@Generable
struct StokaRecipeIdea {
    @Guide(description: "Nombre corto del plato")
    var title: String
    @Guide(description: "Minutos totales de preparación")
    var minutes: Int
    @Guide(description: "Ingredientes con cantidades para todas las personas")
    var ingredients: [StokaIdeaIngredient]
    @Guide(description: "Pasos cortos, en orden")
    var steps: [String]
}

@available(iOS 26.0, *)
@Generable
struct StokaIdeaIngredient {
    @Guide(description: "Nombre común del ingrediente, sin cantidad")
    var name: String
    @Guide(description: "Cantidad; 0 si es a gusto")
    var quantity: Double
    @Guide(description: "Una de: g, ml, u (unidades), taza, cda (cucharada), cdita (cucharadita), diente, lata, paquete, a_gusto")
    var unit: String
}
@available(iOS 26.0, *)
@Generable
struct StokaVoiceCommand {
    @Guide(description: "Acciones que pidió la persona, en el orden en que las dijo")
    var actions: [StokaVoiceAction]
}

@available(iOS 26.0, *)
@Generable
struct StokaVoiceAction {
    @Guide(description: "Una de estas palabras: compre (compró o trajo algo), se_termino (se terminó, no hay más), queda_poco (se está terminando), pregunta (pregunta si hay algo), agregar_lista (quiere anotarlo en la lista de compras)")
    var kind: String
    @Guide(description: "El producto como lo dijo, sin cantidad ni envase. Ejemplos: leche, fideos, yerba, papel higiénico")
    var product: String
    @Guide(description: "Cantidad que dijo; 1 si no dijo ninguna")
    var quantity: Int
}
#endif
