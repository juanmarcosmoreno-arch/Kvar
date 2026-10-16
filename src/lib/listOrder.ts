/**
 * Orden de la lista: «como recorrés el súper» (aprendido) o «por categoría». Se recuerda en cada teléfono.
 * Mientras no haya un par de compras tachadas en el súper, la lista va por categoría.
 */
import { useMemo, useSyncExternalStore } from 'react';
import { learnAisleOrder, MIN_TRIPS, type AisleOrder } from '../domain/aisleOrder';
import { groupListByAisle, groupListByCategory, type ListGroup } from '../domain/shoppingList';
import type { Snapshot } from '../domain/types';
import { useEvents } from './stats';

export type ListOrderMode = 'aisle' | 'category';

const KEY = 'stoka:orden-lista';
const listeners = new Set<() => void>();

function read(): ListOrderMode {
  try {
    return localStorage.getItem(KEY) === 'category' ? 'category' : 'aisle';
  } catch {
    return 'aisle';
  }
}

let mode: ListOrderMode = read();

export function setListOrderMode(next: ListOrderMode) {
  mode = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* sin almacenamiento: vale hasta cerrar la app */
  }
  listeners.forEach((l) => l());
}

function useMode(): ListOrderMode {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => mode,
  );
}

export interface ListOrder {
  groups: ListGroup[];
  /** Ya aprendió el recorrido (hay suficientes compras) */
  learned: boolean;
  mode: ListOrderMode;
  /** Está ordenada por pasillo ahora */
  byAisle: boolean;
}

export function useListOrder(view: Snapshot): ListOrder {
  const events = useEvents(view.household.id);
  const current = useMode();
  const order: AisleOrder | null = useMemo(
    () => (events.status === 'ready' ? learnAisleOrder(events.events, view.products) : null),
    [events, view.products],
  );
  const learned = Boolean(order && order.trips >= MIN_TRIPS);
  const byAisle = learned && current === 'aisle';
  const groups = useMemo(
    () => (byAisle && order
      ? groupListByAisle(view.list, view.products, view.categories, order)
      : groupListByCategory(view.list, view.products, view.categories)),
    [byAisle, order, view.list, view.products, view.categories],
  );
  return { groups, learned, mode: current, byAisle };
}
