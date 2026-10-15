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

    private func apply(_ context: [String: Any]) {
        guard let config = WatchConfig(dict: context) else { return }
        DispatchQueue.main.async { self.onConfig?(config) }
    }
}
