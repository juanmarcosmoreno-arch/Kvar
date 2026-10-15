import { m } from '../i18n';
import { Icon } from './Icon';

/** − 2 personas + (botones de 44px, para usar con una mano). */
export function Stepper({
  value, onChange, min = 1, max = 20, label, unit,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label: string;
  unit?: (n: number) => string;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-line bg-surface" role="group" aria-label={label}>
      <button
        type="button"
        className="flex min-h-tap min-w-tap items-center justify-center text-muted disabled:opacity-30"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label={m.common.less}
      >
        <Icon name="minus" size={18} />
      </button>
      <span className="min-w-[5.5rem] text-center font-medium tabular-nums" aria-live="polite">
        {unit ? unit(value) : value}
      </span>
      <button
        type="button"
        className="flex min-h-tap min-w-tap items-center justify-center text-muted disabled:opacity-30"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label={m.common.more}
      >
        <Icon name="plus" size={18} />
      </button>
    </div>
  );
}

export const peopleLabel = (n: number) => m.common.people(n);
