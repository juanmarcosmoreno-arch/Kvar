import { useEffect, useMemo, useRef, useState } from 'react';
import { searchProducts } from '../domain/aliases';
import { itemName, recentlyChecked } from '../domain/shoppingList';
import { cheaperAt, storeLabel } from '../domain/spending';
import type { ShoppingItem } from '../domain/types';
import { Header } from '../components/Shell';
import { Icon } from '../components/Icon';
import { SyncBadge } from '../components/SyncBadge';
import { RunningOutChips } from '../components/RunningOut';
import { categoryIcon } from '../lib/categoryIcon';
import { addListItem, checkItem, clearChecked, purchaseItem, removeItem, setItemQuantity, unpurchaseItem, wasAddedHere } from '../store/actions';
import { suggestedQuantities } from '../domain/suggestQuantity';
import { useEvents, usePurchases } from '../lib/stats';
import { setShopping, usePresence } from '../lib/presence';
import { formatDecimal, formatList } from '../i18n';
import { setListOrderMode, useListOrder } from '../lib/listOrder';
import { useRunningOut } from '../lib/runningOut';
import { useTickMode, wasOnlyChecked } from '../lib/tickMode';
import { useView } from '../store/store';
import { toast } from '../store/toast';
import { EmptyCard } from './Home';
import { useUI } from '../store/ui';
import { m } from '../i18n';

function reasonLabel(reason: ShoppingItem['reason']): string | null {
  switch (reason) {
    case 'out':
    case 'low':
      return m.common.status[reason];
    case 'manual':
      return null;
    default:
      return m.stock.list.reasons[reason];
  }
}

