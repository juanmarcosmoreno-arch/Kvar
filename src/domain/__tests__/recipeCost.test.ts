import { describe, expect, it } from 'vitest';
import { ingredientCost, recipeCost, sizeOfSipc, sizeOfTicket, ticketRef } from '../recipeCost';
import type { IngredientLine } from '../recipes';
import type { RecipeIngredient } from '../types';

const ing = (name: string, quantity: number | null, unit: string | null, over: Partial<RecipeIngredient> = {}): RecipeIngredient => ({
  id: name, recipe_id: 'r', household_id: 'h', product_id: null, name, quantity, unit, amount: null, optional: false, sort_order: 0, ...over,
});
const line = (i: RecipeIngredient): IngredientLine => ({ ingredient: i, product: null, availability: 'missing', label: '', uses: null, buy: null });

describe('costo de una receta', () => {
  it('tamaño del envase', () => {
    expect(sizeOfSipc('Arroz blanco - Vidarroz, 1.0')).toEqual({ grams: 1000, count: 1 });
    expect(sizeOfSipc('Aceite de girasol - Óptimo, 900.0')).toEqual({ grams: 900, count: null });
    expect(sizeOfSipc('Huevos colorados El Jefe, 6.0')).toEqual({ grams: 6000, count: 6 });
    expect(sizeOfTicket('AZUCAR BELLA UNION 1 KG')).toEqual({ grams: 1000, count: null });
    expect(sizeOfTicket('LECHE CLADY ULTRA ENTERA 1LT X 4')).toEqual({ grams: 4000, count: 4 });
  });

  it('la parte del envase que usa cada ingrediente', () => {
    // 400 g de un paquete de 1 kg a $ 50 → $ 20
    expect(ingredientCost('arroz', 400, 'g', { price: 50, grams: 1000, count: 1 })).toBeCloseTo(20, 5);
    // 2 cucharadas de aceite (30 ml) de 900 ml a $ 111
    expect(ingredientCost('aceite', 2, 'cda', { price: 111, grams: 900, count: null })).toBeCloseTo(3.7, 5);
    // 3 huevos de una caja de 6 a $ 180
    expect(ingredientCost('huevos', 3, 'u', { price: 180, grams: 6000, count: 6 })).toBeCloseTo(90, 5);
    // 2 tomates a $ 90 el kilo (~150 g cada uno)
    expect(ingredientCost('tomates', 2, null, { price: 90, grams: 1000, count: 1 })).toBeCloseTo(27, 5);
    // 1 lata
    expect(ingredientCost('tomate triturado', 1, 'lata', { price: 60, grams: null, count: null })).toBe(60);
    // Sin tamaño no se puede
    expect(ingredientCost('harina', 200, 'g', { price: 40, grams: null, count: null })).toBeNull();
  });

  it('suma, deja afuera lo «a gusto» y avisa lo que no tiene precio', () => {
    const lines = [line(ing('Arroz', 200, 'g')), line(ing('Sal', null, null, { amount: 'a gusto' })), line(ing('Azafrán', 1, 'sobre'))];
    const cost = recipeCost(lines, 2, (l) => (l.ingredient.name === 'Arroz' ? { price: 50, grams: 1000, count: 1 } : null));
    expect(cost.total).toBeCloseTo(20, 5);
    expect(cost.priced).toBe(1);
    expect(cost.missing).toEqual(['Azafrán']);
  });

  it('el último precio de los tickets', () => {
    const l = (bought_at: string, unit_price: number) => ({
      id: bought_at, household_id: 'h', product_id: 'p', name: 'ARROZ SAMAN 1 KG', quantity: 1, unit_price, total: unit_price, store: 'Disco', bought_at, receipt_key: null,
    });
    expect(ticketRef([l('2026-09-01', 60), l('2026-10-01', 70)], 'p')).toEqual({ price: 70, grams: 1000, count: null });
    expect(ticketRef([], 'p')).toBeNull();
  });
});
