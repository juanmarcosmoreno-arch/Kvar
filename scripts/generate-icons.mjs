// Genera los íconos de la PWA y de iOS a partir de public/brand/stoka-icon.png (ícono de la app,
// fondo crema de borde a borde) y stoka-icon-maskable.png (con más margen, para Android/PWA).
// Ícono actual: la casa con estantes (de la animación de bienvenida). El anterior, la «S», quedó en
// stoka-icon-s.png. Para usar la casa vieja: npm run icons -- --casa
import { chromium } from 'playwright';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const brand = (f) => resolve(root, 'public/brand', f);
const variant = process.argv.includes('--casa') ? 'stoka-icon-casa' : 'stoka-icon';
const dataUrl = (file) => `data:image/png;base64,${readFileSync(brand(file)).toString('base64')}`;
const main = dataUrl(`${variant}.png`);
const maskable = dataUrl(`${variant}-maskable.png`);

const out = resolve(root, 'public/icons');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

async function render(src, size, path, type = 'png') {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:#FAF5E8"><img src="${src}" style="width:${size}px;height:${size}px;display:block"></body></html>`);
  await page.waitForLoadState('networkidle');
  return page.screenshot({ path, type });
}

for (const [name, size, src] of [
  ['apple-touch-icon.png', 180, main], // iOS redondea las esquinas solo
  ['icon-192.png', 192, main],
  ['icon-512.png', 512, main],
  ['icon-maskable-512.png', 512, maskable],
]) {
  await render(src, size, resolve(out, name));
  console.log('✓', name);
}
await render(main, 64, resolve(root, 'public/favicon.png'));
console.log('✓ favicon.png');

// iOS nativo (Capacitor): ícono 1024 sin transparencia y pantalla de arranque lisa, color crema.
const iosAssets = resolve(root, 'ios/App/App/Assets.xcassets');
if (existsSync(iosAssets)) {
  // JPEG intermedio = sin canal alfa (App Store rechaza íconos con transparencia)
  const jpg = await render(main, 1024, undefined, 'jpeg');
  await page.setContent(`<html><body style="margin:0"><img src="data:image/jpeg;base64,${jpg.toString('base64')}" style="display:block"></body></html>`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: resolve(iosAssets, 'AppIcon.appiconset/AppIcon-512@2x.png') });
  console.log('✓ iOS AppIcon 1024');

  await page.setViewportSize({ width: 2732, height: 2732 });
  // Solo el fondo crema: así la bienvenida (o la app) aparece sin saltos, como recomienda Apple
  await page.setContent('<html><body style="margin:0;background:#F5F3EE;height:2732px"></body></html>');
  for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
    await page.screenshot({ path: resolve(iosAssets, 'Splash.imageset', name) });
  }
  console.log('✓ iOS Splash');
}

await browser.close();
