/**
 * Lectura tolerante de la configuración de Supabase (.env).
 * Arregla errores comunes al copiar y pegar: falta «https://», comillas (también las tipográficas
 * que agrega TextEdit), espacios, barra final o barra invertida de un archivo guardado como RTF.
 */

const JUNK = /^[\s"'“”‘’`<>\\]+|[\s"'“”‘’`<>\\]+$/g;

export function cleanSupabaseUrl(raw: string | undefined | null): string | null {
  let s = (raw ?? '').replace(JUNK, '');
  if (!s) return null;
  // Supabase local (npx supabase start) usa http://localhost: se respeta
  const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.exec(s);
  if (local) return local[0].toLowerCase();
  // «https:https://…», «https://https://…», «http//…»: se deja solo la dirección y se pone un https:// limpio
  s = `https://${s.replace(/^((https?:?)\/*)+/i, '')}`;
  s = s.replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
  try {
    const u = new URL(s);
    if (!u.hostname.includes('.')) return null;
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

export function cleanSupabaseKey(raw: string | undefined | null): string | null {
  const s = (raw ?? '').replace(JUNK, '');
  return s && !/\s/.test(s) ? s : null;
}

export type ConfigProblem = 'missing' | 'bad-url' | 'bad-key' | 'secret-key' | null;

export function configProblem(rawUrl: string | undefined, rawKey: string | undefined): ConfigProblem {
  if (!rawUrl?.trim() || !rawKey?.trim()) return 'missing';
  if (!cleanSupabaseUrl(rawUrl)) return 'bad-url';
  const key = cleanSupabaseKey(rawKey);
  if (!key) return 'bad-key';
  if (key.startsWith('sb_secret_')) return 'secret-key'; // nunca en la app: da acceso total
  return null;
}
