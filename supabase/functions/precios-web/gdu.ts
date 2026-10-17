/**
 * Disco, Devoto y Géant (Grupo Disco del Uruguay): las tres webs son la misma plataforma propia de GDU (ASP.NET
 * Blazor, en Azure) y comparten los SKU, pero cada cadena tiene sus precios y sus ofertas.
 *
 * No hay API JSON: la búsqueda, el «ver más» y el cambio de local van por el websocket de Blazor. Lo único que se
 * puede pedir con un GET común es la página ya armada:
 *
 *   GET https://{web}/productos/keyword/{texto}   → las primeras 12 tarjetas (?page=2 se ignora: siempre son 12)
 *   GET https://{web}/product/{slug}/{sku}        → la página del producto, con un JSON-LD de schema.org (gtin)
 *
 * - Los precios son los del local que la web muestra sin iniciar sesión (Disco Fresh Market Plaza Italia, Devoto
 *   Fresh Market Portones, Géant Parque Roosevelt): son «el precio de la web», no el de tu local. La zona
 *   (opts.region) no se usa: cambiar de local pide iniciar sesión.
 * - La búsqueda es aproximada («arroz» trae aceite de arroz): se devuelve lo que da la web y se compara después.
 * - En la tarjeta: `div.before` es el precio de antes de la oferta de la cadena; `div.text` el de ahora. El bloque
 *   `div.price.dcto.santander` («Hiper Más», «Santander 20%OFF») es solo pagando con esa tarjeta: no se usa nunca.
 * - Pesables (`product-price-weighable`): el primer precio es por kilo («$ 529 / kg») y el segundo el de la pieza
 *   aproximada. Se devuelve el del kilo con perKg.
 * - La búsqueda no trae el código de barras; está en la página de cada producto (`fetchGduProduct`), pero es un
 *   pedido de ~70 KB por producto, así que la búsqueda no lo pide.
 */
import { BROWSER_HEADERS, type SearchOptions, type WebItem, type WebSearch } from './types';

export type GduChain = 'disco' | 'devoto' | 'geant';

/** La web de cada cadena */
export const GDU_HOSTS: Record<GduChain, string> = {
  disco: 'www.disco.com.uy',
  devoto: 'www.devoto.com.uy',
  geant: 'www.geant.com.uy',
};

/** Tarjetas que vienen en la página de búsqueda (las demás llegan por el websocket) */
const GDU_PAGE_SIZE = 12;

/** Marcas que no son marcas (la web pone «-» o el rubro: «Frutas», «BOVINA») */
const GDU_NO_BRAND = /^(?:-+|\.+|sin marca|otras? marcas?|varios|gen[eé]ric[oa]s?|frutas?|verduras?|frutas y verduras|bovina|porcina|ovina)$/i;

/** Precios que dependen de con qué pagás: nunca son el de góndola */
const GDU_BANK = /\bdcto\b|lbl-dcto|santander|ita[uú]|hiper\s*m[aá]s|bbva|scotia|brou|\boca\b|\bvisa\b|master\s*card|amex|tarjeta|banco/i;

const GDU_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** Blazor escribe los acentos como &#xE1; */
const gduDecode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, e: string) => {
    if (e[0] !== '#') return GDU_ENTITIES[e.toLowerCase()] ?? all;
    const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1));
    return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : all;
  });

