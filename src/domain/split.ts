/**
 * Dividir gastos: cuánto puso cada uno (los tickets y gastos que pagó) y cuánto le tocaba según cómo se
 * reparte (partes iguales o porcentajes). El saldo dice quién le debe a quién. «Saldar» pone las cuentas en
 * cero: solo cuenta lo cargado después.
 */
import type { PurchaseLine } from './spending';
import type { Member } from './types';

export interface SplitMember {
  userId: string;
  name: string;
  /** Lo que pagó desde el último «Saldar» */
  paid: number;
  /** Lo que le toca pagar según el reparto */
  share: number;
  /** paid − share: positivo = le deben; negativo = debe */
  balance: number;
}

export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

export interface SplitResult {
  members: SplitMember[];
  total: number;
  /** Gastos sin «quién pagó» (o de alguien que no participa): no entran en la cuenta */
  unassigned: number;
  transfers: Transfer[];
}

/** El Apple Watch entra al hogar como un miembro más: no paga ni debe */
const WATCH = /\b(reloj|watch|rel[oó]gio|montre|orologio|klocka|ur)\b|手表|時計/i;

/** Quiénes participan y con qué peso. Sin configurar: todos (menos los relojes) por partes iguales. */
export function splitWeights(members: Member[], saved: Record<string, number> | null | undefined): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of members) {
    const w = saved?.[m.user_id];
    if (w != null) out.set(m.user_id, Math.max(0, w));
    else out.set(m.user_id, WATCH.test(m.display_name ?? '') ? 0 : 1);
  }
  return out;
}

export function splitExpenses(
  lines: PurchaseLine[],
  members: Member[],
  opts: { weights?: Record<string, number> | null; since?: string | null; nameOf?: (m: Member) => string } = {},
): SplitResult {
  const weights = splitWeights(members, opts.weights);
  const participants = members.filter((m) => (weights.get(m.user_id) ?? 0) > 0);
  const since = opts.since ? Date.parse(opts.since) : -Infinity;
  const paid = new Map<string, number>(participants.map((m) => [m.user_id, 0]));
  let total = 0;
  let unassigned = 0;
  for (const l of lines) {
    const when = Date.parse(l.created_at ?? l.bought_at);
    if (!(when > since)) continue;
    if (l.paid_by && paid.has(l.paid_by)) {
      paid.set(l.paid_by, paid.get(l.paid_by)! + l.total);
      total += l.total;
    } else {
      unassigned += l.total;
    }
  }
  const weightSum = participants.reduce((a, m) => a + (weights.get(m.user_id) ?? 0), 0) || 1;
  const result: SplitMember[] = participants.map((m) => {
    const share = (total * (weights.get(m.user_id) ?? 0)) / weightSum;
    const p = paid.get(m.user_id) ?? 0;
    return { userId: m.user_id, name: opts.nameOf?.(m) ?? m.display_name ?? '', paid: p, share, balance: p - share };
  });
  return { members: result, total, unassigned, transfers: transfersFor(result) };
}

/** Las menos transferencias posibles: el que más debe le paga al que más le deben, y así. */
export function transfersFor(members: Pick<SplitMember, 'userId' | 'balance'>[]): Transfer[] {
  const debtors = members.filter((m) => m.balance < -0.5).map((m) => ({ id: m.userId, left: -m.balance })).sort((a, b) => b.left - a.left);
  const creditors = members.filter((m) => m.balance > 0.5).map((m) => ({ id: m.userId, left: m.balance })).sort((a, b) => b.left - a.left);
  const out: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].left, creditors[j].left);
    if (amount >= 0.5) out.push({ from: debtors[i].id, to: creditors[j].id, amount: Math.round(amount) });
    debtors[i].left -= amount;
    creditors[j].left -= amount;
    if (debtors[i].left < 0.5) i++;
    if (creditors[j].left < 0.5) j++;
  }
  return out;
}

/** «1.250,50», «1250.5», «1,250» → número (coma o punto decimal, según cómo se escriba) */
export function parseAmount(text: string): number {
  const t = text.trim();
  if (!t) return NaN;
  if (t.includes(',') && t.includes('.')) {
    // El último separador es el decimal
    return t.lastIndexOf(',') > t.lastIndexOf('.') ? Number(t.replace(/\./g, '').replace(',', '.')) : Number(t.replace(/,/g, ''));
  }
  const sep = t.includes(',') ? ',' : t.includes('.') ? '.' : null;
  if (!sep) return Number(t);
  const parts = t.split(sep);
  // «1.250» o «12,500»: miles; «12,5» o «12.50»: decimales
  if (parts.length > 2 || parts[parts.length - 1].length === 3) return Number(parts.join(''));
  return Number(parts.join('.'));
}
