import { useMemo } from 'react';
import { productStats } from '../domain/stats';
import type { Product } from '../domain/types';
import { formatDate, formatDecimal, m } from '../i18n';
import { formatCurrency } from '../lib/currency';
import { useEvents, usePurchases } from '../lib/stats';
import { priceOf, storeLabel, storePricesOf } from '../domain/spending';
import { MonthColumns } from './charts/MonthColumns';

const DAY = 86_400_000;

/** Consumo de un producto (en su ficha): cuánto dura, cada cuánto se compra, por mes y cuándo se terminaría. */
export function ProductStats({ product }: { product: Product }) {
  const data = useEvents(product.household_id);
  const purchases = usePurchases(product.household_id);
  const price = purchases.status === 'ready' ? priceOf(purchases.lines, product.id) : null;
  const stores = purchases.status === 'ready' ? storePricesOf(purchases.lines, product.id) : [];
  const t = m.stats.product;
  const s = useMemo(() => {
    if (data.status !== 'ready') return null;
    const own = data.events.filter((e) => e.product_id === product.id);
    return productStats(own, { now: new Date(), months: 6, product });
  }, [data, product]);

  if (data.status !== 'ready' || !s) return null;
  const priceBlock = price && (
    <div className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
      <div>
        <div className="text-sm text-muted">{m.money.product.price}</div>
        <div className="text-xl font-semibold">{formatCurrency(price.last, { cents: price.last < 100 })}</div>
      </div>
      <div className="text-right text-sm text-muted">
        {price.change != null && Math.abs(price.change) >= 0.01 && (
          <div className={price.change > 0 ? 'text-[#B53A2A] dark:text-out' : 'text-[#2E7A4A] dark:text-ok'}>
            {m.money.product.change(`${formatDecimal(Math.abs(price.change) * 100, 0)} %`, price.change > 0)}
          </div>
        )}
        <div>{m.money.product.paid(formatDate(price.lastAt))}</div>
      </div>
    </div>
  );
  // Precio en cada súper (si se compró en más de uno)
  const storesBlock = stores.length > 1 && (
    <div className="space-y-1 border-t border-line pt-3">
      <div className="text-sm text-muted">{m.money.byStore}</div>
      <ul className="space-y-0.5 text-sm">
        {stores.map((st, i) => (
          <li key={st.store} className="flex justify-between gap-3">
            <span className={i === 0 ? 'font-medium text-ink' : 'text-muted'}>{storeLabel(st.store)}</span>
            <span className={`tabular-nums ${i === 0 ? 'font-medium text-[#2E7A4A] dark:text-ok' : 'text-muted'}`}>
              {formatCurrency(st.price, { cents: st.price < 100 })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
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
        <>
          <p className="text-sm text-muted">{t.noData}</p>
          {priceBlock && <div className="card space-y-3 p-4">{priceBlock}{storesBlock}</div>}
        </>
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
          {priceBlock}
          {storesBlock}
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
