/**
 * Lectura de tickets de supermercado (Fase 3).
 * El OCR (Vision de Apple en iPhone, o la IA en la nube) entrega texto; acá se arman
 * las líneas sin IA, con reglas, y se proponen los productos del hogar.
 * Formatos uruguayos (e-Ticket):
 *  - En un renglón (Macromercado): CÓDIGO DESCRIPCIÓN CANTIDAD PRECIO MONTO[IVA]
 *      168953 LECHE CLADY ULTRA ENTERA S/FRIO 1LT X 4 2,000 185,07 370,14E
 *  - En dos renglones (Disco, Devoto, Géant y otros): DESCRIPCIÓN MONTO, y abajo CANTIDAD [KG|UN] x PRECIO
 *      AGUJA SIN HUESO          422.36
 *      1.324 KG x 319.00
 */
import { normalizeAlias, similarity, type Alias, type Candidate, type Match } from './aliases';

export interface ReceiptLine {
  raw: string;
  storeCode: string | null; // código interno del súper (el mejor alias posible)
  description: string;      // texto original sin el código
  clean: string;            // descripción legible ("Galletitas el trigal con leche 190 grs")
  quantity: number;         // 2 (unidades) o 9.686 (kg)
  weighed: boolean;         // se vende por peso
  packSize: number;         // "1LT X 4" → 4 unidades por paquete
  units: number;            // unidades para el conteo: 2 packs × 4 = 8; pesados = 1
  unitPrice: number;
  amount: number;
  promo: boolean;           // "OF." = oferta
}

export interface ParsedReceipt {
  store: string | null;
  date: string | null; // AAAA-MM-DD
  lines: ReceiptLine[];
  ignored: string[];   // bolsas, etc.
  total: number | null;
  /** Suma de las líneas + redondeo − total: si no es 0, el OCR leyó mal o faltan líneas. */
  difference: number | null;
}

const LINE_RE =
  /^\s*(?:(\d{1,8})\s+)?(.+?)\s+(\d{1,4}[.,]\d{3})\s+(\d{1,3}(?:\.\d{3})*,\d{2}|\d+[.,]\d{2})\s+(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+[.,]\d{2})\s*[A-Z]?\s*$/;

/** Monto: «1.410,48», «422.36», «-12,00» */
const AMOUNT = String.raw`-?\d{1,3}(?:[.,]\d{3})*[.,]\d{2}`;
/** Cantidad: «1.324», «2», «0,560» */
const QTY = String.raw`\d{1,4}(?:[.,]\d{1,3})?`;
/** Unidad del renglón de cantidad (el OCR a veces pone punto o la escribe en minúscula) */
const UNIT = String.raw`(?:KGS?|KG\.|K|UN|UN\.|UNI|UNID|UNIDAD(?:ES)?|U|LTS?|L|GRS?|G)`;
/** Renglón de cantidad del formato en dos renglones: «1.324 KG x 319.00», «2 UN x 45,00», a veces con el monto al final */
const QTY_LINE_RE = new RegExp(String.raw`^\s*(${QTY})\s*(${UNIT})?\s*[xX×*]\s*\$?\s*(${AMOUNT}|\d+)(?:\s+\$?\s*(${AMOUNT})\s*[A-Z]?)?\s*$`, 'i');
/** Descripción y monto: «AGUJA SIN HUESO 422.36» (código adelante opcional) */
const NAME_AMOUNT_RE = new RegExp(String.raw`^\s*(?:(\d{4,13})\s+)?(.*?[A-Za-zÁÉÍÓÚÑáéíóúñ]{2}.*?)\s+\$?\s*(${AMOUNT})\s*[A-Z]?\s*$`);
/** Todo junto en un renglón (cuando el OCR une los dos): «AGUJA SIN HUESO 1.324 KG x 319.00 422.36» */
const MERGED_RE = new RegExp(String.raw`^\s*(?:(\d{4,13})\s+)?(.*?[A-Za-zÁÉÍÓÚÑáéíóúñ]{2}.*?)\s+(${QTY})\s*(${UNIT})?\s*[xX×*]\s*\$?\s*(${AMOUNT}|\d+)\s+\$?\s*(${AMOUNT})\s*[A-Z]?\s*$`, 'i');
/** Renglones que no son productos aunque tengan forma de «texto monto» */
const NOT_ITEM_RE = /\b(sub\s*total|total|pago|tarjeta|cr[eé]dito|d[eé]bito|efectivo|cambio|vuelto|redondeo|iva|saldo|puntaje|moneda|rut|consumo final|e-?ticket|cajer[oa]|caja)\b/i;
/** Descuento que corresponde al producto de arriba */
const DISCOUNT_RE = /\b(desc(uento)?|dto|ahorro|bonif(icaci[oó]n)?|promo(ci[oó]n)?|rebaja|cup[oó]n|oferta)\b/i;

