/**
 * Precios de hoy de precios.uy (solo Uruguay): la zona, los súper elegidos y los precios del día.
 * Los trae la Edge Function `precios-uy` (precios.uy no deja consultarlo directo desde el teléfono) y se guardan
 * en este teléfono hasta que se ponen viejos (unas horas), para no pedirlos cada vez.
 */
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { matchProducts, sipcLines, sipcStoreKey, type SipcData, type SipcMatch, type SipcPrice, type SipcStore } from '../domain/sipc';
import { registerStoreLabels, type PurchaseLine } from '../domain/spending';
import type { Product } from '../domain/types';
import { isDemo } from './demo';
import { supabase } from './supabase';

export interface SipcPrefs {
  /** Zona elegida */
  place: { name: string; lat: number; lng: number } | null;
  km: number;
  /** Los súper elegidos (hasta MAX_STORES) */
  stores: SipcStore[];
  /** Producto → artículo elegido (otra marca) */
  pins: Record<string, string>;
}

export const MAX_STORES = 8;
const KEY = 'stoka:precios-uy';
const CACHE_KEY = 'stoka:precios-uy:hoy';
/** Los precios se actualizan una vez por día: se vuelven a pedir si tienen más de unas horas */
const FRESH_HOURS = 6;

const EMPTY: SipcPrefs = { place: null, km: 2, stores: [], pins: {} };

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
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sin almacenamiento */
  }
}

type Cache = { ids: number[]; prices: Record<number, SipcPrice[]>; at: string };

