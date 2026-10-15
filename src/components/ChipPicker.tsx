import { Icon, type IconName } from './Icon';

export function ChipPicker<T extends { id: string; name: string }>({
  items, value, onChange, icon, allowNone = true,
}: {
  items: T[];
  value: string | null;
  onChange: (id: string | null) => void;
  icon?: (item: T) => IconName;
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
            className={`chip min-h-tap ${active ? 'border-primary bg-primary text-on-primary' : 'bg-surface text-ink'}`}
          >
            {icon && <Icon name={icon(it)} size={16} />}
            {it.name}
          </button>
        );
      })}
    </div>
  );
}
