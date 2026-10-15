/**
 * Apple Watch: le pasa al reloj (por WatchConnectivity) lo necesario para sumarse al hogar.
 * El reloj después habla directo con Supabase como un miembro más («Reloj de Juan»).
 */
import { registerPlugin } from '@capacitor/core';
import type { Snapshot } from '../domain/types';
import { isDemo } from './demo';
import { isNative } from './platform';
import { supabase, supabaseConfig } from './supabase';

interface KvarWatchPlugin {
  sync(options: Record<string, string>): Promise<{ paired: boolean; installed: boolean }>;
  shareSnapshot(options: { json: string }): Promise<void>;
  clearSnapshot(): Promise<void>;
  takePendingShortcutActions(): Promise<{ actions: PendingShortcutAction[] }>;
}

/** Lo que Siri anotó sin conexión (se aplica al abrir la app) */
export interface PendingShortcutAction {
  productId?: string;
  name?: string;
  status?: 'out' | 'low';
  list?: boolean;
  at: string;
}

const KvarWatch = registerPlugin<KvarWatchPlugin>('KvarWatch');

let last = '';

export async function syncWatch(view: Snapshot, userId: string): Promise<void> {
  if (!isNative || isDemo || !supabaseConfig.url) return;
  const me = view.members.find((m) => m.user_id === userId);
  const payload = {
    supabaseUrl: supabaseConfig.url,
    supabaseKey: supabaseConfig.key,
    inviteCode: view.household.invite_code,
    householdId: view.household.id,
    householdName: view.household.name,
    memberName: me?.display_name ?? '',
  };
  const key = JSON.stringify(payload);
  if (key === last) return;
  last = key;
  try {
    await KvarWatch.sync(payload);
  } catch {
    last = ''; // se reintenta la próxima vez
  }
}

// --- Widget y Siri ----------------------------------------------------------------------------------------
let lastShared = '';
let shareTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Le pasa al widget y a Siri una foto chica del hogar (lista, lo que se está terminando, productos) y el token
 * actual. Se llama cada vez que cambia el hogar; espera un momento para juntar cambios. No falla nunca.
 */
let lastView: Snapshot | null = null;
let listening = false;

export function shareWithWidget(view: Snapshot): void {
  if (!isNative || isDemo || !supabaseConfig.url) return;
  lastView = view;
  if (!listening) {
    listening = true;
    // Cuando la sesión se renueva, Siri necesita el token nuevo
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED' && lastView) shareWithWidget(lastView);
    });
  }
  clearTimeout(shareTimer);
  shareTimer = setTimeout(() => void doShare(view), 1500);
}

async function doShare(view: Snapshot) {
  try {
    const { data } = await supabase.auth.getSession();
    const byId = new Map(view.products.map((p) => [p.id, p]));
    const open = view.list.filter((i) => !i.checked_at);
    const snapshot = {
      householdId: view.household.id,
      householdName: view.household.name,
      supabaseUrl: supabaseConfig.url,
      supabaseKey: supabaseConfig.key,
      accessToken: data.session?.access_token ?? null,
      tokenExpiresAt: data.session?.expires_at ?? null,
      list: open.map((i) => ({
        name: (i.product_id ? byId.get(i.product_id)?.name : i.name) ?? '',
        quantity: i.quantity ?? null,
        status: i.product_id ? byId.get(i.product_id)?.status ?? null : null,
      })).filter((i) => i.name),
      running: view.products
        .filter((p) => p.status !== 'ok')
        .sort((a, b) => (a.status === b.status ? 0 : a.status === 'out' ? -1 : 1))
        .slice(0, 12)
        .map((p) => ({ name: p.name, quantity: p.track_quantity ? p.quantity : null, status: p.status })),
      products: view.products.map((p) => ({ id: p.id, name: p.name })),
      updatedAt: Date.now() / 1000,
    };
    const json = JSON.stringify(snapshot);
    const key = JSON.stringify({ ...snapshot, updatedAt: 0 });
    if (key === lastShared) return;
    lastShared = key;
    await KvarWatch.shareSnapshot({ json });
  } catch {
    lastShared = '';
  }
}

export async function clearWidget(): Promise<void> {
  if (!isNative) return;
  lastShared = '';
  await KvarWatch.clearSnapshot().catch(() => {});
}

/** Lee y borra lo que Siri dejó anotado sin conexión. */
export async function takePendingShortcutActions(): Promise<PendingShortcutAction[]> {
  if (!isNative || isDemo) return [];
  try {
    return (await KvarWatch.takePendingShortcutActions()).actions ?? [];
  } catch {
    return [];
  }
}
