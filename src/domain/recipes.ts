/**
 * Recetas: interpretar ingredientes («400 g de fideos»), escalarlos según las personas con
 * redondeos de cocina, cruzarlos con el stock y armar las sugerencias de «¿Qué cocino?».
 * Todo es local y sin IA: funciona sin conexión.
 */
import { compareText, formatDecimal, isOne, lang, locale, m } from '../i18n';
import { normalizeAlias } from './aliases';
import type {
  MealType, Product, Recipe, RecipeConstraint, RecipeFeedback, RecipeIngredient,
} from './types';

// -----------------------------------------------------------------------------
// Unidades de cocina
// -----------------------------------------------------------------------------
type UnitKind = 'mass' | 'volume' | 'spoon' | 'count' | 'piece' | 'container' | 'pack';

interface KitchenUnit {
  key: string;
  kind: UnitKind;
  /** Cómo se escribe en cada idioma (para interpretar lo que escribe el usuario) */
  words: string[];
}

/** «u» es «unidad» y no se muestra («2 huevos», «½ cebolla»). Los nombres para mostrar están en m.common.kitchenUnits. */
export const KITCHEN_UNITS: KitchenUnit[] = [
  { key: 'g', kind: 'mass', words: ['g', 'gr', 'grs', 'gramo', 'gramos', 'gram', 'grams', 'gramme', 'grammes', 'grammi', 'grama', 'gramas', '克', 'グラム'] },
  { key: 'kg', kind: 'mass', words: ['kg', 'kgs', 'kilo', 'kilos', 'kilogram', 'kilograms', 'kilogramme', 'chilo', 'chili', 'quilo', 'quilos', '公斤', '千克', 'キロ'] },
  { key: 'ml', kind: 'volume', words: ['ml', 'cc', 'mililitro', 'mililitros', 'milliliter', 'milliliters', 'millilitre', 'millilitres', 'millilitro', 'millilitri', '毫升'] },
  { key: 'l', kind: 'volume', words: ['l', 'lt', 'lts', 'litro', 'litros', 'liter', 'liters', 'litre', 'litres', 'litri', '升', 'リットル'] },
  { key: 'taza', kind: 'spoon', words: ['taza', 'tazas', 'cup', 'cups', 'tasse', 'tasses', 'tazza', 'tazze', 'xícara', 'xícaras', 'xicara', 'xicaras', 'kopp', 'koppar', 'kop', 'kopper', '杯', 'カップ'] },
  { key: 'dl', kind: 'volume', words: ['dl', 'decilitro', 'decilitros', 'deciliter', 'decilitre'] },
  { key: 'cda', kind: 'spoon', words: ['cda', 'cdas', 'cucharada', 'cucharadas', 'tbsp', 'tablespoon', 'tablespoons', 'cs', 'càs', 'cuillère', 'cuillères', 'cucchiaio', 'cucchiai', 'colher', 'colheres', 'msk', 'spsk', '汤匙', '大さじ'] },
  { key: 'cdita', kind: 'spoon', words: ['cdita', 'cditas', 'cucharadita', 'cucharaditas', 'tsp', 'teaspoon', 'teaspoons', 'càc', 'cucchiaino', 'cucchiaini', 'colherzinha', 'tsk', '茶匙', '小さじ'] },
  { key: 'diente', kind: 'piece', words: ['diente', 'dientes', 'clove', 'cloves', 'gousse', 'gousses', 'spicchio', 'spicchi', 'dente', 'dentes', 'klyfta', 'klyftor', 'fed', 'fed.', '瓣', '片'] },
  { key: 'feta', kind: 'piece', words: ['feta', 'fetas', 'slice', 'slices', 'tranche', 'tranches', 'fetta', 'fette', 'fatia', 'fatias', 'skiva', 'skivor', 'skive', 'skiver', '枚'] },
  { key: 'rebanada', kind: 'piece', words: ['rebanada', 'rebanadas'] },
  { key: 'lata', kind: 'container', words: ['lata', 'latas', 'can', 'cans', 'tin', 'tins', 'boîte', 'boîtes', 'boite', 'boites', 'scatola', 'scatole', 'barattolo', 'burk', 'burkar', 'dåse', 'dåser', '罐', '缶'] },
  { key: 'sobre', kind: 'container', words: ['sobre', 'sobres', 'sachet', 'sachets', 'packet', 'packets', 'bustina', 'bustine', 'envelope', 'envelopes', 'påse', 'påsar', 'pose', 'poser', '包', '袋'] },
  { key: 'cubo', kind: 'container', words: ['cubo', 'cubos', 'cubito', 'cubitos', 'cube', 'cubes', 'dado', 'dadi', 'tablete', 'tabletes', 'tärning', 'tärningar', 'terning', 'terninger', '块'] },
  { key: 'frasco', kind: 'container', words: ['frasco', 'frascos', 'jar', 'jars', 'bocal', 'bocaux', 'vasetto', 'glas', '瓶', '瓶詰め'] },
  { key: 'pote', kind: 'container', words: ['pote', 'potes', 'pot', 'pots', 'tub', 'tubs'] },
  { key: 'paquete', kind: 'pack', words: ['paquete', 'paquetes', 'package', 'packages', 'pack', 'packs', 'paquet', 'paquets', 'pacco', 'pacchi', 'confezione', 'pacote', 'pacotes', 'paket', 'pakke', 'pakker'] },
  { key: 'atado', kind: 'pack', words: ['atado', 'atados', 'bunch', 'bunches', 'botte', 'bottes', 'mazzo', 'mazzi', 'maço', 'maços', 'knippe', 'knipper', 'bundt', 'bundter', '把'] },
  { key: 'u', kind: 'count', words: ['u', 'unidad', 'unidades', 'unit', 'units', 'pc', 'pcs', 'piece', 'pieces', 'pièce', 'pièces', 'pezzo', 'pezzi', 'unidade', 'st', 'stk', 'stycken', 'stykker', '个', '個', 'つ'] },
];

