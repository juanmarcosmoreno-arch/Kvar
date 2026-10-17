import { describe, expect, it } from 'vitest';
import { disabledChains, handle, lookup, queryKey } from '../../../supabase/functions/precios-web/handler';
import type { WebItem, WebSearch } from '../../../supabase/functions/precios-web/types';

const item = (chain: string, name: string, price: number): WebItem => ({
  chain, id: name, name, brand: null, ean: null, price, listPrice: null, perKg: false, url: `https://${chain}.uy/${name}`, image: null,
});

const ok = (chain: string): WebSearch => async (q) => [item(chain, `${q} 1 kg`, 100)];
const broken: WebSearch = async () => {
  throw new Error('HTTP 503');
};

const post = (body: unknown) => new Request('https://x/precios-web', { method: 'POST', body: JSON.stringify(body) });

describe('precios-web', () => {
  it('la misma búsqueda escrita distinto', () => {
    expect(queryKey('  Dulce de LECHE ')).toBe('dulce de leche');
  });

  it('busca en cada cadena; la que falla en todo va a «failed» y no rompe las demás', async () => {
    const { results, failed } = await lookup(['tata', 'disco'], ['arroz', 'yerba'], null, { tata: ok('tata'), disco: broken });
    expect(results.tata.arroz[0].name).toBe('arroz 1 kg');
    expect(results.tata.yerba).toHaveLength(1);
    expect(results.disco).toEqual({ arroz: [], yerba: [] });
    expect(failed).toEqual(['disco']);
  });

  it('una consulta que falla sola queda vacía, sin marcar la cadena', async () => {
    const flaky: WebSearch = async (q) => {
      if (q === 'yerba') throw new Error('timeout');
      return [item('tata', q, 50)];
    };
    const { results, failed } = await lookup(['tata'], ['arroz', 'yerba'], null, { tata: flaky });
    expect(results.tata.yerba).toEqual([]);
    expect(results.tata.arroz).toHaveLength(1);
    expect(failed).toEqual([]);
  });

  it('Ta-Ta recibe el departamento (Montevideo si no hay); las demás no', async () => {
    const seen: (string | null | undefined)[] = [];
    const spy = (chain: string): WebSearch => async (_q, opts) => {
      seen.push(`${chain}:${opts?.region ?? ''}`);
      return [];
    };
    await lookup(['tata', 'disco'], ['arroz'], null, { tata: spy('tata'), disco: spy('disco') });
    await lookup(['tata'], ['arroz'], 'Salto', { tata: spy('tata') });
    expect(seen.sort()).toEqual(['disco:', 'tata:Montevideo', 'tata:Salto']);
  });

  it('cadenas apagadas desde Supabase', () => {
    expect([...disabledChains(' Tata, disco ,,')]).toEqual(['tata', 'disco']);
    expect(disabledChains(undefined).size).toBe(0);
  });

  it('valida el pedido', async () => {
    const readers = { tata: ok('tata') };
    expect((await handle(post({ action: 'search', chains: ['tata'], query: 'arroz' }), readers)).status).toBe(200);
    expect((await handle(post({ action: 'search', chains: ['otra'], query: 'arroz' }), readers)).status).toBe(400);
    expect((await handle(post({ action: 'search', chains: ['tata'], query: 'a' }), readers)).status).toBe(400);
    expect((await handle(post({ action: 'nada', chains: ['tata'] }), readers)).status).toBe(400);
    expect((await handle(new Request('https://x', { method: 'GET' }), readers)).status).toBe(405);
    const res = await handle(post({ action: 'lookup', chains: ['tata', 'tata'], queries: ['Arroz', 'arroz ', 'yerba'] }), readers);
    const body = await res.json();
    expect(Object.keys(body.results.tata).sort()).toEqual(['arroz', 'yerba']);
    expect(body.failed).toEqual([]);
  });
});

describe('index.ts para pegar en Supabase', () => {
  it('está al día con los lectores (si falla: npm run build:precios-web)', async () => {
    // @ts-expect-error: script de Node sin tipos
    const { bundlePreciosWeb, OUT } = await import('../../../scripts/build-precios-web.mjs');
    const { readFileSync } = await import('node:fs');
    expect(readFileSync(OUT, 'utf8')).toBe(await bundlePreciosWeb());
  });
});
