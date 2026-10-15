import type { ReactNode } from 'react';

export interface RankRow {
  id: string;
  label: string;
  value: number;
  /** Texto del valor al final de la barra («2,3 por mes») */
  valueLabel: string;
  /** Dato extra debajo del nombre («dura ~6 días») */
  detail?: string;
  icon?: ReactNode;
}

/**
 * Barras horizontales de una sola serie, de mayor a menor (magnitud → un solo color). El nombre arriba,
 * la barra (fina, punta redondeada, base recta) y el valor al final, en texto común. Toda la fila se toca.
 */
export function RankBars({ rows, onSelect, label }: { rows: RankRow[]; onSelect?: (id: string) => void; label: string }) {
  const max = Math.max(...rows.map((r) => r.value), 0) || 1;
  return (
    <ul className="divide-y divide-line" aria-label={label}>
      {rows.map((r) => {
        const content = (
          <>
            <span className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                {r.icon}
                <span className="truncate font-medium">{r.label}</span>
              </span>
              <span className="shrink-0 text-sm tabular-nums text-muted">{r.valueLabel}</span>
            </span>
            <span className="mt-2 block h-2.5 w-full" aria-hidden>
              <span
                className="block h-full rounded-r-[4px] bg-primary"
                style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }}
              />
            </span>
            {r.detail && <span className="mt-1.5 block text-xs text-muted">{r.detail}</span>}
          </>
        );
        return (
          <li key={r.id}>
            {onSelect ? (
              <button className="block min-h-tap w-full px-4 py-3 text-left active:bg-sunken/60" onClick={() => onSelect(r.id)}>
                {content}
              </button>
            ) : (
              <div className="px-4 py-3">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Indicador: etiqueta arriba, número grande y una aclaración chica. */
export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card min-w-0 p-4">
      <div className="min-h-[2.5rem] text-sm leading-tight text-muted">{label}</div>
      <div className="mt-1 text-[1.65rem] font-semibold leading-tight">{value}</div>
      {hint && <div className="mt-0.5 truncate text-xs text-muted">{hint}</div>}
    </div>
  );
}
