import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WebSearch } from '../../../supabase/functions/precios-web/types';
import { departmentSellers, parseTataProducts, realEan, searchTata } from '../../../supabase/functions/precios-web/tata';
import { DEPARTMENTS } from '../sipc';

// Respuestas reales (recortadas: algunos productos y una foto por producto) de la búsqueda de www.tata.com.uy
// (GET /api/graphql?operationName=ProductsQuery), 17/10/2026
const fixture = (name: string) => JSON.parse(readFileSync(resolve(__dirname, 'fixtures/precios-web', name), 'utf8'));
const ddlMontevideo = fixture('tata-dulce-de-leche-montevideo.json');
// Zona Mercedes (dos vendedores): los mismos precios que mostró la web en el navegador al elegir «Mercedes»
const ddlMercedes = fixture('tata-dulce-de-leche-mercedes.json');
const pollo = fixture('tata-pollo-montevideo.json');
const dambo = fixture('tata-dambo-montevideo.json');
const lecheMontevideo = fixture('tata-leche-montevideo.json');
// Con una zona que no existe la web no da error: trae solo electro
const zonaRota = fixture('tata-leche-zona-rota.json');

const MONTEVIDEO = 'tatauymontevideo';
const MERCEDES = 'tatauycolonia;tatauymercedes';
// regionId que arma la web al elegir cada localidad
const MVD_ID = 'U1cjdGF0YXV5bW9udGV2aWRlbw==';
const MERCEDES_ID = 'U1cjdGF0YXV5Y29sb25pYTt0YXRhdXltZXJjZWRlcw==';
const TYT_ID = 'U1cjdGF0YXV5bWluYXM7dGF0YXV5dHJlaW50YXl0cmVz';

// Cumple el contrato de los lectores
const asWebSearch: WebSearch = searchTata;

type Node = Record<string, unknown>;
const nodesOf = (json: { data: { search: { products: { edges: { node: Node }[] } } } }) => json.data.search.products.edges.map((e) => e.node);
const wrap = (...nodes: unknown[]) => ({ data: { search: { products: { pageInfo: { totalCount: nodes.length }, edges: nodes.map((node) => ({ node })) } } } });
/** Un producto real (Dulce De Leche Los Nietitos 1 Kg, 195 antes 229) con cambios */
const nietitos = nodesOf(ddlMontevideo)[1];
const offer = (price: unknown, listPrice: unknown, availability = 'https://schema.org/InStock') => ({
  lowPrice: price,
  offers: [{ availability, price, listPrice, quantity: 10000, seller: { identifier: '1' } }],
});
const weighed = (sku: string, unitMultiplier: number, price: number, listPrice: number) => ({
  ...nietitos,
  id: sku,
  sku,
  slug: `queso-x-${sku}`,
  measurementUnit: 'kg',
  unitMultiplier,
  offers: offer(price, listPrice),
});