/** Líneas que no son productos de la casa */
const IGNORE_RE = /\b(bolsas?|bolsones?)\b/i;

/** Abreviaturas habituales de los tickets → texto legible */
const ABBREVIATIONS: [RegExp, string][] = [
  [/^OF\.\s*/i, ''],
  [/\bGALL\./gi, 'Galletitas '],
  [/\bDESOD\./gi, 'Desodorante '],
  [/\bS\/G(LUTEN)?\b/gi, 'sin gluten'],
  [/\bS\/FRIO\b/gi, ''],
  [/\bC\/MENUDOS?\b/gi, 'con menudos'],
  [/\bS\/MENUDOS?\b/gi, 'sin menudos'],
  [/\bS\//gi, 'sin '],
  [/\bC\//gi, 'con '],
  [/\bCARNICERIA OFERTA\b/gi, ''],
  [/\bUNT\./gi, 'untable '],
  [/\bBALS\./gi, 'balsámico '],
  [/\bD\.?P\.?$/i, ''],
  [/^E\.\s+/i, ''],
];

/** "1.410,48" → 1410.48 ; "9,686" → 9.686 */
export function parseNumber(s: string): number {
  const t = s.trim();
  if (/,\d{1,3}$/.test(t)) return Number(t.replace(/\./g, '').replace(',', '.'));
  return Number(t.replace(/,/g, ''));
}

export function cleanDescription(desc: string): string {
  let s = desc;
  for (const [re, rep] of ABBREVIATIONS) s = s.replace(re, rep);
  s = s.replace(/\s+/g, ' ').trim().toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "1LT X 4", "X3 300G", "X 26" → unidades por paquete */
export function packSizeOf(desc: string): number {
  const m = /\bX\s?(\d{1,3})\b(?!\s?(?:GR|G|KG|ML|L|LT|LTS|CC)\b)/i.exec(desc);
  const n = m ? Number(m[1]) : 1;
  return n >= 2 && n <= 200 ? n : 1;
}

const STORES: [RegExp, string][] = [
  [/macromercado/, 'macromercado'],
  [/tienda inglesa/, 'tienda-inglesa'],
  [/\bdisco\b/, 'disco'],
  [/\bdevoto\b/, 'devoto'],
  [/\bg[eé]ant\b/, 'geant'],
  [/\bta-?ta\b/, 'tata'],
  [/\bel dorado\b/, 'el-dorado'],
  [/multi ?ahorro/, 'multi-ahorro'],
  [/\bkinko\b/, 'kinko'],
];

/**
 * El súper del ticket: la marca que aparece primero (el logo va arriba; un ticket de Devoto o Géant puede decir
 * «Supermercados Disco del Uruguay S.A.» más abajo, en la razón social).
 */
function detectStore(text: string): string | null {
  const t = text.toLowerCase();
  let best: { at: number; key: string } | null = null;
  for (const [re, key] of STORES) {
    const at = t.search(re);
    if (at >= 0 && (!best || at < best.at)) best = { at, key };
  }
  return best?.key ?? null;
}

function detectDate(text: string): string | null {
  const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(text);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/** Una línea de producto armada a partir de sus partes */
function makeLine(raw: string, code: string | undefined, description: string, quantity: number, unitPrice: number, amount: number, unit?: string): ReceiptLine {
  const weighed = unit ? /^(k|g|l)/i.test(unit) : !Number.isInteger(quantity);
  const packSize = packSizeOf(description);
  return {
    raw,
    storeCode: code ?? null,
    description: description.trim(),
    clean: cleanDescription(description),
    quantity,
    weighed,
    packSize,
    units: weighed ? 1 : Math.max(1, Math.round(quantity)) * packSize,
    unitPrice,
    amount,
    promo: /^OF\./i.test(description.trim()),
  };
}

/** ¿Cantidad × precio da el monto? (con tolerancia por redondeo) */
const consistent = (qty: number, price: number, amount: number) =>
  qty > 0 && price > 0 && Math.abs(qty * price - amount) <= Math.max(0.02, Math.abs(amount) * 0.02);

/** Un renglón que puede ser la descripción de un producto (sin monto) */
const isNameOnly = (line: string) => /[A-Za-zÁÉÍÓÚÑáéíóúñ]{3}/.test(line) && !NOT_ITEM_RE.test(line) && !QTY_LINE_RE.test(line) && !/\d[.,]\d{2}\s*$/.test(line);

const LONE_AMOUNT_RE = new RegExp(String.raw`^\$?\s*${AMOUNT}\s*[A-Z]?$`);

/**
 * El OCR a veces deja el monto solo en un renglón («AGUJA SIN HUESO» / «422.36» / «1.324 KG x 319.00»): se pega al
 * renglón de arriba si es una descripción, o al de cantidad si le falta el monto.
 */
function joinLoneAmounts(rows: string[]): string[] {
  const out: string[] = [];
  for (const row of rows) {
    const prev = out[out.length - 1];
    if (prev != null && LONE_AMOUNT_RE.test(row)) {
      const q = QTY_LINE_RE.exec(prev);
      if (isNameOnly(prev) || (q && !q[4])) {
        out[out.length - 1] = `${prev} ${row}`;
        continue;
      }
    }
    out.push(row);
  }
  return out;
}

export function parseReceiptText(text: string): ParsedReceipt {
  const lines: ReceiptLine[] = [];
  const ignored: string[] = [];
  let total: number | null = null;
  let rounding = 0;
  let bagsSum = 0;
  const rows = joinLoneAmounts(text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean));
  const used = new Set<number>();
  /** En qué renglón empieza cada producto (para dejarlos en el orden del ticket) */
  const at = new Map<ReceiptLine, number>();

  const add = (line: ReceiptLine, row: number) => {
    if (IGNORE_RE.test(line.description)) {
      ignored.push(line.description);
      bagsSum += line.amount; // las bolsas también suman al total
      return;
    }
    lines.push(line);
    at.set(line, row);
  };

  /** Formato en dos renglones: la descripción con el monto (o sin él) y el renglón de cantidad, en cualquier orden */
  const pairAt = (i: number, strict: boolean): boolean => {
    const q = QTY_LINE_RE.exec(rows[i]);
    if (!q) return false;
    const [, qtyS, unit, priceS, amountInQty] = q;
    const qty = parseNumber(qtyS);
    const price = parseNumber(priceS);
    // Primero el renglón de arriba (el formato habitual), después el de abajo
    for (const j of [i - 1, i + 1]) {
      if (j < 0 || j >= rows.length || used.has(j)) continue;
      const n = NAME_AMOUNT_RE.exec(rows[j]);
      if (n && !NOT_ITEM_RE.test(n[2]) && !QTY_LINE_RE.test(rows[j])) {
        const amount = parseNumber(n[3]);
        if (strict && !consistent(qty, price, amount)) continue;
        if (amount < 0) continue;
        add(makeLine(`${rows[Math.min(i, j)]} / ${rows[Math.max(i, j)]}`, n[1], n[2], qty, price, amount, unit), Math.min(i, j));
        used.add(i).add(j);
        return true;
      }
      // El monto quedó pegado al renglón de cantidad (foto curvada) y arriba solo la descripción
      if (amountInQty && j === i - 1 && isNameOnly(rows[j])) {
        const amount = parseNumber(amountInQty);
        if (strict && !consistent(qty, price, amount)) continue;
        const code = /^(\d{4,13})\s+/.exec(rows[j])?.[1];
        add(makeLine(`${rows[j]} / ${rows[i]}`, code, code ? rows[j].slice(code.length).trim() : rows[j], qty, price, amount, unit), j);
        used.add(i).add(j);
        return true;
      }
    }
    return false;
  };

  // 1) Total, redondeo, el formato en un renglón y el que el OCR dejó todo junto
  let mainTotal: number | null = null;
  rows.forEach((line, i) => {
    const totalMatch = /TOTAL(?: DE COMPRA)?\s*:?\s*\$?\s*([\d.,]+)\s*$/i.exec(line);
    if (totalMatch && !/sub\s*total/i.test(line)) {
      // El renglón que empieza con «TOTAL» es el de la compra (abajo vienen «Pago total», etc.); si no hay, el último
      if (/^TOTAL\b/i.test(line) && mainTotal == null) mainTotal = parseNumber(totalMatch[1]);
      total = parseNumber(totalMatch[1]);
      used.add(i);
      return;
    }
    const roundMatch = /^Redondeo\s+(-?[\d.,]+)/i.exec(line);
    if (roundMatch) {
      rounding = parseNumber(roundMatch[1]);
      used.add(i);
      return;
    }
    const m = LINE_RE.exec(line);
    if (m) {
      const [, code, description, qtyS, priceS, amountS] = m;
      add(makeLine(line, code, description, parseNumber(qtyS), parseNumber(priceS), parseNumber(amountS)), i);
      used.add(i);
      return;
    }
    const merged = MERGED_RE.exec(line);
    if (merged && !NOT_ITEM_RE.test(merged[2])) {
      const [, code, description, qtyS, unit, priceS, amountS] = merged;
      const qty = parseNumber(qtyS);
      const price = parseNumber(priceS);
      const amount = parseNumber(amountS);
      if (consistent(qty, price, amount)) {
        add(makeLine(line, code, description, qty, price, amount, unit), i);
        used.add(i);
      }
    }
  });

  // 2) Dos renglones: primero los pares que cierran (cantidad × precio = monto), después los que el OCR leyó mal
  for (const strict of [true, false]) {
    rows.forEach((_, i) => {
      if (!used.has(i)) pairAt(i, strict);
    });
  }

  // 3) Descuentos («DESC. TARJETA -12,00»): se restan del producto de arriba
  rows.forEach((line, i) => {
    if (used.has(i)) return;
    const n = NAME_AMOUNT_RE.exec(line);
    // «DESC. TARJETA» es un descuento; el pago con tarjeta es positivo y no llega acá
    if (!n || !DISCOUNT_RE.test(n[2]) || /\b(sub\s*total|total|redondeo)\b/i.test(n[2])) return;
    const amount = parseNumber(n[3]);
    if (!(amount < 0)) return;
    let item: ReceiptLine | null = null;
    for (const l of lines) if (at.get(l)! < i && (!item || at.get(l)! > at.get(item)!)) item = l;
    if (!item) return;
    item.amount = Math.round((item.amount + amount) * 100) / 100;
    item.promo = true;
    used.add(i);
  });

  if (mainTotal != null) total = mainTotal;
  lines.sort((a, b) => at.get(a)! - at.get(b)!);
  const sum = lines.reduce((a, l) => a + l.amount, 0);
  const difference = total == null ? null : Math.round((sum + bagsSum + rounding - total) * 100) / 100;

  return { store: detectStore(text), date: detectDate(text), lines, ignored, total, difference };
}

/** Clave de alias por código interno del súper (ya normalizada): "macromercado 168953" */
export function storeCodeKey(store: string | null, code: string | null): string | null {
  return store && code ? normalizeAlias(`${store} ${code}`) : null;
}

/** Palabras que en los tickets suelen ir antes del producto y no lo describen (marcas propias, etc.) */
const LEADING_NOISE = new Set(['cefa', 'prodal', 'e', 'of', 'carniceria', 'oferta']);

/**
 * Propone el producto del hogar para una línea de ticket.
 * 1. Alias por código del súper (lo más seguro).  2. Alias por texto.
 * 3. Parecido con el nombre, pero solo si coincide con las primeras palabras de la
 *    línea: en "Galletitas el trigal con leche" la leche es un sabor, no el producto.
 */
export function matchReceiptLine(
  line: ReceiptLine,
  store: string | null,
  aliases: Alias[],
  products: Candidate[],
): Match | null {
  const key = storeCodeKey(store, line.storeCode);
  if (key) {
    const byCode = aliases.find((a) => a.kind === 'receipt' && a.normalized === key);
    if (byCode) return { product_id: byCode.product_id, score: 1, via: 'alias' };
  }
  const norm = normalizeAlias(line.description);
  const byText = aliases.find((a) => a.kind === 'receipt' && a.normalized === norm);
  if (byText) return { product_id: byText.product_id, score: 1, via: 'alias' };

  const head = normalizeAlias(line.clean)
    .split(' ')
    .filter((t) => t.length > 1 && !/^\d/.test(t) && !LEADING_NOISE.has(t))
    .slice(0, 2)
    .join(' ');
  if (!head) return null;
  let best: Match | null = null;
  for (const p of products) {
    const score = similarity(head, p.name);
    if (score >= 0.6 && (!best || score > best.score)) best = { product_id: p.id, score, via: 'name' };
  }
  return best;
}

/**
 * Nombre de producto a partir de una línea ya legible:
 * «Cefa pasas de uva sultaninas 500 grs.» → «Cefa pasas de uva sultaninas».
 */
export function productNameFromLine(clean: string): string {
  const s = clean
    .replace(/\b\d+([.,]\d+)?\s*(k|kg|kgs|g|gr|grs|ml|cc|l|lt|lts|u|un|uds|unid)\b\.?(\s*\+\s*\d+\s*(k|kg|g|gr|grs)\b\.?)?/gi, '')
    .replace(/\bx\s?\d+\b/gi, '')
    .replace(/\s+(gratis|dp|d\.p\.?|c\/e|ce)\b\.?/gi, '')
    .replace(/[+.,]+(\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const out = s || clean.trim();
  return out.charAt(0).toUpperCase() + out.slice(1);
}

export interface ReviewLine {
  key: string;            // id estable de la línea en la revisión
  line: ReceiptLine;
  productId: string | null; // producto del hogar propuesto (o elegido)
  via: 'alias' | 'name' | 'user' | null;
  newName: string;        // nombre si se crea un producto nuevo
  include: boolean;
}

/** Arma la propuesta de la pantalla de revisión. */
export function buildReview(
  parsed: ParsedReceipt,
  aliases: Alias[],
  products: Candidate[],
): ReviewLine[] {
  return parsed.lines.map((line, i) => {
    const m = matchReceiptLine(line, parsed.store, aliases, products);
    return {
      key: `${i}-${line.storeCode ?? ''}`,
      line,
      productId: m?.product_id ?? null,
      via: m?.via ?? null,
      newName: productNameFromLine(line.clean),
      include: true,
    };
  });
}

export interface ReceiptPlan {
  /** Producto existente → unidades compradas (las líneas del mismo producto se suman) */
  existing: Map<string, number>;
  /** Productos nuevos a crear: nombre → unidades */
  created: Map<string, { units: number; lines: ReceiptLine[] }>;
  /** Equivalencias a aprender: texto/código → producto (o nombre nuevo) */
  learn: { text: string; productId: string | null; newName: string | null }[];
}

export function planReceipt(review: ReviewLine[], store: string | null): ReceiptPlan {
  const existing = new Map<string, number>();
  const created = new Map<string, { units: number; lines: ReceiptLine[] }>();
  const learn: ReceiptPlan['learn'] = [];
  for (const r of review) {
    if (!r.include) continue;
    const units = r.line.units;
    const target = r.productId;
    if (target) existing.set(target, (existing.get(target) ?? 0) + units);
    else {
      const name = r.newName.trim() || productNameFromLine(r.line.clean);
      const c = created.get(name) ?? { units: 0, lines: [] };
      c.units += units;
      c.lines.push(r.line);
      created.set(name, c);
    }
    const key = storeCodeKey(store, r.line.storeCode);
    const newName = target ? null : r.newName.trim() || productNameFromLine(r.line.clean);
    if (key) learn.push({ text: key, productId: target, newName });
    learn.push({ text: r.line.description, productId: target, newName });
  }
  return { existing, created, learn };
}
