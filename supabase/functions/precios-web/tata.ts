/**
 * Ta-Ta (y Multi Ahorro, que es parte de Ta-Ta): precios de la web www.tata.com.uy (VTEX FastStore, canal de venta 4).
 *
 * Todo se pide a www.tata.com.uy, cuyo robots.txt permite todo menos /checkout/*. La búsqueda es la misma que hace la
 * página de búsqueda de la web en el navegador: GET /api/graphql?operationName=ProductsQuery. Los hosts de VTEX
 * (tatauy.myvtex.com, tatauy.vtexcommercestable.com.br) no se usan: su robots.txt es «Disallow: /».
 *
 * Los precios cambian según la zona («Seleccioná una localidad»). Cada zona es uno o dos «vendedores» de VTEX y la web
 * busca con regionId = base64('SW#' + vendedores separados con «;»): «SW#tatauymontevideo», o para Mercedes
 * «SW#tatauycolonia;tatauymercedes». Los vendedores de cada zona están fijos acá, tal cual los arma la web al elegir
 * cada localidad de su lista (17/10/2026). Con un regionId que no existe VTEX no da error: trae solo artículos de
 * electro (buscando «leche», espumadores de leche). Por eso cada zona se prueba una vez con una búsqueda común antes
 * de usarla, y si no trae almacén se usa Montevideo.
 *
 * Código de barras: la búsqueda de la web no lo trae (su `gtin` es un código interno de Ta-Ta, 1000xxxxxx, no un
 * EAN), así que `ean` queda en null. Solo la consulta de a un producto de la web (BrowserProductQuery) trae `ean`; si
 * algún día viene en la búsqueda, se usa.
 *
 * Pesables (measurementUnit kg): `listPrice` viene por kilo y `price` es lo que sale la pieza si unitMultiplier < 1
 * (Queso Dambo Conaprole al vacío: 132,93 la horma de 211 g, 630 el kilo) o el kilo si es ≥ 1 (Pollo en bandeja de
 * 2,3 kg: 165). Se devuelve el precio por kilo con perKg, el que la web muestra al lado: «$ 109,56 ( $ 249,00 x kg )».
 */
import { BROWSER_HEADERS, type SearchOptions, type WebItem } from './types';

const SITE = 'https://www.tata.com.uy';
const MAX = 50;

const MONTEVIDEO = 'tatauymontevideo';
const MERCEDES = 'tatauycolonia;tatauymercedes';
const TREINTA_Y_TRES = 'tatauyminas;tatauytreintaytres';

/**
 * Vendedores de cada zona. Ciudad de la Costa entra en «Montevideo a Costa de Oro», y «La Paz y Las Piedras» también
 * es Montevideo. La web no tiene San José ni Río Negro: van a la zona más cerca que sí tiene (Montevideo y Mercedes).
 */
const SELLERS: Record<string, string> = {
  montevideo: MONTEVIDEO,
  'ciudad de la costa': MONTEVIDEO,
  'costa de oro': MONTEVIDEO,
  'la paz y las piedras': MONTEVIDEO,
  'la paz': MONTEVIDEO,
  'las piedras': MONTEVIDEO,
  'san jose': MONTEVIDEO,
  'san jose de mayo': MONTEVIDEO,
  canelones: 'tatauycanelones',
  maldonado: 'tatauymaldonado',
  'punta del este': 'tatauymaldonado',
  paysandu: 'tatauypaysandu',
  salto: 'tatauysalto',
  tacuarembo: 'tatauytacuarembo',
  colonia: 'tatauycolonia',
  'colonia del sacramento': 'tatauycolonia',
  soriano: MERCEDES,
  mercedes: MERCEDES,
  'rio negro': MERCEDES,
  'fray bentos': MERCEDES,
  'cerro largo': 'tatauymelo',
  melo: 'tatauymelo',
  lavalleja: 'tatauyminas',
  minas: 'tatauyminas',
  durazno: 'tatauydurazno',
  florida: 'tatauyflorida',
  rivera: 'tatauyrivera',
  artigas: 'tatauyartigas',
  flores: 'tatauytrinidad',
  trinidad: 'tatauytrinidad',
  'treinta y tres': TREINTA_Y_TRES,
  rocha: 'tatauyrocha',
};

