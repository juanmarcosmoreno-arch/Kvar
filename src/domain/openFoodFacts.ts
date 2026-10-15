/**
 * Datos de Open Food Facts → propuesta de producto para Stoka.
 * La propuesta siempre la confirma el usuario; acá solo se arma la mejor sugerencia.
 */
import { normalizeAlias } from './aliases';

export interface OffProduct {
  barcode: string;
  name: string;        // nombre propuesto ("Arroz Gallo Oro")
  brand: string | null;
  quantity: string | null;
  imageUrl: string | null;
  tags: string[];      // categories_tags sin prefijo de idioma ("rices")
  generic: string | null; // sustantivo genérico ("Arroz")
}

interface OffResponse {
  status?: number;
  code?: string;
  product?: {
    product_name?: string;
    product_name_es?: string;
    generic_name_es?: string;
    brands?: string;
    categories_tags?: string[];
    quantity?: string;
    image_front_small_url?: string;
    image_front_url?: string;
  };
}

// Etiqueta de OFF (de la más específica a la más general) → nombre genérico en español rioplatense.
const GENERIC: [RegExp, string][] = [
  [/^yerba|mate$/, 'Yerba'],
  [/rices?$|^rice/, 'Arroz'],
  [/pastas?$|spaghetti|noodles|macaroni/, 'Fideos'],
  [/^(whole|semi-skimmed|skimmed|uht-)?milks?$|^milk/, 'Leche'],
  [/yogurts?$|yoghurts?/, 'Yogur'],
  [/cheeses?$/, 'Queso'],
  [/butters?$/, 'Manteca'],
  [/^eggs?$|chicken-eggs/, 'Huevos'],
  [/olive-oils?/, 'Aceite de oliva'],
  [/sunflower-oils?/, 'Aceite de girasol'],
  [/vegetable-oils?$|^oils?$/, 'Aceite'],
  [/^sugars?$|white-sugars?/, 'Azúcar'],
  [/^salts?$|table-salts?/, 'Sal'],
  [/wheat-flours?|^flours?$/, 'Harina'],
  [/coffees?$|instant-coffees?/, 'Café'],
  [/^teas?$|herbal-teas?/, 'Té'],
  [/breads?$/, 'Pan'],
  [/biscuits|cookies|crackers/, 'Galletitas'],
  [/canned-tomatoes|tomato-sauces?|tomato-pulp|passata/, 'Salsa de tomate'],
  [/tuna/, 'Atún'],
  [/lentils?/, 'Lentejas'],
  [/mayonnaises?/, 'Mayonesa'],
  [/ketchups?/, 'Ketchup'],
  [/waters?$|mineral-waters?/, 'Agua'],
  [/sodas?$|colas?$|carbonated-drinks/, 'Refresco'],
  [/juices?$/, 'Jugo'],
  [/beers?$/, 'Cerveza'],
  [/wines?$/, 'Vino'],
  [/dulce-de-leche|milk-jams?/, 'Dulce de leche'],
  [/jams?$/, 'Mermelada'],
  [/chocolates?$/, 'Chocolate'],
  [/cereals?-flakes|breakfast-cereals/, 'Cereales'],
];

/** Etiquetas sin prefijo de idioma, en minúscula. */
export function cleanTags(tags: string[] | undefined): string[] {
  return (tags ?? []).map((t) => t.replace(/^[a-z]{2}:/, '').toLowerCase());
}

export function genericName(tags: string[]): string | null {
  // OFF ordena de lo general a lo específico: se recorre al revés
  for (const tag of [...tags].reverse()) {
    const hit = GENERIC.find(([re]) => re.test(tag));
    if (hit) return hit[1];
  }
  return null;
}

function firstBrand(brands: string | undefined): string | null {
  const b = brands?.split(',')[0]?.trim();
  return b ? b : null;
}

