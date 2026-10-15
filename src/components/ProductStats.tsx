import { useMemo } from 'react';
import { productStats } from '../domain/stats';
import type { Product } from '../domain/types';
import { formatDate, formatDecimal, m } from '../i18n';
import { useEvents } from '../lib/stats';
import { MonthColumns } from './charts/MonthColumns';

const DAY = 86_400_000;

/** Consumo de un producto (en su ficha): cuánto dura, cada cuánto se compra, por mes y cuándo se terminaría. */
export function ProductStats({ product }: { product: Product }) {
  const data = useEvents(product.household_id);
  const t = m.stats.product;
  const s = useMemo(() => {
    if (data.status !== 'ready') return null;
    const own = data.events.filter((e) => e.product_id === product.id);
    return productStats(own, { now: new Date(), months: 6, product });
  }, [data, product]);

  if (data.status !== 'ready' || !s) return null;
  const counted = product.track_quantity && s.usedPerMonth != null && s.used > 0;
  const enough = s.bought + s.ranOut >= 2;

  const days = (n: number | null) => (n == null ? m.stats.product.noDataShort : t.days(formatDecimal(n, 0)));
  const nextOut = (() => {
    if (!s.nextOutAt) return null;
    const d = Math.round((Date.parse(s.nextOutAt) - Date.now()) / DAY);
    return t.nextOut(d <= 0 ? m.stats.soon.today : m.stats.soon.inDays(d));
  })();

  return (
    <section className="space-y-3">
      <h3 className="section-title">{t.title}</h3>
      {!enough ? (
        <p className="text-sm text-muted">{t.noData}</p>
      ) : (
        <div className="card space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            {counted ? (
              <Figure label={t.usedPerMonth} value={formatDecimal(s.usedPerMonth!, 0)} />
            ) : (
              <Figure label={t.lasts} value={days(s.avgDaysLasts)} />
            )}
            <Figure label={t.every} value={days(s.avgDaysBetweenPurchases)} />
          </div>
          <MonthColumns
            data={s.months.map((x) => ({ key: x.key, start: x.start, value: counted ? x.used : x.bought }))}
            label={counted ? m.stats.monthly.showUsed : m.stats.monthly.showBought}
            format={(n) => formatDecimal(n, 0)}
          />
          <div className="space-y-0.5 text-sm text-muted">
            {nextOut && <p className="font-medium text-ink">{nextOut}</p>}
            {s.lastBought && <p>{t.lastBought(formatDate(s.lastBought))}</p>}
            {s.ranOut > 0 && <p>{t.ranOut}: {t.times(s.ranOut)}</p>}
          </div>
        </div>
      )}
    </section>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm text-muted">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
