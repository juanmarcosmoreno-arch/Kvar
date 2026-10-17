import { useMemo, useState } from 'react';
import { atStore, discountAppliesAt, type StoreTip } from '../domain/prices';
import { storeKey, storeLabel } from '../domain/spending';
import type { Snapshot } from '../domain/types';
import { compareText, formatDecimal, m } from '../i18n';
import { formatCurrency } from '../lib/currency';
import { addStore, setHereStore, useHereStore } from '../lib/pricePrefs';
import { usePriceData } from '../lib/priceData';
import { useSipc } from '../lib/sipc';
import { isSipcStore, sipcStoreKey } from '../domain/sipc';
import { useUI } from '../store/ui';
import { Icon } from './Icon';

const pct = (x: number) => `${formatDecimal(Math.abs(x) * 100, 0)} %`;

/**
 * «Estoy en el súper»: en qué súper estás y, con eso, qué de la lista conviene llevar acá, qué conviene comprar
 * en otro lado y qué cosas de siempre están más baratas acá.
 */
export function AtStoreCard({ view }: { view: Snapshot }) {
  const t = m.prices.here;
  const ui = useUI();
  const data = usePriceData(view.household.id);
  const here = useHereStore();
  const [picking, setPicking] = useState(false);
  const [other, setOther] = useState<string | null>(null);
  const sipc = useSipc(view.products);
  const today = new Date().getDay();
  // En un súper de precios.uy se compara con los precios de hoy; si no, con los tickets
  const lines = here && isSipcStore(here) ? sipc.lines : data.lines;
  const tips = useMemo(
    () => (here ? atStore(lines, view.products, view.list, here, { discounts: data.discounts, when: today }) : null),
    [lines, data.discounts, view.products, view.list, here, today],
  );
  // Los súper de precios.uy elegidos (precios de hoy) y los de los tickets, por nombre
  const choices = [...new Set([...sipc.prefs.stores.map(sipcStoreKey), ...data.stores])].sort((a, b) => compareText(storeLabel(a), storeLabel(b)));

  if (data.status !== 'ready' || choices.length === 0) return null;

  if (!here || picking) {
    return (
      <section className="card space-y-3 p-4">
        <h2 className="font-semibold">{t.question}</h2>
        <div className="flex flex-wrap gap-2">
          {choices.map((s) => (
            <button
              key={s}
              className={`chip min-h-tap ${here === s ? 'border-primary bg-primary text-on-primary' : 'bg-surface'}`}
              onClick={() => {
                setHereStore(s);
                setPicking(false);
              }}
            >
              <Icon name="store" size={16} /> {storeLabel(s)}
            </button>
          ))}
          {other === null && (
            <button className="chip min-h-tap border-dashed bg-surface text-muted" onClick={() => setOther('')}>
              {t.other}
            </button>
          )}
        </div>
        {other !== null && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const key = addStore(other);
              if (!key) return;
              setHereStore(key);
              setOther(null);
              setPicking(false);
            }}
          >
            <input className="field" autoFocus placeholder={m.prices.receipt.otherPlaceholder} value={other} onChange={(e) => setOther(e.target.value)} />
            <button type="submit" className="btn-primary shrink-0 px-4" disabled={!other.trim()}>
              <Icon name="check" size={18} />
            </button>
          </form>
        )}
      </section>
    );
  }

  // Los descuentos de hoy acá (de todo o de una marca)
  const todays = data.discounts.filter((d) => d.percent > 0 && discountAppliesAt(d, here) && (!d.days.length || d.days.includes(today)));
  const hasPrices = lines.some((l) => l.product_id && storeKey(l.store) === here);
  const empty = tips && !tips.buyHere.length && !tips.elsewhere.length && !tips.deals.length;

  return (
    <section className="card space-y-3 border-primary/30 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon name="store" size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{t.title(storeLabel(here))}</span>
          {todays.map((d) => (
            <span key={d.id} className="block text-sm text-primary">
              {t.today(`${d.percent} %`, d.card)}
              {d.brand.trim() && ` · ${m.prices.discounts.onlyBrand(d.brand.trim())}`}
            </span>
          ))}
        </span>
        <button className="min-h-tap shrink-0 px-1 text-sm font-medium text-primary" onClick={() => setPicking(true)}>
          {t.change}
        </button>
        <button className="flex min-h-tap min-w-[36px] shrink-0 items-center justify-center text-muted" aria-label={m.common.close} onClick={() => setHereStore(null)}>
          <Icon name="x" size={18} />
        </button>
      </div>

      {tips && tips.buyHere.length > 0 && (
        <TipList title={t.buyHere} icon="check" tone="ok" tips={tips.buyHere} detail={(x) => t.lessThan(pct(x.saving), storeLabel(x.other.store))} onOpen={ui.openProduct} />
      )}
      {tips && tips.elsewhere.length > 0 && (
        <TipList
          title={t.elsewhere}
          icon="up"
          tone="warn"
          tips={tips.elsewhere}
          detail={(x) => t.cheaperAt(storeLabel(x.other.store), formatCurrency(x.other.effective), pct(x.saving))}
          onOpen={ui.openProduct}
        />
      )}
      {tips && tips.deals.length > 0 && (
        <TipList title={t.deals} icon="tag" tone="ok" tips={tips.deals} detail={(x) => t.lessThan(pct(x.saving), storeLabel(x.other.store))} onOpen={ui.openProduct} />
      )}
      {empty && <p className="text-sm text-muted">{hasPrices ? t.nothing : t.noPrices(storeLabel(here))}</p>}
    </section>
  );
}

function TipList({
  title, icon, tone, tips, detail, onOpen,
}: {
  title: string;
  icon: 'check' | 'up' | 'tag';
  tone: 'ok' | 'warn';
  tips: StoreTip[];
  detail: (x: StoreTip) => string;
  onOpen: (id: string) => void;
}) {
  const color = tone === 'ok' ? 'text-[#2E7A4A] dark:text-ok' : 'text-[#9A6300] dark:text-low';
  return (
    <div className="space-y-1">
      <h3 className={`flex items-center gap-1.5 text-sm font-semibold ${color}`}>
        <Icon name={icon} size={16} /> {title}
      </h3>
      <ul className="divide-y divide-line">
        {tips.map((x) => (
          <li key={x.productId}>
            <button className="flex min-h-[48px] w-full items-center gap-3 py-1.5 text-left" onClick={() => onOpen(x.productId)}>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{x.name}</span>
                <span className="block truncate text-xs text-muted">{detail(x)}</span>
              </span>
              <span className="shrink-0 text-sm font-medium tabular-nums">{formatCurrency(x.here)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
