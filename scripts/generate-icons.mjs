// Genera los PNG de la PWA (apple-touch-icon, 192, 512, maskable) a partir de los SVG
// de public/brand usando el Chromium de Playwright. Si existe public/brand/kvar-icon.png
// (ícono original en alta resolución), se usa ese en lugar del SVG.
import { chromium } from 'playwright';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'public/icons');
mkdirSync(out, { recursive: true });

const custom = resolve(root, 'public/brand/kvar-icon.png');
const src = (file) =>
  existsSync(custom)
    ? `data:image/png;base64,${readFileSync(custom).toString('base64')}`
    : `data:image/svg+xml;base64,${readFileSync(resolve(root, 'public/brand', file)).toString('base64')}`;

const jobs = [
  { name: 'apple-touch-icon.png', size: 180, file: 'kvar-mark-maskable.svg' }, // iOS redondea solo
  { name: 'icon-192.png', size: 192, file: 'kvar-mark.svg' },
  { name: 'icon-512.png', size: 512, file: 'kvar-mark.svg' },
  { name: 'icon-maskable-512.png', size: 512, file: 'kvar-mark-maskable.svg' },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const j of jobs) {
  await page.setViewportSize({ width: j.size, height: j.size });
  await page.setContent(
    `<html><body style="margin:0;background:#1B5E3F"><img src="${src(j.file)}" style="width:${j.size}px;height:${j.size}px;display:block"></body></html>`,
  );
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: resolve(out, j.name), omitBackground: false });
  console.log('✓', j.name);
}
await browser.close();
