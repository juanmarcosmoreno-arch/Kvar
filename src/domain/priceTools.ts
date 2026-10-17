/**
 * Herramientas del centro de precios: ¿está caro? (historial), tu inflación, comprar en 2 súper y alertas.
 * Todo se calcula en el teléfono con los precios de hoy (precios.uy), lo que se fue guardando día a día y los tickets.
 */
import { pricesByStore, unitPrice, type PurchaseLine } from './spending';

const DAY = 86_400_000;

// --- ¿Está caro? ---------------------------------------------------------------------------------------------

/** Precio de un artículo por día y súper: { '2026-10-17': { 'disco-sipc-37': 245, … } } */
export type PriceHistory = Record<string, Record<string, number>>;

export type Verdict = 'cheap' | 'normal' | 'expensive';

export interface PriceVerdict {
  verdict: Verdict;
  /** Lo normal: entre el percentil 25 y el 75 del precio más barato de cada día */
  low: number;
  high: number;
  /** Hoy, el más barato */
  today: number;
  /** Cuánto se aparta de lo normal (−0,07 = 7 % menos que la mitad de lo normal) */
  diff: number;
  days: number;
}

/** Con menos días que esto todavía no se puede decir qué es «lo normal» */
export const MIN_HISTORY_DAYS = 5;

const quantile = (sorted: number[], q: number) => {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};

/** El más barato de cada día (sin hoy), de los últimos `days` días */
export function dailyMins(history: PriceHistory, today: string, days = 120): { day: string; price: number }[] {
  const since = new Date(Date.parse(`${today}T12:00:00Z`) - days * DAY).toISOString().slice(0, 10);
  return Object.entries(history)
    .filter(([day]) => day < today && day >= since)
    .map(([day, byStore]) => ({ day, price: Math.min(...Object.values(byStore)) }))
    .filter((x) => Number.isFinite(x.price) && x.price > 0)
    .sort((a, b) => a.day.localeCompare(b.day));
}

/** ¿Hoy está barato, normal o caro? (null si todavía no hay suficientes días) */
export function priceVerdict(history: PriceHistory, todayPrice: number, today: string): PriceVerdict | null {
  const mins = dailyMins(history, today).map((x) => x.price);
  if (mins.length < MIN_HISTORY_DAYS || !(todayPrice > 0)) return null;
  const sorted = [...mins].sort((a, b) => a - b);
  const low = quantile(sorted, 0.25);
  const high = quantile(sorted, 0.75);
  const mid = (low + high) / 2;
  const verdict: Verdict = todayPrice < low * 0.98 ? 'cheap' : todayPrice > high * 1.02 ? 'expensive' : 'normal';
  return { verdict, low, high, today: todayPrice, diff: todayPrice / mid - 1, days: mins.length };
}

/** Los precios de los tickets de un producto, como historial (para sumar a lo guardado de precios.uy) */
export function historyFromTickets(lines: PurchaseLine[], productId: string): PriceHistory {
  const out: PriceHistory = {};
  for (const l of lines) {
    if (l.product_id !== productId || !l.store) continue;
    const day = l.bought_at.slice(0, 10);
    const price = unitPrice(l);
    if (!(price > 0)) continue;
    out[day] = { ...(out[day] ?? {}), [`ticket:${l.store}`]: price };
  }
  return out;
}

// --- Tu inflación ----------------------------------------------------------------------------------------------

export interface InflationMonth {
  key: string;
  start: Date;
  /** Cambio de precio contra el mes anterior (0,021 = +2,1 %); null si no hay con qué comparar */
  change: number | null;
  /** Cuántos productos se compararon */
  compared: number;
}

export interface Inflation {
  months: InflationMonth[];
  /** El último mes con datos */
  last: InflationMonth | null;
  /** Lo que más cambió de precio en los últimos 3 meses */
  movers: { productId: string; name: string; change: number }[];
}

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/**
 * Tu inflación: cuánto cambió el precio de lo que comprás, mes a mes. Para cada mes se comparan los productos
 * comprados ese mes y el anterior (precio promedio), pesados por lo que gastaste en cada uno.
 */
export function personalInflation(
  lines: PurchaseLine[],
  names: Map<string, string>,
  opts: { now?: Date; months?: number } = {},
): Inflation {
  const now = opts.now ?? new Date();
  const count = opts.months ?? 6;
  // Producto → mes → [suma de precios, cantidad de compras, gasto]
  const byProduct = new Map<string, Map<string, { sum: number; n: number; spent: number }>>();
  for (const l of lines) {
    if (!l.product_id) continue;
    const price = unitPrice(l);
    if (!(price > 0)) continue;
    const key = monthKey(new Date(l.bought_at));
    const months = byProduct.get(l.product_id) ?? new Map();
    const row = months.get(key) ?? { sum: 0, n: 0, spent: 0 };
    row.sum += price;
    row.n++;
    row.spent += l.total;
    months.set(key, row);
    byProduct.set(l.product_id, months);
  }
  const months: InflationMonth[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const prev = new Date(now.getFullYear(), now.getMonth() - i - 1, 1);
    const k = monthKey(start);
    const pk = monthKey(prev);
    let weighted = 0;
    let weight = 0;
    let compared = 0;
    for (const m of byProduct.values()) {
      const a = m.get(pk);
      const b = m.get(k);
      if (!a || !b) continue;
      const w = a.spent + b.spent;
      weighted += (b.sum / b.n / (a.sum / a.n) - 1) * w;
      weight += w;
      compared++;
    }
    months.push({ key: k, start, change: compared >= 2 && weight > 0 ? weighted / weight : null, compared });
  }
  const last = [...months].reverse().find((x) => x.change != null) ?? null;

  // Lo que más cambió: primer y último precio de los últimos 3 meses
  const since = new Date(now.getFullYear(), now.getMonth() - 2, 1).getTime();
  const movers: Inflation['movers'] = [];
  const recent = new Map<string, PurchaseLine[]>();
  for (const l of lines) {
    if (!l.product_id || Date.parse(l.bought_at) < since) continue;
    recent.set(l.product_id, [...(recent.get(l.product_id) ?? []), l]);
  }
  for (const [productId, ls] of recent) {
    if (ls.length < 2) continue;
    ls.sort((a, b) => a.bought_at.localeCompare(b.bought_at));
    const first = unitPrice(ls[0]);
    const lastPrice = unitPrice(ls[ls.length - 1]);
    if (first > 0 && Date.parse(ls[ls.length - 1].bought_at) - Date.parse(ls[0].bought_at) >= 14 * DAY) {
      movers.push({ productId, name: names.get(productId) ?? ls[0].name, change: lastPrice / first - 1 });
    }
  }
  movers.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  return { months, last, movers: movers.slice(0, 6) };
}

