import { useEffect, useState } from 'react';
import { searchProducts } from '../domain/aliases';
import { statusFromQuantity } from '../domain/status';
import { suggestUnit, unitLabel } from '../domain/units';
import type { Product, StockStatus } from '../domain/types';
import { categoryIcon, locationIcon } from '../lib/categoryIcon';
import { createProduct, learnBarcode, markBought, setProductPhoto, setStatus } from '../store/actions';
import { useView } from '../store/store';
import { toast } from '../store/toast';
import type { AddDefaults } from '../store/ui';
import { ChipPicker } from './ChipPicker';
import { Icon } from './Icon';
import { PhotoButton } from './PhotoButton';
import { Sheet } from './Sheet';
import { StatusPicker } from './Status';
import { Toggle } from './Toggle';
import { UnitPicker } from './UnitPicker';
import { m } from '../i18n';

/**
 * Alta rápida: solo el nombre es obligatorio.
 * Si viene de un escaneo, propone lo que encontró en Open Food Facts y ofrece
 * vincular el código con un producto que ya existe («¿Es alguno de estos?»).
 */
export function AddProductSheet({
  defaults, onClose, onOpenExisting,
}: { defaults: AddDefaults | null; onClose: () => void; onOpenExisting: (id: string) => void }) {
  const view = useView();
  const [name, setName] = useState('');
  const [status, setStatusValue] = useState<StockStatus>('ok');
  const [locationId, setLocationId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [staple, setStaple] = useState(false);
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  // Contar unidades (pañales, latas…): desde el alta, sin tener que entrar después a editarlo
  const [counted, setCounted] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState<string | null>(null);
  const [lowAt, setLowAt] = useState(1);

  useEffect(() => {
    if (!defaults) return;
    setName(defaults.name ?? '');
    setStatusValue(defaults.status ?? 'ok');
    setLocationId(defaults.location_id ?? null);
    setCategoryId(defaults.category_id ?? null);
    setStaple(false);
    setPhoto(null);
    setCounted(false);
    setQuantity(1);
    setUnit(null);
    setLowAt(1);
  }, [defaults]);

  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.url);
  }, [photo]);

  if (!view) return null;
  const barcode = defaults?.barcode;
  // Con un código escaneado se buscan también productos parecidos al genérico («Arroz» para «Arroz Gallo Oro»)
  const similar = name.trim().length >= 2 ? searchProducts(name, view.products).slice(0, barcode ? 4 : 3) : [];
  const exact = similar.find((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase());

  /** El código escaneado corresponde a un producto que ya existe. */
  const useExisting = (p: Product) => {
    if (barcode) {
      learnBarcode(p.id, barcode);
      if (defaults?.then === 'out') setStatus(p, 'out', 'barcode');
      else if (defaults?.then === 'bought') markBought(p);
      else toast(m.stock.add.linked(p.name));
      onClose();
      return;
    }
    onOpenExisting(p.id);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (exact) {
      useExisting(exact);
      return;
    }
    const finalStatus = counted ? statusFromQuantity(quantity, lowAt) : status;
    const p = createProduct({
      name, status: finalStatus, location_id: locationId, category_id: categoryId, is_staple: staple,
      ...(counted ? { track_quantity: true, quantity, unit, low_threshold: lowAt } : {}),
      brand: defaults?.brand ?? null,
      image_url: photo ? null : defaults?.image_url ?? null,
    });
    if (p) {
      if (barcode) learnBarcode(p.id, barcode);
      if (photo) void setProductPhoto(p, photo.blob);
      toast(finalStatus === 'out' ? m.stock.add.addedToList(p.name) : m.stock.add.added(p.name));
    }
    onClose();
  };

  const preview = photo?.url ?? defaults?.image_url ?? null;

  return (
    <Sheet open={Boolean(defaults)} onClose={onClose} title={barcode ? m.stock.add.titleNew : m.stock.add.title}>
      <form onSubmit={submit} className="space-y-5 pb-4">
        {barcode && (
          <p className="text-sm text-muted">
            {defaults?.name ? m.stock.add.foundOff : m.stock.add.unknownCode}
            {m.stock.add.confirmOnce}
          </p>
        )}

        <div className="flex items-center gap-3">
          {preview && (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sunken/60">
              <img src={preview} alt="" className={photo ? 'h-[88%] w-[88%] object-contain' : 'h-full w-full object-cover'} />
            </span>
          )}
          <input
            autoFocus={!barcode}
            className="field text-lg"
            placeholder={m.stock.add.namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            enterKeyHint="done"
            autoCapitalize="sentences"
          />
        </div>

        {similar.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted">{barcode ? m.stock.add.isOneOfThese : m.stock.add.alreadyHave}</p>
            <div className="flex flex-wrap gap-2">
              {similar.map((p) => (
                <button key={p.id} type="button" className="chip min-h-tap bg-surface" onClick={() => useExisting(p)}>
                  {barcode && <Icon name="barcode" size={15} className="text-muted" />}
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {!counted && <StatusPicker value={status} onChange={setStatusValue} />}
        <section className="card divide-y divide-line px-4">
          <Toggle
            checked={counted}
            onChange={(v) => {
              setCounted(v);
              if (v && !unit) setUnit(suggestUnit(name, view.categories.find((c) => c.id === categoryId)?.name));
            }}
            label={m.stock.product.countUnits}
            hint={m.stock.product.countUnitsHint}
          />
          {counted && (
            <>
              <Stepper label={m.stock.add.howManyNow} value={quantity} min={0} onChange={setQuantity} suffix={unitLabel(quantity, unit)} />
              <div className="space-y-2 py-3">
                <span className="block font-medium">{m.stock.product.unit}</span>
                <UnitPicker value={unit} onChange={setUnit} />
              </div>
              <Stepper label={m.stock.product.lowAt} value={lowAt} min={0} onChange={setLowAt} suffix={unitLabel(lowAt, unit)} />
            </>
          )}
        </section>
        <section className="space-y-2">
          <h3 className="text-sm text-muted">{m.stock.product.location}</h3>
          <ChipPicker items={[...view.locations].sort((a, b) => a.sort_order - b.sort_order)} value={locationId}
            onChange={setLocationId} icon={(l) => locationIcon(l.icon, l.name)} />
        </section>
        <section className="space-y-2">
          <h3 className="text-sm text-muted">{m.stock.product.category}</h3>
          <ChipPicker items={[...view.categories].sort((a, b) => a.sort_order - b.sort_order)} value={categoryId}
            onChange={setCategoryId} icon={(c) => categoryIcon(c.name)} />
        </section>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setStaple(!staple)} aria-pressed={staple}
            className={`chip min-h-tap ${staple ? 'border-low/60 bg-low/15 text-ink' : 'bg-surface text-muted'}`}>
            <Icon name="star" size={16} fill={staple ? 'currentColor' : 'none'} className={staple ? 'text-low' : ''} />
            {m.stock.product.staple}
          </button>
          <PhotoButton
            className="chip min-h-tap bg-surface text-muted"
            label={photo ? m.stock.add.anotherPhoto : m.stock.add.photo}
            onPhoto={(blob) => setPhoto({ blob, url: URL.createObjectURL(blob) })}
          />
        </div>
        <button type="submit" className="btn-primary w-full text-lg" disabled={!name.trim()}>
          {exact ? (barcode ? m.stock.add.isExisting(exact.name) : m.stock.add.viewExisting(exact.name)) : m.common.add}
        </button>
      </form>
    </Sheet>
  );
}

function Stepper({ label, value, min, onChange, suffix }: { label: string; value: number; min: number; onChange: (n: number) => void; suffix: string }) {
  return (
    <div className="flex min-h-[56px] items-center gap-3">
      <span className="min-w-0 flex-1 whitespace-nowrap font-medium">{label}</span>
      <button type="button" className="flex min-h-tap min-w-tap items-center justify-center text-muted" aria-label={m.common.less}
        onClick={() => onChange(Math.max(min, value - 1))}>
        <Icon name="minus" size={20} />
      </button>
      <span className="w-8 text-center font-semibold tabular-nums">{value}</span>
      <button type="button" className="flex min-h-tap min-w-tap items-center justify-center text-muted" aria-label={m.common.more}
        onClick={() => onChange(value + 1)}>
        <Icon name="plus" size={20} />
      </button>
      <span className="min-w-[3rem] text-sm text-muted">{suffix}</span>
    </div>
  );
}
