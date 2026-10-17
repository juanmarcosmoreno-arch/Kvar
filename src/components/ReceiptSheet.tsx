import { useMemo, useRef, useState } from 'react';
import { searchProducts } from '../domain/aliases';
import { buildReview, parseReceiptText, type ParsedReceipt, type ReviewLine } from '../domain/receipt';
import sampleTicket from '../assets/demo/ticket-macromercado.txt?raw';
import { isDemo } from '../lib/demo';
import { canReadPhotos, readReceiptPhoto } from '../lib/ocr';
import { applyReceipt } from '../store/actions';
import { getMe } from '../lib/me';
import { PayerPicker } from './SplitCard';
import { useView } from '../store/store';
import { storeLabel } from '../domain/spending';
import { addStore } from '../lib/pricePrefs';
import { usePriceData } from '../lib/priceData';
import { toast } from '../store/toast';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { formatDecimal, formatMoney, m } from '../i18n';

type Phase = 'start' | 'paste' | 'reading' | 'review';

/**
 * Foto del ticket → «Encontré 57 productos, ¿confirmás?».
 * Cada línea propone un producto del hogar (o uno nuevo); se corrige con un toque y se confirma todo junto.
 */
export function ReceiptSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const view = useView();
  const [phase, setPhase] = useState<Phase>('start');
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null);
  // El súper del ticket: se reconoce solo; si no, se pregunta
  const [store, setStore] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewLine[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const close = () => {
    setPhase('start');
    setText('');
    setParsed(null);
    setReview([]);
    setEditing(null);
    setError(null);
    onClose();
  };

  const analyze = (raw: string) => {
    if (!view) return;
    const p = parseReceiptText(raw);
    if (!p.lines.length) {
      setError(m.capture.receipt.noLines);
      setPhase('start');
      return;
    }
    setParsed(p);
    setStore(p.store);
    setReview(buildReview(p, view.aliases ?? [], view.products));
    setPhase('review');
  };

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    setPhase('reading');
    try {
      analyze(await readReceiptPhoto(file));
    } catch {
      setError(m.capture.receipt.cantRead);
      setPhase('start');
    }
  };

  const [pricesOnly, setPricesOnly] = useState(false);
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const confirm = () => {
    const ticket = { date: parsed?.date, total: parsed?.total };
    const { updated, created } = applyReceipt(review, store, ticket, { pricesOnly, paidBy: paidBy ?? getMe() });
    toast(pricesOnly ? m.capture.receipt.appliedPrices(review.filter((r) => r.include).length) : m.capture.receipt.applied(updated, created));
    close();
  };

  const title = phase === 'review' ? m.capture.receipt.found(review.length) : m.capture.receipt.title;

  return (
    <Sheet open={open} onClose={close} title={title}>
      {phase === 'start' && (
        <div className="space-y-3 pb-4">
          <p className="text-muted">{m.capture.receipt.intro}</p>
          {canReadPhotos && (
            <>
              <input ref={input} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
              <button className="btn-primary w-full" onClick={() => input.current?.click()}>
                <Icon name="camera" size={20} /> {m.capture.receipt.takePhoto}
              </button>
              <p className="text-xs text-muted">{m.capture.receipt.photoTip}</p>
            </>
          )}
          <button className={canReadPhotos ? 'btn-ghost w-full' : 'btn-primary w-full'} onClick={() => setPhase('paste')}>
            {m.capture.receipt.paste}
          </button>
          {!canReadPhotos && (
            <p className="text-xs text-muted">
              {m.capture.receipt.photosInApp}
            </p>
          )}
          {isDemo && (
            <button className="btn-ghost w-full" onClick={() => analyze(sampleTicket)}>
              {m.capture.receipt.tryDemo}
            </button>
          )}
          {error && <p className="rounded-xl bg-out/10 p-3 text-sm text-out">{error}</p>}
        </div>
      )}

      {phase === 'paste' && (
        <div className="space-y-3 pb-4">
          <textarea
            className="field min-h-[220px] py-3 font-mono text-sm"
            placeholder={'168953 LECHE CLADY ULTRA ENTERA 1LT X 4 2,000 185,07 370,14\n…'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label={m.capture.receipt.textLabel}
          />
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-ghost" onClick={() => setPhase('start')}>{m.common.back}</button>
            <button className="btn-primary" disabled={!text.trim()} onClick={() => analyze(text)}>{m.capture.receipt.read}</button>
          </div>
        </div>
      )}

      {phase === 'reading' && (
        <div className="flex flex-col items-center gap-3 py-12 text-muted">
          <Icon name="sync" className="animate-spin" />
          {m.capture.receipt.reading}
        </div>
      )}

      {phase === 'review' && parsed && (
        <ReviewList
          parsed={parsed}
          review={review}
          setReview={setReview}
          editing={editing}
          setEditing={setEditing}
          pricesOnly={pricesOnly}
          setPricesOnly={setPricesOnly}
          paidBy={paidBy}
          setPaidBy={setPaidBy}
          store={store}
          setStore={setStore}
          onConfirm={confirm}
        />
      )}
    </Sheet>
  );
}

