import ActivityKit
import SwiftUI
import WidgetKit

// «Estoy en el súper» en la pantalla bloqueada y en la Dynamic Island: lo próximo a agarrar (en el orden en que
// se recorre el súper) y cuántas cosas faltan. La app la prende y la actualiza (ver KvarWatchPlugin.swift).

/// Copia idéntica de la que está en la app (KvarWatchPlugin.swift): si cambia una, cambiar la otra.
@available(iOS 16.2, *)
struct StokaListAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var items: [String]
        var left: Int
        var done: Int
        var subtitle: String
    }

    var title: String
}

private enum LiveBrand {
    static let accent = Color(red: 0.361, green: 0.729, blue: 0.478)
    static let background = Color(red: 0.055, green: 0.086, blue: 0.067)
}

@available(iOS 16.2, *)
struct StokaListActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: StokaListAttributes.self) { context in
            LockScreenView(title: context.attributes.title, state: context.state)
                .activityBackgroundTint(LiveBrand.background)
                .activitySystemActionForegroundColor(LiveBrand.accent)
                .widgetURL(URL(string: "stoka://lista"))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label {
                        Text("Stoka").font(.headline)
                    } icon: {
                        Image(systemName: "cart.fill").foregroundStyle(LiveBrand.accent)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("\(context.state.left)")
                        .font(.title2.weight(.semibold))
                        .foregroundStyle(LiveBrand.accent)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(context.state.subtitle).font(.footnote).foregroundStyle(.secondary)
                        ItemsList(items: context.state.items, limit: 3)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            } compactLeading: {
                Image(systemName: "cart.fill").foregroundStyle(LiveBrand.accent)
            } compactTrailing: {
                Text("\(context.state.left)").foregroundStyle(LiveBrand.accent)
            } minimal: {
                Text("\(context.state.left)").foregroundStyle(LiveBrand.accent)
            }
            .widgetURL(URL(string: "stoka://lista"))
        }
    }
}

@available(iOS 16.2, *)
private struct LockScreenView: View {
    let title: String
    let state: StokaListAttributes.ContentState

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            ZStack {
                Circle().fill(LiveBrand.accent.opacity(0.18))
                Image(systemName: state.left == 0 ? "checkmark" : "cart.fill").foregroundStyle(LiveBrand.accent)
            }
            .frame(width: 40, height: 40)
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.subheadline.weight(.semibold)).foregroundStyle(.white).lineLimit(1)
                Text(state.subtitle).font(.footnote).foregroundStyle(.white.opacity(0.7)).lineLimit(1)
                ItemsList(items: state.items, limit: 4)
            }
            Spacer(minLength: 0)
            Text("\(state.left)")
                .font(.system(size: 34, weight: .semibold, design: .rounded))
                .foregroundStyle(LiveBrand.accent)
        }
        .padding(16)
    }
}

private struct ItemsList: View {
    let items: [String]
    let limit: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            ForEach(Array(items.prefix(limit).enumerated()), id: \.offset) { _, name in
                HStack(spacing: 6) {
                    Circle().stroke(Color.white.opacity(0.6), lineWidth: 1.2).frame(width: 9, height: 9)
                    Text(name).font(.footnote).foregroundStyle(.white).lineLimit(1)
                }
            }
        }
    }
}
