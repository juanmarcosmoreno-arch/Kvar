import { useEffect, useState } from 'react';
import { clampAmount, initialAmount, nextQuantity, QUICK_AMOUNTS, type QuantityMode } from '../domain/quantity';
import { openItemFor } from '../domain/shoppingList';
import { applyQuantity, setQuantity, unpurchaseItem } from '../store/actions';
import { useView } from '../store/store';
import { toast } from '../store/toast';
import { Icon } from './Icon';
import { Sheet } from './Sheet';

const TITLE: Record<QuantityMode, string> = {
  add: '¿Cuántos sumás?',
  remove: '¿Cuántos usaste?',
  set: '¿Cuántos hay?',
  bought: '¿Cuántos compraste?',
  list: '¿Cuántos comprar?',
};

/** Modos que se pueden alternar desde el selector cuando se abre tocando el número. */
const STOCK_MODES: { id: QuantityMode; label: string }[] = [
  { id: 'add', label: 'Sumar' },
  { id: 'remove', label: 'Restar' },
  { id: 'set', label: 'Contar' },
];

/**
 * Elegir una cantidad con el menor esfuerzo: tocar un número rápido ya confirma;
 * para otra cantidad, − / + o escribirla, y «Listo».
 */
export function QuantitySheet({
  target, onClose,
}: { target: { productId: string; mode: QuantityMode } | null; onClose: () => void }) {
  const view = useView();
  const product = target ? view?.products.find((p) => p.id === target.productId) : undefined;
  const [mode, setMode] = useState<QuantityMode>('add');
  const [amount, setAmount] = useState(1);

  const item = product && view ? openItemFor(view.list, product.id) : undefined;

  useEffect(() => {
    if (!target || !product) return;
    setMode(target.mode);
    setAmount(initialAmount(target.mode, product.quantity, item?.quantity ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  if (!product) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;

  const unit = product.unit ?? 'unidades';
  const tracks = product.track_quantity;
  const after = nextQuantity(product.quantity, mode, amount);

  const confirm = (n: number) => {
    const value = clampAmount(n, mode);
    const prevQuantity = product.quantity ?? 0;
    const boughtItem = mode === 'bought' ? item : undefined;
    applyQuantity(product, mode, value, mode === 'bought' ? 'shopping' : 'manual');
    const undo = {
      label: 'Deshacer',
      run: () =>
        boughtItem
          ? unpurchaseItem({ ...boughtItem, quantity: value, checked_at: new Date().toISOString() })
          : setQuantity(product, prevQuantity),
    };
    if (mode === 'list') toast(`${product.name}: comprar ${value}.`);
    else if (tracks) toast(`${product.name}: quedan ${nextQuantity(product.quantity, mode, value)} ${unit}.`, undo);
    else toast(`${product.name}: Hay.`);
    onClose();
  };

  const showModes = target && ['add', 'remove', 'set'].includes(target.mode);

  return (
    <Sheet open={Boolean(target)} onClose={onClose} title={TITLE[mode]}>
      <div className="space-y-5 pb-4">
        <p className="text-muted">
          {product.name}
          {tracks && mode !== 'list' && (
            <>
              {' · '}hay {product.quantity ?? 0} {unit}
            </>
          )}
        </p>

        {showModes && (
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-line p-1" role="tablist">
            {STOCK_MODES.map((m) => (
              <button
                key={m.id}
                role="tab"
                aria-selected={mode === m.id}
                className={`min-h-[40px] rounded-lg text-sm ${mode === m.id ? 'bg-primary text-on-primary' : 'text-muted'}`}
                onClick={() => {
                  setMode(m.id);
                  setAmount(initialAmount(m.id, product.quantity, null));
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        {mode !== 'set' && (
          <div className="grid grid-cols-6 gap-2">
            {QUICK_AMOUNTS.map((n) => (
              <button
                key={n}
                className="min-h-[52px] rounded-xl border border-line bg-surface text-lg font-medium tabular-nums active:scale-95"
                onClick={() => confirm(n)}
                aria-label={`${TITLE[mode]} ${n}`}
              >
                {mode === 'remove' ? `−${n}` : n}
              </button>
            ))}
          </div>
        )}

        <div className="card flex items-center justify-between p-2">
          <button className="btn-ghost min-w-[56px]" aria-label="Uno menos" onClick={() => setAmount((a) => clampAmount(a - 1, mode))}>
            <Icon name="minus" />
          </button>
          <input
            className="w-24 bg-transparent text-center text-4xl font-semibold tabular-nums outline-none"
            inputMode="numeric"
            aria-label="Cantidad"
            value={amount}
            onChange={(e) => setAmount(Math.min(999, Number(e.target.value.replace(/\D/g, '')) || 0))}
            onBlur={() => setAmount((a) => clampAmount(a, mode))}
          />
          <button className="btn-ghost min-w-[56px]" aria-label="Uno más" onClick={() => setAmount((a) => clampAmount(a + 1, mode))}>
            <Icon name="plus" />
          </button>
        </div>

        {tracks && mode !== 'list' && (
          <p className="text-center text-sm text-muted tabular-nums">
            {product.quantity ?? 0} → <span className="font-medium text-ink">{after}</span> {unit}
          </p>
        )}

        <button className="btn-primary w-full" onClick={() => confirm(amount)}>
          Listo
        </button>
      </div>
    </Sheet>
  );
}
