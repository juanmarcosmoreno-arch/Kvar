/**
 * Estado de la app + motor de sincronización offline.
 *
 *   server  : última foto confirmada por Supabase (también guardada en IndexedDB)
 *   outbox  : operaciones del usuario aún no confirmadas (persistidas)
 *   view    : applyOps(server, outbox) — lo que se muestra
 *
 * Al reconectar se envía la cola en orden, se vuelve a leer el hogar y recién
 * ahí se sacan de la cola las operaciones confirmadas (sin parpadeos).
 * Realtime mantiene `server` al día con los cambios de los demás miembros.
 */
import { useSyncExternalStore } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { applyOps, compactOps, type Op } from '../domain/ops';
import type { Snapshot } from '../domain/types';
import { persist } from '../lib/persist';
import { fetchSnapshot, PermanentError, sendOp } from '../lib/remote';
import { isDemo } from '../lib/demo';
import { supabase } from '../lib/supabase';
import { toast } from './toast';

export interface State {
  householdId: string | null;
  server: Snapshot | null;
  outbox: Op[];
  online: boolean;
  syncing: boolean;
  loaded: boolean;
  lastSyncAt: number | null;
}

let state: State = {
  householdId: null,
  server: null,
  outbox: [],
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  syncing: false,
  loaded: false,
  lastSyncAt: null,
};

const listeners = new Set<() => void>();
let viewCache: { server: Snapshot | null; outbox: Op[]; view: Snapshot | null } = {
  server: null, outbox: [], view: null,
};

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function getState() {
  return state;
}

export function getView(): Snapshot | null {
  if (viewCache.server !== state.server || viewCache.outbox !== state.outbox) {
    viewCache = {
      server: state.server,
      outbox: state.outbox,
      view: state.server ? applyOps(state.server, state.outbox) : null,
    };
  }
  return viewCache.view;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state));
}

export function useView(): Snapshot | null {
  return useSyncExternalStore(subscribe, getView);
}

// ---------------------------------------------------------------------------
// Ciclo de vida
// ---------------------------------------------------------------------------
let channel: RealtimeChannel | null = null;

export async function openHousehold(householdId: string) {
  closeHousehold();
  const [cached, outbox] = await Promise.all([persist.loadSnapshot(householdId), persist.loadOutbox()]);
  await persist.saveHousehold(householdId);
  setState({ householdId, server: cached ?? null, outbox, loaded: Boolean(cached) });
  subscribeRealtime(householdId);
  await sync();
}

export function closeHousehold() {
  if (channel) {
    void supabase.removeChannel(channel);
    channel = null;
  }
  setState({ householdId: null, server: null, loaded: false });
}

export async function resetLocal() {
  closeHousehold();
  await persist.clear();
  setState({ outbox: [] });
}

/** Encola una operación: se ve al instante y se envía cuando haya conexión. */
export function dispatch(op: Op) {
  const outbox = [...state.outbox, op];
  setState({ outbox });
  void persist.saveOutbox(outbox);
  void sync();
}

let syncing: Promise<void> | null = null;
let again = false;

export function sync(): Promise<void> {
  if (syncing) {
    again = true;
    return syncing;
  }
  syncing = runSync().finally(() => {
    syncing = null;
    if (again) {
      again = false;
      void sync();
    }
  });
  return syncing;
}

async function runSync() {
  const hh = state.householdId;
  if (!hh || !state.online) return;
  setState({ syncing: true });
  try {
    const pending = state.outbox;
    const toSend = compactOps(pending);
    const done = new Set(pending.filter((o) => !toSend.includes(o)).map((o) => o.id));
    for (const op of toSend) {
      try {
        await sendOp(op, hh);
        done.add(op.id);
      } catch (e) {
        if (e instanceof PermanentError) {
          console.warn('Operación descartada', op, e);
          toast('No se pudo guardar un cambio. Se actualizó con lo último del hogar.');
          done.add(op.id);
        } else {
          throw e; // sin red: se reintenta después
        }
      }
    }
    const snap = await fetchSnapshot(hh);
    if (state.householdId !== hh) return;
    const outbox = state.outbox.filter((o) => !done.has(o.id));
    setState({ server: snap, outbox, loaded: true, lastSyncAt: Date.now() });
    await Promise.all([persist.saveSnapshot(snap), persist.saveOutbox(outbox)]);
  } catch (e) {
    console.info('Sincronización pendiente', e);
  } finally {
    setState({ syncing: false });
  }
}

