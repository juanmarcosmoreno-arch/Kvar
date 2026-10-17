/** Precios de los tickets + ajustes del comparador, listos para las pantallas. */
import { useMemo } from 'react';
import { storesWithPrices, visibleLines, type StoreDiscount } from '../domain/prices';
import { KNOWN_STORES, storeKey, type PurchaseLine } from '../domain/spending';
import { locale } from '../i18n';
import { usePricePrefs, type PricePrefs } from './pricePrefs';
import { usePurchases } from './stats';

export interface PriceData {
  status: 'loading' | 'ready' | 'error';
  /** Líneas de tickets sin los súper que no se comparan */
  lines: PurchaseLine[];
  /** Todas las líneas (para contar precios por súper) */
  all: PurchaseLine[];
  prefs: PricePrefs;
  /** Súper que se comparan (con precios o agregados a mano), para elegir */
  stores: string[];
  /** Todos los súper conocidos (para Ajustes): los de siempre, los de los tickets y los agregados */
  allStores: string[];
  discounts: StoreDiscount[];
}

export function usePriceData(householdId: string): PriceData {
  const data = usePurchases(householdId);
  const prefs = usePricePrefs();
  return useMemo(() => {
    const all = data.status === 'ready' ? data.lines : [];
    const hidden = new Set(prefs.hidden);
    const seen = storesWithPrices(all);
    const stores = [...new Set([...seen, ...prefs.extra])].filter((s) => !hidden.has(s));
    const allStores = [...new Set([...seen, ...prefs.extra, ...Object.keys(KNOWN_STORES)])];
    return {
      status: data.status,
      lines: visibleLines(all, hidden),
      all,
      prefs,
      stores,
      allStores,
      discounts: prefs.discounts.filter((d) => !hidden.has(d.store)),
    };
  }, [data, prefs]);
}

/** Cuántos precios (últimos 6 meses) hay de cada súper */
export function pricesPerStore(lines: PurchaseLine[]): Map<string, number> {
  const since = Date.now() - 183 * 86_400_000;
  const out = new Map<string, number>();
  for (const l of lines) {
    const key = storeKey(l.store);
    if (key && l.product_id && Date.parse(l.bought_at) >= since) out.set(key, (out.get(key) ?? 0) + 1);
  }
  return out;
}

/** «mar», «martes» (0 = domingo) en el idioma de la app */
export function weekdayName(day: number, style: 'short' | 'long' = 'short'): string {
  // 7 de enero de 2024 fue domingo
  return new Date(2024, 0, 7 + day).toLocaleDateString(locale, { weekday: style });
}

/** Días de la semana empezando por el lunes */
export const WEEK = [1, 2, 3, 4, 5, 6, 0];
