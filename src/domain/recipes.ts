/**
 * Recetas: interpretar ingredientes («400 g de fideos»), escalarlos según las personas con
 * redondeos de cocina, cruzarlos con el stock y armar las sugerencias de «¿Qué cocino?».
 * Todo es local y sin IA: funciona sin conexión.
 */
import { normalizeAlias } from './aliases';
import type {
  MealType, Product, Recipe, RecipeConstraint, RecipeFeedback, RecipeIngredient,
} from './types';

// -----------------------------------------------------------------------------
// Unidades de cocina
// -----------------------------------------------------------------------------
type UnitKind = 'mass' | 'volume' | 'spoon' | 'count' | 'piece' | 'container' | 'pack';

interface KitchenUnit {
  key: string;
  singular: string;
  plural: string;
  kind: UnitKind;
  words: string[];
}

/** «u» es «unidad» y no se muestra («2 huevos», «½ cebolla»). */
export const KITCHEN_UNITS: KitchenUnit[] = [
  { key: 'g', singular: 'g', plural: 'g', kind: 'mass', words: ['g', 'gr', 'grs', 'gramo', 'gramos'] },
  { key: 'kg', singular: 'kg', plural: 'kg', kind: 'mass', words: ['kg', 'kgs', 'kilo', 'kilos'] },
  { key: 'ml', singular: 'ml', plural: 'ml', kind: 'volume', words: ['ml', 'cc', 'mililitro', 'mililitros'] },
  { key: 'l', singular: 'l', plural: 'l', kind: 'volume', words: ['l', 'lt', 'lts', 'litro', 'litros'] },
  { key: 'taza', singular: 'taza', plural: 'tazas', kind: 'spoon', words: ['taza', 'tazas'] },
  { key: 'cda', singular: 'cucharada', plural: 'cucharadas', kind: 'spoon', words: ['cda', 'cdas', 'cucharada', 'cucharadas'] },
  { key: 'cdita', singular: 'cucharadita', plural: 'cucharaditas', kind: 'spoon', words: ['cdita', 'cditas', 'cucharadita', 'cucharaditas'] },
  { key: 'diente', singular: 'diente', plural: 'dientes', kind: 'piece', words: ['diente', 'dientes'] },
  { key: 'feta', singular: 'feta', plural: 'fetas', kind: 'piece', words: ['feta', 'fetas'] },
  { key: 'rebanada', singular: 'rebanada', plural: 'rebanadas', kind: 'piece', words: ['rebanada', 'rebanadas'] },
  { key: 'lata', singular: 'lata', plural: 'latas', kind: 'container', words: ['lata', 'latas'] },
  { key: 'sobre', singular: 'sobre', plural: 'sobres', kind: 'container', words: ['sobre', 'sobres'] },
  { key: 'cubo', singular: 'cubo', plural: 'cubos', kind: 'container', words: ['cubo', 'cubos', 'cubito', 'cubitos'] },
  { key: 'frasco', singular: 'frasco', plural: 'frascos', kind: 'container', words: ['frasco', 'frascos'] },
  { key: 'pote', singular: 'pote', plural: 'potes', kind: 'container', words: ['pote', 'potes'] },
  { key: 'paquete', singular: 'paquete', plural: 'paquetes', kind: 'pack', words: ['paquete', 'paquetes'] },
  { key: 'atado', singular: 'atado', plural: 'atados', kind: 'pack', words: ['atado', 'atados'] },
  { key: 'u', singular: '', plural: '', kind: 'count', words: ['u', 'unidad', 'unidades'] },
];

const UNIT_BY_KEY = new Map(KITCHEN_UNITS.map((u) => [u.key, u]));
const UNIT_BY_WORD = new Map(KITCHEN_UNITS.flatMap((u) => u.words.map((w) => [w, u] as const)));

export function kitchenUnit(key: string | null | undefined): KitchenUnit | undefined {
  return key ? UNIT_BY_KEY.get(key) : undefined;
}

// -----------------------------------------------------------------------------
// Interpretar una línea de ingrediente
// -----------------------------------------------------------------------------
export interface ParsedIngredient {
  name: string;
  quantity: number | null;
  unit: string | null;
  amount: string | null;
  optional: boolean;
}

