import type { Messages } from '../es';

export const stats: Messages['stats'] = {
  title: '統計',
  open: '統計を見る',
  range: (months) => `${months}か月`,
  rangeLabel: '期間',
  loading: '履歴を読み込み中…',
  offline: 'オフライン：最後に保存したデータを表示しています。',
  error: '履歴を読み込めませんでした。接続してからもう一度お試しください。',
  empty: 'まだ履歴がありません。切れたものや買ったものを記録すると、ここで家の消費の様子を確認できます。',

  kpi: {
    bought: '購入',
    ranOut: '切れた回数',
    perMonth: '月あたりの購入',
    perMonthHint: '平均',
    inRange: (months) => `${months}か月間`,
  },

  monthly: {
    title: '月別',
    showBought: '購入',
    showRanOut: '切れた',
    showUsed: '使用数',
    table: '表で表示',
    hideTable: '表を隠す',
    month: '月',
    chartLabel: (what) => `縦棒グラフ：月ごとの${what}`,
    thisMonth: '今月',
  },

  top: {
    title: 'よく切れるもの',
    hint: '月あたりの平均回数。商品をタップすると詳細を表示します。',
    perMonth: (n) => `月${n}回`,
    lasts: (days) => `約${days}日もちます`,
  },

  soon: {
    title: 'そろそろ切れそう',
    hint: '家でどれくらいもつかに基づいています。',
    today: 'まもなく',
    inDays: (days) => (days <= 1 ? '明日' : `約${days}日後`),
    addToList: 'リストへ',
    added: (name) => `${name}をリストに追加しました。`,
  },

  categories: {
    title: 'カテゴリ別の購入',
    none: 'カテゴリなし',
  },

  product: {
    title: '消費',
    lasts: 'もつ期間',
    every: '購入間隔',
    usedPerMonth: '月あたりの使用数',
    ranOut: '切れた回数',
    days: (n) => `${n}日`,
    times: (n) => `${n}回`,
    nextOut: (when) => `切れる見込み：${when}`,
    lastBought: (when) => `最終購入：${when}`,
    noData: 'この商品の履歴はまだ十分ではありません。',
    noDataShort: '—',
  },
};
