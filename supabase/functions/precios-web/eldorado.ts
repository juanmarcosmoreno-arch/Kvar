/**
 * El Dorado (eldorado.com.uy): la web es VTEX y su buscador viejo del catálogo responde JSON sin pedir nada raro.
 *
 *   GET /api/catalog_system/pub/products/search?ft={texto}&_from=0&_to=49&O=OrderByScoreDESC
 *   GET /api/catalog_system/pub/products/search?fq=alternateIds_Ean:{ean}&fq=alternateIds_Ean:{ean}…
 *
 * - Da 50 productos como mucho por pedido, y contesta 206 cuando hay más de los que pediste (también está bien).
 * - El precio es el mismo en todos los locales: la zona solo cambia qué hay en stock, así que no se usa.
 * - Los productos que se venden por peso vienen con `measurementUnit: 'kg'` y el precio ya es por kilo
 *   (`unitMultiplier` es de a cuánto se compra: 0.1 = de a 100 g).
 * - El precio del catálogo nunca trae los descuentos con tarjeta o banco (dependen de cómo pagues); igual, si
 *   alguna vez aparece uno marcado, se usa el precio sin ese descuento.
 * - El buscador es caprichoso: con «en», «con», «y», «para»… trae cualquier cosa que tenga alguna de las otras
 *   palabras («jabón en polvo» daba jugos Tang «en polvo» primero), así que se le mandan sin esas palabras y lo que
 *   vuelve se ordena por cuántas palabras de la búsqueda tiene el nombre. «1.5L» tiene que ir con el punto.
 * - A veces contesta 500 («The operation was canceled.») y al ratito anda: se prueba una vez más.
 */
import { BROWSER_HEADERS, type SearchOptions, type WebItem, type WebSearch } from './types';

const BASE = 'https://www.eldorado.com.uy';
const API = `${BASE}/api/catalog_system/pub/products/search`;
const CHAIN = 'el-dorado';
/** Tope del buscador viejo de VTEX por pedido (_to - _from < 50) */
const VTEX_PAGE_MAX = 50;
const DEFAULT_LIMIT = 20;
/** Códigos de barras por pedido (varios fq del mismo campo se suman) */
const EAN_BATCH = 25;

/** El vendedor «Otros» de El Dorado: aparece en el selector de locales pero no vende nada */
const DEAD_SELLERS = /^eldoradouy$/i;
/** Marcas que no son marcas */
const VTEX_NO_BRAND = /^(otras marcas|sin marca|gen[eé]ric[oa]s?|varios|-)$/i;
/** Palabras de enlace: el buscador ya ignora «de», pero las otras le hacen traer cualquier cosa */
const VTEX_CONNECTORS = new Set(['a', 'al', 'con', 'de', 'del', 'el', 'en', 'la', 'las', 'lo', 'los', 'para', 'por', 'y']);
/** Promos que dependen de con qué pagás (no son el precio de góndola) */
const PAYMENT_PROMO =
  /santander|ita[uú]|brou|bbva|scotia|hsbc|heritage|bandes|banco|bank|tarjeta|visa|master|amex|american express|diners|cabal|\boca\b|\banda\b|creditel|prex|mi ?dinero|passcard|d[eé]bito|cr[eé]dito/i;

// Lo poco que se usa de la respuesta de VTEX (todo opcional: se valida al leer)
interface VtexOffer {
  Price?: unknown;
  ListPrice?: unknown;
  PriceWithoutDiscount?: unknown;
  AvailableQuantity?: unknown;
  IsAvailable?: unknown;
  DiscountHighLight?: unknown;
}
interface VtexSeller {
  sellerId?: unknown;
  commertialOffer?: VtexOffer;
}
interface VtexItem {
  itemId?: unknown;
  name?: unknown;
  nameComplete?: unknown;
  ean?: unknown;
  measurementUnit?: unknown;
  unitMultiplier?: unknown;
  images?: unknown;
  sellers?: unknown;
}
interface VtexProduct {
  productName?: unknown;
  brand?: unknown;
  linkText?: unknown;
  link?: unknown;
  items?: unknown;
}