const gduText = (html: string) => gduDecode(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

const gduMoney = (n: number) => Math.round(n * 100) / 100;

/**
 * Precio de la tarjeta → número (o null). La web escribe los decimales con coma («45,2» es la leche fresca) y los
 * miles sin separar («59990»); por las dudas, «1.234» o «1.234,50» se leen como miles.
 */
function gduNumber(raw: string): number | null {
  const t = gduDecode(raw).replace(/[\s$]/g, '');
  let n = NaN;
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(t)) n = Number(t.replace(/\./g, '').replace(',', '.'));
  else if (/^\d+(?:[.,]\d+)?$/.test(t)) n = Number(t.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** «359.00» (con punto decimal, como en el JSON-LD y las meta) → número */
const gduDotNumber = (raw: string) => {
  const n = /^\d+(?:\.\d+)?$/.test(raw.trim()) ? Number(raw.trim()) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Un <div> con esa clase (entre otras) */
const gduDiv = (cls: string) => new RegExp(`<div\\s[^>]*class="(?:[^"]*\\s)?${cls}(?:\\s[^"]*)?"[^>]*>`, 'i');

/** Dígito verificador de un EAN-8/EAN-13 */
function gduCheckDigitOk(code: string): boolean {
  let sum = 0;
  for (let i = code.length - 2, w = 3; i >= 0; i--, w = 4 - w) sum += Number(code[i]) * w;
  return (10 - (sum % 10)) % 10 === Number(code[code.length - 1]);
}

/**
 * El `gtin` del JSON-LD («07791290010079», con 14 cifras) → EAN-13/EAN-8 si es de verdad, o null.
 * Los de balanza o del local vienen rellenos con ceros y empiezan con 2 («00000026850672»).
 */
export function gduEan(raw: unknown): string | null {
  const code = typeof raw === 'string' || typeof raw === 'number' ? String(raw).trim() : '';
  if (!/^\d{8,14}$/.test(code)) return null;
  const s = code.replace(/^0+/, '');
  let gtin: string;
  if (s.length === 8) gtin = s;
  else if (s.length >= 11 && s.length <= 13) gtin = s.padStart(13, '0'); // EAN-13 (o UPC-A con un 0 adelante)
  else return null;
  if (!gduCheckDigitOk(gtin)) return null;
  if (gtin.length === 8) return gtin.startsWith('2') ? null : gtin;
  // 2xx: balanza / del local; 02x, 04x y 05x: circulación restringida y cupones; 98x-99x: vales
  if (/^(?:2|0[245]|9[89])/.test(gtin)) return null;
  return gtin;
}

/** Lo que se paga por un producto según los bloques de precio de la tarjeta o de la página */
export interface GduPrice {
  price: number;
  listPrice: number | null;
  perKg: boolean;
}

interface GduPriceBlock {
  now: number | null;
  before: number | null;
  /** Lo que viene después del precio: «kg» en «$ 529 / kg» */
  unit: string | null;
  bank: boolean;
}

function gduPriceBlock(html: string): GduPriceBlock {
  const val = (from: number) => {
    const m = /<span\s[^>]*class="val"[^>]*>([^<]*)<\/span>(\s*<span[^>]*>\s*\/\s*([^<]*)<\/span>)?/i.exec(html.slice(from));
    return m ? { n: gduNumber(m[1]), unit: m[3] ? gduText(m[3]).toLowerCase() : null } : null;
  };
  const before = gduDiv('before').exec(html);
  const text = gduDiv('text').exec(html);
  const now = text ? val(text.index) : null;
  return {
    now: now?.n ?? null,
    unit: now?.unit ?? null,
    before: before ? (val(before.index)?.n ?? null) : null,
    bank: GDU_BANK.test(html),
  };
}

/**
 * Bloques de precio (`div.product-prices`) de una tarjeta de la búsqueda o del detalle de un producto → precio de
 * góndola, el de antes si la cadena tiene una oferta, y si es por kilo. Los precios con tarjeta se ignoran.
 */
export function parseGduPrices(html: string): GduPrice | null {
  const starts = [...html.matchAll(/<div\s[^>]*class="(?:[^"]*\s)?product-prices(?:\s[^"]*)?"/gi)].map((m) => m.index ?? 0);
  const blocks = starts.map((s, i) => gduPriceBlock(html.slice(s, starts[i + 1] ?? html.length)));
  const usable = blocks.filter((b) => !b.bank && b.now !== null);
  const kg = usable.find((b) => b.unit !== null && /^(?:kg|kilo|kilos|kilogramos?)\.?$/.test(b.unit));
  // Si hay precio por kilo, ese; si no, el primero que sea por la unidad de venta (no «/ 100 g» o «/ lt»)
  const main = kg ?? usable.find((b) => b.unit === null);
  if (!main || main.now === null) return null;
  const price = gduMoney(main.now);
  return {
    price,
    listPrice: main.before !== null && main.before > price + 0.009 ? gduMoney(main.before) : null,
    perKg: !!kg,
  };
}

const gduBrand = (raw: string | null | undefined) => {
  const b = gduText(raw ?? '');
  return b && !GDU_NO_BRAND.test(b) ? b : null;
};

/** «www.disco.com.uy» o «https://www.disco.com.uy/» → «https://www.disco.com.uy» */
const gduOrigin = (host: string) => {
  const h = host.trim().replace(/\/+$/, '');
  return /^https?:\/\//i.test(h) ? h : `https://${h}`;
};

function gduAbsolute(href: string, origin: string): string {
  const h = gduDecode(href).trim();
  if (/^https?:\/\//i.test(h)) return h;
  if (h.startsWith('//')) return `https:${h}`;
  return `${origin}${h.startsWith('/') ? '' : '/'}${h}`;
}

/** Foto del producto (la primera de la tarjeta; las «cucardas» de promo usan data-image-src y no van) */
function gduImage(card: string, origin: string): string | null {
  const fig = /<figure\b[\s\S]*?<\/figure>/i.exec(card)?.[0] ?? card;
  for (const m of fig.matchAll(/<img\b[^>]*>/gi)) {
    const src = /\ssrc="([^"]*)"/i.exec(m[0])?.[1] ?? '';
    if (src && !/^data:/i.test(src)) return gduAbsolute(src, origin);
  }
  return null;
}

/** Tarjetas de la página de búsqueda → productos (solo los resultados: no los carruseles de otras partes) */
export function parseGduSearch(html: string, chain: string, host: string): WebItem[] {
  const origin = gduOrigin(host);
  let list = html;
  const start = html.search(/<div\s[^>]*id="lista-productos"/i);
  if (start >= 0) {
    const end = html.indexOf('<footer', start);
    list = html.slice(start, end > start ? end : html.length);
  } else if (/class="(?:[^"]*\s)?no-products-message\b|class="(?:[^"]*\s)?total-prods\b[^"]*"[^>]*>\s*<strong>\s*0\s*<\/strong>/i.test(html)) {
    // «No se encontraron productos.»: si un día ponen sugerencias en esa página, no son resultados
    return [];
  }
  const starts = [...list.matchAll(/<div\s[^>]*class="(?:[^"]*\s)?product-item(?:\s[^"]*)?"[^>]*>/gi)].map((m) => m.index ?? 0);
  const out: WebItem[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < starts.length; i++) {
    try {
      const card = list.slice(starts[i], starts[i + 1] ?? list.length);
      const link = /<h3[^>]*>\s*<a\s[^>]*href="([^"]*\/product\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/i.exec(card);
      if (!link) continue;
      const path = gduDecode(link[1]).split(/[?#]/)[0];
      const id = /\/product\/(?:[^/]*\/)?([^/]+)\/?$/.exec(path)?.[1] ?? '';
      const name = gduText(link[2]);
      if (!id || !name || seen.has(id)) continue;
      // Hasta las etiquetas de abajo; si cambian de lugar, hasta el botón de agregar
      const pricesAt = card.search(/<div\s[^>]*class="(?:[^"]*\s)?desc-prices/i);
      if (pricesAt < 0) continue;
      const rest = card.slice(pricesAt);
      const stop = rest.search(/<div\s[^>]*class="(?:[^"]*\s)?(?:prod-labels|prod-add)\b/i);
      const p = parseGduPrices(stop > 0 ? rest.slice(0, stop) : rest);
      if (!p) continue;
      const brand = /<a\s[^>]*href="[^"]*\/products\/brand\/[^"]*"[^>]*>([\s\S]*?)<\/a>/i.exec(card)?.[1];
      seen.add(id);
      out.push({
        chain,
        id,
        name,
        brand: gduBrand(brand),
        ean: null,
        price: p.price,
        listPrice: p.listPrice,
        perKg: p.perKg,
        url: gduAbsolute(path, origin),
        image: gduImage(card, origin),
      });
    } catch {
      // Una tarjeta rara no corta la búsqueda
    }
  }
  return out;
}

