/**
 * Datos de «Dividir gastos» que no viajan con el hogar: cómo se reparte y el último «Saldar».
 * Se traen aparte y sin romper nada si todavía no se corrió la migración (supabase/migrations/…_dividir_gastos.sql).
 */
import { useEffect, useState } from 'react';
import { isDemo } from './demo';
import { supabase } from './supabase';

export interface SplitData {
  /** Desde cuándo cuentan los gastos (último «Saldar»); null = desde el principio */
  settledAt: string | null;
  /** { user_id: peso }; null = partes iguales */
  weights: Record<string, number> | null;
}

const DEMO_KEY = 'kvar-demo:cuentas';
const local = new Map<string, Partial<SplitData>>();
const listeners = new Set<() => void>();

function readDemo(): SplitData {
  try {
    return { settledAt: null, weights: null, ...JSON.parse(localStorage.getItem(DEMO_KEY) ?? '{}') };
  } catch {
    return { settledAt: null, weights: null };
  }
}

export async function loadSplit(householdId: string): Promise<SplitData> {
  if (isDemo) return readDemo();
  const [settlement, household] = await Promise.all([
    supabase.from('expense_settlements').select('settled_at').eq('household_id', householdId).order('settled_at', { ascending: false }).limit(1),
    supabase.from('households').select('expense_split').eq('id', householdId).maybeSingle(),
  ]);
  const settledAt = settlement.error ? null : ((settlement.data?.[0] as { settled_at?: string } | undefined)?.settled_at ?? null);
  const weights = household.error ? null : ((household.data as { expense_split?: Record<string, number> | null } | null)?.expense_split ?? null);
  return { settledAt, weights };
}

/** Lo que se cambió en este teléfono gana sobre lo traído (hasta que el servidor se entere) */
export function setLocalSplit(householdId: string, patch: Partial<SplitData>) {
  local.set(householdId, { ...local.get(householdId), ...patch });
  if (isDemo) {
    try {
      localStorage.setItem(DEMO_KEY, JSON.stringify({ ...readDemo(), ...patch }));
    } catch {
      /* sin almacenamiento */
    }
  }
  listeners.forEach((l) => l());
}

type State = { status: 'loading' } | ({ status: 'ready' } & SplitData);

export function useSplit(householdId: string): State {
  const [state, setState] = useState<State>({ status: 'loading' });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    listeners.add(bump);
    return () => void listeners.delete(bump);
  }, []);
  useEffect(() => {
    let alive = true;
    loadSplit(householdId).then(
      (d) => alive && setState({ status: 'ready', ...d, ...local.get(householdId) }),
      () => alive && setState({ status: 'ready', settledAt: null, weights: null, ...local.get(householdId) }),
    );
    return () => {
      alive = false;
    };
  }, [householdId, version]);
  return state;
}
