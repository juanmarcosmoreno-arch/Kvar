import type { Messages } from '../es';
import { isOne } from '..';

export const money: Messages['money'] = {
  tabConsumption: 'Consumption',
  tabSpending: 'Spending',
  loading: 'Loading spending…',
  empty: 'No prices yet. They’re saved automatically when you scan a receipt (List → Receipt).',
  kpi: {
    total: 'You spent',
    perMonth: 'Per month',
    perTrip: 'Per trip',
    trips: (n) => `${n} ${isOne(n) ? 'trip' : 'trips'}`,
    average: 'on average',
  },
  monthly: { title: 'Spending per month', chartLabel: 'Column chart: spending per month' },
  categories: { title: 'By category', none: 'No category' },
  products: { title: 'Where the money goes', hint: 'What you spent the most on in this period.' },
  prices: {
    title: 'Price changes',
    hint: 'First and last time you bought it in this period.',
    up: (pct) => `up ${pct}`,
    down: (pct) => `down ${pct}`,
    same: 'same',
  },
  product: {
    price: 'Last price',
    change: (pct, up) => (up ? `${pct} more than a few months ago` : `${pct} less than a few months ago`),
    paid: (when) => `Paid on ${when}`,
  },
  settings: { title: 'Currency', hint: 'Used to show the spending from your receipts.' },
};