const NUMBER_WORDS: Record<string, number> = {
  un: 1, una: 1, uno: 1, medio: 0.5, media: 0.5, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
  siete: 7, ocho: 8, nueve: 9, diez: 10, doce: 12,
};
const VULGAR: Record<string, string> = { '½': ' 1/2', '¼': ' 1/4', '¾': ' 3/4', '⅓': ' 1/3', '⅔': ' 2/3' };

function parseNumber(token: string): number | null {
  const t = token.trim().toLowerCase();
  if (t in NUMBER_WORDS) return NUMBER_WORDS[t];
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[2]) ? Number(frac[1]) / Number(frac[2]) : null;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Números («300g» pegado vale) o palabras («una cebolla»; «dosis» no es «dos»)
const QTY_RE = new RegExp(
  `^(?:(\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:[.,]\\d+)?)(?=[\\s\\p{L}]|$)|(${Object.keys(NUMBER_WORDS).join('|')})(?=\\s|$))\\s*`,
  'iu',
);
const LOOSE_AMOUNTS = /^(una pizca|un chorrito|un poco|unas gotas|un pu[ñn]ado)\s+(de\s+)?/i;
const FOR_USE = /[\s,]+(para (?:freír|freir|servir|decorar|untar|espolvorear))\.?$/i;
const TO_TASTE = /[\s,]*\b(a gusto|c\/n|cantidad necesaria)\b\.?/i;

/** «400 g de fideos», «1 ½ taza de leche», «sal a gusto», «2 huevos», «queso rallado (opcional)». */
export function parseIngredientLine(line: string): ParsedIngredient | null {
  let s = line.replace(/[½¼¾⅓⅔]/g, (c) => VULGAR[c]).replace(/^[\s\-•*·–]+/, '').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  let optional = false;
  if (/\bopcional\b/i.test(s)) {
    optional = true;
    s = s.replace(/[\s,(]*\bopcional\b\)?/i, '').trim();
  }
  let amount: string | null = null;
  const loose = s.match(LOOSE_AMOUNTS);
  if (loose) {
    amount = loose[1].toLowerCase();
    s = s.slice(loose[0].length);
  } else if (TO_TASTE.test(s)) {
    amount = 'a gusto';
    s = s.replace(TO_TASTE, '').trim();
  } else if (FOR_USE.test(s)) {
    amount = s.match(FOR_USE)![1].toLowerCase();
    s = s.replace(FOR_USE, '').trim();
  }
  let quantity: number | null = null;
  let unit: string | null = null;
  if (!amount) {
    const q = s.match(QTY_RE);
    if (q) {
      quantity = parseNumber(q[1] ?? q[2]);
      s = s.slice(q[0].length);
      const u = s.match(/^([\p{L}]+)\.?(?=\s|$)\s*/u);
      const known = u ? UNIT_BY_WORD.get(u[1].toLowerCase()) : undefined;
      if (u && known) {
        unit = known.key;
        s = s.slice(u[0].length);
      } else if (quantity !== null) {
        unit = 'u';
      }
      s = s.replace(/^(de|del)\s+/i, '');
    }
  }
  const name = s.replace(/[\s,.;:]+$/, '').trim();
  if (!name) return null;
  if (quantity === null) unit = null;
  return { name, quantity, unit, amount, optional };
}

// -----------------------------------------------------------------------------
// Escalar y mostrar cantidades
// -----------------------------------------------------------------------------
const roundTo = (q: number, step: number) => Math.round(q / step) * step;

