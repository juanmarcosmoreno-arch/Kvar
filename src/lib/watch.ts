/**
 * Apple Watch: le pasa al reloj (por WatchConnectivity) lo necesario para sumarse al hogar.
 * El reloj después habla directo con Supabase como un miembro más («Reloj de Juan»).
 */
import { registerPlugin } from '@capacitor/core';
import type { Snapshot } from '../domain/types';
import { isDemo } from './demo';
import { isNative } from './platform';
import { supabaseConfig } from './supabase';

interface KvarWatchPlugin {
  sync(options: Record<string, string>): Promise<{ paired: boolean; installed: boolean }>;
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
