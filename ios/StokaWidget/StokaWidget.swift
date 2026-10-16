import SwiftUI
import WidgetKit

// Widget de Stoka: la lista de compras y lo que se está terminando, en la pantalla de inicio.
// Lee la foto del hogar que guarda la app en el App Group («group.» + el bundle id de la app).

struct SharedSnapshot: Codable {
    struct Item: Codable, Hashable {
        var name: String
        var quantity: Int?
        var status: String?
    }
    var householdName: String
    var list: [Item]
    var running: [Item]
    var updatedAt: Double

    /// El widget es «<app>.StokaWidget»: el grupo es «group.<app>»
    static var groupId: String {
        let own = Bundle.main.bundleIdentifier ?? ""
        let app = own.split(separator: ".").dropLast().joined(separator: ".")
        return "group." + app
    }

    static func load() -> SharedSnapshot? {
        guard let data = UserDefaults(suiteName: groupId)?.data(forKey: "stoka.snapshot") else { return nil }
        return try? JSONDecoder().decode(SharedSnapshot.self, from: data)
    }

    static let sample = SharedSnapshot(
        householdName: "Casa",
        list: [.init(name: "Leche", quantity: 2, status: "out"), .init(name: "Yerba", quantity: nil, status: "low"),
               .init(name: "Huevos", quantity: 12, status: "low"), .init(name: "Pan", quantity: nil, status: "out")],
        running: [.init(name: "Café", quantity: nil, status: "low"), .init(name: "Aceite", quantity: nil, status: "low")],
        updatedAt: Date().timeIntervalSince1970
    )
}

struct StokaEntry: TimelineEntry {
    let date: Date
    let snapshot: SharedSnapshot?
}

struct StokaProvider: TimelineProvider {
    func placeholder(in context: Context) -> StokaEntry {
        StokaEntry(date: Date(), snapshot: .sample)
    }

    func getSnapshot(in context: Context, completion: @escaping (StokaEntry) -> Void) {
        completion(StokaEntry(date: Date(), snapshot: context.isPreview ? .sample : SharedSnapshot.load() ?? .sample))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<StokaEntry>) -> Void) {
        let entry = StokaEntry(date: Date(), snapshot: SharedSnapshot.load())
        completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(30 * 60))))
    }
}

private enum Brand {
    static func background(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(red: 0.055, green: 0.086, blue: 0.067) : Color(red: 0.961, green: 0.953, blue: 0.933)
    }
    static func accent(_ scheme: ColorScheme) -> Color {
        scheme == .dark ? Color(red: 0.361, green: 0.729, blue: 0.478) : Color(red: 0.106, green: 0.369, blue: 0.247)
    }
    static func dot(_ status: String?) -> Color {
        switch status {
        case "out": return Color(red: 0.922, green: 0.365, blue: 0.29)
        case "low": return Color(red: 0.965, green: 0.651, blue: 0.137)
        default: return Color(red: 0.298, green: 0.686, blue: 0.42)
        }
    }
}

struct ItemRow: View {
    let item: SharedSnapshot.Item
    var body: some View {
        HStack(spacing: 6) {
            Circle().fill(Brand.dot(item.status)).frame(width: 6, height: 6)
            Text(item.name).font(.system(size: 13)).lineLimit(1)
            Spacer(minLength: 0)
            if let q = item.quantity, q > 1 {
                Text("×\(q)").font(.system(size: 12)).foregroundStyle(.secondary)
            }
        }
    }
}

struct StokaWidgetView: View {
    @Environment(\.widgetFamily) var family
    @Environment(\.colorScheme) var scheme
    let entry: StokaEntry

    var body: some View {
        Group {
            if let s = entry.snapshot {
                if family == .systemSmall { small(s) } else { medium(s) }
            } else {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Stoka").font(.headline).foregroundStyle(Brand.accent(scheme))
                    Text(WidgetL10n.t("connect")).font(.footnote).foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            }
        }
        .widgetURL(URL(string: "stoka://lista"))
        .modifier(WidgetBackground(color: Brand.background(scheme)))
    }

    private func small(_ s: SharedSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline) {
                Text(WidgetL10n.t("list")).font(.system(size: 13, weight: .semibold)).foregroundStyle(Brand.accent(scheme))
                Spacer()
                Text("\(s.list.count)").font(.system(size: 22, weight: .semibold))
            }
            if s.list.isEmpty {
                Text(WidgetL10n.t("nothing")).font(.footnote).foregroundStyle(.secondary)
            } else {
                ForEach(Array(s.list.prefix(3)), id: \.self) { ItemRow(item: $0) }
            }
            Spacer(minLength: 0)
        }
    }

    private func medium(_ s: SharedSnapshot) -> some View {
        HStack(alignment: .top, spacing: 14) {
            column(WidgetL10n.t("toBuy"), items: s.list, empty: WidgetL10n.t("nothing"))
            column(WidgetL10n.t("running"), items: s.running, empty: WidgetL10n.t("allGood"))
        }
    }

    private func column(_ title: String, items: [SharedSnapshot.Item], empty: String) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(title).font(.system(size: 13, weight: .semibold)).foregroundStyle(Brand.accent(scheme)).lineLimit(1)
            if items.isEmpty {
                Text(empty).font(.footnote).foregroundStyle(.secondary)
            } else {
                ForEach(Array(items.prefix(4)), id: \.self) { ItemRow(item: $0) }
                if items.count > 4 {
                    Text("+\(items.count - 4)").font(.caption2).foregroundStyle(.secondary)
                }
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// Fondo del widget: containerBackground en iOS 17, fondo común antes.
struct WidgetBackground: ViewModifier {
    let color: Color
    func body(content: Content) -> some View {
        if #available(iOS 17.0, *) {
            content.containerBackground(for: .widget) { color }
        } else {
            content.padding().background(color)
        }
    }
}

/// Todo lo que muestra Stoka fuera de la app: el widget y, en el súper, la Live Activity.
@main
struct StokaWidgets: WidgetBundle {
    var body: some Widget {
        StokaWidget()
        if #available(iOS 16.2, *) {
            StokaListActivityWidget()
        }
    }
}

struct StokaWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "StokaWidget", provider: StokaProvider()) { entry in
            StokaWidgetView(entry: entry)
        }
        .configurationDisplayName("Stoka")
        .description(WidgetL10n.t("description"))
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
