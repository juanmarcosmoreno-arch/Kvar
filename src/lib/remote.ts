/** Todo lo que habla con Supabase: lectura del hogar y envío de operaciones. */
import type { Op } from '../domain/ops';
import type { Household, Member, Recipe, RecipeFeedback, Snapshot } from '../domain/types';
import { removeImage, UploadError, uploadImage } from './images';
import { demoServer, isDemo } from './demo';
import { supabase } from './supabase';

const PRODUCT_COLS =
  'id,household_id,name,category_id,location_id,status,track_quantity,quantity,low_threshold,unit,is_staple,unidentified,expires_on,image_url,image_path,brand,notes,status_changed_at,created_at,updated_at';
const ITEM_COLS = 'id,household_id,product_id,name,quantity,note,reason,checked_at,checked_by,created_at';

export class PermanentError extends Error {}

function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) {
    // Con código de Postgres/PostgREST el servidor respondió: reintentar no sirve.
    if (res.error.code && !/^(PGRST301|503|504)$/.test(res.error.code)) {
      throw new PermanentError(res.error.message);
    }
    throw new Error(res.error.message);
  }
  return res.data;
}

export async function fetchMemberships(userId: string): Promise<(Member & { household: Household })[]> {
  if (isDemo) {
    const s = demoServer.snapshot();
    return s.members.filter((m) => m.user_id === userId).map((m) => ({ ...m, household: s.household }));
  }
  const data = check(
    await supabase
      .from('household_members')
      .select('*, household:households(*)')
      .eq('user_id', userId)
      .order('joined_at'),
  );
  return data as unknown as (Member & { household: Household })[];
}