/** "Oro" + Gallo + arroz → "Arroz Gallo Oro"; "Nutella" + Nutella → "Nutella". */
export function proposeName(name: string, brand: string | null, generic: string | null): string {
  const parts: string[] = [];
  const n = normalizeAlias(name);
  if (generic && !n.includes(normalizeAlias(generic))) parts.push(generic);
  if (brand && !n.includes(normalizeAlias(brand))) parts.push(brand);
  parts.push(name);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/** Interpreta la respuesta de la API v2. null si el producto no está en OFF. */
export function parseOffResponse(barcode: string, json: OffResponse): OffProduct | null {
  const p = json.product;
  if (json.status !== 1 || !p) return null;
  const tags = cleanTags(p.categories_tags);
  const generic = genericName(tags);
  const brand = firstBrand(p.brands);
  const raw = (p.product_name_es || p.product_name || '').trim();
  const name = raw ? proposeName(raw, brand, generic) : generic ?? brand ?? '';
  if (!name) return null;
  return {
    barcode,
    name,
    brand,
    quantity: p.quantity?.trim() || null,
    imageUrl: p.image_front_small_url || p.image_front_url || null,
    tags,
    generic,
  };
}

// Etiquetas OFF → palabras que aparecen en los nombres de categoría del hogar (editables).
const CATEGORY_HINTS: [RegExp, RegExp][] = [
  [/fruits|vegetables|fresh-/, /fruta|verdura/],
  [/breads|bakery|viennoiseries/, /panad|panific/],
  [/meats|poultry|sausages|hams|fishes|seafood/, /carne|pescad/],
  [/dairies|milks?$|cheeses|yogurts|butters|eggs|dulce-de-leche/, /lacteo|huevo/],
  [/frozen/, /congel/],
  [/beverages|waters|sodas|juices|beers|wines|coffees|teas|yerba|mate/, /bebida|almacen/],
  [/baby-foods|infant/, /bebe/],
  [/pet-foods|dog|cat-food/, /mascota/],
  [/cleaning|detergents|household/, /limpieza/],
  [/hygiene|cosmetics|shampoos|soaps|toothpastes/, /higiene/],
  [/.*/, /almacen/],
];

/** Elige la categoría del hogar más probable según las etiquetas de OFF. */
export function guessCategory<T extends { id: string; name: string }>(tags: string[], categories: T[]): T | null {
  const norm = categories.map((c) => ({ c, n: normalizeAlias(c.name) }));
  for (const [tagRe, nameRe] of CATEGORY_HINTS) {
    if (!tags.some((t) => tagRe.test(t)) && tagRe.source !== '.*') continue;
    // Yerba y café van a Almacén si no hay una categoría de bebidas que los incluya
    const hit = norm.find(({ n }) => nameRe.test(n));
    if (hit) return hit.c;
  }
  return null;
}

/** Lugar más probable según la categoría elegida. */
export function guessLocation<T extends { id: string; name: string }>(categoryName: string | null, locations: T[]): T | null {
  const c = normalizeAlias(categoryName ?? '');
  const find = (re: RegExp) => locations.find((l) => re.test(normalizeAlias(l.name))) ?? null;
  if (/congel/.test(c)) return find(/freezer|congel/);
  if (/lacteo|huevo|carne|pescad|fruta|verdura/.test(c)) return find(/heladera/);
  if (/limpieza/.test(c)) return find(/limpieza/);
  if (/higiene|bebe/.test(c)) return find(/bano|higiene/);
  return find(/alacena|despensa/);
}

export const OFF_FIELDS =
  'code,product_name,product_name_es,generic_name_es,brands,categories_tags,quantity,image_front_small_url,image_front_url';

// Palabra del nombre del producto → palabras de la categoría del hogar (para tickets, sin datos de OFF).
const NAME_HINTS: [RegExp, RegExp][] = [
  [/\b(leche|yogur|queso|manteca|huevos?|crema|dulce de leche|requeson)\b/, /lacteo|huevo/],
  [/\b(pollo|carne|milanesas?|hamburguesas?|chorizos?|pescado|merluza|carniceria)\b/, /carne|pescad/],
  [/\b(pan|masa|tapas?|bizcochos?|pascualina)\b/, /panad|panific/],
  [/\b(tomates?|cebollas?|papas?|manzanas?|bananas?|lechuga|zanahorias?|limon(es)?|naranjas?)\b/, /fruta|verdura/],
  [/\b(limpiador|detergente|lavandina|esponja|abrillantador|lustramuebles|cif|poett|jabon en polvo|suavizante|desengrasante)\b/, /limpieza/],
  [/\b(vino|cerveza|agua|refresco|jugo|soda|coca)\b/, /bebida/],
  [/\b(champu|shampoo|desodorante|papel higienico|pasta dental|jabon|acondicionador|algodon|toallitas)\b/, /higiene/],
  [/\b(panales|mamadera)\b/, /bebe/],
  [/\b(perro|gato|mascota)\b/, /mascota/],
  [/\b(congelad[oa]s?|helado)\b/, /congel/],
  [/\b(fideos|arroz|harina|azucar|yerba|sal|aceite|lentejas|garbanzos|galletitas|cafe|cocoa|pulpa|ketchup|mayonesa|aceitunas|almidon|levadura|pasas|nueces|pure|vinagre|aderezo|atun|arvejas|polenta|te)\b/, /almacen/],
];

/** Categoría del hogar más probable por el nombre del producto (null si no hay pista). */
export function guessCategoryFromName<T extends { id: string; name: string }>(productName: string, categories: T[]): T | null {
  const words = normalizeAlias(productName).split(' ').filter((w) => w.length > 1 && !NOISE.has(w));
  const norm = categories.map((c) => ({ c, n: normalizeAlias(c.name) }));
  // Primero las dos primeras palabras (dicen qué es: «galletitas … con leche» son galletitas), después todo
  for (const text of [words.slice(0, 2).join(' '), words.join(' ')]) {
    for (const [nameRe, catRe] of NAME_HINTS) {
      if (!nameRe.test(text)) continue;
      const hit = norm.find((x) => catRe.test(x.n));
      if (hit) return hit.c;
    }
  }
  return null;
}

/** Marcas propias y prefijos de ticket que van antes del producto */
const NOISE = new Set(['cefa', 'prodal', 'of', 'e']);