/** «nunca 0,37 latas»: redondeos que tienen sentido en la cocina. Gramos y ml quedan en g/ml. */
export function kitchenRound(quantity: number, unit: string, name = ''): { quantity: number; unit: string } {
  const u = kitchenUnit(unit);
  if (!u) return { quantity: roundTo(quantity, 0.5) || 0.5, unit };
  let q = quantity;
  let key = u.key;
  if (key === 'kg') { q *= 1000; key = 'g'; }
  if (key === 'l') { q *= 1000; key = 'ml'; }
  switch (u.kind) {
    case 'mass':
    case 'volume': {
      const step = q <= 10 ? 1 : q <= 50 ? 5 : q <= 250 ? 10 : q <= 1000 ? 25 : 50;
      return { quantity: Math.max(1, roundTo(q, step)), unit: key };
    }
    case 'spoon': {
      const step = key === 'taza' && q < 1 ? 0.25 : 0.5;
      return { quantity: Math.max(step, roundTo(q, step)), unit: key };
    }
    case 'count':
      // «½ cebolla» sí; «½ huevo» no
      if (q < 3 && !/huevo/i.test(name)) return { quantity: Math.max(0.5, roundTo(q, 0.5)), unit: key };
      return { quantity: Math.max(1, Math.round(q)), unit: key };
    case 'pack':
      return { quantity: Math.max(0.5, roundTo(q, 0.5)), unit: key };
    case 'piece':
    case 'container':
      return { quantity: Math.max(1, Math.round(q)), unit: key };
  }
}

const FRACTIONS: [number, string][] = [[0.25, '¼'], [0.5, '½'], [0.75, '¾']];

/** 1.5 → «1 ½», 0.25 → «¼», 2.4 → «2,4». */
export function formatNumber(n: number): string {
  const whole = Math.floor(n + 1e-9);
  const rest = n - whole;
  if (rest < 1e-6) return String(whole);
  const frac = FRACTIONS.find(([v]) => Math.abs(v - rest) < 1e-6);
  if (frac) return whole ? `${whole} ${frac[1]}` : frac[1];
  return n.toFixed(1).replace(/\.0$/, '').replace('.', ',');
}

export function formatAmount(quantity: number, unit: string): string {
  // Kilos y litros con decimales («1,5 kg»), como en el súper
  const decimal = (n: number) => String(Math.round(n / 100) / 10).replace('.', ',');
  if (unit === 'g' && quantity >= 1000) return `${decimal(quantity)} kg`;
  if (unit === 'ml' && quantity >= 1000) return `${decimal(quantity)} l`;
  const u = kitchenUnit(unit);
  if (!u || u.key === 'u') return formatNumber(quantity);
  return `${formatNumber(quantity)} ${quantity > 1 ? u.plural : u.singular}`;
}

/** Cantidad para mostrar, ya escalada: «200 g», «½», «2 latas», «a gusto». */
export function amountLabel(ing: Pick<RecipeIngredient, 'quantity' | 'unit' | 'amount' | 'name'>, factor = 1): string {
  if (ing.quantity != null && ing.unit) {
    const r = kitchenRound(ing.quantity * factor, ing.unit, ing.name);
    return formatAmount(r.quantity, r.unit);
  }
  return ing.amount ?? '';
}

export function scaleFactor(recipe: Pick<Recipe, 'servings'>, servings: number): number {
  return recipe.servings ? servings / recipe.servings : 1;
}

// -----------------------------------------------------------------------------
// Cruce con el stock
// -----------------------------------------------------------------------------
const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'con', 'en', 'y', 'para', 'a', 'al']);
/** Lo que se da por hecho que hay en cualquier cocina (si no está cargado como producto). */
const BASICS = new Set(['sal', 'pimient', 'agu', 'oregan', 'pimenton', 'comin', 'nuez moscad', 'condiment', 'perejil sec']);

/** «tomates» y «tomate» → «tomat»; «papas» → «pap». Suficiente para comparar nombres de comida. */
export function stem(word: string): string {
  if (word.length <= 3) return word;
  let x = word.endsWith('es') && word.length > 4 && !/[aeiou]es$/.test(word) ? word.slice(0, -2) : word.replace(/s$/, '');
  x = x.replace(/[aeo]$/, '');
  return x.length >= 3 ? x : word;
}

export function nameWords(text: string): string[] {
  return normalizeAlias(text)
    .replace(/\b\d+(\.\d+)?[a-z]*\b/g, ' ')
    .split(' ')
    .filter((w) => w && !STOP.has(w))
    .map(stem);
}

const startsWith = (a: string[], b: string[]) => b.length > 0 && b.every((w, i) => a[i] === w);

