import { describe, expect, it } from 'vitest';
import { clampAmount, initialAmount, nextQuantity } from '../quantity';

describe('elegir cantidad', () => {
  it('sumar, restar, fijar y comprar', () => {
    expect(nextQuantity(12, 'add', 6)).toBe(18);
    expect(nextQuantity(12, 'bought', 12)).toBe(24);
    expect(nextQuantity(4, 'remove', 3)).toBe(1);
    expect(nextQuantity(2, 'remove', 5)).toBe(0); // nunca negativo
    expect(nextQuantity(7, 'set', 10)).toBe(10);
    expect(nextQuantity(null, 'add', 2)).toBe(2);
    expect(nextQuantity(5, 'list', 3)).toBe(5); // la lista no toca el stock
  });

  it('valor inicial del selector', () => {
    expect(initialAmount('set', 9, null)).toBe(9);
    expect(initialAmount('bought', 0, 6)).toBe(6); // lo que decía la lista
    expect(initialAmount('bought', 0, null)).toBe(1);
    expect(initialAmount('add', 3, null)).toBe(1);
  });

  it('límites', () => {
    expect(clampAmount(0, 'add')).toBe(1);
    expect(clampAmount(0, 'set')).toBe(0);
    expect(clampAmount(2.7, 'add')).toBe(2);
    expect(clampAmount(5000, 'add')).toBe(999);
    expect(clampAmount(Number.NaN, 'remove')).toBe(1);
  });
});
