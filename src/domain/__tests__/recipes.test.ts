import { describe, expect, it } from 'vitest';
import {
  amountLabel, assessRecipe, findProduct, formatAmount, ingredientLine, isBasic, isHouseRecipe, kitchenRound, learnPreferences,
  missingForList, nameScore, parseIngredientLine, suggestRecipes, usedProducts,
} from '../recipes';
import { recipeCatalog } from '../recipeCatalog';
import type { Recipe, RecipeFeedback } from '../types';
import { HH, NOW, product } from './fixtures';

const now = Date.parse(NOW);

function recipe(over: Partial<Recipe> & { lines?: string[] } = {}): Recipe {
  const { lines = [], ...rest } = over;
  const id = rest.id ?? 'r1';
  return {
    id, household_id: HH, title: 'Receta', source: 'own', source_url: null, servings: 4, total_minutes: 30,
    meal_types: ['cena'], constraints: [], tags: [], steps: null, image_url: null, created_at: NOW, updated_at: NOW,
    ingredients: lines.map((l, i) => ({
      id: `${id}-${i}`, recipe_id: id, household_id: HH, product_id: null, sort_order: i, ...parseIngredientLine(l)!,
    })),
    ...rest,
  };
}

const fb = (over: Partial<RecipeFeedback>): RecipeFeedback => ({
  id: Math.random().toString(36), household_id: HH, recipe_id: null, catalog_key: null, recipe_title: null,
  tags: [], action: 'dismissed', created_at: NOW, ...over,
});

describe('interpretar ingredientes', () => {
  it.each([
    ['400 g de fideos', { name: 'fideos', quantity: 400, unit: 'g', amount: null, optional: false }],
    ['300g harina', { name: 'harina', quantity: 300, unit: 'g' }],
    ['1 ½ taza de leche', { name: 'leche', quantity: 1.5, unit: 'taza' }],
    ['1/2 cebolla', { name: 'cebolla', quantity: 0.5, unit: 'u' }],
    ['una cebolla', { name: 'cebolla', quantity: 1, unit: 'u' }],
    ['medio kilo de carne picada', { name: 'carne picada', quantity: 0.5, unit: 'kg' }],
    ['2 cdas. de aceite', { name: 'aceite', quantity: 2, unit: 'cda' }],
    ['1 lata de tomate triturado', { name: 'tomate triturado', quantity: 1, unit: 'lata' }],
    ['sal y pimienta a gusto', { name: 'sal y pimienta', quantity: null, unit: null, amount: 'a gusto' }],
    ['una pizca de sal', { name: 'sal', amount: 'una pizca' }],
    ['aceite para freír', { name: 'aceite', amount: 'para freír' }],
    ['queso rallado (opcional)', { name: 'queso rallado', optional: true }],
    ['- 3 huevos', { name: 'huevos', quantity: 3, unit: 'u' }],
    ['dosis de amor', { name: 'dosis de amor', quantity: null }],
  ])('%s', (line, expected) => {
    expect(parseIngredientLine(line)).toMatchObject(expected);
  });

  it('ignora líneas vacías', () => {
    expect(parseIngredientLine('   ')).toBeNull();
  });
});

describe('escalar con redondeos de cocina', () => {
  it('receta para 4 con 400 g de fideos → para 2 son 200 g', () => {
    expect(amountLabel({ name: 'fideos', quantity: 400, unit: 'g', amount: null }, 0.5)).toBe('200 g');
  });

  it('nunca 0,37 latas; ½ cebolla sí, ½ huevo no', () => {
    expect(kitchenRound(0.37, 'lata')).toEqual({ quantity: 1, unit: 'lata' });
    expect(kitchenRound(0.5, 'u', 'cebolla')).toEqual({ quantity: 0.5, unit: 'u' });
    expect(kitchenRound(2.5, 'u', 'huevos')).toEqual({ quantity: 3, unit: 'u' });
    expect(kitchenRound(1.25, 'diente')).toEqual({ quantity: 1, unit: 'diente' });
  });

  it('gramos redondos y kilos a partir de 1000', () => {
    expect(kitchenRound(333.3, 'g').quantity).toBe(325);
    expect(kitchenRound(1.5, 'kg')).toEqual({ quantity: 1500, unit: 'g' });
    expect(formatAmount(1500, 'g')).toBe('1,5 kg');
    expect(formatAmount(1000, 'ml')).toBe('1 l');
  });

  it('fracciones y plurales', () => {
    expect(amountLabel({ name: 'leche', quantity: 1.5, unit: 'taza', amount: null })).toBe('1 ½ tazas');
    expect(amountLabel({ name: 'leche', quantity: 0.5, unit: 'taza', amount: null })).toBe('½ taza');
    expect(amountLabel({ name: 'cebolla', quantity: 1, unit: 'u', amount: null }, 0.5)).toBe('½');
    expect(amountLabel({ name: 'sal', quantity: null, unit: null, amount: 'a gusto' }, 3)).toBe('a gusto');
  });
});

