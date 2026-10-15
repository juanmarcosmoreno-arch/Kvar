/**
 * Textos de la app en varios idiomas.
 *
 *   import { m } from '../i18n';   m.common.save   m.common.people(3)
 *
 * `m` se elige una sola vez al arrancar (initI18n, antes de dibujar): cambiar de idioma recarga la app.
 * El español viene incluido; los demás se cargan aparte. Cada idioma tiene exactamente las mismas claves
 * que el español (si falta una, no compila).
 */
import { es, type Messages } from './es';
import { detectLang, isLang, LANGUAGES, localeFor, type Lang, type LangChoice } from './languages';

export type { Messages } from './es';
export { LANGUAGES, type Lang, type LangChoice } from './languages';

export let m: Messages = es;
export let lang: Lang = 'es';
/** Para Intl (fechas, números, orden alfabético) */
export let locale = 'es-UY';

const KEY = 'stoka:idioma';
const loaders = import.meta.glob<{ messages: Messages }>(['./*/index.ts', '!./es/index.ts']);

export function savedChoice(): LangChoice {
  try {
    const v = localStorage.getItem(KEY);
    return isLang(v) ? v : 'auto';
  } catch {
    return 'auto';
  }
}

function devicePreferences(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  return navigator.languages?.length ? navigator.languages : navigator.language ? [navigator.language] : [];
}

export async function initI18n(): Promise<void> {
  const prefs = devicePreferences();
  const choice = savedChoice();
  const wanted: Lang = choice === 'auto' ? detectLang(prefs) : choice;
  if (wanted !== 'es') {
    try {
      const mod = await loaders[`./${wanted}/index.ts`]?.();
      if (mod) {
        m = mod.messages;
        lang = wanted;
      }
    } catch (e) {
      console.warn('No se pudo cargar el idioma', wanted, e);
    }
  }
  locale = localeFor(lang, prefs);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = locale;
    document.title = 'Stoka';
  }
}

/** Cambia el idioma (o vuelve al del teléfono) y recarga. */
export function setLanguage(choice: LangChoice) {
  try {
    if (choice === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    /* sin almacenamiento: queda el del teléfono */
  }
  window.location.reload();
}

/** Para pruebas: fija un idioma ya cargado. */
export function setMessagesForTest(messages: Messages, l: Lang) {
  m = messages;
  lang = l;
  locale = LANGUAGES.find((x) => x.code === l)!.locale;
}

// --- Formatos ---------------------------------------------------------------
export const compareText = (a: string, b: string) => a.localeCompare(b, locale, { sensitivity: 'base' });

export function formatList(items: string[]): string {
  try {
    return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(items);
  } catch {
    return items.join(', ');
  }
}

/** ¿Va en singular? (Intl decide según el idioma: en francés 0 y 1 son singular, en japonés no hay plural.) */
export function isOne(n: number): boolean {
  try {
    return new Intl.PluralRules(locale).select(n) === 'one';
  } catch {
    return n === 1;
  }
}

export function formatDecimal(n: number, maxDigits = 1): string {
  return n.toLocaleString(locale, { maximumFractionDigits: maxDigits });
}

export function formatMoney(n: number): string {
  return n.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }): string {
  return new Date(iso).toLocaleDateString(locale, opts);
}
