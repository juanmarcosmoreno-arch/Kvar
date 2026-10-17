import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  fetchGduProduct,
  gduEan,
  gduQuery,
  parseGduPrices,
  parseGduProduct,
  parseGduSearch,
  searchGdu,
} from '../../../supabase/functions/precios-web/gdu';
import type { WebSearch } from '../../../supabase/functions/precios-web/types';

// Páginas reales (recortadas a unas pocas tarjetas) de las webs de Disco, Devoto y Géant, 17/10/2026
const page = (name: string) => readFileSync(resolve(__dirname, 'fixtures/precios-web', name), 'utf8');
const discoSkip = page('gdu-disco-search-skip.html');
const discoArroz = page('gdu-disco-search-arroz.html');
const discoEmpty = page('gdu-disco-search-empty.html');
const devotoConaprole = page('gdu-devoto-search-conaprole.html');
const devotoLeche = page('gdu-devoto-search-leche.html');
const geantPollo = page('gdu-geant-search-pollo.html');
const discoSkipProduct = page('gdu-disco-product-707897.html');
const geantPolloProduct = page('gdu-geant-product-110367.html');
const geantYerbaProduct = page('gdu-geant-product-774699.html');

// Cumple el contrato de los lectores
const asWebSearch: WebSearch = searchGdu('disco');

const html = (body: string, status = 200) => new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

