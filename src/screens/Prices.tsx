import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchProducts } from '../domain/aliases';
import { basketByStore, priceTable, type Offer, type PriceRow, type When } from '../domain/prices';
import { storeLabel } from '../domain/spending';
import { formatDate, formatDecimal, m } from '../i18n';
import { Icon } from '../components/Icon';
import { DiscountsEditor, StoresEditor } from '../components/PriceSettings';
import { Header } from '../components/Shell';
import { Sheet } from '../components/Sheet';
import { formatCurrency } from '../lib/currency';
import { usePriceData, weekdayName } from '../lib/priceData';
import { useSipc } from '../lib/sipc';
import { TodayPrices } from '../components/TodayPrices';
import { useView } from '../store/store';
import { useUI } from '../store/ui';

const pct = (x: number) => `${formatDecimal(Math.abs(x) * 100, 0)} %`;
const COLLAPSED = 8;

/** Comparador de precios: tu canasta en cada súper, dónde conviene cada cosa y un buscador. */
export function Prices() {
  const view = useView()!;
  const navigate = useNavigate();
  const ui = useUI();
  const data = usePriceData(view.household.id);
  const sipc = useSipc(view.products);
  const t = m.prices;
  const today = new Date().getDay();
  const [when, setWhen] = useState<When>(today);
  const [q, setQ] = useState('');
  const [all, setAll] = useState(false);
  const [settings, setSettings] = useState(false);

  const opts = { discounts: data.discounts, when: data.discounts.length ? when : ('none' as const) };
  const rows = useMemo(() => priceTable(data.lines, view.products, opts), [data, view.products, when]); // eslint-disable-line react-hooks/exhaustive-deps
  const basket = useMemo(() => basketByStore(data.lines, opts), [data, when]); // eslint-disable-line react-hooks/exhaustive-deps
  const compared = rows.filter((r) => r.offers.length >= 2).sort((a, b) => b.saving - a.saving);
  const found = q.trim()
    ? searchProducts(q, rows.map((r) => r.product))
        .map((p) => rows.find((r) => r.product.id === p.id)!)
        .slice(0, 20)
    : [];
  const shown = all ? compared : compared.slice(0, COLLAPSED);

  return (
    <>
      <Header
        title={t.title}
        left={
          <button className="-ml-3 flex min-h-tap min-w-tap items-center justify-center text-muted" aria-label={m.common.back} onClick={() => navigate(-1)}>
            <Icon name="back" />
          </button>
        }
        right={
          <button className="-mr-2 flex min-h-tap min-w-tap items-center justify-center text-muted" aria-label={t.settings.open} onClick={() => setSettings(true)}>
            <Icon name="gear" />
          </button>
        }
      />
      <div className="space-y-6 px-5 pb-6">
        {data.discounts.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-sm text-muted">{t.when.label}</span>
            <div className="flex rounded-full bg-sunken p-1 text-sm" role="radiogroup" aria-label={t.when.label}>
              {([today, 'best', 'none'] as When[]).map((w) => (
                <button
                  key={String(w)}
                  role="radio"
                  aria-checked={when === w}
                  className={`min-h-[36px] flex-1 rounded-full px-2 font-medium ${when === w ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
                  onClick={() => setWhen(w)}
                >
                  {w === 'best' ? t.when.best : w === 'none' ? t.when.none : t.when.today(weekdayName(today))}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="relative block">
          <Icon name="search" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="field rounded-full pl-12"
            placeholder={t.searchPlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="search"
            enterKeyHint="search"
          />
        </label>


        {/* Precios de hoy (precios.uy, solo Uruguay) */}
        <TodayPrices sipc={sipc} products={view.products} ticketLines={data.lines} discounts={opts.discounts} when={opts.when} query={q} />

        {/* Lo que pagaste (tickets) */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{t.today.fromTickets}</h2>
            <p className="text-sm text-muted">{t.today.fromTicketsHint}</p>
          </div>
          {data.status === 'loading' && <p className="text-muted">{m.money.loading}</p>}
          {data.status === 'error' && <p className="card p-4 text-muted">{m.stats.error}</p>}
          {data.status === 'ready' && rows.length === 0 && <p className="card p-5 text-sm text-muted">{t.empty}</p>}
          {rows.length > 0 && (
            <>
                {q.trim() ? (
                  found.length ? (
                    <div className="space-y-3">
                      {found.map((r) => (
                        <PriceCard key={r.product.id} row={r} onOpen={() => ui.openProduct(r.product.id)} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-sm text-muted">{t.noResults}</p>
                  )
                ) : (
                  <>
                    {basket.stores.length >= 2 && (
                      <section className="card space-y-3 p-4">
                        <div>
                          <h2 className="font-semibold">{t.basket.title}</h2>
                          <p className="text-sm text-muted">{t.basket.hint(basket.items)}</p>
                        </div>
                        <ul className="divide-y divide-line">
                          {basket.stores.map((s, i) => (
                            <li key={s.store} className="flex min-h-[56px] items-center gap-3 py-2">
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">{storeLabel(s.store)}</span>
                                <span className="block truncate text-sm text-muted">
                                  {t.basket.known(s.known, basket.items)}
                                  {s.saved > 0 && ` · ${t.basket.saved(formatCurrency(s.saved))}`}
                                </span>
                              </span>
                              <span className="shrink-0 text-right">
                                <span className={`block font-semibold tabular-nums ${i === 0 ? 'text-[#2E7A4A] dark:text-ok' : ''}`}>{formatCurrency(s.total)}</span>
                                <span className={`block text-xs ${i === 0 ? 'text-[#2E7A4A] dark:text-ok' : 'text-muted'}`}>
                                  {i === 0 ? t.basket.cheapest : t.basket.more(formatCurrency(s.total - basket.stores[0].total))}
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                        {basket.stores.some((s) => s.known < basket.items) && <p className="text-xs text-muted">{t.basket.estimated}</p>}
                      </section>
                    )}

                    {compared.length > 0 ? (
                      <section className="space-y-2">
                        <h2 className="section-title">{t.best.title}</h2>
                        <p className="text-sm text-muted">{t.best.hint}</p>
                        <div className="space-y-3">
                          {shown.map((r) => (
                            <PriceCard key={r.product.id} row={r} onOpen={() => ui.openProduct(r.product.id)} />
                          ))}
                        </div>
                        {compared.length > COLLAPSED && (
                          <button className="flex min-h-tap w-full items-center justify-center gap-1 text-sm font-medium text-primary" onClick={() => setAll(!all)}>
                            {all ? t.best.less : t.best.more(compared.length - COLLAPSED)}
                            <Icon name={all ? 'up' : 'down'} size={16} />
                          </button>
                        )}
                      </section>
                    ) : (
                      <p className="card p-4 text-sm text-muted">{t.needMore}</p>
                    )}
                  </>
                )}
            </>
          )}
        </section>

        <button className="btn-ghost w-full" onClick={() => setSettings(true)}>
          <Icon name="percent" size={18} /> {t.settings.title}
        </button>
      </div>

      <Sheet open={settings} onClose={() => setSettings(false)} title={t.settings.title}>
        <div className="space-y-6 pb-6">
          <section className="space-y-2">
            <h3 className="section-title">{t.discounts.title}</h3>
            <p className="text-sm text-muted">{t.discounts.hint}</p>
            <DiscountsEditor data={data} />
          </section>
          <section className="space-y-2">
            <h3 className="section-title">{t.stores.title}</h3>
            <p className="text-sm text-muted">{t.stores.hint}</p>
            <StoresEditor data={data} />
          </section>
        </div>
      </Sheet>
    </>
  );
}

/** Un producto con su precio en cada súper (el que te sale más barato, en verde). */
function PriceCard({ row, onOpen }: { row: PriceRow; onOpen: () => void }) {
  const t = m.prices;
  const best = row.offers[0];
  return (
    <div className="card p-3">
      <button className="flex min-h-[40px] w-full items-center gap-2 px-1 text-left" onClick={onOpen}>
        <span className="min-w-0 flex-1 truncate font-medium">{row.product.name}</span>
        {row.saving >= 0.05 && (
          <span className="shrink-0 rounded-full bg-ok/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-[#2E7A4A] dark:text-ok">
            −{pct(row.saving)}
          </span>
        )}
      </button>
      <ul className="mt-1 space-y-0.5">
        {row.offers.map((o) => (
          <OfferLine key={o.store} offer={o} best={o === best && row.offers.length > 1} />
        ))}
      </ul>
      {row.offers.length === 1 && <p className="px-1 pt-1 text-xs text-muted">{t.best.single}</p>}
    </div>
  );
}

function OfferLine({ offer, best }: { offer: Offer; best: boolean }) {
  const t = m.prices.offer;
  return (
    <li className={`flex min-h-[36px] items-center gap-2 rounded-xl px-1 text-sm ${best ? 'text-[#2E7A4A] dark:text-ok' : ''}`}>
      <span className={`min-w-0 flex-1 truncate ${best ? 'font-semibold' : ''}`}>
        {storeLabel(offer.store)}
        <span className="font-normal text-muted"> · {t.when(formatDate(offer.at))}</span>
      </span>
      {offer.discount && (
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {t.discount(`${offer.discount.percent} %`, offer.discount.card)}
        </span>
      )}
      <span className="shrink-0 text-right tabular-nums">
        <span className={`block ${best ? 'font-semibold' : 'font-medium'}`}>{formatCurrency(offer.effective)}</span>
        {offer.discount && <span className="block text-[11px] text-muted line-through">{formatCurrency(offer.price)}</span>}
      </span>
    </li>
  );
}
