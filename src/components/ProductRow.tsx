import { useRef, useState, type PointerEvent } from 'react';
import { cycleStatus, worseStatus } from '../domain/status';
import type { Product } from '../domain/types';
import { setQuantity, setStatus } from '../store/actions';
import { useUI } from '../store/ui';
import { useLongPress } from '../lib/useLongPress';
import { Icon } from './Icon';
import { ProductThumb } from './ProductThumb';
import { STATUS_BG, STATUS_TEXT, StatusPill } from './Status';

const THRESHOLD = 72;

/**
 * Fila de producto.
 * - Tocar la pastilla de estado: Hay → Queda poco → No hay → Hay.
 * - Deslizar a la izquierda: un paso hacia "No hay". A la derecha: "Hay".
 * - Tocar el nombre: abre el detalle.
 */
export function ProductRow({
  product, categoryName, subtitle, onOpen,
}: { product: Product; categoryName?: string; subtitle?: string; onOpen: () => void }) {
  const [dx, setDx] = useState(0);
  const ui = useUI();
  const minus = useLongPress(() => setQuantity(product, (product.quantity ?? 0) - 1), () => ui.openQuantity(product.id, 'remove'));
  const plus = useLongPress(() => setQuantity(product, (product.quantity ?? 0) + 1), () => ui.openQuantity(product.id, 'add'));
  const start = useRef<{ x: number; y: number; locked: boolean | null } | null>(null);
  const swiped = useRef(false); // evita que el click posterior al deslizamiento abra el detalle

  const onDown = (e: PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY, locked: null };
    swiped.current = false;
  };
  const onMove = (e: PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const mx = e.clientX - s.x;
    const my = e.clientY - s.y;
    if (s.locked === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) s.locked = Math.abs(mx) > Math.abs(my);
    if (s.locked) setDx(Math.max(-120, Math.min(120, mx)));
  };
  const onUp = () => {
    const s = start.current;
    start.current = null;
    if (s?.locked) {
      swiped.current = true;
      if (dx <= -THRESHOLD) setStatus(product, worseStatus(product.status), 'swipe');
      else if (dx >= THRESHOLD) setStatus(product, 'ok', 'swipe');
    }
    setDx(0);
  };

  const hint = dx < 0 ? worseStatus(product.status) : 'ok';
  const hintActive = Math.abs(dx) >= THRESHOLD;

  return (
    <div className="relative overflow-hidden rounded-card">
      {dx !== 0 && (
        <div
          className={`absolute inset-0 flex items-center px-5 text-sm font-semibold text-white transition-opacity ${STATUS_BG[hint]} ${
            dx < 0 ? 'justify-end' : 'justify-start'
          } ${hintActive ? 'opacity-100' : 'opacity-60'}`}
        >
          {hint === 'ok' ? 'Hay' : hint === 'low' ? 'Queda poco' : 'No hay'}
        </div>
      )}
      <div
        className="card relative flex min-h-[60px] touch-pan-y select-none items-center gap-3 pl-3 pr-2"
        style={{ transform: `translateX(${dx}px)`, transition: dx === 0 ? 'transform 180ms ease-out' : 'none' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <button className="flex min-h-[56px] flex-1 items-center gap-3 text-left" onClick={() => !swiped.current && onOpen()}>
          <ProductThumb product={product} categoryName={categoryName} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate font-medium">{product.name}</span>
              {product.is_staple && <Icon name="star" size={14} className="shrink-0 text-low" fill="currentColor" aria-label="Básico" />}
            </span>
            <span className="block truncate text-sm text-muted">
              {subtitle ??
                (product.track_quantity ? `${product.quantity ?? 0} ${product.unit ?? 'unidades'}` : categoryName ?? '')}
              {product.unidentified && ' · Sin identificar'}
            </span>
          </span>
        </button>
        {product.track_quantity ? (
          <div className="flex items-center">
            <button
              aria-label={`Restar uno de ${product.name} (mantené apretado para elegir cuántos)`}
              className="flex min-h-tap min-w-tap select-none items-center justify-center rounded-full text-muted active:bg-sunken"
              {...minus}
            >
              <Icon name="minus" size={20} />
            </button>
            <button
              aria-label={`Elegir cuántos ${product.unit ?? 'unidades'} de ${product.name}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => ui.openQuantity(product.id, 'add')}
              className={`inline-flex min-h-[32px] min-w-[2.5rem] items-center justify-center rounded-full border border-current px-2 text-sm tabular-nums ${STATUS_TEXT[product.status]}`}
            >
              {product.quantity ?? 0}
            </button>
            <button
              aria-label={`Sumar uno de ${product.name} (mantené apretado para elegir cuántos)`}
              className="flex min-h-tap min-w-tap select-none items-center justify-center rounded-full text-muted active:bg-sunken"
              {...plus}
            >
              <Icon name="plus" size={20} />
            </button>
          </div>
        ) : (
          <button
            aria-label={`Cambiar estado de ${product.name}`}
            className="flex min-h-tap items-center px-1"
            onClick={() => setStatus(product, cycleStatus(product.status), 'manual', false)}
          >
            <StatusPill status={product.status} />
          </button>
        )}
      </div>
    </div>
  );
}
