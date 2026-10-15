import Capacitor
import CoreImage
import UIKit
import Vision

/// Recorta el objeto principal de una foto y le quita el fondo (Vision, iOS 17+),
/// igual que «levantar sujeto» en la app Fotos. Todo en el dispositivo.
@objc(KvarCutoutPlugin)
public class KvarCutoutPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "KvarCutoutPlugin"
    public let jsName = "KvarCutout"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cutout", returnType: CAPPluginReturnPromise),
    ]

    private let maxSide: CGFloat = 512

    @objc func isAvailable(_ call: CAPPluginCall) {
        if #available(iOS 17.0, *) {
            call.resolve(["available": true])
        } else {
            call.resolve(["available": false])
        }
    }

    /// Recibe un JPEG en base64 (ya orientado) y devuelve un PNG con transparencia en base64.
    @objc func cutout(_ call: CAPPluginCall) {
        guard #available(iOS 17.0, *) else {
            call.unavailable("Requiere iOS 17 o posterior")
            return
        }
        guard let base64 = call.getString("image"),
              let data = Data(base64Encoded: base64),
              let image = UIImage(data: data),
              let cgImage = image.cgImage
        else {
            call.reject("Imagen inválida", "INVALID_IMAGE")
            return
        }

        DispatchQueue.global(qos: .userInitiated).async {
            do {
                let handler = VNImageRequestHandler(cgImage: cgImage, orientation: .up, options: [:])
                let request = VNGenerateForegroundInstanceMaskRequest()
                try handler.perform([request])

                guard let observation = request.results?.first, !observation.allInstances.isEmpty else {
                    call.reject("No encontré un producto en la foto", "NO_SUBJECT")
                    return
                }

                let buffer = try observation.generateMaskedImage(
                    ofInstances: observation.allInstances,
                    from: handler,
                    croppedToInstancesExtent: true
                )
                let masked = CIImage(cvPixelBuffer: buffer)
                let scale = min(1, self.maxSide / max(masked.extent.width, masked.extent.height))
                let scaled = masked.transformed(by: CGAffineTransform(scaleX: scale, y: scale))

                let context = CIContext()
                guard let output = context.createCGImage(scaled, from: scaled.extent),
                      let png = UIImage(cgImage: output).pngData()
                else {
                    call.reject("No se pudo generar la imagen", "RENDER_FAILED")
                    return
                }

                call.resolve([
                    "image": png.base64EncodedString(),
                    "width": output.width,
                    "height": output.height,
                ])
            } catch {
                call.reject(error.localizedDescription, "VISION_ERROR", error)
            }
        }
    }
}
