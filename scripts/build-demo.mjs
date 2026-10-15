// Arma la demo publicable: toma dist-demo/index.html (todo en línea) y deja solo el contenido
// de la página (estilos, raíz y scripts), sin <html>/<head>/<body>, en dist-demo/kvar-demo.html.
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = resolve(import.meta.dirname, '../dist-demo');
const html = readFileSync(resolve(dir, 'index.html'), 'utf8');

const styles = [...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0]);
const scripts = [...html.matchAll(/<script[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0]);
const themeScript = scripts.find((s) => s.includes('kvar:theme') && !s.includes('type="module"'));
const appScripts = scripts.filter((s) => s !== themeScript);

const page = [
  '<title>Stoka</title>',
  '<meta name="description" content="Stoka: el stock de la casa, la lista de compras y qué cocinar con lo que hay. Demo con datos de ejemplo.">',
  themeScript ?? '',
  ...styles,
  '<div id="root"></div>',
  ...appScripts,
].join('\n');

writeFileSync(resolve(dir, 'kvar-demo.html'), page);
const extra = existsSync(resolve(dir, 'assets')) ? readdirSync(resolve(dir, 'assets')) : [];
console.log(`kvar-demo.html: ${(page.length / 1024).toFixed(0)} KB · archivos aparte: ${extra.join(', ') || 'ninguno'}`);