/** 3 = mismo nombre, 2 = el producto es una variedad («Aceite de girasol» para «aceite»), 1 = al revés. */
export function nameScore(ingredient: string, product: string): number {
  const iw = nameWords(ingredient);
  const pw = nameWords(product);
  if (!iw.length || !pw.length) return 0;
  if (iw.length === pw.length && startsWith(iw, pw)) return 3;
  if (startsWith(pw, iw)) return 2;
  if (startsWith(iw, pw)) return 1;
  return 0;
}

const STATUS_RANK = { ok: 0, low: 1, out: 2 } as const;

export function findProduct(ing: Pick<RecipeIngredient, 'name' | 'product_id'>, products: Product[]): Product | null {
  if (ing.product_id) {
    const p = products.find((x) => x.id === ing.product_id);
    if (p) return p;
  }
  let best: Product | null = null;
  let bestScore = 0;
  for (const p of products) {
    const score = nameScore(ing.name, p.name);
    if (!score) continue;
    if (score > bestScore || (score === bestScore && best && STATUS_RANK[p.status] < STATUS_RANK[best.status])) {
      best = p;
      bestScore = score;
    }
  }
  return best;
}

export function isBasic(name: string): boolean {
  const w = nameWords(name).join(' ');
  return BASICS.has(w) || [...BASICS].some((b) => w.startsWith(`${b} `));
}

export type Availability = 'have' | 'low' | 'missing' | 'basic';

export interface IngredientLine {
  ingredient: RecipeIngredient;
  product: Product | null;
  availability: Availability;
  /** Cantidad escalada para mostrar */
  label: string;
  /** Unidades que usa la receta, si se pueden comparar con el conteo del producto */
  uses: number | null;
  /** Cuántas comprar (si se sabe) */
  buy: number | null;
}

const CONTAINER_PRODUCT_UNITS = /^(lata|paquete|botella|caja|frasco|sachet|bolsa|sobre|pote|bandeja|rollo|pack|docena|tableta|capsula)s?$/;

/** Unidades de la receta comparables con el conteo del producto (2 huevos ↔ 3 unidades; 1 lata ↔ 2 latas). */
function comparableUses(ing: RecipeIngredient, factor: number, product: Product): number | null {
  if (!product.track_quantity || ing.quantity == null || !ing.unit) return null;
  const u = kitchenUnit(ing.unit);
  if (!u) return null;
  const pu = normalizeAlias(product.unit ?? '');
  const ok =
    u.kind === 'count' ? !CONTAINER_PRODUCT_UNITS.test(pu)
      : u.kind === 'container' || u.kind === 'pack' ? pu.replace(/s$/, '') === u.key
        : false;
  if (!ok) return null;
  return Math.max(1, Math.ceil(kitchenRound(ing.quantity * factor, ing.unit, ing.name).quantity - 1e-9));
}

export function assessIngredient(ing: RecipeIngredient, products: Product[], factor: number): IngredientLine {
  const product = findProduct(ing, products);
  const label = amountLabel(ing, factor);
  if (!product) {
    const basic = isBasic(ing.name) || (ing.quantity == null && ing.amount === 'a gusto');
    return { ingredient: ing, product: null, availability: basic ? 'basic' : 'missing', label, uses: null, buy: null };
  }
  const uses = comparableUses(ing, factor, product);
  if (uses !== null) {
    const have = Math.max(0, product.quantity ?? 0);
    if (have < uses) return { ingredient: ing, product, availability: 'missing', label, uses, buy: uses - have };
    return { ingredient: ing, product, availability: product.status === 'low' ? 'low' : 'have', label, uses, buy: null };
  }
  const availability: Availability = product.status === 'out' ? 'missing' : product.status === 'low' ? 'low' : 'have';
  return { ingredient: ing, product, availability, label, uses: null, buy: null };
}

// -----------------------------------------------------------------------------
// Sugerencias
// -----------------------------------------------------------------------------
export interface Suggestion {
  recipe: Recipe;
  factor: number;
  lines: IngredientLine[];
  /** Lo que falta y no es opcional */
  missing: IngredientLine[];
  /** Productos que usa y vencen pronto */
  expiring: Product[];
  score: number;
}

export interface SuggestionGroups {
  expiring: Suggestion[];
  ready: Suggestion[];
  oneMissing: Suggestion[];
  more: Suggestion[];
}

