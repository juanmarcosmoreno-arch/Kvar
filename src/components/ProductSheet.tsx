import { useEffect, useState } from 'react';
import { openItemFor } from '../domain/shoppingList';
import type { Product } from '../domain/types';
import { categoryIcon, locationIcon } from '../lib/categoryIcon';
import { addListItem, deleteProduct, setProductPhoto, setQuantity, setStatus, updateProduct } from '../store/actions';
import { useUI } from '../store/ui';
import { isNative } from '../lib/platform';
import { PhotoButton } from './PhotoButton';
import { ProductThumb } from './ProductThumb';
import { useView } from '../store/store';
import { toast } from '../store/toast';
import { ChipPicker } from './ChipPicker';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { StatusPicker } from './Status';
import { Toggle } from './Toggle';

/** Detalle del producto. Cada cambio se guarda al instante: no hay botón "Guardar". */
export function ProductSheet({ productId, onClose }: { productId: string | null; onClose: () => void }) {
  const view = useView();
  const product = view?.products.find((p) => p.id === productId);
  return (
    <Sheet open={Boolean(product)} onClose={onClose} title={product?.name}>
      {product && view && <Body product={product} onClose={onClose} />}
    </Sheet>
  );
}

function Body({ product, onClose }: { product: Product; onClose: () => void }) {
  const view = useView()!;
  const [name, setName] = useState(product.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => setName(product.name), [product.name]);
  const ui = useUI();
  const inList = Boolean(openItemFor(view.list, product.id));
  const barcodes = (view.aliases ?? []).filter((a) => a.product_id === product.id && a.kind === 'barcode');
  const categoryName = view.categories.find((c) => c.id === product.category_id)?.name;
  const locations = [...view.locations].sort((a, b) => a.sort_order - b.sort_order);
  const categories = [...view.categories].sort((a, b) => a.sort_order - b.sort_order);

  const saveName = () => {
    const n = name.trim();
    if (n && n !== product.name) updateProduct(product.id, { name: n, unidentified: false });
    else setName(product.name);
  };

  return (
    <div className="space-y-6 pb-4">
      <div className="flex items-center gap-4">
        <ProductThumb product={product} categoryName={categoryName} size="lg" />
        <div className="flex-1 space-y-2">
          <PhotoButton
            label={product.image_path ? 'Cambiar foto' : 'Sacale una foto'}
            onPhoto={(blob, cutout) => {
              void setProductPhoto(product, blob);
              if (!cutout) {
                toast(isNative
                  ? 'No pude separar el producto del fondo: guardé la foto entera.'
                  : 'Guardé la foto. El recorte sin fondo está en la app de iPhone.');
              }
            }}
          />
          <button type="button" className="btn-ghost w-full" onClick={() => { onClose(); ui.openScan('link', product.id); }}>
            <Icon name="barcode" size={20} />
            {barcodes.length ? `${barcodes.length === 1 ? '1 código' : `${barcodes.length} códigos`} · vincular otro` : 'Vincular código'}
          </button>
        </div>
      </div>

      <StatusPicker value={product.status} onChange={(s) => setStatus(product, s, 'manual', false)} />

      {product.track_quantity && (
        <div className="card flex items-center justify-between p-2">
          <button className="btn-ghost min-w-[56px]" aria-label="Restar uno" onClick={() => setQuantity(product, (product.quantity ?? 0) - 1)}>
            <Icon name="minus" />
          </button>
          <div className="text-center">
            <div className="text-3xl font-semibold tabular-nums">{product.quantity ?? 0}</div>
            <div className="text-xs text-muted">{product.unit ?? 'unidades'}</div>
          </div>
          <button className="btn-ghost min-w-[56px]" aria-label="Sumar uno" onClick={() => setQuantity(product, (product.quantity ?? 0) + 1)}>
            <Icon name="plus" />
          </button>
        </div>
      )}

      {!inList ? (
        <button className="btn-ghost w-full" onClick={() => { addListItem({ productId: product.id }); toast(`Agregué ${product.name} a la lista.`); }}>
          <Icon name="cart" size={20} /> Agregar a la lista
        </button>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Icon name="check" size={18} className="text-ok" /> Está en la lista de compras
        </p>
      )}

      <section className="space-y-2">
        <label className="text-sm font-medium text-muted" htmlFor="pname">Nombre</label>
        <input
          id="pname"
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
        />
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-muted">Lugar</h3>
        <ChipPicker items={locations} value={product.location_id} icon={(l) => locationIcon(l.icon, l.name)}
          onChange={(id) => updateProduct(product.id, { location_id: id })} />
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-muted">Categoría</h3>
        <ChipPicker items={categories} value={product.category_id} icon={(c) => categoryIcon(c.name)}
          onChange={(id) => updateProduct(product.id, { category_id: id })} />
      </section>

      <section className="card divide-y divide-line px-4">
        <Toggle
          checked={product.is_staple}
          onChange={(v) => updateProduct(product.id, { is_staple: v })}
          label="Es un básico"
          hint="Te aviso antes de que se termine: con «Queda poco» ya va a la lista."
        />
        <Toggle
          checked={product.track_quantity}
          onChange={(v) =>
            updateProduct(product.id, {
              track_quantity: v,
              quantity: v ? (product.status === 'out' ? 0 : product.status === 'low' ? product.low_threshold || 1 : product.low_threshold + 2) : null,
            })
          }
          label="Contar unidades"
          hint="Para pañales, latas o lo del freezer."
        />
        {product.track_quantity && (
          <div className="flex min-h-[56px] items-center gap-3">
            <span className="flex-1 font-medium">Avisame cuando queden</span>
            <button className="flex min-h-tap min-w-tap items-center justify-center text-muted" aria-label="Menos"
              onClick={() => updateProduct(product.id, { low_threshold: Math.max(0, product.low_threshold - 1) })}>
              <Icon name="minus" size={20} />
            </button>
            <span className="w-6 text-center font-semibold tabular-nums">{product.low_threshold}</span>
            <button className="flex min-h-tap min-w-tap items-center justify-center text-muted" aria-label="Más"
              onClick={() => updateProduct(product.id, { low_threshold: product.low_threshold + 1 })}>
              <Icon name="plus" size={20} />
            </button>
          </div>
        )}
      </section>

      {confirmDelete ? (
        <div className="flex gap-2">
          <button className="btn-ghost flex-1" onClick={() => setConfirmDelete(false)}>Cancelar</button>
          <button className="btn flex-1 bg-out text-white" onClick={() => { deleteProduct(product); onClose(); }}>
            Sí, borrar
          </button>
        </div>
      ) : (
        <button className="btn w-full text-out" onClick={() => setConfirmDelete(true)}>
          <Icon name="trash" size={20} /> Borrar producto
        </button>
      )}
    </div>
  );
}
