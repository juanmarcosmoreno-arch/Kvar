import type { Category, Product, ShoppingItem, Snapshot } from '../types';

export const HH = 'hh-1';
export const NOW = '2026-10-15T12:00:00.000Z';

export function product(over: Partial<Product> = {}): Product {
  return {
    id: over.id ?? `p-${Math.random().toString(36).slice(2, 8)}`,
    household_id: HH,
    name: 'Leche',
    category_id: null,
    location_id: null,
    status: 'ok',
    track_quantity: false,
    quantity: null,
    low_threshold: 1,
    unit: null,
    is_staple: false,
    unidentified: false,
    expires_on: null,
    notes: null,
    status_changed_at: '2026-10-01T00:00:00.000Z',
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...over,
  };
}

export function item(over: Partial<ShoppingItem> = {}): ShoppingItem {
  return {
    id: over.id ?? `i-${Math.random().toString(36).slice(2, 8)}`,
    household_id: HH,
    product_id: null,
    name: null,
    quantity: null,
    note: null,
    reason: 'manual',
    checked_at: null,
    checked_by: null,
    created_at: NOW,
    ...over,
  };
}

export function category(id: string, name: string, sort_order: number): Category {
  return { id, household_id: HH, name, icon: null, sort_order };
}

export function snapshot(over: Partial<Snapshot> = {}): Snapshot {
  return {
    household: { id: HH, name: 'Casa', invite_code: 'ABCD1234', list_on_low: false, created_at: NOW },
    members: [],
    locations: [],
    categories: [],
    products: [],
    list: [],
    outCounts: {},
    ...over,
  };
}
