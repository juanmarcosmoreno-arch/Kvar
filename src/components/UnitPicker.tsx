import { useMemo, useState } from 'react';
import { normalizeAlias } from '../domain/aliases';
import { findUnit, householdUnits, UNIT_CATALOG } from '../domain/units';

/** Las más usadas en una casa; el resto del catálogo queda detrás de «Más». */
const COMMON = new Set(['unidades', 'paquetes', 'latas', 'botellas', 'cajas', 'rollos']);
import { useView } from '../store/store';
import { Icon } from './Icon';

/** Elegir la unidad del catálogo (o una propia, que queda disponible para otros productos). */
export function UnitPicker({ value, onChange }: { value: string | null; onChange: (unit: string) => void }) {
  const view = useView();
  const [custom, setCustom] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const units = useMemo(() => householdUnits((view?.products ?? []).map((p) => p.unit)), [view?.products]);
  const current = normalizeAlias(findUnit(value).plural);
  const catalog = new Set(UNIT_CATALOG.map((u) => u.plural));
  const visible = all
    ? units
    : units.filter((u) => COMMON.has(u.plural) || !catalog.has(u.plural) || normalizeAlias(u.plural) === current);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {visible.map((u) => {
          const active = normalizeAlias(u.plural) === current;
          return (
            <button
              key={u.plural}
              type="button"
              aria-pressed={active}
              className={`chip min-h-[40px] ${active ? 'border-primary bg-primary text-on-primary' : 'bg-surface text-ink'}`}
              onClick={() => onChange(u.plural)}
            >
              {u.plural}
            </button>
          );
        })}
        {!all && visible.length < units.length && (
          <button type="button" className="chip min-h-[40px] bg-surface text-muted" onClick={() => setAll(true)}>
            Más
          </button>
        )}
        {custom === null && (
          <button type="button" className="chip min-h-[40px] bg-surface text-muted" onClick={() => setCustom('')}>
            <Icon name="plus" size={14} /> Otra
          </button>
        )}
      </div>
      {custom !== null && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const u = custom.trim().toLowerCase();
            if (u) onChange(u);
            setCustom(null);
          }}
        >
          <input
            autoFocus
            className="field"
            placeholder="En plural, ej: pañales, tarros"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            maxLength={24}
          />
          <button className="btn-primary px-4" disabled={!custom.trim()}>Usar</button>
        </form>
      )}
    </div>
  );
}
