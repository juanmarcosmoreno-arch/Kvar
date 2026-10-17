/**
 * Historial de precios de precios.uy, guardado en este teléfono: cada día que se traen los precios de hoy se guarda
 * el más barato de cada artículo en tus súper. Con eso, «¿Está caro?» compara el precio de hoy con lo normal.
 * precios.uy no da historial, así que se va armando solo a medida que se usa la app.
 */
import { createStore, entries, set, type UseStore } from 'idb-keyval';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { PriceHistory } from '../domain/priceTools';
import { itemKey, sipcStoreKey, type SipcData } from '../domain/sipc';
import { isDemo } from './demo';

/** Un día: artículo → [precio más barato, súper] */
type DaySnap = Record<string, [number, string]>;

/** Se guardan unos 6 meses */
const KEEP_DAYS = 183;

let store: UseStore | null = null;
const db = () => (store ??= createStore('stoka-precios', 'historial'));

let days: Map<string, DaySnap> | null = null;
let loading: Promise<Map<string, DaySnap>> | null = null;
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

/** El día en Uruguay («2026-10-17») */
export const dayOf = (iso: string | Date) =>
  new Date(new Date(iso).getTime() - 3 * 3_600_000).toISOString().slice(0, 10);

function load(): Promise<Map<string, DaySnap>> {
  if (days) return Promise.resolve(days);
  loading ??= entries<string, DaySnap>(db())
    .catch(() => [] as [string, DaySnap][])
    .then((rows) => {
      const since = dayOf(new Date(Date.now() - KEEP_DAYS * 86_400_000));
      days = new Map(rows.filter(([d]) => d >= since));
      emit();
      return days;
    });
  return loading;
}

/** Guarda el más barato de hoy de cada artículo (una vez por día; si se vuelve a traer, se reemplaza) */
export async function recordSnapshot(data: SipcData): Promise<void> {
  const snap: DaySnap = {};
  for (const s of data.stores) {
    for (const p of data.prices[s.id] ?? []) {
      if (!(p.price > 0)) continue;
      const k = itemKey(p.name);
      if (!snap[k] || p.price < snap[k][0]) snap[k] = [p.price, sipcStoreKey(s)];
    }
  }
  if (!Object.keys(snap).length) return;
  const all = await load();
  const day = dayOf(data.at);
  all.set(day, snap);
  emit();
  if (!isDemo) await set(day, snap, db()).catch(() => undefined);
}

/** Historial de un artículo (sin hoy, que se compara aparte) */
export function historyOf(item: string, all: Map<string, DaySnap> | null = days): PriceHistory {
  const out: PriceHistory = {};
  for (const [day, snap] of all ?? []) {
    const row = snap[item];
    if (row) out[day] = { [row[1]]: row[0] };
  }
  return out;
}

/** Desde qué día hay historial y cuántos días */
export function historyRange(): { since: string | null; days: number } {
  const keys = [...(days?.keys() ?? [])].sort();
  return { since: keys[0] ?? null, days: keys.length };
}

/** El historial completo (se carga la primera vez); cambia cuando se guarda un día nuevo */
export function usePriceHistory(): { ready: boolean; version: number } {
  const v = useSyncExternalStore(subscribe, () => version);
  const [ready, setReady] = useState(Boolean(days));
  useEffect(() => {
    if (!days) void load().then(() => setReady(true));
  }, []);
  return { ready: ready || Boolean(days), version: v };
}

/**
 * En la demo: dos meses inventados alrededor del precio de hoy (con algunos días de oferta), para que «¿Está caro?»
 * tenga algo que mostrar.
 */
export async function seedDemoHistory(data: SipcData): Promise<void> {
  if (!isDemo) return;
  const all = await load();
  if (all.size > 3) return;
  const today: DaySnap = {};
  for (const s of data.stores) {
    for (const p of data.prices[s.id] ?? []) {
      const k = itemKey(p.name);
      if (!today[k] || p.price < today[k][0]) today[k] = [p.price, sipcStoreKey(s)];
    }
  }
  const now = Date.parse(data.at);
  for (let i = 60; i >= 1; i--) {
    const snap: DaySnap = {};
    for (const [k, [price, store]] of Object.entries(today)) {
      let h = 0;
      for (const c of k) h = (h * 31 + c.charCodeAt(0)) | 0;
      // Precio que sube de a poco (inflación), con ruido y algún día de oferta
      const noise = Math.sin(h + i * 1.7) * 0.04;
      const trend = 1 - i * 0.0007;
      const offer = (Math.abs(h) + i) % 23 === 0 ? 0.85 : 1;
      const base = (Math.abs(h) % 5) === 0 ? 1.08 : 1; // algunos hoy están más baratos que lo normal
      snap[k] = [Math.round(price * base * trend * (1 + noise) * offer), store];
    }
    all.set(dayOf(new Date(now - i * 86_400_000)), snap);
  }
  emit();
}
