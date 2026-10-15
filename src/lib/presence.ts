/**
 * «Estoy en el súper»: cada uno avisa que está comprando (Supabase Realtime Presence, sin tablas).
 * Los demás ven «Sofía está en el súper» y lo que agreguen a la lista le aparece al instante.
 */
import { useSyncExternalStore } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { isDemo } from './demo';
import { supabase } from './supabase';

interface PresenceState {
  /** Nombres de los demás que están en el súper */
  shoppers: string[];
  /** Yo estoy en el súper */
  me: boolean;
}

let state: PresenceState = { shoppers: [], me: readMine() };
const listeners = new Set<() => void>();
let channel: RealtimeChannel | null = null;
let self: { id: string; name: string } | null = null;

function readMine(): boolean {
  try {
    return sessionStorage.getItem('stoka:en-el-super') === '1';
  } catch {
    return false;
  }
}

function set(patch: Partial<PresenceState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

/** Se llama al abrir el hogar (y al cambiar de nombre). */
export function startPresence(householdId: string, me: { id: string; name: string }) {
  self = me;
  if (isDemo) return;
  if (channel && channel.topic === `realtime:super:${householdId}`) {
    if (state.me) void channel.track({ name: me.name, shopping: true, at: Date.now() });
    return;
  }
  stopPresence();
  const ch = supabase.channel(`super:${householdId}`, { config: { presence: { key: me.id } } });
  ch.on('presence', { event: 'sync' }, () => {
    const all = ch.presenceState<{ name: string; shopping: boolean }>();
    const names: string[] = [];
    for (const [key, metas] of Object.entries(all)) {
      if (key === self?.id) continue;
      const meta = metas.find((x) => x.shopping);
      if (meta) names.push(meta.name);
    }
    set({ shoppers: names });
  });
  ch.subscribe((status) => {
    if (status === 'SUBSCRIBED' && state.me && self) void ch.track({ name: self.name, shopping: true, at: Date.now() });
  });
  channel = ch;
}

export function stopPresence() {
  if (channel) void supabase.removeChannel(channel);
  channel = null;
  set({ shoppers: [] });
}

export function setShopping(on: boolean) {
  try {
    if (on) sessionStorage.setItem('stoka:en-el-super', '1');
    else sessionStorage.removeItem('stoka:en-el-super');
  } catch {
    /* sin almacenamiento */
  }
  set({ me: on });
  if (!channel || !self) return;
  if (on) void channel.track({ name: self.name, shopping: true, at: Date.now() });
  else void channel.untrack();
}

export function usePresence(): PresenceState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}
