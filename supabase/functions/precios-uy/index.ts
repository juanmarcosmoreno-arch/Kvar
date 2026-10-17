/**
 * precios-uy: precios de hoy de los súper cerca tuyo, desde precios.uy (Sistema de Información de Precios al
 * Consumidor, Ministerio de Economía y Finanzas). Solo Uruguay.
 *
 * precios.uy no tiene API ni permite pedidos desde otra web (CORS), así que esta función hace lo mismo que su
 * página: abre una sesión, pide los locales de una zona del mapa y la lista de precios de cada local.
 *
 *   POST { action: 'stores', lat, lng, km }  → { stores: SipcStore[] }
 *   POST { action: 'prices', ids: number[] } → { prices: { [id]: SipcPrice[] }, at }
 *
 * Archivo único y sin dependencias: se puede pegar tal cual en el editor de Edge Functions de Supabase.
 */

export interface SipcStore {
  id: number;
  name: string;
  /** Cadena (disco, tata, tienda-inglesa…), para los descuentos con tarjeta */
  chain: string;
  address: string;
  lat: number;
  lng: number;
}

export interface SipcPrice {
  /** Tal cual lo publica precios.uy («Arroz blanco - Vidarroz, 1.0») */
  name: string;
  price: number;
  offer: boolean;
  /** Día del precio (AAAA-MM-DD) */
  date: string | null;
}

const BASE = 'https://www.precios.uy/sipc2Web/';
const HOME = `${BASE}home.xhtml`;
const MAX_KM = 10;
const MAX_STORES = 10;

/** Farmacias: venden higiene personal pero no son súper */
const NOT_GROCERY = /farma|san roque|pigalle|farmacia|drogueria/i;

const CHAINS: [RegExp, string][] = [
  [/^disco\b/i, 'disco'],
  [/^devoto\b/i, 'devoto'],
  [/^tienda inglesa\b/i, 'tienda-inglesa'],
  [/^ta\s*-?\s*ta\b/i, 'tata'],
  [/^g[eé]ant\b/i, 'geant'],
  [/^micromacro\b/i, 'micromacro'],
  [/^macro\s*mercado\b|^macromercado\b/i, 'macromercado'],
  [/^el dorado\b/i, 'el-dorado'],
  [/^multi\s*ahorro\b/i, 'multi-ahorro'],
  [/^kinko\b/i, 'kinko'],
  [/^frog\b/i, 'frog'],
  [/^el clon\b/i, 'el-clon'],
  [/^la colonial\b/i, 'la-colonial'],
  [/^super\s*ariel\b/i, 'super-ariel'],
];

export function chainOf(name: string): string {
  const clean = name.trim().replace(/\s+/g, ' ');
  for (const [re, key] of CHAINS) if (re.test(clean)) return key;
  const first = clean.split(' ')[0] ?? clean;
  return first.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'otro';
}

const decode = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&');

const text = (html: string) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

/** Una sesión de la página (cookie + estado del formulario de JSF) */
class Session {
  private cookies = new Map<string, string>();
  private viewState = '';

  private remember(res: Response) {
    const list = (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
    for (const c of list) {
      const [pair] = c.split(';');
      const i = pair.indexOf('=');
      if (i > 0) this.cookies.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
    }
  }

  private get cookieHeader() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  async open() {
    const res = await fetch(BASE, { headers: { 'User-Agent': 'Mozilla/5.0 (Stoka)' } });
    this.remember(res);
    const html = await res.text();
    const vs = /javax\.faces\.ViewState:0" value="([^"]*)"/.exec(html);
    if (!vs) throw new Error('precios.uy cambió (sin ViewState)');
    this.viewState = vs[1];
  }

  async ajax(fields: Record<string, string>): Promise<string> {
    const body = new URLSearchParams({ ...fields, form: 'form', 'javax.faces.partial.ajax': 'true', 'javax.faces.ViewState': this.viewState });
    const res = await fetch(HOME, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Faces-Request': 'partial/ajax',
        'X-Requested-With': 'XMLHttpRequest',
        Cookie: this.cookieHeader,
        'User-Agent': 'Mozilla/5.0 (Stoka)',
      },
      body,
    });
    this.remember(res);
    const xml = await res.text();
    if (!res.ok || /session.*caducado|ViewExpired/i.test(xml)) throw new Error(`precios.uy respondió ${res.status}`);
    return xml;
  }
}

/** Locales en un cuadrado de `km` alrededor del punto (los más cerca primero) */
export async function storesNear(lat: number, lng: number, km: number): Promise<SipcStore[]> {
  const s = new Session();
  await s.open();
  const dLat = km / 111;
  const dLng = km / (111 * Math.cos((lat * Math.PI) / 180));
  const xml = await s.ajax({
    'javax.faces.source': 'form:gmap',
    'javax.faces.partial.execute': 'form:gmap',
    'javax.faces.partial.render': 'form:markersAsJson',
    'javax.faces.behavior.event': 'stateChange',
    'javax.faces.partial.event': 'stateChange',
    'form:gmap_center': `${lat},${lng}`,
    'form:gmap_zoom': '14',
    'form:gmap_northeast': `${lat + dLat},${lng + dLng}`,
    'form:gmap_southwest': `${lat - dLat},${lng - dLng}`,
  });
  const m = /id="form:markersAsJson"[^>]*value="([^"]*)"/.exec(xml);
  if (!m) throw new Error('precios.uy cambió (sin locales)');
  const markers = (JSON.parse(decode(m[1])) as { markers: { lat: number; lng: number; title: string; data: { id: number; direccion: string } }[] }).markers;
  return markers
    .filter((x) => !NOT_GROCERY.test(x.title))
    .map((x) => ({
      id: x.data.id,
      name: x.title.replace(/\s+/g, ' ').trim(),
      chain: chainOf(x.title),
      // precios.uy completa el número de puerta con «0» o «null» cuando no tiene
      address: (x.data.direccion ?? '').replace(/\s+/g, ' ').replace(/\bnull\b/g, '').trim().replace(/\s+0$/, ''),
      lat: x.lat,
      lng: x.lng,
    }))
    .sort((a, b) => distance(lat, lng, a) - distance(lat, lng, b));
}

