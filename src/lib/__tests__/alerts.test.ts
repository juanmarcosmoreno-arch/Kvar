import { describe, expect, it } from 'vitest';
import { planAlerts } from '../../domain/alertsPlan';
import { product, snapshot } from '../../domain/__tests__/fixtures';
import type { StockEvent } from '../../domain/stats';

const prefs = { enabled: true, predicted: true, expiry: true, others: true };
const now = new Date(2026, 9, 15, 9, 0);

describe('avisos', () => {
  it('vencimientos: dos días antes a las 10, o lo antes posible', () => {
    const view = snapshot({
      products: [
        product({ id: 'q', name: 'Queso', expires_on: '2026-10-19' }),
        product({ id: 'y', name: 'Yogur', expires_on: '2026-10-15' }),
        product({ id: 'l', name: 'Lejos', expires_on: '2026-12-01' }),
        product({ id: 'x', name: 'Ya no hay', expires_on: '2026-10-16', status: 'out' }),
      ],
    });
    const a = planAlerts(view, [], prefs, now);
    expect(a.map((x) => x.body)).toEqual(['Yogur vence hoy.', 'Queso vence en 2 días.']);
    expect(a[1].at).toEqual(new Date(2026, 9, 17, 10, 0));
  });

  it('lo que se está por terminar, la tarde anterior', () => {
    const ev = (t: number, type: string, to: 'ok' | 'out'): StockEvent => ({
      product_id: 'c', type, from_status: to === 'ok' ? 'out' : 'ok', to_status: to, from_quantity: null, to_quantity: null,
      at: new Date(now.getTime() - t * 86_400_000).toISOString(),
    });
    // dura 5 días; se compró hace 3 → se terminaría en 2
    const events = [ev(20, 'purchased', 'ok'), ev(15, 'status_changed', 'out'), ev(13, 'purchased', 'ok'), ev(8, 'status_changed', 'out'), ev(3, 'purchased', 'ok')];
    const view = snapshot({ products: [product({ id: 'c', name: 'Café' })] });
    const a = planAlerts(view, events, prefs, now);
    expect(a.map((x) => x.body)).toEqual(['Probablemente se termine Café. ¿Lo agregás a la lista?']);
    expect(a[0].at.getHours()).toBe(18);
    expect(planAlerts(view, events, { ...prefs, enabled: false }, now)).toEqual([]);
  });
});
