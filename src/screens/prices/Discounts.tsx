import { m } from '../../i18n';
import { discountStores, discountSummary, DiscountsEditor } from '../../components/PriceSettings';
import { usePriceData } from '../../lib/priceData';
import { useView } from '../../store/store';
import { PriceHeader } from './common';

/** Tus descuentos con tarjeta: los de hoy arriba y todos para editar */
export function Discounts() {
  const view = useView()!;
  const data = usePriceData(view.household.id);
  const t = m.priceCenter.discounts;
  const weekday = new Date().getDay();
  const today = data.prefs.discounts.filter((d) => d.days.length === 0 || d.days.includes(weekday));
  return (
    <>
      <PriceHeader title={t.title} />
      <div className="space-y-6 px-5 pb-6">
        <section className="space-y-2">
          <h2 className="section-title">{t.today}</h2>
          {today.length ? (
            <ul className="card divide-y divide-line px-4">
              {today.map((d) => (
                <li key={d.id} className="py-3">
                  <span className="block font-medium">{discountStores(d)}</span>
                  <span className="block text-sm text-muted">{discountSummary(d)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="card p-4 text-sm text-muted">{t.todayNone}</p>
          )}
        </section>
        <section className="space-y-2">
          <h2 className="section-title">{t.all}</h2>
          <p className="text-sm text-muted">{m.prices.discounts.hint}</p>
          <DiscountsEditor data={data} />
        </section>
      </div>
    </>
  );
}
