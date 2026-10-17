import { describe, expect, it } from 'vitest';
import { applyOp, applyOps, compactOps, localItemId, type Op } from '../ops';
import { item, NOW, product, snapshot } from './fixtures';

const at = NOW;

describe('operaciones offline', () => {
  it('marcar No hay: cambia estado, agrega a la lista y cuenta para frecuentes', () => {
    const s = snapshot({ products: [product({ id: 'leche' })] });
    const next = applyOp(s, { kind: 'set_status', id: 'op1', at, productId: 'leche', status: 'out', source: 'manual' });
    expect(next.products[0].status).toBe('out');
    expect(next.products[0].status_changed_at).toBe(at);
    expect(next.list).toEqual([expect.objectContaining({ id: localItemId('leche'), reason: 'out' })]);
    expect(next.outCounts.leche).toBe(1);
    // no muta el original
    expect(s.products[0].status).toBe('ok');
  });

  it('respeta la preferencia del hogar para Queda poco', () => {
    const s = snapshot({ products: [product({ id: 'a' })] });
    const op: Op = { kind: 'set_status', id: 'o', at, productId: 'a', status: 'low', source: 'manual' };
    expect(applyOp(s, op).list).toHaveLength(0);
    const s2 = { ...s, household: { ...s.household, list_on_low: true } };
    expect(applyOp(s2, op).list).toHaveLength(1);
  });

  it('comprar desde la lista pasa el producto a Hay; deshacer lo devuelve', () => {
    const s = snapshot({
      products: [product({ id: 'leche', status: 'out' })],
      list: [item({ id: 'i1', product_id: 'leche', reason: 'out' })],
    });
    const bought = applyOp(s, { kind: 'purchase_item', id: 'o', at, itemId: 'i1' });
    expect(bought.products[0].status).toBe('ok');
    expect(bought.list[0].checked_at).toBe(at);
    const undone = applyOp(bought, { kind: 'unpurchase_item', id: 'o2', at, itemId: 'i1' });
    expect(undone.products[0].status).toBe('out');
    expect(undone.list[0].checked_at).toBeNull();
  });

  it('«solo tachar» tacha sin tocar el stock; destachar lo vuelve a la lista', () => {
    const s = snapshot({
      products: [product({ id: 'leche', status: 'out' })],
      list: [item({ id: 'i1', product_id: 'leche', reason: 'out' })],
    });
    const checked = applyOp(s, { kind: 'check_item', id: 'o', at, itemId: 'i1', checked: true });
    expect(checked.products[0].status).toBe('out');
    expect(checked.list[0].checked_at).toBe(at);
    const back = applyOp(checked, { kind: 'check_item', id: 'o2', at, itemId: 'i1', checked: false });
    expect(back.list[0].checked_at).toBeNull();
    expect(back.products[0].status).toBe('out');
  });

  it('comprar un producto con conteo suma unidades', () => {
    const s = snapshot({
      products: [product({ id: 'pan', track_quantity: true, quantity: 0, low_threshold: 2, status: 'out' })],
      list: [item({ id: 'i1', product_id: 'pan', reason: 'out', quantity: 6 })],
    });
    const next = applyOp(s, { kind: 'purchase_item', id: 'o', at, itemId: 'i1' });
    expect(next.products[0]).toMatchObject({ quantity: 6, status: 'ok' });
  });

  it('crear producto en No hay lo agrega directo a la lista', () => {
    const p = product({ id: 'nuevo', status: 'out' });
    const next = applyOp(snapshot(), { kind: 'create_product', id: 'o', at, product: p });
    expect(next.products).toHaveLength(1);
    expect(next.list).toHaveLength(1);
  });

  it('marcar como básico un producto que queda poco lo agrega a la lista', () => {
    const s = snapshot({ products: [product({ id: 'cafe', status: 'low' })] });
    const next = applyOp(s, { kind: 'update_product', id: 'o', at, productId: 'cafe', patch: { is_staple: true } });
    expect(next.list).toHaveLength(1);
  });

  it('no duplica ítems manuales del mismo producto', () => {
    const s = snapshot({ list: [item({ product_id: 'leche', reason: 'out' })] });
    const next = applyOp(s, { kind: 'add_item', id: 'o', at, item: item({ product_id: 'leche' }) });
    expect(next.list).toHaveLength(1);
  });

  it('borrar lugar deja los productos sin lugar', () => {
    const s = snapshot({
      locations: [{ id: 'hel', household_id: 'hh-1', name: 'Heladera', icon: null, sort_order: 1 }],
      products: [product({ id: 'a', location_id: 'hel' })],
    });
    const next = applyOp(s, { kind: 'delete_location', id: 'o', at, locationId: 'hel' });
    expect(next.locations).toHaveLength(0);
    expect(next.products[0].location_id).toBeNull();
  });

  it('servidor + cola = vista: varias operaciones en orden', () => {
    const s = snapshot({ products: [product({ id: 'a' })] });
    const ops: Op[] = [
      { kind: 'set_status', id: '1', at, productId: 'a', status: 'out', source: 'swipe' },
      { kind: 'set_status', id: '2', at, productId: 'a', status: 'ok', source: 'swipe' },
    ];
    const v = applyOps(s, ops);
    expect(v.products[0].status).toBe('ok');
    expect(v.list).toHaveLength(0);
  });

  it('compacta producto creado y borrado sin conexión', () => {
    const p = product({ id: 'tmp' });
    const ops: Op[] = [
      { kind: 'create_product', id: '1', at, product: p },
      { kind: 'set_status', id: '2', at, productId: 'tmp', status: 'out', source: 'manual' },
      { kind: 'set_status', id: '3', at, productId: 'otro', status: 'out', source: 'manual' },
      { kind: 'delete_product', id: '4', at, productId: 'tmp' },
    ];
    expect(compactOps(ops).map((o) => o.id)).toEqual(['3']);
  });
});