/** El código postal que la web manda al elegir cada localidad */
const POSTAL: Record<string, string> = {
  '11800': MONTEVIDEO,
  '90000': 'tatauycanelones',
  '20000': 'tatauymaldonado',
  '60000': 'tatauypaysandu',
  '50000': 'tatauysalto',
  '45000': 'tatauytacuarembo',
  '70000': 'tatauycolonia',
  '75000': MERCEDES,
  '37000': 'tatauymelo',
  '30000': 'tatauyminas',
  '97000': 'tatauydurazno',
  '94000': 'tatauyflorida',
  '40000': 'tatauyrivera',
  '55000': 'tatauyartigas',
  '85000': 'tatauytrinidad',
  '33000': TREINTA_Y_TRES,
  '27000': 'tatauyrocha',
};

const plain = (s: string) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Vendedores de la zona de Ta-Ta para un departamento de la app: «Cerro Largo (Melo)» → «tatauymelo», «Soriano
 * (Mercedes)» → «tatauycolonia;tatauymercedes». También acepta el código postal de una localidad de la web. Si no se
 * conoce, Montevideo.
 */
export function departmentSellers(department?: string | null): string {
  const s = plain(department ?? '');
  if (/^\d{5}$/.test(s)) return POSTAL[s] ?? MONTEVIDEO;
  const [, main = s, city = ''] = /^([^(]*?)\s*(?:\(([^)]*)\))?$/.exec(s) ?? [];
  return SELLERS[s] ?? SELLERS[main.trim()] ?? SELLERS[city.trim()] ?? MONTEVIDEO;
}

/** regionId de la web para esos vendedores: base64 de «SW#vendedores» */
const regionIdOf = (sellers: string) => btoa(`SW#${sellers}`);

const timeout = () => (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(10_000) : undefined);

/** La búsqueda de la web, con la zona de esos vendedores (mismas variables que manda la página /s?q=) */
function searchUrl(term: string, sellers: string, first: number): string {
  const variables = {
    first,
    after: '0',
    sort: 'score_desc',
    term,
    selectedFacets: [
      { key: 'channel', value: JSON.stringify({ salesChannel: '4', regionId: regionIdOf(sellers) }) },
      { key: 'locale', value: 'es-uy' },
    ],
  };
  return `${SITE}/api/graphql?${new URLSearchParams({ operationName: 'ProductsQuery', variables: JSON.stringify(variables) })}`;
}

async function getJson(url: string, fetchImpl: typeof fetch): Promise<unknown> {
  const res = await fetchImpl(url, {
    headers: { ...BROWSER_HEADERS, Accept: 'application/json', 'Content-Type': 'application/json' },
    signal: timeout(),
  });
  if (!res.ok) throw new Error(`Ta-Ta respondió ${res.status}`);
  const json = (await res.json()) as { data?: { search?: unknown }; errors?: { message?: unknown }[] } | null;
  if (!json?.data?.search && Array.isArray(json?.errors) && json.errors.length) {
    throw new Error(`Ta-Ta respondió con error: ${String(json.errors[0]?.message ?? '').slice(0, 100)}`);
  }
  return json;
}

/** Búsqueda común para probar una zona: con almacén trae muchas leches; con una zona que no existe, espumadores */
const PROBE = 'leche';

/** La zona trae almacén: al menos 3 resultados que son leche, con precio */
const looksLikeGrocery = (json: unknown) => parseTataProducts(json).filter((x) => /^leche\b/.test(plain(x.name))).length >= 3;

/**
 * Zonas probadas. Se guarda la promesa para no probar dos veces a la vez. Si falló la red o la zona no trajo almacén
 * no queda guardado: una respuesta rara de un momento no deja la zona (o Montevideo, que es el respaldo de todas)
 * sin precios hasta que se reinicie la función.
 */
