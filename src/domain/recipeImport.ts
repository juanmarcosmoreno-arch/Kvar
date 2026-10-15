/**
 * Importar una receta desde una página web o desde un texto pegado.
 * Puro (sin DOM ni red): recibe el HTML ya descargado y devuelve lo que se pudo leer.
 * Orden: JSON-LD de schema.org (lo usan casi todos los blogs y sitios de recetas), microdatos y,
 * para el título, og:title / <title>.
 */

export interface ImportedRecipe {
  title: string;
  servings: number | null;
  totalMinutes: number | null;
  ingredients: string[];
  steps: string[];
  image: string | null;
  sourceUrl: string | null;
}

// -----------------------------------------------------------------------------
// Texto: entidades HTML y etiquetas
// -----------------------------------------------------------------------------
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…',
  laquo: '«', raquo: '»', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', deg: '°', frac12: '½',
  frac14: '¼', frac34: '¾', frac13: '⅓', frac23: '⅔', times: '×', middot: '·', bull: '•', copy: '©',
  reg: '®', trade: '™', iexcl: '¡', iquest: '¿', ordm: 'º', ordf: 'ª', shy: '',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', Aacute: 'Á', Eacute: 'É', Iacute: 'Í',
  Oacute: 'Ó', Uacute: 'Ú', ntilde: 'ñ', Ntilde: 'Ñ', uuml: 'ü', Uuml: 'Ü', ouml: 'ö', Ouml: 'Ö',
  auml: 'ä', Auml: 'Ä', aring: 'å', Aring: 'Å', aelig: 'æ', AElig: 'Æ', oslash: 'ø', Oslash: 'Ø',
  agrave: 'à', egrave: 'è', igrave: 'ì', ograve: 'ò', ugrave: 'ù', acirc: 'â', ecirc: 'ê', icirc: 'î',
  ocirc: 'ô', ucirc: 'û', ccedil: 'ç', Ccedil: 'Ç', atilde: 'ã', otilde: 'õ', euml: 'ë', iuml: 'ï', szlig: 'ß',
};

export function decodeEntities(s: string): string {
  // Dos pasadas: algunos sitios escapan dos veces («&amp;frac12;»)
  let out = s;
  for (let i = 0; i < 2 && out.includes('&'); i++) {
    out = out.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (all, code: string) => {
      if (code[0] === '#') {
        const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : all;
      }
      return code in NAMED_ENTITIES ? NAMED_ENTITIES[code] : all;
    });
  }
  return out;
}

/** Quita etiquetas, decodifica entidades y junta espacios: una sola línea. */
export function cleanText(s: string): string {
  return decodeEntities(String(s).replace(/<[^>]*>/g, ' '))
    .replace(/[\s\u00a0\u200b]+/g, ' ')
    .replace(/ ([.,;:!?)])/g, '$1')
    .trim();
}

/** HTML con párrafos, listas o <br> → renglones limpios. */
function htmlToLines(s: string): string[] {
  const withBreaks = String(s)
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|li|div|ol|ul|h[1-6]|section|tr)\b[^>]*>/gi, '\n');
  return withBreaks.split(/\n+/).map(cleanText).filter(Boolean);
}

// -----------------------------------------------------------------------------
// Números y tiempos
// -----------------------------------------------------------------------------
/** «4», 4, «4 porciones», «Serves 4-6», ["4", "4 servings"] → 4 */
export function parseYield(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? Math.round(v) : null;
  if (typeof v === 'string') {
    const n = cleanText(v).match(/\d+/);
    if (!n) return null;
    const x = Number(n[0]);
    return x > 0 && x <= 100 ? x : null;
  }
  if (Array.isArray(v)) {
    for (const x of v) {
      const n = parseYield(x);
      if (n) return n;
    }
  }
  return null;
}