describe('Fase 2: códigos de barras y fotos', () => {
  const alias = (product_id: string, id = 'a1') => ({
    id, household_id: 'hh-1', product_id, kind: 'barcode' as const, alias: '7790070411716', normalized: '7790070411716', hits: 1,
  });

  it('aprender un código lo deja disponible al instante (también offline)', () => {
    const s = snapshot({ products: [product({ id: 'arroz' })] });
    const next = applyOp(s, { kind: 'learn_alias', id: 'o', at, alias: alias('arroz') });
    expect(next.aliases).toEqual([alias('arroz')]);
    const again = applyOp(next, { kind: 'learn_alias', id: 'o2', at, alias: alias('arroz', 'a2') });
    expect(again.aliases).toHaveLength(1);
    expect(again.aliases![0].hits).toBe(2);
  });

  it('si el usuario corrige a qué producto corresponde, gana la corrección', () => {
    const s = snapshot({ aliases: [alias('arroz')] });
    const next = applyOp(s, { kind: 'learn_alias', id: 'o', at, alias: alias('fideos', 'a2') });
    expect(next.aliases).toEqual([expect.objectContaining({ id: 'a1', product_id: 'fideos', hits: 1 })]);
  });

  it('borrar el producto borra sus códigos', () => {
    const s = snapshot({ products: [product({ id: 'arroz' })], aliases: [alias('arroz')] });
    expect(applyOp(s, { kind: 'delete_product', id: 'o', at, productId: 'arroz' }).aliases).toEqual([]);
  });

  it('la foto nueva se ve antes de subirse', () => {
    const s = snapshot({ products: [product({ id: 'arroz' })] });
    const next = applyOp(s, { kind: 'set_image', id: 'o', at, productId: 'arroz', path: 'hh-1/arroz-1.png', previousPath: null });
    expect(next.products[0].image_path).toBe('hh-1/arroz-1.png');
  });

  it('producto creado y borrado offline: su código tampoco viaja', () => {
    const p = product({ id: 'tmp' });
    const ops: Op[] = [
      { kind: 'create_product', id: '1', at, product: p },
      { kind: 'learn_alias', id: '2', at, alias: alias('tmp') },
      { kind: 'delete_product', id: '3', at, productId: 'tmp' },
    ];
    expect(compactOps(ops)).toEqual([]);
  });
});

describe('cantidades en la lista', () => {
  it('poner cuántos comprar y comprar esa cantidad suma al stock', () => {
    const s = snapshot({
      products: [product({ id: 'panales', track_quantity: true, quantity: 2, low_threshold: 5, status: 'low' })],
      list: [item({ id: 'i1', product_id: 'panales', reason: 'low' })],
    });
    const withQty = applyOp(s, { kind: 'update_item', id: 'o1', at, itemId: 'i1', patch: { quantity: 26 } });
    expect(withQty.list[0].quantity).toBe(26);
    const bought = applyOp(withQty, { kind: 'purchase_item', id: 'o2', at, itemId: 'i1' });
    expect(bought.products[0]).toMatchObject({ quantity: 28, status: 'ok' });
  });
});

