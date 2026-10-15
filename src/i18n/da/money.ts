import type { Messages } from '../es';

export const money: Messages['money'] = {
  tabConsumption: 'Forbrug',
  tabSpending: 'Udgifter',
  loading: 'Henter udgifterne…',
  empty: 'Ingen priser endnu. De gemmes automatisk, når du læser en kvittering (Liste → Kvittering).',
  kpi: {
    total: 'Du har brugt',
    perMonth: 'Pr. måned',
    perTrip: 'Pr. indkøb',
    trips: (n) => `${n} indkøb`,
    average: 'i gennemsnit',
  },
  monthly: { title: 'Udgifter pr. måned', chartLabel: 'Søjlediagram: udgifter pr. måned' },
  categories: { title: 'Pr. kategori', none: 'Uden kategori' },
  products: { title: 'Hvor pengene går hen', hint: 'Det, du brugte mest på i perioden.' },
  prices: {
    title: 'Prisændringer',
    hint: 'Første og seneste køb i perioden.',
    up: (pct) => `op ${pct}`,
    down: (pct) => `ned ${pct}`,
    same: 'uændret',
  },
  product: {
    price: 'Seneste pris',
    change: (pct, up) => (up ? `${pct} dyrere end for nogle måneder siden` : `${pct} billigere end for nogle måneder siden`),
    paid: (when) => `Betalt ${when}`,
  },
  settings: { title: 'Valuta', hint: 'Bruges til at vise udgifterne fra dine kvitteringer.' },
};
