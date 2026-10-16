import { useState } from 'react';
import { severity } from '../domain/status';
import type { Category, Location, Product } from '../domain/types';
import { compareText, m } from '../i18n';
import { locationIcon } from '../lib/categoryIcon';
import { Icon } from './Icon';
import { ProductThumb } from './ProductThumb';

/**
 * La casa: el dibujo del logo con un estante por lugar (heladera, freezer, alacena…) y cada producto con su foto
 * y una barrita de cuánto queda. Lo que no hay queda como un hueco en el estante.
 */
export function HouseView({
  products, locations, categories, onOpen,
}: { products: Product[]; locations: Location[]; categories: Category[]; onOpen: (id: string) => void }) {
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const catOrder = new Map(categories.map((c) => [c.id, c.sort_order]));
  const sorted = [...locations].sort((a, b) => a.sort_order - b.sort_order);
  const byLocation = new Map<string, Product[]>();
  for (const p of products) {
    const key = p.location_id && sorted.some((l) => l.id === p.location_id) ? p.location_id : 'none';
    byLocation.set(key, [...(byLocation.get(key) ?? []), p]);
  }
  const order = (p: Product) => catOrder.get(p.category_id ?? '') ?? 999;
  const shelves = [
    ...sorted.map((l) => ({ id: l.id, name: l.name, icon: l.icon, items: byLocation.get(l.id) ?? [] })),
    { id: 'none', name: m.stock.house.noPlace, icon: null as string | null, items: byLocation.get('none') ?? [] },
  ]
    .filter((s) => s.items.length > 0)
    // Primero lo que no hay y lo que queda poco: es lo que se mira de un vistazo
    .map((s) => ({
      ...s,
      items: s.items.sort((a, b) => severity(b.status) - severity(a.status) || order(a) - order(b) || compareText(a.name, b.name)),
    }));

  return (
    <div className="mx-auto max-w-lg">
      <Roof />
      <div className="-mt-[3px] space-y-5 rounded-b-[28px] border-[6px] border-t-0 border-primary bg-surface/70 px-3 pb-5 pt-3">
        {shelves.length === 0 && <p className="py-8 text-center text-sm text-muted">{m.stock.inventory.noMatchTitle}</p>}
        {shelves.map((s) => (
          <Shelf key={s.id} name={s.name} icon={s.icon} items={s.items} catName={catName} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

/** Techo con chimenea, como el del logo */
function Roof() {
  return (
    <svg viewBox="0 0 100 34" preserveAspectRatio="none" className="block h-24 w-full text-primary" aria-hidden>
      <path
        d="M0.8 33.5 L50 3 L99.2 33.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M74 18.5 V6 H82 V23.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

const COLD = new Set(['fridge', 'snow']);
/** Productos por estante antes de «Ver más» (dos filas) */
const COLLAPSED = 8;

function Shelf({
  name, icon, items, catName, onOpen,
}: { name: string; icon: string | null; items: Product[]; catName: Map<string, string>; onOpen: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const low = items.filter((p) => p.status === 'low').length;
  const out = items.filter((p) => p.status === 'out').length;
  const cold = icon !== null && COLD.has(icon);
  const header = (
    <div className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium uppercase tracking-[0.12em] text-muted">
      <Icon name={locationIcon(icon, name)} size={15} />
      <span className="truncate">{name}</span>
      {(low > 0 || out > 0) && (
        <span className="ml-auto flex shrink-0 items-center gap-2 normal-case tracking-normal">
          {low > 0 && <span className="text-[#9A6300] dark:text-low">{m.stock.house.low(low)}</span>}
          {out > 0 && <span className="text-out">{m.stock.house.out(out)}</span>}
        </span>
      )}
    </div>
  );
  // Con muchos productos, cada estante muestra dos filas (lo que falta primero) y se abre con un toque
  const many = items.length > COLLAPSED + 2;
  const shown = many && !open ? items.slice(0, COLLAPSED) : items;
  const tiles = (
    <>
      <div className="grid grid-cols-4 gap-x-1 gap-y-3 sm:grid-cols-5">
        {shown.map((p) => (
          <Tile key={p.id} product={p} categoryName={catName.get(p.category_id ?? '')} onOpen={() => onOpen(p.id)} />
        ))}
      </div>
      {many && (
        <button className="mt-2 flex min-h-tap w-full items-center justify-center gap-1 text-sm font-medium text-primary" onClick={() => setOpen(!open)}>
          {open ? m.stock.house.less : m.stock.house.more(items.length - COLLAPSED)}
          <Icon name={open ? 'up' : 'down'} size={16} />
        </button>
      )}
    </>
  );

  // Heladera y freezer: una caja fría; lo demás, un estante de madera
  return cold ? (
    <section>
      {header}
      <div className={`rounded-2xl border-2 p-2 pb-3 ${icon === 'snow' ? 'border-sky-300/70 bg-sky-50/60 dark:border-sky-400/30 dark:bg-sky-950/30' : 'border-line bg-bg/60'}`}>
        {tiles}
      </div>
    </section>
  ) : (
    <section>
      {header}
      <div className="px-1">{tiles}</div>
      <div className="mt-1.5 h-2 rounded-full bg-[#C8955A] shadow-[0_2px_0_rgba(0,0,0,0.12)] dark:bg-[#8A6238]" aria-hidden />
    </section>
  );
}

/** Cuánto queda, de 0 a 1: con conteo, según las unidades; si no, por el estado */
function level(p: Product): number {
  if (p.track_quantity && p.quantity != null) return Math.max(0, Math.min(1, p.quantity / Math.max(3, (p.low_threshold + 1) * 2)));
  return p.status === 'ok' ? 1 : p.status === 'low' ? 0.3 : 0;
}

function Tile({ product, categoryName, onOpen }: { product: Product; categoryName?: string; onOpen: () => void }) {
  const out = product.status === 'out';
  const low = product.status === 'low';
  const fill = level(product);
  return (
    <button
      className="flex min-w-0 flex-col items-center gap-1 rounded-xl px-0.5 py-1 active:scale-95"
      onClick={onOpen}
      aria-label={`${product.name}: ${m.common.status[product.status]}`}
    >
      <span className="relative">
        {out ? (
          // Lo que no hay: el hueco en el estante
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-dashed border-out/60 text-out/80">
            <span className="opacity-40 grayscale">
              <ProductThumb product={product} categoryName={categoryName} size="sm" />
            </span>
          </span>
        ) : (
          <span className={`block rounded-xl ${low ? 'ring-2 ring-low ring-offset-2 ring-offset-surface' : ''}`}>
            <ProductThumb product={product} categoryName={categoryName} />
          </span>
        )}
        {product.track_quantity && product.quantity != null && (
          <span className="absolute -right-1.5 -top-1.5 min-w-[18px] rounded-full bg-ink px-1 text-center text-[10px] font-semibold leading-[18px] text-bg tabular-nums">
            {product.quantity}
          </span>
        )}
      </span>
      <span className={`w-full truncate text-center text-[11px] leading-tight ${out ? 'text-muted line-through' : ''}`}>{product.name}</span>
      <span className="h-1 w-9 overflow-hidden rounded-full bg-sunken" aria-hidden>
        <span
          className={`block h-full rounded-full ${fill > 0.5 ? 'bg-ok' : fill > 0 ? 'bg-low' : 'bg-out'}`}
          style={{ width: `${Math.max(fill, out ? 1 : 0.08) * 100}%`, opacity: out ? 0.35 : 1 }}
        />
      </span>
    </button>
  );
}
