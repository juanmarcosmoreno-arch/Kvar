import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { personalInflation, splitShopping } from '../../domain/priceTools';
import { allItems, itemKey } from '../../domain/sipc';
import { storeLabel } from '../../domain/spending';
import { formatDecimal, m } from '../../i18n';
import { Icon, type IconName } from '../../components/Icon';
import { StoresSheet } from '../../components/TodayPrices';
import { formatCurrency } from '../../lib/currency';
import { hitText } from '../../lib/priceAlerts';
import { listSplitItems, usePriceCenter, useRecipePrices } from '../../lib/priceCenter';
import { historyRange, usePriceHistory } from '../../lib/priceHistory';
import { useView } from '../../store/store';
import { GREEN, PriceHeader, PriceSettingsSheet } from './common';

const pct = (x: number) => `${formatDecimal(Math.abs(x) * 100, 1)} %`;

interface Tile {
  to: string;
  icon: IconName;
  title: string;
  stat: string;
  tone?: 'good' | 'bad';
  badge?: number;
}

/**
 * Centro de precios: lo más importante arriba (dónde te conviene hoy y las alertas que se cumplen) y un botón
 * cuadrado para cada herramienta.
 */
export function PricesHub() {
  const view = useView()!;
  const navigate = useNavigate();
  const t = m.priceCenter;
  const c = usePriceCenter(view);
  const { sipc, data, opts } = c;
  const [settings, setSettings] = useState(false);
  const [stores, setStores] = useState(false);
  usePriceHistory();
  const recipes = useRecipePrices(view);

  const stats = useMemo(() => {
    const items = sipc.data ? allItems(sipc.data) : [];
    const mine = new Set(sipc.matches.map((x) => x.item));
    const onOffer = items.filter((x) => x.offers.size > 0);
    const names = new Map(view.products.map((p) => [p.id, p.name]));
    const inflation = personalInflation(data.lines, names).last;
    const list = listSplitItems(view, sipc, opts);
    const plan = splitShopping(list.items);
    const weekday = new Date().getDay();
    const discountsToday = data.discounts.filter((d) => d.days.length === 0 || d.days.includes(weekday)).length;
    return { offers: onOffer.length, offersMine: onOffer.filter((x) => mine.has(itemKey(x.name))).length, inflation, plan, discountsToday };
  }, [sipc, data, opts, view]);

  const hero = c.todayBasket.stores.length >= 2 ? c.todayBasket : c.ticketBasket.stores.length >= 2 ? c.ticketBasket : null;
  const fromTickets = hero === c.ticketBasket;
  const range = historyRange();

  const tiles: Tile[] = [
    { to: '/precios/comparar', icon: 'store', title: t.tiles.compare, stat: sipc.configured ? t.tiles.compareStat(sipc.prefs.stores.length) : t.tiles.pickStores },
    { to: '/precios/canasta', icon: 'cart', title: t.tiles.basket, stat: hero ? formatCurrency(hero.stores[0].total) : '—', tone: hero ? 'good' : undefined },
    {
      to: '/precios/ofertas',
      icon: 'tag',
      title: t.tiles.offers,
      stat: stats.offersMine ? t.tiles.offersMine(stats.offersMine) : sipc.data ? t.tiles.offersAll(stats.offers) : '—',
    },
    { to: '/precios/alertas', icon: 'bell', title: t.tiles.alerts, stat: t.tiles.alertsStat(c.alerts.length), badge: c.hits.length },
    { to: '/precios/historial', icon: 'history', title: t.tiles.history, stat: range.days ? t.tiles.historyDays(range.days) : t.tiles.historyStat },
    {
      to: '/precios/inflacion',
      icon: 'trend',
      title: t.tiles.inflation,
      stat: stats.inflation?.change != null ? t.tiles.inflationStat(`${stats.inflation.change >= 0 ? '+' : '−'}${pct(stats.inflation.change)}`) : '—',
      tone: stats.inflation?.change != null ? (stats.inflation.change > 0.001 ? 'bad' : 'good') : undefined,
    },
    {
      to: '/precios/dos-super',
      icon: 'split',
      title: t.tiles.split,
      stat: stats.plan && stats.plan.saving >= 1 ? t.tiles.splitStat(formatCurrency(stats.plan.saving)) : t.tiles.splitList,
      tone: stats.plan && stats.plan.saving >= 1 ? 'good' : undefined,
    },
    { to: '/precios/cocinar', icon: 'pot', title: t.tiles.cook, stat: recipes[0]?.complete ? t.tiles.cookStat(formatCurrency(recipes[0].perServing)) : '—' },
    {
      to: '/precios/descuentos',
      icon: 'percent',
      title: t.tiles.discounts,
      stat: data.prefs.discounts.length ? t.tiles.discountsStat(stats.discountsToday) : t.tiles.discountsNone,
    },
  ];

  return (
    <>
      <PriceHeader
        title={t.title}
        right={
          <button className="-mr-2 flex min-h-tap min-w-tap items-center justify-center text-muted" aria-label={t.settings} onClick={() => setSettings(true)}>
            <Icon name="gear" />
          </button>
        }
      />
      <div className="space-y-4 px-5 pb-6">
        <button className="field flex w-full items-center gap-3 rounded-full text-left text-muted" onClick={() => navigate('/precios/comparar?buscar=1')}>
          <Icon name="search" size={20} /> {t.search}
        </button>

        {hero ? (
          <button className="block w-full rounded-3xl bg-primary p-5 text-left text-white shadow-sm" onClick={() => navigate('/precios/canasta')}>
            <span className="block text-xs font-semibold uppercase tracking-widest text-white/70">{t.hero.label}</span>
            <span className="mt-1 block text-2xl font-semibold leading-tight">{storeLabel(hero.stores[0].store)}</span>
            <span className="mt-1 block text-white/85">
              {t.hero.basket(
                formatCurrency(hero.stores[0].total),
                formatCurrency(hero.stores[hero.stores.length - 1].total - hero.stores[0].total),
                storeLabel(hero.stores[hero.stores.length - 1].store),
              )}
            </span>
            <span className="mt-3 block space-y-1.5">
              {hero.stores.slice(0, 3).map((s, i) => (
                <span key={s.store} className="flex items-center gap-3 text-sm">
                  <span className="w-[38%] truncate">{storeLabel(s.store)}</span>
                  <span className="h-1.5 flex-1 rounded-full bg-white/15">
                    <span
                      className={`block h-1.5 rounded-full ${i === 0 ? 'bg-[#B5D86A]' : 'bg-white/45'}`}
                      style={{ width: `${(s.total / hero.stores[hero.stores.length - 1].total) * 100}%` }}
                    />
                  </span>
                  <span className="w-20 text-right tabular-nums">{formatCurrency(s.total)}</span>
                </span>
              ))}
            </span>
            {fromTickets && <span className="mt-3 block text-xs text-white/70">{t.hero.fromTickets}</span>}
          </button>
        ) : !sipc.configured ? (
          <section className="rounded-3xl bg-primary p-5 text-white">
            <span className="block text-xs font-semibold uppercase tracking-widest text-white/70">{t.hero.label}</span>
            <h2 className="mt-1 text-xl font-semibold">{t.hero.setupTitle}</h2>
            <p className="mt-1 text-sm text-white/85">{t.hero.setupHint}</p>
            <button className="mt-4 flex min-h-tap w-full items-center justify-center gap-2 rounded-full bg-white font-semibold text-primary" onClick={() => setStores(true)}>
              <Icon name="search" size={18} /> {t.hero.setup}
            </button>
          </section>
        ) : (
          <p className="card p-4 text-sm text-muted">{sipc.status === 'loading' ? t.hero.loading : t.hero.noBasket}</p>
        )}

        {c.hits.slice(0, 2).map((h) => (
          <button
            key={h.alert.id}
            className="flex w-full items-start gap-3 rounded-2xl border border-low/40 bg-low/10 p-4 text-left text-sm text-[#7A4E00] dark:text-low"
            onClick={() => navigate('/precios/alertas')}
          >
            <Icon name="bell" size={20} className="mt-0.5 shrink-0" />
            <span>{hitText(h)}</span>
          </button>
        ))}

        <div className="grid grid-cols-3 gap-3">
          {tiles.map((tile) => (
            <button
              key={tile.to}
              className="card relative flex aspect-square flex-col justify-between p-3 text-left active:scale-[0.98] md:aspect-auto md:min-h-[150px]"
              onClick={() => navigate(tile.to)}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon name={tile.icon} size={22} />
              </span>
              {tile.badge ? (
                <span className="absolute right-2.5 top-2.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-out px-1.5 text-xs font-semibold text-white">
                  {tile.badge}
                </span>
              ) : null}
              <span className="block min-w-0">
                <span className="block text-[15px] font-semibold leading-tight">{tile.title}</span>
                <span
                  className={`mt-0.5 line-clamp-2 block text-xs leading-snug ${tile.tone === 'good' ? `font-semibold ${GREEN}` : tile.tone === 'bad' ? 'font-semibold text-[#B53A2A] dark:text-out' : 'text-muted'}`}
                >
                  {tile.stat}
                </span>
              </span>
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-muted">{m.prices.today.source}</p>
      </div>

      <PriceSettingsSheet open={settings} onClose={() => setSettings(false)} data={data} sipc={sipc} />
      <StoresSheet open={stores} onClose={() => setStores(false)} sipc={sipc} />
    </>
  );
}

