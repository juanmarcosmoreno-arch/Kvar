import type { Messages } from '../es';

export const money: Messages['money'] = {
  tabConsumption: '消費',
  tabSpending: '支出',
  loading: '支出を読み込み中…',
  empty: 'まだ価格がありません。レシートを読み取ると自動で保存されます（リスト → レシート）。',
  kpi: {
    total: '支出',
    perMonth: '月あたり',
    perTrip: '1回の買い物',
    trips: (n) => `${n}回の買い物`,
    average: '平均',
  },
  monthly: { title: '月ごとの支出', chartLabel: '縦棒グラフ：月ごとの支出' },
  categories: { title: 'カテゴリ別', none: '未分類' },
  products: { title: 'お金の使い道', hint: '期間中にいちばん支出が多かったもの。' },
  prices: {
    title: '価格の変化',
    hint: '期間中の最初と最後の購入。',
    up: (pct) => `${pct} 値上がり`,
    down: (pct) => `${pct} 値下がり`,
    same: '変わらず',
  },
  product: {
    price: '最新の価格',
    change: (pct, up) => (up ? `数か月前より ${pct} 高い` : `数か月前より ${pct} 安い`),
    paid: (when) => `${when} に購入`,
  },
  settings: { title: '通貨', hint: 'レシートの支出を表示するために使います。' },
  stores: {
    title: 'どこが安い？',
    hint: '同じ商品を別々のお店で買ったときの比較（過去6か月の最新価格）。',
    cheapest: 'いちばん安い',
    over: (pct) => `${pct}高い`,
    detail: (cheapest, compared) => `${compared}品中${cheapest}品でいちばん安い`,
    dealsTitle: 'どこで何を買うとお得か',
    deal: (store, pct) => `${store}なら${pct}安い`,
    needMore: '比較するには、複数のお店のレシートを追加してください。',
  },
  byStore: '各店の価格',
};
