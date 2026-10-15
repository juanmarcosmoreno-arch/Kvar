import Capacitor
import UIKit

/// Controlador principal: registra los plugins propios de Kvar.
class KvarViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(KvarCutoutPlugin())
    }
}
