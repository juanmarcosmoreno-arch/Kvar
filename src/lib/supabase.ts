import { createClient, type SupabaseClient, type SupportedStorage } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';
import { isDemo } from './demo';
import { isNative } from './platform';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isConfigured = isDemo || Boolean(url && anonKey);

// En la app nativa la sesión va al almacenamiento de iOS (no se borra como el de WebKit).
const nativeStorage: SupportedStorage = {
  getItem: async (key) => (await Preferences.get({ key })).value,
  setItem: async (key, value) => {
    await Preferences.set({ key, value });
  },
  removeItem: async (key) => {
    await Preferences.remove({ key });
  },
};

export const supabase: SupabaseClient = createClient(url ?? 'http://localhost:54321', anonKey ?? 'missing', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // En la PWA de iOS los links mágicos abren Safari, no la app instalada:
    // por eso el ingreso es con código de 6 dígitos por correo.
    detectSessionInUrl: false,
    storageKey: 'kvar-auth',
    storage: isNative ? nativeStorage : undefined,
  },
  realtime: { params: { eventsPerSecond: 10 } },
});
