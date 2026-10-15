export function Toggle({
  checked, onChange, label, hint,
}: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-[56px] w-full items-center gap-3 text-left"
    >
      <span className="flex-1">
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      <span className={`relative h-8 w-[52px] shrink-0 rounded-full transition ${checked ? 'bg-primary' : 'bg-line'}`}>
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${checked ? 'left-[24px]' : 'left-1'}`}
        />
      </span>
    </button>
  );
}
