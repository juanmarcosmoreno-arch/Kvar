/**
 * Gastos a partir de los precios de los tickets: cuánto se gasta por mes, por categoría y por producto,
 * y cómo cambian los precios. Todo se calcula en el teléfono.
 */
import { lastMonths, monthKey } from './stats';
import type { Product } from './types';

export interface PurchaseLine {
  id: string;
  household_id: string;
  product_id: string | null;
  /** Como venía en el ticket («Azúcar Bella Unión 1 kg») */
  name: string;
  /** Unidades o kilos */
  quantity: number;
  unit_price: number | null;
  total: number;
  store: string | null;
  bought_at: string;
  /** Mismo valor para todas las líneas de un ticket (para el promedio por compra) */
  receipt_key: string | null;
  /** Quién pagó (para dividir gastos) */
  paid_by?: string | null;
  /** Cuándo se cargó (un ticket viejo cargado después de «Saldar» cuenta para la próxima) */
  created_at?: string;
}

export const unitPrice = (l: PurchaseLine) => l.unit_price ?? (l.quantity > 0 ? l.total / l.quantity : l.total);

export interface MoneyMonth {
  key: string;
  start: Date;
  total: number;
}

export interface SpendingStats {
  months: MoneyMonth[];
  total: number;
  perMonth: number;
  /** Compras (tickets) en el período y gasto promedio por compra */
  trips: number;
  perTrip: number | null;
  byCategory: { categoryId: string | null; total: number }[];
  byProduct: { productId: string | null; name: string; total: number }[];
  /** Lo que más cambió de precio (primera vs. última compra del período) */
  priceChanges: PriceChange[];
}

export interface PriceChange {
  productId: string;
  name: string;
  first: number;
  last: number;
  /** 0.12 = subió 12 % */
  change: number;
}

const DAY = 86_400_000;
const time = (l: PurchaseLine) => Date.parse(l.bought_at);

export function spendingStats(
  lines: PurchaseLine[],
  products: Product[],
  opts: { now: Date; months: number },
): SpendingStats {
  const { now } = opts;
  const months: MoneyMonth[] = lastMonths(now, opts.months).map(({ key, start }) => ({ key, start, total: 0 }));
  const from = months[0].start.getTime();
  const inRange = lines.filter((l) => time(l) >= from && time(l) <= now.getTime()).sort((a, b) => time(a) - time(b));
  const byId = new Map(products.map((p) => [p.id, p]));

  const categories = new Map<string | null, number>();
  const byProduct = new Map<string, { productId: string | null; name: string; total: number }>();
  const receipts = new Set<string>();
  const history = new Map<string, PurchaseLine[]>();
  for (const l of inRange) {
    const month = months.find((x) => x.key === monthKey(new Date(l.bought_at)));
    if (month) month.total += l.total;
    receipts.add(l.receipt_key ?? `${l.store ?? ''}|${l.bought_at.slice(0, 10)}`);
    const product = l.product_id ? byId.get(l.product_id) : undefined;
    const cat = product?.category_id ?? null;
    categories.set(cat, (categories.get(cat) ?? 0) + l.total);
    const key = product ? product.id : `name:${l.name.toLowerCase()}`;
    const row = byProduct.get(key) ?? { productId: product?.id ?? null, name: product?.name ?? l.name, total: 0 };
    row.total += l.total;
    byProduct.set(key, row);
    if (product) history.set(product.id, [...(history.get(product.id) ?? []), l]);
  }

  const priceChanges: PriceChange[] = [];
  for (const [productId, ls] of history) {
    if (ls.length < 2) continue;
    const first = unitPrice(ls[0]);
    const last = unitPrice(ls[ls.length - 1]);
    if (first <= 0 || time(ls[ls.length - 1]) - time(ls[0]) < 14 * DAY) continue;
    priceChanges.push({ productId, name: byId.get(productId)!.name, first, last, change: last / first - 1 });
  }
  priceChanges.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

  const total = months.reduce((a, m) => a + m.total, 0);
  const firstAt = inRange.length ? time(inRange[0]) : null;
  const spanMonths = firstAt === null ? 1 : Math.max(1, (now.getTime() - Math.max(from, firstAt)) / DAY / 30.44);
  return {
    months,
    total,
    perMonth: total / spanMonths,
    trips: receipts.size,
    perTrip: receipts.size ? total / receipts.size : null,
    byCategory: [...categories].map(([categoryId, t]) => ({ categoryId, total: t })).sort((a, b) => b.total - a.total),
    byProduct: [...byProduct.values()].sort((a, b) => b.total - a.total),
    priceChanges,
  };
}

