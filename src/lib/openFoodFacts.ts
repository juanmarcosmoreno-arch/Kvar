import { offFields, parseOffResponse, type OffProduct } from '../domain/openFoodFacts';
import { lang } from '../i18n';
import { isDemo } from './demo';

/**
 * Busca un código en Open Food Facts (gratis, sin clave; permite llamadas desde el navegador).
 * Devuelve null si no lo conoce o si no hay conexión: el usuario lo nombra una sola vez.
 */
export async function lookupBarcode(barcode: string, timeoutMs = 6000): Promise<OffProduct | null> {
  if (isDemo) {
    // La página de demo no puede salir a internet: respuesta real de OFF guardada para un código de ejemplo
    await new Promise((r) => setTimeout(r, 500));
    return barcode === '7790070411716'
      ? parseOffResponse(barcode, {
          status: 1,
          product: { brands: 'Gallo', categories_tags: ['en:cereals-and-potatoes', 'en:rices'], product_name_es: 'Oro', quantity: '1 kg' },
        })
      : null;
  }
  if (!navigator.onLine) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}?fields=${offFields()}&lc=${lang}`,
      { signal: ctrl.signal },
    );
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return parseOffResponse(barcode, await res.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
