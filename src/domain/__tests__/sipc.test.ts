import { describe, expect, it } from 'vitest';
import { chainOf, parsePriceCell, parsePriceTable } from '../../../supabase/functions/precios-uy/index';
import { atStore, basketByStore, discountFor } from '../prices';
import { cheaperAt } from '../spending';
import { chainOfKey, itemKey, itemLabel, matchItems, matchProducts, sipcLines, sipcStoreKey, type SipcData } from '../sipc';
import { product } from './fixtures';

const items = [
  'Arroz blanco - Vidarroz, 1.0',
  'Arroz Blanco - Aruba , 1.0',
  'Yerba mate común Canarias, 1.0',
  'Yerba mate común Baldo, 1.0',
  'Dulce de leche envasado Conaprole, 1.0',
  'Pan de molde blanco lacteado Bimbo, 330.0',
  'Pañales Babysec Premium Extra Extra Grande, 48.0',
  'Aceite de girasol - Óptimo, 900.0',
  'Huevos colorados El Jefe, 6.0',
];

describe('precios.uy: relacionar productos', () => {
  it('todas las palabras del producto y que sea lo que es el artículo', () => {
    expect(matchItems('Yerba', items)).toEqual(['Yerba mate común Baldo, 1.0', 'Yerba mate común Canarias, 1.0']);
    expect(matchItems('Yerba Canarias', items)).toEqual(['Yerba mate común Canarias, 1.0']);
    expect(matchItems('Leche', items)).toEqual([]);
    expect(matchItems('Pan', items)).toEqual(['Pan de molde blanco lacteado Bimbo, 330.0']);
    expect(matchItems('Huevos', items)).toEqual(['Huevos colorados El Jefe, 6.0']);
    expect(matchItems('aceite de girasol', items)).toEqual(['Aceite de girasol - Óptimo, 900.0']);
  });

  it('el mismo artículo escrito distinto', () => {
    expect(itemKey('Arroz Blanco - Aruba , 1.0')).toBe(itemKey('Arroz blanco - Aruba, 1.0'));
    expect(itemLabel('Arroz blanco - Vidarroz, 1.0')).toBe('Arroz blanco Vidarroz');
    expect(itemLabel('Aceite de girasol - Óptimo, 900.0')).toBe('Aceite de girasol Óptimo 900');
  });

  const data: SipcData = {
    at: '2026-10-17T10:00:00Z',
    stores: [
      { id: 37, name: 'Disco CHUCARRO', chain: 'disco', address: '', lat: 0, lng: 0 },
      { id: 164, name: 'Ta - Ta Rivera', chain: 'tata', address: '', lat: 0, lng: 0 },
    ],
    prices: {
      37: [
        { name: 'Yerba mate común Canarias, 1.0', price: 300, offer: false, date: '2026-10-17' },
        { name: 'Yerba mate común Baldo, 1.0', price: 250, offer: false, date: '2026-10-17' },
        { name: 'Arroz blanco - Vidarroz, 1.0', price: 50, offer: true, date: '2026-10-17' },
      ],
      164: [
        { name: 'Yerba mate común Canarias, 1.0', price: 270, offer: false, date: '2026-10-17' },
        { name: 'Arroz Blanco - Vidarroz , 1.0', price: 60, offer: false, date: '2026-10-17' },
      ],
    },
  };
  const products = [product({ id: 'y', name: 'Yerba' }), product({ id: 'a', name: 'Arroz' }), product({ id: 'l', name: 'Leche' })];

  it('compara la misma marca en todos lados (la que está en más súper)', () => {
    const matches = matchProducts(products, data, {});
    expect(matches.map((x) => [x.product.id, x.itemName])).toEqual([
      ['y', 'Yerba mate común Canarias, 1.0'],
      ['a', 'Arroz blanco - Vidarroz, 1.0'],
    ]);
    // Elegida a mano: Baldo (solo en Disco)
    expect(matchProducts(products, data, { y: itemKey('Yerba mate común Baldo, 1.0') })[0].itemName).toBe('Yerba mate común Baldo, 1.0');
  });

  it('precios de hoy como líneas: el comparador y los descuentos de la cadena', () => {
    const lines = sipcLines(data, matchProducts(products, data, {}));
    expect(lines).toHaveLength(4);
    expect(cheaperAt(lines).get('y')).toMatchObject({ store: 'tata-sipc-164' });
    expect(cheaperAt(lines).get('a')).toMatchObject({ store: 'disco-sipc-37' });
    expect(chainOfKey(sipcStoreKey(data.stores[0]))).toBe('disco');
    const discounts = [{ id: 'd', store: 'disco', percent: 20, days: [], card: '', cap: null }];
    expect(discountFor(discounts, 'disco-sipc-37', 3)?.id).toBe('d');
    // 300 − 20 % = 240 < 270
    const r = atStore(lines, products, [], 'disco-sipc-37', { discounts, when: 3 });
    expect(r.deals.map((x) => x.productId)).toEqual(['a', 'y']);
    const basket = basketByStore(lines, { discounts: [], when: 'none', basket: new Map([['y', 1], ['a', 2]]) });
    expect(basket.stores.map((s) => [s.store, s.total])).toEqual([['tata-sipc-164', 390], ['disco-sipc-37', 400]]);
  });
});

describe('precios.uy: leer la página', () => {
  it('celda de precio', () => {
    expect(parsePriceCell('oferta - $30.0 - 17/10/26')).toEqual({ price: 30, offer: true, date: '2026-10-17' });
    expect(parsePriceCell('El Clon | Requena $1185.0 - 16/10/26')).toEqual({ price: 1185, offer: false, date: '2026-10-16' });
    expect(parsePriceCell('—')).toBeNull();
  });

  it('tabla de precios', () => {
    const xml = `<tbody><tr data-ri="0" class="x"><td role="gridcell"><span class="ui-column-title">Artículo</span>Margarina - Adorita, Pote 250.0</td><td>oferta - $30.0 - 17/10/26</td></tr>
      <tr data-ri="1"><td>Jab&oacute;n &amp; co, 125.0</td><td>$42.0 - 17/10/26</td></tr></tbody>`;
    expect(parsePriceTable(xml)).toEqual([
      { name: 'Margarina - Adorita, Pote 250.0', price: 30, offer: true, date: '2026-10-17' },
      { name: 'Jab&oacute;n & co, 125.0', price: 42, offer: false, date: '2026-10-17' },
    ]);
  });

  it('cadena de cada local', () => {
    expect(chainOf('Disco  AYACUCHO')).toBe('disco');
    expect(chainOf('Ta - Ta  Rivera ')).toBe('tata');
    expect(chainOf('Tienda Inglesa Pocitos')).toBe('tienda-inglesa');
    expect(chainOf('Kinko KINKO 1')).toBe('kinko');
    expect(chainOf('Micromacro 21 de Setiembre')).toBe('micromacro');
    expect(chainOf('Super Ariel 4')).toBe('super-ariel');
  });
});
