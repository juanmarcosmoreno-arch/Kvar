import Combine
import SwiftUI
import WatchKit

private let brandGreen = Color(red: 0.36, green: 0.73, blue: 0.48)

struct RootView: View {
    @EnvironmentObject var store: WatchStore

    var body: some View {
        switch store.phase {
        case .needsPhone:
            Message(icon: "iphone", text: L10n.openPhone)
        case .connecting:
            ProgressView(L10n.connecting)
        case .failed(let message):
            VStack(spacing: 8) {
                Message(icon: "exclamationmark.triangle", text: message)
                Button(L10n.retry) { Task { await store.connect() } }
            }
        case .ready:
            HomeView()
        }
    }
}

struct Message: View {
    let icon: String
    let text: String
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon).font(.title2)
            Text(text).font(.footnote).multilineTextAlignment(.center)
        }
        .padding()
    }
}

/// Inicio: «Decime» (voz), «En el súper» (la lista para ir tachando) y «¿Se terminó?».
struct HomeView: View {
    @EnvironmentObject var store: WatchStore
    @State private var listening = false
    @State private var spoken = ""
    @State private var heard: [VoiceAction] = []
    @State private var confirming = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 10) {
                    Button {
                        listening = true
                    } label: {
                        Label(L10n.speak, systemImage: "mic.fill")
                            .font(.headline)
                            .frame(maxWidth: .infinity, minHeight: 44)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(brandGreen)

                    NavigationLink {
                        SuperView()
                    } label: {
                        HStack {
                            Image(systemName: "cart.fill").foregroundStyle(brandGreen)
                            Text(L10n.atStore)
                            Spacer(minLength: 4)
                            Text("\(store.items.count)").font(.headline).foregroundStyle(brandGreen)
                        }
                        .frame(minHeight: 40)
                    }

                    NavigationLink {
                        RanOutView()
                    } label: {
                        HStack {
                            Image(systemName: "minus.circle").foregroundStyle(.orange)
                            Text(L10n.ranOut)
                            Spacer(minLength: 0)
                        }
                        .frame(minHeight: 40)
                    }
                }
            }
            .navigationTitle(store.householdName)
            .navigationDestination(isPresented: $confirming) {
                VoiceConfirmView(spoken: spoken, actions: $heard)
            }
            .sheet(isPresented: $listening) {
                ListeningView { text in
                    spoken = text
                    heard = WatchVoice.parse(text, products: store.products)
                    // Después de que se cierra la pantalla del micrófono
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { confirming = true }
                }
                .environmentObject(store)
            }
        }
        .task { await store.reloadQuietly() }
    }
}

/// El micrófono, de una: grabo lo que decís, corto solo cuando terminás y el iPhone lo pasa a texto.
struct ListeningView: View {
    enum Stage: Equatable { case starting, listening, thinking, failed(String) }

    @Environment(\.dismiss) private var dismiss
    @StateObject private var recorder = VoiceRecorder()
    @State private var stage: Stage = .starting
    let onText: (String) -> Void

    var body: some View {
        VStack(spacing: 10) {
            switch stage {
            case .starting, .listening:
                ZStack {
                    Circle()
                        .fill(brandGreen.opacity(0.25))
                        .frame(width: 70 + 50 * recorder.level, height: 70 + 50 * recorder.level)
                    Circle().fill(brandGreen).frame(width: 64, height: 64)
                    Image(systemName: "mic.fill").font(.title2).foregroundStyle(.white)
                }
                .frame(height: 120)
                .animation(.easeOut(duration: 0.1), value: recorder.level)
                Text(L10n.listening).font(.footnote).foregroundStyle(.secondary)
                Button(L10n.done) { finish() }
                    .tint(brandGreen)
            case .thinking:
                ProgressView()
                Text(L10n.thinking).font(.footnote)
            case .failed(let message):
                Text(message).font(.footnote).multilineTextAlignment(.center)
                Button(L10n.tryAgain) { Task { await begin() } }
                    .tint(brandGreen)
                TextFieldLink(prompt: Text(L10n.voicePrompt)) {
                    Label(L10n.typeInstead, systemImage: "keyboard")
                } onSubmit: { text in
                    onText(text)
                    dismiss()
                }
            }
        }
        .task { await begin() }
        .onDisappear { recorder.cancel() }
    }

    private func begin() async {
        stage = .starting
        if await recorder.start(onAutoStop: { finish() }) {
            stage = .listening
            WKInterfaceDevice.current().play(.start)
        } else {
            stage = .failed(VoiceRecorder.canRecord ? L10n.micDenied : L10n.micMissing)
        }
    }

    private func finish() {
        guard stage == .listening else { return }
        WKInterfaceDevice.current().play(.stop)
        guard let audio = recorder.stop() else {
            stage = .failed(L10n.didntHear)
            return
        }
        stage = .thinking
        Task {
            do {
                let text = try await PhoneLink.shared.transcribe(audio)
                onText(text)
                dismiss()
            } catch PhoneLink.TranscribeError.permission {
                stage = .failed(L10n.needSpeechPermission)
            } catch PhoneLink.TranscribeError.unreachable {
                stage = .failed(L10n.phoneUnreachable)
            } catch {
                stage = .failed(L10n.didntHear)
            }
        }
    }
}

