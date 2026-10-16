import type { Messages } from '../es';
import { isOne } from '..';

export const money: Messages['money'] = {
  tabConsumption: 'Consumo',
  tabSpending: 'Gastos',
  loading: 'Carregando os gastos…',
  empty: 'Ainda não há preços. Eles são salvos sozinhos quando você lê um cupom (Lista → Cupom).',
  kpi: {
    total: 'Você gastou',
    perMonth: 'Por mês',
    perTrip: 'Por compra',
    trips: (n) => `${n} ${isOne(n) ? 'compra' : 'compras'}`,
    average: 'em média',
  },
  monthly: { title: 'Gasto por mês', chartLabel: 'Gráfico de colunas: gasto por mês' },
  categories: { title: 'Por categoria', none: 'Sem categoria' },
  products: { title: 'Para onde vai o dinheiro', hint: 'No que você mais gastou no período.' },
  prices: {
    title: 'Mudanças de preço',
    hint: 'Primeira e última vez que você comprou no período.',
    up: (pct) => `subiu ${pct}`,
    down: (pct) => `caiu ${pct}`,
    same: 'igual',
  },
  product: {
    price: 'Último preço',
    change: (pct, up) => (up ? `${pct} a mais que há alguns meses` : `${pct} a menos que há alguns meses`),
    paid: (when) => `Pago em ${when}`,
  },
  settings: { title: 'Moeda', hint: 'Para mostrar os gastos dos cupons.' },
  stores: {
    title: 'Onde compensa?',
    hint: 'O mesmo produto comprado em mercados diferentes (último preço dos últimos 6 meses).',
    cheapest: 'O mais barato',
    over: (pct) => `${pct} mais caro`,
    detail: (cheapest, compared) => `Mais barato em ${cheapest} de ${compared}`,
    dealsTitle: 'O que comprar onde',
    deal: (store, pct) => `No ${store}, ${pct} a menos`,
    needMore: 'Para comparar, adicione notas de mais de um mercado.',
  },
  byStore: 'Preço em cada mercado',
};
