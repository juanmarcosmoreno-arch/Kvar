/**
 * Operaciones que el usuario hace sobre el stock. Se aplican al instante sobre
 * el estado local (también sin conexión) y se guardan en una cola ("outbox")
 * que se envía a Supabase al reconectar. La vista siempre es:
 *
 *     estado del servidor  +  operaciones pendientes  =  lo que ve el usuario
 */
import { applyStatusToList } from './shoppingList';
import { resolveStock } from './status';
import type {
  Category, EventSource, Household, Location, Product, ShoppingItem, Snapshot, StockStatus,
} from './types';

export type Op =
  | { kind: 'set_status'; id: string; at: string; productId: string; status?: StockStatus; quantity?: number; source: EventSource }
  | { kind: 'create_product'; id: string; at: string; product: Product }
  | { kind: 'update_product'; id: string; at: string; productId: string; patch: Partial<Product> }
  | { kind: 'delete_product'; id: string; at: string; productId: string }
  | { kind: 'add_item'; id: string; at: string; item: ShoppingItem }
  | { kind: 'purchase_item'; id: string; at: string; itemId: string }
  | { kind: 'unpurchase_item'; id: string; at: string; itemId: string }
  | { kind: 'remove_item'; id: string; at: string; itemId: string }
  | { kind: 'clear_checked'; id: string; at: string }
  | { kind: 'upsert_location'; id: string; at: string; location: Location }
  | { kind: 'delete_location'; id: string; at: string; locationId: string }
  | { kind: 'upsert_category'; id: string; at: string; category: Category }
  | { kind: 'delete_category'; id: string; at: string; categoryId: string }
  | { kind: 'update_household'; id: string; at: string; patch: Partial<Pick<Household, 'name' | 'list_on_low'>> };

/** Id determinístico para ítems que la app agrega sola mientras no hay confirmación del servidor. */
export const localItemId = (productId: string) => `local-${productId}`;

function upsert<T extends { id: string }>(arr: T[], row: T): T[] {
  const i = arr.findIndex((x) => x.id === row.id);
  if (i === -1) return [...arr, row];
  const copy = arr.slice();
  copy[i] = { ...copy[i], ...row };
  return copy;
}

function withStock(s: Snapshot, product: Product, wanted: { status?: StockStatus; quantity?: number | null }, at: string): Snapshot {
  const next = resolveStock(product, wanted);
  const updated: Product = { ...product, status: next.status, quantity: next.quantity, status_changed_at: at };
  const list = applyStatusToList(s.list, updated, next.status, {
    listOnLow: s.household.list_on_low,
    now: at,
    newId: () => localItemId(product.id),
  });
  const outCounts =
    next.status === 'out' && product.status !== 'out'
      ? { ...s.outCounts, [product.id]: (s.outCounts[product.id] ?? 0) + 1 }
      : s.outCounts;
  return { ...s, products: upsert(s.products, updated), list, outCounts };
}