/// Lo que entendí de lo que dijiste: se puede destildar algo y se confirma todo junto.
struct VoiceConfirmView: View {
    @EnvironmentObject var store: WatchStore
    @Environment(\.dismiss) private var dismiss
    let spoken: String
    @Binding var actions: [VoiceAction]
    @State private var busy = false

    var body: some View {
        List {
            if !spoken.isEmpty {
                Text("«\(spoken)»").font(.footnote).foregroundStyle(.secondary)
            }
            if actions.isEmpty {
                Text(L10n.didntGet).font(.footnote)
            }
            ForEach($actions) { $action in
                Button {
                    action.include.toggle()
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: action.include ? "checkmark.circle.fill" : "circle")
                            .foregroundStyle(action.include ? brandGreen : .secondary)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(action.product?.name ?? WatchVoice.niceName(action.spoken)).lineLimit(2)
                            Text(detail(action)).font(.caption2).foregroundStyle(color(action))
                        }
                    }
                }
            }
            if actions.contains(where: \.include) {
                Button {
                    busy = true
                    Task {
                        await store.apply(actions)
                        busy = false
                        dismiss()
                    }
                } label: {
                    Text(busy ? L10n.saving : L10n.confirm).frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(brandGreen)
                .disabled(busy)
            }
        }
        .navigationTitle(L10n.heard)
    }

    private func detail(_ a: VoiceAction) -> String {
        if a.kind == .bought && a.product == nil { return L10n.notFound }
        var text: String
        switch a.kind {
        case .bought: text = L10n.kindBought
        case .out: text = L10n.kindOut
        case .low: text = L10n.kindLow
        case .list: text = L10n.kindList
        }
        if a.quantity > 1 { text += " · ×\(a.quantity)" }
        if a.product == nil { text += " · " + L10n.newItem }
        return text
    }

    private func color(_ a: VoiceAction) -> Color {
        switch a.kind {
        case .bought: return a.product == nil ? .secondary : brandGreen
        case .out: return .red
        case .low: return .orange
        case .list: return .secondary
        }
    }
}

/// En el súper: la lista en el orden en que se recorre; tocar = tachar (y se puede deshacer).
struct SuperView: View {
    @EnvironmentObject var store: WatchStore

    var body: some View {
        List {
            Section {
                if store.items.isEmpty {
                    Label(L10n.allDone, systemImage: "checkmark.seal.fill").foregroundStyle(brandGreen)
                }
                ForEach(store.items) { item in
                    Button {
                        Task { await store.tick(item) }
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "circle").font(.title3).foregroundStyle(.secondary)
                            VStack(alignment: .leading, spacing: 1) {
                                Text(item.title).lineLimit(2)
                                if item.reason == "out" {
                                    Text(L10n.out).font(.caption2).foregroundStyle(.red)
                                } else if item.reason == "low" {
                                    Text(L10n.low).font(.caption2).foregroundStyle(.orange)
                                }
                            }
                            Spacer(minLength: 0)
                            if let q = item.quantity, q > 1 {
                                Text("×\(q)").foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
                TextFieldLink(prompt: Text(L10n.addPlaceholder)) {
                    Label(L10n.addPlaceholder, systemImage: "plus")
                } onSubmit: { text in
                    Task { await store.add(text) }
                }
            } header: {
                Text(L10n.left(store.items.count))
            } footer: {
                Text(store.onlyCheck ? L10n.tickCheckHint : L10n.tickStockHint)
            }

            if !store.cart.isEmpty {
                Section {
                    ForEach(store.cart) { entry in
                        Button {
                            Task { await store.untick(entry) }
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: "checkmark.circle.fill").foregroundStyle(brandGreen)
                                Text(entry.item.title).strikethrough().foregroundStyle(.secondary).lineLimit(2)
                            }
                        }
                    }
                } header: {
                    Text(L10n.inCart(store.cart.count))
                } footer: {
                    Text(L10n.tapToUndo)
                }
            }
        }
        .navigationTitle(L10n.atStore)
        .refreshable { await store.reloadQuietly() }
        .task {
            // Lo que agregan los demás mientras estás en el súper
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 20_000_000_000)
                await store.reloadQuietly()
            }
        }
    }
}

/// «¿Se terminó algo?»: un toque y va a la lista. Los básicos primero.
struct RanOutView: View {
    @EnvironmentObject var store: WatchStore

    private var candidates: [Product] {
        store.products
            .filter { $0.status != "out" }
            .sorted { ($0.is_staple ? 0 : 1, $0.name) < ($1.is_staple ? 0 : 1, $1.name) }
    }

    var body: some View {
        List(candidates) { product in
            Button {
                Task { await store.ranOut(product) }
            } label: {
                HStack {
                    Text(product.name).lineLimit(2)
                    Spacer()
                    if product.status == "low" {
                        Circle().fill(.orange).frame(width: 8, height: 8)
                    }
                }
            }
        }
        .navigationTitle(L10n.ranOut)
        .refreshable { await store.reloadQuietly() }
    }
}