/** ISO 8601 («PT1H30M», «P0DT0H45M», «PT90M») → minutos */
export function parseDuration(v: unknown): number | null {
  if (typeof v !== 'string') return null;
  const m = v.trim().match(/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
  if (!m) return null;
  const [, d, h, min, s] = m.map((x) => (x ? Number(x) : 0));
  const total = Math.round(d * 1440 + h * 60 + min + s / 60);
  return total > 0 ? total : null;
}

// -----------------------------------------------------------------------------
// JSON-LD
// -----------------------------------------------------------------------------
type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

function hasType(node: Json, type: string): boolean {
  const t = node['@type'];
  const list = Array.isArray(t) ? t : [t];
  return list.some((x) => typeof x === 'string' && x.replace(/^.*[/:#]/, '').toLowerCase() === type.toLowerCase());
}

function parseJsonLoose(raw: string): unknown {
  const text = raw.trim().replace(/^<!--|-->$/g, '').replace(/^\s*\/\/<!\[CDATA\[|\/\/\]\]>\s*$/g, '').trim();
  try {
    return JSON.parse(text);
  } catch {
    // Algunos sitios dejan saltos de línea o tabs crudos dentro de los strings
    try {
      return JSON.parse(text.replace(/[\u0000-\u001f]+/g, ' '));
    } catch {
      return null;
    }
  }
}

function findRecipeNode(v: unknown, depth = 0): Json | null {
  if (depth > 8 || v == null) return null;
  if (Array.isArray(v)) {
    for (const x of v) {
      const r = findRecipeNode(x, depth + 1);
      if (r) return r;
    }
    return null;
  }
  if (!isObject(v)) return null;
  if (hasType(v, 'Recipe')) return v;
  for (const key of ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement', 'item', 'about']) {
    const r = findRecipeNode(v[key], depth + 1);
    if (r) return r;
  }
  return null;
}

function textOf(v: unknown): string {
  if (typeof v === 'string') return cleanText(v);
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) return v.map(textOf).filter(Boolean).join(' ');
  if (isObject(v)) return textOf(v.text ?? v.name ?? '');
  return '';
}

function instructionLines(v: unknown, depth = 0): string[] {
  if (depth > 6 || v == null) return [];
  if (typeof v === 'string') return htmlToLines(v);
  if (Array.isArray(v)) return v.flatMap((x) => instructionLines(x, depth + 1));
  if (!isObject(v)) return [];
  if (hasType(v, 'HowToSection') || (v.itemListElement && !v.text)) {
    const name = textOf(v.name);
    const inner = instructionLines(v.itemListElement, depth + 1);
    return name && inner.length ? [`${name.replace(/:$/, '')}:`, ...inner] : inner;
  }
  const text = typeof v.text === 'string' ? v.text : typeof v.name === 'string' ? v.name : '';
  return htmlToLines(text);
}

function imageOf(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null;
  if (Array.isArray(v)) {
    for (const x of v) {
      const r = imageOf(x);
      if (r) return r;
    }
    return null;
  }
  if (isObject(v)) return imageOf(v.url ?? v.contentUrl ?? v['@id']);
  return null;
}

function ingredientList(v: unknown): string[] {
  const list = Array.isArray(v) ? v : typeof v === 'string' ? v.split(/\n+/) : [];
  return list.map((x) => textOf(x)).filter(Boolean);
}

function fromJsonLd(html: string): Omit<ImportedRecipe, 'sourceUrl'> | null {
  const re = /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(re)) {
    const node = findRecipeNode(parseJsonLoose(match[1]));
    if (!node) continue;
    const ingredients = ingredientList(node.recipeIngredient ?? node.ingredients);
    const steps = instructionLines(node.recipeInstructions);
    const total = parseDuration(node.totalTime);
    const parts = (parseDuration(node.prepTime) ?? 0) + (parseDuration(node.cookTime) ?? 0);
    return {
      title: textOf(node.name ?? node.headline),
      servings: parseYield(node.recipeYield ?? node.yield),
      totalMinutes: total ?? (parts > 0 ? parts : null),
      ingredients,
      steps,
      image: imageOf(node.image),
    };
  }
  return null;
}

// -----------------------------------------------------------------------------
// Microdatos y meta
// -----------------------------------------------------------------------------
function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? (m[1] ?? m[2] ?? m[3] ?? '') : null;
}

const VOID_TAGS = new Set(['meta', 'link', 'img', 'br', 'input', 'source', 'hr']);

/** Contenido (HTML interno o atributo content) de cada elemento con ese itemprop */
function itempropValues(html: string, props: string[]): { inner: string; content: string | null }[] {
  const out: { inner: string; content: string | null }[] = [];
  const re = /<([a-z][a-z0-9]*)\b([^>]*\bitemprop\s*=\s*["']([^"']+)["'][^>]*)>/gi;
  for (const m of html.matchAll(re)) {
    const names = m[3].split(/\s+/);
    if (!names.some((n) => props.includes(n))) continue;
    const tag = m[1].toLowerCase();
    const content = attr(m[2], 'content') ?? attr(m[2], 'datetime');
    if (VOID_TAGS.has(tag) || m[2].trim().endsWith('/')) {
      out.push({ inner: '', content });
      continue;
    }
    // Buscar el cierre del mismo elemento, contando anidados del mismo tipo
    const start = m.index! + m[0].length;
    const scan = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
    scan.lastIndex = start;
    let depth = 1;
    let end = html.length;
    for (let t = scan.exec(html); t; t = scan.exec(html)) {
      depth += t[1] ? -1 : 1;
      if (depth === 0) {
        end = t.index;
        break;
      }
    }
    out.push({ inner: html.slice(start, end), content });
  }
  return out;
}

function metaContent(html: string, key: string): string | null {
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0];
    if ((attr(tag, 'property') ?? attr(tag, 'name'))?.toLowerCase() === key) {
      const c = attr(tag, 'content');
      if (c) return cleanText(c);
    }
  }
  return null;
}

