/** Historial para las estadísticas: se trae de Supabase al abrirlas y se guarda para verlo sin conexión. */
import { get, set } from 'idb-keyval';
import { useEffect, useState } from 'react';
import type { PurchaseLine } from '../domain/spending';
import type { StockEvent } from '../domain/stats';
import { demoEvents, demoPurchases, isDemo } from './demo';
import { supabase } from './supabase';

const MONTHS_BACK = 13;
const PAGE = 1000;
const MAX = 20_000;

export interface EventsResult {
  events: StockEvent[];
  /** true si no hubo conexión y se muestra lo guardado */
  cached: boolean;
}

const cacheKey = (hh: string) => `kvar-stats:${hh}`;

export async function loadEvents(householdId: string): Promise<EventsResult> {
  if (isDemo) return { events: demoEvents(), cached: false };
  const since = new Date();
  since.setMonth(since.getMonth() - MONTHS_BACK, 1);
  try {
    const events: StockEvent[] = [];
    for (let from = 0; from < MAX; from += PAGE) {
      const { data, error } = await supabase
        .from('product_events')
        .select('product_id,type,from_status,to_status,from_quantity,to_quantity,client_created_at,created_at')
        .eq('household_id', householdId)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      for (const r of data ?? []) {
        const { client_created_at, created_at, ...rest } = r as Omit<StockEvent, 'at'> & { client_created_at: string | null; created_at: string };
        events.push({ ...rest, at: client_created_at ?? created_at });
      }
      if (!data || data.length < PAGE) break;
    }
    void set(cacheKey(householdId), events).catch(() => {});
    return { events, cached: false };
  } catch (e) {
    const saved = await get<StockEvent[]>(cacheKey(householdId)).catch(() => undefined);
    if (saved) return { events: saved, cached: true };
    throw e;
  }
}

// --- Hook: un solo pedido por hogar, compartido entre la pantalla y la ficha del producto ---------------

type State = { status: 'loading' } | { status: 'ready'; events: StockEvent[]; cached: boolean } | { status: 'error' };
const memo = new Map<string, { at: number; promise: Promise<EventsResult> }>();
const FRESH = 60_000;

function request(householdId: string, force = false): Promise<EventsResult> {
  const hit = memo.get(householdId);
  if (hit && !force && Date.now() - hit.at < FRESH) return hit.promise;
  const promise = loadEvents(householdId);
  memo.set(householdId, { at: Date.now(), promise });
  promise.catch(() => memo.delete(householdId));
  return promise;
}

export function useEvents(householdId: string | undefined): State {
  const [state, setState] = useState<State>({ status: 'loading' });
  useEffect(() => {
    if (!householdId) return;
    let alive = true;
    request(householdId).then(
      (r) => alive && setState({ status: 'ready', events: r.events, cached: r.cached }),
      () => alive && setState({ status: 'error' }),
    );
    return () => {
      alive = false;
    };
  }, [householdId]);
  return state;
}

// --- Gastos: líneas de tickets con precio ---------------------------------------------------------------
export async function loadPurchases(householdId: string): Promise<{ lines: PurchaseLine[]; cached: boolean }> {
  if (isDemo) return { lines: demoPurchases(), cached: false };
  const since = new Date();
  since.setMonth(since.getMonth() - MONTHS_BACK, 1);
  const key = `kvar-gastos:${householdId}`;
  try {
    const lines: PurchaseLine[] = [];
    for (let from = 0; from < MAX; from += PAGE) {
      const { data, error } = await supabase
        .from('purchase_lines')
        .select('id,household_id,product_id,name,quantity,unit_price,total,store,bought_at,receipt_key')
        .eq('household_id', householdId)
        .gte('bought_at', since.toISOString())
        .order('bought_at', { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) {
        // Sin la migración de gastos: no hay precios todavía
        if (/purchase_lines|PGRST205|42P01/.test(`${error.code} ${error.message}`)) return { lines: [], cached: false };
        throw new Error(error.message);
      }
      for (const r of (data ?? []) as PurchaseLine[]) lines.push({ ...r, quantity: Number(r.quantity), total: Number(r.total), unit_price: r.unit_price == null ? null : Number(r.unit_price) });
      if (!data || data.length < PAGE) break;
    }
    void set(key, lines).catch(() => {});
    return { lines, cached: false };
  } catch (e) {
    const saved = await get<PurchaseLine[]>(key).catch(() => undefined);
    if (saved) return { lines: saved, cached: true };
    throw e;
  }
}

type PurchasesState = { status: 'loading' } | { status: 'ready'; lines: PurchaseLine[]; cached: boolean } | { status: 'error' };
const purchasesMemo = new Map<string, { at: number; promise: Promise<{ lines: PurchaseLine[]; cached: boolean }> }>();

export function usePurchases(householdId: string | undefined): PurchasesState {
  const [state, setState] = useState<PurchasesState>({ status: 'loading' });
  useEffect(() => {
    if (!householdId) return;
    let alive = true;
    let hit = purchasesMemo.get(householdId);
    if (!hit || Date.now() - hit.at > FRESH) {
      hit = { at: Date.now(), promise: loadPurchases(householdId) };
      purchasesMemo.set(householdId, hit);
      hit.promise.catch(() => purchasesMemo.delete(householdId));
    }
    hit.promise.then(
      (r) => alive && setState({ status: 'ready', lines: r.lines, cached: r.cached }),
      () => alive && setState({ status: 'error' }),
    );
    return () => {
      alive = false;
    };
  }, [householdId]);
  return state;
}
