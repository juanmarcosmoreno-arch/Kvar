/**
 * Menú de la semana: «Armame el menú de lunes a viernes» con lo que hay. Primero lo que vence y lo que no
 * necesita compras; sin repetir recetas ni el mismo tipo de plato dos días seguidos. Lo que falta de todo
 * el menú va junto a la lista (las cantidades de cada día se suman).
 */
import { assessRecipe, isHouseRecipe, missingForList, suggestRecipes, type Suggestion } from './recipes';
import type { MealType, Product, Recipe, RecipeFeedback } from './types';

export interface PlanEntry {
  /** YYYY-MM-DD */
  day: string;
  meal: MealType;
  /** id de la receta (uuid de la casa o «catalog:…») */
  recipe_key: string;
  title: string;
  servings: number;
}

export interface MealPlan {
  id: string;
  household_id: string;
  /** Lunes de la semana, YYYY-MM-DD */
  week_start: string;
  entries: PlanEntry[];
}

/** Fecha local → «2026-10-15» */
export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function mondayOf(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

/** Los días que quedan de lunes a viernes; si ya es fin de semana, los de la semana que viene. */
export function defaultDays(now: Date): Date[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = (today.getDay() + 6) % 7; // 0 = lunes
  const start = dow >= 5 ? new Date(today.getTime() + (7 - dow) * 86_400_000) : today;
  const from = (start.getDay() + 6) % 7;
  return Array.from({ length: 5 - from }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

/** Recetas candidatas, de la mejor a la peor, para ese tipo de comida. */
function candidates(
  recipes: Recipe[],
  products: Product[],
  opts: { meal: MealType; servings: number; feedback?: RecipeFeedback[]; now?: number },
): Suggestion[] {
  const g = suggestRecipes(recipes, products, { servings: opts.servings, feedback: opts.feedback, now: opts.now });
  const fits = (s: Suggestion) => !s.recipe.meal_types.length || s.recipe.meal_types.includes(opts.meal);
  return [...g.expiring, ...g.ready, ...g.oneMissing, ...g.more].filter(fits);
}

export function planMeals(
  recipes: Recipe[],
  products: Product[],
  opts: { days: Date[]; meal: MealType; servings: number; feedback?: RecipeFeedback[]; now?: number },
): PlanEntry[] {
  const list = candidates(recipes, products, opts);
  const used = new Set<string>();
  const entries: PlanEntry[] = [];
  let prevTag: string | null = null;
  for (const day of opts.days) {
    const pick =
      list.find((s) => !used.has(s.recipe.id) && (s.recipe.tags[0] ?? null) !== prevTag) ??
      list.find((s) => !used.has(s.recipe.id));
    if (!pick) break;
    used.add(pick.recipe.id);
    prevTag = pick.recipe.tags[0] ?? null;
    entries.push({ day: isoDay(day), meal: opts.meal, recipe_key: pick.recipe.id, title: pick.recipe.title, servings: opts.servings });
  }
  return entries;
}

/** Otra receta para ese día (la siguiente que no está en el menú). */
export function swapEntry(
  plan: PlanEntry[],
  index: number,
  recipes: Recipe[],
  products: Product[],
  opts: { feedback?: RecipeFeedback[]; now?: number },
): PlanEntry[] {
  const entry = plan[index];
  const list = candidates(recipes, products, { meal: entry.meal, servings: entry.servings, ...opts });
  const inPlan = new Set(plan.map((e) => e.recipe_key));
  const at = list.findIndex((s) => s.recipe.id === entry.recipe_key);
  const next = [...list.slice(at + 1), ...list.slice(0, Math.max(0, at))].find((s) => !inPlan.has(s.recipe.id));
  if (!next) return plan;
  return plan.map((e, i) => (i === index ? { ...e, recipe_key: next.recipe.id, title: next.recipe.title } : e));
}

/** Todo lo que falta para el menú, junto: lo mismo de varios días va una sola vez (con las cantidades sumadas). */
export function missingForPlan(
  plan: PlanEntry[],
  recipes: Recipe[],
  products: Product[],
): { productId: string | null; name: string; quantity: number | null; days: string[] }[] {
  const byKey = new Map(recipes.map((r) => [r.id, r]));
  const out = new Map<string, { productId: string | null; name: string; quantity: number | null; days: string[] }>();
  for (const e of plan) {
    const recipe = byKey.get(e.recipe_key);
    if (!recipe) continue;
    const s = assessRecipe(recipe, products, e.servings);
    for (const m of missingForList(s)) {
      const key = m.productId ?? `name:${m.name.toLowerCase()}`;
      const prev = out.get(key);
      if (prev) {
        prev.quantity = prev.quantity != null && m.quantity != null ? prev.quantity + m.quantity : prev.quantity ?? m.quantity;
        if (!prev.days.includes(e.day)) prev.days.push(e.day);
      } else {
        out.set(key, { productId: m.productId, name: m.name, quantity: m.quantity, days: [e.day] });
      }
    }
  }
  return [...out.values()];
}

export const isHouseKey = (key: string) => isHouseRecipe({ id: key, source: 'own' });
