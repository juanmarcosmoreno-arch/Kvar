import type { Product, StockStatus } from './types';

const ORDER: StockStatus[] = ['ok', 'low', 'out'];

/** Un toque: Hay → Queda poco → No hay → Hay. */
export function cycleStatus(s: StockStatus): StockStatus {
  return ORDER[(ORDER.indexOf(s) + 1) % ORDER.length];
}

/** Deslizar a la izquierda: un paso hacia "No hay" (se queda en No hay). */
export function worseStatus(s: StockStatus): StockStatus {
  return ORDER[Math.min(ORDER.indexOf(s) + 1, ORDER.length - 1)];
}

/** Severidad para ordenar: No hay primero. */
export function severity(s: StockStatus): number {
  return ORDER.indexOf(s);
}

export function statusFromQuantity(qty: number, threshold: number): StockStatus {
  if (qty <= 0) return 'out';
  if (qty <= threshold) return 'low';
  return 'ok';
}

/**
 * Resultado de pedir un estado o una cantidad para un producto.
 * Si el producto lleva conteo, el estado siempre se deriva de la cantidad
 * (misma regla que set_product_status en SQL).
 */
export function resolveStock(
  p: Pick<Product, 'track_quantity' | 'quantity' | 'low_threshold' | 'status'>,
  wanted: { status?: StockStatus; quantity?: number | null },
): { status: StockStatus; quantity: number | null } {
  if (!p.track_quantity) {
    return { status: wanted.status ?? p.status, quantity: p.quantity };
  }
  const t = p.low_threshold;
  const cur = p.quantity ?? 0;
  let qty: number;
  if (wanted.quantity != null) {
    qty = Math.max(0, Math.trunc(wanted.quantity));
  } else {
    switch (wanted.status ?? p.status) {
      case 'out':
        qty = 0;
        break;
      case 'low':
        qty = cur >= 1 && cur <= t ? cur : Math.max(t, 1);
        break;
      default:
        qty = Math.max(cur, t + 1);
    }
  }
  return { status: statusFromQuantity(qty, t), quantity: qty };
}

/** Productos que piden atención (amarillo o rojo), básicos y "No hay" primero. */
export function needsAttention(products: Product[]): Product[] {
  return products
    .filter((p) => p.status !== 'ok')
    .sort(
      (a, b) =>
        severity(b.status) - severity(a.status) ||
        Number(b.is_staple) - Number(a.is_staple) ||
        a.name.localeCompare(b.name, 'es'),
    );
}

/** Días hasta el vencimiento (negativo si ya venció). */
export function daysUntil(date: string, today: Date = new Date()): number {
  const [y, m, d] = date.split('-').map(Number);
  const target = Date.UTC(y, m - 1, d);
  const base = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target - base) / 86_400_000);
}

export function expiringSoon(products: Product[], withinDays = 5, today = new Date()): Product[] {
  return products
    .filter((p) => p.expires_on && p.status !== 'out' && daysUntil(p.expires_on, today) <= withinDays)
    .sort((a, b) => a.expires_on!.localeCompare(b.expires_on!));
}

export function expiryLabel(days: number): string {
  if (days < 0) return days === -1 ? 'Venció ayer' : `Venció hace ${-days} días`;
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  return `Vence en ${days} días`;
}

/**
 * Productos para el botón "Se terminó algo": los que más veces se terminaron,
 * excluyendo los que ya están en "No hay".
 */
export function frequentProducts(
  products: Product[],
  outCounts: Record<string, number>,
  limit = 8,
): Product[] {
  return products
    .filter((p) => p.status !== 'out')
    .sort(
      (a, b) =>
        (outCounts[b.id] ?? 0) - (outCounts[a.id] ?? 0) ||
        Number(b.is_staple) - Number(a.is_staple) ||
        a.name.localeCompare(b.name, 'es'),
    )
    .slice(0, limit);
}
