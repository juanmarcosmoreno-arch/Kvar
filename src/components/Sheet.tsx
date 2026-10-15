import { useEffect, type ReactNode } from 'react';
import { Icon } from './Icon';

/** Hoja inferior (bottom sheet): se usa con una mano y se cierra tocando afuera. */
export function Sheet({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
      <button aria-label="Cerrar" className="animate-fade absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="animate-sheet relative mx-auto flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-[1.75rem] bg-bg pb-[calc(env(safe-area-inset-bottom)+12px)] shadow-2xl">
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line" />
        <div className="flex items-center justify-between px-5 pt-2">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="-mr-2 flex min-h-tap min-w-tap items-center justify-center rounded-full text-muted" aria-label="Cerrar">
            <Icon name="x" />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pb-2 pt-2">{children}</div>
      </div>
    </div>
  );
}
