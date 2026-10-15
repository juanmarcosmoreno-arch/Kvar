import Capacitor
import UIKit
import Vision

/// Lee el texto de una foto (ticket del súper) con Vision, en el dispositivo y sin conexión.
/// Devuelve cada pedazo de texto con su caja e inclinación; el armado de renglones se hace en JS.
@objc(KvarOCRPlugin)
public class KvarOCRPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "KvarOCRPlugin"
    public let jsName = "KvarOCR"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "recognize", returnType: CAPPluginReturnPromise),
    ]

    /// Recibe un JPEG en base64 (ya orientado).
    @objc func recognize(_ call: CAPPluginCall) {
        guard let base64 = call.getString("image"),
              let data = Data(base64Encoded: base64),
              let image = UIImage(data: data),
              let cgImage = image.cgImage
        else {
            call.reject("Imagen inválida", "INVALID_IMAGE")
            return
        }
        let width = Double(cgImage.width)
        let height = Double(cgImage.height)

        DispatchQueue.global(qos: .userInitiated).async {
            let request = VNRecognizeTextRequest()
            request.recognitionLevel = .accurate
            // Los tickets son abreviaturas y códigos: la corrección de idioma los «arregla» mal
            request.usesLanguageCorrection = false
            request.minimumTextHeight = 0.004
            if #available(iOS 16.0, *) {
                request.automaticallyDetectsLanguage = false
            }
            if let supported = try? request.supportedRecognitionLanguages() {
                let wanted = ["es-ES", "es-MX", "en-US"].filter { supported.contains($0) }
                if !wanted.isEmpty { request.recognitionLanguages = wanted }
            }

            let handler = VNImageRequestHandler(cgImage: cgImage, orientation: .up, options: [:])
            do {
                try handler.perform([request])
                let boxes: [[String: Any]] = (request.results ?? []).compactMap { observation in
                    guard let candidate = observation.topCandidates(1).first else { return nil }
                    let box = observation.boundingBox // normalizado, origen abajo a la izquierda
                    let topLeft = observation.topLeft
                    let topRight = observation.topRight
                    let dx = Double(topRight.x - topLeft.x) * width
                    let dy = Double(topLeft.y - topRight.y) * height // positiva si baja hacia la derecha
                    return [
                        "text": candidate.string,
                        "x": Double(box.minX),
                        "y": Double(1 - box.maxY),
                        "w": Double(box.width),
                        "h": Double(box.height),
                        "slope": dx > 1 ? dy / dx : 0.0,
                        "confidence": Double(candidate.confidence),
                    ]
                }
                call.resolve(["boxes": boxes, "width": width, "height": height])
            } catch {
                call.reject(error.localizedDescription, "VISION_ERROR", error)
            }
        }
    }
}
