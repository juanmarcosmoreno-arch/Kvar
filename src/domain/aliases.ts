/**
 * Equivalencias aprendidas: texto de ticket, código de barras o frase de voz → producto.
 * En Fase 1 solo se usa para buscar productos por nombre; las Fases 2–3 guardan
 * los alias en la tabla product_aliases usando `normalizeAlias` como clave.
 */
import { compareText } from '../i18n';

export type AliasKind = 'barcode' | 'receipt' | 'voice' | 'photo' | 'email';

export interface Alias {
  kind: AliasKind;
  normalized: string;
  alias: string;
  product_id: string;
  hits: number;
}

export interface Candidate {
  id: string;
  name: string;
}

export interface Match {
  product_id: string;
  score: number; // 0..1
  via: 'alias' | 'name';
}

const UNIT_PATTERNS: [RegExp, string][] = [
  [/(\d+(?:[.,]\d+)?)\s*(?:lts?|litros?|l)\b/g, '$1l'],
  [/(\d+(?:[.,]\d+)?)\s*(?:ml|cc)\b/g, '$1ml'],
  [/(\d+(?:[.,]\d+)?)\s*(?:kgs?|kilos?|k)\b/g, '$1kg'],
  [/(\d+(?:[.,]\d+)?)\s*(?:grs?|gramos?|g)\b/g, '$1g'],
  [/(\d+(?:[.,]\d+)?)\s*(?:u|un|unid|unidades?)\b/g, '$1u'],
];

/** Minúsculas, sin tildes, sin puntuación, unidades unificadas ("1 LT" → "1l"). */
export function normalizeAlias(text: string): string {
  let s = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ñ/g, 'n')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/[^\p{L}\p{N}\p{M}.\s]/gu, ' ')
    .replace(/\.(?!\d)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (const [re, rep] of UNIT_PATTERNS) s = s.replace(re, rep);
  return s.replace(/\s+/g, ' ').trim();
}

/** Los códigos de barras se comparan solo por dígitos (EAN-13 = UPC-A con 0 adelante). */
export function normalizeBarcode(code: string): string {
  const digits = code.replace(/\D/g, '');
  return digits.length === 12 ? `0${digits}` : digits;
}

function aliasKey(kind: AliasKind, text: string): string {
  return kind === 'barcode' ? normalizeBarcode(text) : normalizeAlias(text);
}

const STOPWORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'con', 'y', 'en', 'x', 'un', 'una']);

function tokens(s: string): string[] {
  return normalizeAlias(s)
    .split(' ')
    .filter((t) => t && !STOPWORDS.has(t) && !/^\d/.test(t));
}

/** Coincidencia entre tokens tolerante a abreviaturas de ticket ("ent" ~ "entera"). */
function tokenScore(a: string, b: string): number {
  if (a === b) return 1;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (short.length >= 3 && long.startsWith(short)) return 0.8;
  if (short.length >= 4 && singular(short) === singular(long)) return 0.95;
  return 0;
}

function singular(t: string): string {
  if (t.endsWith('es') && t.length > 4) return t.slice(0, -2);
  if (t.endsWith('s') && t.length > 3) return t.slice(0, -1);
  return t;
}

/** Similitud 0..1 entre un texto y el nombre de un producto. */
export function similarity(text: string, name: string): number {
  const ta = tokens(text);
  const tb = tokens(name);
  if (!ta.length || !tb.length) return 0;
  // Cada token del nombre del producto busca su mejor pareja en el texto
  let sum = 0;
  for (const b of tb) sum += Math.max(...ta.map((a) => tokenScore(a, b)));
  const coverage = sum / tb.length;
  // Penaliza levemente textos con muchas palabras sin relación
  const matchedInText = ta.filter((a) => tb.some((b) => tokenScore(a, b) > 0)).length;
  const precision = matchedInText / ta.length;
  return Math.round((coverage * 0.8 + precision * 0.2) * 1000) / 1000;
}

/**
 * Busca a qué producto corresponde un texto.
 * 1. Alias aprendido exacto (prioridad absoluta).
 * 2. Parecido con nombres de productos, si supera el umbral.
 */
export function resolveAlias(
  kind: AliasKind,
  text: string,
  aliases: Alias[],
  products: Candidate[],
  threshold = 0.6,
): Match | null {
  const key = aliasKey(kind, text);
  const learned = aliases
    .filter((a) => a.kind === kind && a.normalized === key)
    .sort((a, b) => b.hits - a.hits)[0];
  if (learned) return { product_id: learned.product_id, score: 1, via: 'alias' };
  if (kind === 'barcode') return null;

  let best: Match | null = null;
  for (const p of products) {
    const score = similarity(text, p.name);
    if (score >= threshold && (!best || score > best.score)) {
      best = { product_id: p.id, score, via: 'name' };
    }
  }
  return best;
}

/**
 * Registra la equivalencia que confirmó el usuario.
 * Si ya existía para otro producto, la corrección del usuario gana.
 */
export function learnAlias(aliases: Alias[], kind: AliasKind, text: string, productId: string): Alias[] {
  const normalized = aliasKey(kind, text);
  const existing = aliases.find((a) => a.kind === kind && a.normalized === normalized);
  if (!existing) {
    return [...aliases, { kind, normalized, alias: text, product_id: productId, hits: 1 }];
  }
  return aliases.map((a) =>
    a === existing
      ? a.product_id === productId
        ? { ...a, hits: a.hits + 1 }
        : { ...a, product_id: productId, alias: text, hits: 1 }
      : a,
  );
}

/** Búsqueda para la barra de Inicio/Inventario: tolera tildes y prefijos. */
export function searchProducts<T extends Candidate>(query: string, products: T[]): T[] {
  const q = normalizeAlias(query);
  if (!q) return [];
  const scored = products
    .map((p) => {
      const n = normalizeAlias(p.name);
      let score = 0;
      if (n === q) score = 3;
      else if (n.startsWith(q)) score = 2;
      else if (n.split(' ').some((w) => w.startsWith(q))) score = 1.5;
      else if (n.includes(q)) score = 1;
      else score = similarity(query, p.name) >= 0.6 ? 0.5 : 0;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || compareText(a.p.name, b.p.name));
  return scored.map((x) => x.p);
}
