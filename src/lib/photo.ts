/**
 * Foto del producto: se reduce, se recorta el sujeto sin fondo y se devuelve lista para guardar.
 * - App de iPhone (iOS 17+): Vision de Apple, el mismo «levantar sujeto» de Fotos (plugin KvarCutout).
 * - Web o iOS más viejo: recorte cuadrado centrado, sin quitar el fondo.
 */
import { registerPlugin } from '@capacitor/core';
import { isNative } from './platform';

interface KvarCutoutPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  cutout(options: { image: string }): Promise<{ image: string; width: number; height: number }>;
}

const KvarCutout = registerPlugin<KvarCutoutPlugin>('KvarCutout');

export interface ProcessedPhoto {
  blob: Blob;
  cutout: boolean; // true si se quitó el fondo
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la foto'));
    };
    img.src = url; // Safari aplica la orientación EXIF al dibujar
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo generar la imagen'))), type, quality),
  );
}

function drawScaled(img: HTMLImageElement, max: number): HTMLCanvasElement {
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function squareCrop(img: HTMLImageElement, size: number): HTMLCanvasElement {
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  canvas
    .getContext('2d')!
    .drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
  return canvas;
}

let available: Promise<boolean> | null = null;
export function cutoutAvailable(): Promise<boolean> {
  if (!isNative) return Promise.resolve(false);
  available ??= KvarCutout.isAvailable()
    .then((r) => r.available)
    .catch(() => false);
  return available;
}

export async function processPhoto(file: Blob): Promise<ProcessedPhoto> {
  const img = await loadImage(file);
  if (await cutoutAvailable()) {
    try {
      // Se manda una versión de 1600 px: suficiente para Vision y mucho más rápida
      const jpeg = drawScaled(img, 1600).toDataURL('image/jpeg', 0.9).split(',')[1];
      const res = await KvarCutout.cutout({ image: jpeg });
      const bytes = Uint8Array.from(atob(res.image), (c) => c.charCodeAt(0));
      return { blob: new Blob([bytes], { type: 'image/png' }), cutout: true };
    } catch (e) {
      console.info('Recorte no disponible para esta foto', e);
    }
  }
  return { blob: await toBlob(squareCrop(img, 512), 'image/jpeg', 0.85), cutout: false };
}
