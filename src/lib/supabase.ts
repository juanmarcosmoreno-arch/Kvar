import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient = createClient(url ?? 'http://localhost:54321', anonKey ?? 'missing', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // En la PWA de iOS los links mágicos abren Safari, no la app instalada:
    // por eso el ingreso es con código de 6 dígitos por correo.
    detectSessionInUrl: false,
    storageKey: 'kvar-auth',
  },
  realtime: { params: { eventsPerSecond: 10 } },
});