/** Lo que dice la página de un producto */
export interface GduProduct {
  /** SKU de GDU (el mismo en las tres cadenas) */
  id: string;
  name: string;
  brand: string | null;
  ean: string | null;
  price: number;
  listPrice: number | null;
  perKg: boolean;
  inStock: boolean;
  /** og:url (la dirección del producto en esa web), si está */
  url: string | null;
  image: string | null;
}

type GduJson = Record<string, unknown>;
const gduIsObj = (v: unknown): v is GduJson => typeof v === 'object' && v !== null && !Array.isArray(v);
const gduStr = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : typeof v === 'number' ? String(v) : '');

/** El Product del JSON-LD (puede venir solo, en una lista o en un @graph) */
function gduLdProduct(html: string): GduJson | null {
  // Blazor escribe el type como «application/ld&#x2B;json»
  const re = /<script\b[^>]*type=["']?application\/ld(?:\+|&#x2B;|&#43;|&plus;)json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(re)) {
    let data: unknown;
    try {
      data = JSON.parse(m[1].trim());
    } catch {
      continue;
    }
    const queue: unknown[] = [data];
    while (queue.length) {
      const x = queue.shift();
      if (Array.isArray(x)) queue.push(...x);
      else if (gduIsObj(x)) {
        const type = x['@type'];
        if (type === 'Product' || (Array.isArray(type) && type.includes('Product'))) return x;
        if (Array.isArray(x['@graph'])) queue.push(...x['@graph']);
      }
    }
  }
  return null;
}

