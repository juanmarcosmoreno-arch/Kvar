import { useMemo, useState } from 'react';
import { basketByStore, priceTable, usualBasket, type Offer, type StoreDiscount, type When } from '../domain/prices';
import { DEPARTMENTS, distanceKm, itemKey, itemLabel, type SipcMatch, type SipcStore } from '../domain/sipc';
import { storeLabel, type PurchaseLine } from '../domain/spending';
import type { Product } from '../domain/types';
import { formatDecimal, locale, m } from '../i18n';
import { formatCurrency } from '../lib/currency';
import { findStores, MAX_STORES, pinItem, prettyStoreName, refreshSipc, setPlace, setSipcStores, type SipcState } from '../lib/sipc';
import { useUI } from '../store/ui';
import { Icon } from './Icon';
import { Sheet } from './Sheet';

const pct = (x: number) => `${formatDecimal(Math.abs(x) * 100, 0)} %`;
const COLLAPSED = 8;

/**
 * Precios de hoy (precios.uy) en los súper elegidos: tu canasta y tus productos, misma marca y tamaño en cada uno.
 */
export function TodayPrices({
  sipc, products, ticketLines, discounts, when, query,
}: {
  sipc: SipcState;
  products: Product[];
  /** Líneas de tickets: para saber qué y cuánto comprás seguido */
  ticketLines: PurchaseLine[];
  discounts: StoreDiscount[];
  when: When;
  query: string;
}) {
  const t = m.prices.today;
  const ui = useUI();
  const [setup, setSetup] = useState(false);
  const [brandFor, setBrandFor] = useState<SipcMatch | null>(null);
  const [all, setAll] = useState(false);
  const opts = { discounts, when };

  const rows = useMemo(() => priceTable(sipc.lines, products, opts), [sipc.lines, products, when, discounts]); // eslint-disable-line react-hooks/exhaustive-deps
  const basket = useMemo(() => {
    // Lo que comprás seguido (según los tickets) con su cantidad; si no hay tickets, uno de cada uno
    const usual = usualBasket(ticketLines);
    const own = new Map(sipc.matches.map((x) => [x.product.id, usual.get(x.product.id) ?? 1]));
    return basketByStore(sipc.lines, { ...opts, basket: own });
  }, [sipc, ticketLines, when, discounts]); // eslint-disable-line react-hooks/exhaustive-deps
  const offers = useMemo(() => {
    const out = new Set<string>();
    if (!sipc.data) return out;
    for (const s of sipc.data.stores) for (const p of sipc.data.prices[s.id] ?? []) if (p.offer) out.add(`${s.id}|${itemKey(p.name)}`);
    return out;
  }, [sipc.data]);
  const matchOf = new Map(sipc.matches.map((x) => [x.product.id, x]));

  if (!sipc.configured) {
    return (
      <section className="card space-y-3 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon name="store" size={20} />
          </span>
          <span>
            <h2 className="font-semibold">{t.title}</h2>
            <p className="text-sm text-muted">{t.intro}</p>
          </span>
        </div>
        <button className="btn-primary w-full" onClick={() => setSetup(true)}>
          <Icon name="search" size={18} /> {t.setup}
        </button>
        <StoresSheet open={setup} onClose={() => setSetup(false)} sipc={sipc} />
      </section>
    );
  }

  const q = query.trim().toLowerCase();
  const filtered = q ? rows.filter((r) => r.product.name.toLowerCase().includes(q)) : rows;
  const sorted = [...filtered].sort((a, b) => b.saving - a.saving || a.product.name.localeCompare(b.product.name));
  const shown = all || q ? sorted : sorted.slice(0, COLLAPSED);
  const time = sipc.data ? new Date(sipc.data.at).toLocaleString(locale, { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : null;
  const storeId = (key: string) => Number(key.split('-sipc-')[1]);

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{t.title}</h2>
          <p className="text-xs text-muted">
            {t.source}
            {time && ` · ${t.updated(time)}`}
          </p>
        </div>
        <button
          className="flex min-h-tap min-w-tap shrink-0 items-center justify-center rounded-full text-muted"
          aria-label={t.refresh}
          onClick={() => void refreshSipc(true)}
          disabled={sipc.status === 'loading'}
        >
          <Icon name="sync" size={20} className={sipc.status === 'loading' ? 'animate-spin' : ''} />
        </button>
      </div>

      {sipc.status === 'loading' && !sipc.data && <p className="text-sm text-muted">{t.loading}</p>}
      {sipc.status === 'error' && <p className="rounded-xl bg-out/10 p-3 text-sm text-out">{sipc.data ? t.error : t.errorNone}</p>}

      {sipc.data && !q && basket.stores.length >= 2 && (
        <div className="card space-y-3 p-4">
          <div>
            <h3 className="font-semibold">{t.basketTitle}</h3>
            <p className="text-sm text-muted">{t.basketHint(basket.items)}</p>
          </div>
          <ul className="divide-y divide-line">
            {basket.stores.map((s, i) => (
              <li key={s.store} className="flex min-h-[56px] items-center gap-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{storeLabel(s.store)}</span>
                  <span className="block truncate text-sm text-muted">
                    {m.prices.basket.known(s.known, basket.items)}
                    {s.saved > 0 && ` · ${m.prices.basket.saved(formatCurrency(s.saved))}`}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className={`block font-semibold tabular-nums ${i === 0 ? 'text-[#2E7A4A] dark:text-ok' : ''}`}>{formatCurrency(s.total)}</span>
                  <span className={`block text-xs ${i === 0 ? 'text-[#2E7A4A] dark:text-ok' : 'text-muted'}`}>
                    {i === 0 ? m.prices.basket.cheapest : m.prices.basket.more(formatCurrency(s.total - basket.stores[0].total))}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {basket.stores.some((s) => s.known < basket.items) && <p className="text-xs text-muted">{m.prices.basket.estimated}</p>}
        </div>
      )}

      {sipc.data && rows.length === 0 && <p className="card p-4 text-sm text-muted">{t.noMatches}</p>}

      {shown.length > 0 && (
        <div className="space-y-2">
          {!q && (
            <>
              <h3 className="section-title">{t.productsTitle}</h3>
              <p className="text-sm text-muted">{t.productsHint}</p>
            </>
          )}
          <div className="space-y-3">
            {shown.map((r) => {
              const match = matchOf.get(r.product.id);
              return (
                <div key={r.product.id} className="card p-3">
                  <div className="flex items-center gap-2 px-1">
                    <button className="min-h-[40px] min-w-0 flex-1 text-left" onClick={() => ui.openProduct(r.product.id)}>
                      <span className="block truncate font-medium">{r.product.name}</span>
                    </button>
                    {r.saving >= 0.05 && (
                      <span className="shrink-0 rounded-full bg-ok/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-[#2E7A4A] dark:text-ok">
                        −{pct(r.saving)}
                      </span>
                    )}
                  </div>
                  {match && (
                    <button
                      className="mb-1 flex min-h-[32px] max-w-full items-center gap-1 px-1 text-left text-xs text-primary"
                      onClick={() => setBrandFor(match)}
                      aria-label={`${t.brandTitle(r.product.name)} ${itemLabel(match.itemName)}`}
                    >
                      <span className="truncate">{itemLabel(match.itemName)}</span>
                      {match.options.length > 1 && <Icon name="down" size={14} className="shrink-0" />}
                    </button>
                  )}
                  <ul className="space-y-0.5">
                    {r.offers.map((o) => (
                      <TodayLine key={o.store} offer={o} best={o === r.offers[0] && r.offers.length > 1} offer2={Boolean(match && offers.has(`${storeId(o.store)}|${match.item}`))} />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          {!q && sorted.length > COLLAPSED && (
            <button className="flex min-h-tap w-full items-center justify-center gap-1 text-sm font-medium text-primary" onClick={() => setAll(!all)}>
              {all ? m.prices.best.less : m.prices.best.more(sorted.length - COLLAPSED)}
              <Icon name={all ? 'up' : 'down'} size={16} />
            </button>
          )}
        </div>
      )}

      {!q && (
        <button className="btn-ghost w-full" onClick={() => setSetup(true)}>
          <Icon name="store" size={18} /> {t.change}
        </button>
      )}

      <StoresSheet open={setup} onClose={() => setSetup(false)} sipc={sipc} />
      <BrandSheet match={brandFor} sipc={sipc} onClose={() => setBrandFor(null)} />
    </section>
  );
}

function TodayLine({ offer, best, offer2 }: { offer: Offer; best: boolean; offer2: boolean }) {
  const t = m.prices;
  return (
    <li className={`flex min-h-[36px] items-center gap-2 rounded-xl px-1 text-sm ${best ? 'text-[#2E7A4A] dark:text-ok' : ''}`}>
      <span className={`min-w-0 flex-1 truncate ${best ? 'font-semibold' : ''}`}>{storeLabel(offer.store)}</span>
      {offer2 && <span className="shrink-0 rounded-full bg-low/20 px-2 py-0.5 text-[11px] font-medium text-[#9A6300] dark:text-low">{t.today.offer}</span>}
      {offer.discount && (
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {t.offer.discount(`${offer.discount.percent} %`, offer.discount.card)}
        </span>
      )}
      <span className="shrink-0 text-right tabular-nums">
        <span className={`block ${best ? 'font-semibold' : 'font-medium'}`}>{formatCurrency(offer.effective)}</span>
        {offer.discount && <span className="block text-[11px] text-muted line-through">{formatCurrency(offer.price)}</span>}
      </span>
    </li>
  );
}

/** Elegir la zona y los súper (hasta MAX_STORES) */
function StoresSheet({ open, onClose, sipc }: { open: boolean; onClose: () => void; sipc: SipcState }) {
  const t = m.prices.setup;
  const [place, setPlaceState] = useState(sipc.prefs.place);
  const [km, setKm] = useState(sipc.prefs.km);
  const [found, setFound] = useState<SipcStore[] | null>(null);
  const [chosen, setChosen] = useState<SipcStore[]>(sipc.prefs.stores);
  const [busy, setBusy] = useState<'locating' | 'searching' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = async (p = place, radius = km) => {
    if (!p) return;
    setBusy('searching');
    setError(null);
    try {
      setFound(await findStores(p.lat, p.lng, radius));
      setPlace(p, radius);
    } catch {
      setError(t.error);
    }
    setBusy(null);
  };

  const locate = () => {
    if (!navigator.geolocation) return setError(t.locationError);
    setBusy('locating');
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { name: t.myLocation, lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPlaceState(p);
        void search(p);
      },
      () => {
        setBusy(null);
        setError(t.locationError);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 },
    );
  };

  const toggle = (s: SipcStore) => {
    const on = chosen.some((x) => x.id === s.id);
    setChosen(on ? chosen.filter((x) => x.id !== s.id) : chosen.length < MAX_STORES ? [...chosen, s] : chosen);
  };
  // Los elegidos siempre visibles, aunque estén fuera de la búsqueda
  const list = [...chosen.filter((c) => !found?.some((f) => f.id === c.id)), ...(found ?? [])];

  return (
    <Sheet open={open} onClose={onClose} title={t.title}>
      <div className="space-y-5 pb-24">
        <div className="space-y-2">
          <span className="text-sm text-muted">{t.where}</span>
          <button className="btn-ghost w-full" onClick={locate} disabled={busy !== null}>
            <Icon name="search" size={18} /> {busy === 'locating' ? t.locating : t.useLocation}
          </button>
          <label className="block">
            <span className="sr-only">{t.orPick}</span>
            <select
              className="field"
              value={place && DEPARTMENTS.some((d) => d.name === place.name) ? place.name : ''}
              onChange={(e) => {
                const d = DEPARTMENTS.find((x) => x.name === e.target.value);
                if (!d) return;
                setPlaceState(d);
                void search(d);
              }}
            >
              <option value="">{place && !DEPARTMENTS.some((d) => d.name === place.name) ? place.name : t.orPick}</option>
              {DEPARTMENTS.map((d) => (
                <option key={d.name} value={d.name}>{d.name}</option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">{t.radius}</span>
            {[1, 2, 5].map((n) => (
              <button
                key={n}
                aria-pressed={km === n}
                className={`chip min-h-[40px] ${km === n ? 'border-primary bg-primary text-on-primary' : 'bg-surface'}`}
                onClick={() => {
                  setKm(n);
                  if (place) void search(place, n);
                }}
              >
                {t.km(n)}
              </button>
            ))}
          </div>
        </div>

        {busy === 'searching' && <p className="text-sm text-muted">{t.searching}</p>}
        {error && <p className="rounded-xl bg-out/10 p-3 text-sm text-out">{error}</p>}
        {found && found.length === 0 && <p className="text-sm text-muted">{t.none}</p>}

        {list.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted">{t.pick(MAX_STORES)}</p>
            <ul className="card divide-y divide-line">
              {list.map((s) => {
                const on = chosen.some((x) => x.id === s.id);
                const far = place ? distanceKm(place, s) : null;
                return (
                  <li key={s.id}>
                    <button
                      role="checkbox"
                      aria-checked={on}
                      className="flex min-h-[60px] w-full items-center gap-3 px-4 py-2 text-left disabled:opacity-50"
                      disabled={!on && chosen.length >= MAX_STORES}
                      onClick={() => toggle(s)}
                    >
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-[1.5px] ${on ? 'border-primary bg-primary text-on-primary' : 'border-muted/50'}`}>
                        {on && <Icon name="check" size={14} strokeWidth={2.5} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{prettyStoreName(s.name)}</span>
                        <span className="block truncate text-sm text-muted">
                          {s.address}
                          {far != null && ` · ${t.distance(formatDecimal(far, 1))}`}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <p className="text-xs text-muted">{t.credit}</p>
      </div>
      <div className="sticky bottom-0 -mx-5 border-t border-line bg-bg/95 px-5 py-3 backdrop-blur">
        <button
          className="btn-primary w-full"
          disabled={!chosen.length}
          onClick={() => {
            setSipcStores(chosen);
            onClose();
          }}
        >
          {t.save(chosen.length)}
        </button>
      </div>
    </Sheet>
  );
}

/** Otra marca o tamaño para comparar un producto */
function BrandSheet({ match, sipc, onClose }: { match: SipcMatch | null; sipc: SipcState; onClose: () => void }) {
  const t = m.prices.today;
  const prices = useMemo(() => {
    const out = new Map<string, { name: string; min: number; max: number; stores: number }>();
    for (const list of Object.values(sipc.data?.prices ?? {})) {
      for (const p of list) {
        const k = itemKey(p.name);
        const row = out.get(k) ?? { name: p.name, min: Infinity, max: 0, stores: 0 };
        row.min = Math.min(row.min, p.price);
        row.max = Math.max(row.max, p.price);
        row.stores++;
        out.set(k, row);
      }
    }
    return out;
  }, [sipc.data]);
  if (!match) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;
  const pinned = sipc.prefs.pins[match.product.id];
  const choose = (item: string | null) => {
    pinItem(match.product.id, item);
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={t.brandTitle(match.product.name.toLowerCase())}>
      <ul className="card mb-4 divide-y divide-line">
        <li>
          <button role="radio" aria-checked={!pinned} className="flex min-h-[52px] w-full items-center gap-3 px-4 text-left" onClick={() => choose(null)}>
            <span className="min-w-0 flex-1 font-medium">{t.brandAuto}</span>
            {!pinned && <Icon name="check" size={20} className="text-primary" />}
          </button>
        </li>
        {match.options.map((k) => {
          const p = prices.get(k);
          if (!p) return null;
          return (
            <li key={k}>
              <button role="radio" aria-checked={pinned === k} className="flex min-h-[56px] w-full items-center gap-3 px-4 py-2 text-left" onClick={() => choose(k)}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{itemLabel(p.name)}</span>
                  <span className="block text-sm tabular-nums text-muted">
                    {p.min === p.max ? formatCurrency(p.min) : `${formatCurrency(p.min)} – ${formatCurrency(p.max)}`}
                  </span>
                </span>
                {pinned === k && <Icon name="check" size={20} className="text-primary" />}
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