/** Lista de compras agrupada por categoría. Tocar = comprado → el producto pasa a "Hay". */
export function ShoppingList() {
  const view = useView()!;
  const [text, setText] = useState('');
  const ui = useUI();
  const tick = useTickMode();
  const byId = new Map(view.products.map((p) => [p.id, p]));
  // Por pasillo (aprendido de cómo se tacha en el súper) o por categoría
  const order = useListOrder(view);
  const groups = order.groups;
  const runningOut = useRunningOut(view);
  const checked = recentlyChecked(view.list, 24 * 3_600_000);
  const suggestions = text.trim()
    ? searchProducts(text, view.products).filter((p) => !view.list.some((i) => i.product_id === p.id && !i.checked_at)).slice(0, 4)
    : [];

  // Cantidad sugerida: lo que se suele llevar (según el historial y los tickets)
  const events = useEvents(view.household.id);
  const purchases = usePurchases(view.household.id);
  const suggested = useMemo(
    () => suggestedQuantities(
      view.products,
      events.status === 'ready' ? events.events : [],
      purchases.status === 'ready' ? purchases.lines : [],
    ),
    [view.products, events, purchases],
  );
  // Dónde conviene cada cosa (según los tickets)
  const cheaper = useMemo(() => (purchases.status === 'ready' ? cheaperAt(purchases.lines) : new Map<string, { store: string; saving: number }>()), [purchases]);
  const cheaperText = (item: ShoppingItem) => {
    const c = item.product_id ? cheaper.get(item.product_id) : undefined;
    return c ? m.shopping.cheaper(storeLabel(c.store), `${formatDecimal(c.saving * 100, 0)} %`) : null;
  };

  // «Estoy en el súper»
  const presence = usePresence();
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const open = view.list.filter((i) => !i.checked_at);
    const prev = seen.current;
    seen.current = new Set(open.map((i) => i.id));
    if (!prev || !presence.me) return;
    const fresh = open.filter((i) => !prev.has(i.id) && i.reason === 'manual' && !wasAddedHere(i.id));
    if (fresh.length) toast(m.shopping.addedByOthers(formatList(fresh.map((i) => itemName(i, byId).toLowerCase()))));
  }, [view.list]); // eslint-disable-line react-hooks/exhaustive-deps

  const shareList = async () => {
    const lines = [m.shopping.share.title(view.household.name), ''];
    for (const g of groups) {
      lines.push(g.title);
      for (const i of g.items) lines.push(`• ${itemName(i, byId)}${i.quantity && i.quantity > 1 ? ` × ${i.quantity}` : ''}`);
      lines.push('');
    }
    lines.push(m.shopping.share.footer);
    const text = lines.join('\n');
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast(m.shopping.share.copied, { label: m.shopping.share.whatsapp, run: () => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank') });
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

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
    // «Al tachar, solo tachar»: el stock se carga después (ticket, escáner)
    if (tick === 'check') {
      checkItem(item);
      toast(m.shopping.tick.checked(itemName(item, byId)), { label: m.common.undo, run: () => checkItem(item, false) });
      return;
    }
    // Lo que lleva conteo (pañales, latas) pregunta cuántos: tocar un número ya confirma
    if (product?.track_quantity) {
      ui.openQuantity(product.id, 'bought');
      return;
    }
    purchaseItem(item);
    const name = itemName(item, byId);
    toast(item.product_id ? m.stock.list.boughtNowOk(name) : m.stock.list.bought(name), {
      label: m.common.undo,
      run: () => unpurchaseItem({ ...item, checked_at: new Date().toISOString() }),
    });
  };

  return (
    <>
      <Header
        title={m.stock.list.title}
        right={
          groups.length > 0 && (
            <button className="-mr-2 flex min-h-tap min-w-tap items-center justify-center rounded-full text-primary" onClick={() => void shareList()} aria-label={m.shopping.share.label}>
              <Icon name="share" />
            </button>
          )
        }
      />
      <div className="space-y-6 px-5 pt-1">
        <SyncBadge />
        {presence.shoppers.length > 0 && (
          <div className="card flex items-center gap-3 border-primary/30 bg-primary/5 p-3 text-sm" role="status">
            <Icon name="cart" size={20} className="shrink-0 text-primary" />
            <span>
              {presence.shoppers.length === 1
                ? m.shopping.othersShopping(presence.shoppers[0])
                : m.shopping.othersShoppingMany(formatList(presence.shoppers))}
            </span>
          </div>
        )}
        <button
          className={`btn w-full ${presence.me ? 'bg-primary/10 text-primary' : 'btn-ghost'}`}
          aria-pressed={presence.me}
          onClick={() => setShopping(!presence.me)}
        >
          <Icon name={presence.me ? 'check' : 'cart'} size={20} />
          {presence.me ? m.shopping.stopShopping : m.shopping.imShopping}
        </button>
        {presence.me && <p className="-mt-4 text-center text-sm text-muted">{m.shopping.meShoppingBanner}</p>}
        {groups.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-ghost" onClick={() => ui.openScan('bought')}>
              <Icon name="barcode" size={20} /> {m.stock.list.backFromStore}
            </button>
            <button className="btn-ghost" onClick={ui.openReceipt}>
              <Icon name="receipt" size={20} /> {m.stock.list.receipt}
            </button>
          </div>
        )}
        <form onSubmit={add} className="space-y-2">
          <div className="flex gap-2">
            <input
              className="field"
              placeholder={m.stock.list.addPlaceholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              enterKeyHint="done"
            />
            <button type="submit" className="btn-primary min-w-[52px] px-0" aria-label={m.common.add} disabled={!text.trim()}>
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

        {groups.length > 1 && order.learned && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted">{m.shopping.aisle.label}</span>
            <div className="flex rounded-full bg-sunken p-1 text-sm" role="group" aria-label={m.shopping.aisle.label}>
              {(['aisle', 'category'] as const).map((mode) => (
                <button
                  key={mode}
                  className={`min-h-[36px] rounded-full px-3 font-medium ${order.mode === mode ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
                  aria-pressed={order.mode === mode}
                  onClick={() => setListOrderMode(mode)}
                >
                  {mode === 'aisle' ? m.shopping.aisle.byAisle : m.shopping.aisle.byCategory}
                </button>
              ))}
            </div>
          </div>
        )}
        {presence.me && !order.learned && groups.length > 0 && <p className="text-sm text-muted">{m.shopping.aisle.learning}</p>}

        <RunningOutChips items={runningOut} />

        {groups.length === 0 && (
          <EmptyCard icon="cart" title={m.stock.list.emptyTitle} hint={m.stock.list.emptyHint} />
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
                    aria-label={m.stock.list.markBought(itemName(item, byId))}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] border-muted/50" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{itemName(item, byId)}</span>
                      {(item.note || reasonLabel(item.reason)) && (
                        <span className={`block truncate text-xs ${item.reason === 'out' ? 'text-out' : item.reason === 'low' ? 'text-[#9A6300] dark:text-low' : 'text-muted'}`}>
                          {item.note || reasonLabel(item.reason)}
                        </span>
                      )}
                      {cheaperText(item) && <span className="block truncate text-xs text-primary">{cheaperText(item)}</span>}
                    </span>
                  </button>
                  {item.product_id && !item.quantity && suggested.get(item.product_id) ? (
                    <button
                      className="chip min-h-[36px] border-dashed border-primary/50 tabular-nums text-primary"
                      aria-label={m.shopping.useSuggested(suggested.get(item.product_id)!, itemName(item, byId))}
                      onClick={() => setItemQuantity(item, suggested.get(item.product_id!)!)}
                    >
                      {m.shopping.suggested(suggested.get(item.product_id)!)}
                    </button>
                  ) : item.product_id && (
                    <button
                      className={`chip min-h-[36px] tabular-nums ${item.quantity ? 'border-primary/40 text-ink' : 'text-muted'}`}
                      aria-label={m.stock.list.howMany(itemName(item, byId))}
                      onClick={() => ui.openQuantity(item.product_id!, 'list')}
                    >
                      × {item.quantity ?? 1}
                    </button>
                  )}
                  <button
                    className="flex min-h-tap min-w-tap items-center justify-center text-muted/70"
                    aria-label={m.stock.list.remove(itemName(item, byId))}
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
              <h2 className="section-title">{m.stock.list.checkedTitle}</h2>
              <button className="min-h-tap px-2 text-sm font-semibold text-primary" onClick={clearChecked}>
                {m.stock.list.clear}
              </button>
            </div>
            <ul className="card divide-y divide-line opacity-80">
              {checked.map((item) => (
                <li key={item.id}>
                  <button className="flex min-h-[52px] w-full items-center gap-3 px-4 text-left" onClick={() => (wasOnlyChecked(item, item.product_id ? byId.get(item.product_id) : undefined) || !item.product_id ? checkItem(item, false) : unpurchaseItem(item))}
                    aria-label={m.stock.list.uncheck(itemName(item, byId))}>
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
