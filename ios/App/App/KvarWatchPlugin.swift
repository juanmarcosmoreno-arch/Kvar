import Capacitor
import WatchConnectivity

/// Le pasa al Apple Watch lo necesario para sumarse al hogar (dirección de Supabase, clave pública,
/// código de invitación). El reloj después trabaja solo, como un miembro más.
@objc(KvarWatchPlugin)
public class KvarWatchPlugin: CAPPlugin, CAPBridgedPlugin, WCSessionDelegate {
    public let identifier = "KvarWatchPlugin"
    public let jsName = "KvarWatch"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise),
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
        for key in ["supabaseUrl", "supabaseKey", "inviteCode", "householdId", "householdName", "memberName"] {
            context[key] = call.getString(key) ?? ""
        }
        pending = context
        send()
        let session = WCSession.default
        call.resolve(["paired": session.isPaired, "installed": session.isWatchAppInstalled])
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
