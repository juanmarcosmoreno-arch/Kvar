import { useSyncExternalStore } from 'react';

export interface Toast {
  id: number;
  message: string;
  action?: { label: string; run: () => void };
}

let current: Toast | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
let seq = 0;

function emit() {
  listeners.forEach((l) => l());
}

export function toast(message: string, action?: Toast['action'], ms = 4000) {
  current = { id: ++seq, message, action };
  clearTimeout(timer);
  timer = setTimeout(dismissToast, ms);
  emit();
}

export function dismissToast() {
  current = null;
  emit();
}

export function useToast(): Toast | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}
