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
