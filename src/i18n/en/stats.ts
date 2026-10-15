import { isOne } from '..';
import type { Messages } from '../es';

export const stats: Messages['stats'] = {
  title: 'Statistics',
  open: 'View statistics',
  range: (months) => `${months} months`,
  rangeLabel: 'Period',
  loading: 'Loading history…',
  offline: 'Offline: showing the last saved data.',
  error: 'Couldn’t load the history. Try again when you’re online.',
  empty: 'No history yet. As you mark what runs out and what you buy, you’ll see how your household uses things here.',

  kpi: {
    bought: 'Purchases',
    ranOut: 'Ran out',
    perMonth: 'Purchases per month',
    perMonthHint: 'on average',
    inRange: (months) => `in ${months} months`,
  },

  monthly: {
    title: 'By month',
    showBought: 'Purchases',
    showRanOut: 'Ran out',
    showUsed: 'Units used',
    table: 'View as table',
    hideTable: 'Hide table',
    month: 'Month',
    chartLabel: (what) => `Column chart: ${what} per month`,
    thisMonth: 'This month',
  },

  top: {
    title: 'What runs out most',
    hint: 'Times per month, on average. Tap a product to see details.',
    perMonth: (n) => `${n} per month`,
    lasts: (days) => `lasts ~${days} days`,
  },

  soon: {
    title: 'Probably running out soon',
    hint: 'Based on how long it lasts your household.',
    today: 'any time now',
    inDays: (days) => (days <= 1 ? 'tomorrow' : `in ~${days} days`),
    addToList: 'Add to list',
    added: (name) => `${name} added to the list.`,
  },

  categories: {
    title: 'Purchases by category',
    none: 'No category',
  },

  product: {
    title: 'Usage',
    lasts: 'Lasts your household',
    every: 'Bought every',
    usedPerMonth: 'Used per month',
    ranOut: 'Ran out',
    days: (n) => `${n} days`,
    times: (n) => (isOne(n) ? `${n} time` : `${n} times`),
    nextOut: (when) => `Likely to run out ${when}`,
    lastBought: (when) => `Last bought: ${when}`,
    noData: 'Not enough history for this product yet.',
    noDataShort: '—',
  },
};
