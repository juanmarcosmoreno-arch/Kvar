// Junta la función precios-web (handler.ts) y los lectores de cada web en un solo index.ts sin dependencias,
// para pegarlo en el editor de Edge Functions de Supabase. Uso: npm run build:precios-web
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../supabase/functions/precios-web');
export const OUT = resolve(dir, 'index.ts');

const BANNER = `// precios-web: precios de las webs de los súper (Ta-Ta, El Dorado, Disco, Devoto y Géant).
// ARCHIVO GENERADO: no editar a mano. Se arma con «npm run build:precios-web» a partir de handler.ts y los lectores
// (tata.ts, eldorado.ts, gdu.ts). Para publicarlo: copiá este archivo entero en el editor de la función en Supabase.
// @ts-nocheck`;

/** El contenido de index.ts */
export async function bundlePreciosWeb() {
  const result = await build({
    entryPoints: [resolve(dir, 'handler.ts')],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    target: 'es2022',
    write: false,
    legalComments: 'none',
    banner: { js: BANNER },
    logLevel: 'silent',
  });
  return result.outputFiles[0].text;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const text = await bundlePreciosWeb();
  const before = (() => {
    try {
      return readFileSync(OUT, 'utf8');
    } catch {
      return '';
    }
  })();
  writeFileSync(OUT, text);
  console.log(before === text ? 'precios-web/index.ts sin cambios' : `precios-web/index.ts actualizado (${Math.round(text.length / 1024)} KB)`);
}
