/**
 * Lista ordenada por pasillo: la app aprende en qué orden se tachan las cosas en el súper y la próxima vez
 * ordena la lista igual (frutas primero, lácteos al final…). No hay que configurar nada.
 *
 * Cada tilde en la lista deja un evento «purchased» con la hora del teléfono. Los tildes de una misma persona
 * con menos de 40 minutos entre uno y otro son una compra. De cada compra sale la posición de cada producto
 * (0 = lo primero que se agarró, 1 = lo último); las compras recientes pesan más.
 *
 * Lo que se tacha todo junto al volver a casa (en un minuto) no enseña nada: se ignora.
 */
import type { StockEvent } from './stats';
import type { Product } from './types';

export interface AisleOrder {
  /** product_id → posición aprendida (0 = entrada del súper, 1 = cajas) */
  product: Map<string, number>;
  /** category_id → posición promedio de sus productos */
  category: Map<string, number>;
  /** Compras de las que se aprendió */
  trips: number;
}

const DAY = 86_400_000;
const TRIP_GAP = 40 * 60_000;
/** Menos que esto entre el primer y el último tilde = se tachó todo de una, en casa */
const MIN_TRIP_SPAN = 2 * 60_000;
const MIN_TRIP_ITEMS = 3;
/** Cada 60 días una compra pesa la mitad (si cambia el súper, la lista se acomoda sola) */
const HALF_LIFE_DAYS = 60;
/** Con menos compras que esto, la lista sigue por categoría */
export const MIN_TRIPS = 2;

export function learnAisleOrder(events: StockEvent[], products: Pick<Product, 'id' | 'category_id'>[], now = Date.now()): AisleOrder {
  const ticks = events
    .filter((e) => e.product_id && e.type === 'purchased' && (e.source == null || e.source === 'shopping'))
    .map((e) => ({ product: e.product_id!, who: e.user_id ?? '', t: Date.parse(e.at) }))
    .filter((e) => Number.isFinite(e.t))
    .sort((a, b) => a.t - b.t);

  // Compras: por persona, cortando cuando pasa mucho entre un tilde y el siguiente
  const trips: { t: number; products: string[] }[] = [];
  const open = new Map<string, { first: number; last: number; products: string[] }>();
  const close = (who: string) => {
    const trip = open.get(who);
    open.delete(who);
    if (!trip || trip.products.length < MIN_TRIP_ITEMS || trip.last - trip.first < MIN_TRIP_SPAN) return;
    trips.push({ t: trip.last, products: trip.products });
  };
  for (const tick of ticks) {
    const trip = open.get(tick.who);
    if (trip && tick.t - trip.last > TRIP_GAP) close(tick.who);
    const current = open.get(tick.who) ?? { first: tick.t, last: tick.t, products: [] };
    if (!current.products.includes(tick.product)) current.products.push(tick.product);
    current.last = tick.t;
    open.set(tick.who, current);
  }
  [...open.keys()].forEach(close);

  const sums = new Map<string, { w: number; x: number }>();
  for (const trip of trips) {
    const weight = 0.5 ** (Math.max(0, now - trip.t) / DAY / HALF_LIFE_DAYS);
    const n = trip.products.length;
    trip.products.forEach((id, i) => {
      const s = sums.get(id) ?? { w: 0, x: 0 };
      s.w += weight;
      s.x += weight * (i / (n - 1));
      sums.set(id, s);
    });
  }

  const product = new Map<string, number>();
  for (const [id, s] of sums) product.set(id, s.x / s.w);

  const byCategory = new Map<string, { w: number; x: number }>();
  for (const p of products) {
    const s = p.category_id ? sums.get(p.id) : undefined;
    if (!s || !p.category_id) continue;
    const c = byCategory.get(p.category_id) ?? { w: 0, x: 0 };
    c.w += s.w;
    c.x += s.x;
    byCategory.set(p.category_id, c);
  }
  const category = new Map<string, number>();
  for (const [id, c] of byCategory) category.set(id, c.x / c.w);

  return { product, category, trips: trips.length };
}

/** Posición de un producto: la suya, o la de su categoría si nunca se compró desde la lista. */
export function aislePosition(order: AisleOrder, product: Pick<Product, 'id' | 'category_id'> | undefined): number | null {
  if (!product) return null;
  return order.product.get(product.id) ?? (product.category_id ? order.category.get(product.category_id) ?? null : null);
}