const vtexNum = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : 0);
const str = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : typeof v === 'number' ? String(v) : '');
const cents = (n: number) => Math.round(n * 100) / 100;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Dígito verificador de un GTIN (EAN-8/EAN-13) */
function gtinCheckDigitOk(code: string): boolean {
  let sum = 0;
  for (let i = code.length - 2, w = 3; i >= 0; i--, w = 4 - w) sum += Number(code[i]) * w;
  return (10 - (sum % 10)) % 10 === Number(code[code.length - 1]);
}

/**
 * El código de barras si es un GTIN de verdad (EAN-13 o EAN-8), o null.
 * Saca los ceros de adelante (hay webs que los guardan como GTIN-14) y descarta los códigos internos: los de
 * balanza o del local (empiezan con 2), los de circulación restringida y cupones, los rangos que GS1 no asignó y
 * los números cortos rellenados con ceros.
 */
export function realGtin(code: unknown): string | null {
  const raw = str(code);
  if (!/^\d+$/.test(raw)) return null;
  const s = raw.replace(/^0+/, '');
  let gtin: string;
  if (s.length === 8) gtin = s;
  else if (s.length >= 10 && s.length <= 13) gtin = s.padStart(13, '0'); // EAN-13 (o UPC-A con un 0 adelante)
  else return null;
  if (!gtinCheckDigitOk(gtin)) return null;
  if (gtin.length === 8) return /^[02]/.test(gtin) ? null : gtin; // EAN-8 que empiezan con 0 o 2: internos
  const prefix = Number(gtin.slice(0, 3));
  if (prefix >= 200 && prefix <= 299) return null; // balanza / uso interno del local
  if ((prefix >= 20 && prefix <= 29) || (prefix >= 40 && prefix <= 59)) return null; // restringidos y cupones
  if (prefix >= 140 && prefix <= 199) return null; // sin asignar
  if (prefix >= 980) return null; // vales y cupones
  return gtin;
}

/** Nombres de las promos que muestra VTEX sobre el precio («20% OFF», «10% Off Café y Yerba»…) */
function highlights(o: VtexOffer): string[] {
  if (!Array.isArray(o.DiscountHighLight)) return [];
  return o.DiscountHighLight.map((d) => (isObj(d) ? str(d['<Name>k__BackingField'] ?? d.Name ?? d.name) : '')).filter(Boolean);
}

/** La oferta del primer vendedor que lo tiene (con precio y stock) */
function availableOffer(sellers: unknown): VtexOffer | null {
  if (!Array.isArray(sellers)) return null;
  for (const s of sellers as VtexSeller[]) {
    if (!isObj(s) || DEAD_SELLERS.test(str(s.sellerId))) continue;
    const o = s.commertialOffer;
    if (!isObj(o)) continue;
    if (!(vtexNum(o.Price) > 0) || o.IsAvailable === false) continue;
    // AvailableQuantity es un tramo (99999/100/10), no el stock real: solo importa que no sea 0
    if (o.AvailableQuantity !== undefined && !(vtexNum(o.AvailableQuantity) > 0)) continue;
    return o;
  }
  return null;
}

