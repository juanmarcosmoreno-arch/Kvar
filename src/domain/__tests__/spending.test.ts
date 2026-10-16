import { describe, expect, it } from 'vitest';
import { cheaperAt, priceOf, receiptKey, spendingStats, stableLineId, storeLabel, storePricesOf, whereCheaper, type PurchaseLine } from '../spending';
import { product } from './fixtures';

const now = new Date(2026, 9, 15, 12);
const at = (mo: number, d: number) => new Date(2026, mo - 1, d, 11).toISOString();
const line = (over: Partial<PurchaseLine>): PurchaseLine => ({
  id: Math.random().toString(36), household_id: 'hh-1', product_id: 'azucar', name: 'Azúcar 1 kg', quantity: 1,
  unit_price: 60, total: 60, store: 'Macromercado', bought_at: at(10, 1), receipt_key: 'r1', ...over,
});

describe('gastos', () => {
  const products = [
    product({ id: 'azucar', name: 'Azúcar', category_id: 'almacen' }),
    product({ id: 'leche', name: 'Leche', category_id: 'lacteos' }),
  ];
  const lines = [
    line({ bought_at: at(8, 3), receipt_key: 'a', unit_price: 50, total: 100, quantity: 2 }),
    line({ product_id: 'leche', name: 'Leche', bought_at: at(8, 3), receipt_key: 'a', unit_price: 40, total: 200, quantity: 5 }),
    line({ bought_at: at(10, 2), receipt_key: 'b', unit_price: 60, total: 60 }),
    line({ product_id: null, name: 'Bolsa', bought_at: at(10, 2), receipt_key: 'b', unit_price: 5, total: 5 }),
  ];
  const s = spendingStats(lines, products, { now, months: 3 });

  it('total por mes, por compra y por categoría', () => {
    expect(s.months.map((m) => m.total)).toEqual([300, 0, 65]);
    expect(s.total).toBe(365);
    expect(s.trips).toBe(2);
    expect(s.perTrip).toBe(182.5);
    expect(s.byCategory[0]).toEqual({ categoryId: 'lacteos', total: 200 });
    expect(s.byProduct.map((p) => p.name)).toEqual(['Leche', 'Azúcar', 'Bolsa']);
  });

  it('lo que cambió de precio', () => {
    expect(s.priceChanges).toEqual([{ productId: 'azucar', name: 'Azúcar', first: 50, last: 60, change: expect.closeTo(0.2, 5) }]);
    const p = priceOf(lines, 'azucar', now)!;
    expect(p.last).toBe(60);
    expect(p.change).toBeCloseTo(0.2, 5);
    expect(priceOf(lines, 'nada', now)).toBeNull();
  });

  it('el mismo ticket da los mismos ids (no se cuenta dos veces)', () => {
    const k = receiptKey('Macro', '2026-10-02', 65, 2);
    expect(stableLineId('hh', k, 0)).toBe(stableLineId('hh', k, 0));
    expect(stableLineId('hh', k, 0)).not.toBe(stableLineId('hh', k, 1));
    expect(stableLineId('hh', k, 0)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('¿dónde conviene?', () => {
  const products = [
    product({ id: 'aceite', name: 'Aceite' }),
    product({ id: 'yerba', name: 'Yerba' }),
    product({ id: 'arroz', name: 'Arroz' }),
  ];
  const lines = [
    line({ product_id: 'aceite', store: 'macromercado', unit_price: 100, bought_at: at(9, 1) }),
    line({ product_id: 'aceite', store: 'Tienda Inglesa', unit_price: 120, bought_at: at(9, 20) }),
    // El último precio es el que vale
    line({ product_id: 'aceite', store: 'tienda-inglesa', unit_price: 125, bought_at: at(10, 5) }),
    line({ product_id: 'yerba', store: 'macromercado', unit_price: 200, bought_at: at(9, 1) }),
    line({ product_id: 'yerba', store: 'Disco', unit_price: 180, bought_at: at(9, 8) }),
    line({ product_id: 'yerba', store: 'tienda-inglesa', unit_price: 202, bought_at: at(9, 20) }),
    // Solo en un súper, o sin súper: no se compara
    line({ product_id: 'arroz', store: 'disco', unit_price: 50, bought_at: at(9, 8) }),
    line({ product_id: 'arroz', store: null, unit_price: 40, bought_at: at(9, 9) }),
    // Hace más de 6 meses: no cuenta
    line({ product_id: 'arroz', store: 'macromercado', unit_price: 10, bought_at: new Date(2026, 0, 2).toISOString() }),
  ];

  it('qué súper sale más barato en promedio y en qué conviene cada uno', () => {
    const w = whereCheaper(lines, products, now);
    expect(w.stores.map((s) => s.store)).toEqual(['disco', 'macromercado', 'tienda-inglesa']);
    expect(w.stores[0]).toMatchObject({ overCheapest: 0, cheapest: 1, compared: 1 });
    expect(w.deals[0].productId).toBe('aceite');
    expect(w.deals[0].saving).toBeCloseTo(0.2, 5);
    expect(w.deals[0].best.store).toBe('macromercado');
    expect(storeLabel('tienda-inglesa')).toBe('Tienda Inglesa');
    expect(storeLabel('super-del-barrio')).toBe('Super Del Barrio');
  });

  it('en la ficha y en la lista', () => {
    expect(storePricesOf(lines, 'aceite', now).map((p) => [p.store, p.price])).toEqual([['macromercado', 100], ['tienda-inglesa', 125]]);
    const at2 = cheaperAt(lines, now);
    expect(at2.get('aceite')?.store).toBe('macromercado');
    expect(at2.get('aceite')?.saving).toBeCloseTo(0.2, 5);
    // Yerba: Disco 180 contra Macro 200 → 10 %
    expect(at2.get('yerba')?.store).toBe('disco');
    expect(at2.has('arroz')).toBe(false);
  });
});