describe('Ta-Ta: productos de la búsqueda', () => {
  it('Montevideo: precio de góndola, oferta de la cadena, marca y página', () => {
    const items = parseTataProducts(ddlMontevideo);
    expect(items.map((x) => [x.name, x.price, x.listPrice])).toEqual([
      ['Dulce De Leche Manjar Conaprole 1 Kg', 196, null],
      ['Dulce De Leche Los Nietitos 1 Kg', 195, 229],
      ['Dulce De Leche Conaprole Común 500 G', 109, 115],
      ['Dulce De Leche TaTa 1 Kg', 178, null],
      ['Dulce De Leche Doña Elvira 900 G', 163, null],
      ['Dulce De Leche TaTa 500 g', 107, null],
      ['Dulce De Leche Los Nietitos 500 G', 138, null],
      ['Dulce De Leche Los Nietitos 0% Azúcar 500 G', 209, 235],
      ['Leche Chocolatada Conaprole Colet Dulce De Leche 1 L', 118, null],
      ['Dulce De Leche Puerto Del Sauce 900 G', 125, 179],
    ]);
    expect(items[1]).toEqual({
      chain: 'tata',
      id: '385',
      name: 'Dulce De Leche Los Nietitos 1 Kg',
      brand: 'Los Nietitos',
      // La búsqueda de la web no trae el código de barras (su gtin es un código interno)
      ean: null,
      price: 195,
      listPrice: 229,
      perKg: false,
      url: 'https://www.tata.com.uy/dulce-de-leche-los-nietitos-1-kg/p',
      image: expect.stringMatching(/^https:\/\/tatauy\.vtexassets\.com\/arquivos\/ids\//),
    });
    expect(items.every((x) => x.ean === null && !x.perKg)).toBe(true);
  });

  it('otra zona, otros precios (Mercedes son dos vendedores)', () => {
    const price = (json: unknown) => Object.fromEntries(parseTataProducts(json).map((x) => [x.id, [x.price, x.listPrice]]));
    const mvd = price(ddlMontevideo);
    const mer = price(ddlMercedes);
    // Manjar Conaprole 1 kg, TaTa 1 kg, Doña Elvira, TaTa 500 g, Los Nietitos 500 g
    expect(['3181', '1335', '3183', '8315', '3187'].map((id) => [mvd[id], mer[id]])).toEqual([
      [[196, null], [188, null]],
      [[178, null], [172, null]],
      [[163, null], [154, null]],
      [[107, null], [104, null]],
      [[138, null], [140, null]],
    ]);
    // Las ofertas de Ta-Ta son iguales en las dos
    expect([mvd['385'], mer['385'], mvd['378'], mer['378']]).toEqual([[195, 229], [195, 229], [109, 115], [109, 115]]);
    expect(mer['377']).toEqual([130, null]);
  });

  it('pesables: el precio por kilo que muestra la web, con la oferta por kilo', () => {
    // La web: «1/4 Muslo… 440 g: antes $ 127,16, $ 109,56 ( $ 249,00 x kg ) -14 %»; «Patitas… 620 g: $ 185,38 ( $ 299,00 x kg )»
    expect(parseTataProducts(pollo).map((x) => [x.id, x.price, x.listPrice, x.perKg, x.ean])).toEqual([
      ['836', 165, 209, true, null], // bandeja de 2,3 kg: acá el precio ya viene por kilo
      ['3883', 589, 639, true, null], // 690 g a $ 406,41
      ['3885', 249, 289, true, null],
      ['3887', 299, null, true, null], // la pieza es justo el kilo por el peso: sin oferta
      ['3886', 428, null, true, null],
    ]);
    const items = parseTataProducts(dambo);
    // La horma de 211 g sale $ 132,93: 630 el kilo
    expect(items[0]).toMatchObject({ name: 'Queso Dambo Conaprole al Vacío', price: 630, listPrice: null, perKg: true, brand: 'Conaprole' });
    expect(items.map((x) => [x.id, x.price, x.listPrice, x.perKg])).toEqual([
      ['13269', 630, null, true],
      ['162389', 650, null, true],
      ['22314', 870, null, true],
      ['7961', 886, null, true],
      ['173553', 720, null, true], // por kilo con unitMultiplier 1
      ['862', 186, null, false], // feteado en paquete: por unidad
    ]);
  });

  it('pesables: el redondeo de la pieza no inventa ofertas', () => {
    const items = parseTataProducts(
      wrap(
        weighed('1', 0.137, 136.86, 999), // 999 × 0,137 = 136,863 → la pieza a $ 136,86, sin oferta
        weighed('2', 0.3, 150, 650), // 500 el kilo, antes 650
        weighed('3', 1.5, 300, 350), // con unitMultiplier > 1 el precio ya es por kilo
        weighed('4', 0.5, 120, 0), // sin precio de lista
      ),
    );
    expect(items.map((x) => [x.id, x.price, x.listPrice, x.perKg])).toEqual([
      ['1', 999, null, true],
      ['2', 500, 650, true],
      ['3', 300, 350, true],
      ['4', 240, null, true],
    ]);
  });

  it('página del producto: el slug sin el SKU, codificado (hay eñes)', () => {
    const items = parseTataProducts(ddlMontevideo);
    expect(items.find((x) => x.id === '3183')?.url).toBe('https://www.tata.com.uy/dulce-de-leche-do%C3%B1a-elvira-900-g/p');
    expect(items.find((x) => x.id === '1335')?.url).toBe('https://www.tata.com.uy/dulce-de-leche-ta-ta-1-kg-1000052922/p');
    const [other] = parseTataProducts(wrap({ ...nietitos, slug: 'dulce-de-leche-los-nietitos-1-kg' }));
    expect(other.url).toBe('https://www.tata.com.uy/dulce-de-leche-los-nietitos-1-kg/p');
  });

  it('código de barras: solo el campo ean (gtin es interno), y solo si es real', () => {
    // Así viene en la consulta de a un producto de la web (Dulce De Leche Manjar Conaprole 1 Kg)
    expect(parseTataProducts(wrap({ ...nietitos, gtin: '1000052906', ean: '7730105005435' }))[0].ean).toBe('7730105005435');
    expect(parseTataProducts(wrap({ ...nietitos, gtin: '7730105005435' }))[0].ean).toBeNull();
    expect(parseTataProducts(wrap({ ...nietitos, ean: '2608609000001' }))[0].ean).toBeNull();
  });

  it('marcas de relleno: sin marca', () => {
    const [item] = parseTataProducts(wrap({ ...nietitos, brand: { brandName: 'Otras Marcas', name: 'Otras Marcas' } }));
    expect(item.brand).toBeNull();
  });

  it('saltea productos raros sin romperse', () => {
    const json = {
      data: {
        search: {
          products: {
            edges: [
              null,
              {},
              { node: null },
              { node: { ...nietitos, slug: undefined } },
              { node: { ...nietitos, name: '  ' } },
              { node: { ...nietitos, offers: null } },
              { node: { ...nietitos, offers: offer('caro', 10) } },
              { node: { ...nietitos, offers: offer(0, 229) } },
              { node: { ...nietitos, offers: offer(195, 229, 'https://schema.org/OutOfStock') } },
              { node: nietitos },
              { node: nietitos }, // repetido
            ],
          },
        },
      },
    };
    expect(parseTataProducts(json).map((x) => x.id)).toEqual(['385']);
    // Sin foto o con la foto en otra forma: el producto sale igual (la foto no es imprescindible)
    for (const image of [undefined, null, { url: 'https://x/y.jpg' }, 'https://x/y.jpg', [null, {}]]) {
      expect(parseTataProducts(wrap({ ...nietitos, image }))).toMatchObject([{ id: '385', price: 195, image: null }]);
    }
    expect(parseTataProducts(null)).toEqual([]);
    expect(parseTataProducts({ data: null })).toEqual([]);
    expect(parseTataProducts({ data: { search: { products: { edges: 'nada' } } } })).toEqual([]);
    expect(parseTataProducts({ errors: [{ message: 'Sorry, something went wrong.' }] })).toEqual([]);
  });

  it('códigos de barras: solo GTIN de verdad', () => {
    expect(realEan('7730974000456')).toBe('7730974000456');
    expect(realEan('77306197')).toBe('77306197'); // EAN-8 de Conaprole
    expect(realEan('0000077306197')).toBe('77306197');
    expect(realEan('763571659991')).toBe('0763571659991'); // UPC-A
    expect(realEan('0763571659991')).toBe('0763571659991');
    // UPC-A de afuera que Ta-Ta guarda sin el 0 o con dos (Monster)
    expect(realEan('70847038627')).toBe('0070847038627');
    expect(realEan('0070847027102')).toBe('0070847027102');
    expect(realEan('07730974000456')).toBe('7730974000456'); // GTIN-14 con cero adelante
    expect(realEan('0212345678909')).toBeNull(); // UPC de peso variable (restringido)
    expect(realEan('0512345678900')).toBeNull(); // cupón
    expect(realEan('1550000890358')).toBeNull(); // prefijo sin asignar
    expect(realEan('20123451')).toBeNull(); // EAN-8 interno
    expect(realEan('7730974000457')).toBeNull(); // dígito verificador mal
    expect(realEan('2608609000001')).toBeNull(); // balanza
    expect(realEan('26009180000010')).toBeNull();
    expect(realEan('0000230496000')).toBeNull(); // interno relleno de ceros
    expect(realEan('0000002601559')).toBeNull();
    expect(realEan('')).toBeNull();
    expect(realEan(undefined)).toBeNull();
    expect(realEan('77309740-0456')).toBeNull();
  });
});

describe('Ta-Ta: zonas', () => {
  it('departamento de la app → vendedores de la zona de la web', () => {
    expect(departmentSellers('Montevideo')).toBe(MONTEVIDEO);
    expect(departmentSellers('Cerro Largo (Melo)')).toBe('tatauymelo');
    expect(departmentSellers('Paysandú')).toBe('tatauypaysandu');
    expect(departmentSellers('PAYSANDU')).toBe('tatauypaysandu');
    expect(departmentSellers('Punta del Este')).toBe('tatauymaldonado');
    expect(departmentSellers('Colonia')).toBe('tatauycolonia');
    expect(departmentSellers('Lavalleja (Minas)')).toBe('tatauyminas');
    expect(departmentSellers('Flores (Trinidad)')).toBe('tatauytrinidad');
    // Zonas de dos vendedores; Río Negro no está en la web: va a Mercedes
    expect(departmentSellers('Soriano (Mercedes)')).toBe(MERCEDES);
    expect(departmentSellers('Río Negro (Fray Bentos)')).toBe(MERCEDES);
    expect(departmentSellers('Treinta y Tres')).toBe('tatauyminas;tatauytreintaytres');
    // Montevideo a Costa de Oro, La Paz y Las Piedras; San José no está en la web
    expect(departmentSellers('Ciudad de la Costa')).toBe(MONTEVIDEO);
    expect(departmentSellers('La Paz y Las Piedras')).toBe(MONTEVIDEO);
    expect(departmentSellers('San José')).toBe(MONTEVIDEO);
    // Códigos postales de las localidades de la web
    expect(departmentSellers('75000')).toBe(MERCEDES);
    expect(departmentSellers('20000')).toBe('tatauymaldonado');
    expect(departmentSellers('80000')).toBe(MONTEVIDEO);
    expect(departmentSellers('Narnia')).toBe(MONTEVIDEO);
    expect(departmentSellers(null)).toBe(MONTEVIDEO);
    expect(departmentSellers(undefined)).toBe(MONTEVIDEO);
  });

  it('todos los departamentos de la app tienen zona de la web (Montevideo solo los de cerca)', () => {
    const toMvd = DEPARTMENTS.filter((d) => departmentSellers(d.name) === MONTEVIDEO).map((d) => d.name);
    expect(toMvd).toEqual(['Montevideo', 'Ciudad de la Costa', 'San José']);
    const zones = new Set(DEPARTMENTS.map((d) => departmentSellers(d.name)));
    expect(zones.size).toBe(17);
    // Vendedores de la lista de localidades de la web
    const web = 'artigas canelones colonia durazno florida maldonado melo mercedes minas montevideo paysandu rivera rocha salto tacuarembo treintaytres trinidad';
    const known = new Set(web.split(' ').map((s) => `tatauy${s}`));
    for (const z of zones) for (const s of z.split(';')) expect(known.has(s), s).toBe(true);
  });
});

describe('Ta-Ta: búsqueda', () => {
  type Mod = typeof import('../../../supabase/functions/precios-web/tata');
  let mod: Mod;
  beforeEach(async () => {
    // Módulo nuevo en cada prueba: las zonas probadas quedan guardadas a nivel de módulo
    vi.resetModules();
    mod = await import('../../../supabase/functions/precios-web/tata');
  });

  const empty = wrap();
  /** Respuestas por «vendedores|búsqueda» (o «*|búsqueda» para cualquier zona) */
  const fake = (routes: Record<string, unknown>, status: Record<string, number> = {}) => {
    const calls: { url: URL; init?: RequestInit; regionId: string; key: string; vars: Record<string, unknown> }[] = [];
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const vars = JSON.parse(url.searchParams.get('variables') ?? '{}');
      const facet = (vars.selectedFacets as { key: string; value: string }[]).find((f) => f.key === 'channel');
      const regionId = JSON.parse(facet?.value ?? '{}').regionId as string;
      const key = `${atob(regionId).replace(/^SW#/, '')}|${vars.term}`;
      calls.push({ url, init, regionId, key, vars });
      const any = `*|${vars.term}`;
      return new Response(JSON.stringify(routes[key] ?? routes[any] ?? empty), { status: status[key] ?? status[any] ?? 200 });
    }) as typeof fetch;
    return { calls, fetchImpl };
  };

  it('busca en www.tata.com.uy como la web, con la zona del departamento', async () => {
    const { calls, fetchImpl } = fake({ [`${MERCEDES}|leche`]: lecheMontevideo, [`${MERCEDES}|dulce de leche`]: ddlMercedes });
    const items = await mod.searchTata('  dulce   de leche ', { region: 'Soriano (Mercedes)', limit: 3, fetchImpl });
    expect(items.map((x) => [x.id, x.price])).toEqual([['3181', 188], ['385', 195], ['378', 109]]);
    // Primero prueba la zona con una búsqueda común, después busca
    expect(calls.map((c) => c.key)).toEqual([`${MERCEDES}|leche`, `${MERCEDES}|dulce de leche`]);
    for (const c of calls) {
      expect(c.url.origin + c.url.pathname).toBe('https://www.tata.com.uy/api/graphql');
      expect([...c.url.searchParams.keys()]).toEqual(['operationName', 'variables']);
      expect(c.url.searchParams.get('operationName')).toBe('ProductsQuery');
      const headers = c.init?.headers as Record<string, string>;
      expect(headers['User-Agent']).toMatch(/Chrome/);
      expect(headers['Accept-Language']).toMatch(/es-UY/);
    }
    expect(calls[1].vars).toEqual({
      first: 3,
      after: '0',
      sort: 'score_desc',
      term: 'dulce de leche',
      selectedFacets: [
        { key: 'channel', value: `{"salesChannel":"4","regionId":"${MERCEDES_ID}"}` },
        { key: 'locale', value: 'es-uy' },
      ],
    });
    expect(calls[0].vars.first).toBe(10);
  });

  it('el regionId es el que arma la web para cada zona', async () => {
    const { calls, fetchImpl } = fake({ '*|leche': lecheMontevideo });
    await mod.searchTata('yerba', { fetchImpl });
    await mod.searchTata('yerba', { region: 'Treinta y Tres', fetchImpl });
    expect(calls.map((c) => c.regionId)).toEqual([MVD_ID, MVD_ID, TYT_ID, TYT_ID]);
  });

  it('cada zona se prueba una sola vez', async () => {
    const { calls, fetchImpl } = fake({ [`${MONTEVIDEO}|leche`]: lecheMontevideo, '*|queso dambo': dambo });
    const [a, b] = await Promise.all([
      mod.searchTata('queso dambo', { fetchImpl }),
      mod.searchTata('queso dambo', { region: 'Montevideo', fetchImpl }),
    ]);
    expect(a).toHaveLength(6);
    expect(b).toEqual(a);
    await mod.searchTata('queso dambo', { region: 'San José', fetchImpl });
    expect(calls.map((c) => c.key)).toEqual([`${MONTEVIDEO}|leche`, `${MONTEVIDEO}|queso dambo`, `${MONTEVIDEO}|queso dambo`, `${MONTEVIDEO}|queso dambo`]);
  });

  it('zona que no trae almacén → Montevideo; esa zona se vuelve a probar, Montevideo queda', async () => {
    const { calls, fetchImpl } = fake({
      'tatauysalto|leche': zonaRota,
      [`${MONTEVIDEO}|leche`]: lecheMontevideo,
      [`${MONTEVIDEO}|queso dambo`]: dambo,
    });
    const items = await mod.searchTata('queso dambo', { region: 'Salto', fetchImpl });
    expect(items[0]).toMatchObject({ id: '13269', price: 630 });
    expect(calls.map((c) => c.key)).toEqual(['tatauysalto|leche', `${MONTEVIDEO}|leche`, `${MONTEVIDEO}|queso dambo`]);

    calls.length = 0;
    await mod.searchTata('queso dambo', { region: 'Salto', fetchImpl });
    await mod.searchTata('queso dambo', { fetchImpl });
    expect(calls.map((c) => c.key)).toEqual(['tatauysalto|leche', `${MONTEVIDEO}|queso dambo`, `${MONTEVIDEO}|queso dambo`]);
  });

  it('una zona que anda pero no tiene el producto da vacío (no se pasa a Montevideo)', async () => {
    const { calls, fetchImpl } = fake({ 'tatauysalto|leche': lecheMontevideo, [`${MONTEVIDEO}|queso dambo`]: dambo });
    expect(await mod.searchTata('queso dambo', { region: 'Salto', fetchImpl })).toEqual([]);
    expect(calls.map((c) => c.key)).toEqual(['tatauysalto|leche', 'tatauysalto|queso dambo']);
  });

  it('si Montevideo vino un momento sin almacén, no queda roto', async () => {
    const broken = fake({ [`${MONTEVIDEO}|leche`]: zonaRota, '*|dulce de leche': ddlMontevideo });
    await expect(mod.searchTata('dulce de leche', { fetchImpl: broken.fetchImpl })).rejects.toThrow(/Ta-Ta/);
    expect(broken.calls).toHaveLength(1);
    const ok = fake({ [`${MONTEVIDEO}|leche`]: lecheMontevideo, '*|dulce de leche': ddlMontevideo });
    expect(await mod.searchTata('dulce de leche', { fetchImpl: ok.fetchImpl })).toHaveLength(10);
    expect(ok.calls).toHaveLength(2);
  });

  it('si ni Montevideo trae almacén, error (mejor nada que precios de otra cosa)', async () => {
    const { calls, fetchImpl } = fake({ '*|leche': zonaRota, '*|dulce de leche': ddlMontevideo });
    await expect(mod.searchTata('dulce de leche', { region: 'Rocha', fetchImpl })).rejects.toThrow(/Ta-Ta cambió/);
    expect(calls.map((c) => c.key)).toEqual(['tatauyrocha|leche', `${MONTEVIDEO}|leche`]);
  });

  it('errores de red, HTTP o de GraphQL: tira error, y la zona se vuelve a probar después', async () => {
    const bad = fake({}, { [`${MONTEVIDEO}|leche`]: 503 });
    await expect(mod.searchTata('banana', { fetchImpl: bad.fetchImpl })).rejects.toThrow('503');
    const offline = (async () => {
      throw new TypeError('fetch failed');
    }) as typeof fetch;
    await expect(mod.searchTata('banana', { fetchImpl: offline })).rejects.toThrow('fetch failed');
    const down = fake({ [`${MONTEVIDEO}|leche`]: lecheMontevideo }, { [`${MONTEVIDEO}|banana`]: 500 });
    await expect(mod.searchTata('banana', { fetchImpl: down.fetchImpl })).rejects.toThrow('500');
    expect(down.calls).toHaveLength(2);
    // La web contesta así cuando algo no le gusta (p. ej. más de 100 resultados)
    const gql = fake({ [`${MONTEVIDEO}|banana`]: { errors: [{ message: 'Sorry, something went wrong.' }] } });
    await expect(mod.searchTata('banana', { fetchImpl: gql.fetchImpl })).rejects.toThrow(/Ta-Ta respondió con error/);
    expect(gql.calls).toHaveLength(1);
  });

  it('búsqueda vacía no pide nada; el límite tiene tope', async () => {
    const { calls, fetchImpl } = fake({ '*|leche': lecheMontevideo, '*|dulce de leche': ddlMontevideo });
    expect(await mod.searchTata('   ', { fetchImpl })).toEqual([]);
    expect(calls).toHaveLength(0);
    expect(await mod.searchTata('dulce de leche', { limit: 500, fetchImpl })).toHaveLength(10);
    expect(calls[1].vars.first).toBe(50);
    expect((await mod.searchTata('dulce de leche', { limit: 2, fetchImpl })).map((x) => x.id)).toEqual(['3181', '385']);
    expect(asWebSearch).toBe(searchTata);
  });
});