const gduMeta = (html: string, prop: string) => {
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (new RegExp(`\\sproperty="${prop.replace(/[.:]/g, '\\$&')}"`, 'i').test(m[0])) {
      const c = /\scontent="([^"]*)"/i.exec(m[0]);
      if (c) return gduDecode(c[1]).trim();
    }
  }
  return null;
};

/**
 * Página de un producto → nombre, marca, EAN (del `gtin` del JSON-LD, si es real) y precio. El precio es el del
 * JSON-LD (el de góndola, sin el de Santander); el de antes y si es por kilo salen de los bloques de precio.
 * null si la página no tiene el JSON-LD del producto (por ejemplo, un SKU que ya no existe: la web redirige).
 */
export function parseGduProduct(html: string): GduProduct | null {
  const ld = gduLdProduct(html);
  if (!ld) return null;
  const offers = Array.isArray(ld.offers) ? ld.offers.find(gduIsObj) : ld.offers;
  const offer = gduIsObj(offers) ? offers : {};
  const detAt = html.search(/<div\s[^>]*class="(?:[^"]*\s)?det-precios/i);
  let det: GduPrice | null = null;
  if (detAt >= 0) {
    const rest = html.slice(detAt);
    const stop = rest.search(/<div\s[^>]*class="(?:[^"]*\s)?det-add\b/i);
    det = parseGduPrices(stop > 0 ? rest.slice(0, stop) : rest.slice(0, 6000));
  }
  // En el JSON-LD el precio es un número («359.00»); en la meta, texto con punto decimal
  const ldPrice =
    typeof offer.price === 'number' && Number.isFinite(offer.price) && offer.price > 0
      ? offer.price
      : gduDotNumber(gduStr(offer.price)) ?? gduDotNumber(gduMeta(html, 'product:price:amount') ?? '');
  const price = ldPrice !== null ? gduMoney(ldPrice) : det?.price ?? null;
  const name = gduDecode(gduStr(ld.name));
  const id = gduStr(ld.sku) || /SKU:\s*(\d+)/i.exec(html)?.[1] || '';
  if (price === null || !name || !id) return null;
  const brandRaw = gduIsObj(ld.brand) ? gduStr(ld.brand.name) : gduStr(ld.brand);
  const image = gduStr(Array.isArray(ld.image) ? ld.image[0] : gduIsObj(ld.image) ? ld.image.url : ld.image) || gduMeta(html, 'og:image') || '';
  const availability = gduStr(offer.availability) || gduMeta(html, 'product:availability') || '';
  const ogUrl = gduMeta(html, 'og:url');
  return {
    id,
    name,
    brand: gduBrand(brandRaw),
    ean: gduEan(ld.gtin13 ?? ld.gtin ?? ld.gtin8 ?? ld.gtin14),
    price,
    listPrice: det?.listPrice != null && det.listPrice > price + 0.009 ? det.listPrice : null,
    perKg: det?.perKg ?? false,
    inStock: !/outofstock|out of stock|discontinued|soldout/i.test(availability),
    url: ogUrl && /^https?:\/\//i.test(ogUrl) ? ogUrl : null,
    image: image ? gduDecode(image) : null,
  };
}

