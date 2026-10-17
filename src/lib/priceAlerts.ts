/**
 * Alertas de precio: «avisame si la yerba Canarias baja de $ 250», «si está en oferta» o «si está más barata que lo
 * normal». Se guardan en este teléfono y se revisan cada vez que se traen los precios de hoy (al abrir la app).
 * Si se cumple, aparece arriba en Precios y, en el iPhone, llega un aviso (uno por día por alerta).
 */
import { LocalNotifications } from '@capacitor/local-notifications';
import { useSyncExternalStore } from 'react';
import { checkAlert, priceVerdict, type AlertHit, type PriceAlert } from '../domain/priceTools';
import { offers, type StoreDiscount } from '../domain/prices';
import { allItems, itemLabel, type SipcData } from '../domain/sipc';
import { storeLabel } from '../domain/spending';
import { m } from '../i18n';
import { formatCurrency } from './currency';
import { uuid } from './id';
import { alertPrefs } from './alerts';
import { isDemo } from './demo';
import { isNative } from './platform';
import { dayOf, historyOf } from './priceHistory';

const KEY = 'stoka:alertas-precio';
/** Fuera del rango de los avisos de stock (7000–7999) */
const NOTIFY_ID = 8000;

/** En la demo: unas alertas de ejemplo */
const DEMO: PriceAlert[] = [
  { id: 'demo-yerba', item: 'yerba mate comun canarias, 1.0', name: 'Yerba mate común Canarias, 1.0', kind: 'below', value: 250, created_at: '2026-10-01T12:00:00.000Z' },
  { id: 'demo-cafe', item: 'cafe envasado chana, 250.0', name: 'Café envasado Chaná, 250.0', kind: 'offer', value: null, created_at: '2026-10-01T12:00:00.000Z' },
  { id: 'demo-aceite', item: 'aceite de girasol - optimo, 900.0', name: 'Aceite de girasol - Óptimo, 900.0', kind: 'cheap', value: 10, created_at: '2026-10-01T12:00:00.000Z' },
];

function read(): PriceAlert[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PriceAlert[]) : isDemo ? DEMO : [];
  } catch {
    return [];
  }
}

let alerts: PriceAlert[] = read();
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

function save(next: PriceAlert[]) {
  alerts = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* sin almacenamiento */
  }
  listeners.forEach((l) => l());
}

export function usePriceAlerts(): PriceAlert[] {
  return useSyncExternalStore(subscribe, () => alerts);
}

export function addPriceAlert(a: Omit<PriceAlert, 'id' | 'created_at'>) {
  save([...alerts.filter((x) => !(x.item === a.item && x.kind === a.kind)), { ...a, id: uuid(), created_at: new Date().toISOString() }]);
}

export function deletePriceAlert(id: string) {
  save(alerts.filter((a) => a.id !== id));
}

/** Las alertas que se cumplen hoy */
export function alertHits(list: PriceAlert[], data: SipcData | null, discounts: StoreDiscount[]): AlertHit[] {
  if (!data || !list.length) return [];
  const items = new Map(allItems(data).map((x) => [x.key, x]));
  const weekday = new Date().getDay();
  const today = dayOf(data.at);
  const hits: AlertHit[] = [];
  for (const a of list) {
    const item = items.get(a.item);
    if (!item?.prices.length) continue;
    const best = offers(item.prices, discounts, weekday)[0];
    const now = { price: best.effective, store: best.store, offer: item.offers.size > 0 };
    const verdict = a.kind === 'cheap' ? priceVerdict(historyOf(a.item), best.price, today) : null;
    const hit = checkAlert(a, now, verdict);
    if (hit) hits.push(hit);
  }
  return hits;
}

/** El texto del aviso: «Yerba Canarias: $ 245 en Disco (tu alerta: menos de $ 250)» */
export function hitText(hit: AlertHit): string {
  const t = m.priceCenter.alerts;
  return t.hit(itemLabel(hit.alert.name), formatCurrency(hit.price), storeLabel(hit.store), alertRule(hit.alert));
}

export function alertRule(a: PriceAlert): string {
  const t = m.priceCenter.alerts;
  return a.kind === 'below' ? t.ruleBelow(formatCurrency(a.value ?? 0)) : a.kind === 'offer' ? t.ruleOffer : t.ruleCheap(a.value ?? 10);
}

/** Avisa en el iPhone las alertas que se cumplen hoy y todavía no se avisaron */
export async function notifyHits(hits: AlertHit[], day: string): Promise<void> {
  const fresh = hits.filter((h) => h.alert.notified !== day);
  if (!fresh.length) return;
  const ids = new Set(fresh.map((h) => h.alert.id));
  save(alerts.map((a) => (ids.has(a.id) ? { ...a, notified: day } : a)));
  const prefs = alertPrefs();
  if (!isNative || !prefs.enabled || !prefs.prices) return;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') return;
    await LocalNotifications.schedule({
      notifications: fresh.slice(0, 5).map((h, i) => ({
        id: NOTIFY_ID + ((Date.now() / 1000 + i) % 900 | 0),
        title: m.priceCenter.alerts.notifyTitle,
        body: hitText(h),
        schedule: { at: new Date(Date.now() + 1000) },
      })),
    });
  } catch {
    /* sin avisos */
  }
}
