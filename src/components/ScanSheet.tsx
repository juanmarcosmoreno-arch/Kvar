import { useEffect, useState } from 'react';
import { normalizeBarcode, resolveAlias } from '../domain/aliases';
import { guessCategory, guessLocation } from '../domain/openFoodFacts';
import type { Product } from '../domain/types';
import { lookupBarcode } from '../lib/openFoodFacts';
import { formatQuantity } from '../domain/units';
import { learnBarcode, markBought, setStatus } from '../store/actions';
import { getView, useView } from '../store/store';
import { toast } from '../store/toast';
import { useUI, type ScanMode } from '../store/ui';
import { BarcodeScanner } from './BarcodeScanner';
import { DEMO_CODES, isDemo } from '../lib/demo';
import { Icon } from './Icon';
import { ProductThumb } from './ProductThumb';
import { Sheet } from './Sheet';
import { m } from '../i18n';

export function ScanSheet({
  mode, productId, onClose,
}: { mode: ScanMode | null; productId?: string; onClose: () => void }) {
  return (
    <Sheet open={mode !== null} onClose={onClose} title={mode ? m.capture.scan.titles[mode] : ''}>
      {mode && <Body mode={mode} productId={productId} onClose={onClose} />}
    </Sheet>
  );
}

function Body({ mode, productId, onClose }: { mode: ScanMode; productId?: string; onClose: () => void }) {
  const view = useView()!;
  const ui = useUI();
  const [found, setFound] = useState<Product | null>(null);
  const [looking, setLooking] = useState(false);
  const [manual, setManual] = useState('');
  const [session, setSession] = useState<string[]>([]); // nombres marcados en modo «compré»
  const catName = new Map(view.categories.map((c) => [c.id, c.name]));

  // Si el producto encontrado cambia (otro miembro, sync), se muestra actualizado
  const current = found ? view.products.find((p) => p.id === found.id) ?? found : null;

  useEffect(() => setFound(null), [mode]);

  const handle = async (raw: string) => {
    const code = normalizeBarcode(raw);
    if (code.length < 6 || looking) return;
    const v = getView()!;

    if (mode === 'link' && productId) {
      const p = v.products.find((x) => x.id === productId);
      learnBarcode(productId, code);
      toast(m.capture.scan.linked(p?.name));
      onClose();
      return;
    }

    const match = resolveAlias('barcode', code, v.aliases ?? [], []);
    const product = match ? v.products.find((p) => p.id === match.product_id) : undefined;

    if (product) {
      learnBarcode(product.id, code); // suma un uso (ayuda a desempatar en el futuro)
      if (mode === 'out') {
        setStatus(product, 'out', 'barcode');
        onClose();
      } else if (mode === 'bought') {
        markBought(product);
        setSession((s) => [product.name, ...s].slice(0, 6));
      } else {
        setFound(product);
      }
      return;
    }

    // Código desconocido: se busca en Open Food Facts y se carga una sola vez
    setLooking(true);
    const off = await lookupBarcode(code);
    setLooking(false);
    const category = off ? guessCategory(off.tags, v.categories) : null;
    const location = guessLocation(category?.name ?? null, v.locations);
    onClose();
    ui.openAdd({
      name: off?.name ?? '',
      brand: off?.brand ?? null,
      image_url: off?.imageUrl ?? null,
      category_id: category?.id ?? null,
      location_id: off ? location?.id ?? null : null,
      status: mode === 'out' ? 'out' : 'ok',
      barcode: code,
      then: mode === 'out' ? 'out' : mode === 'bought' ? 'bought' : null,
    });
  };

  if (current) {
    return (
      <div className="space-y-5 pb-4">
        <div className="flex items-center gap-4">
          <ProductThumb product={current} categoryName={catName.get(current.category_id ?? '')} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-xl font-semibold">{current.name}</p>
            <p className="text-muted">
              {current.track_quantity ? `${formatQuantity(current.quantity, current.unit)} · ` : ''}
              {m.common.status[current.status]}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn min-h-[64px] flex-col gap-0.5 border border-out/40 text-[#B53A2A] dark:text-out"
            onClick={() => { setStatus(current, 'out', 'barcode'); onClose(); }}>
            {m.capture.scan.ranOut}
          </button>
          <button className="btn-primary min-h-[64px]"
            onClick={() => {
              if (current.track_quantity) {
                ui.openQuantity(current.id, 'bought'); // pañales, latas: ¿cuántos?
                return;
              }
              markBought(current);
              toast(m.capture.scan.boughtToast(current.name));
              onClose();
            }}>
            {m.capture.scan.bought}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-ghost" onClick={() => setFound(null)}>
            <Icon name="barcode" size={18} /> {m.capture.scan.otherCode}
          </button>
          <button className="btn-ghost" onClick={() => { onClose(); ui.openProduct(current.id); }}>
            {m.capture.scan.viewProduct}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {isDemo ? (
        <div className="space-y-3 rounded-card border border-dashed border-line p-4">
          <p className="text-sm text-muted">
            {m.capture.scan.demoHint}
          </p>
          <div className="flex flex-wrap gap-2">
            {DEMO_CODES.map((c) => (
              <button key={c.code} type="button" className="chip min-h-tap bg-surface" onClick={() => void handle(c.code)}>
                <Icon name="barcode" size={15} className="text-muted" /> {c.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <BarcodeScanner onDetect={(c) => void handle(c)} paused={looking} />
      )}
      <p className="text-center text-sm text-muted">{looking ? m.capture.scan.looking : m.capture.scan.hints[mode]}</p>

      {mode === 'bought' && session.length > 0 && (
        <ul className="card divide-y divide-line">
          {session.map((name, i) => (
            <li key={`${name}-${i}`} className="flex min-h-[44px] items-center gap-3 px-4 text-sm">
              <Icon name="check" size={16} className="text-ok" /> {name}
            </li>
          ))}
        </ul>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void handle(manual);
          setManual('');
        }}
      >
        <input
          className="field"
          inputMode="numeric"
          placeholder={m.capture.scan.manualPlaceholder}
          value={manual}
          onChange={(e) => setManual(e.target.value.replace(/\D/g, ''))}
        />
        <button className="btn-ghost min-w-[52px] px-0" disabled={manual.length < 6} aria-label={m.capture.scan.searchCode}>
          <Icon name="search" size={20} />
        </button>
      </form>
      {mode === 'bought' && (
        <button className="btn-primary w-full" onClick={onClose}>{m.common.done}</button>
      )}
    </div>
  );
}
