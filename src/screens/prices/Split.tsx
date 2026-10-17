import { useMemo, useState } from 'react';
import { splitShopping } from '../../domain/priceTools';
import { storeLabel } from '../../domain/spending';
import { m } from '../../i18n';
import { formatCurrency } from '../../lib/currency';
import { listSplitItems, usePriceCenter } from '../../lib/priceCenter';
import { useView } from '../../store/store';
import { GREEN, NeedsStores, PriceHeader } from './common';

const KEY = 'stoka:dos-super';
const THRESHOLDS = [200, 300, 500];

function readThreshold(): number {
  try {
    return Number(localStorage.getItem(KEY)) || 300;
  } catch {
    return 300;
  }
}

/** ¿Conviene repartir la lista entre dos súper? */
export function Split() {
  const view = useView()!;
  const c = usePriceCenter(view);
  const t = m.priceCenter.split;
  const [threshold, setThreshold] = useState(readThreshold);
  const list = useMemo(() => listSplitItems(view, c.sipc, c.opts), [view, c.sipc, c.opts]);
  const plan = useMemo(() => splitShopping(list.items), [list]);
  const pick = (v: number) => {
    setThreshold(v);
    try {
      localStorage.setItem(KEY, String(v));
    } catch {
      /* sin almacenamiento */
    }
  };
  const worth = plan?.pair && plan.saving >= threshold;

  return (
    <>
      <PriceHeader title={t.title} />
      <div className="space-y-5 px-5 pb-6">
        <p className="text-sm text-muted">{t.hint}</p>
        {!c.sipc.configured ? (
          <NeedsStores sipc={c.sipc} text={m.prices.today.intro} />
        ) : list.total === 0 ? (
          <p className="card p-4 text-sm text-muted">{t.emptyList}</p>
        ) : !plan ? (
          <p className="card p-4 text-sm text-muted">{t.noPrices}</p>
        ) : (
          <>
            <div className="space-y-1.5">
              <span className="text-sm text-muted">{t.worth}</span>
              <div className="flex gap-2">
                {THRESHOLDS.map((v) => (
                  <button
                    key={v}
                    className={`chip min-h-[40px] tabular-nums ${threshold === v ? 'border-primary bg-primary text-on-primary' : 'bg-surface'}`}
                    onClick={() => pick(v)}
                  >
                    {formatCurrency(v)}
                  </button>
                ))}
              </div>
            </div>

            <section className="card space-y-1 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{t.single(storeLabel(plan.single.store))}</span>
                <span className="font-semibold tabular-nums">{formatCurrency(plan.single.total)}</span>
              </div>
              {plan.pair && (
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{t.pair}</span>
                  <span className={`font-semibold tabular-nums ${worth ? GREEN : ''}`}>{formatCurrency(plan.pair.total)}</span>
                </div>
              )}
              <p className={`pt-2 font-semibold ${worth ? GREEN : ''}`}>
                {!plan.pair
                  ? t.allOne(storeLabel(plan.single.store))
                  : worth
                    ? t.saving(formatCurrency(plan.saving))
                    : t.notWorth(formatCurrency(plan.saving), storeLabel(plan.single.store))}
              </p>
              <p className="text-xs text-muted">{t.compared(plan.compared + plan.uncovered.length, list.total)}</p>
            </section>

            {worth &&
              plan.pair!.stores.map((store) => (
                <section key={store} className="space-y-2">
                  <h2 className="section-title">{t.buyAt(storeLabel(store))}</h2>
                  <ul className="card divide-y divide-line px-4">
                    {plan.pair!.byStore[store].map((x) => (
                      <li key={x.id} className="flex min-h-[48px] items-center gap-3">
                        <span className="min-w-0 flex-1 truncate">
                          {x.quantity > 1 && <span className="tabular-nums text-muted">{x.quantity} × </span>}
                          {x.name}
                        </span>
                        <span className="shrink-0 tabular-nums">{formatCurrency(x.prices[store] * x.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}

            {plan.uncovered.length > 0 && (
              <section className="space-y-2">
                <h2 className="section-title">{t.uncovered(storeLabel(plan.single.store))}</h2>
                <ul className="card divide-y divide-line px-4">
                  {plan.uncovered.map((x) => (
                    <li key={x.id} className="flex min-h-[48px] items-center gap-3">
                      <span className="min-w-0 flex-1 truncate">{x.name}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}
