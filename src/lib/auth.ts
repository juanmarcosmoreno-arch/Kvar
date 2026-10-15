import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, loading };
}

const PENDING_INVITE = 'kvar:invite';
export const pendingInvite = {
  get: () => {
    try {
      return localStorage.getItem(PENDING_INVITE);
    } catch {
      return null;
    }
  },
  set: (code: string) => {
    try {
      localStorage.setItem(PENDING_INVITE, code);
    } catch {
      /* noop */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(PENDING_INVITE);
    } catch {
      /* noop */
    }
  },
};

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
