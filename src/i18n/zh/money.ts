import type { Messages } from '../es';

export const money: Messages['money'] = {
  tabConsumption: '消耗',
  tabSpending: '花费',
  loading: '正在加载花费…',
  empty: '还没有价格。读取小票时会自动保存（清单 → 小票）。',
  kpi: {
    total: '共花费',
    perMonth: '每月',
    perTrip: '每次采购',
    trips: (n) => `${n} 次采购`,
    average: '平均',
  },
  monthly: { title: '每月花费', chartLabel: '柱状图：每月花费' },
  categories: { title: '按类别', none: '未分类' },
  products: { title: '钱花在哪里', hint: '这段时间里花得最多的东西。' },
  prices: {
    title: '价格变化',
    hint: '这段时间里第一次和最近一次购买。',
    up: (pct) => `涨了 ${pct}`,
    down: (pct) => `降了 ${pct}`,
    same: '不变',
  },
  product: {
    price: '最近价格',
    change: (pct, up) => (up ? `比几个月前贵 ${pct}` : `比几个月前便宜 ${pct}`),
    paid: (when) => `${when} 购买`,
  },
  settings: { title: '货币', hint: '用于显示小票上的花费。' },
};
