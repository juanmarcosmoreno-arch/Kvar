/**
 * Precios de hoy de precios.uy (SIPC, Ministerio de Economía y Finanzas; solo Uruguay).
 *
 * precios.uy publica unos 200 artículos fijos (marca y tamaño: «Arroz blanco - Vidarroz, 1.0») con el precio del día
 * en cada súper. Acá se relaciona cada producto del hogar con un artículo y se convierten los precios de hoy en
 * «líneas de ticket», así el comparador (prices.ts) los usa igual que los tickets.
 */
import type { PurchaseLine, StorePrice } from './spending';
import type { Product } from './types';

export interface SipcStore {
  id: number;
  name: string;
  /** Cadena (disco, tata, tienda-inglesa…): los descuentos con tarjeta se cargan por cadena */
  chain: string;
  address: string;
  lat: number;
  lng: number;
}

export interface SipcPrice {
  name: string;
  price: number;
  offer: boolean;
  date: string | null;
}

export interface SipcData {
  stores: SipcStore[];
  prices: Record<number, SipcPrice[]>;
  /** Cuándo se trajeron */
  at: string;
}

/** Clave de súper para un local de precios.uy: empieza con la cadena, así le tocan sus descuentos */
export const sipcStoreKey = (s: Pick<SipcStore, 'id' | 'chain'>) => `${s.chain}-sipc-${s.id}`;
export const isSipcStore = (key: string) => /-sipc-\d+$/.test(key);
/** «disco-sipc-37» → «disco» */
export const chainOfKey = (key: string) => key.replace(/-sipc-\d+$/, '');

const fold = (s: string) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** El mismo artículo escrito distinto («Arroz Blanco - Aruba , 1.0» = «Arroz blanco - Aruba, 1.0») */
export const itemKey = (name: string) => fold(name).replace(/\s*,\s*/g, ', ').replace(/\s*-\s*/g, ' - ');

/** «Arroz blanco - Vidarroz, 1.0» → «Arroz blanco Vidarroz»; «Aceite de girasol - Óptimo, 900.0» → «… 900» */
export function itemLabel(name: string): string {
  const m = /^(.*?),\s*([A-Za-zÁÉÍÓÚáéíóú]*\s*)?([\d.]+)\s*$/.exec(name.trim());
  const base = (m ? m[1] : name).replace(/\s+-\s+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!m) return base;
  const n = Number(m[3]);
  const size = n === 1 ? '' : ` ${(m[2] ?? '').trim()} ${Number.isInteger(n) ? n : n.toString().replace('.', ',')}`.replace(/\s+/g, ' ');
  return `${base}${size}`.trim();
}

const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'con', 'sin', 'en', 'y', 'para', 'tipo', 'x']);

function stems(s: string): string[] {
  return fold(s)
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .split(' ')
    .filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d/.test(w))
    .map((w) => (w.length > 4 && w.endsWith('es') ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w));
}

/**
 * Artículos de precios.uy que corresponden a un producto: todas las palabras del producto tienen que estar en el
 * artículo («Yerba» → todas las yerbas; «Yerba Canarias» → solo Canarias). Los más parecidos primero.
 */
export function matchItems(productName: string, items: string[]): string[] {
  const own = stems(productName);
  if (!own.length) return [];
  const scored: { name: string; extra: number }[] = [];
  for (const name of items) {
    const theirs = stems(name);
    if (!own.every((w) => theirs.includes(w))) continue;
    // El producto tiene que ser lo que es el artículo, no un ingrediente («Leche» no es «Dulce de leche»)
    if (theirs[0] !== own[0]) continue;
    scored.push({ name, extra: theirs.length - own.length });
  }
  return scored.sort((a, b) => a.extra - b.extra || a.name.localeCompare(b.name)).map((s) => s.name);
}

export interface SipcMatch {
  product: Product;
  /** El artículo con el que se compara (clave; elegido o el que más súper tienen) */
  item: string;
  /** Su nombre tal cual lo publica precios.uy */
  itemName: string;
  /** Todos los que corresponden (para elegir otra marca) */
  options: string[];
}

/** Para cada producto del hogar, el artículo de precios.uy con el que se compara */
export function matchProducts(products: Product[], data: SipcData, pins: Record<string, string>): SipcMatch[] {
  const count = new Map<string, number>();
  const label = new Map<string, string>();
  const price = new Map<string, number>();
  for (const list of Object.values(data.prices)) {
    for (const p of list) {
      const k = itemKey(p.name);
      count.set(k, (count.get(k) ?? 0) + 1);
      if (!label.has(k)) label.set(k, p.name);
      price.set(k, Math.min(price.get(k) ?? Infinity, p.price));
    }
  }
  const names = [...label.values()];
  const out: SipcMatch[] = [];
  for (const product of products) {
    const options = matchItems(product.name, names).map(itemKey);
    if (!options.length) continue;
    const pinned = pins[product.id];
    // Sin elegir: el que está en más súper (para comparar lo mismo) y, entre esos, el más barato
    const item = pinned && count.has(pinned)
      ? pinned
      : [...options].sort((a, b) => (count.get(b) ?? 0) - (count.get(a) ?? 0) || (price.get(a) ?? 0) - (price.get(b) ?? 0))[0];
    out.push({ product, item, itemName: label.get(item) ?? item, options });
  }
  return out;
}