let prefs: SipcPrefs = { ...EMPTY, ...(readJSON<SipcPrefs>(KEY) ?? {}) };
let cache: Cache | null = readJSON<Cache>(CACHE_KEY);
type Status = 'idle' | 'loading' | 'error';
let status: Status = 'idle';
let lastError: string | null = null;
let version = 0;
const listeners = new Set<() => void>();
const emit = () => {
  version++;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

function savePrefs(next: SipcPrefs) {
  prefs = next;
  writeJSON(KEY, next);
  label();
  emit();
}

/** Nombres de los locales para mostrarlos en la comparación («Disco Chucarro») */
function label() {
  registerStoreLabels(prefs.stores.map((s) => [sipcStoreKey(s), prettyStoreName(s.name)]));
}

/** «Disco  CHUCARRO» → «Disco Chucarro»; «Kinko KINKO 1» → «Kinko 1»; «FROG Frog 30» → «Frog 30» */
export function prettyStoreName(name: string): string {
  const words = name.replace(/\s+/g, ' ').trim().split(' ');
  // La cadena repetida («Kinko KINKO 1», «La Colonial La Colonial Rivera»)
  for (let n = Math.floor(words.length / 2); n >= 1; n--) {
    const a = words.slice(0, n).join(' ').toLowerCase();
    const b = words.slice(n, 2 * n).join(' ').toLowerCase();
    if (a === b) {
      words.splice(0, n);
      break;
    }
  }
  return words
    .map((w, i) => {
      if (w !== w.toUpperCase() || !/[A-ZÁÉÍÓÚÑ]{2}/.test(w)) return w;
      // «26 DE MARZO» → «26 de Marzo»
      if (i > 0 && /^(DE|DEL|LA|LAS|LOS|Y|E)$/.test(w)) return w.toLowerCase();
      return w.charAt(0) + w.slice(1).toLowerCase();
    })
    .join(' ')
    .replace(/^Ta - Ta\b/, 'Ta-Ta')
    .replace(/^Frog\b|^FROG\b/, 'Frog');
}
label();

export function setPlace(place: SipcPrefs['place'], km = prefs.km) {
  savePrefs({ ...prefs, place, km });
}

export function setSipcStores(stores: SipcStore[]) {
  savePrefs({ ...prefs, stores: stores.slice(0, MAX_STORES) });
  void refreshSipc(true);
}

export function pinItem(productId: string, item: string | null) {
  const pins = { ...prefs.pins };
  if (item) pins[productId] = item;
  else delete pins[productId];
  savePrefs({ ...prefs, pins });
}

async function call<T>(body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke('precios-uy', { body });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

let demoData: Promise<{ stores: SipcStore[]; selected: number[]; prices: Record<number, SipcPrice[]> }> | null = null;
function demo() {
  demoData ??= import('../assets/demo/precios-uy.json?raw').then((m) => JSON.parse(m.default));
  return demoData;
}

/** Súper cerca de un punto (los más cerca primero) */
export async function findStores(lat: number, lng: number, km: number): Promise<SipcStore[]> {
  if (isDemo) return (await demo()).stores;
  return (await call<{ stores: SipcStore[] }>({ action: 'stores', lat, lng, km })).stores;
}

/** Trae los precios de hoy (si los guardados son de otros súper o ya están viejos, o si se pide) */
export async function refreshSipc(force = false): Promise<void> {
  const ids = prefs.stores.map((s) => s.id);
  if (!ids.length || status === 'loading') return;
  const same = cache && ids.every((id) => cache!.ids.includes(id));
  const fresh = cache && Date.now() - Date.parse(cache.at) < FRESH_HOURS * 3_600_000;
  if (same && fresh && !force) return;
  status = 'loading';
  lastError = null;
  emit();
  try {
    if (isDemo) {
      const d = await demo();
      cache = { ids, prices: d.prices, at: new Date().toISOString() };
    } else {
      const r = await call<{ prices: Record<number, SipcPrice[]>; at: string }>({ action: 'prices', ids });
      cache = { ids, prices: r.prices, at: r.at };
    }
    writeJSON(CACHE_KEY, cache);
    status = 'idle';
  } catch (e) {
    status = 'error';
    lastError = (e as Error).message;
  }
  emit();
}

/** En la demo: arranca con los súper de la foto de ejemplo ya elegidos */
async function seedDemo() {
  if (!isDemo || prefs.stores.length) return;
  const d = await demo();
  savePrefs({
    ...prefs,
    place: { name: 'Pocitos', lat: -34.9085, lng: -56.1445 },
    stores: d.selected.map((id) => d.stores.find((s) => s.id === id)).filter((s): s is SipcStore => Boolean(s)),
  });
  void refreshSipc(true);
}

export function useSipcPrefs(): SipcPrefs {
  return useSyncExternalStore(subscribe, () => prefs);
}

export interface SipcState {
  prefs: SipcPrefs;
  /** Hay súper elegidos */
  configured: boolean;
  status: Status;
  error: string | null;
  data: SipcData | null;
  matches: SipcMatch[];
  /** Precios de hoy como líneas de ticket (para el comparador) */
  lines: PurchaseLine[];
}

export function useSipc(products: Product[]): SipcState {
  const v = useSyncExternalStore(subscribe, () => version);
  const [, setTick] = useState(0);
  useEffect(() => {
    void seedDemo();
    void refreshSipc();
    // Al volver a la app después de un rato
    const onVisible = () => document.visibilityState === 'visible' && void refreshSipc().then(() => setTick((t) => t + 1));
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
  return useMemo(() => {
    const ids = new Set(prefs.stores.map((s) => s.id));
    const data: SipcData | null = cache
      ? {
          stores: prefs.stores,
          prices: Object.fromEntries(Object.entries(cache.prices).filter(([id]) => ids.has(Number(id)))),
          at: cache.at,
        }
      : null;
    const matches = data ? matchProducts(products, data, prefs.pins) : [];
    return {
      prefs,
      configured: prefs.stores.length > 0,
      status,
      error: lastError,
      data,
      matches,
      lines: data ? sipcLines(data, matches) : [],
    };
  }, [products, v]); // eslint-disable-line react-hooks/exhaustive-deps
}
