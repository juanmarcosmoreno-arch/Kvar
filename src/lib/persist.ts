import { createStore, del, get, set, type UseStore } from 'idb-keyval';
import type { Op } from '../domain/ops';
import type { Snapshot } from '../domain/types';

let store: UseStore | undefined;
function db(): UseStore {
  store ??= createStore('kvar', 'kv');
  return store;
}

/** IndexedDB puede no estar disponible (modo privado, marcos restringidos): la app sigue igual. */
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export const persist = {
  loadSnapshot: (hh: string) => safe(() => get<Snapshot>(`snap:${hh}`, db()), undefined),
  saveSnapshot: (s: Snapshot) => safe(() => set(`snap:${s.household.id}`, s, db()), undefined),
  loadOutbox: () => safe(async () => (await get<Op[]>('outbox', db())) ?? [], [] as Op[]),
  saveOutbox: (ops: Op[]) => safe(() => set('outbox', ops, db()), undefined),
  loadHousehold: () => safe(() => get<string>('household', db()), undefined),
  saveHousehold: (id: string) => safe(() => set('household', id, db()), undefined),
  clear: () => safe(async () => {
    const hh = await get<string>('household', db());
    if (hh) await del(`snap:${hh}`, db());
    await del('outbox', db());
    await del('household', db());
  }, undefined),
};
