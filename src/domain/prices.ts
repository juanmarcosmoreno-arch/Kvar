/**
 * Comparador de precios: el último precio de cada súper (de los tickets), con los descuentos de tus tarjetas.
 * Todo se calcula en el teléfono.
 */
import { MIN_SAVING, pricesByStore, storeKey, type PurchaseLine, type StorePrice } from './spending';
import { chainOfKey } from './sipc';
import type { Product, ShoppingItem } from './types';

/** «15 % en Disco los martes y jueves con Itaú (tope $1.500 por compra)» */
export interface StoreDiscount {
  id: string;
  /** Clave del súper (storeKey) */
  store: string;
  /** 15 = 15 % */
  percent: number;
  /** Días de la semana (0 = domingo); vacío = todos los días */
  days: number[];
  /** Tarjeta o banco (para recordar cuál usar) */
  card: string;
  /** Tope de reintegro por compra (null = sin tope) */
  cap: number | null;
}

/** Para qué día comparar: un día de la semana, el mejor día de cada súper o sin descuentos */
export type When = number | 'best' | 'none';

const DAY = 86_400_000;

/** El mejor descuento de ese súper para ese día */
export function discountFor(discounts: StoreDiscount[], store: string, when: When): StoreDiscount | null {
  if (when === 'none') return null;
  let best: StoreDiscount | null = null;
  for (const d of discounts) {
    // Los locales de precios.uy («disco-sipc-37») usan los descuentos de su cadena
    if ((d.store !== store && d.store !== chainOfKey(store)) || !(d.percent > 0)) continue;
    if (when !== 'best' && d.days.length > 0 && !d.days.includes(when)) continue;
    if (!best || d.percent > best.percent) best = d;
  }
  return best;
}

/** Lo que se paga: precio de góndola menos el descuento (sin tope: el tope es por compra, no por producto) */
export function withDiscount(price: number, discount: StoreDiscount | null): number {
  return discount ? price * (1 - Math.min(discount.percent, 100) / 100) : price;
}

/** Sin los súper que se sacaron de la comparación */
export function visibleLines(lines: PurchaseLine[], hidden: ReadonlySet<string>): PurchaseLine[] {
  if (!hidden.size) return lines;
  return lines.filter((l) => {
    const key = storeKey(l.store);
    return !key || !hidden.has(key);
  });
}

export interface Offer extends StorePrice {
  /** Lo que pagás vos (con el descuento de la tarjeta) */
  effective: number;
  discount: StoreDiscount | null;
}

/** Los precios de un producto en cada súper, del que te sale más barato al más caro */
export function offers(prices: StorePrice[], discounts: StoreDiscount[], when: When): Offer[] {
  return prices
    .map((p) => {
      const discount = discountFor(discounts, p.store, when);
      return { ...p, discount, effective: withDiscount(p.price, discount) };
    })
    .sort((a, b) => a.effective - b.effective);
}

export interface PriceRow {
  product: Product;
  offers: Offer[];
  /** Cuánto menos sale en el más barato que en el segundo (0 si hay uno solo) */
  saving: number;
}

export interface CompareOptions {
  discounts: StoreDiscount[];
  when: When;
  now?: Date;
  /** Qué productos y cuántos forman la canasta (si no, lo comprado seguido según las mismas líneas) */
  basket?: Map<string, number>;
}

/** Todos los productos con algún precio, con sus precios por súper */
export function priceTable(lines: PurchaseLine[], products: Product[], opts: CompareOptions): PriceRow[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const rows: PriceRow[] = [];
  for (const [productId, prices] of pricesByStore(lines, opts.now ?? new Date())) {
    const product = byId.get(productId);
    if (!product) continue;
    const list = offers(prices, opts.discounts, opts.when);
    const saving = list.length >= 2 ? 1 - list[0].effective / list[1].effective : 0;
    rows.push({ product, offers: list, saving });
  }
  return rows;
}

// --- Tu canasta -----------------------------------------------------------------------------------------------

/** Lo que comprás seguido: al menos 2 veces en los últimos 6 meses. Cantidad = lo que llevás en promedio. */
export function usualBasket(lines: PurchaseLine[], now = new Date(), minTimes = 2): Map<string, number> {
  const since = now.getTime() - 183 * DAY;
  const seen = new Map<string, { times: Set<string>; qty: number; n: number }>();
  for (const l of lines) {
    const t = Date.parse(l.bought_at);
    if (!l.product_id || !(t >= since) || t > now.getTime()) continue;
    const row = seen.get(l.product_id) ?? { times: new Set<string>(), qty: 0, n: 0 };
    row.times.add(l.receipt_key ?? l.bought_at.slice(0, 10));
    row.qty += l.quantity > 0 ? l.quantity : 1;
    row.n++;
    seen.set(l.product_id, row);
  }
  const out = new Map<string, number>();
  for (const [id, r] of seen) if (r.times.size >= minTimes) out.set(id, r.qty / r.n);
  return out;
}

export interface BasketStore {
  store: string;
  /** Lo que saldría la canasta ahí, con el descuento */
  total: number;
  /** El descuento que se aplicó (ya con el tope) */
  saved: number;
  discount: StoreDiscount | null;
  /** De cuántos productos de la canasta hay precio en ese súper (el resto se estima) */
  known: number;
}

