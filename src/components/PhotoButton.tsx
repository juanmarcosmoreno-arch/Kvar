import { useRef, useState } from 'react';
import { processPhoto } from '../lib/photo';
import { toast } from '../store/toast';
import { Icon } from './Icon';
import { m } from '../i18n';

/**
 * «Sacale una foto» (cámara) o «De la galería»: recorta el producto sin fondo y devuelve la imagen.
 * Dos botones porque `capture` abre directo la cámara del iPhone y no deja elegir una foto guardada.
 */
export function PhotoButton({
  onPhoto, label, className = 'btn-ghost w-full',
}: { onPhoto: (blob: Blob, cutout: boolean) => void; label?: string; className?: string }) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const { blob, cutout } = await processPhoto(file);
      onPhoto(blob, cutout);
    } catch {
      toast(m.stock.photo.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={onChange} />
      <input ref={gallery} type="file" accept="image/*" className="hidden" onChange={onChange} />
      <button type="button" className={className} onClick={() => camera.current?.click()} disabled={busy}>
        <Icon name="camera" size={20} />
        {busy ? m.stock.photo.cropping : label ?? m.stock.photo.take}
      </button>
      {!busy && (
        <button type="button" className={className} onClick={() => gallery.current?.click()}>
          <Icon name="image" size={20} />
          {m.stock.photo.gallery}
        </button>
      )}
    </>
  );
}
