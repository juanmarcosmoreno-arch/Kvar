/**
 * Leer el texto de una foto de ticket.
 * App de iPhone: Vision de Apple (plugin KvarOCR), en el dispositivo y gratis.
 * Web: no hay lector de fotos (todavía); se puede pegar el texto del e-Ticket.
 */
import { registerPlugin } from '@capacitor/core';
import { groupIntoLines, type OcrBox } from '../domain/ocr';
import { isNative } from './platform';

interface KvarOCRPlugin {
  recognize(options: { image: string }): Promise<{ boxes: OcrBox[]; width: number; height: number }>;
}

const KvarOCR = registerPlugin<KvarOCRPlugin>('KvarOCR');

export const canReadPhotos = isNative;

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
    img.src = url;
  });
}

/** Devuelve el texto del ticket, un renglón por línea. */
export async function readReceiptPhoto(file: Blob): Promise<string> {
  const img = await loadImage(file);
  // Tickets largos: se conserva resolución para la letra chica (lado mayor hasta 3000 px)
  const scale = Math.min(1, 3000 / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const jpeg = canvas.toDataURL('image/jpeg', 0.92).split(',')[1];
  const res = await KvarOCR.recognize({ image: jpeg });
  return groupIntoLines(res.boxes, res.height / res.width).join('\n');
}
