import { describe, expect, it } from 'vitest';
import { checkAlert, checkSeenPrice, dailyMins, personalInflation, priceVerdict, splitShopping, type PriceAlert, type PriceHistory } from '../priceTools';
import type { PurchaseLine } from '../spending';

const history = (prices: number[], end = '2026-10-17'): PriceHistory => {
  const out: PriceHistory = {};
  prices.forEach((p, i) => {
    const day = new Date(Date.parse(`${end}T12:00:00Z`) - (prices.length - i) * 86_400_000).toISOString().slice(0, 10);
    out[day] = { 'disco-sipc-1': p, 'tata-sipc-2': p + 10 };
  });
  return out;
};

describe('¿está caro?', () => {
  it('el más barato de cada día, sin hoy', () => {
    const h = { ...history([100, 110]), '2026-10-17': { a: 50 } };
    expect(dailyMins(h, '2026-10-17').map((x) => x.price)).toEqual([100, 110]);
  });

  it('hace falta unos días para decir qué es lo normal', () => {
    expect(priceVerdict(history([100, 100, 100]), 90, '2026-10-17')).toBeNull();
  });

  it('barato, normal o caro', () => {
    const h = history([100, 102, 98, 101, 99, 100, 103, 97]);
    expect(priceVerdict(h, 85, '2026-10-17')!.verdict).toBe('cheap');
    expect(priceVerdict(h, 100, '2026-10-17')!.verdict).toBe('normal');
    const high = priceVerdict(h, 120, '2026-10-17')!;
    expect(high.verdict).toBe('expensive');
    expect(high.diff).toBeCloseTo(0.2, 1);
  });
});

describe('alertas', () => {
  const alert = (kind: PriceAlert['kind'], value: number | null): PriceAlert => ({ id: 'a', item: 'x', name: 'X', kind, value, created_at: '' });
  const now = { price: 245, store: 'disco-sipc-1', offer: false };
  it('baja de un precio', () => {
    expect(checkAlert(alert('below', 250), now, null)).not.toBeNull();
    expect(checkAlert(alert('below', 240), now, null)).toBeNull();
  });
  it('en oferta', () => {
    expect(checkAlert(alert('offer', null), now, null)).toBeNull();
    expect(checkAlert(alert('offer', null), { ...now, offer: true }, null)).not.toBeNull();
  });
  it('más barato que lo normal', () => {
    const verdict = { verdict: 'cheap' as const, low: 270, high: 290, today: 245, diff: -0.12, days: 10 };
    expect(checkAlert(alert('cheap', 10), now, verdict)).not.toBeNull();
    expect(checkAlert(alert('cheap', 20), now, verdict)).toBeNull();
    expect(checkAlert(alert('cheap', 10), now, null)).toBeNull();
  });
});

describe('tu inflación', () => {
  const line = (product_id: string, month: number, price: number): PurchaseLine => ({
    id: `${product_id}-${month}`, household_id: 'h', product_id, name: product_id, quantity: 1, unit_price: price, total: price,
    store: 'Disco', bought_at: new Date(2026, month, 10).toISOString(), receipt_key: `r${month}`,
  });
  it('cambio de precio mes a mes, pesado por lo gastado', () => {
    const lines = [line('a', 8, 100), line('a', 9, 110), line('b', 8, 100), line('b', 9, 100)];
    const inf = personalInflation(lines, new Map([['a', 'Arroz'], ['b', 'Leche']]), { now: new Date(2026, 9, 17), months: 3 });
    expect(inf.last!.key).toBe('2026-10');
    // a sube 10 % (peso 210), b no cambia (peso 200)
    expect(inf.last!.change).toBeCloseTo((0.1 * 210) / 410, 5);
    expect(inf.last!.compared).toBe(2);
    expect(inf.months[0].change).toBeNull();
    expect(inf.movers[0]).toMatchObject({ productId: 'a', name: 'Arroz' });
  });
});

describe('comprar en 2 súper', () => {
  it('el súper que tiene más y lo que conviene en otro', () => {
    const plan = splitShopping([
      { id: '1', name: 'Yerba', prices: { disco: 250, tata: 200 }, quantity: 1 },
      { id: '2', name: 'Arroz', prices: { disco: 60, tata: 70 }, quantity: 2 },
      { id: '3', name: 'Café', prices: { disco: 400 }, quantity: 1 },
      { id: '4', name: 'Sin precio', prices: {}, quantity: 1 },
    ])!;
    expect(plan.single).toEqual({ store: 'disco', total: 770 });
    expect(plan.pair!.stores).toEqual(['disco', 'tata']);
    expect(plan.pair!.byStore.tata.map((x) => x.name)).toEqual(['Yerba']);
    expect(plan.saving).toBe(50);
    expect(plan.compared).toBe(3);
  });
  it('nada que comparar', () => {
    expect(splitShopping([])).toBeNull();
  });
});

describe('¿a cuánto lo ves?', () => {
  const prices = [
    { store: 'tata', price: 120 },
    { store: 'disco', price: 100 },
    { store: 'devoto', price: 110 },
  ];
  it('contra lo más barato y lo del medio de tus súper', () => {
    expect(checkSeenPrice(95, prices, null)).toMatchObject({ verdict: 'cheap', cheapest: { store: 'disco', price: 100 }, typical: 110 });
    expect(checkSeenPrice(101, prices, null)!.verdict).toBe('cheap');
    expect(checkSeenPrice(108, prices, null)!.verdict).toBe('normal');
    const high = checkSeenPrice(125, prices, null)!;
    expect(high.verdict).toBe('expensive');
    expect(high.diff).toBeCloseTo(0.25, 5);
  });
  it('y contra lo normal de los últimos meses', () => {
    const normal = { verdict: 'normal' as const, low: 100, high: 110, today: 100, diff: 0, days: 10 };
    expect(checkSeenPrice(90, prices, normal)!.history).toBe('cheap');
    expect(checkSeenPrice(105, prices, normal)!.history).toBe('normal');
    expect(checkSeenPrice(130, prices, normal)!.history).toBe('expensive');
  });
  it('sin precios para comparar', () => {
    expect(checkSeenPrice(100, [], null)).toBeNull();
    expect(checkSeenPrice(0, prices, null)).toBeNull();
  });
});