export function applyOp(s: Snapshot, op: Op): Snapshot {
  switch (op.kind) {
    case 'set_status': {
      const p = s.products.find((x) => x.id === op.productId);
      if (!p) return s;
      return withStock(s, p, { status: op.status, quantity: op.quantity }, op.at);
    }
    case 'create_product': {
      if (s.products.some((p) => p.id === op.product.id)) return s;
      const withProduct = { ...s, products: [...s.products, op.product] };
      return withStock(withProduct, op.product, { status: op.product.status, quantity: op.product.quantity }, op.at);
    }
    case 'update_product': {
      const p = s.products.find((x) => x.id === op.productId);
      if (!p) return s;
      const updated = { ...p, ...op.patch };
      let next = { ...s, products: upsert(s.products, updated) };
      if (op.patch.is_staple !== undefined && op.patch.is_staple !== p.is_staple) {
        next = { ...next, list: applyStatusToList(next.list, updated, updated.status, {
          listOnLow: s.household.list_on_low, now: op.at, newId: () => localItemId(p.id),
        }) };
      }
      return next;
    }
    case 'delete_product':
      return {
        ...s,
        products: s.products.filter((p) => p.id !== op.productId),
        list: s.list.filter((i) => i.product_id !== op.productId),
      };
    case 'add_item': {
      if (op.item.product_id && s.list.some((i) => i.product_id === op.item.product_id && !i.checked_at)) return s;
      return { ...s, list: upsert(s.list, op.item) };
    }
    case 'purchase_item': {
      const item = s.list.find((i) => i.id === op.itemId);
      if (!item || item.checked_at) return s;
      let next: Snapshot = { ...s, list: upsert(s.list, { ...item, checked_at: op.at }) };
      const p = item.product_id ? s.products.find((x) => x.id === item.product_id) : undefined;
      if (p) {
        const wanted = p.track_quantity
          ? { quantity: (p.quantity ?? 0) + (item.quantity ?? 1) }
          : { status: 'ok' as const };
        const res = resolveStock(p, wanted);
        next = { ...next, products: upsert(next.products, { ...p, ...res, status_changed_at: op.at }) };
      }
      return next;
    }
    case 'unpurchase_item': {
      const item = s.list.find((i) => i.id === op.itemId);
      if (!item || !item.checked_at) return s;
      let next: Snapshot = { ...s, list: upsert(s.list, { ...item, checked_at: null, checked_by: null }) };
      const p = item.product_id ? s.products.find((x) => x.id === item.product_id) : undefined;
      if (p) {
        const res = p.track_quantity
          ? resolveStock(p, { quantity: (p.quantity ?? 0) - (item.quantity ?? 1) })
          : { status: (item.reason === 'low' ? 'low' : 'out') as StockStatus, quantity: p.quantity };
        next = { ...next, products: upsert(next.products, { ...p, ...res }) };
      }
      return next;
    }
    case 'remove_item':
      return { ...s, list: s.list.filter((i) => i.id !== op.itemId) };
    case 'clear_checked':
      return { ...s, list: s.list.filter((i) => !i.checked_at) };
    case 'upsert_location':
      return { ...s, locations: upsert(s.locations, op.location) };
    case 'delete_location':
      return {
        ...s,
        locations: s.locations.filter((l) => l.id !== op.locationId),
        products: s.products.map((p) => (p.location_id === op.locationId ? { ...p, location_id: null } : p)),
      };
    case 'upsert_category':
      return { ...s, categories: upsert(s.categories, op.category) };
    case 'delete_category':
      return {
        ...s,
        categories: s.categories.filter((c) => c.id !== op.categoryId),
        products: s.products.map((p) => (p.category_id === op.categoryId ? { ...p, category_id: null } : p)),
      };
    case 'update_household':
      return { ...s, household: { ...s.household, ...op.patch } };
  }
}

export function applyOps(s: Snapshot, ops: Op[]): Snapshot {
  return ops.reduce(applyOp, s);
}

/**
 * Optimiza la cola antes de enviarla: varios cambios de estado seguidos del mismo
 * producto se envían igual (cada uno es un evento útil para aprender el consumo),
 * pero un producto creado y borrado offline no necesita viajar.
 */
export function compactOps(ops: Op[]): Op[] {
  const createdThenDeleted = new Set<string>();
  const created = new Set<string>();
  for (const op of ops) {
    if (op.kind === 'create_product') created.add(op.product.id);
    if (op.kind === 'delete_product' && created.has(op.productId)) createdThenDeleted.add(op.productId);
  }
  if (!createdThenDeleted.size) return ops;
  return ops.filter((op) => {
    if (op.kind === 'create_product') return !createdThenDeleted.has(op.product.id);
    if ('productId' in op) return !createdThenDeleted.has(op.productId);
    if (op.kind === 'add_item') return !op.item.product_id || !createdThenDeleted.has(op.item.product_id);
    return true;
  });
}
