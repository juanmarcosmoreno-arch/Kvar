/**
 * Cuánto sale una receta, más o menos: cada ingrediente con el precio de hoy (precios.uy) o el último de tus
 * tickets, en proporción a lo que usa la receta (400 g de un paquete de 1 kg, 2 huevos de una caja de 6).
 * Es una estimación: lo que no tiene precio o no se puede convertir queda afuera y se avisa.
 */
import { packSizeOf } from './receipt';
import { isBasic, kitchenRound, kitchenUnit, type IngredientLine } from './recipes';
import type { PurchaseLine } from './spending';

/** Un precio y de qué tamaño es el envase (en g/ml, o en unidades) */
export interface PriceRef {
  price: number;
  /** Gramos o mililitros del envase (null si no se sabe) */
  grams: number | null;
  /** Unidades del envase (6 huevos, 3 hamburguesas; null si no se sabe) */
  count: number | null;
}

/** «Arroz blanco - Vidarroz, 1.0» (kilo), «Aceite…, 900.0» (ml), «Huevos colorados…, 6.0» (unidades) */
export function sizeOfSipc(name: string): Omit<PriceRef, 'price'> {
  const m = /,\s*(?:[A-Za-zÁÉÍÓÚáéíóúñ]+\s*)?([\d.]+)\s*$/.exec(name);
  const n = m ? Number(m[1]) : NaN;
  if (!(n > 0)) return { grams: null, count: null };
  // Los tamaños grandes son gramos o mililitros; los chicos, kilos o litros (o unidades: lo decide el ingrediente)
  return n >= 30 ? { grams: n, count: null } : { grams: n * 1000, count: n };
}

/** «AZUCAR BELLA UNION 1 KG», «ACEITE OPTIMO 900ML», «HUEVOS X 12» → tamaño del envase */
export function sizeOfTicket(name: string): Omit<PriceRef, 'price'> {
  const m = /(\d+(?:[.,]\d+)?)\s*(KGS?|K|GRS?|G|LTS?|L|ML|CC)\b/i.exec(name);
  const pack = packSizeOf(name);
  let grams: number | null = null;
  if (m) {
    const n = Number(m[1].replace(',', '.'));
    const unit = m[2].toUpperCase();
    grams = /^K|^L/.test(unit) ? n * 1000 : n;
    if (pack > 1) grams *= pack;
  }
  return { grams, count: pack > 1 ? pack : null };
}

/** Peso aproximado de una unidad, para lo que se vende por kilo (2 tomates, 1 cebolla) */
const UNIT_GRAMS: [RegExp, number][] = [
  [/^tomate/, 150], [/^cebolla/, 150], [/^papa/, 200], [/^boniato/, 250], [/^zanahoria/, 100], [/^morr[oó]n/, 180],
  [/^manzana/, 180], [/^banana/, 150], [/^naranja/, 200], [/^lim[oó]n/, 100], [/^pera/, 180], [/^zapallito|^zucchini/, 200],
  [/^zapallo/, 1200], [/^lechuga/, 300], [/^pepino/, 250], [/^berenjena/, 300], [/^choclo/, 250], [/^pollo entero/, 2000],
];

const SPOON_ML: Record<string, number> = { taza: 240, cda: 15, cdita: 5 };
const MASS_FACTOR: Record<string, number> = { g: 1, kg: 1000, ml: 1, l: 1000, dl: 100 };

/** Lo que cuesta la parte de un envase que usa un ingrediente (null si no se puede calcular) */
export function ingredientCost(name: string, quantity: number, unit: string | null, ref: PriceRef): number | null {
  const u = kitchenUnit(unit ?? 'u');
  const kind = u?.kind ?? 'count';
  if (kind === 'mass' || kind === 'volume' || kind === 'spoon') {
    const grams = quantity * (kind === 'spoon' ? SPOON_ML[u!.key] ?? 15 : MASS_FACTOR[u!.key] ?? 1);
    return ref.grams ? (ref.price * grams) / ref.grams : null;
  }
  if (kind === 'container' || kind === 'pack') return ref.price * quantity;
  if (kind === 'count') {
    if (ref.count && ref.count > 1) return (ref.price * quantity) / ref.count;
    // Se vende por kilo: unidades de tamaño conocido
    const lower = name.toLowerCase();
    const each = UNIT_GRAMS.find(([re]) => re.test(lower))?.[1];
    if (each && ref.grams) return (ref.price * quantity * each) / ref.grams;
    return null;
  }
  // Dientes, fetas: muy poco, no se calcula
  return null;
}

export interface RecipeCost {
  total: number;
  /** Ingredientes con precio */
  priced: number;
  /** Los que no se pudieron calcular (sin contar sal, agua, «a gusto») */
  missing: string[];
}

/**
 * Costo aproximado de la receta (ya escalada). `priceFor` da el precio de cada ingrediente: el de su producto del
 * hogar o el que corresponda en precios.uy.
 */
export function recipeCost(lines: IngredientLine[], factor: number, priceFor: (line: IngredientLine) => PriceRef | null): RecipeCost {
  let total = 0;
  let priced = 0;
  const missing: string[] = [];
  for (const line of lines) {
    const ing = line.ingredient;
    if (ing.quantity == null || ing.optional) continue; // «a gusto», opcionales
    if (isBasic(ing.name) && !line.product) continue; // sal, agua, pimienta
    const scaled = kitchenRound(ing.quantity * factor, ing.unit ?? 'u', ing.name);
    const ref = priceFor(line);
    const cost = ref ? ingredientCost(ing.name, scaled.quantity, scaled.unit, ref) : null;
    if (cost != null && cost > 0) {
      total += cost;
      priced++;
    } else if (!isBasic(ing.name)) {
      missing.push(ing.name);
    }
  }
  return { total, priced, missing };
}

/** El último precio de un producto en tus tickets, con el tamaño que dice el ticket */
export function ticketRef(lines: PurchaseLine[], productId: string): PriceRef | null {
  let last: PurchaseLine | null = null;
  for (const l of lines) if (l.product_id === productId && (!last || l.bought_at > last.bought_at)) last = l;
  if (!last) return null;
  const price = last.unit_price ?? (last.quantity > 0 ? last.total / last.quantity : last.total);
  return price > 0 ? { price, ...sizeOfTicket(last.name) } : null;
}

