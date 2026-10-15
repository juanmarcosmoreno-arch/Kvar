/** Textos de: gastos (precios de los tickets). */
export const money = {
  tabConsumption: 'Consumo',
  tabSpending: 'Gastos',
  loading: 'Cargando los gastos…',
  empty: 'Todavía no hay precios. Se guardan solos cuando cargás un ticket (Lista → Ticket).',
  kpi: {
    total: 'Gastaste',
    perMonth: 'Por mes',
    perTrip: 'Por compra',
    trips: (n: number) => (n === 1 ? '1 compra' : `${n} compras`),
    average: 'en promedio',
  },
  monthly: { title: 'Gasto por mes', chartLabel: 'Gráfico de columnas: gasto por mes' },
  categories: { title: 'Por categoría', none: 'Sin categoría' },
  products: { title: 'En qué se va la plata', hint: 'Lo que más gastaste en el período.' },
  prices: {
    title: 'Cambios de precio',
    hint: 'Primera y última vez que lo compraste en el período.',
    up: (pct: string) => `subió ${pct}`,
    down: (pct: string) => `bajó ${pct}`,
    same: 'igual',
  },
  product: {
    price: 'Último precio',
    change: (pct: string, up: boolean) => (up ? `${pct} más que hace unos meses` : `${pct} menos que hace unos meses`),
    paid: (when: string) => `Pagado el ${when}`,
  },
  settings: {
    title: 'Moneda',
    hint: 'Para mostrar los gastos de los tickets.',
  },
};
