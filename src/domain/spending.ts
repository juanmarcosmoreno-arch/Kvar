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
