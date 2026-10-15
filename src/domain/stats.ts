/**
 * Estadísticas de consumo a partir del historial (product_events): cuánto dura cada producto, cada cuánto
 * se compra, cuánto se usa por mes y cuándo se va a terminar. Todo se calcula en el teléfono.
 *
 * Qué cuenta como qué:
 *   compra     → evento «purchased» (desde la lista), o pasar de No hay / Queda poco a Hay, o sumar unidades
 *   se terminó → pasar a No hay
 *   uso        → unidades que bajan (productos con conteo)
 */
import type { Product, StockStatus } from './types';

export interface StockEvent {
  product_id: string | null;
  type: string;
  from_status: StockStatus | null;
  to_status: StockStatus | null;
  from_quantity: number | null;
  to_quantity: number | null;
  /** Cuándo pasó (hora del dispositivo si la hay) */
  at: string;
}

export interface MonthPoint {
  /** «2026-10» */
  key: string;
  /** Primer día del mes (hora local) */
  start: Date;
  bought: number;
  ranOut: number;
  /** Unidades usadas (solo productos con conteo) */
  used: number;
}

const DAY = 86_400_000;
const MONTH_DAYS = 30.44;

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Los últimos `n` meses, del más viejo al actual. */
export function lastMonths(now: Date, n: number): MonthPoint[] {
  return Array.from({ length: n }, (_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return { key: monthKey(start), start, bought: 0, ranOut: 0, used: 0 };
  });
}

/** Qué significa un evento para las estadísticas. */
export function classify(e: StockEvent): { bought: boolean; boughtUnits: number; ranOut: boolean; used: number } {
  const fq = e.from_quantity;
  const tq = e.to_quantity;
  const delta = fq != null && tq != null ? tq - fq : 0;
  const restocked =
    e.type === 'purchased' ||
    (e.type !== 'created' && e.to_status === 'ok' && (e.from_status === 'out' || e.from_status === 'low')) ||
    (e.type !== 'created' && delta > 0);
  return {
    bought: restocked,
    boughtUnits: restocked ? Math.max(1, delta) : 0,
    ranOut: e.to_status === 'out' && e.from_status !== 'out' && e.type !== 'created',
    used: e.type !== 'created' && delta < 0 ? -delta : 0,
  };
}

const time = (e: StockEvent) => Date.parse(e.at);

function addToMonths(months: MonthPoint[], e: StockEvent) {
  const m = months.find((x) => x.key === monthKey(new Date(e.at)));
  if (!m) return;
  const c = classify(e);
  if (c.bought) m.bought++;
  if (c.ranOut) m.ranOut++;
  m.used += c.used;
}

export interface ProductStats {
  months: MonthPoint[];
  bought: number;
  ranOut: number;
  used: number;
  /** Promedios por mes, contando desde que hay historial (un producto nuevo no se divide por 12) */
  boughtPerMonth: number;
  ranOutPerMonth: number;
  usedPerMonth: number | null;
  /** Días desde que se repone hasta que se termina, en promedio */
  avgDaysLasts: number | null;
  /** Días entre compras, en promedio */
  avgDaysBetweenPurchases: number | null;
  lastBought: string | null;
  lastRanOut: string | null;
  /** Cuándo se terminaría si sigue el ritmo de siempre (null si no hay datos o ya no hay) */
  nextOutAt: string | null;
}

