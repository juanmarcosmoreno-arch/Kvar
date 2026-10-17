/** Lo que comparten las pantallas del centro de precios: precios de hoy, tickets, descuentos de hoy y canastas. */
import { useMemo } from 'react';
import { basketByStore, offers, usualBasket, type Basket, type CompareOptions } from '../domain/prices';
import { recipeCatalog } from '../domain/recipeCatalog';
import { recipeCost } from '../domain/recipeCost';
import { assessRecipe } from '../domain/recipes';
import { allItems, matchItems } from '../domain/sipc';
import type { Recipe, Snapshot } from '../domain/types';
import { useIngredientPrices } from './recipePrices';
import { usePriceData, type PriceData } from './priceData';
import { alertHits, usePriceAlerts } from './priceAlerts';
import { useSipc, type SipcState } from './sipc';
import type { AlertHit, PriceAlert, SplitItem } from '../domain/priceTools';

export interface PriceCenter {
  data: PriceData;
  sipc: SipcState;
  /** Descuentos de hoy */
  opts: CompareOptions;
  /** Tu canasta con los precios de hoy (precios.uy) */
  todayBasket: Basket;
  /** Tu canasta con lo que pagaste (tickets) */
  ticketBasket: Basket;
  alerts: PriceAlert[];
  hits: AlertHit[];
}

export function usePriceCenter(view: Snapshot): PriceCenter {
  const data = usePriceData(view.household.id);
  const sipc = useSipc(view.products);
  const alerts = usePriceAlerts();
  const today = new Date().getDay();
  return useMemo(() => {
    const opts: CompareOptions = { discounts: data.discounts, when: data.discounts.length ? today : 'none' };
    // Lo que comprás seguido (según los tickets) con su cantidad; si no hay tickets, uno de cada uno
    const usual = usualBasket(data.lines);
    const own = new Map(sipc.matches.map((x) => [x.product.id, usual.get(x.product.id) ?? 1]));
    return {
      data,
      sipc,
      opts,
      todayBasket: basketByStore(sipc.lines, { ...opts, basket: own }, view.products),
      ticketBasket: basketByStore(data.lines, opts, view.products),
      alerts,
      hits: alertHits(alerts, sipc.data, opts.discounts),
    };
  }, [data, sipc, alerts, view.products, today]);
}

/** Lo de la lista (sin tachar) con su precio de hoy en cada súper, ya con los descuentos */
export function listSplitItems(view: Snapshot, sipc: SipcState, opts: CompareOptions): { items: SplitItem[]; total: number } {
  const pending = view.list.filter((i) => !i.checked_at);
  if (!sipc.data) return { items: [], total: pending.length };
  const all = allItems(sipc.data);
  const byKey = new Map(all.map((x) => [x.key, x]));
  const names = all.map((x) => x.name);
  const keyOfName = new Map(all.map((x) => [x.name, x.key]));
  const products = new Map(view.products.map((p) => [p.id, p]));
  const items: SplitItem[] = [];
  for (const i of pending) {
    const product = i.product_id ? products.get(i.product_id) : undefined;
    const name = product?.name ?? i.name ?? '';
    const key = (product && sipc.matches.find((x) => x.product.id === product.id)?.item) ?? keyOfName.get(matchItems(name, names)[0] ?? '');
    const item = key ? byKey.get(key) : undefined;
    if (!item) continue;
    const prices: Record<string, number> = {};
    for (const o of offers(item.prices, opts.discounts, opts.when, product)) prices[o.store] = o.effective;
    items.push({ id: i.id, name, prices, quantity: i.quantity && i.quantity > 0 && i.quantity < 20 ? i.quantity : 1 });
  }
  return { items, total: pending.length };
}

export interface RecipePrice {
  recipe: Recipe;
  total: number;
  perServing: number;
  missing: string[];
  /** Todos los ingredientes tienen precio (si no, en realidad sale más) */
  complete: boolean;
}

/**
 * Cada receta (propias y del recetario) con lo que sale por porción; solo las que tienen precio para casi todo.
 * Primero las que tienen precio para todo (las otras parecen más baratas de lo que son).
 */
export function useRecipePrices(view: Snapshot): RecipePrice[] {
  const priceFor = useIngredientPrices(view);
  return useMemo(() => {
    const out: RecipePrice[] = [];
    for (const recipe of [...(view.recipes ?? []), ...recipeCatalog()]) {
      const servings = recipe.servings ?? 2;
      const s = assessRecipe(recipe, view.products, servings);
      const cost = recipeCost(s.lines, 1, priceFor);
      if (cost.priced < 2 || cost.missing.length > cost.priced / 2) continue;
      out.push({ recipe, total: cost.total, perServing: cost.total / servings, missing: cost.missing, complete: cost.missing.length === 0 });
    }
    return out.sort((a, b) => Number(b.complete) - Number(a.complete) || a.perServing - b.perServing);
  }, [view.recipes, view.products, priceFor]);
}
