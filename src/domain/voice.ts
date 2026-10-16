/**
 * Voz: frase → acciones sobre el stock.
 * En el iPhone la interpreta Apple Intelligence (modelo en el dispositivo); si no está disponible,
 * se usan estas reglas, que también corren en el teléfono. En los dos casos el resultado se confirma.
 */
import { normalizeAlias, resolveAlias, searchProducts, type Alias, type Candidate } from './aliases';

export type VoiceKind = 'bought' | 'out' | 'low' | 'ask' | 'list';

export interface VoiceAction {
  kind: VoiceKind;
  product: string; // como lo dijo la persona («fideos»)
  quantity: number;
}

/** Lo que devuelve Apple Intelligence (en español) → tipo interno. */
export function kindFromModel(raw: string): VoiceKind | null {
  const k = normalizeAlias(raw).replace(/\s+/g, '_');
  if (/^compr|traj|bought/.test(k)) return 'bought';
  if (/termin|acab|^no_hay|out/.test(k)) return 'out';
  if (/poco|low/.test(k)) return 'low';
  if (/pregunt|hay|ask/.test(k)) return 'ask';
  if (/lista|agreg|list/.test(k)) return 'list';
  return null;
}

const NUMBERS: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, media: 6, 'media docena': 6, docena: 12,
};

const CONTAINERS =
  /^(paquetes?|botellas?|latas?|cajas?|bolsas?|frascos?|sachets?|kilos?|kg|litros?|potes?|rollos?|docenas?|unidades?|packs?|sobres?|tabletas?)\s+(de\s+)?/;

/** «dos paquetes de fideos» → { quantity: 2, product: «fideos» } */
export function splitQuantity(item: string): { quantity: number; product: string } {
  let s = normalizeAlias(item).replace(/^(el|la|los|las|un|una|unos|unas|de|del|mas|algo de)\s+/, '');
  let quantity = 1;
  const num = /^(\d+)\s+/.exec(s);
  const word = /^(media docena|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|docena)\s+/.exec(s);
  if (num) {
    quantity = Number(num[1]);
    s = s.slice(num[0].length);
  } else if (word) {
    quantity = NUMBERS[word[1]];
    s = s.slice(word[0].length);
  }
  s = s.replace(CONTAINERS, '').replace(/^(de|del)\s+/, '').trim();
  return { quantity: Math.max(1, quantity), product: s };
}

/** Minúsculas y sin tildes, pero conservando comas (separan productos). */
function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[¿?¡!.;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const VERBS: [string, VoiceKind][] = [
  ['compre|compramos|compro|compraron|traje|trajimos', 'bought'],
  ['se termino|se terminaron|se acabo|se acabaron|se gasto|se gastaron|gaste|gastamos|no hay mas|no queda|no quedan', 'out'],
  ['queda poco|quedan pocos|quedan pocas|se esta terminando|se estan terminando|casi no hay', 'low'],
  ['agrega|agregar|agregame|anota|anotame|pone|poneme|hay que comprar|faltan|falta', 'list'],
];
const VERB_RE = new RegExp(VERBS.map(([v]) => `\\b(${v})\\b`).join('|'), 'g');
const FILLER = /\b(a la lista|en la lista|para la lista|en casa|de nuevo|todavia|ya|tambien|ademas|despues|hoy)\b/g;

/** Reglas (sin IA) para cuando Apple Intelligence no está disponible. */
export function parseVoice(text: string): VoiceAction[] {
  // Cada oración por separado: «Queda poco café. ¿Hay arroz?» son dos cosas distintas
  const sentences = text.match(/[^.?!;]+[.?!;]*/g) ?? [];
  return sentences.flatMap((sentence) => parseSentence(sentence));
}

function parseSentence(sentence: string): VoiceAction[] {
  const question = /\?/.test(sentence) || /^\s*¿/.test(sentence);
  const t = fold(sentence);
  if (!t) return [];
  const matches = [...t.matchAll(VERB_RE)];
  const segments: { kind: VoiceKind; text: string }[] = [];

  if (!matches.length) {
    // Sin verbo: «¿Hay arroz?» / «¿Tenemos leche?»
    if (!question) return [];
    segments.push({ kind: 'ask', text: t.replace(/^(hay|tenemos|queda|quedan|nos queda|nos quedan)\b/, '') });
  } else {
    matches.forEach((m, i) => {
      const kind = VERBS[m.slice(1).findIndex((g) => g !== undefined)][1];
      const end = i + 1 < matches.length ? matches[i + 1].index! : t.length;
      let body = t.slice(m.index! + m[0].length, end);
      // Lo dicho antes del primer verbo («el aceite se terminó») va con ese verbo
      if (i === 0) body = `${t.slice(0, m.index)} , ${body}`;
      segments.push({ kind, text: body });
    });
  }

  const actions: VoiceAction[] = [];
  for (const seg of segments) {
    for (const part of seg.text.replace(FILLER, ' ').split(/,|\s+y\s+|\s+e\s+/)) {
      const { quantity, product } = splitQuantity(part);
      if (product && product.length > 1) actions.push({ kind: seg.kind, product, quantity });
    }
  }
  return actions;
}

export interface ResolvedVoiceAction extends VoiceAction {
  key: string;
  productId: string | null; // null = producto nuevo
  include: boolean;
}

/** Empareja cada producto dicho con los del hogar (alias aprendidos primero). */
export function resolveVoice(actions: VoiceAction[], aliases: Alias[], products: Candidate[]): ResolvedVoiceAction[] {
  return actions.map((a, i) => {
    const exact = products.find((p) => normalizeAlias(p.name) === normalizeAlias(a.product));
    const byAlias = exact ? null : resolveAlias('voice', a.product, aliases, products, 0.6);
    const bySearch = exact || byAlias ? null : searchProducts(a.product, products)[0];
    const productId = exact?.id ?? byAlias?.product_id ?? bySearch?.id ?? null;
    return { ...a, key: `${i}-${a.product}`, productId, include: a.kind !== 'ask' || productId !== null };
  });
}

/** Nombre prolijo para un producto nuevo dicho por voz: «yerba mate» → «Yerba mate». */
export function voiceProductName(product: string): string {
  const s = product.trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