const zones = new Map<string, Promise<boolean>>();

function zoneOk(sellers: string, fetchImpl: typeof fetch): Promise<boolean> {
  let p = zones.get(sellers);
  if (!p) {
    const q = getJson(searchUrl(PROBE, sellers, 10), fetchImpl).then(looksLikeGrocery);
    const forget = () => {
      if (zones.get(sellers) === q) zones.delete(sellers);
    };
    q.then((ok) => ok || forget(), forget);
    zones.set(sellers, q);
    p = q;
  }
  return p;
}

/** Los vendedores con los que se busca: los de la zona si anda, si no Montevideo */
async function zoneFor(sellers: string, fetchImpl: typeof fetch): Promise<string> {
  if (await zoneOk(sellers, fetchImpl)) return sellers;
  if (sellers !== MONTEVIDEO && (await zoneOk(MONTEVIDEO, fetchImpl))) return MONTEVIDEO;
  throw new Error('Ta-Ta cambió (la búsqueda no trae almacén ni en Montevideo)');
}

/**
 * Solo códigos de barras de verdad (EAN-13, EAN-8 o UPC-A como EAN-13), con dígito verificador bien; si no, null.
 * Saca los ceros de adelante: Ta-Ta guarda los UPC-A de afuera sin el 0 (Monster: «70847038627») o con dos
 * («0070847027102»), y los EAN-8 rellenos a 13. Descarta los internos: rellenos con ceros («0000230496000» son 9
 * cifras), los de balanza o del local (empiezan con 2), los de circulación restringida y cupones, y los rangos que GS1
 * no asignó. Mismo criterio que el lector de El Dorado.
 */
export function realEan(raw: unknown): string | null {
  const code = typeof raw === 'string' || typeof raw === 'number' ? String(raw).trim() : '';
  if (!/^\d+$/.test(code)) return null;
  const s = code.replace(/^0+/, '');
  let gtin: string;
  if (s.length === 8) gtin = s;
  else if (s.length >= 10 && s.length <= 13) gtin = s.padStart(13, '0');
  else return null;
  let sum = 0;
  for (let i = gtin.length - 2, w = 3; i >= 0; i--, w = 4 - w) sum += Number(gtin[i]) * w;
  if ((10 - (sum % 10)) % 10 !== Number(gtin[gtin.length - 1])) return null;
  if (gtin.length === 8) return /^[02]/.test(gtin) ? null : gtin; // EAN-8 que empiezan con 0 o 2: internos
  const prefix = Number(gtin.slice(0, 3));
  if (prefix >= 200 && prefix <= 299) return null; // balanza / uso interno del local
  if ((prefix >= 20 && prefix <= 29) || (prefix >= 40 && prefix <= 59)) return null; // restringidos y cupones
  if (prefix >= 140 && prefix <= 199) return null; // sin asignar
  if (prefix >= 980) return null; // vales y cupones
  return gtin;
}

/** Marcas de relleno que no dicen nada */
const NO_BRAND = /^(otras marcas|otra marca|sin marca|gen[eé]ric[oa]s?|varios)$/i;

const money = (n: number) => Math.round(n * 100) / 100;
const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);

interface Offer {
  availability?: string;
  price?: number;
  listPrice?: number;
}
interface Node {
  id?: string;
  sku?: string;
  slug?: string;
  name?: string;
  /** Solo en la consulta de a un producto (BrowserProductQuery); la búsqueda no lo trae */
  ean?: string;
  /** Código interno de Ta-Ta (1000xxxxxx): no es un código de barras */
  gtin?: string;
  brand?: { name?: string; brandName?: string };
  measurementUnit?: string;
  unitMultiplier?: number;
  image?: { url?: string }[];
  isVariantOf?: { name?: string };
  offers?: { lowPrice?: number; offers?: Offer[] };
}

