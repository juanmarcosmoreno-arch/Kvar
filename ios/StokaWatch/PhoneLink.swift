import Foundation
import WatchConnectivity

/// Recibe del iPhone la configuración del hogar.
final class PhoneLink: NSObject, WCSessionDelegate {
    static let shared = PhoneLink()
    var onConfig: ((WatchConfig) -> Void)?

    func activate() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        apply(session.receivedApplicationContext)
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        apply(applicationContext)
    }

    enum TranscribeError: Error {
        case unreachable, permission, failed
    }

    /// «Decime»: el audio grabado en el reloj se pasa a texto en el iPhone (el reloj no tiene reconocimiento propio).
    /// El iPhone no tiene que estar con la app abierta: iOS la despierta.
    func transcribe(_ audio: Data) async throws -> String {
        let session = WCSession.default
        guard session.activationState == .activated, session.isReachable else { throw TranscribeError.unreachable }
        let lang = Locale.preferredLanguages.first ?? "es-UY"
        return try await withCheckedThrowingContinuation { continuation in
            session.sendMessage(["audio": audio, "lang": lang], replyHandler: { reply in
                if let text = reply["text"] as? String, !text.isEmpty {
                    continuation.resume(returning: text)
                } else if reply["error"] as? String == "permission" {
                    continuation.resume(throwing: TranscribeError.permission)
                } else {
                    continuation.resume(throwing: TranscribeError.failed)
                }
            }, errorHandler: { _ in
                continuation.resume(throwing: TranscribeError.unreachable)
            })
        }
    }

    private func apply(_ context: [String: Any]) {
        guard let config = WatchConfig(dict: context) else { return }
        DispatchQueue.main.async { self.onConfig?(config) }
    }
}
