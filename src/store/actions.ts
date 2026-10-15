/** Acciones de alto nivel que usan las pantallas. Todas funcionan sin conexión. */
import type { Op } from '../domain/ops';
import type { Category, EventSource, Location, Product, ShoppingItem, StockStatus } from '../domain/types';
import { STATUS_LABEL } from '../domain/types';
import { nowIso, uuid } from '../lib/id';
import { dispatch, getView } from './store';
import { toast } from './toast';

const base = () => ({ id: uuid(), at: nowIso() });

export function setStatus(product: Product, status: StockStatus, source: EventSource = 'manual', undoable = true) {
  if (product.status === status) return;
  const prev = product.status;
  dispatch({ kind: 'set_status', ...base(), productId: product.id, status, source });
  if (undoable) {
    const msg =
      status === 'out' ? `${product.name}: No hay. Lo agregué a la lista.` : `${product.name}: ${STATUS_LABEL[status]}`;
    toast(msg, {
      label: 'Deshacer',
      run: () => dispatch({ kind: 'set_status', ...base(), productId: product.id, status: prev, source }),
    });
  }
}

export function setQuantity(product: Product, quantity: number) {
  dispatch({ kind: 'set_status', ...base(), productId: product.id, quantity: Math.max(0, quantity), source: 'manual' });
}

export interface NewProduct {
  name: string;
  category_id?: string | null;
  location_id?: string | null;
  status?: StockStatus;
  is_staple?: boolean;
  track_quantity?: boolean;
  quantity?: number | null;
  low_threshold?: number;
  unidentified?: boolean;
}

export function createProduct(input: NewProduct): Product | null {
  const view = getView();
  if (!view) return null;
  const at = nowIso();
  const product: Product = {
    id: uuid(),
    household_id: view.household.id,
    name: input.name.trim(),
    category_id: input.category_id ?? null,
    location_id: input.location_id ?? null,
    status: input.status ?? 'ok',
    track_quantity: input.track_quantity ?? false,
    quantity: input.track_quantity ? input.quantity ?? 1 : null,
    low_threshold: input.low_threshold ?? 1,
    unit: null,
    is_staple: input.is_staple ?? false,
    unidentified: input.unidentified ?? false,
    expires_on: null,
    notes: null,
    status_changed_at: at,
    created_at: at,
    updated_at: at,
  };
  dispatch({ kind: 'create_product', id: uuid(), at, product });
  return product;
}

export function updateProduct(productId: string, patch: Partial<Product>) {
  dispatch({ kind: 'update_product', ...base(), productId, patch });
}

export function deleteProduct(product: Product) {
  dispatch({ kind: 'delete_product', ...base(), productId: product.id });
  toast(`Borré ${product.name}.`);
}

export function addListItem(input: { productId?: string; name?: string }) {
  const view = getView();
  if (!view) return;
  const item: ShoppingItem = {
    id: uuid(),
    household_id: view.household.id,
    product_id: input.productId ?? null,
    name: input.productId ? null : input.name?.trim() || null,
    quantity: null,
    note: null,
    reason: 'manual',
    checked_at: null,
    checked_by: null,
    created_at: nowIso(),
  };
  dispatch({ kind: 'add_item', ...base(), item });
}

export function purchaseItem(item: ShoppingItem) {
  dispatch({ kind: 'purchase_item', ...base(), itemId: item.id });
}

export function unpurchaseItem(item: ShoppingItem) {
  dispatch({ kind: 'unpurchase_item', ...base(), itemId: item.id });
}

export function removeItem(item: ShoppingItem) {
  dispatch({ kind: 'remove_item', ...base(), itemId: item.id });
}

export function clearChecked() {
  dispatch({ kind: 'clear_checked', ...base() });
}

export function saveLocation(loc: Partial<Location> & { name: string }) {
  const view = getView();
  if (!view) return;
  const location: Location = {
    id: loc.id ?? uuid(),
    household_id: view.household.id,
    name: loc.name.trim(),
    icon: loc.icon ?? null,
    sort_order: loc.sort_order ?? Math.max(0, ...view.locations.map((l) => l.sort_order)) + 1,
  };
  dispatch({ kind: 'upsert_location', ...base(), location });
}

export function deleteLocation(id: string) {
  dispatch({ kind: 'delete_location', ...base(), locationId: id });
}

export function saveCategory(cat: Partial<Category> & { name: string }) {
  const view = getView();
  if (!view) return;
  const category: Category = {
    id: cat.id ?? uuid(),
    household_id: view.household.id,
    name: cat.name.trim(),
    icon: cat.icon ?? null,
    sort_order: cat.sort_order ?? Math.max(0, ...view.categories.map((c) => c.sort_order)) + 1,
  };
  dispatch({ kind: 'upsert_category', ...base(), category });
}

export function deleteCategory(id: string) {
  dispatch({ kind: 'delete_category', ...base(), categoryId: id });
}

/** Mueve una categoría un lugar arriba/abajo (orden del recorrido del súper). */
export function moveCategory(id: string, dir: -1 | 1) {
  const view = getView();
  if (!view) return;
  const sorted = [...view.categories].sort((a, b) => a.sort_order - b.sort_order);
  const i = sorted.findIndex((c) => c.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= sorted.length) return;
  const a = sorted[i];
  const b = sorted[j];
  const ops: Op[] = [
    { kind: 'upsert_category', ...base(), category: { ...a, sort_order: b.sort_order } },
    { kind: 'upsert_category', ...base(), category: { ...b, sort_order: a.sort_order } },
  ];
  if (a.sort_order === b.sort_order) {
    ops[0] = { kind: 'upsert_category', ...base(), category: { ...a, sort_order: b.sort_order + dir } };
  }
  ops.forEach(dispatch);
}

export function updateHousehold(patch: { name?: string; list_on_low?: boolean }) {
  dispatch({ kind: 'update_household', ...base(), patch });
}