export interface Basket {
  items: number;
  stores: BasketStore[];
}

/** Con menos productos conocidos, la estimación no vale la pena */
const MIN_KNOWN = 3;

/**
 * ¿Cuánto te saldría lo de siempre en cada súper? Lo que no tiene precio en un súper se estima con lo caro o
 * barato que es ese súper en lo que sí se pudo comparar (relativo al más barato de cada producto).
 */
export function basketByStore(lines: PurchaseLine[], opts: CompareOptions): Basket {
  const now = opts.now ?? new Date();
  const basket = opts.basket ?? usualBasket(lines, now);
  const prices = pricesByStore(lines, now);
  const ref = new Map<string, number>();
  const byStore = new Map<string, Map<string, number>>();
  for (const [productId] of basket) {
    const list = prices.get(productId);
    if (!list?.length) continue;
    ref.set(productId, list[0].price);
    for (const p of list) {
      const own = byStore.get(p.store) ?? new Map<string, number>();
      own.set(productId, p.price);
      byStore.set(p.store, own);
    }
  }
  const stores: BasketStore[] = [];
  for (const [store, own] of byStore) {
    if (own.size < Math.min(MIN_KNOWN, ref.size)) continue;
    let ratio = 0;
    for (const [id, price] of own) ratio += price / ref.get(id)!;
    ratio /= own.size;
    let shelf = 0;
    for (const [id, base] of ref) shelf += basket.get(id)! * (own.get(id) ?? base * ratio);
    const discount = discountFor(opts.discounts, store, opts.when);
    const saved = discount ? Math.min((shelf * discount.percent) / 100, discount.cap ?? Infinity) : 0;
    stores.push({ store, total: shelf - saved, saved, discount, known: own.size });
  }
  stores.sort((a, b) => a.total - b.total);
  return { items: ref.size, stores: stores.length >= 2 ? stores : [] };
}

// --- Estoy en el súper -------------------------------------------------------------------------------------------

export interface StoreTip {
  productId: string;
  name: string;
  /** Lo que pagás acá */
  here: number;
  /** El mejor de los otros súper */
  other: Offer;
  /** buy: «acá está más barato que en `other`»; elsewhere: «en `other` sale `saving` menos» */
  saving: number;
}

export interface AtStore {
  /** De la lista: conviene llevarlo acá */
  buyHere: StoreTip[];
  /** De la lista: mejor en otro lado */
  elsewhere: StoreTip[];
  /** No está en la lista pero lo comprás seguido y acá está bastante más barato */
  deals: StoreTip[];
}

/** Para «Aprovechá» la diferencia tiene que ser más clara (no es algo que ibas a comprar) */
const DEAL_SAVING = 0.1;

export function atStore(
  lines: PurchaseLine[],
  products: Product[],
  list: ShoppingItem[],
  store: string,
  opts: CompareOptions,
): AtStore {
  const now = opts.now ?? new Date();
  const byId = new Map(products.map((p) => [p.id, p]));
  const prices = pricesByStore(lines, now);
  const onList = new Set(list.filter((i) => !i.checked_at && i.product_id).map((i) => i.product_id!));
  const result: AtStore = { buyHere: [], elsewhere: [], deals: [] };

  const compare = (productId: string) => {
    const product = byId.get(productId);
    const list = prices.get(productId);
    if (!product || !list) return null;
    const all = offers(list, opts.discounts, opts.when);
    const here = all.find((o) => o.store === store);
    const other = all.find((o) => o.store !== store);
    if (!here || !other) return null;
    return { product, here, other };
  };

  for (const productId of onList) {
    const c = compare(productId);
    if (!c) continue;
    const { product, here, other } = c;
    if (other.effective <= here.effective * (1 - MIN_SAVING)) {
      result.elsewhere.push({ productId, name: product.name, here: here.effective, other, saving: 1 - other.effective / here.effective });
    } else if (here.effective <= other.effective * (1 - MIN_SAVING)) {
      result.buyHere.push({ productId, name: product.name, here: here.effective, other, saving: 1 - here.effective / other.effective });
    }
  }
  for (const productId of usualBasket(lines, now).keys()) {
    if (onList.has(productId)) continue;
    const c = compare(productId);
    if (!c) continue;
    const saving = 1 - c.here.effective / c.other.effective;
    if (saving >= DEAL_SAVING) result.deals.push({ productId, name: c.product.name, here: c.here.effective, other: c.other, saving });
  }
  const bySaving = (a: StoreTip, b: StoreTip) => b.saving - a.saving;
  result.buyHere.sort(bySaving);
  result.elsewhere.sort(bySaving);
  result.deals.sort(bySaving);
  result.deals = result.deals.slice(0, 5);
  return result;
}

/** Los súper con algún precio en los últimos 6 meses (claves) */
export function storesWithPrices(lines: PurchaseLine[], now = new Date()): string[] {
  const since = now.getTime() - 183 * DAY;
  const out = new Set<string>();
  for (const l of lines) {
    const key = storeKey(l.store);
    if (key && l.product_id && Date.parse(l.bought_at) >= since) out.add(key);
  }
  return [...out];
}
