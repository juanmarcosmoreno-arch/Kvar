import { useMemo, useState } from 'react';
import { searchProducts } from '../domain/aliases';
import type { Product } from '../domain/types';
import { compareText, m } from '../i18n';
import { mergeProducts } from '../store/actions';
import { useView } from '../store/store';
import { Icon } from './Icon';
import { ProductThumb } from './ProductThumb';
import { Sheet } from './Sheet';

/**
 * «Unir con otro producto»: se elige el duplicado (otra marca, o el mismo cargado dos veces) y pasa a ser
 * este producto. Primero aparecen los de nombre parecido.
 */
export function MergeSheet({ keep, onClose }: { keep: Product | null; onClose: () => void }) {
  return (
    <Sheet open={Boolean(keep)} onClose={onClose} title={m.stock.merge.title}>
      {keep && <Body key={keep.id} keep={keep} onClose={onClose} />}
    </Sheet>
  );
}

function Body({ keep, onClose }: { keep: Product; onClose: () => void }) {
  const view = useView()!;
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Product | null>(null);
  const t = m.stock.merge;

  const options = useMemo(() => {
    const others = view.products.filter((p) => p.id !== keep.id);
    if (query.trim()) return searchProducts(query, others).slice(0, 12);
    // Sin búsqueda: los parecidos primero («Azúcar» → «Azúcar Bella Unión»), después el resto
    const similar = searchProducts(keep.name.split(' ')[0], others).slice(0, 6);
    const rest = others.filter((p) => !similar.includes(p)).sort((a, b) => compareText(a.name, b.name));
    return [...similar, ...rest];
  }, [view.products, keep, query]);

  if (picked) {
    return (
      <div className="space-y-5 pb-2">
        <div className="flex items-center justify-center gap-3">
          <ProductThumb product={picked} size="md" />
          <Icon name="chevron" className="text-muted" />
          <ProductThumb product={keep} size="md" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-lg font-semibold">{t.confirmTitle(keep.name)}</p>
          <p className="text-muted">{t.confirmBody(picked.name, keep.name)}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-ghost" onClick={() => setPicked(null)}>{m.common.back}</button>
          <button
            className="btn-primary"
            onClick={() => {
              mergeProducts(keep, picked);
              onClose();
            }}
          >
            {t.confirm}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-2">
      <p className="text-muted">{t.pick(keep.name)}</p>
      <input className="field" placeholder={t.search} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={t.search} />
      {options.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted">{t.none}</p>
      ) : (
        <ul className="card max-h-[50dvh] divide-y divide-line overflow-y-auto">
          {options.map((p) => (
            <li key={p.id}>
              <button className="flex min-h-[56px] w-full items-center gap-3 px-3 text-left" onClick={() => setPicked(p)}>
                <ProductThumb product={p} size="sm" />
                <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                <Icon name="chevron" size={18} className="text-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