const UNIT_BY_KEY = new Map(KITCHEN_UNITS.map((u) => [u.key, u]));
const UNIT_BY_WORD = new Map(KITCHEN_UNITS.flatMap((u) => u.words.map((w) => [w.toLowerCase(), u] as const)));
const CJK_CHAR = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

let phrases: { lang: string; list: [string, string][] } | null = null;
/** Todas las formas de escribir cada unidad (las fijas + las del idioma de la app), la más larga primero */
function unitPhrases(): [string, string][] {
  if (phrases?.lang === lang) return phrases.list;
  const list: [string, string][] = [...UNIT_BY_WORD].map(([w, u]) => [w, u.key]);
  for (const [key, forms] of Object.entries(m.common.kitchenUnits)) {
    for (const f of forms) if (f) list.push([f.toLowerCase(), key]);
  }
  list.sort((a, b) => b[0].length - a[0].length);
  phrases = { lang, list };
  return list;
}

function matchUnit(s: string): { key: string; rest: string } | null {
  const lower = s.toLowerCase();
  for (const [phrase, key] of unitPhrases()) {
    if (!lower.startsWith(phrase)) continue;
    const after = s.slice(phrase.length);
    // Después de la unidad: espacio, punto o fin; en chino/japonés puede venir el nombre pegado
    if (!after || /^[\s.]/.test(after) || CJK_CHAR.test(phrase.slice(-1))) {
      return { key, rest: after.replace(/^\.?\s*/, '') };
    }
  }
  return null;
}

export function kitchenUnit(key: string | null | undefined): KitchenUnit | undefined {
  return key ? UNIT_BY_KEY.get(key) : undefined;
}

// -----------------------------------------------------------------------------
// Interpretar una línea de ingrediente
// -----------------------------------------------------------------------------
export interface ParsedIngredient {
  name: string;
  quantity: number | null;
  unit: string | null;
  amount: string | null;
  optional: boolean;
}

const NUMBER_WORDS: Record<string, number> = {
  // es
  un: 1, una: 1, uno: 1, medio: 0.5, media: 0.5, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
  siete: 7, ocho: 8, nueve: 9, diez: 10, doce: 12,
  // en, fr, it, pt, sv, da
  one: 1, two: 2, three: 3, four: 4, half: 0.5,
  une: 1, deux: 2, trois: 3, quatre: 4, demi: 0.5, 'demi-': 0.5,
  due: 2, tre: 3, quattro: 4, mezzo: 0.5, mezza: 0.5,
  um: 1, uma: 1, dois: 2, duas: 2, 'três': 3, meio: 0.5, meia: 0.5,
  ett: 1, 'två': 2, fyra: 4, halv: 0.5,
  et: 1, to: 2, fire: 4,
};
const VULGAR: Record<string, string> = { '½': ' 1/2', '¼': ' 1/4', '¾': ' 3/4', '⅓': ' 1/3', '⅔': ' 2/3' };

