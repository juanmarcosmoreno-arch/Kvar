/**
 * Avisos en el iPhone (notificaciones locales: se programan en el teléfono, sin servidor ni costo):
 *  - «El café probablemente se termine mañana» (según el ritmo de consumo de las estadísticas)
 *  - «El queso vence en 2 días»
 * Y dentro de la app, «Sofía compró la leche» (lo que hacen los demás del hogar).
 */
import { LocalNotifications } from '@capacitor/local-notifications';
import { planAlerts } from '../domain/alertsPlan';
import type { StockEvent } from '../domain/stats';
import type { Snapshot } from '../domain/types';
import { isNative } from './platform';

export type { AlertPrefs } from '../domain/alertsPlan';
import type { AlertPrefs } from '../domain/alertsPlan';

const KEY = 'stoka:avisos';
const DEFAULTS: AlertPrefs = { enabled: false, predicted: true, expiry: true, others: true, prices: true, shoppers: true };
import { ID_MAX, ID_MIN } from '../domain/alertsPlan';

export function alertPrefs(): AlertPrefs {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<AlertPrefs>) };
  } catch {
    return DEFAULTS;
  }
}

export function saveAlertPrefs(p: AlertPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* sin almacenamiento */
  }
}

export const canNotify = isNative;

/** Pide permiso (la primera vez muestra el cartel de iOS). true si quedó permitido. */
export async function requestAlertPermission(): Promise<boolean> {
  if (!isNative) return false;
  try {
    const r = await LocalNotifications.requestPermissions();
    return r.display === 'granted';
  } catch {
    return false;
  }
}

let lastPlan = '';

/** Reprograma los avisos (cancela los de Stoka y agenda los nuevos). No hace nada en la web. */
export async function scheduleAlerts(view: Snapshot, events: StockEvent[]): Promise<void> {
  if (!isNative) return;
  const planned = planAlerts(view, events, alertPrefs());
  const signature = JSON.stringify(planned.map((p) => [p.id, p.at.getTime(), p.body]));
  if (signature === lastPlan) return;
  lastPlan = signature;
  try {
    const pending = await LocalNotifications.getPending();
    const ours = pending.notifications.filter((n) => n.id >= ID_MIN && n.id <= ID_MAX);
    if (ours.length) await LocalNotifications.cancel({ notifications: ours.map((n) => ({ id: n.id })) });
    if (!planned.length) return;
    await LocalNotifications.schedule({
      notifications: planned.map((p) => ({ id: p.id, title: p.title, body: p.body, schedule: { at: p.at, allowWhileIdle: true } })),
    });
  } catch (e) {
    console.warn('No se pudieron programar los avisos', e);
  }
}

export async function clearAlerts(): Promise<void> {
  lastPlan = '';
  if (!isNative) return;
  try {
    const pending = await LocalNotifications.getPending();
    const ours = pending.notifications.filter((n) => n.id >= ID_MIN && n.id <= ID_MAX);
    if (ours.length) await LocalNotifications.cancel({ notifications: ours.map((n) => ({ id: n.id })) });
  } catch {
    /* nada que cancelar */
  }
}
