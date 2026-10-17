/**
 * precios-web: precios de las webs de los súper uruguayos (Ta-Ta, El Dorado, Disco, Devoto y Géant), para
 * mostrarlos al lado de los de precios.uy con su fuente («web de Ta-Ta»).
 *
 *   POST { action: 'search', chains: string[], query: string, region? }      → { results: { [chain]: { [query]: WebItem[] } }, failed, at }
 *   POST { action: 'lookup', chains: string[], queries: string[], region? }  → lo mismo, para varios productos a la vez
 *
 * Cada búsqueda se guarda unas horas en la tabla web_prices (compartida entre todos los hogares), así cada web se
 * consulta lo menos posible. Si una web falla o cambia, esa cadena vuelve en `failed` y la app simplemente no la
 * muestra. Para apagar una cadena sin actualizar la app: secreto PRECIOS_WEB_APAGADAS = «tata,disco» en Supabase.
 *
 * Archivo index.ts: se arma solo (npm run build:precios-web) juntando este y los lectores, para poder pegarlo en
 * el editor de Edge Functions de Supabase.
 */
import { searchElDorado } from './eldorado';
import { searchGdu } from './gdu';
import { searchTata } from './tata';
import type { WebItem, WebSearch } from './types';

const READERS: Record<string, WebSearch> = {
  tata: searchTata,
  'el-dorado': searchElDorado,
  disco: searchGdu('disco'),
  devoto: searchGdu('devoto'),
  geant: searchGdu('geant'),
};

export const WEB_CHAINS = Object.keys(READERS);

/** Cuánto vale lo guardado: los precios de las webs cambian como mucho una vez por día */
const FRESH_HOURS = 12;
const MAX_QUERIES = 40;
const MAX_QUERY_LENGTH = 80;
/** Pedidos a la vez a una misma web (para no cargarla) */
const PER_CHAIN = 2;
const RESULTS = 20;

/** «  Dulce de LECHE » → «dulce de leche» (la misma búsqueda escrita distinto se guarda una vez) */
export const queryKey = (q: string) => q.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LENGTH);

/** Solo Ta-Ta cambia precios por departamento: para las demás la zona no cuenta */
const regionKey = (chain: string, region: string | null) => (chain === 'tata' ? region || 'Montevideo' : '');

declare const Deno: {
  serve: (h: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (name: string) => string | undefined };
} | undefined;

const env = (name: string) => (typeof Deno !== 'undefined' ? Deno.env.get(name) : undefined);

/** Cadenas apagadas desde Supabase (secreto PRECIOS_WEB_APAGADAS = «tata,disco») */
export function disabledChains(value = env('PRECIOS_WEB_APAGADAS')): Set<string> {
  return new Set((value ?? '').split(',').map((c) => c.trim().toLowerCase()).filter(Boolean));
}

// --- Lo guardado (tabla web_prices, solo la usa esta función con la clave de servicio) -------------------------

interface CacheRow {
  chain: string;
  region: string;
  query: string;
  items: WebItem[];
  fetched_at: string;
}

function rest(path: string, init: RequestInit = {}): Promise<Response> | null {
  const url = env('SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

const inList = (values: string[]) => `(${values.map((v) => `"${v.replace(/["\\]/g, (c) => `\\${c}`)}"`).join(',')})`;

async function readCache(chain: string, region: string, queries: string[]): Promise<Map<string, WebItem[]>> {
  const out = new Map<string, WebItem[]>();
  const since = new Date(Date.now() - FRESH_HOURS * 3_600_000).toISOString();
  try {
    const params = new URLSearchParams({
      select: 'query,items',
      chain: `eq.${chain}`,
      region: `eq.${region}`,
      query: `in.${inList(queries)}`,
      fetched_at: `gte.${since}`,
    });
    const res = await rest(`web_prices?${params}`);
    if (!res?.ok) return out;
    for (const row of (await res.json()) as Pick<CacheRow, 'query' | 'items'>[]) out.set(row.query, row.items);
  } catch {
    /* sin lo guardado: se busca en la web */
  }
  return out;
}

async function writeCache(rows: CacheRow[]): Promise<void> {
  if (!rows.length) return;
  try {
    await rest('web_prices?on_conflict=chain,region,query', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows),
    });
  } catch {
    /* la próxima vez se vuelve a buscar */
  }
}

// --- Búsquedas ---------------------------------------------------------------------------------------------------

/** Corre `fn` sobre cada elemento, de a `limit` a la vez */
async function eachLimited<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await fn(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

/**
 * Busca cada consulta en cada cadena (primero lo guardado). Una cadena que falla en todo va a `failed`; si falla en
 * una consulta suelta, esa queda vacía.
 */
export async function lookup(
  chains: string[],
  queries: string[],
  region: string | null,
  readers: Record<string, WebSearch> = READERS,
): Promise<{ results: Record<string, Record<string, WebItem[]>>; failed: string[] }> {
  const results: Record<string, Record<string, WebItem[]>> = {};
  const failed: string[] = [];
  await Promise.all(chains.map(async (chain) => {
    const read = readers[chain];
    if (!read) return;
    const zone = regionKey(chain, region);
    const cached = await readCache(chain, zone, queries);
    const own: Record<string, WebItem[]> = {};
    const fresh: CacheRow[] = [];
    let errors = 0;
    const missing = queries.filter((q) => {
      const hit = cached.get(q);
      if (hit) own[q] = hit;
      return !hit;
    });
    await eachLimited(missing, PER_CHAIN, async (q) => {
      try {
        const items = (await read(q, { region: zone || null, limit: RESULTS })).slice(0, RESULTS);
        own[q] = items;
        fresh.push({ chain, region: zone, query: q, items, fetched_at: new Date().toISOString() });
      } catch {
        errors++;
        own[q] = [];
      }
    });
    if (missing.length && errors === missing.length) failed.push(chain);
    results[chain] = own;
    await writeCache(fresh);
  }));
  return { results, failed };
}

// --- HTTP --------------------------------------------------------------------------------------------------------

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

export async function handle(req: Request, readers: Record<string, WebSearch> = READERS): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  let input: { action?: string; chains?: unknown; query?: unknown; queries?: unknown; region?: unknown };
  try {
    input = await req.json();
  } catch {
    return json({ error: 'json' }, 400);
  }
  const off = disabledChains();
  const chains = Array.isArray(input.chains)
    ? [...new Set(input.chains.filter((c): c is string => typeof c === 'string' && c in readers && !off.has(c)))]
    : [];
  if (!chains.length) return json({ error: 'chains' }, 400);
  const raw = input.action === 'search' ? [input.query] : input.action === 'lookup' && Array.isArray(input.queries) ? input.queries : null;
  if (!raw) return json({ error: 'action' }, 400);
  const queries = [...new Set(raw.filter((q): q is string => typeof q === 'string').map(queryKey).filter((q) => q.length >= 2))].slice(0, MAX_QUERIES);
  if (!queries.length) return json({ error: 'query' }, 400);
  const region = typeof input.region === 'string' && input.region.trim() ? input.region.trim().slice(0, 40) : null;
  const { results, failed } = await lookup(chains, queries, region, readers);
  return json({ results, failed, at: new Date().toISOString() });
}

if (typeof Deno !== 'undefined') Deno.serve((req) => handle(req));