describe('Disco / Devoto / Géant: tarjetas de la búsqueda', () => {
  it('precio de góndola y el de antes de la oferta de la cadena, sin el de Santander', () => {
    const items = parseGduSearch(discoSkip, 'disco', 'www.disco.com.uy');
    expect(items.map((x) => x.id)).toEqual(['707897', '353708', '707894']);
    // $507 antes, $359 ahora y $323 «Hiper Más Santander 10%OFF»
    expect(items[0]).toEqual({
      chain: 'disco',
      id: '707897',
      name: 'Detergente Skip Líquido Diluido doy pack 3 L',
      brand: 'SKIP',
      ean: null,
      price: 359,
      listPrice: 507,
      perKg: false,
      url: 'https://www.disco.com.uy/product/detergente-skip-liquido-diluido-doy-pack-3-l/707897',
      // La foto del producto, no la cucarda de la promo
      image: 'https://gdu-multimedia.azurewebsites.net/api/gdu/multimedia/3656687c-8f5a-41d3-9bfc-d038a2b60ee1/content',
    });
    expect(items[1]).toMatchObject({ name: 'Deter Líquido SKIP Cuidado Activo 800 cc.', price: 368, listPrice: null, perKg: false });
  });

  it('oferta sin precio de tarjeta, y lo que la búsqueda trae aunque no sea lo buscado', () => {
    const items = parseGduSearch(discoArroz, 'disco', 'https://www.disco.com.uy/');
    expect(items.map((x) => [x.name, x.price, x.listPrice])).toEqual([
      ['Arroz patna BLUE PATNA 5 kg', 229, 295],
      ['Arroz blanco SAMAN 1 kg', 60, null],
      ['Aceite de arroz SAMAN 900 ml', 155, null],
    ]);
    expect(items[0].url).toBe('https://www.disco.com.uy/product/arroz-patna-blue-patna-5-kg/521102');
  });

  it('el precio con tarjeta solo no es una oferta; los pesables van por kilo', () => {
    const items = parseGduSearch(devotoConaprole, 'devoto', 'www.devoto.com.uy');
    expect(items.map((x) => [x.name, x.price, x.listPrice, x.perKg])).toEqual([
      // $98, Santander $78: no es oferta de Devoto
      ['Helado Máxima CONAPROLE', 98, null, false],
      // «$ 595 / kg» y $30 la porción de 50 g
      ['Queso Cuartirolo CONAPROLE 50 g', 595, null, true],
      ['Manteca salada CONAPROLE 100 g', 65, null, false],
    ]);
    expect(items.every((x) => x.chain === 'devoto' && x.url.startsWith('https://www.devoto.com.uy/product/'))).toBe(true);
  });

  it('precios con decimales (con coma)', () => {
    const items = parseGduSearch(devotoLeche, 'devoto', 'www.devoto.com.uy');
    expect(items.map((x) => [x.name, x.price])).toEqual([
      ['Leche fresca entera CONAPROLE 1 L', 45.2],
      ['Leche entera CONAPROLE larga vida 1 L', 78],
    ]);
  });

  it('pesable en oferta: el kilo de antes y el de ahora; marcas «-» no son marcas', () => {
    const items = parseGduSearch(geantPollo, 'geant', 'www.geant.com.uy');
    // $655 → $529 el kilo, $662 la bandeja, Santander $596
    expect(items[0]).toMatchObject({ id: '110367', name: 'Pollo spiedo en bandeja x 1,25 kg', price: 529, listPrice: 655, perKg: true, brand: null });
    expect(items[1]).toMatchObject({ name: 'Pollo sin Menudos y sin piel x 2 kg', price: 299, listPrice: null, perKg: true, brand: null });
    expect(items[2]).toMatchObject({ name: 'Ravioles AVANTI Pollo Grillado 500 g', price: 321, perKg: false, brand: 'AVANTI' });
    // MAGGI $130 con Santander 20%OFF $104
    expect(items[3]).toMatchObject({ brand: 'MAGGI', price: 130, listPrice: null });
  });

  it('sin resultados, o una página que no es la de búsqueda', () => {
    expect(parseGduSearch(discoEmpty, 'disco', 'www.disco.com.uy')).toEqual([]);
    // Si la página de «No se encontraron productos» trae sugerencias, no son resultados
    const suggested =
      '<div class="product-item"><h3><a href="/product/sugerido/123">Sugerido</a></h3><div class="desc-prices"><div class="product-prices"><div class="price"><div class="text"><span class="val">99</span></div></div></div></div></div>';
    expect(parseGduSearch(discoEmpty.replace('<footer', `${suggested}<footer`), 'disco', 'www.disco.com.uy')).toEqual([]);
    expect(parseGduSearch('', 'disco', 'www.disco.com.uy')).toEqual([]);
    expect(parseGduSearch('<html>Service Unavailable</html>', 'disco', 'www.disco.com.uy')).toEqual([]);
  });

  it('una tarjeta rara se saltea; los carruseles fuera de la lista no cuentan', () => {
    const card = (sku: string, prices: string) =>
      `<div class="product-item"><figure><a href="/product/p-${sku}/${sku}"><img src="/img/${sku}.png"></a></figure><div class="prod-desc"><div class="desc-top"><h3><a href="/product/p-${sku}/${sku}">Producto &amp; c&#xED;a ${sku}</a></h3></div><div class="desc-prices">${prices}</div><div class="prod-labels"></div></div><div class="prod-add"></div></div>`;
    const price = (n: string) => `<div class="product-prices "><div class="price"><div class="text"><span class="mon">$</span><span class="val">${n}</span></div></div></div>`;
    const bankOnly = `<div class="product-prices"><div class="price dcto santander"><div class="text"><span class="mon">$</span><span class="val">80</span></div><div class="lbl-dcto"></div></div></div>`;
    const doc =
      card('1', price('99')) + // carrusel de arriba: no es resultado
      '<div id="lista-productos" class="products-grid-list">' +
      card('2', price('1.234')) +
      card('3', '') + // sin precio
      card('4', bankOnly) + // solo el de la tarjeta
      card('5', price('abc')) +
      card('2', price('50')) + // repetido
      card('6', price('29,90')) +
      card('8', price('1.234,50')) +
      card('9', price('12,5,0')) +
      '</div><footer id="footer">' +
      card('7', price('10')) +
      '</footer>';
    const items = parseGduSearch(doc, 'geant', 'www.geant.com.uy');
    expect(items.map((x) => [x.id, x.name, x.price])).toEqual([
      ['2', 'Producto & cía 2', 1234],
      ['6', 'Producto & cía 6', 29.9],
      ['8', 'Producto & cía 8', 1234.5],
    ]);
    expect(items[0].image).toBe('https://www.geant.com.uy/img/2.png');
  });

  it('bloques de precio', () => {
    const block = (inner: string, cls = '') => `<div class="product-prices ${cls}"><div class="price">${inner}</div></div>`;
    const val = (n: string, unit = '') => `<div class="text"><span class="mon">$</span><span class="val">${n}</span>${unit ? `<span class="mon"> / ${unit}</span>` : ''}</div>`;
    const before = (n: string) => `<div class="before"><span class="mon">$</span><span class="val">${n}</span></div>`;
    expect(parseGduPrices(block(before('120') + val('100')))).toEqual({ price: 100, listPrice: 120, perKg: false });
    // «Antes» igual o más barato que ahora: no es oferta
    expect(parseGduPrices(block(before('100') + val('100')))).toEqual({ price: 100, listPrice: null, perKg: false });
    // Un precio por 100 g o por litro es de referencia: va el de la unidad de venta
    expect(parseGduPrices(block(val('45', '100 g')) + block(val('90')))).toEqual({ price: 90, listPrice: null, perKg: false });
    // En la página del producto la clase de pesable está en el mismo bloque
    expect(parseGduPrices(block(val('529', 'kg'), 'product-price-weighable') + block(before('819') + val('662')))).toEqual({
      price: 529,
      listPrice: null,
      perKg: true,
    });
    expect(parseGduPrices('<div class="product-prices"><div class="price dcto itau"><div class="text"><span class="val">70</span></div></div></div>')).toBeNull();
    expect(parseGduPrices('')).toBeNull();
  });
});

