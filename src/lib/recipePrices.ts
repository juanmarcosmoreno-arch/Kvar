/** Precio de cada ingrediente de una receta: el de hoy (precios.uy) del producto o del ingrediente, o el último ticket */
import { useMemo } from 'react';
import { sizeOfSipc, ticketRef, type PriceRef } from '../domain/recipeCost';
import type { IngredientLine } from '../domain/recipes';
import { allItems, matchItems } from '../domain/sipc';
import type { Snapshot } from '../domain/types';
import { useSipc } from './sipc';
import { usePurchases } from './stats';

export type IngredientPrice = (line: IngredientLine) => PriceRef | null;

export function useIngredientPrices(view: Snapshot): IngredientPrice {
  const sipc = useSipc(view.products);
  const purchases = usePurchases(view.household.id);
  return useMemo(() => {
    const items = sipc.data ? allItems(sipc.data) : [];
    const byKey = new Map(items.map((x) => [x.key, x]));
    const names = items.map((x) => x.name);
    const keyOf = new Map(items.map((x) => [x.name, x.key]));
    const fromItem = (key: string | undefined): PriceRef | null => {
      const item = key ? byKey.get(key) : undefined;
      if (!item?.prices.length) return null;
      return { price: Math.min(...item.prices.map((p) => p.price)), ...sizeOfSipc(item.name) };
    };
    const ticketLines = purchases.status === 'ready' ? purchases.lines : [];
    // El mismo ingrediente aparece en muchas recetas
    const byName = new Map<string, string | undefined>();
    const itemOf = (name: string) => {
      if (!byName.has(name)) byName.set(name, keyOf.get(matchItems(name, names)[0] ?? ''));
      return byName.get(name);
    };
    return (line: IngredientLine): PriceRef | null => {
      if (line.product) {
        const match = sipc.matches.find((x) => x.product.id === line.product!.id);
        const ref = fromItem(match?.item) ?? ticketRef(ticketLines, line.product.id);
        if (ref) return ref;
      }
      return fromItem(itemOf(line.ingredient.name));
    };
  }, [sipc, purchases]);
}
