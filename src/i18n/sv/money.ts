import type { Messages } from '../es';
import { isOne } from '..';

export const money: Messages['money'] = {
  tabConsumption: 'Förbrukning',
  tabSpending: 'Utgifter',
  loading: 'Laddar utgifterna…',
  empty: 'Inga priser än. De sparas automatiskt när du läser ett kvitto (Lista → Kvitto).',
  kpi: {
    total: 'Du har handlat för',
    perMonth: 'Per månad',
    perTrip: 'Per köp',
    trips: (n) => `${n} ${isOne(n) ? 'köp' : 'köp'}`,
    average: 'i snitt',
  },
  monthly: { title: 'Utgifter per månad', chartLabel: 'Stapeldiagram: utgifter per månad' },
  categories: { title: 'Per kategori', none: 'Utan kategori' },
  products: { title: 'Vart pengarna går', hint: 'Det du lade mest pengar på under perioden.' },
  prices: {
    title: 'Prisändringar',
    hint: 'Första och senaste köpet under perioden.',
    up: (pct) => `upp ${pct}`,
    down: (pct) => `ner ${pct}`,
    same: 'samma',
  },
  product: {
    price: 'Senaste pris',
    change: (pct, up) => (up ? `${pct} dyrare än för några månader sedan` : `${pct} billigare än för några månader sedan`),
    paid: (when) => `Betalt ${when}`,
  },
  settings: { title: 'Valuta', hint: 'För att visa utgifterna från dina kvitton.' },
  stores: {
    title: 'Var är det billigast?',
    hint: 'Samma varor köpta i olika butiker (senaste priset, senaste 6 månaderna).',
    cheapest: 'Billigast',
    over: (pct) => `${pct} dyrare`,
    detail: (cheapest, compared) => `Billigast på ${cheapest} av ${compared}`,
    dealsTitle: 'Vad som lönar sig var',
    deal: (store, pct) => `På ${store}, ${pct} mindre`,
    needMore: 'Lägg till kvitton från fler än en butik för att jämföra.',
  },
  byStore: 'Pris i varje butik',
};
