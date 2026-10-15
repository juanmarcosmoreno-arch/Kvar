import { useEffect, useState } from 'react';
import { openItemFor } from '../domain/shoppingList';
import type { Product } from '../domain/types';
import { categoryIcon, locationIcon } from '../lib/categoryIcon';
import { addListItem, deleteProduct, removeAlias, setProductPhoto, setQuantity, setStatus, updateProduct } from '../store/actions';
import { useUI } from '../store/ui';
import { MergeSheet } from './MergeSheet';
import { ProductStats } from './ProductStats';
import { isNative } from '../lib/platform';
import { PhotoButton } from './PhotoButton';
import { UnitPicker } from './UnitPicker';
import { suggestUnit, unitLabel } from '../domain/units';
import { ProductThumb } from './ProductThumb';
import { useView } from '../store/store';
import { toast } from '../store/toast';
import { ChipPicker } from './ChipPicker';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { StatusPicker } from './Status';
import { Toggle } from './Toggle';
import { m } from '../i18n';

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
  const [merging, setMerging] = useState(false);
  useEffect(() => setName(product.name), [product.name]);
  const ui = useUI();
  const listItem = openItemFor(view.list, product.id);
  const inList = Boolean(listItem);
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
            label={product.image_path ? m.stock.product.changePhoto : m.stock.photo.take}
            onPhoto={(blob, cutout) => {
              void setProductPhoto(product, blob);
              if (!cutout) {
                toast(isNative
                  ? m.stock.product.noCutoutNative
                  : m.stock.product.noCutoutWeb);
              }
            }}
          />
          <button type="button" className="btn-ghost w-full" onClick={() => { onClose(); ui.openScan('link', product.id); }}>
            <Icon name="barcode" size={20} />
            {barcodes.length ? m.stock.product.anotherBarcode : m.stock.product.linkBarcode}
          </button>
        </div>
      </div>

      <StatusPicker value={product.status} onChange={(s) => setStatus(product, s, 'manual', false)} />

      {product.track_quantity && (
        <div className="card flex items-center justify-between p-2">
          <button className="btn-ghost min-w-[56px]" aria-label={m.stock.product.minusOne} onClick={() => setQuantity(product, (product.quantity ?? 0) - 1)}>
            <Icon name="minus" />
          </button>
          <button className="min-h-[56px] flex-1 text-center" onClick={() => ui.openQuantity(product.id, 'add')}>
            <div className="text-3xl font-semibold tabular-nums">{product.quantity ?? 0}</div>
            <div className="text-xs text-muted">{unitLabel(product.quantity, product.unit)} · {m.stock.product.tapForMany}</div>
          </button>
          <button className="btn-ghost min-w-[56px]" aria-label={m.stock.product.plusOne} onClick={() => setQuantity(product, (product.quantity ?? 0) + 1)}>
            <Icon name="plus" />
          </button>
        </div>
      )}

      {!inList ? (
        <button className="btn-ghost w-full" onClick={() => { addListItem({ productId: product.id }); toast(m.stock.product.addedToList(product.name)); }}>
          <Icon name="cart" size={20} /> {m.stock.product.addToList}
        </button>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Icon name="check" size={18} className="text-ok" />
          <span className="flex-1">{m.stock.product.inList}</span>
          <button className="chip min-h-[36px] bg-surface text-ink" onClick={() => ui.openQuantity(product.id, 'list')}>
            {listItem?.quantity ? m.stock.product.buyN(listItem.quantity) : m.stock.product.howManyToBuy}
          </button>
        </div>
      )}

      <section className="space-y-2">
        <label className="text-sm font-medium text-muted" htmlFor="pname">{m.stock.product.name}</label>
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
        <h3 className="text-sm font-medium text-muted">{m.stock.product.location}</h3>
        <ChipPicker items={locations} value={product.location_id} icon={(l) => locationIcon(l.icon, l.name)}
          onChange={(id) => updateProduct(product.id, { location_id: id })} />
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium text-muted">{m.stock.product.category}</h3>
        <ChipPicker items={categories} value={product.category_id} icon={(c) => categoryIcon(c.name)}
          onChange={(id) => updateProduct(product.id, { category_id: id })} />
      </section>

      <section className="card divide-y divide-line px-4">
        <Toggle
          checked={product.is_staple}
          onChange={(v) => updateProduct(product.id, { is_staple: v })}
          label={m.stock.product.staple}
          hint={m.stock.product.stapleHint}
        />
        <Toggle
          checked={product.track_quantity}
          onChange={(v) =>
            updateProduct(product.id, {
              track_quantity: v,
              unit: v && !product.unit ? suggestUnit(product.name, categoryName) : product.unit,
              quantity: v ? (product.status === 'out' ? 0 : product.status === 'low' ? product.low_threshold || 1 : product.low_threshold + 2) : null,
            })
          }
          label={m.stock.product.countUnits}
          hint={m.stock.product.countUnitsHint}
        />
        {product.track_quantity && (
          <div className="space-y-2 py-3">
            <span className="block font-medium">{m.stock.product.unit}</span>
            <UnitPicker value={product.unit} onChange={(unit) => updateProduct(product.id, { unit })} />
          </div>
        )}
        {product.track_quantity && (
          <div className="flex min-h-[56px] items-center gap-3">
            <span className="min-w-0 flex-1 whitespace-nowrap font-medium">{m.stock.product.lowAt}</span>
            <button className="flex min-h-tap min-w-tap items-center justify-center text-muted" aria-label={m.common.less}
              onClick={() => updateProduct(product.id, { low_threshold: Math.max(0, product.low_threshold - 1) })}>
              <Icon name="minus" size={20} />
            </button>
            <span className="w-6 text-center font-semibold tabular-nums">{product.low_threshold}</span>
            <button className="flex min-h-tap min-w-tap items-center justify-center text-muted" aria-label={m.common.more}
              onClick={() => updateProduct(product.id, { low_threshold: product.low_threshold + 1 })}>
              <Icon name="plus" size={20} />
            </button>
            <span className="min-w-[3.5rem] text-sm text-muted">{unitLabel(product.low_threshold, product.unit)}</span>
          </div>
        )}
      </section>

      <ProductStats product={product} />

      {barcodes.length > 0 && (
        <section className="space-y-2">
          <h3 className="section-title">{m.stock.codes.title}</h3>
          <ul className="card divide-y divide-line">
            {barcodes.map((a) => (
              <li key={a.id} className="flex min-h-[48px] items-center gap-3 pl-4">
                <Icon name="barcode" size={18} className="text-muted" />
                <span className="flex-1 font-mono text-sm tabular-nums">{a.alias}</span>
                <button
                  className="flex min-h-tap min-w-tap items-center justify-center text-muted"
                  aria-label={m.stock.codes.remove(a.alias)}
                  onClick={() => { removeAlias(a.id); toast(m.stock.codes.removed); }}
                >
                  <Icon name="x" size={18} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="space-y-1">
        <button className="btn-ghost w-full" onClick={() => setMerging(true)}>
          <Icon name="copy" size={20} /> {m.stock.merge.open}
        </button>
        <p className="px-1 text-center text-xs text-muted">{m.stock.merge.hint}</p>
      </div>
      <MergeSheet keep={merging ? product : null} onClose={() => setMerging(false)} />

      {confirmDelete ? (
        <div className="flex gap-2">
          <button className="btn-ghost flex-1" onClick={() => setConfirmDelete(false)}>{m.common.cancel}</button>
          <button className="btn flex-1 bg-out text-white" onClick={() => { deleteProduct(product); onClose(); }}>
            {m.stock.product.confirmDelete}
          </button>
        </div>
      ) : (
        <button className="btn w-full text-out" onClick={() => setConfirmDelete(true)}>
          <Icon name="trash" size={20} /> {m.stock.product.deleteProduct}
        </button>
      )}
    </div>
  );
}
