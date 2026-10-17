import { useMemo, useState } from 'react';
import { offers } from '../../domain/prices';
import type { AlertKind } from '../../domain/priceTools';
import { allItems, itemLabel, type SipcItem } from '../../domain/sipc';
import { parseAmount } from '../../domain/split';
import { storeLabel } from '../../domain/spending';
import { m } from '../../i18n';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { formatCurrency } from '../../lib/currency';
import { addPriceAlert, alertRule, deletePriceAlert, hitText } from '../../lib/priceAlerts';
import { usePriceCenter } from '../../lib/priceCenter';
import { useView } from '../../store/store';
import { toast } from '../../store/toast';
import { ItemPicker, NeedsStores, PriceHeader } from './common';

/** Alertas de precio: las que se cumplen hoy, las que tenés y crear una nueva */
export function Alerts() {
  const view = useView()!;
  const c = usePriceCenter(view);
  const t = m.priceCenter.alerts;
  const [adding, setAdding] = useState(false);
  const items = useMemo(() => new Map((c.sipc.data ? allItems(c.sipc.data) : []).map((x) => [x.key, x])), [c.sipc.data]);
  const hitIds = new Set(c.hits.map((h) => h.alert.id));

  return (
    <>
      <PriceHeader
        title={t.title}
        right={
          c.sipc.configured && (
            <button className="-mr-2 flex min-h-tap min-w-tap items-center justify-center text-primary" aria-label={t.add} onClick={() => setAdding(true)}>
              <Icon name="plus" />
            </button>
          )
        }
      />
      <div className="space-y-6 px-5 pb-6">
        <p className="text-sm text-muted">{t.hint}</p>
        {!c.sipc.configured && <NeedsStores sipc={c.sipc} text={t.needsStores} />}

        {c.hits.length > 0 && (
          <section className="space-y-2">
            <h2 className="section-title">{t.today}</h2>
            {c.hits.map((h) => (
              <div key={h.alert.id} className="flex items-start gap-3 rounded-2xl border border-low/40 bg-low/10 p-4 text-sm text-[#7A4E00] dark:text-low">
                <Icon name="bell" size={20} className="mt-0.5 shrink-0" />
                <span>{hitText(h)}</span>
              </div>
            ))}
          </section>
        )}

        <section className="space-y-2">
          <h2 className="section-title">{t.active}</h2>
          {c.alerts.length ? (
            <ul className="card divide-y divide-line px-4">
              {c.alerts.map((a) => {
                const item = items.get(a.item);
                const best = item ? offers(item.prices, c.opts.discounts, c.opts.when)[0] : null;
                return (
                  <li key={a.id} className="flex min-h-[60px] items-center gap-3 py-2">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${hitIds.has(a.id) ? 'bg-low' : 'bg-line'}`} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{itemLabel(a.name)}</span>
                      <span className="block truncate text-sm text-muted">
                        {alertRule(a)}
                        {best && ` · ${t.now(formatCurrency(best.effective), storeLabel(best.store))}`}
                      </span>
                    </span>
                    <button
                      className="-mr-2 flex min-h-tap min-w-tap shrink-0 items-center justify-center text-muted"
                      aria-label={t.remove(itemLabel(a.name))}
                      onClick={() => deletePriceAlert(a.id)}
                    >
                      <Icon name="trash" size={20} />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="card p-4 text-sm text-muted">{t.none}</p>
          )}
          {c.sipc.configured && (
            <button className="btn-primary w-full" onClick={() => setAdding(true)}>
              <Icon name="plus" size={18} /> {t.add}
            </button>
          )}
          <p className="text-xs text-muted">{t.notifyHint}</p>
        </section>
      </div>

      <NewAlertSheet open={adding} onClose={() => setAdding(false)} c={c} />
    </>
  );
}

/** Nueva alerta: elegir el producto y la condición (o abrir ya con un producto elegido, desde «¿Está caro?») */
export function NewAlertSheet({
  open, onClose, c, initial = null,
}: { open: boolean; onClose: () => void; c: ReturnType<typeof usePriceCenter>; initial?: SipcItem | null }) {
  const t = m.priceCenter.alerts;
  const [picked, setPicked] = useState<SipcItem | null>(null);
  const item = picked ?? initial;
  const close = () => {
    setPicked(null);
    onClose();
  };
  return (
    <Sheet open={open} onClose={close} title={item ? itemLabel(item.name) : t.pickItem}>
      <div className="pb-6">
        {item ? (
          <AlertForm key={item.key} item={item} c={c} onDone={close} />
        ) : (
          <ItemPicker sipc={c.sipc} placeholder={t.searchItem} onPick={setPicked} />
        )}
      </div>
    </Sheet>
  );
}

function AlertForm({ item, c, onDone }: { item: SipcItem; c: ReturnType<typeof usePriceCenter>; onDone: () => void }) {
  const t = m.priceCenter.alerts;
  const best = offers(item.prices, c.opts.discounts, c.opts.when)[0];
  const [kind, setKind] = useState<AlertKind>('below');
  // Por defecto: un 10 % menos que hoy, redondeado
  const [price, setPrice] = useState(String(Math.round((best.effective * 0.9) / 5) * 5));
  const [percent, setPercent] = useState(10);
  const value = kind === 'below' ? parseAmount(price) : kind === 'cheap' ? percent : null;
  const valid = kind !== 'below' || (value != null && value > 0);
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">{t.now(formatCurrency(best.effective), storeLabel(best.store))}</p>
      <div className="space-y-2">
        <span className="text-sm font-medium">{t.kind}</span>
        <div className="card divide-y divide-line" role="radiogroup" aria-label={t.kind}>
          {(['below', 'offer', 'cheap'] as AlertKind[]).map((k) => (
            <button key={k} role="radio" aria-checked={kind === k} className="flex min-h-[52px] w-full items-center gap-3 px-4 text-left" onClick={() => setKind(k)}>
              <span className="min-w-0 flex-1 font-medium">{k === 'below' ? t.kindBelow : k === 'offer' ? t.kindOffer : t.kindCheap}</span>
              {kind === k && <Icon name="check" size={20} className="text-primary" />}
            </button>
          ))}
        </div>
      </div>
      {kind === 'below' && (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">{t.maxPrice}</span>
          <input className="field tabular-nums" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
      )}
      {kind === 'cheap' && (
        <div className="space-y-1.5">
          <span className="text-sm font-medium">{t.percent}</span>
          <div className="flex gap-2">
            {[5, 10, 15, 20].map((p) => (
              <button
                key={p}
                className={`chip min-h-[40px] tabular-nums ${percent === p ? 'border-primary bg-primary text-on-primary' : 'bg-surface'}`}
                onClick={() => setPercent(p)}
              >
                {p} %
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        className="btn-primary w-full"
        disabled={!valid}
        onClick={() => {
          addPriceAlert({ item: item.key, name: item.name, kind, value });
          toast(t.saved);
          onDone();
        }}
      >
        {t.save}
      </button>
    </div>
  );
}