const gduTimeout = () => (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(10_000) : undefined);

const GDU_NAMES: Record<GduChain, string> = { disco: 'Disco', devoto: 'Devoto', geant: 'Géant' };

function gduGet(url: string, fetchImpl: typeof fetch): Promise<Response> {
  return fetchImpl(url, {
    headers: { ...BROWSER_HEADERS, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
    redirect: 'follow',
    signal: gduTimeout(),
  });
}

function gduHost(chain: GduChain): string {
  const host = GDU_HOSTS[chain];
  if (!host) throw new Error(`cadena de GDU desconocida: ${chain}`);
  return host;
}

/**
 * Texto para la dirección de la búsqueda: «/» y «+» dan 404 (el «+» lo frena el servidor aunque vaya como %2B) y
 * «?», «#», «%» o «\» romperían la ruta, así que van como espacios. Un medio emoji suelto (o uno cortado por el tope
 * de largo) haría tirar a encodeURIComponent: se saca. Un texto que sea solo puntos movería la dirección («..»): no
 * se busca.
 */
export function gduQuery(query: string): string {
  const q = String(query ?? '')
    .replace(/[/\\?#%+]+/g, ' ')
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  // El tope va por caracteres enteros, no por mitades de un emoji
  const cut = Array.from(q).slice(0, 100).join('').trim();
  return /^[.\s]*$/.test(cut) ? '' : cut;
}

/** Lector de una de las tres cadenas: searchGdu('disco')('yerba') */
export function searchGdu(chain: GduChain): WebSearch {
  const host = gduHost(chain);
  return async (query: string, opts: SearchOptions = {}): Promise<WebItem[]> => {
    const q = gduQuery(query);
    if (!q) return [];
    const want = Number(opts.limit ?? GDU_PAGE_SIZE);
    const limit = Number.isFinite(want) ? Math.min(GDU_PAGE_SIZE, Math.max(1, Math.floor(want))) : GDU_PAGE_SIZE;
    const res = await gduGet(`https://${host}/productos/keyword/${encodeURIComponent(q)}`, opts.fetchImpl ?? fetch);
    if (!res.ok) throw new Error(`${GDU_NAMES[chain]} respondió ${res.status}`);
    return parseGduSearch(await res.text(), chain, host).slice(0, limit);
  };
}

/**
 * Un producto por su SKU (o la dirección de su página), con el código de barras. Un pedido de ~70 KB: usarlo solo
 * para los productos que importan, no para cada resultado. null si la web ya no lo tiene.
 */
export async function fetchGduProduct(
  chain: GduChain,
  skuOrUrl: string,
  opts: Pick<SearchOptions, 'fetchImpl'> = {},
): Promise<WebItem | null> {
  const host = gduHost(chain);
  const origin = `https://${host}`;
  const s = skuOrUrl.trim();
  let url: string;
  if (/^\d+$/.test(s)) url = `${origin}/product/x/${s}`; // el slug no importa
  else if (s.startsWith(`${origin}/product/`)) url = s;
  else if (s.startsWith('/product/')) url = `${origin}${s}`;
  else return null;
  const res = await gduGet(url, opts.fetchImpl ?? fetch);
  if (res.status === 404 || res.status === 410) return null;
  if (!res.ok) throw new Error(`${GDU_NAMES[chain]} respondió ${res.status}`);
  const p = parseGduProduct(await res.text());
  if (!p) return null;
  return {
    chain,
    id: p.id,
    name: p.name,
    brand: p.brand,
    ean: p.ean,
    price: p.price,
    listPrice: p.listPrice,
    perKg: p.perKg,
    url: p.url?.startsWith(`${origin}/product/`) ? p.url : url,
    image: p.image,
  };
}
