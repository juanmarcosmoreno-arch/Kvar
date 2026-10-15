/**
 * Encontrar la fecha de vencimiento en el texto leído (OCR) de un envase.
 *
 * Entiende lo que se imprime en Uruguay, Argentina, España, Europa, EE. UU. y Asia:
 * 12/08/26, 12.08.2026, 12-08-26, 12/08 (próxima vez que llegue), 08/27 y 08/2027 (último día del mes),
 * 15 MAR 2027, MAR/27, 2027-03-15, 2027.03.15, 2027年3月15日…
 * Prefiere las fechas que siguen a «VTO», «VENCE», «EXP», «BEST BEFORE», «賞味期限», etc. y descarta las de
 * elaboración («ELAB», «FAB», «MFG», «製造»…). Si quedan varias, se queda con la más lejana en el futuro.
 *
 * Sin lookbehind en las expresiones regulares: Safari viejo no lo entiende.
 */

export interface ExpiryMatch {
  /** YYYY-MM-DD */
  date: string;
  /** El texto tal como se leyó (corregido de errores típicos del OCR) */
  raw: string;
}

export interface ExpiryOptions {
  /** Fechas numéricas ambiguas como mes/día (en-US). Por defecto día/mes. */
  monthFirst?: boolean;
}

/** y = NEXT: el próximo año en que llegue ese día; d = 0: último día del mes */
const NEXT = -1;
type Ymd = [y: number, m: number, d: number];

interface Candidate {
  start: number;
  end: number;
  options: Ymd[];
  /** Solo vale si está al lado de una palabra de vencimiento (formas cortas que se confunden con otras cosas) */
  needsLabel: boolean;
}

type KeywordKind = 'expiry' | 'made';

// Palabras normalizadas: mayúsculas y sin tildes («BÄST FÖRE» → «BAST FORE»)
const EXPIRY_WORDS = [
  'VTO', 'VTOS', 'VCTO', 'VENCE', 'VENC', 'VENCIM', 'VENCIMIENTO', 'FECHA DE VENCIMIENTO', 'F VTO',
  'CONSUMIR ANTES DE(L)?', 'CONSUMIR PREF(ERENTEMENTE)? ANTES (DE(L)?)?', 'CONSUMASE ANTES DE(L)?',
  'FECHA DE CADUCIDAD', 'CADUCIDAD', 'CAD', 'CADUCA',
  'EXP', 'EXPIRY', 'EXPIRES', 'EXPIRATION', 'EXP DATE', 'BEST BEFORE( END)?', 'BEST BY', 'BB', 'BBE', 'USE BY',
  'SELL BY', 'A CONSOMMER DE PREFERENCE AVANT( FIN)?', 'A CONSOMMER JUSQU.AU', 'DLUO', 'DLC', 'DDM',
  'DA CONSUMARSI( PREFERIBILMENTE)? ENTRO( IL)?', 'SCAD', 'SCADENZA', 'VAL', 'VALIDADE', 'VALIDO ATE',
  'CONSUMIR ATE', 'BAST FORE', 'SISTA FORBRUKNINGSDAG', 'ANVANDS SENAST', 'MINDST HOLDBAR TIL',
  'SIDSTE ANVENDELSESDATO', 'MINDESTENS HALTBAR BIS', 'TE GEBRUIKEN TOT', 'TENMINSTE HOUDBAAR TOT',
];
const EXPIRY_CJK = ['保质期至', '保质期', '有效期至', '有效期', '到期日', '賞味期限', '消費期限', '有効期限'];
const MADE_WORDS = [
  'ELAB', 'ELABORADO', 'ELABORACION', 'FECHA DE ELABORACION', 'FAB', 'FABR', 'FABRICADO', 'FABRICACION',
  'FABRICACAO', 'FABRICATION', 'PROD', 'PRODUCIDO', 'PRODUCCION', 'PRODUCED', 'PRODUCTION', 'PRODUZIONE',
  'MFG', 'MFD', 'MANUFACTURED', 'ENV', 'ENVASADO', 'ENVASE', 'PACKED', 'PKD', 'PACKED ON', 'EMB', 'EMBALADO',
  'PRODUKTIONSDATO', 'TILLVERKAD',
];
const MADE_CJK = ['生产日期', '生产', '生產', '製造年月日', '製造日', '製造'];

