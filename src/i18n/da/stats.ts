import { isOne } from '..';
import type { Messages } from '../es';

export const stats: Messages['stats'] = {
  title: 'Statistik',
  open: 'Se statistik',
  range: (months) => `${months} måneder`,
  rangeLabel: 'Periode',
  loading: 'Henter historikken…',
  offline: 'Offline: viser det senest gemte.',
  error: 'Kunne ikke hente historikken. Prøv igen, når du er online.',
  empty: 'Ingen historik endnu. Når du markerer, hvad der slipper op, og hvad du køber, kan du se her, hvordan husstanden bruger tingene.',

  kpi: {
    bought: 'Indkøb',
    ranOut: 'Sluppet op',
    perMonth: 'Indkøb pr. måned',
    perMonthHint: 'i gennemsnit',
    inRange: (months) => `på ${months} måneder`,
  },

  monthly: {
    title: 'Pr. måned',
    showBought: 'Indkøb',
    showRanOut: 'Sluppet op',
    showUsed: 'Brugte enheder',
    table: 'Vis som tabel',
    hideTable: 'Skjul tabel',
    month: 'Måned',
    chartLabel: (what) => `Søjlediagram: ${what} pr. måned`,
    thisMonth: 'Denne måned',
  },

  top: {
    title: 'Det, der oftest slipper op',
    hint: 'Gange pr. måned i gennemsnit. Tryk på et produkt for at se detaljer.',
    perMonth: (n) => `${n} pr. måned`,
    lasts: (days) => `holder ~${days} dage`,
  },

  soon: {
    title: 'Slipper nok snart op',
    hint: 'Ud fra hvor længe det plejer at holde.',
    today: 'når som helst',
    inDays: (days) => (days <= 1 ? 'i morgen' : `om ~${days} dage`),
    addToList: 'På listen',
    added: (name) => `${name} kommer på listen.`,
  },

  categories: {
    title: 'Indkøb pr. kategori',
    none: 'Ingen kategori',
  },

  product: {
    title: 'Forbrug',
    lasts: 'Holder i husstanden',
    every: 'Købes hver',
    usedPerMonth: 'Bruges pr. måned',
    ranOut: 'Sluppet op',
    days: (n) => `${n} dage`,
    times: (n) => (isOne(n) ? `${n} gang` : `${n} gange`),
    nextOut: (when) => `Slipper nok op ${when}`,
    lastBought: (when) => `Sidst købt: ${when}`,
    noData: 'Der er endnu ikke nok historik for dette produkt.',
    noDataShort: '—',
  },
};