function fromMicrodata(html: string): Omit<ImportedRecipe, 'sourceUrl'> | null {
  const ingredients = itempropValues(html, ['recipeIngredient', 'ingredients'])
    .map((v) => cleanText(v.content ?? v.inner))
    .filter(Boolean);
  const steps = itempropValues(html, ['recipeInstructions']).flatMap((v) => (v.content ? htmlToLines(v.content) : htmlToLines(v.inner)));
  if (!ingredients.length && !steps.length) return null;
  const first = (props: string[]) => {
    const v = itempropValues(html, props)[0];
    return v ? (v.content ?? cleanText(v.inner)) : null;
  };
  // El nombre de la receta: el primer itemprop="name" dentro del bloque Recipe
  const scope = html.search(/itemtype\s*=\s*["'][^"']*schema\.org\/Recipe["']/i);
  const nameV = itempropValues(scope >= 0 ? html.slice(scope) : html, ['name'])[0];
  const total = parseDuration(first(['totalTime']));
  const parts = (parseDuration(first(['prepTime'])) ?? 0) + (parseDuration(first(['cookTime'])) ?? 0);
  const imageV = itempropValues(html, ['image'])[0];
  return {
    title: nameV ? cleanText(nameV.content ?? nameV.inner) : '',
    servings: parseYield(first(['recipeYield', 'yield'])),
    totalMinutes: total ?? (parts > 0 ? parts : null),
    ingredients,
    steps,
    image: imageV ? (imageV.content ?? null) : null,
  };
}

function pageTitle(html: string): string {
  const og = metaContent(html, 'og:title');
  if (og) return og;
  const t = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return t ? cleanText(t[1]) : '';
}

function absoluteUrl(src: string | null, base: string): string | null {
  if (!src) return null;
  try {
    return new URL(decodeEntities(src), base).href;
  } catch {
    return null;
  }
}

/** Quita lo que los sitios agregan al título («Receta de …», « | Mi Blog», « - Recetas Fáciles») */
function tidyTitle(title: string): string {
  return title
    .replace(/\s+[|·–—-]\s+[^|·–—-]{2,40}$/, '')
    .replace(/^(?:receta de|receta:|recipe:)\s+/i, '')
    .trim();
}

/**
 * Lee una receta de una página. Devuelve null si no hay nada que parezca una receta
 * (ni ingredientes ni pasos).
 */
export function parseRecipePage(html: string, url: string): ImportedRecipe | null {
  if (!html) return null;
  const found = fromJsonLd(html) ?? fromMicrodata(html);
  if (!found) return null;
  // JSON-LD sin ingredientes (pasa): completar con microdatos si hay
  if (!found.ingredients.length) {
    const micro = fromMicrodata(html);
    if (micro?.ingredients.length) found.ingredients = micro.ingredients;
  }
  if (!found.ingredients.length && !found.steps.length) return null;
  const rawTitle = found.title || pageTitle(html);
  return {
    title: tidyTitle(rawTitle),
    servings: found.servings,
    totalMinutes: found.totalMinutes,
    ingredients: found.ingredients,
    steps: found.steps,
    image: absoluteUrl(found.image ?? metaContent(html, 'og:image'), url),
    sourceUrl: url,
  };
}

