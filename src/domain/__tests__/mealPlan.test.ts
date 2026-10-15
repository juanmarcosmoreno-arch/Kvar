import { describe, expect, it } from 'vitest';
import { defaultDays, isoDay, missingForPlan, mondayOf, planMeals, swapEntry } from '../mealPlan';
import { parseIngredientLine } from '../recipes';
import type { Recipe } from '../types';
import { HH, NOW, product } from './fixtures';

function recipe(id: string, tags: string[], lines: string[]): Recipe {
  return {
    id, household_id: HH, title: id, source: 'catalog', source_url: null, servings: 2, total_minutes: 20,
    meal_types: ['cena'], constraints: [], tags, steps: null, image_url: null, created_at: NOW, updated_at: NOW,
    ingredients: lines.map((l, i) => ({ id: `${id}-${i}`, recipe_id: id, household_id: HH, product_id: null, sort_order: i, ...parseIngredientLine(l)! })),
  };
}

describe('días', () => {
  it('de hoy al viernes; el fin de semana, la semana que viene', () => {
    expect(defaultDays(new Date(2026, 9, 14)).map(isoDay)).toEqual(['2026-10-14', '2026-10-15', '2026-10-16']); // miércoles
    expect(defaultDays(new Date(2026, 9, 17)).map(isoDay)[0]).toBe('2026-10-19'); // sábado → lunes
    expect(isoDay(mondayOf(new Date(2026, 9, 15)))).toBe('2026-10-12');
  });
});

describe('menú', () => {
  const products = [product({ id: 'f', name: 'Fideos' }), product({ id: 'a', name: 'Arroz' }), product({ id: 'h', name: 'Huevos', track_quantity: true, quantity: 2, unit: 'unidades' })];
  const recipes = [
    recipe('pasta1', ['pasta'], ['200 g de fideos']),
    recipe('pasta2', ['pasta'], ['200 g de fideos', 'manteca']),
    recipe('arroz', ['arroz'], ['1 taza de arroz']),
    recipe('tortilla', ['huevo'], ['3 huevos', 'papas']),
  ];
  const days = [new Date(2026, 9, 12), new Date(2026, 9, 13), new Date(2026, 9, 14)];

  it('no repite receta ni tipo de plato dos días seguidos', () => {
    const plan = planMeals(recipes, products, { days, meal: 'cena', servings: 2 });
    expect(plan).toHaveLength(3);
    expect(new Set(plan.map((e) => e.recipe_key)).size).toBe(3);
    for (let i = 1; i < plan.length; i++) {
      const tag = (k: string) => recipes.find((r) => r.id === k)!.tags[0];
      expect(tag(plan[i].recipe_key)).not.toBe(tag(plan[i - 1].recipe_key));
    }
  });

  it('cambiar un día trae otra que no está en el menú', () => {
    const plan = planMeals(recipes, products, { days: days.slice(0, 2), meal: 'cena', servings: 2 });
    const swapped = swapEntry(plan, 0, recipes, products, {});
    expect(swapped[0].recipe_key).not.toBe(plan[0].recipe_key);
    expect(swapped[0].recipe_key).not.toBe(plan[1].recipe_key);
  });

  it('lo que falta se suma entre días', () => {
    const plan = [
      { day: '2026-10-12', meal: 'cena' as const, recipe_key: 'tortilla', title: 't', servings: 2 },
      { day: '2026-10-13', meal: 'cena' as const, recipe_key: 'tortilla', title: 't', servings: 4 },
    ];
    const missing = missingForPlan(plan, recipes, products);
    const huevos = missing.find((x) => x.productId === 'h')!;
    expect(huevos.quantity).toBe(1 + 4); // 3 − 2 que hay, y 6 − 2
    expect(missing.find((x) => x.name.toLowerCase() === 'papas')!.days).toEqual(['2026-10-12', '2026-10-13']);
  });
});