const MONTHS: Record<string, number> = {};
const monthNames: string[][] = [
  ['ENE', 'ENERO', 'JAN', 'JANUARY', 'JANEIRO', 'JANV', 'JANVIER', 'GEN', 'GENNAIO'],
  ['FEB', 'FEBRERO', 'FEBRUARY', 'FEV', 'FEVEREIRO', 'FEVR', 'FEVRIER', 'FEBBRAIO'],
  ['MAR', 'MARZO', 'MARCH', 'MARCO', 'MARS'],
  ['ABR', 'ABRIL', 'APR', 'APRIL', 'AVR', 'AVRIL', 'APRILE'],
  ['MAY', 'MAYO', 'MAI', 'MAIO', 'MAG', 'MAGGIO'],
  ['JUN', 'JUNIO', 'JUNE', 'JUNHO', 'JUIN', 'GIU', 'GIUGNO'],
  ['JUL', 'JULIO', 'JULY', 'JULHO', 'JUIL', 'JUILLET', 'LUG', 'LUGLIO'],
  ['AGO', 'AGOSTO', 'AUG', 'AUGUST', 'AOUT'],
  ['SEP', 'SEPT', 'SET', 'SEPTIEMBRE', 'SETIEMBRE', 'SEPTEMBER', 'SETEMBRO', 'SEPTEMBRE', 'SETTEMBRE'],
  ['OCT', 'OCTUBRE', 'OCTOBER', 'OUT', 'OUTUBRO', 'OCTOBRE', 'OTT', 'OTTOBRE'],
  ['NOV', 'NOVIEMBRE', 'NOVEMBER', 'NOVEMBRO', 'NOVEMBRE'],
  ['DIC', 'DICIEMBRE', 'DEC', 'DECEMBER', 'DEZ', 'DEZEMBRO', 'DECEMBRE', 'DICEMBRE'],
];
monthNames.forEach((names, i) => names.forEach((n) => (MONTHS[n] = i + 1)));
const MON = `(${Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|')})(?![A-Z])`;
const SEP = '\\s?[/.\\-]\\s?';

const isDigit = (c: string | undefined) => c !== undefined && c >= '0' && c <= '9';
const isLetter = (c: string | undefined) => c !== undefined && c >= 'A' && c <= 'Z';
const isSep = (c: string | undefined) => c === '/' || c === '.' || c === '-';

/** Mayúsculas y sin tildes, sin cambiar el largo (para que las posiciones coincidan con el original). */
function normalize(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    let up = ch.toUpperCase();
    if (up.length !== 1) up = ch;
    const bare = up.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    out += bare.length === 1 ? bare : up;
  }
  return out;
}

const DIGIT_LIKE: Record<string, string> = { O: '0', Q: '0', I: '1', L: '1', '|': '1', S: '5', B: '8' };

/** Errores típicos del OCR dentro de números: «12/O8/26» → «12/08/26», «2O26» → «2026». */
function fixDigits(t: string): string {
  const chars = t.split('');
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < chars.length; i++) {
      const fix = DIGIT_LIKE[chars[i]];
      if (!fix) continue;
      const prev = chars[i - 1];
      const next = chars[i + 1];
      const prevOk = isDigit(prev) || isSep(prev);
      const nextOk = isDigit(next) || isSep(next);
      // Entre dígitos/separadores, con al menos un dígito pegado
      const inside = prevOk && nextOk && (isDigit(prev) || isDigit(next));
      // «O8/12/26»: una O al principio de un número que sigue con un separador
      const leadingO = chars[i] === 'O' && !isLetter(prev) && !isDigit(prev) && isDigit(next) && isSep(chars[i + 2]);
      if (inside || leadingO) chars[i] = fix;
    }
  }
  return chars.join('');
}

function keywordRegex(words: string[], latin: boolean): RegExp {
  const alt = words
    .slice()
    .sort((a, b) => b.length - a.length)
    .map((w) => w.replace(/ /g, '[\\s.:]*'))
    .join('|');
  return latin ? new RegExp(`(?:${alt})\\.?(?![A-Z])`, 'g') : new RegExp(`(?:${alt})`, 'g');
}