export interface CookFilters {
  quick?: boolean;
  meal?: MealType | null;
  constraints?: RecipeConstraint[];
}

export const QUICK_MINUTES = 30;
const MAX_EXPIRING = 4;
const DAY = 86_400_000;

export function assessRecipe(recipe: Recipe, products: Product[], servings: number, now = Date.now()): Suggestion {
  const factor = scaleFactor(recipe, servings);
  const lines = [...recipe.ingredients]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((ing) => assessIngredient(ing, products, factor));
  const missing = lines.filter((l) => l.availability === 'missing' && !l.ingredient.optional);
  const expiring: Product[] = [];
  for (const l of lines) {
    const p = l.product;
    if (!p || p.status === 'out' || !p.expires_on || expiring.includes(p)) continue;
    const days = (Date.parse(p.expires_on) - now) / DAY;
    if (days <= 4 && days >= -1) expiring.push(p);
  }
  return { recipe, factor, lines, missing, expiring, score: 0 };
}

export const recipeKey = (r: Pick<Recipe, 'id'>) => r.id;
const feedbackKey = (f: RecipeFeedback) => f.recipe_id ?? f.catalog_key;

export interface Preferences {
  /** «No me tienta» hace poco: no se propone por un tiempo */
  hidden: Set<string>;
  /** Tipos de plato que se descartan siempre (y nunca se cocinan) */
  blockedTags: Set<string>;
  tagPenalty: Map<string, number>;
  cookedRecently: Set<string>;
  cookedEver: Set<string>;
}

export function learnPreferences(feedback: RecipeFeedback[], now = Date.now()): Preferences {
  const prefs: Preferences = {
    hidden: new Set(), blockedTags: new Set(), tagPenalty: new Map(), cookedRecently: new Set(), cookedEver: new Set(),
  };
  const dismissedTags = new Map<string, number>();
  const cookedTags = new Map<string, number>();
  for (const f of feedback) {
    const key = feedbackKey(f);
    const age = (now - Date.parse(f.created_at)) / DAY;
    if (f.action === 'dismissed') {
      if (key && age <= 21) prefs.hidden.add(key);
      if (age <= 90) for (const t of f.tags) dismissedTags.set(t, (dismissedTags.get(t) ?? 0) + 1);
    } else {
      if (key) prefs.cookedEver.add(key);
      if (key && f.action === 'cooked' && age <= 3) prefs.cookedRecently.add(key);
      for (const t of f.tags) cookedTags.set(t, (cookedTags.get(t) ?? 0) + 1);
    }
  }
  for (const [tag, n] of dismissedTags) {
    const net = n - 2 * (cookedTags.get(tag) ?? 0);
    if (n >= 3 && !cookedTags.get(tag)) prefs.blockedTags.add(tag);
    else if (net > 0) prefs.tagPenalty.set(tag, net * 0.5);
  }
  return prefs;
}

export function matchesFilters(recipe: Recipe, filters: CookFilters): boolean {
  if (filters.quick && (recipe.total_minutes ?? Infinity) > QUICK_MINUTES) return false;
  if (filters.meal && !recipe.meal_types.includes(filters.meal)) return false;
  for (const c of filters.constraints ?? []) if (!recipe.constraints.includes(c)) return false;
  return true;
}

function score(s: Suggestion, prefs: Preferences): number {
  const key = recipeKey(s.recipe);
  let n = 0;
  if (s.recipe.source !== 'catalog') n += 3; // las recetas propias tienen prioridad
  n += 2 * s.expiring.length;
  n -= 0.2 * s.lines.filter((l) => l.availability === 'low').length;
  if (prefs.cookedEver.has(key)) n += 0.5;
  if (prefs.cookedRecently.has(key)) n -= 2; // la hicieron hace poco: que no se repita
  for (const t of s.recipe.tags) n -= prefs.tagPenalty.get(t) ?? 0;
  return n;
}

/**
 * Las tres secciones de «¿Qué cocino?» (más «Con un par de compras»). Cada receta aparece una sola vez:
 * si aprovecha algo que vence, va arriba.
 */
