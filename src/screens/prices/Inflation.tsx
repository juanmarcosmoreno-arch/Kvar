import { useMemo } from 'react';
import { personalInflation } from '../../domain/priceTools';
import { formatDecimal, locale, m } from '../../i18n';
import { usePriceData } from '../../lib/priceData';
import { useView } from '../../store/store';
import { GREEN, PriceHeader } from './common';

const signed = (x: number) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${formatDecimal(Math.abs(x) * 100, 1)} %`;
const tone = (x: number) => (x > 0.001 ? 'text-[#B53A2A] dark:text-out' : x < -0.001 ? GREEN : 'text-muted');

/** Tu inflación: cuánto cambiaron los precios de lo que comprás vos (según tus tickets) */
export function Inflation() {
  const view = useView()!;
  const data = usePriceData(view.household.id);
  const t = m.priceCenter.inflation;
  const inf = useMemo(() => personalInflation(data.lines, new Map(view.products.map((p) => [p.id, p.name]))), [data.lines, view.products]);
  const month = (d: Date) => d.toLocaleDateString(locale, { month: 'long' });
  const maxAbs = Math.max(0.01, ...inf.months.map((x) => Math.abs(x.change ?? 0)));
  return (
    <>
      <PriceHeader title={t.title} />
      <div className="space-y-6 px-5 pb-6">
        <p className="text-sm text-muted">{t.hint}</p>
        {!inf.last ? (
          <p className="card p-4 text-sm text-muted">{data.status === 'loading' ? m.money.loading : t.none}</p>
        ) : (
          <>
            <section className="card p-5 text-center">
              <p className="text-sm text-muted">{t.last(month(inf.last.start))}</p>
              <p className={`text-4xl font-semibold tabular-nums ${tone(inf.last.change!)}`}>{signed(inf.last.change!)}</p>
              <p className="text-sm text-muted">
                {inf.last.change! > 0.001 ? t.up : inf.last.change! < -0.001 ? t.down : t.flat} · {t.compared(inf.last.compared)}
              </p>
            </section>
            <section className="space-y-2">
              <h2 className="section-title">{t.monthly}</h2>
              <ul className="card divide-y divide-line px-4">
                {inf.months.map((x) => (
                  <li key={x.key} className="flex min-h-[48px] items-center gap-3">
                    <span className="w-24 shrink-0 capitalize">{month(x.start)}</span>
                    <span className="relative h-2 flex-1 rounded-full bg-sunken" aria-hidden="true">
                      {x.change != null && (
                        <span
                          className={`absolute top-0 h-2 rounded-full ${x.change > 0 ? 'left-1/2 bg-out/70' : 'right-1/2 bg-ok'}`}
                          style={{ width: `${(Math.abs(x.change) / maxAbs) * 50}%` }}
                        />
                      )}
                    </span>
                    <span className={`w-20 shrink-0 text-right text-sm tabular-nums ${x.change != null ? tone(x.change) : 'text-muted'}`}>
                      {x.change != null ? signed(x.change) : t.noData}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted">{t.note}</p>
            </section>
            {inf.movers.length > 0 && (
              <section className="space-y-2">
                <h2 className="section-title">{t.movers}</h2>
                <ul className="card divide-y divide-line px-4">
                  {inf.movers.map((x) => (
                    <li key={x.productId} className="flex min-h-[48px] items-center gap-3">
                      <span className="min-w-0 flex-1 truncate">{x.name}</span>
                      <span className={`shrink-0 font-semibold tabular-nums ${tone(x.change)}`}>{signed(x.change)}</span>
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
