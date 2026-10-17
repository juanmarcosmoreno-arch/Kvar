import { useState } from 'react';
import type { StoreDiscount } from '../domain/prices';
import { parseAmount } from '../domain/split';
import { storeLabel } from '../domain/spending';
import { compareText, formatList, m } from '../i18n';
import { formatCurrency } from '../lib/currency';
import { addStore, deleteDiscount, removeStore, saveDiscount, setStoreCompared } from '../lib/pricePrefs';
import { pricesPerStore, WEEK, weekdayName, type PriceData } from '../lib/priceData';
import { useSipcPrefs } from '../lib/sipc';
import { toast } from '../store/toast';
import { Icon } from './Icon';
import { Sheet } from './Sheet';

/** «Tienda Inglesa, Disco y Géant» */
export const discountStores = (d: StoreDiscount) => formatList(d.stores.map(storeLabel));

/** «15 % · solo Conaprole · mar y jue · Itaú · tope $ 1.500» */
export function discountSummary(d: StoreDiscount): string {
  const t = m.prices.discounts;
  const days = d.days.length ? formatList(WEEK.filter((x) => d.days.includes(x)).map((x) => weekdayName(x))) : t.everyDay;
  return [`${d.percent} %`, d.brand.trim() ? t.onlyBrand(d.brand.trim()) : '', days, d.card.trim(), d.cap ? t.capText(formatCurrency(d.cap)) : '']
    .filter(Boolean)
    .join(' · ');
}

