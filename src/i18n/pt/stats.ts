import { isOne } from '..';
import type { Messages } from '../es';

export const stats: Messages['stats'] = {
  title: 'Estatísticas',
  open: 'Ver estatísticas',
  range: (months) => `${months} meses`,
  rangeLabel: 'Período',
  loading: 'Carregando o histórico…',
  offline: 'Sem conexão: mostrando os últimos dados salvos.',
  error: 'Não consegui carregar o histórico. Tente de novo com conexão.',
  empty: 'Ainda não há histórico. Conforme você marcar o que acaba e o que compra, vai ver aqui como a casa consome.',

  kpi: {
    bought: 'Compras',
    ranOut: 'Acabaram',
    perMonth: 'Compras por mês',
    perMonthHint: 'em média',
    inRange: (months) => `em ${months} meses`,
  },

  monthly: {
    title: 'Por mês',
    showBought: 'Compras',
    showRanOut: 'Acabou',
    showUsed: 'Unidades usadas',
    table: 'Ver como tabela',
    hideTable: 'Ocultar tabela',
    month: 'Mês',
    chartLabel: (what) => `Gráfico de colunas: ${what} por mês`,
    thisMonth: 'Este mês',
  },

  top: {
    title: 'O que mais acaba',
    hint: 'Vezes por mês, em média. Toque em um produto para ver os detalhes.',
    perMonth: (n) => `${n} por mês`,
    lasts: (days) => `dura ~${days} dias`,
  },

  soon: {
    title: 'Deve acabar logo',
    hint: 'Com base em quanto dura na casa.',
    today: 'a qualquer momento',
    inDays: (days) => (days <= 1 ? 'amanhã' : `em ~${days} dias`),
    addToList: 'Para a lista',
    added: (name) => `${name} foi para a lista.`,
  },

  categories: {
    title: 'Compras por categoria',
    none: 'Sem categoria',
  },

  product: {
    title: 'Consumo',
    lasts: 'Dura na casa',
    every: 'Comprado a cada',
    usedPerMonth: 'Usado por mês',
    ranOut: 'Acabou',
    days: (n) => `${n} dias`,
    times: (n) => (isOne(n) ? `${n} vez` : `${n} vezes`),
    nextOut: (when) => `Deve acabar ${when}`,
    lastBought: (when) => `Última compra: ${when}`,
    noData: 'Ainda não há histórico suficiente deste produto.',
    noDataShort: '—',
  },
};