interface Keyword { start: number; end: number; kind: KeywordKind }

function findKeywords(t: string): Keyword[] {
  const out: Keyword[] = [];
  const add = (re: RegExp, kind: KeywordKind, latin: boolean) => {
    for (const mt of t.matchAll(re)) {
      const start = mt.index!;
      if (latin && isLetter(t[start - 1])) continue;
      out.push({ start, end: start + mt[0].length, kind });
    }
  };
  add(keywordRegex(EXPIRY_WORDS, true), 'expiry', true);
  add(keywordRegex(EXPIRY_CJK, false), 'expiry', false);
  add(keywordRegex(MADE_WORDS, true), 'made', true);
  add(keywordRegex(MADE_CJK, false), 'made', false);
  return out;
}

/** Recorre las coincidencias descartando las que tienen pegado antes un carácter prohibido. */
function scan(t: string, source: string, badBefore: (c: string | undefined) => boolean, cb: (mt: RegExpExecArray) => void) {
  const re = new RegExp(source, 'g');
  let mt: RegExpExecArray | null;
  while ((mt = re.exec(t))) {
    if (badBefore(t[mt.index - 1])) {
      re.lastIndex = mt.index + 1;
      continue;
    }
    cb(mt);
    re.lastIndex = mt.index + 1; // pueden solaparse: la más larga gana después
  }
}

const year = (s: string) => (s.length <= 2 ? 2000 + Number(s) : Number(s));
const notDigit = (c: string | undefined) => isDigit(c);
const notLetter = (c: string | undefined) => isLetter(c);

function findCandidates(t: string, monthFirst: boolean): Candidate[] {
  const asian = /[\u3040-\u30ff\u4e00-\u9fff]/.test(t);
  const out: Candidate[] = [];
  const push = (mt: RegExpExecArray, options: Ymd[], needsLabel = false) =>
    out.push({ start: mt.index, end: mt.index + mt[0].length, options, needsLabel });

  // 2027-03-15, 2027.03.15, 2027/3/15
  scan(t, `(\\d{4})${SEP}(\\d{1,2})${SEP}(\\d{1,2})(?!\\d)`, notDigit, (mt) =>
    push(mt, [[+mt[1], +mt[2], +mt[3]]]));
  // 2027年3月15日, 2027年3月
  scan(t, '(\\d{2,4})\\s?年\\s?(\\d{1,2})\\s?月(?:\\s?(\\d{1,2})\\s?日?)?', notDigit, (mt) =>
    push(mt, [[year(mt[1]), +mt[2], mt[3] ? +mt[3] : 0]]));
  // 12/08/26, 12.08.2026, 12-08-26 (y en envases japoneses o chinos 27.03.15 = año.mes.día)
  scan(t, `(\\d{1,2})${SEP}(\\d{1,2})${SEP}(\\d{4}|\\d{2})(?!\\d)`, notDigit, (mt) => {
    const [a, b, c] = [+mt[1], +mt[2], year(mt[3])];
    const dmy: Ymd = [c, b, a];
    const mdy: Ymd = [c, a, b];
    const options = monthFirst ? [mdy, dmy] : [dmy, mdy];
    if (asian && mt[1].length === 2 && mt[3].length === 2) options.push([year(mt[1]), b, +mt[3]]);
    push(mt, options);
  });
  // 08/2027
  scan(t, `(\\d{1,2})${SEP}(\\d{4})(?!\\d)`, notDigit, (mt) => push(mt, [[+mt[2], +mt[1], 0]]));
  // 2027.03
  scan(t, `(20\\d{2})${SEP}(\\d{1,2})(?!\\d)(?!${SEP}\\d)`, notDigit, (mt) => push(mt, [[+mt[1], +mt[2], 0]]));
  // 12/08 o 08/27: solo al lado de «VTO», «EXP»…
  scan(t, `(\\d{1,2})${SEP}(\\d{1,2})(?!\\d)(?!${SEP}\\d)`, notDigit, (mt) => {
    const [a, b] = [+mt[1], +mt[2]];
    const monthYear: Ymd = [2000 + b, a, 0];
    let options: Ymd[];
    if (monthFirst) options = b > 31 ? [monthYear] : [[NEXT, a, b], monthYear];
    else options = b > 12 ? [monthYear, [NEXT, b, a]] : [[NEXT, b, a]];
    push(mt, options, true);
  });
  // 15 MAR 2027, 15-MAR-27, 15MAR27, 15 DE MARZO DE 2027
  scan(t, `(\\d{1,2})\\s?[.\\-/]?\\s?(?:DE\\s)?${MON}\\.?\\s?[.\\-/,]?\\s?(?:DEL?\\s)?(\\d{4}|\\d{2})(?!\\d)`, notDigit, (mt) =>
    push(mt, [[year(mt[3]), MONTHS[mt[2]], +mt[1]]]));
  // MAR 15, 2027
  scan(t, `${MON}\\.?\\s?(\\d{1,2})(?:ST|ND|RD|TH)?,?\\s(\\d{4})(?!\\d)`, notLetter, (mt) =>
    push(mt, [[+mt[3], MONTHS[mt[1]], +mt[2]]]));
  // MAR/27, MAR 2027
  scan(t, `${MON}\\.?\\s?[.\\-/']?\\s?(?:DEL?\\s)?(\\d{4}|\\d{2})(?!\\d)`, notLetter, (mt) =>
    push(mt, [[year(mt[2]), MONTHS[mt[1]], 0]]));
  // 15 MAR (sin año): solo al lado de una palabra de vencimiento
  scan(t, `(\\d{1,2})\\s?[.\\-/]?\\s?(?:DE\\s)?${MON}`, notDigit, (mt) =>
    push(mt, [[NEXT, MONTHS[mt[2]], +mt[1]]], true));

  // Una fecha dentro de otra más larga («12/08» dentro de «12/08/26») no cuenta
  return out.filter((c) => !out.some((o) => o !== c && o.start <= c.start && o.end >= c.end && o.end - o.start > c.end - c.start));
}

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