function parseNumber(token: string): number | null {
  const t = token.trim().toLowerCase();
  if (t in NUMBER_WORDS) return NUMBER_WORDS[t];
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[2]) ? Number(frac[1]) / Number(frac[2]) : null;
  const n = Number(t.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Números («300g» pegado vale) o palabras («una cebolla»; «dosis» no es «dos»)
const QTY_RE = new RegExp(
  `^(?:(\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:[.,]\\d+)?)(?=[\\s\\p{L}]|$)|(${Object.keys(NUMBER_WORDS).join('|')})(?=\\s|$))\\s*`,
  'iu',
);
/** Cantidades sueltas al principio («una pizca de sal», «a pinch of salt»): se guardan con la clave en español */
const LOOSE: [RegExp, string][] = [
  [/^(?:una pizca|a pinch|une pincée|un pizzico|uma pitada|en nypa|en knivspids)\s+(?:de\s+|of\s+|d'|di\s+)?/i, 'una pizca'],
  [/^(?:un chorrito|a splash|a dash|un filet|un filo|um fio)\s+(?:de\s+|of\s+|d'|di\s+)?/i, 'un chorrito'],
  [/^(?:un poco|a little|un peu|un po'|um pouco)\s+(?:de\s+|of\s+|d'|di\s+)?/i, 'un poco'],
  [/^(?:unas gotas|a few drops|quelques gouttes|qualche goccia|algumas gotas)\s+(?:de\s+|of\s+|d'|di\s+)?/i, 'unas gotas'],
  [/^(?:un pu[ñn]ado|a handful|une poignée|una manciata|um punhado)\s+(?:de\s+|of\s+|d'|di\s+)?/i, 'un puñado'],
];
/** Uso al final («aceite para freír», «oil for frying») */
const FOR_USE: [RegExp, string][] = [
  [/[\s,]+(?:para fre[íi]r|for frying|pour la friture|pour frire|per friggere|para fritar|till fritering|til fritering)\.?$/i, 'para freír'],
  [/[\s,]+(?:para servir|to serve|for serving|pour servir|per servire|till servering|til servering)\.?$/i, 'para servir'],
  [/[\s,]+(?:para decorar|to garnish|for garnish|pour décorer|per decorare|till garnering|til pynt)\.?$/i, 'para decorar'],
  [/[\s,]+(?:para untar|to spread|for spreading|à tartiner|da spalmare)\.?$/i, 'para untar'],
  [/[\s,]+(?:para espolvorear|to sprinkle|for sprinkling|à saupoudrer|da spolverare)\.?$/i, 'para espolvorear'],
];
const TO_TASTE = /[\s,]*(?:\b(?:a gusto|c\/n|cantidad necesaria|to taste|as needed|au goût|à volonté|selon le goût|q\.?b\.?|quanto basta|a gosto|efter smak|efter smag)\b|适量|少许|少々|適量|適宜)\.?/iu;
const OPTIONAL = /[\s,(（]*(?:\b(?:opcional|optional|facultatif|facultative|facoltativo|valfritt|valgfrit|valgfri)\b|可选|お好みで|好みで)[)）]?/iu;
/** Lo que une la cantidad con el nombre («400 g de fideos», «2 cups of milk», «200 g di farina») */
const CONNECTOR = /^(?:de|del|of|d'|de la|des|du|di|della|dello|do|da|dos|das|av|af)\s*/i;

/** «400 g de fideos», «1 ½ taza de leche», «sal a gusto», «2 huevos», «queso rallado (opcional)». */
export function parseIngredientLine(line: string): ParsedIngredient | null {
  let s = line.replace(/[½¼¾⅓⅔]/g, (c) => VULGAR[c]).replace(/^[\s\-•*·–]+/, '').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  let optional = false;
  if (OPTIONAL.test(s)) {
    optional = true;
    s = s.replace(OPTIONAL, '').trim();
  }
  let amount: string | null = null;
  const loose = LOOSE.find(([re]) => re.test(s));
  const forUse = FOR_USE.find(([re]) => re.test(s));
  if (loose) {
    amount = loose[1];
    s = s.replace(loose[0], '');
  } else if (TO_TASTE.test(s)) {
    amount = 'a gusto';
    s = s.replace(TO_TASTE, '').trim();
  } else if (forUse) {
    amount = forUse[1];
    s = s.replace(forUse[0], '').trim();
  }
  let quantity: number | null = null;
  let unit: string | null = null;
  // «大さじ2 醤油», «小さじ1 塩»: unidad antes del número
  const jp = !amount && s.match(/^(大さじ|小さじ|カップ)\s*(\d+(?:[.,]\d+)?|\d+\/\d+)\s*/u);
  if (jp) {
    const name = s.slice(jp[0].length).trim();
    if (name) return { name, quantity: parseNumber(jp[2]), unit: UNIT_BY_WORD.get(jp[1])!.key, amount: null, optional };
  }
  if (!amount) {
    const q = s.match(QTY_RE);
    if (q) {
      quantity = parseNumber(q[1] ?? q[2]);
      s = s.slice(q[0].length);
      // La unidad: «taza», «cups», «c. à soupe», o en chino/japonés pegada al nombre («2杯牛奶»)
      const u = matchUnit(s);
      if (u) {
        unit = u.key;
        s = u.rest;
      } else if (quantity !== null) {
        unit = 'u';
      }
      s = s.replace(CONNECTOR, '');
    }
  }
  const name = s.replace(/[\s,.;:]+$/, '').trim();
  if (!name) return null;
  if (quantity === null) unit = null;
  return { name, quantity, unit, amount, optional };
}

// -----------------------------------------------------------------------------
// Escalar y mostrar cantidades
// -----------------------------------------------------------------------------
const roundTo = (q: number, step: number) => Math.round(q / step) * step;

/** «nunca 0,37 latas»: redondeos que tienen sentido en la cocina. Gramos y ml quedan en g/ml. */
export function kitchenRound(quantity: number, unit: string, name = ''): { quantity: number; unit: string } {
  const u = kitchenUnit(unit);
  if (!u) return { quantity: roundTo(quantity, 0.5) || 0.5, unit };
  let q = quantity;
  let key = u.key;
  if (key === 'kg') { q *= 1000; key = 'g'; }
  if (key === 'l') { q *= 1000; key = 'ml'; }
  if (key === 'dl') { q *= 100; key = 'ml'; }
  switch (u.kind) {
    case 'mass':
    case 'volume': {
      const step = q <= 10 ? 1 : q <= 50 ? 5 : q <= 250 ? 10 : q <= 1000 ? 25 : 50;
      return { quantity: Math.max(1, roundTo(q, step)), unit: key };
    }
    case 'spoon': {
      const step = key === 'taza' && q < 1 ? 0.25 : 0.5;
      return { quantity: Math.max(step, roundTo(q, step)), unit: key };
    }
    case 'count':
      // «½ cebolla» sí; «½ huevo» no
      if (q < 3 && !/huevo/i.test(name)) return { quantity: Math.max(0.5, roundTo(q, 0.5)), unit: key };
      return { quantity: Math.max(1, Math.round(q)), unit: key };
    case 'pack':
      return { quantity: Math.max(0.5, roundTo(q, 0.5)), unit: key };
    case 'piece':
    case 'container':
      return { quantity: Math.max(1, Math.round(q)), unit: key };
  }
}

const FRACTIONS: [number, string][] = [[0.25, '¼'], [0.5, '½'], [0.75, '¾']];

/** 1.5 → «1 ½», 0.25 → «¼», 2.4 → «2,4». */
export function formatNumber(n: number): string {
  const whole = Math.floor(n + 1e-9);
  const rest = n - whole;
  if (rest < 1e-6) return String(whole);
  const frac = FRACTIONS.find(([v]) => Math.abs(v - rest) < 1e-6);
  if (frac) return whole ? `${whole} ${frac[1]}` : frac[1];
  return formatDecimal(n, 1);
}

export function formatAmount(quantity: number, unit: string): string {
  // Kilos y litros con decimales («1,5 kg»), como en el súper
  const decimal = (n: number) => formatDecimal(Math.round(n / 100) / 10, 1);
  if (unit === 'g' && quantity >= 1000) return `${decimal(quantity)} kg`;
  if (unit === 'ml' && quantity >= 1000) return `${decimal(quantity)} l`;
  const u = kitchenUnit(unit);
  if (!u || u.key === 'u') return formatNumber(quantity);
  const [singular, plural] = m.common.kitchenUnits[u.key] ?? [u.key, u.key];
  // «½ taza», «1 taza», «1 ½ tazas»; en japonés y chino no hay plural
  return `${formatNumber(quantity)} ${quantity <= 1 || isOne(quantity) ? singular : plural}`;
}

/** Cantidad para mostrar, ya escalada: «200 g», «½», «2 latas», «a gusto». */
export function amountLabel(ing: Pick<RecipeIngredient, 'quantity' | 'unit' | 'amount' | 'name'>, factor = 1): string {
  if (ing.quantity != null && ing.unit) {
    const r = kitchenRound(ing.quantity * factor, ing.unit, ing.name);
    return formatAmount(r.quantity, r.unit);
  }
  return ing.amount ? m.common.amounts[ing.amount] ?? ing.amount : '';
}

export function scaleFactor(recipe: Pick<Recipe, 'servings'>, servings: number): number {
  return recipe.servings ? servings / recipe.servings : 1;
}

// -----------------------------------------------------------------------------
// Cruce con el stock
// -----------------------------------------------------------------------------
const STOP = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'con', 'en', 'y', 'para', 'a', 'al', // es
  'of', 'the', 'and', 'with', 'for', // en
  'le', 'les', 'des', 'du', 'et', 'avec', 'pour', 'au', 'aux', // fr
  'di', 'della', 'dello', 'e', 'per', 'il', 'lo', // it
  'do', 'da', 'dos', 'das', 'com', 'o', 'os', // pt
  'och', 'med', 'till', 'av', 'og', 'til', 'af', // sv, da
]);
/** Lo que se da por hecho que hay en cualquier cocina (si no está cargado como producto). */
const BASIC_WORDS = [
  'sal', 'pimienta', 'agua', 'orégano', 'pimentón', 'comino', 'nuez moscada', 'condimentos', 'perejil seco',
  'salt', 'pepper', 'water', 'sel', 'poivre', 'eau', 'sale', 'pepe', 'acqua', 'pimenta', 'água',
  'peppar', 'vatten', 'peber', 'vand', '盐', '胡椒', '胡椒粉', '水', '塩', 'こしょう', '胡椒', '水',
];
let basics: Set<string> | null = null;

/** «tomates» y «tomate» → «tomat»; «papas» → «pap». Suficiente para comparar nombres de comida. */
export function stem(word: string): string {
  if (word.length <= 3) return word;
  let x = word.endsWith('es') && word.length > 4 && !/[aeiou]es$/.test(word) ? word.slice(0, -2) : word.replace(/s$/, '');
  // sueco y danés: «tomater» → «tomat», «gurkor» → «gurk»
  if ((lang === 'sv' || lang === 'da') && x.length > 5) x = x.replace(/(?:er|ar|or|ne)$/, '');
  // «tomato»/«tomatoe(s)», «pomodoro»/«pomodori», «huevo»/«huevos» → misma raíz
  const y = x.replace(/[aeiou]+$/, '');
  return y.length >= 3 ? y : x;
}

export function nameWords(text: string): string[] {
  return normalizeAlias(text)
    .replace(/\b\d+(\.\d+)?[a-z]*\b/g, ' ')
    .split(' ')
    .filter((w) => w && !STOP.has(w))
    .map(stem);
}

const startsWith = (a: string[], b: string[]) => b.length > 0 && b.every((w, i) => a[i] === w);

const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

/** 3 = mismo nombre, 2 = el producto es una variedad («Aceite de girasol» para «aceite»), 1 = al revés. */
export function nameScore(ingredient: string, product: string): number {
  if (CJK.test(ingredient) || CJK.test(product)) {
    // Chino y japonés no separan palabras: se compara el texto («牛奶» ↔ «全脂牛奶»)
    const i = normalizeAlias(ingredient).replace(/\s+/g, '');
    const p = normalizeAlias(product).replace(/\s+/g, '');
    if (!i || !p) return 0;
    if (i === p) return 3;
    if (p.includes(i)) return 2;
    if (i.includes(p) && p.length >= 2) return 1;
    return 0;
  }
  const iw = nameWords(ingredient);
  const pw = nameWords(product);
  if (!iw.length || !pw.length) return 0;
  if (iw.length === pw.length && startsWith(iw, pw)) return 3;
  if (startsWith(pw, iw)) return 2;
  if (startsWith(iw, pw)) return 1;
  return 0;
}

const STATUS_RANK = { ok: 0, low: 1, out: 2 } as const;

export function findProduct(ing: Pick<RecipeIngredient, 'name' | 'product_id'>, products: Product[]): Product | null {
  if (ing.product_id) {
    const p = products.find((x) => x.id === ing.product_id);
    if (p) return p;
  }
  let best: Product | null = null;
  let bestScore = 0;
  for (const p of products) {
    const score = nameScore(ing.name, p.name);
    if (!score) continue;
    if (score > bestScore || (score === bestScore && best && STATUS_RANK[p.status] < STATUS_RANK[best.status])) {
      best = p;
      bestScore = score;
    }
  }
  return best;
}

export function isBasic(name: string): boolean {
  basics ??= new Set(BASIC_WORDS.map((b) => nameWords(b).join(' ')));
  const w = nameWords(name).join(' ');
  return basics.has(w) || [...basics].some((b) => w.startsWith(`${b} `));
}

export type Availability = 'have' | 'low' | 'missing' | 'basic';

export interface IngredientLine {
  ingredient: RecipeIngredient;
  product: Product | null;
  availability: Availability;
  /** Cantidad escalada para mostrar */
  label: string;
  /** Unidades que usa la receta, si se pueden comparar con el conteo del producto */
  uses: number | null;
  /** Cuántas comprar (si se sabe) */
  buy: number | null;
}

const CONTAINER_PRODUCT_UNITS = /^(lata|paquete|botella|caja|frasco|sachet|bolsa|sobre|pote|bandeja|rollo|pack|docena|tableta|capsula)s?$/;

/** Unidades de la receta comparables con el conteo del producto (2 huevos ↔ 3 unidades; 1 lata ↔ 2 latas). */
function comparableUses(ing: RecipeIngredient, factor: number, product: Product): number | null {
  if (!product.track_quantity || ing.quantity == null || !ing.unit) return null;
  const u = kitchenUnit(ing.unit);
  if (!u) return null;
  const pu = normalizeAlias(product.unit ?? '');
  const ok =
    u.kind === 'count' ? !CONTAINER_PRODUCT_UNITS.test(pu)
      : u.kind === 'container' || u.kind === 'pack' ? pu.replace(/s$/, '') === u.key
        : false;
  if (!ok) return null;
  return Math.max(1, Math.ceil(kitchenRound(ing.quantity * factor, ing.unit, ing.name).quantity - 1e-9));
}

export function assessIngredient(ing: RecipeIngredient, products: Product[], factor: number): IngredientLine {
  const product = findProduct(ing, products);
  const label = amountLabel(ing, factor);
  if (!product) {
    const basic = isBasic(ing.name) || (ing.quantity == null && ing.amount === 'a gusto');
    return { ingredient: ing, product: null, availability: basic ? 'basic' : 'missing', label, uses: null, buy: null };
  }
  const uses = comparableUses(ing, factor, product);
  if (uses !== null) {
    const have = Math.max(0, product.quantity ?? 0);
    if (have < uses) return { ingredient: ing, product, availability: 'missing', label, uses, buy: uses - have };
    return { ingredient: ing, product, availability: product.status === 'low' ? 'low' : 'have', label, uses, buy: null };
  }
  const availability: Availability = product.status === 'out' ? 'missing' : product.status === 'low' ? 'low' : 'have';
  return { ingredient: ing, product, availability, label, uses: null, buy: null };
}

// -----------------------------------------------------------------------------
// Sugerencias
// -----------------------------------------------------------------------------
export interface Suggestion {
  recipe: Recipe;
  factor: number;
  lines: IngredientLine[];
  /** Lo que falta y no es opcional */
  missing: IngredientLine[];
  /** Productos que usa y vencen pronto */
  expiring: Product[];
  score: number;
}

export interface SuggestionGroups {
  expiring: Suggestion[];
  ready: Suggestion[];
  oneMissing: Suggestion[];
  more: Suggestion[];
}

export interface CookFilters {
  quick?: boolean;
  /** Solo las más elaboradas (etiqueta «gourmet») */
  gourmet?: boolean;
  meal?: MealType | null;
  constraints?: RecipeConstraint[];
}

export const QUICK_MINUTES = 30;
const MAX_EXPIRING = 4;
const DAY = 86_400_000;

export function assessRecipe(recipe: Recipe, products: Product[], servings: number, now = Date.now()): Suggestion {
  const factor = scaleFactor(recipe, servings);
  const lines = [...recipe.ingredients]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((ing) => assessIngredient(ing, products, factor));
  const missing = lines.filter((l) => l.availability === 'missing' && !l.ingredient.optional);
  const expiring: Product[] = [];
  for (const l of lines) {
    const p = l.product;
    if (!p || p.status === 'out' || !p.expires_on || expiring.includes(p)) continue;
    const days = (Date.parse(p.expires_on) - now) / DAY;
    if (days <= 4 && days >= -1) expiring.push(p);
  }
  return { recipe, factor, lines, missing, expiring, score: 0 };
}

export const recipeKey = (r: Pick<Recipe, 'id'>) => r.id;
/** Receta guardada del hogar (no las del recetario ni las ideas sin guardar de Apple Intelligence, «ai:…») */
export const isHouseRecipe = (r: Pick<Recipe, 'id' | 'source'>) => r.source !== 'catalog' && !r.id.startsWith('ai:');
const feedbackKey = (f: RecipeFeedback) => f.recipe_id ?? f.catalog_key;

export interface Preferences {
  /** «No me tienta» hace poco: no se propone por un tiempo */
  hidden: Set<string>;
  /** Tipos de plato que se descartan siempre (y nunca se cocinan) */
  blockedTags: Set<string>;
  tagPenalty: Map<string, number>;
  cookedRecently: Set<string>;
  cookedEver: Set<string>;
}

export function learnPreferences(feedback: RecipeFeedback[], now = Date.now()): Preferences {
  const prefs: Preferences = {
    hidden: new Set(), blockedTags: new Set(), tagPenalty: new Map(), cookedRecently: new Set(), cookedEver: new Set(),
  };
  const dismissedTags = new Map<string, number>();
  const cookedTags = new Map<string, number>();
  for (const f of feedback) {
    const key = feedbackKey(f);
    const age = (now - Date.parse(f.created_at)) / DAY;
    if (f.action === 'dismissed') {
      if (key && age <= 21) prefs.hidden.add(key);
      if (age <= 90) for (const t of f.tags) dismissedTags.set(t, (dismissedTags.get(t) ?? 0) + 1);
    } else {
      if (key) prefs.cookedEver.add(key);
      if (key && f.action === 'cooked' && age <= 3) prefs.cookedRecently.add(key);
      for (const t of f.tags) cookedTags.set(t, (cookedTags.get(t) ?? 0) + 1);
    }
  }
  for (const [tag, n] of dismissedTags) {
    const net = n - 2 * (cookedTags.get(tag) ?? 0);
    if (n >= 3 && !cookedTags.get(tag)) prefs.blockedTags.add(tag);
    else if (net > 0) prefs.tagPenalty.set(tag, net * 0.5);
  }
  return prefs;
}

export function matchesFilters(recipe: Recipe, filters: CookFilters): boolean {
  if (filters.quick && (recipe.total_minutes ?? Infinity) > QUICK_MINUTES) return false;
  if (filters.gourmet && !recipe.tags.includes('gourmet')) return false;
  if (filters.meal && !recipe.meal_types.includes(filters.meal)) return false;
  for (const c of filters.constraints ?? []) if (!recipe.constraints.includes(c)) return false;
  return true;
}

function score(s: Suggestion, prefs: Preferences): number {
  const key = recipeKey(s.recipe);
  let n = 0;
  if (isHouseRecipe(s.recipe)) n += 3; // las recetas propias tienen prioridad
  n += 2 * s.expiring.length;
  n -= 0.2 * s.lines.filter((l) => l.availability === 'low').length;
  if (prefs.cookedEver.has(key)) n += 0.5;
  if (prefs.cookedRecently.has(key)) n -= 2; // la hicieron hace poco: que no se repita
  for (const t of s.recipe.tags) n -= prefs.tagPenalty.get(t) ?? 0;
  return n;
}

/**
 * Las tres secciones de «¿Qué cocino?» (más «Con un par de compras»). Cada receta aparece una sola vez:
 * si aprovecha algo que vence, va arriba.
 */
export function suggestRecipes(
  recipes: Recipe[],
  products: Product[],
  opts: {
    servings: number;
    filters?: CookFilters;
    feedback?: RecipeFeedback[];
    now?: number;
  },
): SuggestionGroups {
  const now = opts.now ?? Date.now();
  const prefs = learnPreferences(opts.feedback ?? [], now);
  const groups: SuggestionGroups = { expiring: [], ready: [], oneMissing: [], more: [] };
  for (const recipe of recipes) {
    if (!matchesFilters(recipe, opts.filters ?? {})) continue;
    const own = isHouseRecipe(recipe);
    if (prefs.hidden.has(recipeKey(recipe))) continue;
    if (!own && recipe.tags.some((t) => prefs.blockedTags.has(t))) continue;
    const s = assessRecipe(recipe, products, opts.servings, now);
    s.score = score(s, prefs);
    const missing = s.missing.length;
    if (s.expiring.length && missing <= 1) groups.expiring.push(s);
    else if (missing === 0) groups.ready.push(s);
    else if (missing === 1) groups.oneMissing.push(s);
    // Con «Gourmet» se muestran todas: suelen pedir algo de compras y es para planear algo especial
    else if (missing <= 3 || opts.filters?.gourmet) groups.more.push(s);
  }
  const order = (a: Suggestion, b: Suggestion) =>
    b.score - a.score || a.missing.length - b.missing.length || compareText(a.recipe.title, b.recipe.title);
  // «Para aprovechar»: las mejores pocas (primero las que no necesitan compras); el resto va a su grupo
  groups.expiring.sort((a, b) => a.missing.length - b.missing.length || order(a, b));
  for (const s of groups.expiring.splice(MAX_EXPIRING)) (s.missing.length ? groups.oneMissing : groups.ready).push(s);
  groups.ready.sort(order);
  groups.oneMissing.sort(order);
  groups.more.sort(order);
  return groups;
}

/** Lo que falta, listo para la lista de compras. */
export function missingForList(s: Suggestion): { productId: string | null; name: string; quantity: number | null; note: string }[] {
  return s.missing.map((l) => ({
    productId: l.product?.id ?? null,
    name: l.product?.name ?? capitalize(l.ingredient.name),
    quantity: l.buy,
    note: l.buy == null && l.label ? m.common.forRecipeAmount(l.label, s.recipe.title) : m.common.forRecipe(s.recipe.title),
  }));
}

/** Productos del stock que usa la receta (sin repetir), para «La hice». */
export function usedProducts(s: Suggestion): { product: Product; uses: number | null }[] {
  const out = new Map<string, { product: Product; uses: number | null }>();
  for (const l of s.lines) {
    if (!l.product || l.product.status === 'out') continue;
    const prev = out.get(l.product.id);
    const uses = prev?.uses != null || l.uses != null ? (prev?.uses ?? 0) + (l.uses ?? 0) : null;
    out.set(l.product.id, { product: l.product, uses });
  }
  return [...out.values()];
}

export function capitalize(s: string): string {
  return s ? s[0].toLocaleUpperCase(locale) + s.slice(1) : s;
}

/** Nombres en el idioma de la app (se leen al usarlos) */
export const MEAL_LABEL: Readonly<Record<MealType, string>> = {
  get almuerzo() { return m.common.meals.almuerzo; },
  get cena() { return m.common.meals.cena; },
  get vianda() { return m.common.meals.vianda; },
  get dulce() { return m.common.meals.dulce; },
};
export const CONSTRAINT_LABEL: Readonly<Record<RecipeConstraint, string>> = {
  get sin_horno() { return m.common.constraints.sin_horno; },
  get una_olla() { return m.common.constraints.una_olla; },
};

export function minutesLabel(min: number | null): string | null {
  if (!min) return null;
  if (min < 60) return m.common.minutes(min);
  return m.common.hoursMinutes(Math.floor(min / 60), min % 60);
}

const LEADING_AMOUNTS = new Set(['una pizca', 'un chorrito', 'un poco', 'unas gotas', 'un puñado']);

/** Ingrediente → texto editable («400 g de fideos», «sal a gusto»). parseIngredientLine lo vuelve a leer igual. */
export function ingredientLine(ing: Pick<RecipeIngredient, 'name' | 'quantity' | 'unit' | 'amount' | 'optional'>): string {
  const t = m.common.ingredient;
  let text: string;
  if (ing.quantity != null && ing.unit) {
    text = ing.unit === 'u' || !kitchenUnit(ing.unit)
      ? t.count(formatNumber(ing.quantity), ing.name)
      : t.withUnit(formatAmount(ing.quantity, ing.unit), ing.name);
  } else if (ing.amount) {
    const label = m.common.amounts[ing.amount] ?? ing.amount;
    text = LEADING_AMOUNTS.has(ing.amount) ? t.leading(label, ing.name) : t.trailing(ing.name, label);
  } else {
    text = ing.name;
  }
  return ing.optional ? t.optional(text) : text;
}
