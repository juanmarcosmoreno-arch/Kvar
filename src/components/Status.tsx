import type { StockStatus } from '../domain/types';
import { STATUS_LABEL } from '../domain/types';

export const STATUS_BG: Record<StockStatus, string> = { ok: 'bg-ok', low: 'bg-low', out: 'bg-out' };
export const STATUS_SOFT: Record<StockStatus, string> = {
  ok: 'bg-ok/15 text-[#2E7A4A] dark:text-ok',
  low: 'bg-low/20 text-[#9A6300] dark:text-low',
  out: 'bg-out/15 text-[#B53A2A] dark:text-out',
};

export const STATUS_TEXT: Record<StockStatus, string> = {
  ok: 'text-muted',
  low: 'text-[#9A6300] dark:text-low',
  out: 'text-[#B53A2A] dark:text-out',
};

export function StatusPill({ status, className = '' }: { status: StockStatus; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line/80 px-2.5 py-1 text-[13px] ${STATUS_TEXT[status]} ${className}`}>
      <StatusDot status={status} size={7} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function StatusDot({ status, size = 12 }: { status: StockStatus; size?: number }) {
  return <span className={`inline-block shrink-0 rounded-full ${STATUS_BG[status]}`} style={{ width: size, height: size }} />;
}

/** Selector de tres estados con botones grandes (zona táctil ≥ 44px). */
export function StatusPicker({ value, onChange }: { value: StockStatus; onChange: (s: StockStatus) => void }) {
  const opts: StockStatus[] = ['ok', 'low', 'out'];
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Estado">
      {opts.map((s) => {
        const active = s === value;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(s)}
            className={`flex min-h-[52px] items-center justify-center gap-2 rounded-xl border text-sm transition ${
              active ? `${STATUS_SOFT[s]} border-current font-medium` : 'border-line bg-surface text-ink'
            }`}
          >
            <StatusDot status={s} size={8} />
            {STATUS_LABEL[s]}
          </button>
        );
      })}
    </div>
  );
}
