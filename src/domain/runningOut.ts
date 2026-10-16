/**
 * «Se termina pronto»: lo que, al ritmo de siempre, se va a terminar en los próximos días, para anotarlo en la
 * lista antes de quedarse sin. Sale del historial (ver stats.ts: productStats.nextOutAt).
 */
import { householdStats, type StockEvent } from './stats';
import type { Product, ShoppingItem } from './types';

const DAY = 86_400_000;

export interface RunningOut {
  product: Product;
  /** Cuándo se terminaría */
  at: string;
  /** Días que faltan (0 = hoy; negativo = ya debería haberse terminado) */
  days: number;
}

/**
 * Lo que se termina en los próximos `withinDays` días y todavía no está en la lista (ni marcado como
 * «Queda poco» o «No hay»: eso ya se ve). Lo que «ya debería haberse terminado» hace más de una semana se
 * descarta (la predicción quedó vieja). `snoozed`: product_id → hasta cuándo no preguntar («Todavía hay»).
 */
export function runningOutSoon(
  events: StockEvent[],
  products: Product[],
  list: ShoppingItem[],
  opts: { now?: Date; withinDays?: number; snoozed?: Record<string, string> } = {},
): RunningOut[] {
  const now = opts.now ?? new Date();
  const within = opts.withinDays ?? 5;
  const onList = new Set(list.filter((i) => !i.checked_at && i.product_id).map((i) => i.product_id));
  const { soon } = householdStats(events, products, { now, months: 6, soonDays: within });
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return soon
    .filter(({ product }) => product.status === 'ok' && !onList.has(product.id))
    .filter(({ product }) => {
      const until = opts.snoozed?.[product.id];
      return !until || Date.parse(until) <= now.getTime();
    })
    .map(({ product, at }) => {
      const d = new Date(at);
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      return { product, at, days: Math.round((day - today) / DAY) };
    })
    .filter((r) => r.days >= -7);
}
