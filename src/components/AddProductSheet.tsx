import { useEffect, useState } from 'react';
import { searchProducts } from '../domain/aliases';
import type { StockStatus } from '../domain/types';
import { categoryIcon, locationIcon } from '../lib/categoryIcon';
import { createProduct } from '../store/actions';
import { useView } from '../store/store';
import { toast } from '../store/toast';
import type { AddDefaults } from '../store/ui';
import { ChipPicker } from './ChipPicker';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { StatusPicker } from './Status';

/** Alta rápida: solo el nombre es obligatorio. */
export function AddProductSheet({
  defaults, onClose, onOpenExisting,
}: { defaults: AddDefaults | null; onClose: () => void; onOpenExisting: (id: string) => void }) {
  const view = useView();
  const [name, setName] = useState('');
  const [status, setStatusValue] = useState<StockStatus>('ok');
  const [locationId, setLocationId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [staple, setStaple] = useState(false);

  useEffect(() => {
    if (!defaults) return;
    setName(defaults.name ?? '');
    setStatusValue(defaults.status ?? 'ok');
    setLocationId(defaults.location_id ?? null);
    setCategoryId(defaults.category_id ?? null);
    setStaple(false);
  }, [defaults]);

  if (!view) return null;
  const similar = name.trim().length >= 2 ? searchProducts(name, view.products).slice(0, 3) : [];
  const exact = similar.find((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase());

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (exact) {
      onOpenExisting(exact.id);
      return;
    }
    const p = createProduct({ name, status, location_id: locationId, category_id: categoryId, is_staple: staple });
    if (p) toast(status === 'out' ? `Agregué ${p.name} y va a la lista.` : `Agregué ${p.name}.`);
    onClose();
  };

  return (
    <Sheet open={Boolean(defaults)} onClose={onClose} title="Agregar producto">
      <form onSubmit={submit} className="space-y-5 pb-4">
        <input
          autoFocus
          className="field text-lg"
          placeholder="Ej: Yerba, Leche, Pañales…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          enterKeyHint="done"
          autoCapitalize="sentences"
        />
        {similar.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm text-muted">¿Ya lo tenés?</p>
            <div className="flex flex-wrap gap-2">
              {similar.map((p) => (
                <button key={p.id} type="button" className="chip bg-sunken" onClick={() => onOpenExisting(p.id)}>
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <StatusPicker value={status} onChange={setStatusValue} />
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-muted">Lugar</h3>
          <ChipPicker items={[...view.locations].sort((a, b) => a.sort_order - b.sort_order)} value={locationId}
            onChange={setLocationId} icon={(l) => locationIcon(l.icon, l.name)} />
        </section>
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-muted">Categoría</h3>
          <ChipPicker items={[...view.categories].sort((a, b) => a.sort_order - b.sort_order)} value={categoryId}
            onChange={setCategoryId} icon={(c) => categoryIcon(c.name)} />
        </section>
        <button type="button" onClick={() => setStaple(!staple)} aria-pressed={staple}
          className={`chip min-h-tap ${staple ? 'bg-low/20 text-ink' : 'bg-sunken text-muted'}`}>
          <Icon name="star" size={16} fill={staple ? 'currentColor' : undefined} className={staple ? 'text-low' : ''} />
          Es un básico
        </button>
        <button type="submit" className="btn-primary w-full text-lg" disabled={!name.trim()}>
          {exact ? `Ver ${exact.name}` : 'Agregar'}
        </button>
      </form>
    </Sheet>
  );
}
