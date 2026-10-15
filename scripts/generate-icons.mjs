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

// iOS nativo (Capacitor): ícono 1024 sin transparencia y pantalla de arranque crema con el ícono al centro.
const iosAssets = resolve(root, 'ios/App/App/Assets.xcassets');
if (existsSync(iosAssets)) {
  await page.setViewportSize({ width: 1024, height: 1024 });
  await page.setContent(
    `<html><body style="margin:0;background:#1B5E3F"><img src="${src('kvar-mark-maskable.svg')}" style="width:1024px;height:1024px;display:block"></body></html>`,
  );
  await page.waitForLoadState('networkidle');
  // JPEG intermedio = sin canal alfa (App Store rechaza íconos con transparencia)
  const jpg = await page.screenshot({ type: 'jpeg', quality: 100 });
  await page.setContent(`<html><body style="margin:0"><img src="data:image/jpeg;base64,${jpg.toString('base64')}" style="display:block"></body></html>`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: resolve(iosAssets, 'AppIcon.appiconset/AppIcon-512@2x.png') });
  console.log('✓ iOS AppIcon 1024');

  await page.setViewportSize({ width: 2732, height: 2732 });
  await page.setContent(
    `<html><body style="margin:0;background:#F5F3EE;display:flex;align-items:center;justify-content:center;height:2732px"><img src="${src('kvar-mark.svg')}" style="width:360px;height:360px;border-radius:80px"></body></html>`,
  );
  await page.waitForLoadState('networkidle');
  for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
    await page.screenshot({ path: resolve(iosAssets, 'Splash.imageset', name) });
  }
  console.log('✓ iOS Splash');
}

await browser.close();
