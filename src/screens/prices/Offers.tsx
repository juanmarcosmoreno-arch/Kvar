import { useMemo } from 'react';
import { allItems } from '../../domain/sipc';
import { m } from '../../i18n';
import { CatalogCard } from '../../components/TodayPrices';
import { usePriceCenter } from '../../lib/priceCenter';
import { useView } from '../../store/store';
import { NeedsStores, PriceHeader } from './common';

/** Lo que está en oferta hoy en tus súper: primero lo que comprás vos */
export function Offers() {
  const view = useView()!;
  const c = usePriceCenter(view);
  const t = m.priceCenter.offers;
  const { mine, others } = useMemo(() => {
    const items = c.sipc.data ? allItems(c.sipc.data).filter((x) => x.offers.size > 0) : [];
    const own = new Set(c.sipc.matches.map((x) => x.item));
    return { mine: items.filter((x) => own.has(x.key)), others: items.filter((x) => !own.has(x.key)) };
  }, [c.sipc]);
  return (
    <>
      <PriceHeader title={t.title} />
      <div className="space-y-6 px-5 pb-6">
        <p className="text-sm text-muted">{t.hint}</p>
        {!c.sipc.configured && <NeedsStores sipc={c.sipc} text={m.prices.today.intro} />}
        {c.sipc.data && !mine.length && !others.length && <p className="card p-4 text-sm text-muted">{t.none}</p>}
        {mine.length > 0 && (
          <section className="space-y-3">
            <h2 className="section-title">{t.mine}</h2>
            {mine.map((item) => (
              <CatalogCard key={item.key} item={item} discounts={c.opts.discounts} when={c.opts.when} />
            ))}
          </section>
        )}
        {others.length > 0 && (
          <section className="space-y-3">
            <h2 className="section-title">{t.others}</h2>
            {others.map((item) => (
              <CatalogCard key={item.key} item={item} discounts={c.opts.discounts} when={c.opts.when} />
            ))}
          </section>
        )}
      </div>
    </>
  );
}
