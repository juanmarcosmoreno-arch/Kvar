import AVFoundation
import Combine
import Foundation

/// Graba lo que decís en «Decime». Corta solo cuando dejás de hablar (o a los 15 segundos).
@MainActor
final class VoiceRecorder: ObservableObject {
    /// 0…1, para la animación del micrófono
    @Published var level: Double = 0
    @Published var recording = false

    private var recorder: AVAudioRecorder?
    private var timer: Timer?
    private var heardVoice = false
    private var quietSince: Date?
    private var onAutoStop: (() -> Void)?
    private let url = FileManager.default.temporaryDirectory.appendingPathComponent("stoka-decime.m4a")

    /// Sin el permiso del micrófono declarado en el Info del reloj, grabar cerraría la app: se usa el teclado.
    static var canRecord: Bool {
        Bundle.main.object(forInfoDictionaryKey: "NSMicrophoneUsageDescription") != nil
    }

    func start(onAutoStop: @escaping () -> Void) async -> Bool {
        guard Self.canRecord, await Self.permission() else { return false }
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .default)
            try session.setActive(true)
            let settings: [String: Any] = [
                AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
                AVSampleRateKey: 16_000,
                AVNumberOfChannelsKey: 1,
                AVEncoderBitRateKey: 24_000,
            ]
            try? FileManager.default.removeItem(at: url)
            let recorder = try AVAudioRecorder(url: url, settings: settings)
            recorder.isMeteringEnabled = true
            guard recorder.record(forDuration: 15) else { return false }
            self.recorder = recorder
            self.onAutoStop = onAutoStop
            heardVoice = false
            quietSince = nil
            recording = true
            timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
                Task { @MainActor in self?.tick() }
            }
            return true
        } catch {
            return false
        }
    }

    private func tick() {
        guard let recorder else { return }
        if !recorder.isRecording {
            // Llegó a los 15 segundos
            onAutoStop?()
            return
        }
        recorder.updateMeters()
        let db = Double(recorder.averagePower(forChannel: 0)) // -160…0
        level = max(0, min(1, (db + 50) / 50))
        if db > -32 {
            heardVoice = true
            quietSince = nil
        } else if heardVoice {
            quietSince = quietSince ?? Date()
            if let since = quietSince, Date().timeIntervalSince(since) > 1.4 { onAutoStop?() }
        }
    }

    /// Termina y devuelve el audio (nil si no se grabó nada).
    func stop() -> Data? {
        timer?.invalidate()
        timer = nil
        onAutoStop = nil
        recorder?.stop()
        recorder = nil
        recording = false
        level = 0
        try? AVAudioSession.sharedInstance().setActive(false)
        guard let data = try? Data(contentsOf: url), data.count > 1_000 else { return nil }
        return data
    }

    func cancel() {
        _ = stop()
    }

    private static func permission() async -> Bool {
        if #available(watchOS 10.0, *) {
            return await AVAudioApplication.requestRecordPermission()
        }
        return await withCheckedContinuation { continuation in
            AVAudioSession.sharedInstance().requestRecordPermission { continuation.resume(returning: $0) }
        }
    }
}
