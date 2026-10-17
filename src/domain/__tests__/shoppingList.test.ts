import { describe, expect, it } from 'vitest';
import {
  applyStatusToList, groupListByCategory, groupListByPriority, listPriority, listReasonFor, openCount, recentlyChecked,
} from '../shoppingList';
import { category, item, NOW, product } from './fixtures';

const opts = (listOnLow = false) => ({ listOnLow, now: NOW, newId: () => 'new' });

describe('lista automática', () => {
  it('No hay → se agrega a la lista', () => {
    const p = product({ id: 'leche' });
    const list = applyStatusToList([], p, 'out', opts());
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: 'new', product_id: 'leche', reason: 'out', checked_at: null });
  });

  it('no duplica si ya está en la lista abierta', () => {
    const p = product({ id: 'leche' });
    const existing = [item({ product_id: 'leche', reason: 'out' })];
    expect(applyStatusToList(existing, p, 'out', opts())).toBe(existing);
  });

  it('Queda poco: solo si es básico o si el hogar lo pidió', () => {
    const comun = product({ id: 'a' });
    const basico = product({ id: 'b', is_staple: true });
    expect(applyStatusToList([], comun, 'low', opts())).toHaveLength(0);
    expect(applyStatusToList([], comun, 'low', opts(true))).toHaveLength(1);
    expect(applyStatusToList([], basico, 'low', opts())[0].reason).toBe('low');
    expect(listReasonFor(basico, 'ok', true)).toBeNull();
  });

  it('de Queda poco a No hay actualiza el motivo', () => {
    const p = product({ id: 'cafe', is_staple: true });
    const list = applyStatusToList([item({ id: 'x', product_id: 'cafe', reason: 'low' })], p, 'out', opts());
    expect(list).toEqual([expect.objectContaining({ id: 'x', reason: 'out' })]);
  });

  it('volver a Hay quita lo que agregó la app pero respeta lo manual', () => {
    const p = product({ id: 'leche' });
    const auto = item({ product_id: 'leche', reason: 'out' });
    expect(applyStatusToList([auto], p, 'ok', opts())).toEqual([]);
    const manual = item({ product_id: 'leche', reason: 'manual' });
    expect(applyStatusToList([manual], p, 'ok', opts())).toEqual([manual]);
  });

  it('un ítem ya comprado no impide volver a agregarlo', () => {
    const p = product({ id: 'leche' });
    const comprado = item({ product_id: 'leche', reason: 'out', checked_at: NOW });
    expect(applyStatusToList([comprado], p, 'out', opts())).toHaveLength(2);
  });
});

describe('agrupado por categoría', () => {
  const cats = [category('lac', 'Lácteos', 4), category('fru', 'Frutas y verduras', 1)];
  const products = [
    product({ id: 'leche', name: 'Leche', category_id: 'lac' }),
    product({ id: 'queso', name: 'Queso', category_id: 'lac' }),
    product({ id: 'manzana', name: 'Manzana', category_id: 'fru' }),
    product({ id: 'raro', name: 'Algo', category_id: null }),
  ];

  it('respeta el orden de categorías, No hay primero dentro de cada grupo, sin categoría al final', () => {
    const list = [
      item({ id: '1', product_id: 'queso', reason: 'out' }),
      item({ id: '2', product_id: 'leche', reason: 'low' }),
      item({ id: '3', product_id: 'manzana', reason: 'out' }),
      item({ id: '4', name: 'Velas', reason: 'manual' }),
      item({ id: '5', product_id: 'raro', reason: 'out' }),
      item({ id: '6', product_id: 'leche', reason: 'out', checked_at: NOW }),
    ];
    const groups = groupListByCategory(list, products, cats);
    expect(groups.map((g) => g.title)).toEqual(['Frutas y verduras', 'Lácteos', 'Sin categoría']);
    expect(groups[1].items.map((i) => i.id)).toEqual(['1', '2']);
    expect(groups[2].items.map((i) => i.id)).toEqual(['5', '4']);
    expect(openCount(list)).toBe(5);
  });

  it('recién comprados para deshacer', () => {
    const now = Date.parse(NOW);
    const list = [
      item({ id: 'a', checked_at: new Date(now - 60_000).toISOString() }),
      item({ id: 'b', checked_at: new Date(now - 10_000).toISOString() }),
      item({ id: 'c', checked_at: new Date(now - 3_600_000 * 5).toISOString() }),
      item({ id: 'd' }),
    ];
    expect(recentlyChecked(list, 3_600_000, now).map((i) => i.id)).toEqual(['b', 'a']);
  });
});