function distance(lat: number, lng: number, p: { lat: number; lng: number }) {
  const dy = (p.lat - lat) * 111;
  const dx = (p.lng - lng) * 111 * Math.cos((lat * Math.PI) / 180);
  return Math.hypot(dx, dy);
}

/** «oferta - $30.0 - 17/10/26» → precio, oferta y fecha */
export function parsePriceCell(cell: string): Omit<SipcPrice, 'name'> | null {
  const price = /\$\s*([\d.,]+)/.exec(cell);
  if (!price) return null;
  const date = /(\d{2})\/(\d{2})\/(\d{2,4})/.exec(cell);
  const year = date ? (date[3].length === 2 ? `20${date[3]}` : date[3]) : null;
  return {
    price: Number(price[1].replace(/,/g, '')),
    offer: /oferta/i.test(cell),
    date: date ? `${year}-${date[2]}-${date[1]}` : null,
  };
}

/** Filas de la tabla de precios de un local */
export function parsePriceTable(xml: string): SipcPrice[] {
  const out: SipcPrice[] = [];
  for (const row of xml.matchAll(/<tr[^>]*data-ri="\d+"[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => text(c[1]));
    if (cells.length < 2) continue;
    // La primera celda trae el título de la columna para celulares («Artículo …»)
    const name = cells[0].replace(/^Art[ií]culo\s+/i, '').trim();
    const p = parsePriceCell(cells[1]);
    if (name && p && p.price > 0) out.push({ name, ...p });
  }
  return out;
}

/** Lista de precios de cada local (en una misma sesión, uno atrás del otro) */
export async function pricesOf(ids: number[]): Promise<Record<number, SipcPrice[]>> {
  const s = new Session();
  await s.open();
  // Modo «Lista de precios»
  await s.ajax({
    'javax.faces.source': 'form:j_idt42',
    'javax.faces.partial.execute': 'form:j_idt42',
    'javax.faces.partial.render': 'form:panelcomparar',
    'javax.faces.behavior.event': 'change',
    'javax.faces.partial.event': 'change',
    'form:j_idt42': '3',
  });
  const out: Record<number, SipcPrice[]> = {};
  for (const id of ids) {
    const common = { 'form:j_idt42': '3', 'form:idEstablecimiento': String(id) };
    await s.ajax({
      ...common,
      'javax.faces.source': 'form:BtnVerPrecios',
      'javax.faces.partial.execute': '@all',
      'javax.faces.partial.render': 'form:panelresultados',
      'form:BtnVerPrecios': 'form:BtnVerPrecios',
    });
    // Todas las filas de una vez (la tabla viene paginada de a 30)
    const xml = await s.ajax({
      ...common,
      'javax.faces.source': 'form:resultado',
      'javax.faces.partial.execute': 'form:resultado',
      'javax.faces.partial.render': 'form:resultado',
      'form:resultado': 'form:resultado',
      'form:resultado_pagination': 'true',
      'form:resultado_first': '0',
      'form:resultado_rows': '2000',
      'form:resultado_skipChildren': 'true',
      'form:resultado_encodeFeature': 'true',
    });
    out[id] = parsePriceTable(xml);
  }
  return out;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

export async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  let input: { action?: string; lat?: number; lng?: number; km?: number; ids?: number[] };
  try {
    input = await req.json();
  } catch {
    return json({ error: 'json' }, 400);
  }
  try {
    if (input.action === 'stores') {
      const { lat, lng } = input;
      // Uruguay, más o menos
      if (typeof lat !== 'number' || typeof lng !== 'number' || lat > -30 || lat < -35.2 || lng > -53 || lng < -58.6) {
        return json({ error: 'fuera de Uruguay' }, 400);
      }
      const km = Math.min(MAX_KM, Math.max(0.5, Number(input.km) || 2));
      return json({ stores: await storesNear(lat, lng, km) });
    }
    if (input.action === 'prices') {
      const ids = [...new Set((input.ids ?? []).map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, MAX_STORES);
      if (!ids.length) return json({ error: 'ids' }, 400);
      return json({ prices: await pricesOf(ids), at: new Date().toISOString() });
    }
    return json({ error: 'action' }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 502);
  }
}

declare const Deno: { serve: (h: (req: Request) => Response | Promise<Response>) => void } | undefined;
if (typeof Deno !== 'undefined') Deno.serve(handle);
