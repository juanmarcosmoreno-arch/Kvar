import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MonthColumns } from '../components/charts/MonthColumns';
import { RankBars, StatTile } from '../components/charts/RankBars';
import { Icon } from '../components/Icon';
import { Header } from '../components/Shell';
import { useUI } from '../store/ui';
import { openItemFor } from '../domain/shoppingList';
import { householdStats } from '../domain/stats';
import { formatDecimal, locale, m } from '../i18n';
import { categoryIcon } from '../lib/categoryIcon';
import { useEvents } from '../lib/stats';
import { addListItem } from '../store/actions';
import { useView } from '../store/store';
import { toast } from '../store/toast';

const RANGES = [3, 6, 12] as const;
const DAY = 86_400_000;

/** Estadísticas del hogar: compras por mes, lo que más se termina, lo que está por terminarse, por categoría. */
export function Stats() {
  const view = useView()!;
  const navigate = useNavigate();
  const ui = useUI();
  const [months, setMonths] = useState<(typeof RANGES)[number]>(6);
  const [measure, setMeasure] = useState<'bought' | 'ranOut'>('bought');
  const [table, setTable] = useState(false);
  const data = useEvents(view.household.id);
  const t = m.stats;

  const stats = useMemo(
    () => (data.status === 'ready' ? householdStats(data.events, view.products, { now: new Date(), months }) : null),
    [data, view.products, months],
  );

  const monthName = (d: Date) => d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const daysFrom = (iso: string) => Math.round((Date.parse(iso) - Date.now()) / DAY);

  return (
    <>
      <Header
        title={t.title}
        left={
          <button className="-ml-3 flex min-h-tap min-w-tap items-center justify-center text-muted" aria-label={m.common.back} onClick={() => navigate(-1)}>
            <Icon name="back" />
          </button>
        }
      />
      <div className="space-y-6 px-5 pb-6">
        {/* Filtro: un solo renglón arriba de todo, afecta a todos los gráficos */}
        <div className="flex gap-2" role="radiogroup" aria-label={t.rangeLabel}>
          {RANGES.map((r) => (
            <button
              key={r}
              role="radio"
              aria-checked={months === r}
              onClick={() => setMonths(r)}
              className={`chip min-h-[40px] ${months === r ? 'border-primary bg-primary text-on-primary' : 'bg-surface text-ink'}`}
            >
              {t.range(r)}
            </button>
          ))}
        </div>

        {data.status === 'loading' && <p className="text-muted">{t.loading}</p>}
        {data.status === 'error' && <p className="card p-4 text-muted">{t.error}</p>}
        {data.status === 'ready' && data.cached && <p className="text-sm text-muted">{t.offline}</p>}

        {stats && stats.bought + stats.ranOut === 0 && <p className="card p-5 text-muted">{t.empty}</p>}

        {stats && stats.bought + stats.ranOut > 0 && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <StatTile label={t.kpi.bought} value={String(stats.bought)} hint={t.kpi.inRange(months)} />
              <StatTile label={t.kpi.ranOut} value={String(stats.ranOut)} hint={t.kpi.inRange(months)} />
              <StatTile label={t.kpi.perMonth} value={formatDecimal(stats.boughtPerMonth, 1)} hint={t.kpi.perMonthHint} />
            </div>

            <section className="card space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">{t.monthly.title}</h2>
                <div className="flex rounded-full bg-sunken p-0.5" role="radiogroup" aria-label={t.monthly.title}>
                  {(['bought', 'ranOut'] as const).map((k) => (
                    <button
                      key={k}
                      role="radio"
                      aria-checked={measure === k}
                      onClick={() => setMeasure(k)}
                      className={`min-h-[36px] rounded-full px-3 text-sm ${measure === k ? 'bg-surface font-medium shadow-sm' : 'text-muted'}`}
                    >
                      {k === 'bought' ? t.monthly.showBought : t.monthly.showRanOut}
                    </button>
                  ))}
                </div>
              </div>
              <MonthColumns
                key={`${months}-${measure}`}
                data={stats.months.map((x) => ({ key: x.key, start: x.start, value: x[measure] }))}
                label={t.monthly.chartLabel(measure === 'bought' ? t.monthly.showBought : t.monthly.showRanOut)}
                format={(n) => formatDecimal(n, 0)}
              />
              <button className="min-h-tap text-sm font-medium text-primary" onClick={() => setTable((v) => !v)} aria-expanded={table}>
                {table ? t.monthly.hideTable : t.monthly.table}
              </button>
              {table && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted">
                      <th className="py-1 font-normal">{t.monthly.month}</th>
                      <th className="py-1 text-right font-normal">{t.monthly.showBought}</th>
                      <th className="py-1 text-right font-normal">{t.monthly.showRanOut}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line tabular-nums">
                    {[...stats.months].reverse().map((x) => (
                      <tr key={x.key}>
                        <td className="py-1.5 first-letter:uppercase">{monthName(x.start)}</td>
                        <td className="py-1.5 text-right">{x.bought}</td>
                        <td className="py-1.5 text-right">{x.ranOut}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            {stats.soon.length > 0 && (
              <section className="space-y-2">
                <h2 className="section-title">{t.soon.title}</h2>
                <p className="text-sm text-muted">{t.soon.hint}</p>
                <ul className="card divide-y divide-line">
                  {stats.soon.slice(0, 6).map(({ product, at }) => {
                    const days = daysFrom(at);
                    const inList = Boolean(openItemFor(view.list, product.id));
                    return (
                      <li key={product.id} className="flex min-h-[56px] items-center gap-3 pl-4">
                        <button className="min-w-0 flex-1 py-2 text-left" onClick={() => ui.openProduct(product.id)}>
                          <span className="block truncate font-medium">{product.name}</span>
                          <span className="text-sm text-muted">{days <= 0 ? t.soon.today : t.soon.inDays(days)}</span>
                        </button>
                        {!inList && (
                          <button
                            className="flex min-h-tap shrink-0 items-center gap-1.5 px-4 text-sm font-medium text-primary"
                            onClick={() => {
                              addListItem({ productId: product.id, reason: 'predicted' });
                              toast(t.soon.added(product.name));
                            }}
                          >
                            <Icon name="cart" size={18} /> {t.soon.addToList}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {stats.top.length > 0 && (
              <section className="space-y-2">
                <h2 className="section-title">{t.top.title}</h2>
                <p className="text-sm text-muted">{t.top.hint}</p>
                <div className="card">
                  <RankBars
                    label={t.top.title}
                    onSelect={ui.openProduct}
                    rows={stats.top.slice(0, 8).map(({ product, stats: s }) => {
                      const value = s.ranOutPerMonth || s.boughtPerMonth;
                      return {
                        id: product.id,
                        label: product.name,
                        value,
                        valueLabel: t.top.perMonth(formatDecimal(value, 1)),
                        detail: s.avgDaysLasts ? t.top.lasts(formatDecimal(s.avgDaysLasts, 0)) : undefined,
                      };
                    })}
                  />
                </div>
              </section>
            )}

            {stats.byCategory.length > 1 && (
              <section className="space-y-2">
                <h2 className="section-title">{t.categories.title}</h2>
                <div className="card">
                  <RankBars
                    label={t.categories.title}
                    rows={stats.byCategory.slice(0, 8).map((c) => {
                      const name = view.categories.find((x) => x.id === c.categoryId)?.name ?? t.categories.none;
                      return {
                        id: c.categoryId ?? 'none',
                        label: name,
                        value: c.bought,
                        valueLabel: String(c.bought),
                        icon: <Icon name={categoryIcon(c.categoryId ? name : null)} size={16} className="text-muted" />,
                      };
                    })}
                  />
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}
