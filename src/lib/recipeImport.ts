/**
 * Descargar la página de una receta. En la app de iPhone se usa el HTTP nativo de Capacitor
 * (no tiene CORS); en la web se intenta con fetch y, si el sitio no lo permite, se avisa con un
 * error tipado para ofrecer pegar el texto.
 */
import { CapacitorHttp } from '@capacitor/core';
import { parseRecipePage, type ImportedRecipe } from '../domain/recipeImport';
import { isNative } from './platform';

export type RecipeImportErrorKind = 'invalid-url' | 'web-blocked' | 'network' | 'http' | 'not-recipe';

export class RecipeImportError extends Error {
  constructor(readonly kind: RecipeImportErrorKind, message?: string) {
    super(message ?? kind);
    this.name = 'RecipeImportError';
  }
}

const USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

/** «cocina.com/receta» → «https://cocina.com/receta»; null si no es un link http(s). */
export function normalizeRecipeUrl(input: string): string | null {
  const raw = input.trim().match(/https?:\/\/\S+/i)?.[0] ?? input.trim();
  if (!raw || /\s/.test(raw)) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!/^https?:$/.test(url.protocol) || !url.hostname.includes('.')) return null;
    return url.href;
  } catch {
    return null;
  }
}

export async function fetchRecipePage(url: string): Promise<string> {
  if (isNative) {
    let res;
    try {
      res = await CapacitorHttp.request({
        url,
        method: 'GET',
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
        responseType: 'text',
        connectTimeout: 15000,
        readTimeout: 15000,
      });
    } catch (e) {
      throw new RecipeImportError('network', String(e));
    }
    if (res.status < 200 || res.status >= 300) throw new RecipeImportError('http', `HTTP ${res.status}`);
    return typeof res.data === 'string' ? res.data : JSON.stringify(res.data ?? '');
  }
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: 'text/html' }, mode: 'cors', credentials: 'omit' });
  } catch (e) {
    // En el navegador, un sitio sin CORS falla sin más detalle (TypeError): no se puede leer desde la web
    throw new RecipeImportError(navigator.onLine === false ? 'network' : 'web-blocked', String(e));
  }
  if (!res.ok) throw new RecipeImportError('http', `HTTP ${res.status}`);
  return res.text();
}

/** Descarga y lee la receta. Lanza RecipeImportError (invalid-url, web-blocked, network, http, not-recipe). */
export async function importRecipeFromUrl(input: string): Promise<ImportedRecipe> {
  const url = normalizeRecipeUrl(input);
  if (!url) throw new RecipeImportError('invalid-url');
  const html = await fetchRecipePage(url);
  const recipe = parseRecipePage(html, url);
  if (!recipe) throw new RecipeImportError('not-recipe');
  return recipe;
}
