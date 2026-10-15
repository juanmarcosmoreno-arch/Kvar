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
import { compareText, m } from '../i18n';

type StatusFilter = 'all' | StockStatus | 'staple';

const STATUS_FILTERS: StatusFilter[] = ['all', 'ok', 'low', 'out', 'staple'];

function filterLabel(f: StatusFilter): string {
  if (f === 'all') return m.stock.inventory.filterAll;
  if (f === 'staple') return m.stock.inventory.filterStaple;
  return m.common.status[f];
}

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
      ps.sort((a, b) => Number(b.unidentified) - Number(a.unidentified) || severity(b.status) - severity(a.status) || compareText(a.name, b.name));
    }
    return ps;
  }, [view.products, q, status, location, category]);

  return (
    <>
      <Header
        title={m.stock.inventory.title}
        right={
          <button
            aria-label={m.stock.inventory.addProduct}
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
          <input className="field rounded-full pl-12" placeholder={m.stock.inventory.searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} type="search" />
        </label>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`chip ${status === f ? 'border-primary/40 bg-primary/10 text-primary' : 'border-transparent text-muted'}`}
            >
              {f !== 'all' && f !== 'staple' && <StatusDot status={f} size={8} />}
              {filterLabel(f)}
            </button>
          ))}
        </div>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5">
          {locations.map((l) => (
            <button
              key={l.id}
              onClick={() => setLocation(location === l.id ? null : l.id)}
              className={`chip ${location === l.id ? 'border-primary bg-primary text-on-primary' : 'bg-surface text-ink'}`}
            >
              <Icon name={locationIcon(l.icon, l.name)} size={16} />
              {l.name}
            </button>
          ))}
        </div>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(category === c.id ? null : c.id)}
              className={`chip ${category === c.id ? 'border-primary bg-primary text-on-primary' : 'bg-surface text-ink'}`}
            >
              <Icon name={categoryIcon(c.name)} size={16} />
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
            icon="box"
            title={view.products.length ? m.stock.inventory.noMatchTitle : m.stock.inventory.emptyTitle}
            hint={view.products.length ? m.stock.inventory.noMatchHint : m.stock.inventory.emptyHint}
            action={{ label: m.stock.inventory.addProduct, run: () => ui.openAdd({ name: q, location_id: location, category_id: category }) }}
          />
        )}
        {products.length > 0 && (
          <p className="pt-3 text-center text-xs text-muted">{m.stock.inventory.swipeHint}</p>
        )}
      </div>
    </>
  );
}
