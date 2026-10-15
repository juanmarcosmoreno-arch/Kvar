import { useState } from 'react';
import { searchProducts } from '../domain/aliases';
import { groupListByCategory, itemName, recentlyChecked } from '../domain/shoppingList';
import type { ShoppingItem } from '../domain/types';
import { Header } from '../components/Shell';
import { Icon } from '../components/Icon';
import { SyncBadge } from '../components/SyncBadge';
import { categoryIcon } from '../lib/categoryIcon';
import { addListItem, clearChecked, purchaseItem, removeItem, unpurchaseItem } from '../store/actions';
import { useView } from '../store/store';
import { toast } from '../store/toast';
import { EmptyCard } from './Home';
import { useUI } from '../store/ui';

const REASON_LABEL: Record<ShoppingItem['reason'], string | null> = {
  out: 'No hay',
  low: 'Queda poco',
  manual: null,
  recipe: 'Para una receta',
  plan: 'Plan semanal',
  predicted: 'Se estaría terminando',
};

/** Lista de compras agrupada por categoría. Tocar = comprado → el producto pasa a "Hay". */
export function ShoppingList() {
  const view = useView()!;
  const [text, setText] = useState('');
  const ui = useUI();
  const byId = new Map(view.products.map((p) => [p.id, p]));
  const groups = groupListByCategory(view.list, view.products, view.categories);
  const checked = recentlyChecked(view.list, 24 * 3_600_000);
  const suggestions = text.trim()
    ? searchProducts(text, view.products).filter((p) => !view.list.some((i) => i.product_id === p.id && !i.checked_at)).slice(0, 4)
    : [];

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    const match = view.products.find((p) => p.name.toLowerCase() === t.toLowerCase());
    addListItem(match ? { productId: match.id } : { name: t });
    setText('');
  };

  const buy = (item: ShoppingItem) => {
    const product = item.product_id ? byId.get(item.product_id) : undefined;
    // Lo que lleva conteo (pañales, latas) pregunta cuántos: tocar un número ya confirma
    if (product?.track_quantity) {
      ui.openQuantity(product.id, 'bought');
      return;
    }
    purchaseItem(item);
    const name = itemName(item, byId);
    toast(item.product_id ? `${name}: comprado, ahora Hay.` : `${name}: comprado.`, {
      label: 'Deshacer',
      run: () => unpurchaseItem({ ...item, checked_at: new Date().toISOString() }),
    });
  };

  return (
    <>
      <Header title="Lista de compras" />
      <div className="space-y-6 px-5 pt-1">
        <SyncBadge />
        {groups.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-ghost" onClick={() => ui.openScan('bought')}>
              <Icon name="barcode" size={20} /> Volví del súper
            </button>
            <button className="btn-ghost" onClick={ui.openReceipt}>
              <Icon name="receipt" size={20} /> Ticket
            </button>
          </div>
        )}
        <form onSubmit={add} className="space-y-2">
          <div className="flex gap-2">
            <input
              className="field"
              placeholder="Agregar a la lista…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              enterKeyHint="done"
            />
            <button type="submit" className="btn-primary min-w-[52px] px-0" aria-label="Agregar" disabled={!text.trim()}>
              <Icon name="plus" />
            </button>
          </div>
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((p) => (
                <button key={p.id} type="button" className="chip min-h-tap bg-sunken"
                  onClick={() => { addListItem({ productId: p.id }); setText(''); }}>
                  <Icon name="plus" size={14} /> {p.name}
                </button>
              ))}
            </div>
          )}
        </form>

        {groups.length === 0 && (
          <EmptyCard icon="cart" title="No falta nada" hint="Cuando marques que algo no hay, aparece acá solo." />
        )}

        {groups.map((g) => (
          <section key={g.key} className="space-y-2">
            <h2 className="section-title flex items-center gap-2">
              <Icon name={categoryIcon(g.key === 'none' ? null : g.title)} size={15} />
              {g.title}
            </h2>
            <ul className="card divide-y divide-line">
              {g.items.map((item) => (
                <li key={item.id} className="flex items-center">
                  <button
                    className="flex min-h-[60px] flex-1 items-center gap-3 px-4 text-left"
                    onClick={() => buy(item)}
                    aria-label={`Marcar ${itemName(item, byId)} como comprado`}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] border-muted/50" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{itemName(item, byId)}</span>
                      {(item.note || REASON_LABEL[item.reason]) && (
                        <span className={`block truncate text-xs ${item.reason === 'out' ? 'text-out' : item.reason === 'low' ? 'text-[#9A6300] dark:text-low' : 'text-muted'}`}>
                          {item.note || REASON_LABEL[item.reason]}
                        </span>
                      )}
                    </span>
                  </button>
                  {item.product_id && (
                    <button
                      className={`chip min-h-[36px] tabular-nums ${item.quantity ? 'border-primary/40 text-ink' : 'text-muted'}`}
                      aria-label={`Cuántos comprar de ${itemName(item, byId)}`}
                      onClick={() => ui.openQuantity(item.product_id!, 'list')}
                    >
                      × {item.quantity ?? 1}
                    </button>
                  )}
                  <button
                    className="flex min-h-tap min-w-tap items-center justify-center text-muted/70"
                    aria-label={`Quitar ${itemName(item, byId)} de la lista`}
                    onClick={() => removeItem(item)}
                  >
                    <Icon name="x" size={18} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {checked.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Comprado</h2>
              <button className="min-h-tap px-2 text-sm font-semibold text-primary" onClick={clearChecked}>
                Limpiar
              </button>
            </div>
            <ul className="card divide-y divide-line opacity-80">
              {checked.map((item) => (
                <li key={item.id}>
                  <button className="flex min-h-[52px] w-full items-center gap-3 px-4 text-left" onClick={() => unpurchaseItem(item)}
                    aria-label={`Desmarcar ${itemName(item, byId)}`}>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ok text-white">
                      <Icon name="check" size={14} strokeWidth={2.5} />
                    </span>
                    <span className="truncate text-muted line-through">{itemName(item, byId)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
