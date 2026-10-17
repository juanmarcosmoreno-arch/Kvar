import { describe, expect, it } from 'vitest';
import {
  ftText,
  parseVtexCatalog,
  rankByQuery,
  realGtin,
  searchElDorado,
  searchElDoradoByEan,
  searchText,
} from '../../../supabase/functions/precios-web/eldorado';
import type { WebItem, WebSearch } from '../../../supabase/functions/precios-web/types';
import arrozRaw from './fixtures/precios-web/eldorado-search-arroz.json?raw';
import chorizoRaw from './fixtures/precios-web/eldorado-search-chorizo.json?raw';
import eanRaw from './fixtures/precios-web/eldorado-ean.json?raw';
import eanUpcRaw from './fixtures/precios-web/eldorado-ean-upc.json?raw';
import jabonRaw from './fixtures/precios-web/eldorado-search-jabon-en-polvo.json?raw';
import quesoRaw from './fixtures/precios-web/eldorado-search-queso.json?raw';

const BASE = 'https://www.eldorado.com.uy';
const parse = (raw: string) => parseVtexCatalog(JSON.parse(raw), 'el-dorado', BASE);
const byId = (raw: string, id: string) => parse(raw).find((x) => x.id === id);

/** Una copia de un producto de las respuestas guardadas, para cambiarle algo */
const copy = (raw: string, i = 0) => JSON.parse(raw)[i];

