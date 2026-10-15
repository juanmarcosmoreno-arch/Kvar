import { useMemo, useState } from 'react';
import { searchProducts } from '../domain/aliases';
import { severity } from '../domain/status';
import type { StockStatus } from '../domain/types';
import { Header } from '../components/Shell';
import { Icon } from '../components/Icon';
import { ProductRow } from '../components/ProductRow';
import { StatusDot } from '../components/Status';
import { categoryIcon, locationIcon } from '../lib/categoryIcon';
import { useView } from '../store/store';
import { useUI } from '../store/ui';
import { EmptyCard } from './Home';

type StatusFilter = 'all' | StockStatus | 'staple';

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'ok', label: 'Hay' },
  { id: 'low', label: 'Queda poco' },
  { id: 'out', label: 'No hay' },
  { id: 'staple', label: 'Básicos' },
];

export function Inventory() {
  const view = useView()!;
  const ui = useUI();
  const [q, setQ] = useState('');
  const [status, setStatusFilter] = useState<StatusFilter>('all');
  const [location, setLocation] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const cat = new Map(view.categories.map((c) => [c.id, c.name]));
  const locations = [...view.locations].sort((a, b) => a.sort_order - b.sort_order);
  const categories = [...view.categories].sort((a, b) => a.sort_order - b.sort_order);

  const products = useMemo(() => {
    let ps = q.trim() ? searchProducts(q, view.products) : [...view.products];
    if (status === 'staple') ps = ps.filter((p) => p.is_staple);
    else if (status !== 'all') ps = ps.filter((p) => p.status === status);
    if (location) ps = ps.filter((p) => p.location_id === location);
    if (category) ps = ps.filter((p) => p.category_id === category);
    if (!q.trim()) {
      ps.sort((a, b) => Number(b.unidentified) - Number(a.unidentified) || severity(b.status) - severity(a.status) || a.name.localeCompare(b.name, 'es'));
    }
    return ps;
  }, [view.products, q, status, location, category]);

  return (
    <>
      <Header
        title="Productos"
        right={
          <button
            aria-label="Agregar producto"
            className="flex min-h-tap min-w-tap items-center justify-center rounded-full text-primary"
            onClick={() => ui.openAdd({ location_id: location, category_id: category })}
          >
            <Icon name="plus" size={28} />
          </button>
        }
      />
      <div className="sticky top-0 z-10 space-y-3 bg-bg/95 px-5 pb-3 pt-1 backdrop-blur">
        <label className="relative block">
          <Icon name="search" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input className="field rounded-full pl-12" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} type="search" />
        </label>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`chip ${status === f.id ? 'bg-primary/15 font-semibold text-primary' : 'text-muted'}`}
            >
              {f.id !== 'all' && f.id !== 'staple' && <StatusDot status={f.id} size={8} />}
              {f.label}
            </button>
          ))}
        </div>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5">
          {locations.map((l) => (
            <button
              key={l.id}
              onClick={() => setLocation(location === l.id ? null : l.id)}
              className={`chip ${location === l.id ? 'bg-primary text-on-primary' : 'bg-surface shadow-card'}`}
            >
              <span aria-hidden>{locationIcon(l.icon, l.name)}</span>
              {l.name}
            </button>
          ))}
        </div>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(category === c.id ? null : c.id)}
              className={`chip ${category === c.id ? 'bg-primary text-on-primary' : 'bg-surface shadow-card'}`}
            >
              <span aria-hidden>{categoryIcon(c.name)}</span>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 px-5 pt-1">
        {products.map((p) => (
          <ProductRow key={p.id} product={p} categoryName={cat.get(p.category_id ?? '')} onOpen={() => ui.openProduct(p.id)} />
        ))}
        {products.length === 0 && (
          <EmptyCard
            emoji="🫙"
            title={view.products.length ? 'Nada con estos filtros' : 'Todavía no hay productos'}
            hint={view.products.length ? 'Probá sacando algún filtro.' : 'Agregá lo que tenés en casa; solo hace falta el nombre.'}
            action={{ label: 'Agregar producto', run: () => ui.openAdd({ name: q, location_id: location, category_id: category }) }}
          />
        )}
        {products.length > 0 && (
          <p className="pt-3 text-center text-xs text-muted">Deslizá a la izquierda para «se está terminando», a la derecha para «Hay».</p>
        )}
      </div>
    </>
  );
}
