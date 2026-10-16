/** «Se termina pronto» en la pantalla: lo calcula con el historial y recuerda lo que se pospuso («Todavía hay»). */
import { useMemo, useSyncExternalStore } from 'react';
import { runningOutSoon, type RunningOut } from '../domain/runningOut';
import type { Snapshot } from '../domain/types';
import { useEvents } from './stats';

const KEY = 'stoka:se-termina-pospuesto';
const SNOOZE_DAYS = 3;
const listeners = new Set<() => void>();

function read(): Record<string, string> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

let snoozed = read();

/** «Todavía hay»: no volver a preguntar por unos días. */
export function snoozeRunningOut(productId: string) {
  const now = Date.now();
  const next: Record<string, string> = {};
  for (const [id, until] of Object.entries(snoozed)) if (Date.parse(until) > now) next[id] = until;
  next[productId] = new Date(now + SNOOZE_DAYS * 86_400_000).toISOString();
  snoozed = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* sin almacenamiento */
  }
  listeners.forEach((l) => l());
}

export function useRunningOut(view: Snapshot): RunningOut[] {
  const events = useEvents(view.household.id);
  const current = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snoozed,
  );
  return useMemo(
    () => (events.status === 'ready' ? runningOutSoon(events.events, view.products, view.list, { snoozed: current }) : []),
    [events, view.products, view.list, current],
  );
}
