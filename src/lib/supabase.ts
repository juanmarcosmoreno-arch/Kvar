import { createClient, type SupabaseClient, type SupportedStorage } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';
import { cleanSupabaseKey, cleanSupabaseUrl, configProblem } from './config';
import { isDemo } from './demo';
import { isNative } from './platform';

const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const url = cleanSupabaseUrl(rawUrl);
const anonKey = cleanSupabaseKey(rawKey);

/** Qué está mal en el .env (para explicarlo en pantalla en lugar de romperse). */
export const setupProblem = isDemo ? null : configProblem(rawUrl, rawKey);
export const setupRawUrl = rawUrl ?? '';
export const isConfigured = isDemo || setupProblem === null;

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

export const supabase: SupabaseClient = createClient(isConfigured && url ? url : 'http://localhost:54321', isConfigured && anonKey ? anonKey : 'missing', {
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
