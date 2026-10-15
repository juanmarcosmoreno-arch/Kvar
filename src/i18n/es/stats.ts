/** Textos de: estadísticas de consumo (src/screens/Stats.tsx, src/components/ProductStats.tsx, src/components/charts). */
export const stats = {
  title: 'Estadísticas',
  open: 'Ver estadísticas',
  range: (months: number) => `${months} meses`,
  rangeLabel: 'Período',
  loading: 'Cargando el historial…',
  offline: 'Sin conexión: muestro lo último que se guardó.',
  error: 'No pude traer el historial. Probá de nuevo con conexión.',
  empty: 'Todavía no hay historial. A medida que marques lo que se termina y lo que comprás, acá vas a ver cómo consume la casa.',

  kpi: {
    bought: 'Compras',
    ranOut: 'Se terminaron',
    perMonth: 'Compras por mes',
    perMonthHint: 'en promedio',
    inRange: (months: number) => `en ${months} meses`,
  },

  monthly: {
    title: 'Por mes',
    showBought: 'Compras',
    showRanOut: 'Se terminó',
    showUsed: 'Unidades usadas',
    table: 'Ver como tabla',
    hideTable: 'Ocultar tabla',
    month: 'Mes',
    chartLabel: (what: string) => `Gráfico de columnas: ${what} por mes`,
    thisMonth: 'Este mes',
  },

  top: {
    title: 'Lo que más se termina',
    hint: 'Veces por mes, en promedio. Tocá un producto para ver el detalle.',
    perMonth: (n: string) => `${n} por mes`,
    lasts: (days: string) => `dura ~${days} días`,
  },

  soon: {
    title: 'Probablemente se termine pronto',
    hint: 'Según cuánto le dura a la casa.',
    today: 'en cualquier momento',
    inDays: (days: number) => (days <= 1 ? 'mañana' : `en ~${days} días`),
    addToList: 'A la lista',
    added: (name: string) => `${name} va a la lista.`,
  },

  categories: {
    title: 'Compras por categoría',
    none: 'Sin categoría',
  },

  product: {
    title: 'Consumo',
    lasts: 'Le dura a la casa',
    every: 'Se compra cada',
    usedPerMonth: 'Se usan por mes',
    ranOut: 'Se terminó',
    days: (n: string) => `${n} días`,
    times: (n: number) => (n === 1 ? '1 vez' : `${n} veces`),
    nextOut: (when: string) => `Se terminaría ${when}`,
    lastBought: (when: string) => `Última compra: ${when}`,
    noData: 'Todavía no hay suficiente historial de este producto.',
    noDataShort: '—',
  },
};