describe('recetas offline', () => {
  const recipe = {
    id: 'r1', household_id: 'hh-1', title: 'Tuco', source: 'own' as const, source_url: null, servings: 4, total_minutes: 30,
    meal_types: [], constraints: [], tags: [], steps: null, image_url: null, created_at: at, updated_at: at,
    ingredients: [],
  };

  it('guardar, editar y borrar una receta', () => {
    let s = applyOp(snapshot(), { kind: 'save_recipe', id: 'o1', at, recipe });
    expect(s.recipes).toHaveLength(1);
    s = applyOp(s, { kind: 'save_recipe', id: 'o2', at, recipe: { ...recipe, title: 'Tuco de la abuela' } });
    expect(s.recipes).toEqual([expect.objectContaining({ title: 'Tuco de la abuela' })]);
    s = applyOp(s, { kind: 'delete_recipe', id: 'o3', at, recipeId: 'r1' });
    expect(s.recipes).toEqual([]);
  });

  it('el feedback no se duplica al reintentar', () => {
    const feedback = {
      id: 'f1', household_id: 'hh-1', recipe_id: 'r1', catalog_key: null, recipe_title: 'Tuco', tags: [],
      action: 'cooked' as const, created_at: at,
    };
    const op: Op = { kind: 'recipe_feedback', id: 'o', at, feedback };
    expect(applyOps(snapshot(), [op, op]).feedback).toHaveLength(1);
  });
});

describe('unir productos', () => {
  it('el duplicado pasa al que queda: códigos, lista, estado y frecuentes', () => {
    const s = snapshot({
      products: [product({ id: 'a', name: 'Azúcar', status: 'out' }), product({ id: 'b', name: 'Azúcar Bella Unión', status: 'ok', is_staple: true })],
      list: [item({ id: 'ia', product_id: 'a', reason: 'out' }), item({ id: 'ib', product_id: 'b', reason: 'low' })],
      outCounts: { a: 2, b: 3 },
      aliases: [{ id: 'al', household_id: 'hh-1', product_id: 'b', kind: 'barcode', alias: '7730', normalized: '7730', hits: 1 }],
    });
    const next = applyOp(s, { kind: 'merge_products', id: 'm', at, sourceId: 'b', targetId: 'a' });
    expect(next.products.map((p) => p.id)).toEqual(['a']);
    expect(next.products[0]).toMatchObject({ status: 'ok', is_staple: true });
    expect(next.list.map((i) => i.id)).toEqual(['ia']);
    expect(next.outCounts).toEqual({ a: 5 });
    expect(next.aliases![0].product_id).toBe('a');
    // reintento: no pasa nada
    expect(applyOp(next, { kind: 'merge_products', id: 'm', at, sourceId: 'b', targetId: 'a' })).toBe(next);
  });

  it('con conteo se suman las unidades', () => {
    const s = snapshot({
      products: [
        product({ id: 'a', track_quantity: true, quantity: 1, low_threshold: 2, status: 'low' }),
        product({ id: 'b', track_quantity: true, quantity: 3, low_threshold: 1, status: 'ok' }),
      ],
    });
    const next = applyOp(s, { kind: 'merge_products', id: 'm', at, sourceId: 'b', targetId: 'a' });
    expect(next.products[0]).toMatchObject({ quantity: 4, status: 'ok' });
  });
});

describe('nombre de cada uno', () => {
  it('cambia solo el nombre de esa persona', () => {
    const member = (user_id: string, display_name: string | null) =>
      ({ household_id: 'hh-1', user_id, role: 'member' as const, display_name, joined_at: at });
    const s = snapshot({ members: [member('u1', null), member('u2', 'Juan')] });
    const me = 'u1';
    const next = applyOp(s, { kind: 'set_member_name', id: 'n', at, userId: me, name: 'Sofía' });
    expect(next.members.map((x) => x.display_name)).toEqual(['Sofía', 'Juan']);
  });
});

describe('hay de sobra', () => {
  it('se quita solo cuando deja de haber', () => {
    const p = product({ id: 'sobra', status: 'ok' });
    const s = snapshot({ products: [p] });
    const marked = applyOp(s, { kind: 'update_product', id: 'u1', at: '2026-10-17T10:00:00Z', productId: p.id, patch: { surplus: true } } as never);
    expect(marked.products[0].surplus).toBe(true);
    const ok = applyOp(marked, { kind: 'set_status', id: 's1', at: '2026-10-17T11:00:00Z', productId: p.id, status: 'ok' } as never);
    expect(ok.products[0].surplus).toBe(true);
    const low = applyOp(marked, { kind: 'set_status', id: 's2', at: '2026-10-17T11:00:00Z', productId: p.id, status: 'low' } as never);
    expect(low.products[0].surplus).toBe(false);
  });
});