// ---------------------------------------------------------------------------
// Realtime
// ---------------------------------------------------------------------------
type Row = { id: string } & Record<string, unknown>;
const TABLE_KEY = {
  products: 'products',
  shopping_list_items: 'list',
  locations: 'locations',
  categories: 'categories',
  product_aliases: 'aliases',
} as const;

function subscribeRealtime(hh: string) {
  if (isDemo) return; // la demo no tiene servidor de tiempo real (ver «Sofía marca algo»)
  const filter = `household_id=eq.${hh}`;
  let ch = supabase.channel(`hh:${hh}`);
  for (const table of Object.keys(TABLE_KEY) as (keyof typeof TABLE_KEY)[]) {
    const key = TABLE_KEY[table];
    for (const event of ['INSERT', 'UPDATE'] as const) {
      ch = ch.on('postgres_changes', { event, schema: 'public', table, filter }, (payload) => {
        applyRemote(key, event, payload.new as Row);
      });
    }
    // Realtime no permite filtrar los DELETE (y solo trae la clave primaria):
    // se escuchan todos y se ignoran los ids que no son de este hogar.
    ch = ch.on('postgres_changes', { event: 'DELETE', schema: 'public', table }, (payload) => {
      applyRemote(key, 'DELETE', payload.old as Row);
    });
  }
  ch = ch.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'households', filter: `id=eq.${hh}` },
    (payload) => {
      if (!state.server) return;
      setServer({ ...state.server, household: { ...state.server.household, ...(payload.new as object) } });
    });
  ch = ch.on('postgres_changes', { event: '*', schema: 'public', table: 'household_members', filter }, () => {
    void sync();
  });
  channel = ch.subscribe((status) => {
    // Al (re)conectar el canal, se trae todo por si hubo cambios mientras tanto.
    if (status === 'SUBSCRIBED') void sync();
  });
}

function applyRemote(
  key: 'products' | 'list' | 'locations' | 'categories' | 'aliases',
  event: 'INSERT' | 'UPDATE' | 'DELETE',
  row: Row,
) {
  const s = state.server;
  if (!s || !row?.id) return;
  const arr = (s[key] ?? []) as unknown as Row[];
  const prev = arr.find((r) => r.id === row.id);
  let next: Row[];
  if (event === 'DELETE') {
    if (!prev) return;
    next = arr.filter((r) => r.id !== row.id);
  } else {
    const i = arr.findIndex((r) => r.id === row.id);
    next = i === -1 ? [...arr, row] : arr.map((r, j) => (j === i ? { ...r, ...row } : r));
  }
  // Un ítem real reemplaza al ítem "local-" que la app había agregado sin conexión
  if (key === 'list' && event === 'INSERT' && row.product_id) {
    next = next.filter((r) => r.id !== `local-${row.product_id}`);
  }
  let outCounts = s.outCounts;
  if (key === 'products' && event === 'UPDATE' && row.status === 'out' && prev && prev.status !== 'out') {
    outCounts = { ...outCounts, [row.id]: (outCounts[row.id] ?? 0) + 1 };
  }
  setServer({ ...s, [key]: next, outCounts });
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
function setServer(server: Snapshot) {
  setState({ server });
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void persist.saveSnapshot(server), 500);
}

// ---------------------------------------------------------------------------
// Conectividad
// ---------------------------------------------------------------------------
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    setState({ online: true });
    void sync();
  });
  window.addEventListener('offline', () => setState({ online: false }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void sync();
  });
}