/** Foto chica (300×300): VTEX achica las imágenes si se le pide en la ruta */
function smallImage(images: unknown): string | null {
  if (!Array.isArray(images) || !isObj(images[0])) return null;
  const url = str(images[0].imageUrl);
  if (!/^https?:\/\//.test(url)) return null;
  return url.replace(/^http:/, 'https:').replace(/\/arquivos\/ids\/(\d+)\//, '/arquivos/ids/$1-300-300/');
}

/** El nombre sin el « .» que le queda a muchos al final («Queso Fontina Kg .») */
const cleanName = (s: string) => s.replace(/\s+\.+$/, '').trim();

/**
 * Lee la respuesta del buscador viejo de VTEX (`/api/catalog_system/pub/products/search`). Sirve para cualquier
 * cadena VTEX: `chain` es la clave de la app y `baseUrl` la web (para armar el link a cada producto).
 * Saltea lo que no tiene precio o stock, o viene raro; nunca tira error.
 */
export function parseVtexCatalog(json: unknown, chain: string, baseUrl: string): WebItem[] {
  if (!Array.isArray(json)) return [];
  const base = baseUrl.replace(/\/+$/, '');
  const out: WebItem[] = [];
  const seen = new Set<string>();
  for (const p of json as VtexProduct[]) {
    if (!isObj(p) || !Array.isArray(p.items)) continue;
    const items = p.items as VtexItem[];
    const brandName = str(p.brand);
    const brand = brandName && !VTEX_NO_BRAND.test(brandName) ? brandName : null;
    const slug = str(p.linkText);
    const link = str(p.link);
    const url = slug ? `${base}/${slug}/p` : /^https?:\/\//.test(link) ? link : base;
    for (const item of items) {
      if (!isObj(item)) continue;
      const id = str(item.itemId);
      if (!id || seen.has(id)) continue;
      const offer = availableOffer(item.sellers);
      if (!offer) continue;

      let price = vtexNum(offer.Price);
      // Por las dudas: si la promo es con tarjeta o banco, el precio de góndola es el de antes de la promo
      if (highlights(offer).some((h) => PAYMENT_PROMO.test(h))) price = Math.max(price, vtexNum(offer.PriceWithoutDiscount));
      const list = vtexNum(offer.ListPrice);

      const unit = str(item.measurementUnit).toLowerCase();
      const perKg = /^(kg|kgs|kilo|kilos|kilogramos?)$/.test(unit);
      // Por kilo el precio ya es por kilo; si no, la unidad de venta es `unitMultiplier` unidades (casi siempre 1)
      const mult = vtexNum(item.unitMultiplier);
      const factor = perKg || !(mult > 0) ? 1 : mult;

      // Si hay un solo artículo, el nombre del producto; si hay varios (talles, sabores), el de cada uno
      const name = cleanName(items.length > 1 ? str(item.nameComplete) || str(item.name) || str(p.productName) : str(p.productName) || str(item.nameComplete) || str(item.name));
      if (!name) continue;

      seen.add(id);
      out.push({
        chain,
        id,
        name,
        brand,
        ean: realGtin(item.ean),
        price: cents(price * factor),
        listPrice: list > price ? cents(list * factor) : null,
        perKg,
        url,
        image: smallImage(item.images),
      });
    }
  }
  return out;
}

/**
 * El texto tal cual lo entiende el buscador (con «+» o símbolos responde 400). El punto queda solo entre números:
 * con «1 5L» no encuentra nada y con «1.5L» sí («1,5» pasa a «1.5», como lo escribe la web).
 */
export function searchText(query: string): string {
  return query
    .normalize('NFC')
    .replace(/['’´`]/g, '')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/[^\p{L}\p{N}.]+/gu, ' ')
    .replace(/(?<!\d)\.|\.(?!\d)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
    .trim();
}

/** Lo que se le manda al buscador: el texto sin las palabras de enlace (si no queda nada, entero) */
export function ftText(query: string): string {
  const q = searchText(query);
  const words = q.split(' ').filter((w) => w && !VTEX_CONNECTORS.has(w.toLowerCase()));
  return words.length ? words.join(' ') : q;
}

/** Para comparar: minúsculas, sin tildes, y «500 Gr» también como «500gr» */
function vtexTokens(s: string): string[] {
  const words = s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/(\d),(\d)/g, '$1.$2')
    .split(/[^a-z0-9.]+/)
    .map((w) => w.replace(/^\.+|\.+$/g, ''))
    .filter(Boolean);
  const out = [...words];
  for (let i = 0; i + 1 < words.length; i++) if (/^\d+(\.\d+)?$/.test(words[i]) && /^[a-z]+$/.test(words[i + 1])) out.push(words[i] + words[i + 1]);
  return out;
}

/** Si la palabra buscada está en el nombre (al principio de una palabra; «500» no vale por «5000» ni «1» por «1.5») */
function vtexWordIn(w: string, tokens: string[]): boolean {
  return tokens.some((t) => t.startsWith(w) && !(/\d$/.test(w) && /[\d.]/.test(t.charAt(w.length))));
}

/**
 * Ordena los resultados por cuántas palabras de la búsqueda tiene el nombre (o la marca), y si empatan quedan como
 * los dio la web. Las palabras de enlace y las de una letra no cuentan; «galletitas» vale por «galletita» y
 * «cereales» por «cereal».
 */
export function rankByQuery(items: WebItem[], query: string): WebItem[] {
  const words = vtexTokens(searchText(query))
    .filter((w) => w.length > 1 && !VTEX_CONNECTORS.has(w))
    .map((w) => (/^[a-z]{4,}es$/.test(w) ? w.slice(0, -2) : /^[a-z]{3,}s$/.test(w) ? w.slice(0, -1) : w));
  if (!words.length) return items;
  const score = (x: WebItem) => {
    const tokens = vtexTokens(`${x.name} ${x.brand ?? ''}`);
    return words.reduce((n, w) => n + (vtexWordIn(w, tokens) ? 1 : 0), 0);
  };
  return items
    .map((x, i) => ({ x, i, s: score(x) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((r) => r.x);
}

async function getElDoradoJson(url: string, fetchImpl?: typeof fetch): Promise<unknown> {
  for (let attempt = 0; ; attempt++) {
    const init: RequestInit = {
      headers: { ...BROWSER_HEADERS, Accept: 'application/json' },
      signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(10_000) : undefined,
    };
    const started = Date.now();
    const res = fetchImpl ? await fetchImpl(url, init) : await fetch(url, init);
    // El buscador a veces contesta 500 «The operation was canceled.» y al ratito anda: una vez más, si fue rápido
    if (res.status >= 500 && attempt === 0 && Date.now() - started < 5_000) {
      await res.text().catch(() => '');
      await new Promise((r) => setTimeout(r, 300));
      continue;
    }
    // 206 = «hay más resultados»: también es una respuesta buena
    if (!res.ok) throw new Error(`El Dorado respondió ${res.status}`);
    const body = await res.text();
    try {
      return JSON.parse(body);
    } catch {
      throw new Error('El Dorado no respondió JSON');
    }
  }
}

/** Busca en la web de El Dorado (la zona no cambia los precios, así que no se usa) */
export const searchElDorado: WebSearch = async (query: string, opts: SearchOptions = {}) => {
  const all = searchText(query);
  if (!all) return [];
  const asked = Math.floor(vtexNum(opts.limit));
  const limit = asked > 0 ? Math.min(asked, VTEX_PAGE_MAX) : DEFAULT_LIMIT;
  // Se piden algunos más de los que se devuelven: se saltean los que no hay y se reordena
  const size = Math.min(VTEX_PAGE_MAX, Math.max(limit + 10, limit * 2));
  const get = async (q: string) =>
    parseVtexCatalog(await getElDoradoJson(`${API}?ft=${encodeURIComponent(q)}&_from=0&_to=${size - 1}&O=OrderByScoreDESC`, opts.fetchImpl), CHAIN, BASE);
  const strict = ftText(all);
  let items = await get(strict);
  // Sin las palabras de enlace a veces no encuentra nada («comida perro»): entonces con el texto entero
  if (!items.length && strict !== all) items = await get(all);
  return rankByQuery(items, all).slice(0, limit);
};

/** Las formas en que la web puede tener guardado un código: los UPC-A (12 cifras) van sin el 0 de adelante */
const vtexEanForms = (c: string) => (c.length === 13 && c.startsWith('0') ? [c, c.slice(1)] : [c]);

/** Busca por código de barras (de a varios por pedido). Devuelve solo los artículos con alguno de esos códigos. */
export async function searchElDoradoByEan(eans: string[], opts: SearchOptions = {}): Promise<WebItem[]> {
  const codes = [...new Set(eans.map(realGtin).filter((c): c is string => c !== null))];
  const wanted = new Set(codes);
  const out: WebItem[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < codes.length; i += EAN_BATCH) {
    const fq = codes
      .slice(i, i + EAN_BATCH)
      .flatMap(vtexEanForms)
      .map((c) => `fq=alternateIds_Ean:${c}`)
      .join('&');
    const json = await getElDoradoJson(`${API}?${fq}&_from=0&_to=${VTEX_PAGE_MAX - 1}`, opts.fetchImpl);
    for (const item of parseVtexCatalog(json, CHAIN, BASE)) {
      if (!item.ean || !wanted.has(item.ean) || seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
  }
  const limit = Math.floor(vtexNum(opts.limit));
  return limit > 0 ? out.slice(0, limit) : out;
}