describe('cruce con el stock', () => {
  it('compara nombres sin importar plurales ni variedades', () => {
    expect(nameScore('tomates', 'Tomate')).toBe(3);
    expect(nameScore('aceite', 'Aceite de girasol')).toBe(2);
    expect(nameScore('tomate triturado', 'Tomate')).toBe(1);
    expect(nameScore('leche', 'Dulce de leche')).toBe(0);
    expect(nameScore('papas', 'Papa')).toBe(3);
  });

  it('elige el producto que hay antes que el que no hay', () => {
    const a = product({ id: 'a', name: 'Fideos tirabuzón', status: 'out' });
    const b = product({ id: 'b', name: 'Fideos moñito', status: 'ok' });
    expect(findProduct({ name: 'fideos', product_id: null }, [a, b])?.id).toBe('b');
  });

  it('sal, agua y condimentos se dan por hechos', () => {
    expect(isBasic('sal')).toBe(true);
    expect(isBasic('sal y pimienta')).toBe(true);
    expect(isBasic('salsa de soja')).toBe(false);
  });

  it('con conteo: 3 huevos alcanzan para 2, no para 6', () => {
    const huevos = product({ id: 'h', name: 'Huevos', track_quantity: true, quantity: 3, unit: 'unidades' });
    const r = recipe({ servings: 2, lines: ['2 huevos'] });
    expect(assessRecipe(r, [huevos], 2).missing).toHaveLength(0);
    const s = assessRecipe(r, [huevos], 6);
    expect(s.missing).toHaveLength(1);
    expect(s.missing[0].buy).toBe(3);
    expect(missingForList(s)[0]).toMatchObject({ productId: 'h', quantity: 3 });
  });

  it('las personas escalan y suman lo que se usa', () => {
    const huevos = product({ id: 'h', name: 'Huevos', track_quantity: true, quantity: 12, unit: 'unidades' });
    const s = assessRecipe(recipe({ servings: 2, lines: ['2 huevos'] }), [huevos], 4);
    expect(s.lines[0].label).toBe('4');
    expect(usedProducts(s)).toEqual([{ product: huevos, uses: 4 }]);
  });
});

describe('sugerencias', () => {
  const products = [
    product({ id: 'f', name: 'Fideos' }),
    product({ id: 't', name: 'Tomate triturado', expires_on: '2026-10-17' }),
    product({ id: 'c', name: 'Cebolla', status: 'out' }),
    product({ id: 'q', name: 'Queso rallado' }),
    product({ id: 'm', name: 'Manteca', status: 'low' }),
  ];
  const tuco = recipe({ id: 'tuco', title: 'Fideos con tuco', lines: ['400 g de fideos', '1 lata de tomate triturado', '1 cebolla', 'sal'] });
  const manteca = recipe({ id: 'manteca', title: 'Fideos con manteca', lines: ['400 g de fideos', '50 g de manteca', 'queso rallado'] });
  const pizza = recipe({ id: 'pizza', title: 'Pizza', total_minutes: 70, lines: ['harina', 'levadura', 'muzzarella'] });
  const flan = recipe({ id: 'flan', title: 'Flan', lines: ['huevos', 'leche', 'azúcar', 'dulce de leche', 'vainilla'] });

  it('arma los grupos y no repite recetas', () => {
    const g = suggestRecipes([tuco, manteca, pizza, flan], products, { servings: 2, now });
    expect(g.expiring.map((s) => s.recipe.id)).toEqual(['tuco']); // usa el tomate que vence y falta solo la cebolla
    expect(g.ready.map((s) => s.recipe.id)).toEqual(['manteca']);
    expect(g.more.map((s) => s.recipe.id)).toEqual(['pizza']);
    expect(g.oneMissing).toEqual([]); // el flan (le faltan 5) no se propone
  });

  it('filtra por tiempo y tipo', () => {
    const g = suggestRecipes([tuco, manteca, pizza], products, { servings: 2, now, filters: { quick: true } });
    expect([...g.expiring, ...g.ready, ...g.oneMissing, ...g.more].map((s) => s.recipe.id)).not.toContain('pizza');
    const dulce = suggestRecipes([tuco, manteca], products, { servings: 2, now, filters: { meal: 'dulce' } });
    expect(dulce.ready).toEqual([]);
  });

  it('«No me tienta» la saca un tiempo; descartar siempre un tipo deja de proponerlo', () => {
    const hidden = suggestRecipes([manteca], products, { servings: 2, now, feedback: [fb({ recipe_id: 'manteca' })] });
    expect(hidden.ready).toEqual([]);
    const old = fb({ recipe_id: 'manteca', created_at: '2026-08-01T00:00:00.000Z' });
    expect(suggestRecipes([manteca], products, { servings: 2, now, feedback: [old] }).ready).toHaveLength(1);

    const pasta = ['a', 'b', 'c'].map((k) => fb({ catalog_key: `catalog:${k}`, tags: ['pasta'], created_at: '2026-09-20T00:00:00.000Z' }));
    const catalogPasta = { ...manteca, id: 'catalog:x', source: 'catalog' as const, tags: ['pasta'] };
    expect(learnPreferences(pasta, now).blockedTags.has('pasta')).toBe(true);
    expect(suggestRecipes([catalogPasta], products, { servings: 2, now, feedback: pasta }).ready).toEqual([]);
    // las recetas propias se siguen mostrando
    expect(suggestRecipes([{ ...manteca, tags: ['pasta'] }], products, { servings: 2, now, feedback: pasta }).ready).toHaveLength(1);
  });

  it('las recetas propias van antes que las del catálogo', () => {
    const own = { ...manteca, id: 'own', title: 'Zeta propia' };
    const cat = { ...manteca, id: 'catalog:m', source: 'catalog' as const, title: 'Alfa del catálogo' };
    const g = suggestRecipes([cat, own], products, { servings: 2, now });
    expect(g.ready.map((s) => s.recipe.id)).toEqual(['own', 'catalog:m']);
  });
});