/** Lo que se paga en góndola: la oferta más barata con stock (hoy siempre hay una sola, del vendedor «1») */
function offerOf(node: Node): Offer | null {
  let best: Offer | null = null;
  for (const o of node.offers?.offers ?? []) {
    if (!o || num(o.price) <= 0 || typeof o.availability !== 'string' || !/\/InStock$/.test(o.availability)) continue;
    if (!best || num(o.price) < num(best.price)) best = o;
  }
  return best;
}

/**
 * Productos de la búsqueda de la web. Precio de góndola (`price`); `listPrice` solo si es más alto (oferta de Ta-Ta).
 * Las promos con tarjeta (OCA, Itaú…) no van en `price`: se aplican al pagar, así que acá no aparecen.
 */
export function parseTataProducts(json: unknown): WebItem[] {
  const edges = (json as { data?: { search?: { products?: { edges?: unknown } } } } | null)?.data?.search?.products?.edges;
  if (!Array.isArray(edges)) return [];
  const out: WebItem[] = [];
  const seen = new Set<string>();
  for (const edge of edges as ({ node?: Node } | null)[]) {
    try {
      const node = edge?.node;
      if (!node) continue;
      const id = String(node.sku ?? node.id ?? '');
      const name = String(node.name ?? node.isVariantOf?.name ?? '').replace(/\s+/g, ' ').trim();
      const slug = typeof node.slug === 'string' ? node.slug.trim() : '';
      const o = offerOf(node);
      if (!id || !name || !slug || !o || seen.has(id)) continue;
      const unit = (node.measurementUnit ?? '').trim().toLowerCase();
      const mult = num(node.unitMultiplier) > 0 ? num(node.unitMultiplier) : 1;
      const perKg = /^(kg|kgs|kilo|kilos|kilogramos?)$/.test(unit);
      let price = num(o.price);
      const list = num(o.listPrice);
      if (perKg && mult < 1) {
        // `price` es la pieza y `listPrice` el kilo. Sin oferta, la pieza es el kilo por el peso (redondeado, como
        // en la web): ahí el kilo es justo `listPrice`. Con oferta, el kilo es la pieza dividido el peso.
        price = list > 0 && Math.abs(money(list * mult) - price) <= 0.01 ? list : money(price / mult);
      }
      const brand = String(node.brand?.name ?? node.brand?.brandName ?? '').trim();
      // El slug de la búsqueda termina con el SKU; la página del producto es la del slug sin el SKU (la canónica)
      const linkText = (slug.endsWith(`-${id}`) ? slug.slice(0, -(id.length + 1)) : slug) || slug;
      seen.add(id);
      out.push({
        chain: 'tata',
        id,
        name,
        brand: brand && !NO_BRAND.test(brand) ? brand : null,
        ean: realEan(node.ean),
        price: money(price),
        listPrice: list > price + 0.009 ? money(list) : null,
        perKg,
        // Hay slugs con eñe («dulce-de-leche-doña-elvira-900-g»): la web los abre codificados
        url: `${SITE}/${encodeURIComponent(linkText)}/p`,
        // La foto no es imprescindible: si viene con otra forma, el producto sale igual, sin foto
        image: (Array.isArray(node.image) ? node.image : []).find((i) => typeof i?.url === 'string')?.url ?? null,
      });
    } catch {
      // Un producto raro no corta la búsqueda
    }
  }
  return out;
}

/** Busca en la web de Ta-Ta con los precios del departamento (opts.region; si no, Montevideo) */
export async function searchTata(query: string, opts: SearchOptions = {}): Promise<WebItem[]> {
  const q = query.replace(/\s+/g, ' ').trim();
  if (!q) return [];
  const fetchImpl = opts.fetchImpl ?? fetch;
  const want = Number(opts.limit ?? 20);
  const limit = Number.isFinite(want) ? Math.min(MAX, Math.max(1, Math.floor(want))) : 20;
  const sellers = await zoneFor(departmentSellers(opts.region), fetchImpl);
  return parseTataProducts(await getJson(searchUrl(q, sellers, limit), fetchImpl)).slice(0, limit);
}
