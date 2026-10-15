/**
 * Lectura de tickets de supermercado (Fase 3).
 * El OCR (Vision de Apple en iPhone, o la IA en la nube) entrega texto; acá se arman
 * las líneas sin IA, con reglas, y se proponen los productos del hogar.
 * Formato típico uruguayo (e-Ticket): CÓDIGO DESCRIPCIÓN CANTIDAD PRECIO MONTO[IVA]
 *   168953 LECHE CLADY ULTRA ENTERA S/FRIO 1LT X 4 2,000 185,07 370,14E
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

function detectStore(text: string): string | null {
  const t = text.toLowerCase();
  if (t.includes('macromercado')) return 'macromercado';
  if (t.includes('tienda inglesa')) return 'tienda-inglesa';
  if (t.includes('disco')) return 'disco';
  if (t.includes('devoto')) return 'devoto';
  if (t.includes('geant') || t.includes('géant')) return 'geant';
  if (t.includes('ta-ta') || t.includes('tata')) return 'tata';
  if (t.includes('el dorado')) return 'el-dorado';
  return null;
}

function detectDate(text: string): string | null {
  const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(text);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

export function parseReceiptText(text: string): ParsedReceipt {
  const lines: ReceiptLine[] = [];
  const ignored: string[] = [];
  let total: number | null = null;
  let rounding = 0;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const totalMatch = /TOTAL(?: DE COMPRA)?\s*:?\s*\$?\s*([\d.,]+)\s*$/i.exec(line);
    if (totalMatch) {
      total = parseNumber(totalMatch[1]);
      continue;
    }
    const roundMatch = /^Redondeo\s+(-?[\d.,]+)/i.exec(line);
    if (roundMatch) {
      rounding = parseNumber(roundMatch[1]);
      continue;
    }
    const m = LINE_RE.exec(line);
    if (!m) continue;
    const [, code, description, qtyS, priceS, amountS] = m;
    if (IGNORE_RE.test(description)) {
      ignored.push(description);
      continue;
    }
    const quantity = parseNumber(qtyS);
    const weighed = !Number.isInteger(quantity);
    const packSize = packSizeOf(description);
    lines.push({
      raw: line,
      storeCode: code ?? null,
      description: description.trim(),
      clean: cleanDescription(description),
      quantity,
      weighed,
      packSize,
      units: weighed ? 1 : Math.round(quantity) * packSize,
      unitPrice: parseNumber(priceS),
      amount: parseNumber(amountS),
      promo: /^OF\./i.test(description.trim()),
    });
  }

  const sum = lines.reduce((a, l) => a + l.amount, 0);
  const bagsSum = text
    .split(/\r?\n/)
    .map((l) => LINE_RE.exec(l.trim()))
    .filter((m): m is RegExpExecArray => Boolean(m && IGNORE_RE.test(m[2])))
    .reduce((a, m) => a + parseNumber(m[5]), 0); // las bolsas también suman al total
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
