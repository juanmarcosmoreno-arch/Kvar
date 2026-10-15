import type { Messages } from '../es';
import { isOne } from '..';

export const money: Messages['money'] = {
  tabConsumption: 'Consumi',
  tabSpending: 'Spese',
  loading: 'Carico le spese…',
  empty: 'Ancora nessun prezzo. Si salvano da soli quando leggi uno scontrino (Lista → Scontrino).',
  kpi: {
    total: 'Hai speso',
    perMonth: 'Al mese',
    perTrip: 'Per spesa',
    trips: (n) => `${n} ${isOne(n) ? 'spesa' : 'spese'}`,
    average: 'in media',
  },
  monthly: { title: 'Spesa al mese', chartLabel: 'Grafico a colonne: spesa al mese' },
  categories: { title: 'Per categoria', none: 'Senza categoria' },
  products: { title: 'Dove vanno i soldi', hint: 'Ciò per cui hai speso di più nel periodo.' },
  prices: {
    title: 'Variazioni di prezzo',
    hint: 'Primo e ultimo acquisto nel periodo.',
    up: (pct) => `+${pct}`,
    down: (pct) => `−${pct}`,
    same: 'uguale',
  },
  product: {
    price: 'Ultimo prezzo',
    change: (pct, up) => (up ? `${pct} in più di qualche mese fa` : `${pct} in meno di qualche mese fa`),
    paid: (when) => `Pagato il ${when}`,
  },
  settings: { title: 'Valuta', hint: 'Per mostrare le spese degli scontrini.' },
};
