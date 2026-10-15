import type { Messages } from '../es';

export const stats: Messages['stats'] = {
  title: '统计',
  open: '查看统计',
  range: (months) => `${months} 个月`,
  rangeLabel: '时间段',
  loading: '正在加载记录…',
  offline: '离线：显示上次保存的数据。',
  error: '无法加载记录。请联网后重试。',
  empty: '还没有记录。随着你标记用完的东西和购买的东西，这里会显示家里的消耗情况。',

  kpi: {
    bought: '购买',
    ranOut: '用完',
    perMonth: '每月购买',
    perMonthHint: '平均',
    inRange: (months) => `${months} 个月内`,
  },

  monthly: {
    title: '按月',
    showBought: '购买',
    showRanOut: '用完',
    showUsed: '用量',
    table: '以表格查看',
    hideTable: '隐藏表格',
    month: '月份',
    chartLabel: (what) => `柱状图：每月${what}`,
    thisMonth: '本月',
  },

  top: {
    title: '最常用完的',
    hint: '平均每月次数。点按商品查看详情。',
    perMonth: (n) => `每月 ${n} 次`,
    lasts: (days) => `约可用 ${days} 天`,
  },

  soon: {
    title: '可能快用完了',
    hint: '根据在家里通常能用多久。',
    today: '随时',
    inDays: (days) => (days <= 1 ? '明天' : `约 ${days} 天后`),
    addToList: '加入清单',
    added: (name) => `已将${name}加入清单。`,
  },

  categories: {
    title: '按类别购买',
    none: '未分类',
  },

  product: {
    title: '消耗',
    lasts: '可用时长',
    every: '购买间隔',
    usedPerMonth: '每月用量',
    ranOut: '用完',
    days: (n) => `${n} 天`,
    times: (n) => `${n} 次`,
    nextOut: (when) => `预计${when}用完`,
    lastBought: (when) => `上次购买：${when}`,
    noData: '该商品的记录还不够。',
    noDataShort: '—',
  },
};
