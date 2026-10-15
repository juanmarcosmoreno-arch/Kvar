/** Cambios de cantidad para productos con conteo de unidades. */

export type QuantityMode =
  | 'add'     // «¿Cuántos sumás?»
  | 'remove'  // «¿Cuántos usaste?»
  | 'set'     // «¿Cuántos hay?»
  | 'bought'  // «¿Cuántos compraste?» (desde la lista o el escáner)
  | 'list';   // «¿Cuántos comprar?» (cantidad del ítem de la lista)

/** Cantidades rápidas: tocar una ya confirma. */
export const QUICK_AMOUNTS = [1, 2, 3, 4, 6, 12] as const;

/** Cantidad resultante del producto. Nunca negativa. */
export function nextQuantity(current: number | null, mode: QuantityMode, n: number): number {
  const cur = Math.max(0, current ?? 0);
  const amount = Math.max(0, Math.trunc(n));
  switch (mode) {
    case 'add':
    case 'bought':
      return cur + amount;
    case 'remove':
      return Math.max(0, cur - amount);
    case 'set':
      return amount;
    case 'list':
      return cur; // no cambia el stock, solo cuánto comprar
  }
}

/** Valor con el que arranca el selector. */
export function initialAmount(mode: QuantityMode, current: number | null, itemQuantity: number | null): number {
  if (mode === 'set') return Math.max(0, current ?? 0);
  if (mode === 'list' || mode === 'bought') return itemQuantity ?? 1;
  return 1;
}

export function clampAmount(n: number, mode: QuantityMode): number {
  const min = mode === 'set' ? 0 : 1;
  return Math.min(999, Math.max(min, Math.trunc(Number.isFinite(n) ? n : min)));
}
