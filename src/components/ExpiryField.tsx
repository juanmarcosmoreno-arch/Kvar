import { useRef, useState } from 'react';
import { findExpiryDate } from '../domain/expiryDate';
import type { Product } from '../domain/types';
import { formatDate, locale, m } from '../i18n';
import { canReadPhotos, readTextFromPhoto } from '../lib/ocr';
import { updateProduct } from '../store/actions';
import { toast } from '../store/toast';
import { Icon } from './Icon';

const DAY = 86_400_000;
const pretty = (iso: string) => formatDate(`${iso}T12:00:00`, { day: 'numeric', month: 'long', year: 'numeric' });

/** Fecha de vencimiento del producto: a mano o leyéndola de una foto del envase (en el iPhone). */
export function ExpiryField({ product }: { product: Product }) {
  const t = m.expiry;
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<string | null>(null);
  const date = product.expires_on;
  const days = date ? Math.round((Date.parse(`${date}T12:00:00`) - new Date().setHours(12, 0, 0, 0)) / DAY) : null;

  const save = (iso: string | null) => {
    updateProduct(product.id, { expires_on: iso });
    if (iso) toast(t.saved(pretty(iso)));
  };

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const text = await readTextFromPhoto(file);
      const found = findExpiryDate(text, new Date(), { monthFirst: locale === 'en-US' });
      if (found) setProposal(found.date);
      else toast(t.notFound);
    } catch {
      toast(t.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-medium">{t.title}</div>
          <div className={`text-sm ${days != null && days <= 2 ? 'text-[#9A6300] dark:text-low' : 'text-muted'}`}>
            {date ? `${pretty(date)} · ${t.inDays(days!)}` : t.none}
          </div>
        </div>
        {date && (
          <button className="flex min-h-tap min-w-tap items-center justify-center text-muted" aria-label={t.clear} onClick={() => save(null)}>
            <Icon name="x" size={18} />
          </button>
        )}
      </div>

      {proposal ? (
        <div className="space-y-2 rounded-2xl bg-sunken/70 p-3">
          <p className="font-medium">{t.found(pretty(proposal))}</p>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-ghost bg-surface" onClick={() => setProposal(null)}>{t.change}</button>
            <button className="btn-primary" onClick={() => { save(proposal); setProposal(null); }}>{t.confirm}</button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="date"
            className="field min-w-0 flex-1"
            aria-label={t.dateLabel}
            value={date ?? ''}
            onChange={(e) => save(e.target.value || null)}
          />
          {canReadPhotos && (
            <>
              <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />
              <button className="btn-ghost shrink-0 px-4" onClick={() => input.current?.click()} disabled={busy} aria-label={t.fromPhoto}>
                <Icon name="camera" size={20} />
                <span className="text-sm">{busy ? t.reading : t.fromPhoto}</span>
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