/** fetch de mentira: guarda los pedidos y contesta lo que se le diga */
function fakeFetch(reply: (url: string) => { status?: number; body: string }) {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    const r = reply(url);
    return new Response(r.body, { status: r.status ?? 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  return { impl, calls };
}

describe('El Dorado: leer el catálogo de VTEX', () => {
  it('un producto común, con código de barras y foto chica', () => {
    expect(byId(quesoRaw, '55068')).toEqual({
      chain: 'el-dorado',
      id: '55068',
      name: 'Queso Rallado Conaprole Sbriz Deshidratado 200gr',
      brand: 'CONAPROLE',
      ean: '7730105010026',
      price: 249.9,
      listPrice: null,
      perKg: false,
      url: 'https://www.eldorado.com.uy/queso-rallado-conaprole-sbriz-deshidratado-200gr/p',
      image: expect.stringMatching(/^https:\/\/eldoradouy\.vteximg\.com\.br\/arquivos\/ids\/\d+-300-300\//),
    });
  });

  it('lo que se vende por kilo: precio por kilo y sin el código de balanza', () => {
    // unitMultiplier 0.1 (se compra de a 100 g) pero el precio ya es por kilo: $589 el kilo de muzzarella
    const muzza = byId(quesoRaw, '8375');
    expect(muzza).toMatchObject({ name: 'Queso Conaprole Muzzarella Grande Kg', perKg: true, price: 589, listPrice: null, ean: null });
    // Paquete que se cobra al peso (0.66 kg), con oferta de la cadena
    expect(byId(chorizoRaw, '55745')).toMatchObject({ perKg: true, price: 360.45, listPrice: 404, ean: null });
  });

  it('saca el « .» del final del nombre', () => {
    expect(byId(quesoRaw, '1540')?.name).toBe('Queso Conaprole Cremoso Cuartirolo Kg.');
    expect(byId(quesoRaw, '7248')?.name).toBe('Queso Requeson Conaprole 250Gr');
  });

  it('EAN-8 reales sí; códigos internos y marcas de relleno no', () => {
    expect(byId(quesoRaw, '7248')?.ean).toBe('77309549');
    const conf = byId(arrozRaw, '17351');
    expect(conf).toMatchObject({ name: 'Conf. Arroz Con Leche Porcion', ean: null, brand: null, perKg: false, price: 99 });
  });

  it('ofertas de la cadena: precio de lista y promos como «20% OFF»', () => {
    expect(byId(arrozRaw, '47058')).toMatchObject({ name: 'Arroz Vida 1kg', price: 35, listPrice: 39.9 });
    expect(byId(arrozRaw, '1918')).toMatchObject({ name: 'Galleta Cerealitas Arroz 160Gr', price: 123.92, listPrice: 154.9 });
    expect(byId(arrozRaw, '1406')).toMatchObject({ price: 45, listPrice: null });
  });

  it('nunca un precio con descuento de tarjeta o banco', () => {
    const p = copy(arrozRaw, 3); // Cerealitas
    const o = p.items[0].sellers[0].commertialOffer;
    o.DiscountHighLight = [{ '<Name>k__BackingField': '25% OFF con Santander' }];
    o.Price = 116.18;
    o.ListPrice = 154.9;
    o.PriceWithoutDiscount = 154.9;
    expect(parseVtexCatalog([p], 'el-dorado', BASE)[0]).toMatchObject({ price: 154.9, listPrice: null });
    o.DiscountHighLight = [{ '<Name>k__BackingField': 'Itaú 15%' }];
    o.ListPrice = 180;
    expect(parseVtexCatalog([p], 'el-dorado', BASE)[0]).toMatchObject({ price: 154.9, listPrice: 180 });
  });

  it('saltea lo que no tiene precio ni stock, y al vendedor «Otros»', () => {
    const p = copy(quesoRaw, 2);
    const seller = p.items[0].sellers[0];
    p.items[0].sellers = [{ ...seller, sellerId: 'eldoradouy' }, { ...seller, commertialOffer: { ...seller.commertialOffer, Price: 0 } }];
    expect(parseVtexCatalog([p], 'el-dorado', BASE)).toEqual([]);
    p.items[0].sellers = [{ ...seller, commertialOffer: { ...seller.commertialOffer, AvailableQuantity: 0 } }];
    expect(parseVtexCatalog([p], 'el-dorado', BASE)).toEqual([]);
    p.items[0].sellers = [{ ...seller, commertialOffer: { ...seller.commertialOffer, IsAvailable: false } }];
    expect(parseVtexCatalog([p], 'el-dorado', BASE)).toEqual([]);
    // Si el primero no lo tiene, sirve el siguiente
    p.items[0].sellers = [{ ...seller, sellerId: 'eldoradouy' }, seller];
    expect(parseVtexCatalog([p], 'el-dorado', BASE)).toHaveLength(1);
  });

  it('no se cae con respuestas raras: saltea lo que no entiende', () => {
    expect(parseVtexCatalog(null, 'el-dorado', BASE)).toEqual([]);
    expect(parseVtexCatalog({ error: 'x' }, 'el-dorado', BASE)).toEqual([]);
    const good = copy(quesoRaw, 0);
    const odd = [null, 1, 'x', { items: 'no' }, { productName: 'Sin artículos' }, { items: [null, { itemId: '9' }] }, good];
    expect(parseVtexCatalog(odd, 'el-dorado', BASE).map((x) => x.id)).toEqual(['8375']);
  });

  it('no repite el mismo artículo', () => {
    const p = copy(quesoRaw, 0);
    expect(parseVtexCatalog([p, p], 'el-dorado', BASE)).toHaveLength(1);
  });

  it('productos con varios artículos: uno por artículo, con su nombre', () => {
    const p = copy(quesoRaw, 2);
    const a = p.items[0];
    p.items = [
      { ...a, itemId: '1', nameComplete: 'Queso Rallado 100gr' },
      { ...a, itemId: '2', nameComplete: 'Queso Rallado 200gr' },
    ];
    expect(parseVtexCatalog([p], 'el-dorado', BASE).map((x) => [x.id, x.name])).toEqual([
      ['1', 'Queso Rallado 100gr'],
      ['2', 'Queso Rallado 200gr'],
    ]);
  });

  it('sirve para otra cadena VTEX (el link con su web)', () => {
    const [x] = parseVtexCatalog([copy(quesoRaw, 1)], 'disco', 'https://www.disco.com.uy/');
    expect(x.chain).toBe('disco');
    expect(x.url).toBe('https://www.disco.com.uy/queso-rallado-conaprole-sbriz-deshidratado-200gr/p');
  });
});

describe('El Dorado: códigos de barras', () => {
  it('solo GTIN de verdad', () => {
    expect(realGtin('7730105005114')).toBe('7730105005114');
    expect(realGtin('77306456')).toBe('77306456');
    expect(realGtin('07730105005114')).toBe('7730105005114'); // GTIN-14 con cero adelante
    expect(realGtin('0000077306456')).toBe('77306456'); // EAN-8 rellenado a 13
    expect(realGtin('049000006346')).toBe('0049000006346'); // UPC-A
    expect(realGtin('2070300000008')).toBeNull(); // balanza
    expect(realGtin('2152800000006')).toBeNull(); // del local
    expect(realGtin('7730105005115')).toBeNull(); // dígito verificador mal
    expect(realGtin('1550000890358')).toBeNull(); // prefijo sin asignar
    expect(realGtin('0000000012344')).toBeNull(); // número corto rellenado
    expect(realGtin('20123451')).toBeNull(); // EAN-8 interno
    expect(realGtin('')).toBeNull();
    expect(realGtin(null)).toBeNull();
    expect(realGtin('77-30')).toBeNull();
  });
});

describe('El Dorado: buscar', () => {
  it('es un WebSearch', () => {
    const s: WebSearch = searchElDorado;
    expect(typeof s).toBe('function');
  });

  it('pide al buscador viejo con encabezados de navegador y lee la respuesta (206 también sirve)', async () => {
    const { impl, calls } = fakeFetch(() => ({ status: 206, body: quesoRaw }));
    const items = await searchElDorado('queso conaprole', { fetchImpl: impl, region: 'Montevideo' });
    expect(calls).toHaveLength(1);
    const url = new URL(calls[0].url);
    expect(url.origin + url.pathname).toBe('https://www.eldorado.com.uy/api/catalog_system/pub/products/search');
    expect(calls[0].url).toContain('ft=queso%20conaprole'); // con «+» responde 400
    expect(url.searchParams.get('_from')).toBe('0');
    expect(url.searchParams.get('_to')).toBe('39'); // pide de más: saltea los que no hay y reordena
    expect(url.searchParams.get('O')).toBe('OrderByScoreDESC');
    expect(calls[0].headers['User-Agent']).toMatch(/Mozilla/);
    expect(items.map((x) => x.id)).toEqual(['8375', '55068', '7248', '1540']);
  });

  it('respeta el máximo (y el tope de 50 de la web)', async () => {
    const { impl, calls } = fakeFetch(() => ({ body: quesoRaw }));
    expect(await searchElDorado('queso', { fetchImpl: impl, limit: 2 })).toHaveLength(2);
    expect(new URL(calls[0].url).searchParams.get('_to')).toBe('11');
    await searchElDorado('queso', { fetchImpl: impl, limit: 500 });
    expect(new URL(calls[1].url).searchParams.get('_to')).toBe('49');
  });

  it('limpia el texto (símbolos y apóstrofos) y no pide nada si queda vacío', async () => {
    expect(searchText("Hellmann's")).toBe('Hellmanns');
    // El punto entre números queda: con «1 5L» la web no encuentra nada
    expect(searchText('coca-cola 1.5L')).toBe('coca cola 1.5L');
    expect(searchText('Coca Cola 1,5 L')).toBe('Coca Cola 1.5 L');
    expect(searchText('Polakof S.A. 2. ...')).toBe('Polakof S A 2');
    expect(searchText('  azúcar  ')).toBe('azúcar');
    const { impl, calls } = fakeFetch(() => ({ body: '[]' }));
    expect(await searchElDorado(' +*! ', { fetchImpl: impl })).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it('sin palabras de enlace (con «en» la web trae cualquier cosa) y ordenado por las palabras buscadas', async () => {
    const { impl, calls } = fakeFetch(() => ({ body: jabonRaw }));
    const items = await searchElDorado('Jabón en polvo', { fetchImpl: impl, limit: 3 });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain('ft=Jab%C3%B3n%20polvo&');
    expect(items.map((x) => x.name)).toEqual([
      'Jabon En Polvo Granby Matic 3Kg',
      'Jugo Tang En Polvo Naranja Mango 15gr',
      'Jugo Tang En Polvo Naranja 15gr',
    ]);
  });

  it('si sin las palabras de enlace no hay nada, busca con el texto entero', async () => {
    const { impl, calls } = fakeFetch((url) => ({ body: url.includes('ft=comida%20perro&') ? '[]' : quesoRaw }));
    expect(await searchElDorado('comida para perro', { fetchImpl: impl })).toHaveLength(4);
    expect(calls.map((c) => new URL(c.url).searchParams.get('ft'))).toEqual(['comida perro', 'comida para perro']);
    // Si no hay palabras de enlace, un solo pedido aunque no encuentre nada
    const other = fakeFetch(() => ({ body: '[]' }));
    expect(await searchElDorado('xqzvbnmlkj', { fetchImpl: other.impl })).toEqual([]);
    expect(other.calls).toHaveLength(1);
  });

  it('tira error si la web falla (el que llama lo maneja)', async () => {
    const down = fakeFetch(() => ({ status: 500, body: 'x' }));
    await expect(searchElDorado('arroz', { fetchImpl: down.impl })).rejects.toThrow('500');
    expect(down.calls).toHaveLength(2); // probó una vez más
    const missing = fakeFetch(() => ({ status: 404, body: 'x' }));
    await expect(searchElDorado('arroz', { fetchImpl: missing.impl })).rejects.toThrow('404');
    expect(missing.calls).toHaveLength(1);
    await expect(searchElDorado('arroz', { fetchImpl: fakeFetch(() => ({ body: '<html>' })).impl })).rejects.toThrow();
  });

  it('un 500 suelto («The operation was canceled.») se arregla probando otra vez', async () => {
    let n = 0;
    const { impl, calls } = fakeFetch(() => (n++ === 0 ? { status: 500, body: '"The operation was canceled."' } : { status: 206, body: quesoRaw }));
    expect(await searchElDorado('queso', { fetchImpl: impl })).toHaveLength(4);
    expect(calls).toHaveLength(2);
  });
});

describe('El Dorado: el texto de búsqueda y el orden', () => {
  const item = (name: string, brand: string | null = null): WebItem => ({
    chain: 'el-dorado', id: name, name, brand, ean: null, price: 1, listPrice: null, perKg: false, url: BASE, image: null,
  });
  const names = (xs: WebItem[]) => xs.map((x) => x.name);

  it('saca las palabras de enlace, salvo que no quede otra cosa', () => {
    expect(ftText('jabón en polvo')).toBe('jabón polvo');
    expect(ftText('Arroz con leche')).toBe('Arroz leche');
    expect(ftText('yerba La Selva y mate')).toBe('yerba Selva mate');
    expect(ftText('dulce de leche')).toBe('dulce leche');
    expect(ftText('de la')).toBe('de la');
    expect(ftText('coca-cola 1,5 L')).toBe('coca cola 1.5 L');
  });

  it('primero lo que tiene todas las palabras; si empatan, como vino', () => {
    const got = rankByQuery([item('Leche Conaprole Entera 1Lt'), item('Postre Colonial Arroz Con Leche'), item('Arroz Vida 1kg')], 'arroz con leche');
    expect(names(got)).toEqual(['Postre Colonial Arroz Con Leche', 'Leche Conaprole Entera 1Lt', 'Arroz Vida 1kg']);
    // Sin tildes ni mayúsculas
    expect(names(rankByQuery([item('Te Negro Hornimans'), item('CAFE AGUILA 250Gr')], 'café'))).toEqual(['CAFE AGUILA 250Gr', 'Te Negro Hornimans']);
    // La marca cuenta
    expect(names(rankByQuery([item('Leche Entera 1Lt', 'SAINT'), item('Leche Entera Ultra 1Lt', 'CONAPROLE')], 'leche conaprole'))[0]).toBe('Leche Entera Ultra 1Lt');
    // Plurales
    expect(names(rankByQuery([item('Torta Maria'), item('Galletita Maria')], 'galletitas maria'))[0]).toBe('Galletita Maria');
    expect(names(rankByQuery([item('Barra Nesfit'), item('Cereal Nesfit')], 'cereales nesfit'))[0]).toBe('Cereal Nesfit');
  });

  it('el tamaño: «500 g» = «500Gr», pero «500» no es «5000» ni «1» es «1.5» o «10»', () => {
    const xs = [item('Dulce De Leche Conaprole Manjar 1Kg'), item('Dulce De Leche Conaprole 5000Gr'), item('Dulce De Leche Conaprole 500 Gr .')];
    expect(names(rankByQuery(xs, 'dulce de leche conaprole 500 g'))[0]).toBe('Dulce De Leche Conaprole 500 Gr .');
    expect(names(rankByQuery(xs, 'dulce leche conaprole 500g'))[0]).toBe('Dulce De Leche Conaprole 500 Gr .');
    const cocas = [item('Refresco Coca Cola 1.5 L'), item('Refresco Coca Cola 10 L'), item('Refresco Coca Cola 1 L')];
    expect(names(rankByQuery(cocas, 'coca cola 1 l'))[0]).toBe('Refresco Coca Cola 1 L');
    expect(names(rankByQuery(cocas, 'coca cola 1,5l'))[0]).toBe('Refresco Coca Cola 1.5 L');
  });

  it('con la respuesta real de «jabón en polvo» (que trae jugos primero)', () => {
    const got = rankByQuery(parse(jabonRaw), 'jabón en polvo');
    expect(got[0]).toMatchObject({ name: 'Jabon En Polvo Granby Matic 3Kg', price: 247, ean: '7791290795020', brand: 'GRANBY' });
    expect(got).toHaveLength(5);
    expect(rankByQuery([], 'x')).toEqual([]);
    expect(names(rankByQuery(parse(jabonRaw), 'de'))).toEqual(names(parse(jabonRaw)));
  });
});

describe('El Dorado: buscar por código de barras', () => {
  it('varios códigos en un pedido, solo los que son GTIN', async () => {
    const { impl, calls } = fakeFetch(() => ({ body: eanRaw }));
    const items = await searchElDoradoByEan(['7730114000728', '77306456', '07730105005435', '2070300000008', '7730114000728'], { fetchImpl: impl });
    expect(calls).toHaveLength(1);
    const fq = new URL(calls[0].url).searchParams.getAll('fq');
    expect(fq).toEqual(['alternateIds_Ean:7730114000728', 'alternateIds_Ean:77306456', 'alternateIds_Ean:7730105005435']);
    expect(items.map((x) => [x.ean, x.name, x.price])).toEqual([
      ['7730114000728', 'Arroz Vida 1kg', 35],
      ['7730105005435', 'Dulce De Leche Conaprole Manjar 1Kg', 179],
      ['77306456', 'Manteca Conaprole Salada 200Gr', 103],
    ]);
  });

  it('devuelve solo los artículos con los códigos pedidos y reparte en tandas', async () => {
    const { impl, calls } = fakeFetch(() => ({ body: eanRaw }));
    const items = await searchElDoradoByEan(['77306456'], { fetchImpl: impl });
    expect(items.map((x) => x.ean)).toEqual(['77306456']);
    // 30 códigos válidos → 2 pedidos
    const many = Array.from({ length: 30 }, (_, i) => {
      const body = `77301050${String(1000 + i)}`;
      for (let d = 0; d < 10; d++) if (realGtin(body + d)) return body + d;
      return '';
    });
    await searchElDoradoByEan(many, { fetchImpl: impl });
    expect(calls).toHaveLength(3);
    expect(new URL(calls[1].url).searchParams.getAll('fq')).toHaveLength(25);
    expect(new URL(calls[2].url).searchParams.getAll('fq')).toHaveLength(5);
  });

  it('los UPC-A (12 cifras) se piden también sin el 0, que es como los guarda la web', async () => {
    const { impl, calls } = fakeFetch(() => ({ body: eanUpcRaw }));
    const items = await searchElDoradoByEan(['737186521592'], { fetchImpl: impl });
    expect(new URL(calls[0].url).searchParams.getAll('fq')).toEqual(['alternateIds_Ean:0737186521592', 'alternateIds_Ean:737186521592']);
    expect(items).toHaveLength(1); // el dulce de leche de la respuesta no se pidió
    expect(items[0]).toMatchObject({ ean: '0737186521592', name: 'Grapamiel Rosa Negra Premium Cafe Botella 750cc', price: 1087 });
  });

  it('sin códigos válidos no pide nada', async () => {
    const { impl, calls } = fakeFetch(() => ({ body: '[]' }));
    expect(await searchElDoradoByEan(['2070300000008', 'abc'], { fetchImpl: impl })).toEqual([]);
    expect(calls).toHaveLength(0);
  });
});
