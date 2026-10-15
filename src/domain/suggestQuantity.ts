/**
 * Cuánto llevar de cada cosa de la lista, según lo que consume la casa:
 *  - con conteo (huevos, pañales): lo que se suele comprar de una vez, y lo que hace falta para ~2 semanas
 *  - sin conteo: lo que se suele llevar en el ticket (2 paquetes de café)
 */
import type { PurchaseLine } from './spending';
import { classify, type StockEvent } from './stats';
import type { Product } from './types';

const DAY = 86_400_000;

export function suggestedQuantities(
  products: Product[],
  events: StockEvent[],
  purchases: PurchaseLine[],
  now = Date.now(),
  coverDays = 14,
): Map<string, number> {
  const out = new Map<string, number>();
  const since = now - 183 * DAY;
  const byProduct = new Map<string, StockEvent[]>();
  for (const e of events) {
    if (!e.product_id || Date.parse(e.at) < since) continue;
    byProduct.set(e.product_id, [...(byProduct.get(e.product_id) ?? []), e]);
  }
  const lines = new Map<string, PurchaseLine[]>();
  for (const l of purchases) {
    if (!l.product_id || Date.parse(l.bought_at) < since) continue;
    lines.set(l.product_id, [...(lines.get(l.product_id) ?? []), l]);
  }

  for (const p of products) {
    const evs = byProduct.get(p.id) ?? [];
    if (p.track_quantity) {
      const packs = evs.map(classify).filter((c) => c.bought && c.boughtUnits > 1).map((c) => c.boughtUnits);
      const pack = packs.length ? Math.round(median(packs)) : 0;
      const recent = evs.filter((e) => Date.parse(e.at) >= now - 60 * DAY);
      const used = recent.reduce((a, e) => a + classify(e).used, 0);
      const perDay = used / 60;
      const need = Math.ceil(perDay * coverDays - Math.max(0, p.quantity ?? 0));
      let n = pack;
      if (need > 0) n = pack > 1 ? Math.max(pack, Math.ceil(need / pack) * pack) : need;
      if (n >= 2) out.set(p.id, n);
    } else {
      const qs = (lines.get(p.id) ?? []).filter((l) => l.quantity >= 1 && Number.isInteger(l.quantity)).map((l) => l.quantity);
      if (qs.length >= 2) {
        const n = Math.round(median(qs));
        if (n >= 2) out.set(p.id, n);
      }
    }
  }
  return out;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
