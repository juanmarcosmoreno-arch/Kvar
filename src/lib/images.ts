/**
 * Fotos de productos: se guardan en el teléfono (IndexedDB) y en Supabase Storage.
 * Se ven al instante y sin conexión; se suben cuando hay red (operación set_image).
 */
import { useEffect, useState } from 'react';
import { createStore, get, set, type UseStore } from 'idb-keyval';
import { isDemo } from './demo';
import { supabase } from './supabase';

export const BUCKET = 'product-images';

let store: UseStore | undefined;
const db = () => (store ??= createStore('kvar-img', 'blobs'));
const urls = new Map<string, string>();
const memory = new Map<string, Blob>(); // respaldo si IndexedDB no está disponible

export const imageStore = {
  get: async (path: string) => {
    try {
      return (await get<Blob>(path, db())) ?? memory.get(path);
    } catch {
      return memory.get(path);
    }
  },
  put: async (path: string, blob: Blob) => {
    memory.set(path, blob);
    try {
      await set(path, blob, db());
    } catch {
      /* queda en memoria */
    }
  },
};

export function imagePath(householdId: string, productId: string, mime: string): string {
  const ext = mime === 'image/png' ? 'png' : 'jpg';
  // El nombre cambia con cada foto: así nunca se muestra una versión vieja desde caché
  return `${householdId}/${productId}-${Date.now().toString(36)}.${ext}`;
}

async function resolveUrl(path: string): Promise<string | null> {
  const cached = urls.get(path);
  if (cached) return cached;
  let blob = await imageStore.get(path);
  if (!blob && navigator.onLine) {
    const { data } = await supabase.storage.from(BUCKET).download(path);
    if (data) {
      blob = data;
      await imageStore.put(path, data);
    }
  }
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urls.set(path, url);
  return url;
}

/** URL mostrable de una foto guardada (o null mientras carga / si no existe). */
export function useImageUrl(path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(path ? urls.get(path) ?? null : null);
  useEffect(() => {
    let alive = true;
    if (!path) {
      setUrl(null);
      return;
    }
    void resolveUrl(path).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [path]);
  return url;
}

/** Error de Storage con su código HTTP (4xx = no tiene sentido reintentar). */
export class UploadError extends Error {
  constructor(message: string, public status: number | null) {
    super(message);
  }
}

/** Sube la foto guardada localmente. Devuelve false si el archivo local ya no existe. */
export async function uploadImage(path: string): Promise<boolean> {
  if (isDemo) return true; // en la demo la foto queda solo en este navegador
  const blob = await imageStore.get(path);
  if (!blob) return false;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || 'image/png',
    upsert: true,
    cacheControl: '31536000',
  });
  if (error) {
    const status = (error as { status?: number; statusCode?: string | number }).status ?? Number((error as { statusCode?: string }).statusCode) ?? null;
    throw new UploadError(error.message, Number.isFinite(status) ? Number(status) : null);
  }
  return true;
}

export async function removeImage(path: string): Promise<void> {
  if (isDemo) return;
  await supabase.storage.from(BUCKET).remove([path]);
}
