import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { spendingStats, storeLabel, whereCheaper } from '../domain/spending';
import { formatDecimal, m } from '../i18n';
import { categoryIcon } from '../lib/categoryIcon';
import { formatCurrency, formatCurrencyCompact } from '../lib/currency';
import { usePurchases } from '../lib/stats';
import { useView } from '../store/store';
import { useUI } from '../store/ui';
import { MonthColumns } from './charts/MonthColumns';
import { RankBars, StatTile } from './charts/RankBars';
import { Icon } from './Icon';
import { SplitCard } from './SplitCard';

const pct = (x: number) => `${formatDecimal(Math.abs(x) * 100, 0)} %`;

/** Gastos (pestaña de Estadísticas): sale de los precios de los tickets cargados. */
export function SpendingView({ months }: { months: number }) {
  const view = useView()!;
  const ui = useUI();
  const data = usePurchases(view.household.id);
  const t = m.money;
  const s = useMemo(
    () => (data.status === 'ready' ? spendingStats(data.lines, view.products, { now: new Date(), months }) : null),
    [data, view.products, months],
  );
  const where = useMemo(() => (data.status === 'ready' ? whereCheaper(data.lines, view.products) : null), [data, view.products]);

  if (data.status === 'loading') return <p className="text-muted">{t.loading}</p>;
  if (data.status === 'error') return <p className="card p-4 text-muted">{m.stats.error}</p>;
  if (!s || s.total === 0) {
    return (
      <>
        <p className="card p-5 text-muted">{t.empty}</p>
        {data.status === 'ready' && <SplitCard view={view} lines={data.lines} />}
      </>
    );
  }

  return (
    <>
      {data.cached && <p className="text-sm text-muted">{m.stats.offline}</p>}
      <div className="grid grid-cols-3 gap-2">
        <StatTile label={t.kpi.total} value={formatCurrencyCompact(s.total)} hint={m.stats.kpi.inRange(months)} />
        <StatTile label={t.kpi.perMonth} value={formatCurrencyCompact(s.perMonth)} hint={t.kpi.average} />
        <StatTile label={t.kpi.perTrip} value={s.perTrip == null ? '—' : formatCurrencyCompact(s.perTrip)} hint={t.kpi.trips(s.trips)} />
      </div>

      <SplitCard view={view} lines={data.lines} />

      <section className="card space-y-3 p-4">
        <h2 className="font-semibold">{t.monthly.title}</h2>
        <MonthColumns
          key={months}
          data={s.months.map((x) => ({ key: x.key, start: x.start, value: x.total }))}
          label={t.monthly.chartLabel}
          format={(n) => formatCurrency(n)}
          formatAxis={formatCurrencyCompact}
        />
      </section>

      {where && where.stores.length > 1 && (
        <section className="space-y-2">
          <h2 className="section-title">{t.stores.title}</h2>
          <p className="text-sm text-muted">{t.stores.hint}</p>
          <ul className="card divide-y divide-line">
            {where.stores.map((st, i) => (
              <li key={st.store} className="flex min-h-[56px] items-center gap-3 px-4 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{storeLabel(st.store)}</span>
                  <span className="text-sm text-muted">{t.stores.detail(st.cheapest, st.compared)}</span>
                </span>
                <span className={`shrink-0 text-sm font-medium ${i === 0 ? 'text-[#2E7A4A] dark:text-ok' : 'text-muted'}`}>
                  {i === 0 ? t.stores.cheapest : t.stores.over(pct(st.overCheapest))}
                </span>
              </li>
            ))}
          </ul>
          {where.deals.length > 0 && (
            <>
              <h3 className="section-title pt-2">{t.stores.dealsTitle}</h3>
              <ul className="card divide-y divide-line">
                {where.deals.slice(0, 6).map((d) => (
                  <li key={d.productId}>
                    <button
                      className="flex min-h-[56px] w-full items-center gap-3 px-4 py-2 text-left"
                      onClick={() => ui.openProduct(d.productId)}
                      aria-label={`${d.name}: ${t.stores.deal(storeLabel(d.best.store), pct(d.saving))}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{d.name}</span>
                        <span className="block truncate text-sm tabular-nums">
                          <span className="text-[#2E7A4A] dark:text-ok">{storeLabel(d.best.store)} {formatCurrency(d.best.price, { cents: d.best.price < 100 })}</span>
                          <span className="text-muted"> · {storeLabel(d.worst.store)} {formatCurrency(d.worst.price, { cents: d.worst.price < 100 })}</span>
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-[#2E7A4A] dark:text-ok">−{pct(d.saving)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
      {where && where.stores.length <= 1 && <p className="text-sm text-muted">{t.stores.needMore}</p>}
      <Link to="/precios" className="card flex min-h-[64px] items-center gap-3 px-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon name="tag" size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{m.prices.open}</span>
          <span className="block text-sm text-muted">{m.prices.openHint}</span>
        </span>
        <Icon name="chevron" className="text-muted" />
      </Link>

      {s.priceChanges.length > 0 && (
        <section className="space-y-2">
          <h2 className="section-title">{t.prices.title}</h2>
          <p className="text-sm text-muted">{t.prices.hint}</p>
          <ul className="card divide-y divide-line">
            {s.priceChanges.slice(0, 6).map((c) => {
              const up = c.change > 0.005;
              const down = c.change < -0.005;
              return (
                <li key={c.productId}>
                  <button className="flex min-h-[56px] w-full items-center gap-3 px-4 py-2 text-left" onClick={() => ui.openProduct(c.productId)}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{c.name}</span>
                      <span className="text-sm tabular-nums text-muted">
                        {formatCurrency(c.first, { cents: c.first < 100 })} → {formatCurrency(c.last, { cents: c.last < 100 })}
                      </span>
                    </span>
                    <span className={`flex shrink-0 items-center gap-1 text-sm font-medium ${up ? 'text-[#B53A2A] dark:text-out' : down ? 'text-[#2E7A4A] dark:text-ok' : 'text-muted'}`}>
                      {(up || down) && <Icon name={up ? 'up' : 'down'} size={16} />}
                      {up ? t.prices.up(pct(c.change)) : down ? t.prices.down(pct(c.change)) : t.prices.same}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="section-title">{t.products.title}</h2>
        <p className="text-sm text-muted">{t.products.hint}</p>
        <div className="card">
          <RankBars
            label={t.products.title}
            onSelect={(id) => !id.startsWith('name:') && ui.openProduct(id)}
            rows={s.byProduct.slice(0, 8).map((p) => ({
              id: p.productId ?? `name:${p.name}`,
              label: p.name,
              value: p.total,
              valueLabel: formatCurrency(p.total),
            }))}
          />
        </div>
      </section>

      {s.byCategory.length > 1 && (
        <section className="space-y-2">
          <h2 className="section-title">{t.categories.title}</h2>
          <div className="card">
            <RankBars
              label={t.categories.title}
              rows={s.byCategory.slice(0, 8).map((c) => {
                const name = view.categories.find((x) => x.id === c.categoryId)?.name ?? t.categories.none;
                return {
                  id: c.categoryId ?? 'none',
                  label: name,
                  value: c.total,
                  valueLabel: formatCurrency(c.total),
                  icon: <Icon name={categoryIcon(c.categoryId ? name : null)} size={16} className="text-muted" />,
                };
              })}
            />
          </div>
        </section>
      )}
    </>
  );
}
