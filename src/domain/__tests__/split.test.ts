import { describe, expect, it } from 'vitest';
import { parseAmount, splitExpenses, transfersFor } from '../split';
import type { PurchaseLine } from '../spending';
import type { Member } from '../types';

const member = (user_id: string, display_name: string): Member => ({ household_id: 'hh', user_id, role: 'member', display_name, joined_at: '2026-01-01T00:00:00Z' });
const members = [member('juan', 'Juan'), member('maria', 'María'), member('reloj', 'Reloj de Juan')];
const line = (paid_by: string | null, total: number, created_at = '2026-10-10T12:00:00Z'): PurchaseLine => ({
  id: Math.random().toString(36), household_id: 'hh', product_id: null, name: 'x', quantity: 1, unit_price: total, total,
  store: null, bought_at: created_at, receipt_key: null, paid_by, created_at,
});

describe('dividir gastos', () => {
  it('partes iguales: el que puso menos le debe la mitad de la diferencia', () => {
    const r = splitExpenses([line('juan', 1800), line('maria', 1200), line('juan', 400)], members);
    expect(r.members.map((m) => m.userId)).toEqual(['juan', 'maria']); // el reloj no participa
    expect(r.total).toBe(3400);
    expect(r.transfers).toEqual([{ from: 'maria', to: 'juan', amount: 500 }]);
  });

  it('con porcentajes (60/40)', () => {
    const r = splitExpenses([line('juan', 1000)], members, { weights: { juan: 60, maria: 40, reloj: 0 } });
    expect(r.transfers).toEqual([{ from: 'maria', to: 'juan', amount: 400 }]);
  });

  it('«Saldar»: solo cuenta lo cargado después; lo sin pagador queda aparte', () => {
    const r = splitExpenses(
      [line('juan', 5000, '2026-10-01T10:00:00Z'), line('maria', 600, '2026-10-12T10:00:00Z'), line(null, 300, '2026-10-12T10:00:00Z')],
      members,
      { since: '2026-10-05T00:00:00Z' },
    );
    expect(r.total).toBe(600);
    expect(r.unassigned).toBe(300);
    expect(r.transfers).toEqual([{ from: 'juan', to: 'maria', amount: 300 }]);
  });

  it('con tres, las menos transferencias posibles', () => {
    const t = transfersFor([{ userId: 'a', balance: 700 }, { userId: 'b', balance: -400 }, { userId: 'c', balance: -300 }]);
    expect(t).toEqual([{ from: 'b', to: 'a', amount: 400 }, { from: 'c', to: 'a', amount: 300 }]);
  });
});

describe('montos escritos a mano', () => {
  it('coma o punto decimal, y miles', () => {
    expect(parseAmount('1.250,50')).toBe(1250.5);
    expect(parseAmount('1,250.50')).toBe(1250.5);
    expect(parseAmount('1.250')).toBe(1250);
    expect(parseAmount('12,5')).toBe(12.5);
    expect(parseAmount('12.50')).toBe(12.5);
    expect(parseAmount('800')).toBe(800);
    expect(parseAmount('')).toBeNaN();
  });
});
