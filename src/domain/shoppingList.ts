import { compareText, m } from '../i18n';
import { aislePosition, type AisleOrder } from './aisleOrder';
import type { Category, ListReason, Product, ShoppingItem, StockStatus } from './types';

const AUTO_REASONS: ListReason[] = ['out', 'low', 'predicted'];

export function isAutoReason(r: ListReason): boolean {
  return AUTO_REASONS.includes(r);
}

/** ¿Este producto, en este estado, debería estar en la lista? (misma regla que SQL) */
export function listReasonFor(
  p: Pick<Product, 'is_staple'>,
  status: StockStatus,
  listOnLow: boolean,
): ListReason | null {
  if (status === 'out') return 'out';
  if (status === 'low' && (p.is_staple || listOnLow)) return 'low';
  return null;
}

export function openItemFor(list: ShoppingItem[], productId: string): ShoppingItem | undefined {
  return list.find((i) => i.product_id === productId && i.checked_at == null);
}

/**
 * Aplica a la lista el efecto de que un producto cambie de estado.
 * - No hay → se agrega (o un ítem "low" pasa a "out").
 * - Queda poco → se agrega si es básico o si el hogar lo pidió.
 * - Hay → se quitan los ítems que agregó la app (los manuales quedan).
 */
export function applyStatusToList(
  list: ShoppingItem[],
  product: Product,
  status: StockStatus,
  opts: { listOnLow: boolean; now: string; newId: () => string },
): ShoppingItem[] {
  const open = openItemFor(list, product.id);
  const reason = listReasonFor(product, status, opts.listOnLow);

  if (reason) {
    if (!open) {
      return [
        ...list,
        {
          id: opts.newId(),
          household_id: product.household_id,
          product_id: product.id,
          name: null,
          quantity: null,
          note: null,
          reason,
          checked_at: null,
          checked_by: null,
          created_at: opts.now,
        },
      ];
    }
    if ((open.reason === 'low' || open.reason === 'predicted') && open.reason !== reason) {
      return list.map((i) => (i.id === open.id ? { ...i, reason } : i));
    }
    return list;
  }

  if (status === 'ok') {
    return list.filter((i) => !(i.product_id === product.id && i.checked_at == null && isAutoReason(i.reason)));
  }
  return list;
}

export interface ListGroup {
  key: string;
  title: string;
  items: ShoppingItem[];
}

/**
 * Agrupa la lista abierta por categoría, en el orden de las categorías
 * (que es el recorrido del súper). Lo que no tiene categoría va al final.
 */
export function groupListByCategory(
  list: ShoppingItem[],
  products: Product[],
  categories: Category[],
): ListGroup[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const groups = new Map<string, ListGroup>();
  const sortedCats = [...categories].sort((a, b) => a.sort_order - b.sort_order);
  for (const c of sortedCats) groups.set(c.id, { key: c.id, title: c.name, items: [] });
  const other: ListGroup = { key: 'none', title: m.common.noCategory, items: [] };

  for (const item of list) {
    if (item.checked_at) continue;
    const p = item.product_id ? byId.get(item.product_id) : undefined;
    const g = (p?.category_id && groups.get(p.category_id)) || other;
    g.items.push(item);
  }

  const name = (i: ShoppingItem) => itemName(i, byId);
  const result = [...groups.values(), other].filter((g) => g.items.length > 0);
  for (const g of result) {
    g.items.sort((a, b) => {
      // "No hay" antes que "Queda poco"
      const ra = a.reason === 'out' ? 0 : 1;
      const rb = b.reason === 'out' ? 0 : 1;
      return ra - rb || compareText(name(a), name(b));
    });
  }
  return result;
}

/**
 * Igual que por categoría, pero en el orden en que se recorre el súper (aprendido de las compras): primero las
 * categorías que se agarran antes y, dentro de cada una, cada producto donde se suele agarrar. Lo que todavía no
 * tiene posición queda después, en el orden de siempre. «Sin categoría» va al final.
 */
export function groupListByAisle(
  list: ShoppingItem[],
  products: Product[],
  categories: Category[],
  order: AisleOrder,
): ListGroup[] {
  const groups = groupListByCategory(list, products, categories);
  const byId = new Map(products.map((p) => [p.id, p]));
  const LAST = 2;
  const groupPos = (g: ListGroup) => (g.key === 'none' ? LAST + 1 : order.category.get(g.key) ?? LAST);
  const itemPos = (i: ShoppingItem) => (i.product_id ? aislePosition(order, byId.get(i.product_id)) : null) ?? LAST;
  // sort es estable: a igual posición queda el orden por categoría
  for (const g of groups) g.items = g.items.map((item, i) => ({ item, i })).sort((a, b) => itemPos(a.item) - itemPos(b.item) || a.i - b.i).map((x) => x.item);
  return groups.map((g, i) => ({ g, i })).sort((a, b) => groupPos(a.g) - groupPos(b.g) || a.i - b.i).map((x) => x.g);
}

export function itemName(item: ShoppingItem, byId: Map<string, Product>): string {
  if (item.product_id) return byId.get(item.product_id)?.name ?? item.name ?? 'Producto';
  return item.name ?? '';
}

export function openCount(list: ShoppingItem[]): number {
  return list.reduce((n, i) => n + (i.checked_at ? 0 : 1), 0);
}

/** Comprados recién (para "deshacer"), los más nuevos primero. */
export function recentlyChecked(list: ShoppingItem[], sinceMs: number, now = Date.now()): ShoppingItem[] {
  return list
    .filter((i) => i.checked_at && now - Date.parse(i.checked_at) <= sinceMs)
    .sort((a, b) => b.checked_at!.localeCompare(a.checked_at!));
}
