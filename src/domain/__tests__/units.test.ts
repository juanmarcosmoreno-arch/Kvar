import { describe, expect, it } from 'vitest';
import { findUnit, formatQuantity, householdUnits, singularize, suggestUnit, UNIT_CATALOG, unitLabel } from '../units';

describe('catálogo de unidades', () => {
  it('singular y plural según la cantidad', () => {
    expect(formatQuantity(1, 'latas')).toBe('1 lata');
    expect(formatQuantity(3, 'latas')).toBe('3 latas');
    expect(formatQuantity(0, 'latas')).toBe('0 latas');
    expect(formatQuantity(1, null)).toBe('1 unidad');
    expect(formatQuantity(5, undefined)).toBe('5 unidades');
    expect(unitLabel(1, 'Cápsulas')).toBe('cápsula');
  });

  it('reconoce la unidad aunque esté en singular, sin tilde o en mayúsculas', () => {
    expect(findUnit('Lata').plural).toBe('latas');
    expect(findUnit('capsulas').singular).toBe('cápsula');
  });

  it('unidades propias del hogar', () => {
    expect(singularize('pañales')).toBe('pañal');
    expect(singularize('velas')).toBe('vela');
    expect(formatQuantity(1, 'pañales')).toBe('1 pañal');
    expect(formatQuantity(26, 'pañales')).toBe('26 pañales');
    const list = householdUnits(['pañales', 'latas', 'Pañales', null, 'velas']);
    expect(list.length).toBe(UNIT_CATALOG.length + 2);
    expect(list.slice(-2).map((u) => u.plural)).toEqual(['pañales', 'velas']);
  });

  it('sugiere unidad por producto o categoría', () => {
    expect(suggestUnit('Papel higiénico', 'Higiene')).toBe('rollos');
    expect(suggestUnit('Atún', 'Almacén')).toBe('latas');
    expect(suggestUnit('Agua', 'Bebidas')).toBe('botellas');
    expect(suggestUnit('Jugo', 'Bebidas')).toBe('botellas');
    expect(suggestUnit('Milanesas', 'Congelados')).toBe('paquetes');
    expect(suggestUnit('Pañales', 'Bebé')).toBe('unidades');
    expect(suggestUnit('Algo', null)).toBe('unidades');
  });
});
