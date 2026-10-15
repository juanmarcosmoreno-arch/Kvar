import { useRef, useState } from 'react';
import { processPhoto } from '../lib/photo';
import { toast } from '../store/toast';
import { Icon } from './Icon';

/**
 * «Sacale una foto»: abre la cámara, recorta el producto sin fondo y devuelve la imagen.
 * Usa el selector nativo del sistema (cámara o biblioteca), igual en web y en la app.
 */
export function PhotoButton({
  onPhoto, label = 'Sacale una foto', className = 'btn-ghost w-full',
}: { onPhoto: (blob: Blob, cutout: boolean) => void; label?: string; className?: string }) {
  const input = useRef<HTMLInputElement>(null);
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
      toast('No pude procesar la foto. Probá con otra.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={onChange} />
      <button type="button" className={className} onClick={() => input.current?.click()} disabled={busy}>
        <Icon name="camera" size={20} />
        {busy ? 'Recortando…' : label}
      </button>
    </>
  );
}
