import { m } from '../../i18n';
import { usePriceCenter } from '../../lib/priceCenter';
import { useView } from '../../store/store';
import { BasketList, NeedsStores, PriceHeader } from './common';

/** Tu canasta en cada súper: con los precios de hoy y con lo que pagaste en tus tickets */
export function BasketScreen() {
  const view = useView()!;
  const c = usePriceCenter(view);
  const t = m.prices;
  return (
    <>
      <PriceHeader title={t.basket.title} />
      <div className="space-y-6 px-5 pb-6">
        {!c.sipc.configured && <NeedsStores sipc={c.sipc} text={t.today.intro} />}
        {c.todayBasket.stores.length >= 2 && (
          <section className="card space-y-3 p-4">
            <div>
              <h2 className="font-semibold">{t.today.basketTitle}</h2>
              <p className="text-sm text-muted">{t.today.basketHint(c.todayBasket.items)}</p>
            </div>
            <BasketList basket={c.todayBasket} />
          </section>
        )}
        {c.ticketBasket.stores.length >= 2 ? (
          <section className="card space-y-3 p-4">
            <div>
              <h2 className="font-semibold">{t.today.fromTickets}</h2>
              <p className="text-sm text-muted">{t.basket.hint(c.ticketBasket.items)}</p>
            </div>
            <BasketList basket={c.ticketBasket} />
          </section>
        ) : (
          c.data.status === 'ready' && <p className="card p-4 text-sm text-muted">{t.needMore}</p>
        )}
      </div>
    </>
  );
}
