import { describe, expect, it } from 'vitest';
import { aislePosition, learnAisleOrder } from '../aisleOrder';
import type { StockEvent } from '../stats';
import { product } from './fixtures';

const now = new Date(2026, 9, 15, 12).getTime();
const DAY = 86_400_000;
const tick = (id: string, t: number, who = 'juan', source: string | undefined = 'shopping'): StockEvent => ({
  product_id: id, type: 'purchased', source, user_id: who, from_status: 'out', to_status: 'ok',
  from_quantity: null, to_quantity: null, at: new Date(t).toISOString(),
});
/** Una compra: los productos en ese orden, uno cada 2 minutos */
const trip = (ids: string[], start: number, who?: string) => ids.map((id, i) => tick(id, start + i * 120_000, who));

const products = [
  product({ id: 'manzana', category_id: 'verdu' }),
  product({ id: 'pan', category_id: 'panaderia' }),
  product({ id: 'yerba', category_id: 'almacen' }),
  product({ id: 'leche', category_id: 'lacteos' }),
  product({ id: 'manteca', category_id: 'lacteos' }),
];

describe('orden por pasillo', () => {
  it('aprende el recorrido de las compras', () => {
    const events = [
      ...trip(['manzana', 'pan', 'yerba', 'leche'], now - 10 * DAY),
      ...trip(['manzana', 'yerba', 'leche'], now - 3 * DAY),
    ];
    const order = learnAisleOrder(events, products, now);
    expect(order.trips).toBe(2);
    const pos = (id: string) => order.product.get(id)!;
    expect(pos('manzana')).toBeLessThan(pos('pan'));
    expect(pos('pan')).toBeLessThan(pos('yerba'));
    expect(pos('yerba')).toBeLessThan(pos('leche'));
    // Manteca nunca se compró desde la lista: va con su categoría (lácteos, al final)
    expect(aislePosition(order, products[4])).toBe(pos('leche'));
  });

  it('lo que se tacha todo junto al llegar a casa no cuenta', () => {
    const t = now - DAY;
    const events = ['manzana', 'pan', 'yerba', 'leche'].map((id, i) => tick(id, t + i * 2_000));
    expect(learnAisleOrder(events, products, now).trips).toBe(0);
  });

  it('separa las compras por persona y por tiempo, e ignora los tickets', () => {
    const events = [
      ...trip(['manzana', 'pan', 'yerba'], now - 5 * DAY, 'juan'),
      ...trip(['leche', 'manteca', 'yerba'], now - 5 * DAY + 60_000, 'maria'),
      ...trip(['pan', 'yerba', 'leche'], now - 2 * DAY, 'juan'),
      tick('manteca', now - DAY, 'juan', 'receipt'),
    ];
    const order = learnAisleOrder(events, products, now);
    expect(order.trips).toBe(3);
  });

  it('las compras recientes pesan más (si cambió el súper)', () => {
    const events = [
      ...trip(['leche', 'pan', 'manzana'], now - 200 * DAY),
      ...trip(['manzana', 'pan', 'leche'], now - 2 * DAY),
    ];
    const order = learnAisleOrder(events, products, now);
    expect(order.product.get('manzana')!).toBeLessThan(order.product.get('leche')!);
  });
});