// --- Comprar en 2 súper ----------------------------------------------------------------------------------------

export interface SplitItem {
  id: string;
  name: string;
  /** Lo que pagás en cada súper (ya con descuentos); los que no lo tienen no aparecen */
  prices: Record<string, number>;
  quantity: number;
}

export interface SplitPlan {
  /** El mejor súper para comprar todo junto */
  single: { store: string; total: number };
  /** Repartido entre dos (null si no conviene o no hay con qué) */
  pair: { stores: [string, string]; total: number; byStore: Record<string, SplitItem[]> } | null;
  saving: number;
  /** Lo que el súper principal no tiene (se compra en otro lado igual) */
  uncovered: SplitItem[];
  /** Cuántos ítems de la lista se pudieron comparar */
  compared: number;
}

/**
 * ¿Conviene repartir la compra en dos súper? Se elige el súper que tiene más cosas de la lista (y, entre esos, el
 * más barato) y se prueba con cada otro súper llevando a cada uno lo que ahí sale menos.
 */
export function splitShopping(items: SplitItem[]): SplitPlan | null {
  const priced = items.filter((x) => Object.keys(x.prices).length > 0);
  if (!priced.length) return null;
  const stores = [...new Set(priced.flatMap((x) => Object.keys(x.prices)))];
  const cost = (x: SplitItem, s: string) => x.prices[s] * x.quantity;
  // Súper principal: el que cubre más; a igual cobertura, el más barato en lo que cubre
  const singles = stores.map((s) => {
    const covered = priced.filter((x) => x.prices[s] != null);
    return { store: s, covered, total: covered.reduce((a, x) => a + cost(x, s), 0) };
  });
  singles.sort((a, b) => b.covered.length - a.covered.length || a.total - b.total);
  const main = singles[0];
  const base = main.covered;
  let best: SplitPlan['pair'] = null;
  for (const other of stores) {
    if (other === main.store) continue;
    const byStore: Record<string, SplitItem[]> = { [main.store]: [], [other]: [] };
    let total = 0;
    for (const x of base) {
      const a = cost(x, main.store);
      const b = x.prices[other] != null ? cost(x, other) : Infinity;
      if (b < a) {
        byStore[other].push(x);
        total += b;
      } else {
        byStore[main.store].push(x);
        total += a;
      }
    }
    if (!byStore[other].length) continue;
    if (!best || total < best.total) best = { stores: [main.store, other], total, byStore };
  }
  return {
    single: { store: main.store, total: main.total },
    pair: best,
    saving: best ? main.total - best.total : 0,
    uncovered: priced.filter((x) => x.prices[main.store] == null),
    compared: base.length,
  };
}

// --- Alertas -------------------------------------------------------------------------------------------------

export type AlertKind = 'below' | 'offer' | 'cheap';

export interface PriceAlert {
  id: string;
  /** Artículo de precios.uy (clave) y su nombre */
  item: string;
  name: string;
  kind: AlertKind;
  /** below: precio máximo; cheap: % por debajo de lo normal (10 = 10 %) */
  value: number | null;
  created_at: string;
  /** Último día que se avisó (para no repetir) */
  notified?: string | null;
}

export interface AlertHit {
  alert: PriceAlert;
  price: number;
  store: string;
  offer: boolean;
}

/** ¿Se cumple la alerta hoy? `now` = precio más barato hoy (y si está en oferta), `verdict` = ¿está caro? */
export function checkAlert(
  alert: PriceAlert,
  now: { price: number; store: string; offer: boolean } | null,
  verdict: PriceVerdict | null,
): AlertHit | null {
  if (!now) return null;
  const hit =
    alert.kind === 'below' ? alert.value != null && now.price <= alert.value
      : alert.kind === 'offer' ? now.offer
        : verdict != null && now.price <= ((verdict.low + verdict.high) / 2) * (1 - (alert.value ?? 10) / 100);
  return hit ? { alert, ...now } : null;
}

/** Último precio de cada súper para un producto, con el nombre del ticket (para mostrar en «¿Está caro?») */
export function latestTicketPrices(lines: PurchaseLine[], productId: string, now = new Date()) {
  return pricesByStore(lines.filter((l) => l.product_id === productId), now).get(productId) ?? [];
}