describe('catálogo', () => {
  it('todas las recetas se interpretan bien', () => {
    expect(recipeCatalog().length).toBeGreaterThanOrEqual(25);
    for (const r of recipeCatalog()) {
      expect(r.ingredients.length).toBeGreaterThan(0);
      for (const i of r.ingredients) {
        expect(i.name, `${r.title}: ${i.name}`).not.toMatch(/^\d|^de /);
        expect(i.quantity != null || i.amount != null || i.optional || isBasic(i.name), `${r.title}: ${i.name}`).toBe(true);
      }
    }
  });
});

describe('editar recetas como texto', () => {
  it('cada ingrediente del catálogo vuelve a leerse igual', () => {
    for (const r of recipeCatalog()) {
      for (const i of r.ingredients) {
        const back = parseIngredientLine(ingredientLine(i));
        expect(back, ingredientLine(i)).toMatchObject({
          name: i.name, quantity: i.unit === 'kg' || i.unit === 'l' ? expect.any(Number) : i.quantity,
          amount: i.amount, optional: i.optional,
        });
      }
    }
  });

  it('kilos y litros se escriben como en el súper', () => {
    expect(ingredientLine({ name: 'papas', quantity: 1, unit: 'kg', amount: null, optional: false })).toBe('1 kg de papas');
    expect(ingredientLine({ name: 'sal', quantity: null, unit: null, amount: 'a gusto', optional: false })).toBe('sal a gusto');
    expect(ingredientLine({ name: 'sal', quantity: null, unit: null, amount: 'una pizca', optional: false })).toBe('una pizca de sal');
  });
});

describe('para aprovechar lo que vence', () => {
  it('muestra pocas y las demás quedan en su grupo', () => {
    const queso = product({ id: 'q', name: 'Queso', expires_on: '2026-10-16' });
    const many = Array.from({ length: 7 }, (_, i) => recipe({ id: `r${i}`, title: `R${i}`, lines: ['100 g de queso'] }));
    const g = suggestRecipes(many, [queso], { servings: 2, now });
    expect(g.expiring).toHaveLength(4);
    expect(g.ready).toHaveLength(3);
  });
});

describe('pensar de nuevo', () => {
  it('cambia el orden entre recetas parecidas, siempre igual para la misma vuelta', () => {
    const products = [product({ id: 'f', name: 'Fideos' })];
    const many = Array.from({ length: 8 }, (_, i) => ({ ...recipe({ id: `catalog:r${i}`, title: `R${i}`, lines: ['fideos'] }), source: 'catalog' as const }));
    const order = (variety?: number) => suggestRecipes(many, products, { servings: 2, now, variety }).ready.map((s) => s.recipe.id);
    expect(order(1)).toEqual(order(1));
    expect(new Set([order(1).join(), order(2).join(), order(3).join()]).size).toBeGreaterThan(1);
    expect(order(1)).toHaveLength(8);
  });

  it('las ideas sin guardar no son recetas de la casa', () => {
    expect(isHouseRecipe({ id: 'ai:123', source: 'ai' })).toBe(false);
    expect(isHouseRecipe({ id: 'r1', source: 'ai' })).toBe(true);
    expect(isHouseRecipe({ id: 'catalog:x', source: 'catalog' })).toBe(false);
  });
});
