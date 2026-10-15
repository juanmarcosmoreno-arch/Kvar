import { useEffect, useState } from 'react';
import { clampAmount, initialAmount, nextQuantity, QUICK_AMOUNTS, type QuantityMode } from '../domain/quantity';
import { openItemFor } from '../domain/shoppingList';
import { formatQuantity, unitLabel } from '../domain/units';
import { applyQuantity, setQuantity, unpurchaseItem } from '../store/actions';
import { useView } from '../store/store';
import { toast } from '../store/toast';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { m } from '../i18n';

/** Modos que se pueden alternar desde el selector cuando se abre tocando el número. */
const STOCK_MODES = ['add', 'remove', 'set'] as const;

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

  const tracks = product.track_quantity;
  const after = nextQuantity(product.quantity, mode, amount);

  const confirm = (n: number) => {
    const value = clampAmount(n, mode);
    const prevQuantity = product.quantity ?? 0;
    const boughtItem = mode === 'bought' ? item : undefined;
    applyQuantity(product, mode, value, mode === 'bought' ? 'shopping' : 'manual');
    const undo = {
      label: m.common.undo,
      run: () =>
        boughtItem
          ? unpurchaseItem({ ...boughtItem, quantity: value, checked_at: new Date().toISOString() })
          : setQuantity(product, prevQuantity),
    };
    if (mode === 'list') toast(m.stock.quantity.toastBuy(product.name, value));
    else if (tracks) toast(m.stock.quantity.toastLeft(product.name, formatQuantity(nextQuantity(product.quantity, mode, value), product.unit)), undo);
    else toast(m.stock.quantity.toastOk(product.name));
    onClose();
  };

  const showModes = target && ['add', 'remove', 'set'].includes(target.mode);

  return (
    <Sheet open={Boolean(target)} onClose={onClose} title={m.stock.quantity.titles[mode]}>
      <div className="space-y-5 pb-4">
        <p className="text-muted">
          {product.name}
          {tracks && mode !== 'list' && (
            <>
              {' · '}{m.stock.quantity.has(formatQuantity(product.quantity, product.unit))}
            </>
          )}
        </p>

        {showModes && (
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-line p-1" role="tablist">
            {STOCK_MODES.map((id) => (
              <button
                key={id}
                role="tab"
                aria-selected={mode === id}
                className={`min-h-[40px] rounded-lg text-sm ${mode === id ? 'bg-primary text-on-primary' : 'text-muted'}`}
                onClick={() => {
                  setMode(id);
                  setAmount(initialAmount(id, product.quantity, null));
                }}
              >
                {m.stock.quantity.modes[id]}
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
                aria-label={`${m.stock.quantity.titles[mode]} ${n}`}
              >
                {mode === 'remove' ? `−${n}` : n}
              </button>
            ))}
          </div>
        )}

        <div className="card flex items-center justify-between p-2">
          <button className="btn-ghost min-w-[56px]" aria-label={m.stock.quantity.oneLess} onClick={() => setAmount((a) => clampAmount(a - 1, mode))}>
            <Icon name="minus" />
          </button>
          <input
            className="w-24 bg-transparent text-center text-4xl font-semibold tabular-nums outline-none"
            inputMode="numeric"
            aria-label={m.stock.quantity.amount}
            value={amount}
            onChange={(e) => setAmount(Math.min(999, Number(e.target.value.replace(/\D/g, '')) || 0))}
            onBlur={() => setAmount((a) => clampAmount(a, mode))}
          />
          <button className="btn-ghost min-w-[56px]" aria-label={m.stock.quantity.oneMore} onClick={() => setAmount((a) => clampAmount(a + 1, mode))}>
            <Icon name="plus" />
          </button>
        </div>

        {tracks && mode !== 'list' && (
          <p className="text-center text-sm text-muted tabular-nums">
            {product.quantity ?? 0} → <span className="font-medium text-ink">{after}</span> {unitLabel(after, product.unit)}
          </p>
        )}

        <button className="btn-primary w-full" onClick={() => confirm(amount)}>
          {m.common.done}
        </button>
      </div>
    </Sheet>
  );
}
