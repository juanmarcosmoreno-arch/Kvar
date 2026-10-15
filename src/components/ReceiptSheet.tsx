import { useMemo, useRef, useState } from 'react';
import { searchProducts } from '../domain/aliases';
import { buildReview, parseReceiptText, type ParsedReceipt, type ReviewLine } from '../domain/receipt';
import sampleTicket from '../assets/demo/ticket-macromercado.txt?raw';
import { isDemo } from '../lib/demo';
import { canReadPhotos, readReceiptPhoto } from '../lib/ocr';
import { applyReceipt } from '../store/actions';
import { useView } from '../store/store';
import { toast } from '../store/toast';
import { Icon } from './Icon';
import { Sheet } from './Sheet';

type Phase = 'start' | 'paste' | 'reading' | 'review';

const money = (n: number) => n.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Foto del ticket → «Encontré 57 productos, ¿confirmás?».
 * Cada línea propone un producto del hogar (o uno nuevo); se corrige con un toque y se confirma todo junto.
 */
export function ReceiptSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const view = useView();
  const [phase, setPhase] = useState<Phase>('start');
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null);
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
      setError('No encontré líneas de productos. Probá con una foto más derecha y con buena luz, o pegá el texto.');
      setPhase('start');
      return;
    }
    setParsed(p);
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
      setError('No pude leer la foto. Probá de nuevo, con el ticket estirado y buena luz.');
      setPhase('start');
    }
  };

  const confirm = () => {
    const { updated, created } = applyReceipt(review, parsed?.store ?? null);
    toast(`Listo: ${updated} actualizados${created ? ` y ${created} nuevos` : ''}. La próxima vez los reconozco.`);
    close();
  };

  const title = phase === 'review' ? `Encontré ${review.length} productos` : 'Foto del ticket';

  return (
    <Sheet open={open} onClose={close} title={title}>
      {phase === 'start' && (
        <div className="space-y-3 pb-4">
          <p className="text-muted">
            Leo el ticket, te propongo a qué producto corresponde cada línea y confirmás todo junto. Lo que confirmes lo
            aprendo para la próxima.
          </p>
          {canReadPhotos && (
            <>
              <input ref={input} type="file" accept="image/*" className="hidden" onChange={onPhoto} />
              <button className="btn-primary w-full" onClick={() => input.current?.click()}>
                <Icon name="camera" size={20} /> Sacale una foto al ticket
              </button>
              <p className="text-xs text-muted">Estiralo sobre la mesa, con buena luz y entero en la foto.</p>
            </>
          )}
          <button className={canReadPhotos ? 'btn-ghost w-full' : 'btn-primary w-full'} onClick={() => setPhase('paste')}>
            Pegar el texto del ticket
          </button>
          {!canReadPhotos && (
            <p className="text-xs text-muted">
              Leer fotos de tickets está en la app de iPhone. Acá podés pegar el texto, por ejemplo del e-Ticket que llega por correo.
            </p>
          )}
          {isDemo && (
            <button className="btn-ghost w-full" onClick={() => analyze(sampleTicket)}>
              Probar con un ticket de ejemplo (Macromercado)
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
            aria-label="Texto del ticket"
          />
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-ghost" onClick={() => setPhase('start')}>Volver</button>
            <button className="btn-primary" disabled={!text.trim()} onClick={() => analyze(text)}>Leer</button>
          </div>
        </div>
      )}

      {phase === 'reading' && (
        <div className="flex flex-col items-center gap-3 py-12 text-muted">
          <Icon name="sync" className="animate-spin" />
          Leyendo el ticket…
        </div>
      )}

      {phase === 'review' && parsed && (
        <ReviewList
          parsed={parsed}
          review={review}
          setReview={setReview}
          editing={editing}
          setEditing={setEditing}
          onConfirm={confirm}
        />
      )}
    </Sheet>
  );
}

function ReviewList({
  parsed, review, setReview, editing, setEditing, onConfirm,
}: {
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
          {parsed.store === 'macromercado' ? 'Macromercado' : parsed.store ?? 'Ticket'}
          {parsed.date ? ` · ${parsed.date.split('-').reverse().join('/')}` : ''} · {known} conocidos ·{' '}
          {included.length - known} nuevos
        </p>
        {parsed.difference === 0 && parsed.total != null && (
          <p className="flex items-center gap-1.5 text-[#2E7A4A] dark:text-ok">
            <Icon name="check" size={16} /> La suma da ${money(parsed.total)}, igual que el total.
          </p>
        )}
        {parsed.difference != null && parsed.difference !== 0 && (
          <p className="text-[#9A6300] dark:text-low">
            La suma no coincide con el total (diferencia ${money(Math.abs(parsed.difference))}). Puede que alguna línea se
            haya leído mal: revisalas.
          </p>
        )}
      </div>

      {included.length - known > 0 || review.some((r) => !r.include && !r.productId) ? (
        <div className="flex flex-wrap gap-2">
          <button
            className="chip min-h-[36px] bg-surface"
            onClick={() => setReview(review.map((r) => ({ ...r, include: Boolean(r.productId) })))}
          >
            Solo los conocidos
          </button>
          <button className="chip min-h-[36px] bg-surface" onClick={() => setReview(review.map((r) => ({ ...r, include: true })))}>
            Todos
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
                  aria-label={r.include ? 'No cargar esta línea' : 'Cargar esta línea'}
                  onClick={() => update(r.key, { include: !r.include })}
                >
                  <span className={`flex h-6 w-6 items-center justify-center rounded-md border ${r.include ? 'border-primary bg-primary text-on-primary' : 'border-line'}`}>
                    {r.include && <Icon name="check" size={14} strokeWidth={2.5} />}
                  </span>
                </button>
                <button className="min-h-[56px] min-w-0 flex-1 py-2 text-left" onClick={() => setEditing(open ? null : r.key)}>
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium">{p ? p.name : r.newName}</span>
                    {!p && <span className="shrink-0 rounded-full border border-line px-2 text-[11px] text-muted">nuevo</span>}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {r.line.clean}
                    {r.line.weighed ? ` · ${r.line.quantity.toLocaleString('es-UY')} kg` : r.line.units > 1 ? ` · × ${r.line.units}` : ''}
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

      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-lg bg-bg/95 px-5 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur">
        <button className="btn-primary w-full" disabled={!included.length} onClick={onConfirm}>
          Confirmar {included.length} {included.length === 1 ? 'producto' : 'productos'}
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
      <p className="text-xs text-muted">«{line.line.description}»</p>
      <label className="relative block">
        <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input className="field pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en tus productos" aria-label="Buscar producto" />
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
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nombre del producto nuevo" />
        <button className="btn-ghost shrink-0 px-3" disabled={!name.trim()} onClick={() => onNew(name.trim())}>
          Nuevo
        </button>
      </div>
    </div>
  );
}