/** Mis supermercados: cuáles se comparan, y agregar uno a mano. */
export function StoresEditor({ data }: { data: PriceData }) {
  const t = m.prices.stores;
  const [name, setName] = useState('');
  const counts = pricesPerStore(data.all);
  const hidden = new Set(data.prefs.hidden);
  const stores = [...data.allStores].sort((a, b) => compareText(storeLabel(a), storeLabel(b)));
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (addStore(name)) setName('');
  };
  return (
    <div className="space-y-2">
      <div className="card divide-y divide-line">
        {stores.map((s) => {
          const on = !hidden.has(s);
          const n = counts.get(s) ?? 0;
          return (
            <div key={s} className="flex min-h-[56px] items-center gap-2 pl-4">
              <button
                role="switch"
                aria-checked={on}
                className="flex min-h-[56px] min-w-0 flex-1 items-center gap-3 text-left"
                onClick={() => setStoreCompared(s, !on)}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-[1.5px] ${on ? 'border-primary bg-primary text-on-primary' : 'border-muted/50'}`}>
                  {on && <Icon name="check" size={14} strokeWidth={2.5} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{storeLabel(s)}</span>
                  <span className="block text-sm text-muted">{n ? t.prices(n) : t.noPrices}</span>
                </span>
              </button>
              {data.prefs.extra.includes(s) && !n ? (
                <button className="flex min-h-tap min-w-tap items-center justify-center text-muted" aria-label={t.remove(storeLabel(s))} onClick={() => removeStore(s)}>
                  <Icon name="x" size={18} />
                </button>
              ) : (
                <span className="w-3" />
              )}
            </div>
          );
        })}
      </div>
      <form onSubmit={add} className="flex gap-2">
        <input className="field" placeholder={t.addPlaceholder} value={name} onChange={(e) => setName(e.target.value)} enterKeyHint="done" />
        <button type="submit" className="btn-primary shrink-0 px-4" disabled={!name.trim()}>
          {t.add}
        </button>
      </form>
    </div>
  );
}

/** Descuentos con tarjeta: la lista y la hoja para agregar o editar. */
export function DiscountsEditor({ data }: { data: PriceData }) {
  const t = m.prices.discounts;
  const [editing, setEditing] = useState<StoreDiscount | 'new' | null>(null);
  const list = [...data.prefs.discounts].sort((a, b) => discountStores(a).localeCompare(discountStores(b)) || b.percent - a.percent);
  const sipc = useSipcPrefs();
  // Los súper de siempre, los de los tickets y las cadenas de los súper de precios.uy elegidos
  const choices = [...new Set([...data.stores, ...sipc.stores.map((s) => s.chain), ...data.allStores])];
  return (
    <div className="space-y-2">
      {list.length === 0 ? (
        <p className="card p-4 text-sm text-muted">{t.none}</p>
      ) : (
        <ul className="card divide-y divide-line">
          {list.map((d) => (
            <li key={d.id}>
              <button className="flex min-h-[60px] w-full items-center gap-3 px-4 py-2 text-left" onClick={() => setEditing(d)}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold tabular-nums text-primary">
                  −{d.percent}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{discountStores(d)}</span>
                  <span className="block truncate text-sm text-muted">{discountSummary(d)}</span>
                </span>
                <Icon name="edit" size={18} className="shrink-0 text-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button className="btn-ghost w-full" onClick={() => setEditing('new')}>
        <Icon name="plus" size={18} /> {t.add}
      </button>
      <DiscountSheet
        key={editing === 'new' ? 'new' : editing?.id ?? 'closed'}
        discount={editing}
        stores={choices}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

const PERCENTS = [5, 10, 15, 20, 25, 30, 40, 50];

function DiscountSheet({
  discount, stores, onClose,
}: { discount: StoreDiscount | 'new' | null; stores: string[]; onClose: () => void }) {
  const t = m.prices.discounts;
  const initial = discount && discount !== 'new' ? discount : null;
  const [chosen, setChosen] = useState<string[]>(initial?.stores ?? []);
  const [brand, setBrand] = useState(initial?.brand ?? '');
  const [percent, setPercent] = useState(String(initial?.percent ?? 15));
  const [days, setDays] = useState<number[]>(initial?.days ?? []);
  const [card, setCard] = useState(initial?.card ?? '');
  const [cap, setCap] = useState(initial?.cap ? String(initial.cap) : '');
  const value = Math.min(100, parseAmount(percent));
  const choices = [...new Set([...(initial?.stores ?? []), ...stores])].sort((a, b) => compareText(storeLabel(a), storeLabel(b)));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chosen.length || !(value > 0)) return;
    const capValue = parseAmount(cap);
    saveDiscount({
      id: initial?.id ?? crypto.randomUUID(),
      stores: chosen,
      brand: brand.trim(),
      percent: value,
      days: [...days].sort(),
      card: card.trim(),
      cap: capValue > 0 ? capValue : null,
    });
    toast(t.saved);
    onClose();
  };

  return (
    <Sheet open={discount !== null} onClose={onClose} title={initial ? t.editTitle : t.newTitle}>
      <form onSubmit={save} className="space-y-5 pb-4">
        <div className="space-y-1.5">
          <span className="text-sm text-muted">{t.store}</span>
          <p className="text-xs text-muted">{t.storesHint}</p>
          <div className="flex flex-wrap gap-2">
            {choices.map((s) => {
              const on = chosen.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={on}
                  className={`chip min-h-tap ${on ? 'border-primary bg-primary text-on-primary' : 'bg-surface'}`}
                  onClick={() => setChosen(on ? chosen.filter((x) => x !== s) : [...chosen, s])}
                >
                  {on && <Icon name="check" size={14} strokeWidth={2.5} />}
                  {storeLabel(s)}
                </button>
              );
            })}
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm text-muted">{t.brand}</span>
          <input className="field" placeholder={t.brandPlaceholder} value={brand} onChange={(e) => setBrand(e.target.value)} />
          <span className="block text-xs text-muted">{t.brandHint}</span>
        </label>

        <div className="space-y-1.5">
          <span className="text-sm text-muted">{t.percent}</span>
          <div className="flex flex-wrap items-center gap-2">
            {PERCENTS.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={value === p}
                className={`chip min-h-[40px] tabular-nums ${value === p ? 'border-primary bg-primary text-on-primary' : 'bg-surface'}`}
                onClick={() => setPercent(String(p))}
              >
                {p} %
              </button>
            ))}
            <label className="flex items-center gap-1">
              <input
                className="field w-20 text-center tabular-nums"
                inputMode="decimal"
                value={percent}
                aria-label={t.percent}
                onChange={(e) => setPercent(e.target.value.replace(/[^\d.,]/g, ''))}
              />
              <span className="text-muted">%</span>
            </label>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-sm text-muted">{t.days}</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              aria-pressed={days.length === 0}
              className={`chip min-h-[40px] ${days.length === 0 ? 'border-primary bg-primary text-on-primary' : 'bg-surface'}`}
              onClick={() => setDays([])}
            >
              {t.everyDay}
            </button>
            {WEEK.map((d) => {
              const on = days.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  aria-label={weekdayName(d, 'long')}
                  className={`chip min-h-[40px] min-w-[44px] justify-center ${on ? 'border-primary bg-primary text-on-primary' : 'bg-surface'}`}
                  onClick={() => setDays(on ? days.filter((x) => x !== d) : [...days, d])}
                >
                  {weekdayName(d)}
                </button>
              );
            })}
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm text-muted">{t.card}</span>
          <input className="field" placeholder={t.cardPlaceholder} value={card} onChange={(e) => setCard(e.target.value)} />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm text-muted">{t.cap}</span>
          <input
            className="field tabular-nums"
            inputMode="decimal"
            placeholder="1500"
            value={cap}
            onChange={(e) => setCap(e.target.value.replace(/[^\d.,]/g, ''))}
          />
        </label>

        <div className={`grid gap-2 ${initial ? 'grid-cols-2' : ''}`}>
          {initial && (
            <button
              type="button"
              className="btn text-out"
              onClick={() => {
                deleteDiscount(initial.id);
                onClose();
              }}
            >
              <Icon name="trash" size={18} /> {t.delete}
            </button>
          )}
          <button type="submit" className="btn-primary" disabled={!chosen.length || !(value > 0)}>
            {t.save}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