/** Los precios de hoy como líneas de ticket (un «ticket» por local), solo de los productos relacionados */
export function sipcLines(data: SipcData, matches: SipcMatch[], householdId = 'sipc'): PurchaseLine[] {
  const byItem = new Map<string, SipcMatch[]>();
  for (const m of matches) byItem.set(m.item, [...(byItem.get(m.item) ?? []), m]);
  const lines: PurchaseLine[] = [];
  for (const store of data.stores) {
    const key = sipcStoreKey(store);
    for (const p of data.prices[store.id] ?? []) {
      for (const m of byItem.get(itemKey(p.name)) ?? []) {
        lines.push({
          id: `sipc-${store.id}-${m.product.id}`,
          household_id: householdId,
          product_id: m.product.id,
          name: p.name,
          quantity: 1,
          unit_price: p.price,
          total: p.price,
          store: key,
          // El comienzo de ese día en Uruguay (UTC−3), nunca después de cuando se trajeron
          bought_at: p.date ? new Date(Math.min(Date.parse(`${p.date}T03:00:00.000Z`), Date.parse(data.at))).toISOString() : data.at,
          receipt_key: `sipc-${store.id}`,
        });
      }
    }
  }
  return lines;
}

export interface SipcItem {
  key: string;
  name: string;
  /** Precio en cada local elegido (como en el comparador: clave del súper, precio y fecha) */
  prices: StorePrice[];
  offers: Set<string>;
}

/**
 * Buscar en todo lo que publica precios.uy en los súper elegidos (no solo lo que hay en el hogar).
 * Todas las palabras tienen que estar en el nombre («queso danbo», «coca»); sin importar tildes ni plurales.
 */
export function searchItems(data: SipcData, query: string, limit = 30): SipcItem[] {
  const words = fold(query)
    .split(/[^a-z0-9ñ]+/)
    .filter((w) => w.length >= 2)
    .map((w) => (w.length > 4 && w.endsWith('es') ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w));
  if (!words.length) return [];
  const byKey = new Map<string, SipcItem>();
  for (const store of data.stores) {
    for (const p of data.prices[store.id] ?? []) {
      const key = itemKey(p.name);
      if (!words.every((w) => key.includes(w))) continue;
      const item = byKey.get(key) ?? { key, name: p.name, prices: [], offers: new Set<string>() };
      const storeKey = sipcStoreKey(store);
      item.prices.push({ store: storeKey, name: p.name, price: p.price, at: p.date ?? data.at });
      if (p.offer) item.offers.add(storeKey);
      byKey.set(key, item);
    }
  }
  return [...byKey.values()]
    .sort((a, b) => b.prices.length - a.prices.length || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** Distancia aproximada en km */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dy = (a.lat - b.lat) * 111;
  const dx = (a.lng - b.lng) * 111 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dx, dy);
}

/** Capitales departamentales, para elegir la zona sin ubicación */
export const DEPARTMENTS: { name: string; lat: number; lng: number }[] = [
  { name: 'Montevideo', lat: -34.9055, lng: -56.1913 },
  { name: 'Artigas', lat: -30.4013, lng: -56.4676 },
  { name: 'Canelones', lat: -34.5228, lng: -56.2778 },
  { name: 'Ciudad de la Costa', lat: -34.8167, lng: -55.95 },
  { name: 'Cerro Largo (Melo)', lat: -32.3703, lng: -54.1675 },
  { name: 'Colonia', lat: -34.4626, lng: -57.8398 },
  { name: 'Durazno', lat: -33.3806, lng: -56.5236 },
  { name: 'Flores (Trinidad)', lat: -33.5165, lng: -56.8996 },
  { name: 'Florida', lat: -34.0956, lng: -56.2142 },
  { name: 'Lavalleja (Minas)', lat: -34.3759, lng: -55.2377 },
  { name: 'Maldonado', lat: -34.9, lng: -54.95 },
  { name: 'Punta del Este', lat: -34.9625, lng: -54.9469 },
  { name: 'Paysandú', lat: -32.3171, lng: -58.0807 },
  { name: 'Río Negro (Fray Bentos)', lat: -33.1165, lng: -58.3107 },
  { name: 'Rivera', lat: -30.9053, lng: -55.5508 },
  { name: 'Rocha', lat: -34.4833, lng: -54.3333 },
  { name: 'Salto', lat: -31.3833, lng: -57.9667 },
  { name: 'San José', lat: -34.3375, lng: -56.7136 },
  { name: 'Soriano (Mercedes)', lat: -33.2524, lng: -58.0305 },
  { name: 'Tacuarembó', lat: -31.7333, lng: -55.9833 },
  { name: 'Treinta y Tres', lat: -33.2333, lng: -54.3833 },
];
