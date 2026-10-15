/** Todo lo que habla con Supabase: lectura del hogar y envío de operaciones. */
import type { Op } from '../domain/ops';
import type { Household, Member, Snapshot } from '../domain/types';
import { supabase } from './supabase';

const PRODUCT_COLS =
  'id,household_id,name,category_id,location_id,status,track_quantity,quantity,low_threshold,unit,is_staple,unidentified,expires_on,image_url,notes,status_changed_at,created_at,updated_at';
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
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const eventsSince = new Date(Date.now() - 120 * 86_400_000).toISOString();
  const [household, members, locations, categories, products, list, outs] = await Promise.all([
    supabase.from('households').select('id,name,invite_code,list_on_low,created_at').eq('id', householdId).single(),
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
  }
}

export async function createHousehold(name: string, displayName: string | null): Promise<Household> {
  return check(
    await supabase.rpc('create_household', { p_name: name, p_display_name: displayName }).single(),
  ) as Household;
}

export async function joinHousehold(code: string, displayName: string | null): Promise<Household> {
  return check(
    await supabase.rpc('join_household', { p_code: code, p_display_name: displayName }).single(),
  ) as Household;
}

export async function regenerateInviteCode(householdId: string): Promise<string> {
  return check(await supabase.rpc('regenerate_invite_code', { p_household_id: householdId })) as string;
}
