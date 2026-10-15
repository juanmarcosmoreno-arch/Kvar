import { describe, expect, it } from 'vitest';
import { priceOf, receiptKey, spendingStats, stableLineId, type PurchaseLine } from '../spending';
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
