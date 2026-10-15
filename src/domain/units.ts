/**
 * Catálogo de unidades para productos con conteo.
 * Se guarda en products.unit el plural («latas»); para mostrar se usa singular o plural según la cantidad.
 * El hogar puede usar unidades propias («pañales»): quedan disponibles para los demás productos.
 */
import { normalizeAlias } from './aliases';

export interface Unit {
  singular: string;
  plural: string;
}

export const UNIT_CATALOG: Unit[] = [
  { singular: 'unidad', plural: 'unidades' },
  { singular: 'paquete', plural: 'paquetes' },
  { singular: 'lata', plural: 'latas' },
  { singular: 'botella', plural: 'botellas' },
  { singular: 'caja', plural: 'cajas' },
  { singular: 'frasco', plural: 'frascos' },
  { singular: 'sachet', plural: 'sachets' },
  { singular: 'bolsa', plural: 'bolsas' },
  { singular: 'sobre', plural: 'sobres' },
  { singular: 'rollo', plural: 'rollos' },
  { singular: 'pack', plural: 'packs' },
  { singular: 'docena', plural: 'docenas' },
  { singular: 'tableta', plural: 'tabletas' },
  { singular: 'cápsula', plural: 'cápsulas' },
  { singular: 'pote', plural: 'potes' },
  { singular: 'bandeja', plural: 'bandejas' },
];

export const DEFAULT_UNIT = UNIT_CATALOG[0];

/** «pañales» → «pañal», «velas» → «vela» (para unidades que no están en el catálogo). */
export function singularize(word: string): string {
  const w = word.trim();
  if (/[^aeiou]es$/i.test(w) && w.length > 4) return w.slice(0, -2);
  if (/s$/i.test(w) && w.length > 3) return w.slice(0, -1);
  return w;
}

/** Busca la unidad (por singular o plural, sin importar tildes ni mayúsculas). */
export function findUnit(text: string | null | undefined): Unit {
  if (!text?.trim()) return DEFAULT_UNIT;
  const n = normalizeAlias(text);
  const hit = UNIT_CATALOG.find((u) => normalizeAlias(u.plural) === n || normalizeAlias(u.singular) === n);
  if (hit) return hit;
  const plural = text.trim().toLowerCase();
  return { singular: singularize(plural), plural };
}

/** «1 lata», «3 latas», «0 latas». */
export function formatQuantity(n: number | null | undefined, unit: string | null | undefined): string {
  const qty = n ?? 0;
  const u = findUnit(unit);
  return `${qty} ${qty === 1 ? u.singular : u.plural}`;
}

/** Solo la palabra, concordando con la cantidad. */
export function unitLabel(n: number | null | undefined, unit: string | null | undefined): string {
  const u = findUnit(unit);
  return (n ?? 0) === 1 ? u.singular : u.plural;
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
  return BY_CATEGORY.find(([re]) => re.test(c))?.[1] ?? DEFAULT_UNIT.plural;
}

/** Catálogo + unidades propias que ya usa el hogar (sin repetir). */
export function householdUnits(usedUnits: (string | null | undefined)[]): Unit[] {
  const known = new Set(UNIT_CATALOG.map((u) => normalizeAlias(u.plural)));
  const own: Unit[] = [];
  for (const raw of usedUnits) {
    if (!raw?.trim()) continue;
    const n = normalizeAlias(raw);
    if (known.has(n) || UNIT_CATALOG.some((u) => normalizeAlias(u.singular) === n)) continue;
    known.add(n);
    own.push(findUnit(raw));
  }
  return [...UNIT_CATALOG, ...own.sort((a, b) => a.plural.localeCompare(b.plural, 'es'))];
}
