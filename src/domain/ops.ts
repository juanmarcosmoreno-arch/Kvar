/**
 * Operaciones que el usuario hace sobre el stock. Se aplican al instante sobre
 * el estado local (también sin conexión) y se guardan en una cola ("outbox")
 * que se envía a Supabase al reconectar. La vista siempre es:
 *
 *     estado del servidor  +  operaciones pendientes  =  lo que ve el usuario
 */
import { applyStatusToList } from './shoppingList';
import type { PurchaseLine } from './spending';
import { resolveStock } from './status';
import type {
  Category, EventSource, Household, Location, Product, ProductAlias, Recipe, RecipeFeedback, ShoppingItem, Snapshot,
  StockStatus,
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
  | { kind: 'update_item'; id: string; at: string; itemId: string; patch: Partial<Pick<ShoppingItem, 'quantity' | 'note'>> }
  | { kind: 'clear_checked'; id: string; at: string }
  | { kind: 'upsert_location'; id: string; at: string; location: Location }
  | { kind: 'delete_location'; id: string; at: string; locationId: string }
  | { kind: 'upsert_category'; id: string; at: string; category: Category }
  | { kind: 'delete_category'; id: string; at: string; categoryId: string }
  | { kind: 'update_household'; id: string; at: string; patch: Partial<Pick<Household, 'name' | 'list_on_low' | 'default_servings'>> }
  /** Receta propia con sus ingredientes (se guarda entera) */
  | { kind: 'save_recipe'; id: string; at: string; recipe: Recipe }
  | { kind: 'delete_recipe'; id: string; at: string; recipeId: string }
  | { kind: 'recipe_feedback'; id: string; at: string; feedback: RecipeFeedback }
  /** Dos productos que son lo mismo: `sourceId` pasa a ser `targetId` (códigos, lista, recetas) y se borra */
  | { kind: 'merge_products'; id: string; at: string; sourceId: string; targetId: string }
  | { kind: 'remove_alias'; id: string; at: string; aliasId: string }
  /** Cada uno pone o cambia su nombre en el hogar */
  | { kind: 'set_member_name'; id: string; at: string; userId: string; name: string | null }
  /** Precios de un ticket (para Gastos). No cambian lo que se ve en el stock. */
  | { kind: 'record_purchases'; id: string; at: string; lines: PurchaseLine[] }
  | { kind: 'learn_alias'; id: string; at: string; alias: ProductAlias }
  /** La foto ya está guardada en el teléfono (IndexedDB) bajo `path`; se sube al sincronizar. */
  | { kind: 'set_image'; id: string; at: string; productId: string; path: string; previousPath: string | null };

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

/** Como upsert, pero reemplaza la fila entera (una receta trae sus ingredientes). */
function upsertReplace<T extends { id: string }>(arr: T[], row: T): T[] {
  return arr.some((x) => x.id === row.id) ? arr.map((x) => (x.id === row.id ? row : x)) : [...arr, row];
}

const STATUS_RANK: Record<StockStatus, number> = { ok: 0, low: 1, out: 2 };

/** Igual que la función merge_products de la base, para verlo al instante (también sin conexión). */
function mergeProducts(s: Snapshot, sourceId: string, targetId: string): Snapshot {
  const src = s.products.find((p) => p.id === sourceId);
  const dst = s.products.find((p) => p.id === targetId);
  if (!src || !dst || src.id === dst.id) return s;
  const merged: Product = { ...dst, is_staple: dst.is_staple || src.is_staple };
  if (dst.track_quantity && src.track_quantity) {
    const quantity = (dst.quantity ?? 0) + (src.quantity ?? 0);
    Object.assign(merged, resolveStock(dst, { quantity }));
  } else {
    merged.status = STATUS_RANK[src.status] < STATUS_RANK[dst.status] ? src.status : dst.status;
    merged.image_path = dst.image_path ?? src.image_path ?? null;
    merged.image_url = dst.image_url ?? src.image_url;
  }
  const targetOpen = s.list.some((i) => i.product_id === dst.id && !i.checked_at);
  const list = s.list
    .filter((i) => !(i.product_id === src.id && !i.checked_at && targetOpen))
    .map((i) => (i.product_id === src.id ? { ...i, product_id: dst.id } : i));
  const { [src.id]: srcOuts = 0, ...outCounts } = s.outCounts;
  return {
    ...s,
    products: s.products.filter((p) => p.id !== src.id).map((p) => (p.id === dst.id ? merged : p)),
    list,
    outCounts: { ...outCounts, [dst.id]: (outCounts[dst.id] ?? 0) + srcOuts },
    aliases: s.aliases?.map((a) => (a.product_id === src.id ? { ...a, product_id: dst.id } : a)),
    recipes: s.recipes?.map((r) =>
      r.ingredients.some((i) => i.product_id === src.id)
        ? { ...r, ingredients: r.ingredients.map((i) => (i.product_id === src.id ? { ...i, product_id: dst.id } : i)) }
        : r),
  };
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
        aliases: s.aliases?.filter((a) => a.product_id !== op.productId),
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
    case 'update_item':
      return { ...s, list: s.list.map((i) => (i.id === op.itemId ? { ...i, ...op.patch } : i)) };
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
    case 'learn_alias': {
      const aliases = s.aliases ?? [];
      const a = op.alias;
      const existing = aliases.find((x) => x.kind === a.kind && x.normalized === a.normalized);
      if (!existing) return { ...s, aliases: [...aliases, a] };
      const updated: ProductAlias =
        existing.product_id === a.product_id
          ? { ...existing, hits: existing.hits + 1 }
          : { ...existing, product_id: a.product_id, alias: a.alias, hits: 1 };
      return { ...s, aliases: aliases.map((x) => (x === existing ? updated : x)) };
    }
    case 'save_recipe':
      return { ...s, recipes: upsertReplace(s.recipes ?? [], op.recipe) };
    case 'delete_recipe':
      return { ...s, recipes: (s.recipes ?? []).filter((r) => r.id !== op.recipeId) };
    case 'recipe_feedback':
      if (s.feedback?.some((f) => f.id === op.feedback.id)) return s;
      return { ...s, feedback: [...(s.feedback ?? []), op.feedback] };
    case 'merge_products':
      return mergeProducts(s, op.sourceId, op.targetId);
    case 'record_purchases':
      return s;
    case 'set_member_name':
      return { ...s, members: s.members.map((x) => (x.user_id === op.userId ? { ...x, display_name: op.name } : x)) };
    case 'remove_alias':
      return { ...s, aliases: s.aliases?.filter((a) => a.id !== op.aliasId) };
    case 'set_image':
      return {
        ...s,
        products: s.products.map((p) => (p.id === op.productId ? { ...p, image_path: op.path } : p)),
      };
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
    if (op.kind === 'learn_alias') return !createdThenDeleted.has(op.alias.product_id);
    return true;
  });
}
