import { createStore, del, get, set, type UseStore } from 'idb-keyval';
import type { Op } from '../domain/ops';
import type { Snapshot } from '../domain/types';

let store: UseStore | undefined;
function db(): UseStore {
  store ??= createStore('kvar', 'kv');
  return store;
}

export const persist = {
  loadSnapshot: (hh: string) => get<Snapshot>(`snap:${hh}`, db()),
  saveSnapshot: (s: Snapshot) => set(`snap:${s.household.id}`, s, db()),
  loadOutbox: async () => (await get<Op[]>('outbox', db())) ?? [],
  saveOutbox: (ops: Op[]) => set('outbox', ops, db()),
  loadHousehold: () => get<string>('household', db()),
  saveHousehold: (id: string) => set('household', id, db()),
  async clear() {
    const hh = await get<string>('household', db());
    if (hh) await del(`snap:${hh}`, db());
    await del('outbox', db());
    await del('household', db());
  },
};