const average = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function productStats(
  events: StockEvent[],
  opts: { now: Date; months: number; product?: Pick<Product, 'status' | 'track_quantity'> },
): ProductStats {
  const { now } = opts;
  const months = lastMonths(now, opts.months);
  const from = months[0].start.getTime();
  const sorted = [...events].sort((a, b) => time(a) - time(b));
  const inRange = sorted.filter((e) => time(e) >= from && time(e) <= now.getTime());
  inRange.forEach((e) => addToMonths(months, e));

  // Ciclos: de cada reposición a la siguiente vez que se terminó (todo el historial, para tener más datos)
  const lasts: number[] = [];
  const between: number[] = [];
  let lastRestock: number | null = null;
  let lastBought: number | null = null;
  let lastRanOut: number | null = null;
  for (const e of sorted) {
    const c = classify(e);
    const t = time(e);
    if (c.bought) {
      if (lastBought !== null && t - lastBought > DAY / 2) between.push((t - lastBought) / DAY);
      lastBought = t;
      lastRestock = t;
    }
    if (c.ranOut) {
      if (lastRestock !== null && t > lastRestock) lasts.push((t - lastRestock) / DAY);
      lastRestock = null;
      lastRanOut = t;
    }
  }

  const firstEvent = inRange[0] ? time(inRange[0]) : null;
  const spanMonths = firstEvent === null ? 1 : Math.max(1, (now.getTime() - Math.max(from, firstEvent)) / DAY / MONTH_DAYS);
  const bought = months.reduce((a, m) => a + m.bought, 0);
  const ranOut = months.reduce((a, m) => a + m.ranOut, 0);
  const used = months.reduce((a, m) => a + m.used, 0);
  const avgDaysLasts = average(lasts);
  const status = opts.product?.status;
  const nextOutAt =
    avgDaysLasts !== null && lastRestock !== null && status !== 'out'
      ? new Date(lastRestock + avgDaysLasts * DAY).toISOString()
      : null;

  return {
    months,
    bought,
    ranOut,
    used,
    boughtPerMonth: bought / spanMonths,
    ranOutPerMonth: ranOut / spanMonths,
    usedPerMonth: opts.product?.track_quantity || used > 0 ? used / spanMonths : null,
    avgDaysLasts,
    avgDaysBetweenPurchases: average(between),
    lastBought: lastBought === null ? null : new Date(lastBought).toISOString(),
    lastRanOut: lastRanOut === null ? null : new Date(lastRanOut).toISOString(),
    nextOutAt,
  };
}

export interface ProductRank {
  product: Product;
  stats: ProductStats;
}

export interface HouseholdStats {
  months: MonthPoint[];
  bought: number;
  ranOut: number;
  boughtPerMonth: number;
  /** Lo que más seguido se termina (o se compra) */
  top: ProductRank[];
  /** Se terminaría en los próximos días, según su ritmo */
  soon: { product: Product; at: string }[];
  /** Compras por categoría (id null = sin categoría) */
  byCategory: { categoryId: string | null; bought: number }[];
}

export function householdStats(
  events: StockEvent[],
  products: Product[],
  opts: { now: Date; months: number; soonDays?: number },
): HouseholdStats {
  const { now } = opts;
  const months = lastMonths(now, opts.months);
  const from = months[0].start.getTime();
  const inRange = events.filter((e) => time(e) >= from && time(e) <= now.getTime());
  inRange.forEach((e) => addToMonths(months, e));

  const byProduct = new Map<string, StockEvent[]>();
  for (const e of events) {
    if (!e.product_id) continue;
    const list = byProduct.get(e.product_id) ?? [];
    list.push(e);
    byProduct.set(e.product_id, list);
  }

  const ranked: ProductRank[] = [];
  const soon: { product: Product; at: string }[] = [];
  const categories = new Map<string | null, number>();
  const soonLimit = now.getTime() + (opts.soonDays ?? 7) * DAY;
  for (const product of products) {
    const evs = byProduct.get(product.id);
    if (!evs?.length) continue;
    const stats = productStats(evs, { now, months: opts.months, product });
    if (stats.bought + stats.ranOut >= 2) ranked.push({ product, stats });
    if (stats.bought) categories.set(product.category_id, (categories.get(product.category_id) ?? 0) + stats.bought);
    if (stats.nextOutAt && Date.parse(stats.nextOutAt) <= soonLimit) soon.push({ product, at: stats.nextOutAt });
  }
  ranked.sort(
    (a, b) =>
      b.stats.ranOutPerMonth - a.stats.ranOutPerMonth ||
      b.stats.boughtPerMonth - a.stats.boughtPerMonth ||
      a.product.name.localeCompare(b.product.name),
  );
  soon.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  const firstEvent = inRange.length ? Math.min(...inRange.map(time)) : null;
  const spanMonths = firstEvent === null ? 1 : Math.max(1, (now.getTime() - Math.max(from, firstEvent)) / DAY / MONTH_DAYS);
  const bought = months.reduce((a, m) => a + m.bought, 0);
  return {
    months,
    bought,
    ranOut: months.reduce((a, m) => a + m.ranOut, 0),
    boughtPerMonth: bought / spanMonths,
    top: ranked,
    soon,
    byCategory: [...categories].map(([categoryId, n]) => ({ categoryId, bought: n })).sort((a, b) => b.bought - a.bought),
  };
}

/** Escala «linda» para el eje: 0, 2, 4, 6… hasta cubrir el máximo. */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * pow).find((s) => s >= raw) ?? 10 * pow;
  const s = step < 1 ? 1 : step; // conteos: pasos enteros
  const top = Math.ceil(max / s) * s;
  return Array.from({ length: Math.round(top / s) + 1 }, (_, i) => i * s);
}
