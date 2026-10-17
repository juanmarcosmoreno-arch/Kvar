import { useMemo, useState } from 'react';
import { offers } from '../../domain/prices';
import { checkSeenPrice, dailyMins, MIN_HISTORY_DAYS, priceVerdict, type PriceVerdict, type Verdict } from '../../domain/priceTools';
import { allItems, itemLabel, type SipcItem } from '../../domain/sipc';
import { parseAmount } from '../../domain/split';
import { storeLabel } from '../../domain/spending';
import { formatDate, formatDecimal, m } from '../../i18n';
import { Icon } from '../../components/Icon';
import { formatCurrency } from '../../lib/currency';
import { usePriceCenter } from '../../lib/priceCenter';
import { dayOf, historyOf, historyRange, usePriceHistory } from '../../lib/priceHistory';
import { useView } from '../../store/store';
import { NewAlertSheet } from './Alerts';
import { GREEN, ItemPicker, NeedsStores, PriceHeader } from './common';

const pct = (x: number) => `${formatDecimal(Math.abs(x) * 100, 0)} %`;

const TONE: Record<Verdict, string> = {
  cheap: `bg-ok/15 ${GREEN}`,
  normal: 'bg-sunken text-ink',
  expensive: 'bg-out/15 text-[#B53A2A] dark:text-out',
};

/** ¿Está caro? El precio de hoy contra lo normal (según lo que se fue guardando día a día) */
export function History() {
  const view = useView()!;
  const c = usePriceCenter(view);
  const t = m.priceCenter.history;
  const [item, setItem] = useState<SipcItem | null>(null);
  return (
    <>
      <PriceHeader title={t.title} />
      <div className="space-y-5 px-5 pb-6">
        {!c.sipc.configured ? (
          <NeedsStores sipc={c.sipc} text={m.prices.today.intro} />
        ) : item ? (
          <Detail item={item} c={c} onBack={() => setItem(null)} />
        ) : (
          <>
            <p className="text-sm text-muted">{t.hint}</p>
            <ItemPicker sipc={c.sipc} placeholder={t.search} onPick={setItem} />
          </>
        )}
      </div>
    </>
  );
}

