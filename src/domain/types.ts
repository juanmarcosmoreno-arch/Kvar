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
  /** Personas a comer por defecto (Fase 5: escala las recetas) */
  default_servings?: number;
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
  /** Imagen externa (Open Food Facts) */
  image_url: string | null;
  /** Foto propia recortada sin fondo, en Storage (product-images/<hogar>/<archivo>) */
  image_path?: string | null;
  brand?: string | null;
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
  /** Equivalencias aprendidas (código de barras, ticket, voz → producto) */
  aliases?: ProductAlias[];
  /** Recetas propias del hogar (las del catálogo están en domain/recipeCatalog.ts) */
  recipes?: Recipe[];
  /** «No me tienta», «La hice»: para aprender qué proponer */
  feedback?: RecipeFeedback[];
}

export interface ProductAlias {
  id: string;
  household_id: string;
  product_id: string;
  kind: 'barcode' | 'receipt' | 'voice' | 'photo' | 'email';
  alias: string;
  normalized: string;
  hits: number;
}

export const STATUS_LABEL: Record<StockStatus, string> = {
  ok: 'Hay',
  low: 'Queda poco',
  out: 'No hay',
};

// -----------------------------------------------------------------------------
// Recetas (Fase 5)
// -----------------------------------------------------------------------------
export type MealType = 'almuerzo' | 'cena' | 'vianda' | 'dulce';
export type RecipeConstraint = 'sin_horno' | 'una_olla';

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  household_id: string;
  /** Producto del hogar elegido a mano; si es null se busca por nombre. */
  product_id: string | null;
  name: string;
  /** Cantidad para `recipe.servings` personas (se escala). */
  quantity: number | null;
  /** g, ml, u, taza, cda, cdita, diente, lata, paquete… (ver domain/recipes.ts) */
  unit: string | null;
  /** Lo que no se escala: «a gusto», «1 pizca». */
  amount: string | null;
  optional: boolean;
  sort_order: number;
}

export interface Recipe {
  id: string;
  household_id: string;
  title: string;
  /** catalog = recetas que trae Stoka (viven en la app, no en la base) */
  source: 'own' | 'imported' | 'ai' | 'catalog';
  source_url: string | null;
  servings: number | null;
  total_minutes: number | null;
  meal_types: MealType[];
  constraints: RecipeConstraint[];
  tags: string[];
  steps: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  ingredients: RecipeIngredient[];
}

export interface RecipeFeedback {
  id: string;
  household_id: string;
  recipe_id: string | null;
  /** Para las recetas del catálogo, que no tienen fila en `recipes`. */
  catalog_key: string | null;
  recipe_title: string | null;
  tags: string[];
  action: 'dismissed' | 'cooked' | 'liked';
  created_at: string;
}
