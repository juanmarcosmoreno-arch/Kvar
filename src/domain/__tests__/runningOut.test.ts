import { describe, expect, it } from 'vitest';
import { runningOutSoon } from '../runningOut';
import { productStats, type StockEvent } from '../stats';
import { product } from './fixtures';

const now = new Date(2026, 9, 15, 12);
const DAY = 86_400_000;
const ev = (over: Partial<StockEvent>): StockEvent => ({
  product_id: 'cafe', type: 'status_changed', from_status: 'ok', to_status: 'ok',
  from_quantity: null, to_quantity: null, at: now.toISOString(), ...over,
});
const daysAgo = (d: number) => new Date(now.getTime() - d * DAY).toISOString();

/** Café: dura 10 días; la última vez se compró hace `last` días */
function coffee(last: number, id = 'cafe'): StockEvent[] {
  const out: StockEvent[] = [];
  for (const start of [last + 40, last + 30, last + 20, last + 10]) {
    out.push(ev({ product_id: id, type: 'purchased', from_status: 'out', to_status: 'ok', at: daysAgo(start) }));
    out.push(ev({ product_id: id, from_status: 'ok', to_status: 'out', at: daysAgo(start - 10) }));
  }
  out.push(ev({ product_id: id, type: 'purchased', from_status: 'out', to_status: 'ok', at: daysAgo(last) }));
  return out;
}

describe('se termina pronto', () => {
  const cafe = product({ id: 'cafe', name: 'Café', status: 'ok' });

  it('avisa lo que se termina en los próximos días', () => {
    const r = runningOutSoon(coffee(7), [cafe], [], { now });
    expect(r).toHaveLength(1);
    expect(r[0].days).toBe(3);
  });

  it('no repite lo que ya está en la lista, lo que está en amarillo ni lo que se pospuso', () => {
    const item = { id: 'i', household_id: 'hh-1', product_id: 'cafe', name: null, quantity: null, note: null, reason: 'manual' as const, checked_at: null, checked_by: null, created_at: now.toISOString() };
    expect(runningOutSoon(coffee(7), [cafe], [item], { now })).toHaveLength(0);
    expect(runningOutSoon(coffee(7), [{ ...cafe, status: 'low' }], [], { now })).toHaveLength(0);
    const until = new Date(now.getTime() + DAY).toISOString();
    expect(runningOutSoon(coffee(7), [cafe], [], { now, snoozed: { cafe: until } })).toHaveLength(0);
  });

  it('lo que falta mucho o una predicción vieja no aparece', () => {
    expect(runningOutSoon(coffee(1), [cafe], [], { now })).toHaveLength(0);
    expect(runningOutSoon(coffee(25), [cafe], [], { now })).toHaveLength(0);
  });

  it('con conteo: según cuántas quedan y el ritmo de uso', () => {
    // Pañales: 5 por día los últimos 30 días; quedan 12 → ~2 días
    const events: StockEvent[] = [];
    for (let d = 30; d >= 1; d--) events.push(ev({ product_id: 'p', type: 'quantity_changed', from_quantity: 100, to_quantity: 95, at: daysAgo(d) }));
    const s = productStats(events, { now, months: 6, product: { status: 'ok', track_quantity: true, quantity: 12 } });
    const days = (Date.parse(s.nextOutAt!) - now.getTime()) / DAY;
    expect(days).toBeGreaterThan(2);
    expect(days).toBeLessThan(3);
  });
});