export async function fetchSnapshot(householdId: string): Promise<Snapshot> {
  if (isDemo) return demoServer.snapshot();
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const eventsSince = new Date(Date.now() - 120 * 86_400_000).toISOString();
  const [household, members, locations, categories, products, list, outs, aliases, recipes, feedback] = await Promise.all([
    supabase.from('households').select('id,name,invite_code,list_on_low,default_servings,created_at').eq('id', householdId).single(),
    supabase.from('household_members').select('*').eq('household_id', householdId),
    supabase.from('locations').select('id,household_id,name,icon,sort_order').eq('household_id', householdId).order('sort_order'),
    supabase.from('categories').select('id,household_id,name,icon,sort_order').eq('household_id', householdId).order('sort_order'),
    supabase.from('products').select(PRODUCT_COLS).eq('household_id', householdId).order('name'),
    supabase
      .from('shopping_list_items')
      .select(ITEM_COLS)
      .eq('household_id', householdId)
      .or(`checked_at.is.null,checked_at.gt."${since}"`),
    supabase
      .from('product_events')
      .select('product_id')
      .eq('household_id', householdId)
      .eq('to_status', 'out')
      .gt('created_at', eventsSince)
      .limit(3000),
    supabase
      .from('product_aliases')
      .select('id,household_id,product_id,kind,alias,normalized,hits')
      .eq('household_id', householdId),
    supabase
      .from('recipes')
      .select('*, ingredients:recipe_ingredients(*)')
      .eq('household_id', householdId)
      .order('title'),
    supabase
      .from('recipe_feedback')
      .select('id,household_id,recipe_id,catalog_key,recipe_title,tags,action,created_at')
      .eq('household_id', householdId)
      .gt('created_at', eventsSince)
      .limit(1000),
  ]);
  const outCounts: Record<string, number> = {};
  for (const e of check(outs) as { product_id: string | null }[]) {
    if (e.product_id) outCounts[e.product_id] = (outCounts[e.product_id] ?? 0) + 1;
  }
  return {
    household: check(household) as Household,
    members: check(members) as Member[],
    locations: check(locations) as Snapshot['locations'],
    categories: check(categories) as Snapshot['categories'],
    products: check(products) as Snapshot['products'],
    list: check(list) as Snapshot['list'],
    outCounts,
    aliases: check(aliases) as Snapshot['aliases'],
    // Las recetas no frenan el resto: si la migración de la Fase 5 todavía no se aplicó, la app anda igual
    recipes: (recipes.error ? [] : (recipes.data as Recipe[])).map((r) => ({
      ...r,
      ingredients: [...(r.ingredients ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    })),
    feedback: feedback.error ? [] : (feedback.data as RecipeFeedback[]),
  };
}

/** Los ítems agregados por la app offline tienen id "local-<producto>": se busca el real. */
async function realItemId(itemId: string): Promise<string | null> {
  if (!itemId.startsWith('local-')) return itemId;
  const productId = itemId.slice('local-'.length);
  const data = check(
    await supabase
      .from('shopping_list_items')
      .select('id,checked_at')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(1),
  ) as { id: string }[];
  return data[0]?.id ?? null;
}

export async function sendOp(op: Op, householdId: string): Promise<void> {
  if (isDemo) {
    demoServer.apply(op);
    return;
  }
  switch (op.kind) {
    case 'set_status': {
      check(
        await supabase.rpc('set_product_status', {
          p_product_id: op.productId,
          p_status: op.status ?? 'ok',
          p_quantity: op.quantity ?? null,
          p_source: op.source,
          p_event_id: op.id,
          p_client_time: op.at,
        }),
      );
      return;
    }
    case 'create_product': {
      const p = op.product;
      check(
        await supabase.from('products').upsert(
          {
            id: p.id,
            household_id: p.household_id,
            name: p.name,
            category_id: p.category_id,
            location_id: p.location_id,
            status: p.status,
            track_quantity: p.track_quantity,
            quantity: p.quantity,
            low_threshold: p.low_threshold,
            unit: p.unit,
            is_staple: p.is_staple,
            unidentified: p.unidentified,
            expires_on: p.expires_on,
            image_url: p.image_url,
            brand: p.brand ?? null,
            notes: p.notes,
            status_changed_at: p.status_changed_at,
          },
          { onConflict: 'id', ignoreDuplicates: true },
        ),
      );
      return;
    }
    case 'update_product': {
      const { id: _i, household_id: _h, created_at: _c, updated_at: _u, ...patch } = op.patch;
      check(await supabase.from('products').update(patch).eq('id', op.productId));
      return;
    }
    case 'delete_product':
      check(await supabase.from('products').delete().eq('id', op.productId));
      return;
    case 'add_item': {
      const { checked_by: _cb, ...item } = op.item;
      const res = await supabase.from('shopping_list_items').upsert(item, { onConflict: 'id', ignoreDuplicates: true });
      if (res.error?.code === '23505') return; // ya estaba en la lista abierta
      check(res);
      return;
    }
    case 'purchase_item': {
      const id = await realItemId(op.itemId);
      if (!id) return;
      check(await supabase.rpc('purchase_list_item', { p_item_id: id, p_event_id: op.id, p_client_time: op.at }));
      return;
    }
    case 'unpurchase_item': {
      const id = await realItemId(op.itemId);
      if (!id) return;
      check(await supabase.rpc('unpurchase_list_item', { p_item_id: id }));
      return;
    }
    case 'update_item': {
      const id = await realItemId(op.itemId);
      if (!id) return;
      check(await supabase.from('shopping_list_items').update(op.patch).eq('id', id));
      return;
    }
    case 'remove_item': {
      const id = await realItemId(op.itemId);
      if (!id) return;
      check(await supabase.from('shopping_list_items').delete().eq('id', id));
      return;
    }
    case 'clear_checked':
      check(
        await supabase
          .from('shopping_list_items')
          .delete()
          .eq('household_id', householdId)
          .not('checked_at', 'is', null)
          .lte('checked_at', op.at),
      );
      return;
    case 'upsert_location':
      check(await supabase.from('locations').upsert(op.location));
      return;
    case 'delete_location':
      check(await supabase.from('locations').delete().eq('id', op.locationId));
      return;
    case 'upsert_category':
      check(await supabase.from('categories').upsert(op.category));
      return;
    case 'delete_category':
      check(await supabase.from('categories').delete().eq('id', op.categoryId));
      return;
    case 'update_household':
      check(await supabase.from('households').update(op.patch).eq('id', householdId));
      return;
    case 'learn_alias': {
      const a = op.alias;
      check(
        await supabase.rpc('learn_alias', {
          p_household_id: a.household_id,
          p_product_id: a.product_id,
          p_kind: a.kind,
          p_alias: a.alias,
          p_normalized: a.normalized,
          p_id: a.id,
        }),
      );
      return;
    }
    case 'merge_products':
      check(await supabase.rpc('merge_products', { p_source: op.sourceId, p_target: op.targetId }));
      return;
    case 'remove_alias':
      check(await supabase.from('product_aliases').delete().eq('id', op.aliasId));
      return;
    case 'save_recipe': {
      const { ingredients, created_at: _c, updated_at: _u, ...recipe } = op.recipe;
      check(
        await supabase.rpc('save_recipe', {
          p_recipe: recipe,
          p_ingredients: ingredients.map(({ recipe_id: _r, household_id: _h, ...i }) => i),
        }),
      );
      return;
    }
    case 'delete_recipe':
      check(await supabase.from('recipes').delete().eq('id', op.recipeId));
      return;
    case 'recipe_feedback': {
      const res = await supabase.from('recipe_feedback').upsert(op.feedback, { onConflict: 'id', ignoreDuplicates: true });
      // Sin la migración de la Fase 5 (catalog_key) el feedback se pierde, pero no traba la cola
      if (res.error?.code === 'PGRST204' || res.error?.code === '42703') return;
      check(res);
      return;
    }
    case 'set_image': {
      try {
        if (!(await uploadImage(op.path))) return; // la foto local ya no está: nada que subir
      } catch (e) {
        if (e instanceof UploadError && e.status && e.status >= 400 && e.status < 500) throw new PermanentError(e.message);
        throw e;
      }
      check(await supabase.from('products').update({ image_path: op.path }).eq('id', op.productId));
      if (op.previousPath) await removeImage(op.previousPath).catch(() => {});
      return;
    }
  }
}

export async function createHousehold(name: string, displayName: string | null): Promise<Household> {
  if (isDemo) return demoServer.household();
  return check(
    await supabase.rpc('create_household', { p_name: name, p_display_name: displayName }).single(),
  ) as Household;
}

export async function joinHousehold(code: string, displayName: string | null): Promise<Household> {
  if (isDemo) return demoServer.household();
  return check(
    await supabase.rpc('join_household', { p_code: code, p_display_name: displayName }).single(),
  ) as Household;
}

export async function regenerateInviteCode(householdId: string): Promise<string> {
  if (isDemo) return demoServer.household().invite_code;
  return check(await supabase.rpc('regenerate_invite_code', { p_household_id: householdId })) as string;
}

/** Versión mínima de la app que la base acepta (null si no se pudo leer, p. ej. sin conexión). */
export async function fetchMinVersion(): Promise<string | null> {
  if (isDemo) return null;
  const { data, error } = await supabase.from('app_config').select('value').eq('key', 'min_client_version').maybeSingle();
  if (error) return null;
  return (data as { value: string } | null)?.value ?? null;
}

/** Borra la cuenta del usuario actual (y los hogares donde era el único miembro). */
export async function deleteMyAccount(): Promise<void> {
  if (isDemo) {
    demoServer.reset();
    return;
  }
  check(await supabase.rpc('delete_my_account'));
}
