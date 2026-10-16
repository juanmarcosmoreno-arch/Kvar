/** Quién soy en este teléfono (id de usuario de la sesión): lo fija App al entrar al hogar. */
import { useSyncExternalStore } from 'react';

let me: string | null = null;
const listeners = new Set<() => void>();

export function setMe(userId: string | null) {
  if (userId === me) return;
  me = userId;
  listeners.forEach((l) => l());
}

export function getMe(): string | null {
  return me;
}

export function useMe(): string | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => me,
  );
}
