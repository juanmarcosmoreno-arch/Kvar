import { describe, expect, it } from 'vitest';
import { suggestedQuantities } from '../suggestQuantity';
import type { PurchaseLine } from '../spending';
import type { StockEvent } from '../stats';
import { product } from './fixtures';

const now = Date.parse('2026-10-15T12:00:00Z');
const daysAgo = (d: number) => new Date(now - d * 86_400_000).toISOString();

describe('cantidad sugerida', () => {
  it('con conteo: el paquete de siempre y lo que hace falta para dos semanas', () => {
    const huevos = product({ id: 'h', track_quantity: true, quantity: 2 });
    const events: StockEvent[] = [];
    for (let d = 59; d >= 1; d--) {
      events.push({ product_id: 'h', type: 'quantity_changed', from_status: 'ok', to_status: 'ok', from_quantity: 10, to_quantity: 8, at: daysAgo(d) });
    }
    events.push({ product_id: 'h', type: 'purchased', from_status: 'low', to_status: 'ok', from_quantity: 2, to_quantity: 14, at: daysAgo(30) });
    // usa 2 por día → 28 para dos semanas, hay 2 → hacen falta 26 → 3 docenas
    expect(suggestedQuantities([huevos], events, [], now).get('h')).toBe(36);
  });

  it('sin conteo: lo que se suele llevar en el ticket', () => {
    const cafe = product({ id: 'c' });
    const line = (q: number, d: number): PurchaseLine => ({
      id: String(d), household_id: 'hh', product_id: 'c', name: 'Café', quantity: q, unit_price: 300, total: 300 * q,
      store: null, bought_at: daysAgo(d), receipt_key: String(d),
    });
    expect(suggestedQuantities([cafe], [], [line(2, 40), line(2, 20), line(1, 5)], now).get('c')).toBe(2);
    expect(suggestedQuantities([cafe], [], [line(1, 40), line(1, 20)], now).has('c')).toBe(false);
  });
});