export function suggestRecipes(
  recipes: Recipe[],
  products: Product[],
  opts: { servings: number; filters?: CookFilters; feedback?: RecipeFeedback[]; now?: number },
): SuggestionGroups {
  const now = opts.now ?? Date.now();
  const prefs = learnPreferences(opts.feedback ?? [], now);
  const groups: SuggestionGroups = { expiring: [], ready: [], oneMissing: [], more: [] };
  for (const recipe of recipes) {
    if (!matchesFilters(recipe, opts.filters ?? {})) continue;
    const own = recipe.source !== 'catalog';
    if (prefs.hidden.has(recipeKey(recipe))) continue;
    if (!own && recipe.tags.some((t) => prefs.blockedTags.has(t))) continue;
    const s = assessRecipe(recipe, products, opts.servings, now);
    s.score = score(s, prefs);
    const missing = s.missing.length;
    if (s.expiring.length && missing <= 1) groups.expiring.push(s);
    else if (missing === 0) groups.ready.push(s);
    else if (missing === 1) groups.oneMissing.push(s);
    else if (missing <= 3) groups.more.push(s);
  }
  const order = (a: Suggestion, b: Suggestion) =>
    b.score - a.score || a.missing.length - b.missing.length || a.recipe.title.localeCompare(b.recipe.title, 'es');
  // «Para aprovechar»: las mejores pocas (primero las que no necesitan compras); el resto va a su grupo
  groups.expiring.sort((a, b) => a.missing.length - b.missing.length || order(a, b));
  for (const s of groups.expiring.splice(MAX_EXPIRING)) (s.missing.length ? groups.oneMissing : groups.ready).push(s);
  groups.ready.sort(order);
  groups.oneMissing.sort(order);
  groups.more.sort(order);
  return groups;
}

/** Lo que falta, listo para la lista de compras. */
export function missingForList(s: Suggestion): { productId: string | null; name: string; quantity: number | null; note: string }[] {
  return s.missing.map((l) => ({
    productId: l.product?.id ?? null,
    name: l.product?.name ?? capitalize(l.ingredient.name),
    quantity: l.buy,
    note: l.buy == null && l.label ? `${l.label} · para ${s.recipe.title}` : `Para ${s.recipe.title}`,
  }));
}

/** Productos del stock que usa la receta (sin repetir), para «La hice». */
export function usedProducts(s: Suggestion): { product: Product; uses: number | null }[] {
  const out = new Map<string, { product: Product; uses: number | null }>();
  for (const l of s.lines) {
    if (!l.product || l.product.status === 'out') continue;
    const prev = out.get(l.product.id);
    const uses = prev?.uses != null || l.uses != null ? (prev?.uses ?? 0) + (l.uses ?? 0) : null;
    out.set(l.product.id, { product: l.product, uses });
  }
  return [...out.values()];
}

export function capitalize(s: string): string {
  return s ? s[0].toLocaleUpperCase('es') + s.slice(1) : s;
}

export const MEAL_LABEL: Record<MealType, string> = {
  almuerzo: 'Almuerzo', cena: 'Cena', vianda: 'Vianda', dulce: 'Dulce',
};
export const CONSTRAINT_LABEL: Record<RecipeConstraint, string> = { sin_horno: 'Sin horno', una_olla: 'Una sola olla' };

export function minutesLabel(min: number | null): string | null {
  if (!min) return null;
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Ingrediente → texto editable («400 g de fideos», «sal a gusto»). parseIngredientLine lo vuelve a leer igual. */
export function ingredientLine(ing: Pick<RecipeIngredient, 'name' | 'quantity' | 'unit' | 'amount' | 'optional'>): string {
  let text: string;
  if (ing.quantity != null && ing.unit) {
    text = ing.unit === 'u' || !kitchenUnit(ing.unit)
      ? `${formatNumber(ing.quantity)} ${ing.name}`
      : `${formatAmount(ing.quantity, ing.unit)} de ${ing.name}`;
  } else if (ing.amount && LOOSE_AMOUNTS.test(`${ing.amount} `)) {
    text = `${ing.amount} de ${ing.name}`;
  } else if (ing.amount) {
    text = `${ing.name} ${ing.amount}`;
  } else {
    text = ing.name;
  }
  return ing.optional ? `${text} (opcional)` : text;
}
