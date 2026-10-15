import { describe, expect, it } from 'vitest';
import { classify, householdStats, lastMonths, niceTicks, productStats, type StockEvent } from '../stats';
import { product } from './fixtures';

const now = new Date(2026, 9, 15, 12); // 15 de octubre de 2026, hora local
const at = (y: number, mo: number, d: number) => new Date(y, mo - 1, d, 10).toISOString();
const ev = (over: Partial<StockEvent>): StockEvent => ({
  product_id: 'leche', type: 'status_changed', from_status: 'ok', to_status: 'ok',
  from_quantity: null, to_quantity: null, at: at(2026, 10, 1), ...over,
});
const out = (d: string) => ev({ from_status: 'ok', to_status: 'out', at: d });
const bought = (d: string) => ev({ type: 'purchased', from_status: 'out', to_status: 'ok', at: d });

describe('qué significa cada evento', () => {
  it('compra, se terminó y uso', () => {
    expect(classify(bought(at(2026, 10, 1)))).toMatchObject({ bought: true, ranOut: false });
    expect(classify(out(at(2026, 10, 1)))).toMatchObject({ bought: false, ranOut: true });
    expect(classify(ev({ type: 'quantity_changed', from_quantity: 6, to_quantity: 4, to_status: 'ok' }))).toMatchObject({ used: 2, bought: false });
    expect(classify(ev({ type: 'quantity_changed', from_quantity: 2, to_quantity: 14 }))).toMatchObject({ bought: true, boughtUnits: 12 });
    expect(classify(ev({ type: 'created', to_status: 'out', from_status: null }))).toMatchObject({ bought: false, ranOut: false });
  });
});

describe('estadísticas de un producto', () => {
  // Leche: se compra cada ~7 días y dura ~6
  const events: StockEvent[] = [];
  for (let d = 1; d <= 120; d += 7) {
    const start = new Date(2026, 5, d, 10).getTime();
    events.push(bought(new Date(start).toISOString()), out(new Date(start + 6 * 86_400_000).toISOString()));
  }
  const s = productStats(events, { now, months: 6, product: { status: 'ok', track_quantity: false } });

  it('cuánto dura y cada cuánto se compra', () => {
    expect(s.avgDaysLasts).toBeCloseTo(6, 5);
    expect(s.avgDaysBetweenPurchases).toBeCloseTo(7, 5);
  });

  it('por mes, con los meses vacíos incluidos', () => {
    expect(s.months.map((x) => x.key)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(s.months[0].bought).toBe(0);
    expect(s.months[2].bought).toBeGreaterThanOrEqual(4);
    // los promedios cuentan desde junio, no desde mayo
    expect(s.boughtPerMonth).toBeGreaterThan(4);
  });

  it('estima cuándo se termina', () => {
    const last = events.filter((e) => e.type === 'purchased').at(-1)!;
    const pending = productStats(events.filter((e) => e !== events.at(-1)), { now, months: 6, product: { status: 'ok', track_quantity: false } });
    expect(Date.parse(pending.nextOutAt!) - Date.parse(last.at)).toBeCloseTo(6 * 86_400_000, -3);
    expect(productStats(events, { now, months: 6, product: { status: 'out', track_quantity: false } }).nextOutAt).toBeNull();
  });

  it('sin historial no inventa', () => {
    const empty = productStats([], { now, months: 3 });
    expect(empty).toMatchObject({ bought: 0, avgDaysLasts: null, avgDaysBetweenPurchases: null, nextOutAt: null });
  });

  it('con conteo: unidades usadas por mes', () => {
    const huevos = productStats(
      [
        ev({ type: 'quantity_changed', from_quantity: 12, to_quantity: 6, at: at(2026, 9, 10) }),
        ev({ type: 'quantity_changed', from_quantity: 6, to_quantity: 0, to_status: 'out', at: at(2026, 9, 20) }),
        ev({ type: 'purchased', from_quantity: 0, to_quantity: 12, from_status: 'out', at: at(2026, 10, 2) }),
        ev({ type: 'quantity_changed', from_quantity: 12, to_quantity: 9, at: at(2026, 10, 10) }),
      ],
      { now, months: 2, product: { status: 'ok', track_quantity: true } },
    );
    expect(huevos.months.map((x) => x.used)).toEqual([12, 3]);
    expect(huevos.usedPerMonth).toBeGreaterThan(0);
  });
});

describe('estadísticas del hogar', () => {
  it('suma, ordena lo que más se termina y avisa lo que está por terminarse', () => {
    const leche = product({ id: 'leche', name: 'Leche', category_id: 'lacteos' });
    const yerba = product({ id: 'yerba', name: 'Yerba', category_id: 'almacen' });
    const events: StockEvent[] = [
      bought(at(2026, 9, 1)), out(at(2026, 9, 5)), bought(at(2026, 9, 6)), out(at(2026, 9, 10)), bought(at(2026, 10, 12)),
      { ...bought(at(2026, 8, 1)), product_id: 'yerba' }, { ...out(at(2026, 9, 25)), product_id: 'yerba' },
      { ...bought(at(2026, 9, 3)), product_id: null }, // producto borrado: cuenta en el total
    ];
    const h = householdStats(events, [leche, yerba], { now, months: 3 });
    expect(h.bought).toBe(5);
    expect(h.ranOut).toBe(3);
    expect(h.top.map((r) => r.product.id)).toEqual(['leche', 'yerba']);
    expect(h.soon.map((s) => s.product.id)).toEqual(['leche']); // dura ~4 días y se compró el 12
    expect(h.byCategory[0]).toEqual({ categoryId: 'lacteos', bought: 3 });
  });

  it('meses y escala del eje', () => {
    expect(lastMonths(now, 12)[0].key).toBe('2025-11');
    expect(niceTicks(7)).toEqual([0, 2, 4, 6, 8]);
    expect(niceTicks(0)).toEqual([0, 1]);
    expect(niceTicks(3, 4)).toEqual([0, 1, 2, 3]);
  });
});
