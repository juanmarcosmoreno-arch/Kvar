import { Capacitor } from '@capacitor/core';

/** true dentro de la app de iPhone (Capacitor); false en la web/PWA. */
export const isNative = Capacitor.isNativePlatform();

/** Versión de la app (package.json), inyectada por Vite. */
export const APP_VERSION: string = __APP_VERSION__;

/**
 * URL pública de la versión web. En la app nativa window.location es capacitor://…,
 * así que los links de invitación usan esta dirección.
 */
export const PUBLIC_URL: string =
  (import.meta.env.VITE_PUBLIC_URL as string | undefined)?.replace(/\/$/, '') ||
  (isNative ? 'https://kvar.app' : window.location.origin);

/** Link a la ficha del App Store (se completa al publicar). */
export const APP_STORE_URL = (import.meta.env.VITE_APP_STORE_URL as string | undefined) || '';
