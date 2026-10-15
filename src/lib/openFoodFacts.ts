import { OFF_FIELDS, parseOffResponse, type OffProduct } from '../domain/openFoodFacts';

/**
 * Busca un código en Open Food Facts (gratis, sin clave; permite llamadas desde el navegador).
 * Devuelve null si no lo conoce o si no hay conexión: el usuario lo nombra una sola vez.
 */
export async function lookupBarcode(barcode: string, timeoutMs = 6000): Promise<OffProduct | null> {
  if (!navigator.onLine) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}?fields=${OFF_FIELDS}&lc=es`,
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
