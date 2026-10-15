/**
 * Catálogo de unidades para productos con conteo.
 * En la base se guarda siempre la clave en español y en plural («latas»), así el hogar se entiende aunque cada
 * miembro use otro idioma; para mostrar se usa el idioma de la app, en singular o plural según la cantidad.
 * El hogar puede usar unidades propias («pañales»): quedan disponibles para los demás productos.
 */
import { compareText, isOne, m } from '../i18n';
import { normalizeAlias } from './aliases';

export interface Unit {
  /** Lo que se guarda en products.unit */
  key: string;
  /** Para mostrar, en el idioma de la app */
  singular: string;
  plural: string;
}

const CATALOG_KEYS = [
  'unidades', 'paquetes', 'latas', 'botellas', 'cajas', 'frascos', 'sachets', 'bolsas', 'sobres', 'rollos', 'packs',
  'docenas', 'tabletas', 'cápsulas', 'potes', 'bandejas',
] as const;

/** Singular en español de cada clave (para reconocer «lata» o «Lata» escrito a mano) */
const ES_SINGULAR: Record<string, string> = {
  unidades: 'unidad', paquetes: 'paquete', latas: 'lata', botellas: 'botella', cajas: 'caja', frascos: 'frasco',
  sachets: 'sachet', bolsas: 'bolsa', sobres: 'sobre', rollos: 'rollo', packs: 'pack', docenas: 'docena',
  tabletas: 'tableta', 'cápsulas': 'cápsula', potes: 'pote', bandejas: 'bandeja',
};

function catalogUnit(key: string): Unit {
  const [singular, plural] = m.common.units[key] ?? [ES_SINGULAR[key] ?? key, key];
  return { key, singular, plural };
}

/** Se arma al usarlo (el idioma se elige al arrancar) */
export const UNIT_CATALOG: readonly Unit[] = new Proxy([] as Unit[], {
  get(_t, prop) {
    const list = CATALOG_KEYS.map(catalogUnit);
    const v = Reflect.get(list, prop);
    return typeof v === 'function' ? v.bind(list) : v;
  },
});

export const defaultUnit = (): Unit => catalogUnit('unidades');

/** «pañales» → «pañal», «velas» → «vela» (para unidades que no están en el catálogo). */
export function singularize(word: string): string {
  const w = word.trim();
  if (/[^aeiou]es$/i.test(w) && w.length > 4) return w.slice(0, -2);
  if (/s$/i.test(w) && w.length > 3) return w.slice(0, -1);
  return w;
}

/** Busca la unidad (clave, singular o plural, en español o en el idioma de la app; sin tildes ni mayúsculas). */
export function findUnit(text: string | null | undefined): Unit {
  if (!text?.trim()) return defaultUnit();
  const n = normalizeAlias(text);
  for (const key of CATALOG_KEYS) {
    const u = catalogUnit(key);
    if ([key, ES_SINGULAR[key], u.singular, u.plural].some((x) => x && normalizeAlias(x) === n)) return u;
  }
  const plural = text.trim().toLowerCase();
  return { key: plural, singular: singularize(plural), plural };
}

/** «1 lata», «3 latas», «0 latas». */
export function formatQuantity(n: number | null | undefined, unit: string | null | undefined): string {
  const qty = n ?? 0;
  const u = findUnit(unit);
  return `${qty} ${isOne(qty) ? u.singular : u.plural}`;
}

/** Solo la palabra, concordando con la cantidad. */
export function unitLabel(n: number | null | undefined, unit: string | null | undefined): string {
  const u = findUnit(unit);
  return isOne(n ?? 0) ? u.singular : u.plural;
}

const SUGGESTIONS: [RegExp, string][] = [
  [/panal/, 'unidades'],
  [/papel|servilleta|rollo/, 'rollos'],
  [/huevo/, 'unidades'],
  [/atun|arveja|choclo|lata|conserva|tomate perita/, 'latas'],
  [/vino|cerveza|agua|refresco|aceite|botella/, 'botellas'],
  [/yogur|dulce de leche|crema/, 'potes'],
  [/cafe en capsula|capsula/, 'cápsulas'],
  [/te |^te$|edulcorante|sobre/, 'sobres'],
  [/leche/, 'sachets'],
];

const BY_CATEGORY: [RegExp, string][] = [
  [/bebida/, 'botellas'],
  [/higiene/, 'unidades'],
  [/limpieza/, 'unidades'],
  [/congel/, 'paquetes'],
  [/almacen/, 'paquetes'],
  [/conserva/, 'latas'],
];

/** Unidad sugerida al activar el conteo: por el nombre del producto y, si no, por su categoría. */
export function suggestUnit(productName: string, categoryName?: string | null): string {
  const p = normalizeAlias(productName);
  const byName = SUGGESTIONS.find(([re]) => re.test(p));
  if (byName) return byName[1];
  const c = normalizeAlias(categoryName ?? '');
  return BY_CATEGORY.find(([re]) => re.test(c))?.[1] ?? 'unidades';
}

/** Catálogo + unidades propias que ya usa el hogar (sin repetir). */
export function householdUnits(usedUnits: (string | null | undefined)[]): Unit[] {
  const catalog = CATALOG_KEYS.map(catalogUnit);
  const known = new Set(catalog.map((u) => normalizeAlias(u.key)));
  const own: Unit[] = [];
  for (const raw of usedUnits) {
    if (!raw?.trim()) continue;
    const u = findUnit(raw);
    const n = normalizeAlias(u.key);
    if (known.has(n)) continue;
    known.add(n);
    own.push(u);
  }
  return [...catalog, ...own.sort((a, b) => compareText(a.plural, b.plural))];
}
