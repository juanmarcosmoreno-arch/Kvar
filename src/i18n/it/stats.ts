import { isOne } from '..';
import type { Messages } from '../es';

export const stats: Messages['stats'] = {
  title: 'Statistiche',
  open: 'Vedi statistiche',
  range: (months) => `${months} mesi`,
  rangeLabel: 'Periodo',
  loading: 'Caricamento dello storico…',
  offline: 'Offline: mostro gli ultimi dati salvati.',
  error: 'Non sono riuscito a caricare lo storico. Riprova quando sei connesso.',
  empty: 'Non c’è ancora uno storico. Man mano che segni cosa finisce e cosa compri, qui vedrai come consuma la casa.',

  kpi: {
    bought: 'Acquisti',
    ranOut: 'Finiti',
    perMonth: 'Acquisti al mese',
    perMonthHint: 'in media',
    inRange: (months) => `in ${months} mesi`,
  },

  monthly: {
    title: 'Per mese',
    showBought: 'Acquisti',
    showRanOut: 'Finito',
    showUsed: 'Unità usate',
    table: 'Vedi come tabella',
    hideTable: 'Nascondi tabella',
    month: 'Mese',
    chartLabel: (what) => `Grafico a colonne: ${what} al mese`,
    thisMonth: 'Questo mese',
  },

  top: {
    title: 'Cosa finisce di più',
    hint: 'Volte al mese, in media. Tocca un prodotto per vedere i dettagli.',
    perMonth: (n) => `${n} al mese`,
    lasts: (days) => `dura ~${days} giorni`,
  },

  soon: {
    title: 'Probabilmente finirà presto',
    hint: 'In base a quanto dura in casa.',
    today: 'da un momento all’altro',
    inDays: (days) => (days <= 1 ? 'domani' : `tra ~${days} giorni`),
    addToList: 'In lista',
    added: (name) => `${name} va in lista.`,
  },

  categories: {
    title: 'Acquisti per categoria',
    none: 'Senza categoria',
  },

  product: {
    title: 'Consumo',
    lasts: 'Dura in casa',
    every: 'Si compra ogni',
    usedPerMonth: 'Usati al mese',
    ranOut: 'Finito',
    days: (n) => `${n} giorni`,
    times: (n) => (isOne(n) ? `${n} volta` : `${n} volte`),
    nextOut: (when) => `Dovrebbe finire ${when}`,
    lastBought: (when) => `Ultimo acquisto: ${when}`,
    noData: 'Non c’è ancora abbastanza storico per questo prodotto.',
    noDataShort: '—',
  },
};