describe('Disco / Devoto / Géant: página del producto', () => {
  it('código de barras del JSON-LD, precio sin Santander y el de antes', () => {
    expect(parseGduProduct(discoSkipProduct)).toEqual({
      id: '707897',
      name: 'Detergente Skip Líquido Diluido doy pack 3 L',
      brand: 'SKIP',
      ean: '7791290010079',
      price: 359,
      listPrice: 507,
      perKg: false,
      inStock: true,
      url: 'https://www.disco.com.uy/product/detergente-skip-liquido-diluido-doy-pack-3-l/707897',
      image: expect.stringMatching(/^https:\/\/gdu-multimedia\.azurewebsites\.net\/api\/gdu\/multimedia\//),
    });
  });

  it('pesable con código de balanza (no es EAN) y producto sin gtin', () => {
    // gtin 00000026406404: código del local
    expect(parseGduProduct(geantPolloProduct)).toMatchObject({ id: '110367', ean: null, price: 529, listPrice: 655, perKg: true, brand: null });
    expect(parseGduProduct(geantYerbaProduct)).toMatchObject({ id: '774699', name: 'Yerba ARMIÑO Suave 200 g', brand: 'ARMIÑO', ean: null, price: 40, listPrice: null });
  });

  it('sin JSON-LD del producto (la web redirige los que no existen)', () => {
    expect(parseGduProduct(discoEmpty)).toBeNull();
    expect(parseGduProduct('<script type="application/ld&#x2B;json">{roto</script>')).toBeNull();
    const ld = (o: object) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;
    expect(parseGduProduct(ld({ '@type': 'Organization', name: 'Disco' }))).toBeNull();
    expect(
      parseGduProduct(ld({ '@graph': [{ '@type': 'Product', name: 'Agua 2 L', sku: '9', gtin13: '7730400000012', offers: { price: '45.50', availability: 'https://schema.org/OutOfStock' } }] })),
    ).toMatchObject({ id: '9', price: 45.5, ean: '7730400000012', inStock: false });
  });

  it('códigos de barras de verdad', () => {
    expect(gduEan('07791290010079')).toBe('7791290010079');
    expect(gduEan('07730114000148')).toBe('7730114000148');
    // EAN-8 guardado como GTIN-14
    expect(gduEan('00000077306494')).toBe('77306494');
    // De balanza / del local
    expect(gduEan('00000026850672')).toBeNull();
    expect(gduEan('00000020433031')).toBeNull();
    expect(gduEan('2000000000015')).toBeNull();
    expect(gduEan('0012345678905')).toBe('0012345678905');
    // Dígito verificador mal, cortos, raros
    expect(gduEan('07791290010078')).toBeNull();
    expect(gduEan('00000000012345')).toBeNull();
    expect(gduEan('')).toBeNull();
    expect(gduEan(undefined)).toBeNull();
    expect(gduEan('7791290010079x')).toBeNull();
  });
});

describe('Disco / Devoto / Géant: pedir a la web', () => {
  /** Un fetch de mentira que anota lo que se pidió */
  const fakeFetch = (body: string, status = 200) => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return html(body, status);
    }) as typeof fetch;
    return { fetchImpl, calls };
  };

  it('busca en la web de la cadena con encabezados de navegador', async () => {
    const { fetchImpl, calls } = fakeFetch(geantPollo);
    const items = await searchGdu('geant')('pollo spiedo', { fetchImpl, region: 'Salto' });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://www.geant.com.uy/productos/keyword/pollo%20spiedo');
    expect((calls[0].init?.headers as Record<string, string>)['User-Agent']).toMatch(/Mozilla/);
    expect(items).toHaveLength(4);
    expect(items.every((x) => x.chain === 'geant')).toBe(true);
  });

  it('tope de resultados, textos raros y búsqueda vacía', async () => {
    const { fetchImpl, calls } = fakeFetch(discoSkip);
    expect(await searchGdu('disco')('skip', { fetchImpl, limit: 2 })).toHaveLength(2);
    expect(await searchGdu('devoto')(' leche/entera  ñ ', { fetchImpl, limit: 50 })).toHaveLength(3);
    // «/» en la dirección da 404 en la web
    expect(calls[1].url).toBe('https://www.devoto.com.uy/productos/keyword/leche%20entera%20%C3%B1');
    expect(await asWebSearch('   ', { fetchImpl })).toEqual([]);
    expect(await asWebSearch('..', { fetchImpl })).toEqual([]);
    expect(calls).toHaveLength(2);
    expect(gduQuery('a?b#c%d\\e')).toBe('a b c d e');
  });

  it('«+» y emojis no rompen la dirección', async () => {
    const { fetchImpl, calls } = fakeFetch(discoSkip);
    // «+» da 404 en la web, aunque vaya como %2B
    expect(gduQuery('leche+cacao')).toBe('leche cacao');
    await searchGdu('geant')('pañales C+', { fetchImpl });
    expect(calls[0].url).toBe('https://www.geant.com.uy/productos/keyword/pa%C3%B1ales%20C');
    // El tope de 100 caracteres no corta un emoji por la mitad, y un medio emoji suelto se saca
    const long = `${'a'.repeat(99)}😀b`;
    expect(Array.from(gduQuery(long))).toHaveLength(100);
    await expect(searchGdu('disco')(long, { fetchImpl })).resolves.toHaveLength(3);
    await expect(searchGdu('disco')('yerba \uD83D', { fetchImpl })).resolves.toHaveLength(3);
    expect(calls[2].url).toBe('https://www.disco.com.uy/productos/keyword/yerba');
  });

  it('error de la web: tira error (lo maneja quien llama)', async () => {
    await expect(searchGdu('disco')('yerba', { fetchImpl: fakeFetch('Bad gateway', 502).fetchImpl })).rejects.toThrow(/Disco respondió 502/);
    const down = vi.fn(async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    await expect(searchGdu('geant')('yerba', { fetchImpl: down })).rejects.toThrow(/fetch failed/);
  });

  it('un producto por SKU, con su código de barras', async () => {
    const { fetchImpl, calls } = fakeFetch(discoSkipProduct);
    const item = await fetchGduProduct('disco', '707897', { fetchImpl });
    expect(calls[0].url).toBe('https://www.disco.com.uy/product/x/707897');
    expect(item).toMatchObject({
      chain: 'disco',
      id: '707897',
      ean: '7791290010079',
      price: 359,
      listPrice: 507,
      url: 'https://www.disco.com.uy/product/detergente-skip-liquido-diluido-doy-pack-3-l/707897',
    });

    expect(await fetchGduProduct('geant', '/product/x/1', fakeFetch('', 404))).toBeNull();
    // Los que no existen redirigen a una página sin el producto
    expect(await fetchGduProduct('geant', '99999991', fakeFetch(discoEmpty))).toBeNull();
    // Otra web: no se pide
    const other = fakeFetch(discoSkipProduct);
    expect(await fetchGduProduct('disco', 'https://evil.example/product/x/1', other)).toBeNull();
    expect(other.calls).toHaveLength(0);
  });
});