describe('por urgencia', () => {
  const cats = [category('lac', 'Lácteos', 4), category('fru', 'Frutas y verduras', 1), category('lim', 'Limpieza', 7)];
  const products = [
    product({ id: 'leche', name: 'Leche', category_id: 'lac', status: 'out', is_staple: true }),
    product({ id: 'yerba', name: 'Yerba', category_id: null, status: 'out', is_staple: true }),
    product({ id: 'banana', name: 'Banana', category_id: 'fru', status: 'out', is_staple: true }),
    product({ id: 'cafe', name: 'Café', category_id: 'lac', status: 'low', is_staple: true }),
    product({ id: 'queso', name: 'Queso', category_id: 'lac', status: 'out', is_staple: false }),
    product({ id: 'lavandina', name: 'Lavandina', category_id: 'lim', status: 'low', is_staple: false }),
  ];
  const list = [
    item({ id: 'q', product_id: 'queso', reason: 'out' }),
    item({ id: 'v', name: 'Velas', reason: 'manual' }),
    item({ id: 'l', product_id: 'leche', reason: 'out' }),
    item({ id: 'c', product_id: 'cafe', reason: 'low' }),
    item({ id: 'lv', product_id: 'lavandina', reason: 'low' }),
    item({ id: 'y', product_id: 'yerba', reason: 'out' }),
    item({ id: 'b', product_id: 'banana', reason: 'out' }),
  ];

  it('qué tan urgente es cada cosa (cuenta el estado de ahora del producto)', () => {
    expect(listPriority({ reason: 'low' }, products[0])).toBe(0); // en la lista como «queda poco», pero ya no hay
    expect(listPriority({ reason: 'low' }, products[3])).toBe(1);
    expect(listPriority({ reason: 'out' }, products[4])).toBe(2);
    expect(listPriority({ reason: 'low' }, products[5])).toBe(3);
    expect(listPriority({ reason: 'out' }, undefined)).toBe(2); // agregado a mano como «no hay»
    expect(listPriority({ reason: 'manual' }, undefined)).toBe(3);
  });

  it('básicos que no hay, básicos que quedan poco, lo que no hay y lo demás; adentro por categoría', () => {
    const groups = groupListByPriority(list, products, cats, null);
    expect(groups.map((g) => [g.key, g.items.map((i) => i.id)])).toEqual([
      ['urgente-basico', ['b', 'l', 'y']],
      ['poco-basico', ['c']],
      ['no-hay', ['q']],
      ['resto', ['lv', 'v']],
    ]);
    expect(groups[0].title).toBe('Básicos que no hay');
  });

  it('adentro de cada grupo, en el orden en que se recorre el súper', () => {
    const order = { trips: 3, product: new Map([['yerba', 0.1], ['leche', 0.5], ['banana', 0.9]]), category: new Map<string, number>() };
    expect(groupListByPriority(list, products, cats, order)[0].items.map((i) => i.id)).toEqual(['y', 'l', 'b']);
  });

  it('sin nada urgente no aparecen grupos vacíos', () => {
    expect(groupListByPriority([item({ id: 'v', name: 'Velas' })], products, cats, null).map((g) => g.key)).toEqual(['resto']);
  });
});