function resolve([y, m, d]: Ymd, today: string, now: Date): string | null {
  if (m < 1 || m > 12) return null;
  if (y === NEXT) {
    for (const yy of [now.getFullYear(), now.getFullYear() + 1, now.getFullYear() + 2]) {
      if (d < 1 || d > daysInMonth(yy, m)) continue;
      const s = iso(yy, m, d);
      if (s >= today) return s;
    }
    return null;
  }
  if (y < 2000 || y > 2099) return null;
  const day = d === 0 ? daysInMonth(y, m) : d;
  if (day < 1 || day > daysInMonth(y, m)) return null;
  return iso(y, m, day);
}

export function findExpiryDate(text: string, now: Date, opts: ExpiryOptions = {}): ExpiryMatch | null {
  if (!text) return null;
  const t = fixDigits(normalize(text));
  const today = iso(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const min = iso(now.getFullYear() - 2, now.getMonth() + 1, Math.min(now.getDate(), 28));
  const max = iso(now.getFullYear() + 6, now.getMonth() + 1, Math.min(now.getDate(), 28));
  const keywords = findKeywords(t);

  const found: { date: string; raw: string; labeled: boolean }[] = [];
  for (const c of findCandidates(t, Boolean(opts.monthFirst))) {
    // La palabra más cercana antes de la fecha (hasta 40 caracteres)
    let label: Keyword | undefined;
    for (const k of keywords) {
      if (k.end <= c.start && c.start - k.end <= 40 && (!label || k.end > label.end)) label = k;
    }
    if (label?.kind === 'made') continue; // fecha de elaboración
    const labeled = label?.kind === 'expiry';
    if (c.needsLabel && !labeled) continue;
    for (const option of c.options) {
      const date = resolve(option, today, now);
      if (date && date >= min && date <= max) {
        found.push({ date, raw: t.slice(c.start, c.end).trim(), labeled });
        break;
      }
    }
  }
  if (!found.length) return null;

  const pool = found.some((f) => f.labeled) ? found.filter((f) => f.labeled) : found;
  const future = pool.filter((f) => f.date >= today);
  const best = (future.length ? future : pool).reduce((a, b) => (b.date > a.date ? b : a));
  return { date: best.date, raw: best.raw };
}
