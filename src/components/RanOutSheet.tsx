import { useState } from 'react';
import { searchProducts } from '../domain/aliases';
import { frequentProducts } from '../domain/status';
import { categoryIcon } from '../lib/categoryIcon';
import { createProduct, setStatus } from '../store/actions';
import { useView } from '../store/store';
import { toast } from '../store/toast';
import { Icon } from './Icon';
import { Sheet } from './Sheet';

/** "¿Se terminó algo?": un toque y va a la lista. */
export function RanOutSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const view = useView();
  const [q, setQ] = useState('');
  if (!view) return null;
  const catName = new Map(view.categories.map((c) => [c.id, c.name]));
  const results = q.trim() ? searchProducts(q, view.products).slice(0, 12) : frequentProducts(view.products, view.outCounts, 12);

  const close = () => {
    setQ('');
    onClose();
  };

  return (
    <Sheet open={open} onClose={close} title="¿Se terminó algo?">
      <div className="space-y-4 pb-4">
        <label className="relative block">
          <Icon name="search" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input className="field pl-12" placeholder="Buscá un producto…" value={q} onChange={(e) => setQ(e.target.value)} enterKeyHint="search" />
        </label>
        {!q && results.length > 0 && <p className="text-sm text-muted">Los que más se terminan</p>}
        <div className="grid grid-cols-2 gap-2">
          {results.map((p) => (
            <button
              key={p.id}
              disabled={p.status === 'out'}
              onClick={() => {
                setStatus(p, 'out', 'quick_out');
                setQ('');
              }}
              className="card flex min-h-[64px] items-center gap-2.5 px-3 text-left active:scale-[0.98] disabled:opacity-50"
            >
              <span className="text-2xl" aria-hidden>{categoryIcon(p.category_id ? catName.get(p.category_id) : null)}</span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{p.name}</span>
                {p.status === 'out' && <span className="text-xs text-out">Ya está en la lista</span>}
              </span>
            </button>
          ))}
        </div>
        {q.trim() && !results.some((p) => p.name.toLowerCase() === q.trim().toLowerCase()) && (
          <button
            className="btn-ghost w-full"
            onClick={() => {
              const p = createProduct({ name: q, status: 'out' });
              if (p) toast(`${p.name}: No hay. Lo agregué a la lista.`);
              setQ('');
            }}
          >
            <Icon name="plus" size={20} /> Agregar «{q.trim()}» a la lista
          </button>
        )}
        {!q && results.length === 0 && (
          <p className="py-6 text-center text-muted">Todavía no hay productos. Buscá uno para agregarlo.</p>
        )}
      </div>
    </Sheet>
  );
}
