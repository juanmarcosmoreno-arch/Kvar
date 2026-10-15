import { useEffect, useRef } from 'react';
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
  const row = useRef<HTMLDivElement>(null);
  // Al abrir, la opción elegida queda a la vista aunque esté al final de la fila
  useEffect(() => {
    const el = row.current?.querySelector<HTMLElement>('[data-active="true"]');
    if (el && row.current) row.current.scrollLeft = el.offsetLeft - row.current.clientWidth / 2 + el.clientWidth / 2;
  }, []);
  return (
    <div ref={row} className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            type="button"
            data-active={active}
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
