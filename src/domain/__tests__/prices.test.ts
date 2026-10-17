import { describe, expect, it } from 'vitest';
import { atStore, basketByStore, discountFor, priceTable, usualBasket, visibleLines, withDiscount, type StoreDiscount } from '../prices';
import { cheaperAt, type PurchaseLine } from '../spending';
import type { ShoppingItem } from '../types';
import { product } from './fixtures';

const now = new Date(2026, 9, 15, 12);
const at = (mo: number, d: number) => new Date(2026, mo - 1, d, 11).toISOString();
let n = 0;
const line = (product_id: string, store: string, price: number, when = at(10, 1), receipt = `${store}-${when}`): PurchaseLine => ({
  id: `l${n++}`, household_id: 'hh', product_id, name: product_id, quantity: 1, unit_price: price, total: price,
  store, bought_at: when, receipt_key: receipt,
});
const item = (product_id: string): ShoppingItem => ({
  id: `i-${product_id}`, household_id: 'hh', product_id, name: null, quantity: null, note: null, reason: 'manual',
  checked_at: null, checked_by: null, created_at: at(10, 1),
});
const disc = (over: Partial<StoreDiscount>): StoreDiscount => ({ id: 'd', store: 'disco', percent: 15, days: [], card: 'Itaú', cap: null, ...over });

const products = ['yerba', 'cafe', 'aceite', 'leche'].map((id) => product({ id, name: id[0].toUpperCase() + id.slice(1) }));

// Dos compras en cada súper (para que todo sea «lo de siempre»)
const lines = [
  ...[at(9, 1), at(10, 1)].flatMap((d) => [
    line('yerba', 'Disco', 300, d), line('cafe', 'Disco', 400, d), line('aceite', 'Disco', 200, d), line('leche', 'Disco', 50, d),
  ]),
  ...[at(9, 8), at(10, 8)].flatMap((d) => [
    line('yerba', 'Tienda Inglesa', 330, d), line('cafe', 'Tienda Inglesa', 300, d), line('aceite', 'Tienda Inglesa', 210, d),
  ]),
];

describe('descuentos', () => {
  const ds = [disc({ id: 'mar', days: [2], percent: 20 }), disc({ id: 'siempre', percent: 5 }), disc({ id: 'otro', store: 'tata', percent: 50 })];
  it('el mejor descuento del día', () => {
    expect(discountFor(ds, 'disco', 2)?.id).toBe('mar');
    expect(discountFor(ds, 'disco', 3)?.id).toBe('siempre');
    expect(discountFor(ds, 'disco', 'best')?.id).toBe('mar');
    expect(discountFor(ds, 'disco', 'none')).toBeNull();
    expect(discountFor(ds, 'tienda-inglesa', 2)).toBeNull();
    expect(withDiscount(200, ds[0])).toBe(160);
  });
});

describe('comparador', () => {
  it('ordena por lo que pagás con el descuento', () => {
    const plain = priceTable(lines, products, { discounts: [], when: 'none', now });
    const yerba = plain.find((r) => r.product.id === 'yerba')!;
    expect(yerba.offers.map((o) => o.store)).toEqual(['disco', 'tienda-inglesa']);
    const cafe = priceTable(lines, products, { discounts: [disc({ percent: 30 })], when: 2, now }).find((r) => r.product.id === 'cafe')!;
    // 400 − 30 % = 280 < 300
    expect(cafe.offers[0]).toMatchObject({ store: 'disco', effective: 280, price: 400 });
    expect(cafe.saving).toBeCloseTo(1 - 280 / 300, 5);
  });

  it('sin los súper que no se comparan', () => {
    expect(visibleLines(lines, new Set(['disco'])).every((l) => l.store === 'Tienda Inglesa')).toBe(true);
  });

  it('la lista usa los descuentos', () => {
    expect(cheaperAt(lines, now).get('cafe')?.store).toBe('tienda-inglesa');
    expect(cheaperAt(lines, now, (s, p) => (s === 'disco' ? p * 0.7 : p)).get('cafe')?.store).toBe('disco');
  });
});

describe('tu canasta', () => {
  it('lo que se compra seguido', () => {
    expect([...usualBasket(lines, now).keys()].sort()).toEqual(['aceite', 'cafe', 'leche', 'yerba']);
    expect(usualBasket([line('cafe', 'Disco', 1)], now).size).toBe(0);
  });

  it('estima lo que falta según lo caro que es el súper', () => {
    const b = basketByStore(lines, { discounts: [], when: 'none', now });
    expect(b.items).toBe(4);
    const disco = b.stores.find((s) => s.store === 'disco')!;
    const ti = b.stores.find((s) => s.store === 'tienda-inglesa')!;
    expect(disco.total).toBe(950);
    expect(disco.known).toBe(4);
    expect(ti.known).toBe(3);
    // Leche no tiene precio en TI: se estima con su promedio frente al más barato
    const ratio = (330 / 300 + 300 / 300 + 210 / 200) / 3;
    expect(ti.total).toBeCloseTo(330 + 300 + 210 + 50 * ratio, 5);
    expect(b.stores[0].store).toBe('tienda-inglesa');
  });

  it('el descuento respeta el tope', () => {
    const b = basketByStore(lines, { discounts: [disc({ percent: 20, cap: 100 })], when: 3, now });
    const disco = b.stores.find((s) => s.store === 'disco')!;
    expect(disco.saved).toBe(100);
    expect(disco.total).toBe(850);
    expect(b.stores[0].store).toBe('disco');
  });
});

describe('estoy en el súper', () => {
  it('qué llevar acá, qué en otro lado y qué aprovechar', () => {
    const r = atStore(lines, products, [item('yerba'), item('cafe'), item('leche')], 'disco', { discounts: [], when: 3, now });
    expect(r.buyHere.map((x) => x.productId)).toEqual(['yerba']);
    expect(r.elsewhere.map((x) => x.productId)).toEqual(['cafe']);
    expect(r.elsewhere[0].other.store).toBe('tienda-inglesa');
    // El aceite no está en la lista y en Disco sale apenas menos: no alcanza para «aprovechá»
    expect(r.deals).toEqual([]);
    const ti = atStore(lines, products, [], 'tienda-inglesa', { discounts: [], when: 3, now });
    expect(ti.deals.map((x) => x.productId)).toEqual(['cafe']);
  });

  it('con el descuento de hoy cambia el consejo', () => {
    const r = atStore(lines, products, [item('cafe')], 'disco', { discounts: [disc({ percent: 30, days: [2] })], when: 2, now });
    expect(r.buyHere.map((x) => x.productId)).toEqual(['cafe']);
  });
});
