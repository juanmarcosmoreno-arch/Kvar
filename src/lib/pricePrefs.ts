/**
 * Ajustes del comparador de precios, guardados en este teléfono (los descuentos dependen de las tarjetas de
 * cada uno): los súper que se comparan, los que se agregaron a mano y los descuentos con tarjeta.
 * También en qué súper estás ahora («Estoy en Disco»), que vence solo a las pocas horas.
 */
import { useSyncExternalStore } from 'react';
import type { StoreDiscount } from '../domain/prices';
import { storeKey } from '../domain/spending';
import { isDemo } from './demo';

export interface PricePrefs {
  discounts: StoreDiscount[];
  /** Súper que no se comparan */
  hidden: string[];
  /** Súper agregados a mano (todavía sin tickets) */
  extra: string[];
}

const KEY = 'stoka:precios';
const HERE_KEY = 'stoka:estoy-en';
/** «Estoy en Disco» dura lo que dura una compra */
const HERE_HOURS = 4;

const EMPTY: PricePrefs = { discounts: [], hidden: [], extra: [] };
/** En la demo: un descuento de ejemplo para ver cómo cambia la comparación */
const DEMO: PricePrefs = {
  discounts: [
    { id: 'demo-disco', stores: ['disco'], brand: '', percent: 15, days: [2, 4], card: 'Itaú', cap: 1500 },
    { id: 'demo-conaprole', stores: ['tienda-inglesa', 'disco', 'geant', 'devoto'], brand: 'Conaprole', percent: 15, days: [], card: '', cap: null },
  ],
  hidden: [],
  extra: [],
};

const listeners = new Set<() => void>();

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sin almacenamiento */
  }
}

/** Los descuentos de antes eran de un solo súper y sin marca */
type SavedDiscount = Partial<StoreDiscount> & { store?: string };
const upgrade = (d: SavedDiscount): StoreDiscount => ({
  id: d.id ?? crypto.randomUUID(),
  stores: d.stores ?? (d.store ? [d.store] : []),
  brand: d.brand ?? '',
  percent: d.percent ?? 0,
  days: d.days ?? [],
  card: d.card ?? '',
  cap: d.cap ?? null,
});

function readPrefs(): PricePrefs {
  const saved = readJSON<Omit<PricePrefs, 'discounts'> & { discounts?: SavedDiscount[] }>(KEY);
  if (!saved) return isDemo ? DEMO : EMPTY;
  return { ...EMPTY, ...saved, discounts: (saved.discounts ?? []).map(upgrade) };
}

let prefs: PricePrefs = readPrefs();
let here: { store: string; at: number } | null = readJSON(HERE_KEY);

const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

function save(next: PricePrefs) {
  prefs = next;
  writeJSON(KEY, next);
  emit();
}

export function usePricePrefs(): PricePrefs {
  return useSyncExternalStore(subscribe, () => prefs);
}

export function saveDiscount(d: StoreDiscount) {
  const rest = prefs.discounts.filter((x) => x.id !== d.id);
  save({ ...prefs, discounts: [...rest, d] });
}

export function deleteDiscount(id: string) {
  save({ ...prefs, discounts: prefs.discounts.filter((x) => x.id !== id) });
}

export function setStoreCompared(store: string, compared: boolean) {
  const hidden = prefs.hidden.filter((s) => s !== store);
  save({ ...prefs, hidden: compared ? hidden : [...hidden, store] });
}

/** Agregar un súper a mano; devuelve su clave */
export function addStore(name: string): string | null {
  const key = storeKey(name);
  if (!key) return null;
  if (!prefs.extra.includes(key)) save({ ...prefs, extra: [...prefs.extra, key], hidden: prefs.hidden.filter((s) => s !== key) });
  return key;
}

export function removeStore(store: string) {
  const discounts = prefs.discounts
    .map((d) => ({ ...d, stores: d.stores.filter((s) => s !== store) }))
    .filter((d) => d.stores.length > 0);
  save({ ...prefs, extra: prefs.extra.filter((s) => s !== store), discounts });
}

/** En qué súper estás (null si no elegiste o ya pasaron unas horas) */
export function useHereStore(): string | null {
  const value = useSyncExternalStore(subscribe, () => here);
  return value && Date.now() - value.at < HERE_HOURS * 3_600_000 ? value.store : null;
}

export function setHereStore(store: string | null) {
  here = store ? { store, at: Date.now() } : null;
  writeJSON(HERE_KEY, here);
  emit();
}
