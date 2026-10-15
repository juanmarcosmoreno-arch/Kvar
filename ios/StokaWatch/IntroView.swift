import SwiftUI
import UIKit

/// Bienvenida del reloj: la misma animación de la app (la casa se llena), cuadro a cuadro.
/// Sale solo la primera vez; un toque la saltea.
struct IntroView: View {
    let onDone: () -> Void

    private static let frameCount = 58
    private static let fps = 12.0

    @State private var frames: [UIImage] = []
    @State private var index = 0
    @State private var finished = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            if let image = frames.isEmpty ? nil : frames[min(index, frames.count - 1)] {
                // El video tiene fondo blanco: va sobre una tarjeta blanca, como en modo oscuro
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .padding(6)
                    .background(Color.white)
                    .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
                    .padding(8)
                    .accessibilityLabel("Stoka")
            }
        }
        .contentShape(Rectangle())
        .onTapGesture(perform: finish)
        .task { await play() }
    }

    private func play() async {
        frames = (1...Self.frameCount).compactMap { i in
            UIImage(named: String(format: "stoka-intro-%02d.jpg", i))
        }
        // Si los cuadros no se copiaron al target, no se traba: sigue de largo
        guard !frames.isEmpty else { return finish() }
        let step = UInt64(1_000_000_000 / Self.fps)
        for i in frames.indices {
            if finished { return }
            index = i
            try? await Task.sleep(nanoseconds: step)
        }
        try? await Task.sleep(nanoseconds: 450_000_000)
        finish()
    }

    private func finish() {
        guard !finished else { return }
        finished = true
        withAnimation(.easeOut(duration: 0.3)) { onDone() }
    }
}
