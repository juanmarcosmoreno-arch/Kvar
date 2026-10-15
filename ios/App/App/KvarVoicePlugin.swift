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

    private func recognizer() -> SFSpeechRecognizer? {
        for id in ["es-UY", "es-AR", "es-419", "es-ES", "es-MX"] {
            if let r = SFSpeechRecognizer(locale: Locale(identifier: id)), r.isAvailable { return r }
        }
        return nil
    }

    @objc func start(_ call: CAPPluginCall) {
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
                    Sos el asistente de Stoka, una app para el stock de la casa, en Uruguay.
                    Convertí lo que dice la persona en acciones sobre productos de la casa.
                    No inventes productos que no dijo. El producto va sin cantidad ni envase
                    («dos paquetes de fideos» → producto «fideos», cantidad 2).
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
}

#if canImport(FoundationModels)
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
