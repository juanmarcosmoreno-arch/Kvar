/** Qué avisar y cuándo (puro, sin Capacitor: se prueba en src/lib/__tests__/alerts.test.ts). */
import { m } from '../i18n';
import { householdStats, type StockEvent } from './stats';
import type { Snapshot } from './types';

export interface AlertPrefs {
  enabled: boolean;
  predicted: boolean;
  expiry: boolean;
  others: boolean;
}

const DAY = 86_400_000;
/** Rango de ids propio, para no tocar otras notificaciones */
export const ID_MIN = 7000;
export const ID_MAX = 7999;

function idFor(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (Math.imul(h, 31) + text.charCodeAt(i)) | 0;
  return ID_MIN + (Math.abs(h) % (ID_MAX - ID_MIN));
}

/** A las `hour` del día `date` (hora local) */
function atHour(date: Date, hour: number): Date {
  const d = new Date(date);
  d.setHours(hour, 0, 0, 0);
  return d;
}

export interface PlannedAlert {
  id: number;
  title: string;
  body: string;
  at: Date;
}

/** Qué avisar y cuándo (puro: se puede probar). */
export function planAlerts(view: Snapshot, events: StockEvent[], prefs: AlertPrefs, now = new Date()): PlannedAlert[] {
  if (!prefs.enabled) return [];
  const out: PlannedAlert[] = [];
  const soon = now.getTime() + 60_000;
  const onList = new Set(view.list.filter((i) => !i.checked_at && i.product_id).map((i) => i.product_id));

  if (prefs.expiry) {
    for (const p of view.products) {
      if (p.status === 'out' || !p.expires_on) continue;
      const expires = new Date(`${p.expires_on}T12:00:00`);
      const days = Math.round((expires.getTime() - atHour(now, 12).getTime()) / DAY);
      if (days < 0 || days > 7) continue;
      // Dos días antes a las 10; si ya pasó, hoy o mañana a las 10
      let at = atHour(new Date(expires.getTime() - 2 * DAY), 10);
      if (at.getTime() < soon) at = atHour(now, 10);
      if (at.getTime() < soon) at = atHour(new Date(now.getTime() + DAY), 10);
      if (at.getTime() >= expires.getTime() + 12 * 3_600_000) continue;
      const left = Math.max(0, Math.round((expires.getTime() - atHour(at, 12).getTime()) / DAY));
      out.push({ id: idFor(`exp:${p.id}:${p.expires_on}`), title: m.alerts.notif.expiryTitle, body: m.alerts.notif.expiry(p.name, left), at });
    }
  }

  if (prefs.predicted && events.length) {
    const h = householdStats(events, view.products, { now, months: 6, soonDays: 7 });
    for (const { product, at: outAt } of h.soon) {
      if (onList.has(product.id) || product.status === 'out') continue;
      const runsOut = new Date(outAt);
      // La tarde anterior, para comprarlo a tiempo
      let at = atHour(new Date(runsOut.getTime() - DAY), 18);
      if (at.getTime() < soon) at = atHour(now, 18);
      if (at.getTime() < soon) continue;
      out.push({ id: idFor(`pred:${product.id}`), title: m.alerts.notif.predictedTitle, body: m.alerts.notif.predicted(product.name), at });
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, 40);
}

