export function ChipPicker<T extends { id: string; name: string }>({
  items, value, onChange, icon, allowNone = true,
}: {
  items: T[];
  value: string | null;
  onChange: (id: string | null) => void;
  icon?: (item: T) => string;
  allowNone?: boolean;
}) {
  return (
    <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(active && allowNone ? null : it.id)}
            className={`chip min-h-tap ${active ? 'bg-primary text-on-primary' : 'bg-surface text-ink shadow-card'}`}
          >
            {icon && <span aria-hidden>{icon(it)}</span>}
            {it.name}
          </button>
        );
      })}
    </div>
  );
}
