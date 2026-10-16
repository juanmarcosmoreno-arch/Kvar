import { useMemo, useState } from 'react';
import { parseAmount, splitExpenses, splitWeights } from '../domain/split';
import type { PurchaseLine } from '../domain/spending';
import type { Member, Snapshot } from '../domain/types';
import { formatDate, m } from '../i18n';
import { formatCurrency } from '../lib/currency';
import { useMe } from '../lib/me';
import { useSplit } from '../lib/split';
import { addExpense, setExpenseSplit, settleExpenses } from '../store/actions';
import { toast } from '../store/toast';
import { Icon } from './Icon';
import { Sheet } from './Sheet';

/** Nombre de un miembro para las cuentas («Juan (vos)») */
export function memberName(member: Member | undefined, me: string | null): string {
  const name = member?.display_name?.trim() || m.money.split.someone;
  if (!member || member.user_id !== me) return name;
  // Si ya se llama «Vos», no «Vos (vos)»
  const word = m.money.split.you('').replace(/[()（）\s]/g, '').toLowerCase();
  return name.toLowerCase() === word ? name : m.money.split.you(name);
}

/** Quienes participan de las cuentas (sin los relojes ni los que se sacaron) */
export function splitParticipants(view: Snapshot, weights: Record<string, number> | null | undefined): Member[] {
  const w = splitWeights(view.members, weights);
  return view.members.filter((x) => (w.get(x.user_id) ?? 0) > 0);
}

/** Cuentas (Gastos): cuánto puso cada uno, quién le debe a quién, agregar un gasto sin ticket y saldar. */
export function SplitCard({ view, lines }: { view: Snapshot; lines: PurchaseLine[] }) {
  const me = useMe();
  const data = useSplit(view.household.id);
  const [confirming, setConfirming] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const t = m.money.split;
  const weights = data.status === 'ready' ? data.weights : null;
  const since = data.status === 'ready' ? data.settledAt : null;
  const byId = new Map(view.members.map((x) => [x.user_id, x]));
  const name = (id: string) => memberName(byId.get(id), me);
  const result = useMemo(
    () => splitExpenses(lines, view.members, { weights, since, nameOf: (x) => memberName(x, me) }),
    [lines, view.members, weights, since, me],
  );
  const participants = splitParticipants(view, weights);

  if (data.status !== 'ready') return null;
  if (participants.length < 2) {
    return (
      <section className="card space-y-2 p-4">
        <h2 className="font-semibold">{t.title}</h2>
        <p className="text-sm text-muted">{t.onlyOne}</p>
      </section>
    );
  }

  return (
    <section className="card space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{t.title}</h2>
          <p className="text-sm text-muted">{since ? t.since(formatDate(since)) : t.sinceStart}</p>
        </div>
        <button
          className="flex min-h-tap shrink-0 items-center gap-1 text-sm font-medium text-primary"
          onClick={() => setEditing(!editing)}
          aria-expanded={editing}
        >
          {t.howSplit} <Icon name={editing ? 'up' : 'down'} size={16} />
        </button>
      </div>

      {editing && <SplitEditor view={view} weights={weights} me={me} />}

      <ul className="divide-y divide-line">
        {result.members.map((x) => (
          <li key={x.userId} className="flex min-h-[48px] items-center gap-3 py-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{x.name}</span>
              <span className="text-sm tabular-nums text-muted">{t.paid(formatCurrency(x.paid))}</span>
            </span>
            {Math.abs(x.balance) >= 0.5 && (
              <span className={`shrink-0 text-sm font-medium tabular-nums ${x.balance > 0 ? 'text-[#2E7A4A] dark:text-ok' : 'text-[#B53A2A] dark:text-out'}`}>
                {x.balance > 0 ? t.getsBack(formatCurrency(x.balance)) : t.owesAmount(formatCurrency(-x.balance))}
              </span>
            )}
          </li>
        ))}
      </ul>

      <div className="rounded-2xl bg-sunken/60 p-3 text-center">
        {result.transfers.length === 0 ? (
          <p className="font-medium">{t.even}</p>
        ) : (
          result.transfers.map((tr) => (
            <p key={`${tr.from}-${tr.to}`} className="font-semibold">
              {t.owes(name(tr.from), name(tr.to), formatCurrency(tr.amount))}
            </p>
          ))
        )}
      </div>

      {result.unassigned > 0 && <p className="text-xs text-muted">{t.unassigned(formatCurrency(result.unassigned))}</p>}

      {confirming ? (
        <div className="space-y-2">
          <p className="text-sm">{t.settleQuestion}</p>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-ghost" onClick={() => setConfirming(false)}>{m.common.cancel}</button>
            <button
              className="btn-primary"
              onClick={() => {
                settleExpenses(Object.fromEntries(result.members.map((x) => [x.userId, Math.round(x.balance)])));
                setConfirming(false);
                toast(t.settled);
              }}
            >
              {t.settleYes}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-ghost" onClick={() => setAdding(true)}>
            <Icon name="plus" size={18} /> {t.addExpense}
          </button>
          <button className="btn-ghost" disabled={result.total === 0} onClick={() => setConfirming(true)}>
            <Icon name="check" size={18} /> {t.settle}
          </button>
        </div>
      )}

      <ExpenseSheet open={adding} onClose={() => setAdding(false)} participants={participants} me={me} />
    </section>
  );
}