function ReviewList({
  parsed, review, setReview, editing, setEditing, pricesOnly, setPricesOnly, paidBy, setPaidBy, store, setStore, onConfirm,
}: {
  store: string | null;
  setStore: (s: string | null) => void;
  paidBy: string | null;
  setPaidBy: (id: string) => void;
  pricesOnly: boolean;
  setPricesOnly: (v: boolean) => void;
  parsed: ParsedReceipt;
  review: ReviewLine[];
  setReview: (r: ReviewLine[]) => void;
  editing: string | null;
  setEditing: (k: string | null) => void;
  onConfirm: () => void;
}) {
  const view = useView()!;
  const byId = useMemo(() => new Map(view.products.map((p) => [p.id, p])), [view.products]);
  const included = review.filter((r) => r.include);
  const known = included.filter((r) => r.productId).length;
  const update = (key: string, patch: Partial<ReviewLine>) =>
    setReview(review.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-4 pb-24">
      <div className="space-y-1 text-sm">
        <p className="text-muted">
          {store ? (
            <button className="font-medium text-primary underline-offset-2 hover:underline" onClick={() => setStore(null)}>
              {storeLabel(store)}
            </button>
          ) : m.capture.receipt.ticket}
          {parsed.date ? ` · ${parsed.date.split('-').reverse().join('/')}` : ''} · {m.capture.receipt.known(known)} ·{' '}
          {m.capture.receipt.fresh(included.length - known)}
        </p>
        {parsed.difference === 0 && parsed.total != null && (
          <p className="flex items-center gap-1.5 text-[#2E7A4A] dark:text-ok">
            <Icon name="check" size={16} /> {m.capture.receipt.sumMatches(formatMoney(parsed.total))}
          </p>
        )}
        {parsed.difference != null && parsed.difference !== 0 && (
          <p className="text-[#9A6300] dark:text-low">
            {m.capture.receipt.sumMismatch(formatMoney(Math.abs(parsed.difference)))}
          </p>
        )}
      </div>

      {!store && <StorePicker onPick={setStore} />}

      {/* Sumar al stock, o solo guardar los precios (para Gastos) */}
      <div className="space-y-1.5">
        <div className="flex rounded-full bg-sunken p-1 text-sm" role="group" aria-label={m.capture.receipt.mode.label}>
          {([false, true] as const).map((v) => (
            <button
              key={String(v)}
              className={`min-h-[40px] flex-1 rounded-full px-3 font-medium ${pricesOnly === v ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
              aria-pressed={pricesOnly === v}
              onClick={() => setPricesOnly(v)}
            >
              {v ? m.capture.receipt.mode.prices : m.capture.receipt.mode.stock}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted">{pricesOnly ? m.capture.receipt.mode.pricesHint : m.capture.receipt.mode.stockHint}</p>
      </div>

      {/* Quién pagó (para «Cuentas» en Gastos) */}
      <PayerPicker view={view} value={paidBy} onChange={setPaidBy} />

      {included.length - known > 0 || review.some((r) => !r.include && !r.productId) ? (
        <div className="flex flex-wrap gap-2">
          <button
            className="chip min-h-[36px] bg-surface"
            onClick={() => setReview(review.map((r) => ({ ...r, include: Boolean(r.productId) })))}
          >
            {m.capture.receipt.onlyKnown}
          </button>
          <button className="chip min-h-[36px] bg-surface" onClick={() => setReview(review.map((r) => ({ ...r, include: true })))}>
            {m.capture.receipt.all}
          </button>
        </div>
      ) : null}

      <ul className="card divide-y divide-line">
        {review.map((r) => {
          const p = r.productId ? byId.get(r.productId) : undefined;
          const open = editing === r.key;
          return (
            <li key={r.key} className={r.include ? '' : 'opacity-50'}>
              <div className="flex items-center gap-2 pl-2 pr-3">
                <button
                  className="flex min-h-tap min-w-tap items-center justify-center"
                  aria-label={r.include ? m.capture.receipt.skipLine : m.capture.receipt.includeLine}
                  onClick={() => update(r.key, { include: !r.include })}
                >
                  <span className={`flex h-6 w-6 items-center justify-center rounded-md border ${r.include ? 'border-primary bg-primary text-on-primary' : 'border-line'}`}>
                    {r.include && <Icon name="check" size={14} strokeWidth={2.5} />}
                  </span>
                </button>
                <button className="min-h-[56px] min-w-0 flex-1 py-2 text-left" onClick={() => setEditing(open ? null : r.key)}>
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium">{p ? p.name : r.newName}</span>
                    {!p && <span className="shrink-0 rounded-full border border-line px-2 text-[11px] text-muted">{m.capture.newBadge}</span>}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {r.line.clean}
                    {r.line.weighed ? ` · ${formatDecimal(r.line.quantity, 3)} kg` : r.line.units > 1 ? ` · × ${r.line.units}` : ''}
                  </span>
                </button>
                <Icon name={open ? 'up' : 'down'} size={18} className="shrink-0 text-muted" />
              </div>
              {open && (
                <LineEditor
                  line={r}
                  onPick={(productId) => {
                    update(r.key, { productId, via: 'user' });
                    setEditing(null);
                  }}
                  onNew={(name) => {
                    update(r.key, { productId: null, via: null, newName: name });
                    setEditing(null);
                  }}
                />
              )}
            </li>
          );
        })}
      </ul>

      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-lg bg-bg/95 md:max-w-xl px-5 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur">
        <button className="btn-primary w-full" disabled={!included.length} onClick={onConfirm}>
          {pricesOnly ? m.capture.receipt.confirmPrices(included.length) : m.capture.receipt.confirm(included.length)}
        </button>
      </div>
    </div>
  );
}

function LineEditor({
  line, onPick, onNew,
}: { line: ReviewLine; onPick: (productId: string) => void; onNew: (name: string) => void }) {
  const view = useView()!;
  // La búsqueda arranca con las primeras palabras («Galletitas el trigal…» → «Galletitas»)
  const [q, setQ] = useState(line.newName.split(' ').slice(0, line.newName.split(' ')[0].length > 3 ? 1 : 2).join(' '));
  const [name, setName] = useState(line.newName);
  const results = searchProducts(q, view.products).slice(0, 5);
  return (
    <div className="space-y-3 border-t border-line bg-sunken/40 px-4 py-3">
      <p className="text-xs text-muted">{m.capture.quote(line.line.description)}</p>
      <label className="relative block">
        <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input className="field pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder={m.capture.receipt.searchPlaceholder} aria-label={m.capture.receipt.searchLabel} />
      </label>
      {results.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {results.map((p) => (
            <button key={p.id} className={`chip min-h-tap ${line.productId === p.id ? 'border-primary bg-primary text-on-primary' : 'bg-surface'}`} onClick={() => onPick(p.id)}>
              {p.name}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} aria-label={m.capture.receipt.newNameLabel} />
        <button className="btn-ghost shrink-0 px-3" disabled={!name.trim()} onClick={() => onNew(name.trim())}>
          {m.capture.receipt.newButton}
        </button>
      </div>
    </div>
  );
}

/** «¿De qué súper es?»: para comparar precios hace falta saberlo */
function StorePicker({ onPick }: { onPick: (store: string) => void }) {
  const view = useView()!;
  const data = usePriceData(view.household.id);
  const [other, setOther] = useState<string | null>(null);
  const t = m.prices.receipt;
  const choices = [...new Set([...data.stores, ...data.allStores])].slice(0, 10);
  return (
    <div className="card space-y-2 border-primary/30 p-3">
      <p className="text-sm font-medium">{t.which}</p>
      <div className="flex flex-wrap gap-2">
        {choices.map((s) => (
          <button key={s} type="button" className="chip min-h-[40px] bg-surface" onClick={() => onPick(s)}>
            {storeLabel(s)}
          </button>
        ))}
        {other === null && (
          <button type="button" className="chip min-h-[40px] border-dashed bg-surface text-muted" onClick={() => setOther('')}>
            {t.other}
          </button>
        )}
      </div>
      {other !== null && (
        <div className="flex gap-2">
          <input className="field" autoFocus placeholder={t.otherPlaceholder} value={other} onChange={(e) => setOther(e.target.value)} />
          <button
            type="button"
            className="btn-primary shrink-0 px-4"
            disabled={!other.trim()}
            onClick={() => {
              const key = addStore(other);
              if (key) onPick(key);
            }}
          >
            <Icon name="check" size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
