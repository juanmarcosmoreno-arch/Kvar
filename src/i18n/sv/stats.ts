import { isOne } from '..';
import type { Messages } from '../es';

export const stats: Messages['stats'] = {
  title: 'Statistik',
  open: 'Visa statistik',
  range: (months) => `${months} månader`,
  rangeLabel: 'Period',
  loading: 'Laddar historiken…',
  offline: 'Offline: visar det senast sparade.',
  error: 'Kunde inte hämta historiken. Försök igen när du är uppkopplad.',
  empty: 'Ingen historik än. När du markerar vad som tar slut och vad du köper ser du här hur hushållet förbrukar.',

  kpi: {
    bought: 'Inköp',
    ranOut: 'Tog slut',
    perMonth: 'Inköp per månad',
    perMonthHint: 'i genomsnitt',
    inRange: (months) => `på ${months} månader`,
  },

  monthly: {
    title: 'Per månad',
    showBought: 'Inköp',
    showRanOut: 'Tog slut',
    showUsed: 'Använda enheter',
    table: 'Visa som tabell',
    hideTable: 'Dölj tabell',
    month: 'Månad',
    chartLabel: (what) => `Stapeldiagram: ${what} per månad`,
    thisMonth: 'Den här månaden',
  },

  top: {
    title: 'Det som tar slut oftast',
    hint: 'Gånger per månad i genomsnitt. Tryck på en produkt för detaljer.',
    perMonth: (n) => `${n} per månad`,
    lasts: (days) => `räcker ~${days} dagar`,
  },

  soon: {
    title: 'Tar troligen slut snart',
    hint: 'Utifrån hur länge det brukar räcka hemma.',
    today: 'när som helst',
    inDays: (days) => (days <= 1 ? 'i morgon' : `om ~${days} dagar`),
    addToList: 'Till listan',
    added: (name) => `${name} läggs på listan.`,
  },

  categories: {
    title: 'Inköp per kategori',
    none: 'Ingen kategori',
  },

  product: {
    title: 'Förbrukning',
    lasts: 'Räcker hemma',
    every: 'Köps var',
    usedPerMonth: 'Används per månad',
    ranOut: 'Tog slut',
    days: (n) => `${n} dagar`,
    times: (n) => (isOne(n) ? `${n} gång` : `${n} gånger`),
    nextOut: (when) => `Tar troligen slut ${when}`,
    lastBought: (when) => `Senast köpt: ${when}`,
    noData: 'Det finns inte tillräckligt med historik för den här produkten än.',
    noDataShort: '—',
  },
};
