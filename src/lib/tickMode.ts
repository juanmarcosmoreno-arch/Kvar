/**
 * Qué pasa al tachar algo de la lista (en el teléfono y en el reloj):
 *   stock → queda comprado y el producto pasa a «Hay» (como siempre)
 *   check → solo se tacha; el stock se carga después (ticket, escáner o «Volví del súper»)
 * Se recuerda en cada teléfono y se le pasa al reloj.
 */
import { useSyncExternalStore } from 'react';
import type { Product, ShoppingItem } from '../domain/types';

export type TickMode = 'stock' | 'check';

const KEY = 'stoka:al-tachar';
const listeners = new Set<() => void>();

function read(): TickMode {
  try {
    return localStorage.getItem(KEY) === 'check' ? 'check' : 'stock';
  } catch {
    return 'stock';
  }
}

let mode: TickMode = read();

export function tickMode(): TickMode {
  return mode;
}

export function setTickMode(next: TickMode) {
  mode = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* sin almacenamiento */
  }
  listeners.forEach((l) => l());
}

export function useTickMode(): TickMode {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => mode,
  );
}

/**
 * ¿Este ítem tachado solo se tachó (sin sumar al stock)? Al comprar, el producto cambia de estado en el mismo
 * momento; si el producto no cambió desde antes de tacharlo, fue «solo tachar».
 */
export function wasOnlyChecked(item: ShoppingItem, product: Product | undefined): boolean {
  if (!item.checked_at || !product) return false;
  return Date.parse(product.status_changed_at) < Date.parse(item.checked_at) - 1000;
}
