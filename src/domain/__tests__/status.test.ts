import { describe, expect, it } from 'vitest';
import {
  cycleStatus, daysUntil, expiringSoon, expiryLabel, frequentProducts, needsAttention,
  resolveStock, statusFromQuantity, worseStatus,
} from '../status';
import { product } from './fixtures';

describe('cambio de estado con un toque', () => {
  it('cicla Hay → Queda poco → No hay → Hay', () => {
    expect(cycleStatus('ok')).toBe('low');
    expect(cycleStatus('low')).toBe('out');
    expect(cycleStatus('out')).toBe('ok');
  });

  it('deslizar empeora un paso y se queda en No hay', () => {
    expect(worseStatus('ok')).toBe('low');
    expect(worseStatus('low')).toBe('out');
    expect(worseStatus('out')).toBe('out');
  });
});

describe('conteo de unidades', () => {
  it('deriva el estado de la cantidad', () => {
    expect(statusFromQuantity(0, 2)).toBe('out');
    expect(statusFromQuantity(-3, 2)).toBe('out');
    expect(statusFromQuantity(2, 2)).toBe('low');
    expect(statusFromQuantity(3, 2)).toBe('ok');
  });

  it('sin conteo, el estado pedido se respeta y la cantidad no cambia', () => {
    const p = product({ status: 'ok' });
    expect(resolveStock(p, { status: 'low' })).toEqual({ status: 'low', quantity: null });
  });

  it('con conteo, pedir una cantidad recalcula el estado', () => {
    const p = product({ track_quantity: true, quantity: 10, low_threshold: 3 });
    expect(resolveStock(p, { quantity: 3 })).toEqual({ status: 'low', quantity: 3 });
    expect(resolveStock(p, { quantity: 0 })).toEqual({ status: 'out', quantity: 0 });
    expect(resolveStock(p, { quantity: -2 })).toEqual({ status: 'out', quantity: 0 });
  });

  it('con conteo, pedir un estado ajusta la cantidad de forma coherente', () => {
    const p = product({ track_quantity: true, quantity: 10, low_threshold: 3 });
    expect(resolveStock(p, { status: 'out' })).toEqual({ status: 'out', quantity: 0 });
    expect(resolveStock(p, { status: 'low' })).toEqual({ status: 'low', quantity: 3 });
    expect(resolveStock({ ...p, quantity: 2 }, { status: 'low' })).toEqual({ status: 'low', quantity: 2 });
    expect(resolveStock({ ...p, quantity: 0 }, { status: 'ok' })).toEqual({ status: 'ok', quantity: 4 });
    expect(resolveStock(p, { status: 'ok' })).toEqual({ status: 'ok', quantity: 10 });
  });

  it('umbral 0: una unidad ya es "Hay", pedir "Queda poco" deja 1', () => {
    const p = product({ track_quantity: true, quantity: 5, low_threshold: 0 });
    expect(resolveStock(p, { quantity: 1 }).status).toBe('ok');
    expect(resolveStock(p, { status: 'low' })).toEqual({ status: 'ok', quantity: 1 });
  });
});

describe('Inicio', () => {
  it('lo que pide atención: No hay primero, luego básicos', () => {
    const list = needsAttention([
      product({ id: 'a', name: 'Arroz', status: 'low' }),
      product({ id: 'b', name: 'Café', status: 'low', is_staple: true }),
      product({ id: 'c', name: 'Yerba', status: 'out' }),
      product({ id: 'd', name: 'Sal', status: 'ok' }),
    ]);
    expect(list.map((p) => p.id)).toEqual(['c', 'b', 'a']);
  });

  it('frecuentes: los que más se terminan, sin los que ya no hay', () => {
    const ps = [
      product({ id: 'a', name: 'Arroz' }),
      product({ id: 'b', name: 'Leche' }),
      product({ id: 'c', name: 'Pan', status: 'out' }),
    ];
    expect(frequentProducts(ps, { b: 5, a: 1, c: 9 }).map((p) => p.id)).toEqual(['b', 'a']);
  });

  it('vencimientos', () => {
    const today = new Date(2026, 9, 15);
    expect(daysUntil('2026-10-18', today)).toBe(3);
    expect(daysUntil('2026-10-14', today)).toBe(-1);
    expect(expiryLabel(3)).toBe('Vence en 3 días');
    expect(expiryLabel(1)).toBe('Vence mañana');
    expect(expiryLabel(0)).toBe('Vence hoy');
    expect(expiryLabel(-1)).toBe('Venció ayer');
    const ps = [
      product({ id: 'a', expires_on: '2026-10-30' }),
      product({ id: 'b', expires_on: '2026-10-17' }),
      product({ id: 'c', expires_on: '2026-10-16', status: 'out' }),
      product({ id: 'd' }),
    ];
    expect(expiringSoon(ps, 5, today).map((p) => p.id)).toEqual(['b']);
  });
});