function Detail({ item: picked, c, onBack }: { item: SipcItem; c: ReturnType<typeof usePriceCenter>; onBack: () => void }) {
  const t = m.priceCenter.history;
  const { version } = usePriceHistory();
  const [alert, setAlert] = useState(false);
  // Con los precios de hoy al día (por si se actualizaron)
  const item = useMemo(() => (c.sipc.data ? allItems(c.sipc.data).find((x) => x.key === picked.key) : null) ?? picked, [c.sipc.data, picked]);
  const best = offers(item.prices, [], 'none')[0];
  const today = dayOf(c.sipc.data?.at ?? new Date());
  const history = useMemo(() => historyOf(item.key), [item.key, version]); // eslint-disable-line react-hooks/exhaustive-deps
  const verdict = priceVerdict(history, best.price, today);
  const series = dailyMins(history, today);
  const left = Math.max(1, MIN_HISTORY_DAYS - series.length);

  return (
    <>
      <button className="flex min-h-tap items-center gap-1 text-sm font-medium text-primary" onClick={onBack}>
        <Icon name="back" size={16} /> {t.other}
      </button>
      <section className="card space-y-3 p-4">
        <div className="flex items-start gap-3">
          <h2 className="min-w-0 flex-1 text-lg font-semibold leading-tight">{itemLabel(item.name)}</h2>
          {verdict && <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${TONE[verdict.verdict]}`}>{t.verdict[verdict.verdict]}</span>}
        </div>
        <p className="text-sm">{t.today(formatCurrency(best.price), storeLabel(best.store))}</p>
        {verdict ? (
          <>
            <p className="font-medium">
              {verdict.verdict === 'cheap' ? t.cheapText(pct(verdict.diff)) : verdict.verdict === 'expensive' ? t.expensiveText(pct(verdict.diff)) : t.normalText}
            </p>
            <p className="text-sm text-muted">{t.normal(formatCurrency(verdict.low), formatCurrency(verdict.high))}</p>
          </>
        ) : (
          <p className="text-sm text-muted">{t.learning(left)}</p>
        )}
      </section>
      <SeenPrice item={item} c={c} normal={verdict} />
      {series.length >= 2 && (
        <section className="card space-y-2 p-4">
          <Chart series={series} today={best.price} low={verdict?.low} high={verdict?.high} />
          {verdict && <p className="text-xs text-muted">{t.days(verdict.days)}</p>}
        </section>
      )}
      <button className="btn-ghost w-full" onClick={() => setAlert(true)}>
        <Icon name="bell" size={18} /> {t.alert}
      </button>
      <NewAlertSheet open={alert} onClose={() => setAlert(false)} c={c} initial={item} />
      <p className="text-center text-xs text-muted">{historyRange().since && `${formatDate(historyRange().since!)} → ${formatDate(today)}`}</p>
    </>
  );
}

/** «¿A cuánto lo ves?»: el precio que estás viendo contra tus súper de hoy y lo normal */
function SeenPrice({ item, c, normal }: { item: SipcItem; c: ReturnType<typeof usePriceCenter>; normal: PriceVerdict | null }) {
  const t = m.priceCenter.history;
  const [text, setText] = useState('');
  const prices = offers(item.prices, c.opts.discounts, c.opts.when).map((o) => ({ store: o.store, price: o.effective }));
  const check = checkSeenPrice(parseAmount(text), prices, normal);
  return (
    <section className="card space-y-3 p-4">
      <div>
        <h3 className="font-semibold">{t.seen.title}</h3>
        <p className="text-sm text-muted">{t.seen.hint}</p>
      </div>
      <label className="relative block">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">$</span>
        <input
          className="field pl-9 tabular-nums"
          inputMode="decimal"
          enterKeyHint="done"
          placeholder={t.seen.placeholder}
          aria-label={t.seen.title}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      {check && (
        <div className="space-y-1.5" role="status">
          <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${TONE[check.verdict]}`}>{t.verdict[check.verdict]}</span>
          <p className="font-medium">
            {check.diff < -0.02
              ? t.seen.cheaper(pct(check.diff), storeLabel(check.cheapest.store), formatCurrency(check.cheapest.price))
              : check.diff <= 0.02
                ? t.seen.same(storeLabel(check.cheapest.store), formatCurrency(check.cheapest.price))
                : t.seen.pricier(storeLabel(check.cheapest.store), formatCurrency(check.cheapest.price), pct(1 - check.cheapest.price / parseAmount(text)))}
          </p>
          {check.verdict !== 'cheap' && check.typical > check.cheapest.price * 1.02 && <p className="text-sm text-muted">{t.seen.typical(formatCurrency(check.typical))}</p>}
          {check.history && <p className="text-sm text-muted">{t.seen.history[check.history]}</p>}
        </div>
      )}
    </section>
  );
}

/** Línea del más barato de cada día, la franja de «lo normal» y el punto de hoy */
function Chart({ series, today, low, high }: { series: { day: string; price: number }[]; today: number; low?: number; high?: number }) {
  const W = 320;
  const H = 140;
  const pad = { l: 4, r: 10, t: 10, b: 20 };
  const values = [...series.map((s) => s.price), today, ...(low ? [low] : []), ...(high ? [high] : [])];
  const min = Math.min(...values) * 0.97;
  const max = Math.max(...values) * 1.03;
  const n = series.length;
  const x = (i: number) => pad.l + (i / n) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min || 1)) * (H - pad.t - pad.b);
  const path = series.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(s.price).toFixed(1)}`).join(' ');
  return (
    <figure className="space-y-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={m.priceCenter.history.chart}>
        {low != null && high != null && (
          <rect x={pad.l} width={W - pad.l - pad.r} y={y(high)} height={Math.max(1, y(low) - y(high))} className="fill-ok/10" />
        )}
        <path d={path} fill="none" className="stroke-primary/60" strokeWidth={2} strokeLinejoin="round" />
        <line x1={x(n - 1)} x2={x(n)} y1={y(series[n - 1].price)} y2={y(today)} className="stroke-primary" strokeWidth={2} strokeDasharray="3 3" />
        <circle cx={x(n)} cy={y(today)} r={5} className="fill-primary" />
        <text x={pad.l} y={H - 4} className="fill-muted text-[10px]">{formatDate(series[0].day)}</text>
        <text x={W - pad.r} y={H - 4} textAnchor="end" className="fill-muted text-[10px]">{m.priceCenter.history.todayShort}</text>
      </svg>
      <figcaption className="text-xs text-muted">{m.priceCenter.history.chart}</figcaption>
    </figure>
  );
}