/** Cómo se divide: partes iguales o un porcentaje para cada uno (0 = no participa). */
function SplitEditor({ view, weights, me }: { view: Snapshot; weights: Record<string, number> | null; me: string | null }) {
  const t = m.money.split;
  const current = splitWeights(view.members, weights);
  const custom = weights != null;
  const total = [...current.values()].reduce((a, b) => a + b, 0) || 1;
  const change = (userId: string, delta: number) => {
    const next: Record<string, number> = {};
    for (const x of view.members) next[x.user_id] = Math.round(((current.get(x.user_id) ?? 0) / total) * 100);
    next[userId] = Math.max(0, Math.min(100, (next[userId] ?? 0) + delta));
    setExpenseSplit(next);
  };
  return (
    <div className="space-y-2 rounded-2xl border border-line p-3">
      <div className="flex rounded-full bg-sunken p-1 text-sm" role="group" aria-label={t.howSplit}>
        {([false, true] as const).map((v) => (
          <button
            key={String(v)}
            className={`min-h-[36px] flex-1 rounded-full px-3 font-medium ${custom === v ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
            aria-pressed={custom === v}
            onClick={() => (v ? change(view.members[0].user_id, 0) : setExpenseSplit(null))}
          >
            {v ? t.custom : t.equal}
          </button>
        ))}
      </div>
      {custom &&
        view.members.map((x) => {
          const pct = Math.round(((current.get(x.user_id) ?? 0) / total) * 100);
          return (
            <div key={x.user_id} className="flex min-h-[44px] items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{memberName(x, me)}</span>
              <button className="flex min-h-tap min-w-tap items-center justify-center text-muted" aria-label={m.common.less} onClick={() => change(x.user_id, -5)}>
                <Icon name="minus" size={18} />
              </button>
              <span className="w-12 text-center text-sm font-semibold tabular-nums">{pct} %</span>
              <button className="flex min-h-tap min-w-tap items-center justify-center text-muted" aria-label={m.common.more} onClick={() => change(x.user_id, 5)}>
                <Icon name="plus" size={18} />
              </button>
            </div>
          );
        })}
    </div>
  );
}

/** Gasto sin ticket: monto, qué fue y quién pagó. */
function ExpenseSheet({
  open, onClose, participants, me,
}: { open: boolean; onClose: () => void; participants: Member[]; me: string | null }) {
  const t = m.money.split;
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [payer, setPayer] = useState<string | null>(null);
  const value = parseAmount(amount);
  const paidBy = payer ?? (participants.some((x) => x.user_id === me) ? me : participants[0]?.user_id ?? null);
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(value > 0)) return;
    addExpense({ amount: value, description, paidBy });
    toast(t.saved(formatCurrency(value)));
    setAmount('');
    setDescription('');
    setPayer(null);
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title={t.expenseTitle}>
      <form onSubmit={save} className="space-y-4 pb-4">
        <label className="block space-y-1.5">
          <span className="text-sm text-muted">{t.amount}</span>
          <input
            className="field text-2xl tabular-nums"
            inputMode="decimal"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
            autoFocus
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm text-muted">{t.description}</span>
          <input className="field" placeholder={t.descriptionPlaceholder} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <div className="space-y-1.5">
          <span className="text-sm text-muted">{t.paidBy}</span>
          <div className="flex flex-wrap gap-2">
            {participants.map((x) => (
              <button
                key={x.user_id}
                type="button"
                className={`chip min-h-tap ${paidBy === x.user_id ? 'border-primary bg-primary text-on-primary' : 'bg-surface'}`}
                onClick={() => setPayer(x.user_id)}
              >
                {memberName(x, me)}
              </button>
            ))}
          </div>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={!(value > 0)}>
          {t.save}
        </button>
      </form>
    </Sheet>
  );
}

/** «Pagó: Juan · María» para el ticket (solo si hay más de uno en las cuentas). */
export function PayerPicker({ view, value, onChange }: { view: Snapshot; value: string | null; onChange: (id: string) => void }) {
  const me = useMe();
  const data = useSplit(view.household.id);
  const participants = splitParticipants(view, data.status === 'ready' ? data.weights : null);
  if (participants.length < 2) return null;
  const current = value ?? (participants.some((x) => x.user_id === me) ? me : null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted">{m.money.split.paidBy}</span>
      {participants.map((x) => (
        <button
          key={x.user_id}
          type="button"
          className={`chip min-h-[36px] ${current === x.user_id ? 'border-primary bg-primary text-on-primary' : 'bg-surface'}`}
          onClick={() => onChange(x.user_id)}
        >
          {memberName(x, me)}
        </button>
      ))}
    </div>
  );
}

