/** Acciones de alto nivel que usan las pantallas. Todas funcionan sin conexión. */
import { normalizeAlias, normalizeBarcode, type AliasKind } from '../domain/aliases';
import type { Op } from '../domain/ops';
import { openItemFor } from '../domain/shoppingList';
import { nextQuantity, type QuantityMode } from '../domain/quantity';
import { planReceipt, type ReviewLine } from '../domain/receipt';
import { voiceProductName, type ResolvedVoiceAction } from '../domain/voice';
import { guessCategoryFromName, guessLocation } from '../domain/openFoodFacts';
import type {
  Category, EventSource, ListReason, Location, Product, Recipe, RecipeFeedback, ShoppingItem, StockStatus,
} from '../domain/types';
import { missingForList, type Suggestion } from '../domain/recipes';
import { STATUS_LABEL } from '../domain/types';
import { nowIso, uuid } from '../lib/id';
import { imagePath, imageStore } from '../lib/images';
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
  brand?: string | null;
  image_url?: string | null;
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
    image_url: input.image_url ?? null,
    brand: input.brand ?? null,
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

export function addListItem(input: {
  productId?: string; name?: string; quantity?: number | null; note?: string | null; reason?: ListReason;
}) {
  const view = getView();
  if (!view) return;
  const item: ShoppingItem = {
    id: uuid(),
    household_id: view.household.id,
    product_id: input.productId ?? null,
    name: input.productId ? null : input.name?.trim() || null,
    quantity: input.quantity ?? null,
    note: input.note ?? null,
    reason: input.reason ?? 'manual',
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

export function updateHousehold(patch: { name?: string; list_on_low?: boolean; default_servings?: number }) {
  dispatch({ kind: 'update_household', ...base(), patch });
}

/** Aprende una equivalencia (código de barras, texto de ticket…) para un producto. */
export function learnAlias(productId: string, kind: AliasKind, text: string) {
  const view = getView();
  if (!view) return;
  const normalized = kind === 'barcode' ? normalizeBarcode(text) : normalizeAlias(text);
  dispatch({
    kind: 'learn_alias',
    ...base(),
    alias: { id: uuid(), household_id: view.household.id, product_id: productId, kind, alias: text, normalized, hits: 1 },
  });
}

export const learnBarcode = (productId: string, code: string) => learnAlias(productId, 'barcode', code);

/** «Compré»: si estaba en la lista se marca comprado; si lleva conteo suma uno; si no, pasa a Hay. */
export function markBought(product: Product, source: EventSource = 'barcode') {
  const view = getView();
  const item = view ? openItemFor(view.list, product.id) : undefined;
  if (item) {
    purchaseItem(item);
  } else if (product.track_quantity) {
    dispatch({ kind: 'set_status', ...base(), productId: product.id, quantity: (product.quantity ?? 0) + 1, source });
  } else if (product.status !== 'ok') {
    dispatch({ kind: 'set_status', ...base(), productId: product.id, status: 'ok', source });
  }
}

/** Guarda la foto en el teléfono (se ve al instante) y la encola para subirla. */
export async function setProductPhoto(product: Pick<Product, 'id' | 'household_id' | 'image_path'>, blob: Blob) {
  const path = imagePath(product.household_id, product.id, blob.type);
  await imageStore.put(path, blob);
  dispatch({ kind: 'set_image', ...base(), productId: product.id, path, previousPath: product.image_path ?? null });
}

export function setItemQuantity(item: ShoppingItem, quantity: number | null) {
  dispatch({ kind: 'update_item', ...base(), itemId: item.id, patch: { quantity } });
}

/**
 * Aplica una cantidad elegida en el selector.
 * - bought: si el producto está en la lista se marca comprado con esa cantidad; si no, se suma.
 * - list: solo cambia cuántos comprar.
 * - add / remove / set: cambia el stock.
 */
export function applyQuantity(product: Product, mode: QuantityMode, amount: number, source: EventSource = 'manual') {
  const view = getView();
  const item = view ? openItemFor(view.list, product.id) : undefined;
  if (mode === 'list') {
    if (item) setItemQuantity(item, amount);
    else addListItem({ productId: product.id, quantity: amount });
    return;
  }
  if (mode === 'bought' && item) {
    if (item.quantity !== amount) setItemQuantity(item, amount);
    purchaseItem({ ...item, quantity: amount });
    return;
  }
  dispatch({ kind: 'set_status', ...base(), productId: product.id, quantity: nextQuantity(product.quantity, mode, amount), source });
}

/**
 * Aplica un ticket revisado: marca como comprado lo que ya existía (sumando unidades si lleva
 * conteo), crea lo nuevo y aprende las equivalencias para el próximo ticket.
 */
export function applyReceipt(review: ReviewLine[], store: string | null): { updated: number; created: number } {
  const view = getView();
  if (!view) return { updated: 0, created: 0 };
  const plan = planReceipt(review, store);
  let updated = 0;
  for (const [productId, units] of plan.existing) {
    const p = view.products.find((x) => x.id === productId);
    if (!p) continue;
    if (p.track_quantity) applyQuantity(p, 'bought', units, 'receipt');
    else markBought(p, 'receipt');
    updated++;
  }
  const createdIds = new Map<string, string>();
  for (const name of plan.created.keys()) {
    const category = guessCategoryFromName(name, view.categories);
    const location = category ? guessLocation(category.name, view.locations) : null;
    const p = createProduct({
      name,
      status: 'ok',
      category_id: category?.id ?? null,
      location_id: location?.id ?? null,
      unidentified: !category, // sin categoría: queda para completar después
    });
    if (p) createdIds.set(name, p.id);
  }
  for (const l of plan.learn) {
    const productId = l.productId ?? (l.newName ? createdIds.get(l.newName) : undefined);
    if (productId) learnAlias(productId, 'receipt', l.text);
  }
  return { updated, created: createdIds.size };
}

/** Aplica lo que se dijo por voz (ya confirmado). Devuelve cuántas acciones se aplicaron. */
export function applyVoice(actions: ResolvedVoiceAction[]): number {
  const view = getView();
  if (!view) return 0;
  let applied = 0;
  for (const a of actions) {
    if (!a.include || a.kind === 'ask') continue;
    let product = a.productId ? view.products.find((p) => p.id === a.productId) ?? null : null;
    if (!product && a.kind !== 'list') {
      const category = guessCategoryFromName(a.product, view.categories);
      const location = category ? guessLocation(category.name, view.locations) : null;
      product = createProduct({
        name: voiceProductName(a.product),
        status: a.kind === 'bought' ? 'ok' : a.kind,
        category_id: category?.id ?? null,
        location_id: location?.id ?? null,
      });
    } else if (product) {
      if (a.kind === 'bought') {
        if (product.track_quantity) applyQuantity(product, 'bought', a.quantity, 'voice');
        else markBought(product, 'voice');
      } else if (a.kind === 'out' || a.kind === 'low') {
        setStatus(product, a.kind, 'voice', false);
      }
    }
    if (a.kind === 'list') {
      if (product) addListItem({ productId: product.id, quantity: a.quantity > 1 ? a.quantity : null });
      else addListItem({ name: voiceProductName(a.product), quantity: a.quantity > 1 ? a.quantity : null });
    }
    // Lo que se dijo distinto del nombre del producto se aprende («la yerba» → Yerba Canarias)
    if (product && normalizeAlias(a.product) !== normalizeAlias(product.name)) learnAlias(product.id, 'voice', a.product);
    applied++;
  }
  return applied;
}

// -----------------------------------------------------------------------------
// Recetas
// -----------------------------------------------------------------------------

/** Lo que falta para una receta va a la lista (lo que ya estaba no se repite). Devuelve cuántas cosas agregó. */
export function addMissingToList(s: Suggestion): number {
  const view = getView();
  if (!view) return 0;
  let added = 0;
  for (const m of missingForList(s)) {
    if (m.productId) {
      const open = openItemFor(view.list, m.productId);
      if (open) {
        if (m.quantity && (open.quantity ?? 0) < m.quantity) setItemQuantity(open, m.quantity);
        continue;
      }
      addListItem({ productId: m.productId, quantity: m.quantity, note: m.note, reason: 'recipe' });
    } else {
      const already = view.list.some((i) => !i.checked_at && !i.product_id && normalizeAlias(i.name ?? '') === normalizeAlias(m.name));
      if (already) continue;
      addListItem({ name: m.name, quantity: m.quantity, note: m.note, reason: 'recipe' });
    }
    added++;
  }
  return added;
}

export function recipeFeedback(recipe: Recipe, action: RecipeFeedback['action']) {
  const view = getView();
  if (!view) return;
  const own = recipe.source !== 'catalog';
  const feedback: RecipeFeedback = {
    id: uuid(),
    household_id: view.household.id,
    recipe_id: own ? recipe.id : null,
    catalog_key: own ? null : recipe.id,
    recipe_title: recipe.title,
    tags: recipe.tags,
    action,
    created_at: nowIso(),
  };
  dispatch({ kind: 'recipe_feedback', ...base(), feedback });
}

/** «No me tienta»: no se propone por unas semanas (y se aprende el tipo de plato). */
export function dismissRecipe(recipe: Recipe) {
  recipeFeedback(recipe, 'dismissed');
  toast(`Listo, no te propongo ${recipe.title} por un tiempo.`);
}

/**
 * «La hice»: lo que se terminó pasa a No hay (y a la lista), lo que queda poco a Queda poco y
 * lo que lleva conteo descuenta lo usado.
 */
export function cookedRecipe(recipe: Recipe, changes: { product: Product; status?: StockStatus; quantity?: number }[]) {
  for (const c of changes) {
    if (c.quantity !== undefined && c.product.track_quantity) {
      if (c.quantity !== c.product.quantity) {
        dispatch({ kind: 'set_status', ...base(), productId: c.product.id, quantity: Math.max(0, c.quantity), source: 'recipe' });
      }
    } else if (c.status && c.status !== c.product.status) {
      dispatch({ kind: 'set_status', ...base(), productId: c.product.id, status: c.status, source: 'recipe' });
    }
  }
  recipeFeedback(recipe, 'cooked');
}

export function saveRecipe(recipe: Recipe) {
  dispatch({ kind: 'save_recipe', ...base(), recipe: { ...recipe, updated_at: nowIso() } });
}

export function deleteRecipe(recipe: Recipe) {
  dispatch({ kind: 'delete_recipe', ...base(), recipeId: recipe.id });
  toast(`Borré ${recipe.title}.`);
}
