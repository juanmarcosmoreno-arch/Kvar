// Tipos del dominio. Reflejan las tablas de supabase/migrations.

export type StockStatus = 'ok' | 'low' | 'out';
export type ListReason = 'out' | 'low' | 'manual' | 'recipe' | 'plan' | 'predicted';
export type EventSource =
  | 'manual' | 'swipe' | 'quick_out' | 'shopping' | 'barcode' | 'voice'
  | 'receipt' | 'photo' | 'email' | 'recipe' | 'system';

export interface Household {
  id: string;
  name: string;
  invite_code: string;
  list_on_low: boolean;
  created_at: string;
}

export interface Member {
  household_id: string;
  user_id: string;
  role: 'owner' | 'member';
  display_name: string | null;
  joined_at: string;
}

export interface Location {
  id: string;
  household_id: string;
  name: string;
  icon: string | null;
  sort_order: number;
}

export interface Category {
  id: string;
  household_id: string;
  name: string;
  icon: string | null;
  sort_order: number;
}

export interface Product {
  id: string;
  household_id: string;
  name: string;
  category_id: string | null;
  location_id: string | null;
  status: StockStatus;
  track_quantity: boolean;
  quantity: number | null;
  low_threshold: number;
  unit: string | null;
  is_staple: boolean;
  unidentified: boolean;
  expires_on: string | null;
  /** Foto del producto recortada sin fondo (Fase 2) */
  image_url: string | null;
  notes: string | null;
  status_changed_at: string;
  created_at: string;
  updated_at: string;
}

export interface ShoppingItem {
  id: string;
  household_id: string;
  product_id: string | null;
  name: string | null;
  quantity: number | null;
  note: string | null;
  reason: ListReason;
  checked_at: string | null;
  checked_by: string | null;
  created_at: string;
}

export interface ProductEvent {
  id: string;
  household_id: string;
  product_id: string | null;
  type: string;
  source: EventSource;
  from_status: StockStatus | null;
  to_status: StockStatus | null;
  created_at: string;
}

/** Foto completa del hogar que se guarda localmente para uso offline. */
export interface Snapshot {
  household: Household;
  members: Member[];
  locations: Location[];
  categories: Category[];
  products: Product[];
  list: ShoppingItem[];
  /** product_id -> cantidad de veces que se marcó "No hay" (para "frecuentes") */
  outCounts: Record<string, number>;
}

export const STATUS_LABEL: Record<StockStatus, string> = {
  ok: 'Hay',
  low: 'Queda poco',
  out: 'No hay',
};
