import { useEffect, useRef, useState } from 'react';
import { resolveVoice, voiceProductName, type ResolvedVoiceAction, type VoiceKind } from '../domain/voice';
import { STATUS_LABEL } from '../domain/types';
import { formatQuantity } from '../domain/units';
import { AI_HINT, canDictate, interpret, startDictation, voiceAvailability, type AIStatus } from '../lib/voice';
import { applyVoice } from '../store/actions';
import { useView } from '../store/store';
import { toast } from '../store/toast';
import { Icon, type IconName } from './Icon';
import { Sheet } from './Sheet';

type Phase = 'idle' | 'listening' | 'thinking' | 'review';

const KIND: Record<VoiceKind, { label: string; icon: IconName }> = {
  bought: { label: 'Compraste', icon: 'cart' },
  out: { label: 'Se terminó', icon: 'minus' },
  low: { label: 'Queda poco', icon: 'down' },
  list: { label: 'A la lista', icon: 'plus' },
  ask: { label: '¿Hay?', icon: 'search' },
};

const EXAMPLES = ['Compré leche y dos paquetes de fideos', 'Se terminó el aceite', '¿Hay arroz?'];

/** «Decíselo»: hablás, Stoka entiende (Apple Intelligence) y confirmás con un toque. */
export function VoiceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const view = useView();
  const [phase, setPhase] = useState<Phase>('idle');
  const [said, setSaid] = useState('');
  const [typed, setTyped] = useState('');
  const [ai, setAi] = useState<AIStatus>('unsupported');
  const [speech, setSpeech] = useState(false);
  const [by, setBy] = useState<'ai' | 'rules'>('rules');
  const [actions, setActions] = useState<ResolvedVoiceAction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef<null | (() => Promise<string>)>(null);

  useEffect(() => {
    if (!open) return;
    void voiceAvailability().then((a) => {
      setAi(a.ai);
      setSpeech(a.speech);
    });
  }, [open]);

  const reset = () => {
    setPhase('idle');
    setSaid('');
    setTyped('');
    setActions([]);
    setError(null);
  };

  const close = () => {
    void stopRef.current?.().catch(() => {});
    stopRef.current = null;
    reset();
    onClose();
  };

  const understand = async (text: string) => {
    if (!view || !text.trim()) {
      setPhase('idle');
      return;
    }
    setSaid(text);
    setPhase('thinking');
    const r = await interpret(text, ai);
    setBy(r.by);
    setActions(resolveVoice(r.actions, view.aliases ?? [], view.products));
    setPhase('review');
  };

  const listen = async () => {
    setError(null);
    setSaid('');
    try {
      stopRef.current = await startDictation((t) => setSaid(t));
      setPhase('listening');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude usar el micrófono.');
    }
  };

  const done = async () => {
    const stop = stopRef.current;
    stopRef.current = null;
    if (!stop) return;
    setPhase('thinking');
    const text = await stop().catch(() => said);
    await understand(text || said);
  };

  const confirm = () => {
    const n = applyVoice(actions);
    toast(n ? `Listo: ${n} ${n === 1 ? 'cambio' : 'cambios'}.` : 'No había nada para cambiar.');
    close();
  };

  const byId = new Map((view?.products ?? []).map((p) => [p.id, p]));
  const toApply = actions.filter((a) => a.include && a.kind !== 'ask').length;

  return (
    <Sheet open={open} onClose={close} title="Decíselo">
      <div className="space-y-4 pb-4">
        {(phase === 'idle' || phase === 'listening') && (
          <>
            {canDictate && speech ? (
              <div className="flex flex-col items-center gap-3 py-2">
                <button
                  aria-label={phase === 'listening' ? 'Terminé de hablar' : 'Empezar a hablar'}
                  onClick={() => void (phase === 'listening' ? done() : listen())}
                  className={`flex h-24 w-24 items-center justify-center rounded-full text-on-primary shadow-fab transition ${
                    phase === 'listening' ? 'animate-pulse bg-out' : 'bg-primary'
                  }`}
                >
                  <Icon name={phase === 'listening' ? 'check' : 'mic'} size={40} />
                </button>
                <p className="min-h-[3rem] text-center text-muted">
                  {phase === 'listening' ? said || 'Te escucho…' : 'Tocá y decí, por ejemplo: «Compré leche y dos paquetes de fideos».'}
                </p>
              </div>
            ) : (
              <p className="text-muted">
                {canDictate
                  ? 'El reconocimiento de voz no está disponible en este iPhone. Podés escribirlo.'
                  : 'La voz está en la app de iPhone. Acá podés escribir la frase y la entiendo igual.'}
              </p>
            )}
            {AI_HINT[ai] && <p className="text-xs text-muted">{AI_HINT[ai]}</p>}
            {phase === 'idle' && (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void understand(typed);
                }}
              >
                <input className="field" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="o escribilo acá" aria-label="Frase" />
                <button className="btn-ghost shrink-0 px-4" disabled={!typed.trim()}>Listo</button>
              </form>
            )}
            {phase === 'idle' && !canDictate && (
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button key={ex} className="chip min-h-[36px] bg-surface text-muted" onClick={() => void understand(ex)}>
                    «{ex}»
                  </button>
                ))}
              </div>
            )}
            {error && <p className="rounded-xl bg-out/10 p-3 text-sm text-out">{error}</p>}
          </>
        )}

        {phase === 'thinking' && (
          <div className="flex flex-col items-center gap-3 py-10 text-muted">
            <Icon name="sync" className="animate-spin" />
            {ai === 'available' ? 'Entendiendo con Apple Intelligence…' : 'Entendiendo…'}
          </div>
        )}

        {phase === 'review' && (
          <>
            <p className="text-sm text-muted">
              «{said}»{by === 'ai' ? ' · entendido con Apple Intelligence' : ''}
            </p>
            {actions.length === 0 ? (
              <p className="py-4 text-center text-muted">No entendí qué productos. Probá de nuevo, por ejemplo: «Se terminó la leche».</p>
            ) : (
              <ul className="card divide-y divide-line">
                {actions.map((a) => {
                  const p = a.productId ? byId.get(a.productId) : undefined;
                  const name = p?.name ?? voiceProductName(a.product);
                  return (
                    <li key={a.key} className={`flex items-center gap-3 px-3 ${a.include ? '' : 'opacity-50'}`}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sunken text-muted">
                        <Icon name={KIND[a.kind].icon} size={18} />
                      </span>
                      <span className="min-h-[56px] min-w-0 flex-1 py-2">
                        <span className="block text-xs text-muted">{KIND[a.kind].label}</span>
                        <span className="block truncate font-medium">
                          {name}
                          {a.quantity > 1 && a.kind !== 'ask' ? ` × ${a.quantity}` : ''}
                          {!p && a.kind !== 'ask' && <span className="ml-2 rounded-full border border-line px-2 text-[11px] font-normal text-muted">nuevo</span>}
                        </span>
                        {a.kind === 'ask' && (
                          <span className="block text-sm text-muted">
                            {p
                              ? `${STATUS_LABEL[p.status]}${p.track_quantity ? ` · ${formatQuantity(p.quantity, p.unit)}` : ''}`
                              : 'No lo tenés cargado'}
                          </span>
                        )}
                      </span>
                      {a.kind !== 'ask' && (
                        <button
                          className="flex min-h-tap min-w-tap items-center justify-center"
                          aria-label={a.include ? 'No aplicar' : 'Aplicar'}
                          onClick={() => setActions(actions.map((x) => (x.key === a.key ? { ...x, include: !x.include } : x)))}
                        >
                          <span className={`flex h-6 w-6 items-center justify-center rounded-md border ${a.include ? 'border-primary bg-primary text-on-primary' : 'border-line'}`}>
                            {a.include && <Icon name="check" size={14} strokeWidth={2.5} />}
                          </span>
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-ghost" onClick={reset}>Otra vez</button>
              <button className="btn-primary" disabled={!toApply} onClick={confirm}>
                {toApply ? 'Confirmar' : 'Listo'}
              </button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