// -----------------------------------------------------------------------------
// Texto pegado
// -----------------------------------------------------------------------------
const INGREDIENTS_HEADING =
  /^(?:ingredientes|ingredients?|ingrédients|ingredienti|ingredienser|zutaten|lo que necesitás|necesitás|necesitas|you(?:'ll)? need|材料|配料|用料|食材)(?![\p{L}\p{N}])/iu;
const STEPS_HEADING =
  /^(?:preparaci[oó]n|pasos?|procedimiento|elaboraci[oó]n|modo de prepar[oa]|c[oó]mo se hace|instrucciones|instructions|directions|method|steps|préparation|preparazione|procedimento|tillagning|gör så här|instruktioner|fremgangsmåde|sådan gør du|作り方|做法|步骤|步驟|手順)(?![\p{L}\p{N}])/iu;
const SERVINGS_LINE = /(?:porciones|raciones|rinde|personas|serves|servings|yield|portions|porzioni|porções|portioner|personer|人分|人份)/iu;
const TIME_LINE = /(?:tiempo|minutos|min\b|time|minutes|temps|tempo|minuti|tid|minuter|minutter|分)/iu;

function isHeading(line: string, re: RegExp): boolean {
  const s = line.replace(/^[#*\s]+|[:：*\s]+$/g, '');
  const m = s.match(re);
  if (!m || s.length > 40) return false;
  // «Ingredientes (para 4)» o «Preparación de la salsa» son encabezados; «Paso 1: picar…» no
  const rest = s.slice(m[0].length).trim();
  return !rest || /^[(（]/.test(rest) || (rest.length <= 25 && !/[:：]/.test(rest) && !/^\d/.test(rest));
}

/** «1 h 30 min», «45 minutos», «Tiempo: 1 hora» → minutos */
function minutesIn(line: string): number | null {
  const h = line.match(/(\d+(?:[.,]\d+)?)\s*(?:h|hs|horas?|hours?|heures?|ore|timmar|timer|時間|小时)\b/iu);
  const min = line.match(/(\d+)\s*(?:min|minutos?|minutes?|minuti|minuter|minutter|分)/iu);
  const total = (h ? Number(h[1].replace(',', '.')) * 60 : 0) + (min ? Number(min[1]) : 0);
  return total > 0 ? Math.round(total) : null;
}

/** Parece un ingrediente: empieza con cantidad o viñeta, o es corto y sin punto final. */
function looksLikeIngredient(line: string): boolean {
  if (/^[-•*·–]\s*/.test(line) || /^[\d½¼¾⅓⅔]/.test(line)) return !/^\d+[.)]\s+\S.{60,}/.test(line);
  return line.length <= 60 && !/[.!]$/.test(line);
}

const STEP_NUMBER = /^(?:(?:paso|step|étape|passo|steg|trin)\s*\d+\s*[:.)-]?\s*|\d+\s*[.)-]\s+|[-•*·–]\s*)/iu;

/**
 * Receta pegada como texto: título (primer renglón), ingredientes hasta un encabezado como
 * «Preparación», «Pasos» o «Instructions», y después los pasos. null si no hay ingredientes.
 */
export function parseRecipeText(text: string): ImportedRecipe | null {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/[\s\u00a0]+/g, ' ').trim()).filter(Boolean);
  if (!lines.length) return null;
  let title = '';
  let servings: number | null = null;
  let totalMinutes: number | null = null;
  const ingredients: string[] = [];
  const steps: string[] = [];
  let mode: 'start' | 'ingredients' | 'steps' = 'start';

  for (const line of lines) {
    if (isHeading(line, STEPS_HEADING)) {
      mode = 'steps';
      continue;
    }
    if (isHeading(line, INGREDIENTS_HEADING)) {
      mode = 'ingredients';
      const n = line.match(/\d+/); // «Ingredientes (para 4)»
      if (n && servings == null) servings = parseYield(n[0]);
      continue;
    }
    if (mode !== 'steps' && line.length <= 50 && /[:：]/.test(line)) {
      // «Porciones: 4», «Tiempo: 45 min»
      if (SERVINGS_LINE.test(line) && servings == null) {
        servings = parseYield(line);
        if (servings) continue;
      }
      if (TIME_LINE.test(line) && totalMinutes == null) {
        totalMinutes = minutesIn(line);
        if (totalMinutes) continue;
      }
    }
    if (mode === 'start' && !title && !looksLikeIngredientStrict(line)) {
      title = line.replace(/[:：]$/, '');
      continue;
    }
    if (mode === 'steps') {
      const s = line.replace(STEP_NUMBER, '').trim();
      if (s) steps.push(s);
      continue;
    }
    if (looksLikeIngredient(line)) {
      ingredients.push(line.replace(/^[-•*·–]\s*/, ''));
      mode = 'ingredients';
    } else if (ingredients.length) {
      // Sin encabezado: el primer renglón largo después de los ingredientes ya es un paso
      mode = 'steps';
      steps.push(line.replace(STEP_NUMBER, '').trim());
    }
  }
  if (!ingredients.length) return null;
  return { title: tidyTitle(title), servings, totalMinutes, ingredients, steps, image: null, sourceUrl: null };
}

/** El título no empieza con cantidad ni viñeta */
function looksLikeIngredientStrict(line: string): boolean {
  return /^[-•*·–\d½¼¾⅓⅔]/.test(line);
}