/** Precio de un producto: el último y cuánto cambió respecto del más viejo (en los últimos 6 meses). */
export function priceOf(lines: PurchaseLine[], productId: string, now = new Date()): {
  last: number; lastAt: string; change: number | null; points: { at: string; price: number }[];
} | null {
  const since = now.getTime() - 183 * DAY;
  const own = lines.filter((l) => l.product_id === productId && time(l) >= since).sort((a, b) => time(a) - time(b));
  if (!own.length) return null;
  const points = own.map((l) => ({ at: l.bought_at, price: unitPrice(l) }));
  const first = points[0].price;
  const last = points[points.length - 1].price;
  return {
    last,
    lastAt: points[points.length - 1].at,
    change: own.length >= 2 && first > 0 ? last / first - 1 : null,
    points,
  };
}

/**
 * Id estable para una línea de ticket: si se vuelve a cargar el mismo ticket, no se cuenta dos veces.
 * (Formato UUID a partir de un hash; no es criptográfico, solo para no duplicar.)
 */
export function stableLineId(householdId: string, receiptKey: string, index: number): string {
  const text = `${householdId}|${receiptKey}|${index}`;
  const parts: string[] = [];
  for (let k = 0; k < 4; k++) {
    let h = 2166136261 ^ k;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
    parts.push((h >>> 0).toString(16).padStart(8, '0'));
  }
  const hex = parts.join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** Ticket → clave: el mismo ticket da la misma clave (súper, fecha y total). */
export function receiptKey(store: string | null, date: string | null, total: number | null, lineCount: number): string {
  return [store ?? '', date ?? '', total?.toFixed(2) ?? '', lineCount].join('|');
}

// --- ¿Dónde conviene? ---------------------------------------------------------------------------------------

export const KNOWN_STORES: Record<string, string> = {
  macromercado: 'Macromercado', 'tienda-inglesa': 'Tienda Inglesa', disco: 'Disco', devoto: 'Devoto',
  geant: 'Géant', tata: 'Ta-Ta', 'el-dorado': 'El Dorado', 'multi-ahorro': 'Multi Ahorro', kinko: 'Kinko',
};

/** «Tienda Inglesa», «tienda-inglesa», «TIENDA INGLESA » → la misma clave */
export function storeKey(store: string | null): string | null {
  if (!store) return null;
  const key = store.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return key || null;
}

/** Nombres de los locales de precios.uy («Disco Chucarro»), los registra la app al traer los precios */
const extraLabels = new Map<string, string>();
export function registerStoreLabels(labels: Iterable<[string, string]>) {
  for (const [k, v] of labels) extraLabels.set(k, v);
}

/** Nombre para mostrar a partir de la clave */
export function storeLabel(key: string): string {
  return extraLabels.get(key) ?? KNOWN_STORES[key] ?? key.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export interface StorePrice {
  store: string;
  /** Último precio por unidad (o por kilo) en ese súper */
  price: number;
  at: string;
}

/** Comparar precios de hace más de 6 meses no sirve (todo subió) */
const COMPARE_DAYS = 183;
/** Diferencias más chicas que esto son ruido (ofertas, redondeos) */
export const MIN_SAVING = 0.05;

/** Último precio de cada súper para cada producto (del más barato al más caro). */
export function pricesByStore(lines: PurchaseLine[], now: Date): Map<string, StorePrice[]> {
  const since = now.getTime() - COMPARE_DAYS * DAY;
  const latest = new Map<string, Map<string, StorePrice>>();
  for (const l of lines) {
    const store = storeKey(l.store);
    const t = time(l);
    if (!l.product_id || !store || !(t >= since) || t > now.getTime()) continue;
    const price = unitPrice(l);
    if (!(price > 0)) continue;
    const byStore = latest.get(l.product_id) ?? new Map<string, StorePrice>();
    const prev = byStore.get(store);
    if (!prev || Date.parse(prev.at) <= t) byStore.set(store, { store, price, at: l.bought_at });
    latest.set(l.product_id, byStore);
  }
  const out = new Map<string, StorePrice[]>();
  for (const [id, byStore] of latest) out.set(id, [...byStore.values()].sort((a, b) => a.price - b.price));
  return out;
}

export interface StoreDeal {
  productId: string;
  name: string;
  best: StorePrice;
  worst: StorePrice;
  /** 0.18 = en `best` sale 18 % menos que en `worst` */
  saving: number;
}

export interface StoreIndex {
  store: string;
  /** Cuánto más caro que el más barato, en promedio (0 = siempre el más barato) */
  overCheapest: number;
  /** En cuántos productos es el más barato / con cuántos se comparó */
  cheapest: number;
  compared: number;
}

export interface WhereCheaper {
  stores: StoreIndex[];
  deals: StoreDeal[];
}

/**
 * ¿Dónde conviene? Solo cuenta productos comprados en más de un súper en los últimos 6 meses, comparando el
 * último precio de cada uno. Por súper: cuánto más caro sale en promedio que el más barato de cada producto.
 */
export function whereCheaper(lines: PurchaseLine[], products: Product[], now = new Date()): WhereCheaper {
  const byId = new Map(products.map((p) => [p.id, p]));
  const stats = new Map<string, { over: number; cheapest: number; compared: number }>();
  const deals: StoreDeal[] = [];
  for (const [productId, prices] of pricesByStore(lines, now)) {
    const product = byId.get(productId);
    if (!product || prices.length < 2) continue;
    const best = prices[0];
    const worst = prices[prices.length - 1];
    for (const p of prices) {
      const s = stats.get(p.store) ?? { over: 0, cheapest: 0, compared: 0 };
      s.over += p.price / best.price - 1;
      s.compared++;
      if (p.price <= best.price) s.cheapest++;
      stats.set(p.store, s);
    }
    const saving = 1 - best.price / worst.price;
    if (saving >= MIN_SAVING) deals.push({ productId, name: product.name, best, worst, saving });
  }
  deals.sort((a, b) => b.saving - a.saving);
  const stores = [...stats]
    .map(([store, s]) => ({ store, overCheapest: s.over / s.compared, cheapest: s.cheapest, compared: s.compared }))
    .sort((a, b) => a.overCheapest - b.overCheapest || b.compared - a.compared);
  return { stores, deals };
}

/** Precio de un producto en cada súper (para su ficha), del más barato al más caro. */
export function storePricesOf(lines: PurchaseLine[], productId: string, now = new Date()): StorePrice[] {
  return pricesByStore(lines.filter((l) => l.product_id === productId), now).get(productId) ?? [];
}

/**
 * Para la lista: en qué súper conviene cada producto (solo si la diferencia vale la pena).
 * product_id → { store, saving }. `adjust` aplica los descuentos con tarjeta (precio de góndola → lo que se paga).
 */
export function cheaperAt(
  lines: PurchaseLine[],
  now = new Date(),
  adjust?: (store: string, price: number) => number,
): Map<string, { store: string; saving: number }> {
  const out = new Map<string, { store: string; saving: number }>();
  for (const [productId, raw] of pricesByStore(lines, now)) {
    if (raw.length < 2) continue;
    const prices = adjust ? raw.map((p) => ({ ...p, price: adjust(p.store, p.price) })).sort((a, b) => a.price - b.price) : raw;
    // Contra el segundo más barato: «conviene en X» tiene que ser cierto aunque haya un tercero carísimo
    const saving = 1 - prices[0].price / prices[1].price;
    if (saving >= MIN_SAVING) out.set(productId, { store: prices[0].store, saving });
  }
  return out;
}
