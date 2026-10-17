/** Piezas que comparten las pantallas del centro de precios */
import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Basket } from '../../domain/prices';
import { allItems, itemLabel, searchItems, type SipcItem } from '../../domain/sipc';
import { storeLabel } from '../../domain/spending';
import { m } from '../../i18n';
import { Icon } from '../../components/Icon';
import { DiscountsEditor, StoresEditor } from '../../components/PriceSettings';
import { Header } from '../../components/Shell';
import { Sheet } from '../../components/Sheet';
import { StoresSheet } from '../../components/TodayPrices';
import { formatCurrency } from '../../lib/currency';
import type { PriceData } from '../../lib/priceData';
import type { SipcState } from '../../lib/sipc';

export const GREEN = 'text-[#2E7A4A] dark:text-ok';

/** Título con «volver» (y algo a la derecha) */
export function PriceHeader({ title, right }: { title: string; right?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <Header
      title={title}
      left={
        <button className="-ml-3 flex min-h-tap min-w-tap items-center justify-center text-muted" aria-label={m.common.back} onClick={() => navigate(-1)}>
          <Icon name="back" />
        </button>
      }
      right={right}
    />
  );
}

/** Ajustes de precios: súper de precios.uy, descuentos y súper de los tickets */
export function PriceSettingsSheet({ open, onClose, data, sipc }: { open: boolean; onClose: () => void; data: PriceData; sipc: SipcState }) {
  const t = m.prices;
  const c = m.priceCenter.stores;
  const [stores, setStores] = useState(false);
  return (
    <>
      <Sheet open={open} onClose={onClose} title={m.priceCenter.settings}>
        <div className="space-y-6 pb-6">
          <section className="space-y-2">
            <h3 className="section-title">{c.title}</h3>
            <p className="text-sm text-muted">{c.hint(sipc.prefs.stores.length)}</p>
            {sipc.prefs.stores.length > 0 && <p className="text-sm">{sipc.prefs.stores.map((s) => storeLabel(`${s.chain}-sipc-${s.id}`)).join(' · ')}</p>}
            <button className="btn-ghost w-full" onClick={() => setStores(true)}>
              <Icon name="store" size={18} /> {sipc.prefs.stores.length ? c.change : m.priceCenter.hero.setup}
            </button>
          </section>
          <section className="space-y-2">
            <h3 className="section-title">{t.discounts.title}</h3>
            <p className="text-sm text-muted">{t.discounts.hint}</p>
            <DiscountsEditor data={data} />
          </section>
          <section className="space-y-2">
            <h3 className="section-title">{t.stores.title}</h3>
            <p className="text-sm text-muted">{t.stores.hint}</p>
            <StoresEditor data={data} />
          </section>
        </div>
      </Sheet>
      <StoresSheet open={stores} onClose={() => setStores(false)} sipc={sipc} />
    </>
  );
}

/** Lo que saldría la canasta en cada súper, con barras */
export function BasketList({ basket }: { basket: Basket }) {
  const t = m.prices.basket;
  const max = Math.max(...basket.stores.map((s) => s.total));
  return (
    <>
      <ul className="divide-y divide-line">
        {basket.stores.map((s, i) => (
          <li key={s.store} className="space-y-1.5 py-2.5">
            <div className="flex items-center gap-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{storeLabel(s.store)}</span>
                <span className="block truncate text-sm text-muted">
                  {t.known(s.known, basket.items)}
                  {s.saved > 0 && ` · ${t.saved(formatCurrency(s.saved))}`}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className={`block font-semibold tabular-nums ${i === 0 ? GREEN : ''}`}>{formatCurrency(s.total)}</span>
                <span className={`block text-xs ${i === 0 ? GREEN : 'text-muted'}`}>
                  {i === 0 ? t.cheapest : t.more(formatCurrency(s.total - basket.stores[0].total))}
                </span>
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-sunken" aria-hidden="true">
              <div className={`h-1.5 rounded-full ${i === 0 ? 'bg-ok' : 'bg-primary/40'}`} style={{ width: `${(s.total / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
      {basket.stores.some((s) => s.known < basket.items) && <p className="text-xs text-muted">{t.estimated}</p>}
    </>
  );
}

/** Elegir un artículo de precios.uy: primero los tuyos, o buscando en todo */
export function ItemPicker({ sipc, placeholder, onPick }: { sipc: SipcState; placeholder: string; onPick: (item: SipcItem) => void }) {
  const [q, setQ] = useState('');
  const items = useMemo(() => (sipc.data ? allItems(sipc.data) : []), [sipc.data]);
  const byKey = useMemo(() => new Map(items.map((x) => [x.key, x])), [items]);
  const mine = useMemo(() => {
    const seen = new Set<string>();
    const out: { label: string; item: SipcItem }[] = [];
    for (const x of sipc.matches) {
      const item = byKey.get(x.item);
      if (!item || seen.has(x.item)) continue;
      seen.add(x.item);
      out.push({ label: x.product.name, item });
    }
    return out.sort((a, b) => a.label.localeCompare(b.label));
  }, [sipc.matches, byKey]);
  const found = q.trim() && sipc.data ? searchItems(sipc.data, q, 40) : [];
  const row = (key: string, title: string, sub: string, item: SipcItem) => (
    <li key={key}>
      <button className="flex min-h-[52px] w-full items-center gap-3 py-2 text-left" onClick={() => onPick(item)}>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{title}</span>
          <span className="block truncate text-sm text-muted">{sub}</span>
        </span>
        <span className="shrink-0 text-sm tabular-nums text-muted">{formatCurrency(Math.min(...item.prices.map((p) => p.price)))}</span>
        <Icon name="chevron" size={18} className="shrink-0 text-muted" />
      </button>
    </li>
  );
  return (
    <div className="space-y-3">
      <label className="relative block">
        <Icon name="search" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input className="field rounded-full pl-12" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} type="search" enterKeyHint="search" />
      </label>
      {q.trim() ? (
        found.length ? (
          <ul className="card divide-y divide-line px-4">{found.map((x) => row(x.key, itemLabel(x.name), m.prices.today.storeCount(x.prices.length), x))}</ul>
        ) : (
          <p className="card p-4 text-sm text-muted">{m.prices.today.searchNone}</p>
        )
      ) : (
        mine.length > 0 && (
          <section className="space-y-2">
            <h3 className="section-title">{m.priceCenter.history.yours}</h3>
            <ul className="card divide-y divide-line px-4">{mine.map((x) => row(x.item.key, x.label, itemLabel(x.item.name), x.item))}</ul>
          </section>
        )
      )}
    </div>
  );
}

/** Aviso cuando no hay súper de precios.uy elegidos */
export function NeedsStores({ sipc, text }: { sipc: SipcState; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="card space-y-3 p-4">
      <p className="text-sm text-muted">{text}</p>
      <button className="btn-primary w-full" onClick={() => setOpen(true)}>
        <Icon name="search" size={18} /> {m.priceCenter.hero.setup}
      </button>
      <StoresSheet open={open} onClose={() => setOpen(false)} sipc={sipc} />
    </section>
  );
}
