import type { RunningOut } from '../domain/runningOut';
import { m } from '../i18n';
import { snoozeRunningOut } from '../lib/runningOut';
import { addListItem } from '../store/actions';
import { toast } from '../store/toast';
import { useUI } from '../store/ui';
import { Icon } from './Icon';

function addAll(items: RunningOut[]) {
  items.forEach(({ product }) => addListItem({ productId: product.id, reason: 'predicted' }));
  toast(items.length === 1 ? m.shopping.soon.added(items[0].product.name) : m.shopping.soon.addedMany(items.length));
}

/** Inicio: lo que se termina en estos días, para anotarlo antes de quedarse sin. */
export function RunningOutSection({ items }: { items: RunningOut[] }) {
  const ui = useUI();
  const t = m.shopping.soon;
  if (!items.length) return null;
  const shown = items.slice(0, 6);
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="section-title">{t.title}</h2>
        {shown.length > 1 && (
          <button className="min-h-tap px-1 text-sm font-medium text-primary" onClick={() => addAll(shown)}>
            {t.addAll}
          </button>
        )}
      </div>
      <ul className="card divide-y divide-line">
        {shown.map((r) => (
          <li key={r.product.id} className="flex min-h-[60px] items-center gap-1 pl-4">
            <button className="min-w-0 flex-1 py-2 text-left" onClick={() => ui.openProduct(r.product.id)}>
              <span className="block truncate font-medium">{r.product.name}</span>
              <span className={`block text-sm ${r.days <= 1 ? 'text-[#9A6300] dark:text-low' : 'text-muted'}`}>{t.when(r.days)}</span>
            </button>
            <button
              className="min-h-tap shrink-0 px-2 text-sm text-muted"
              onClick={() => {
                snoozeRunningOut(r.product.id);
                toast(t.snoozed(r.product.name));
              }}
            >
              {t.stillHave}
            </button>
            <button
              className="flex min-h-tap shrink-0 items-center gap-1.5 pl-2 pr-4 text-sm font-medium text-primary"
              onClick={() => addAll([r])}
            >
              <Icon name="cart" size={18} /> {t.add}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Lista: lo mismo, en chips, para sumarlo de un toque. */
export function RunningOutChips({ items }: { items: RunningOut[] }) {
  const t = m.shopping.soon;
  // En la lista, solo lo más urgente (en Inicio está todo)
  const shown = items.filter((r) => r.days <= 3).slice(0, 6);
  if (!shown.length) return null;
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="section-title">{t.title}</h2>
        {shown.length > 1 && (
          <button className="min-h-tap px-1 text-sm font-medium text-primary" onClick={() => addAll(shown)}>
            {t.addAll}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {shown.map((r) => (
          <button
            key={r.product.id}
            className="chip min-h-tap border-dashed border-primary/50 bg-surface text-left"
            onClick={() => addAll([r])}
            aria-label={`${t.add}: ${r.product.name}, ${t.when(r.days)}`}
          >
            <Icon name="plus" size={14} className="text-primary" />
            <span>
              {r.product.name}
              <span className="ml-1.5 text-xs text-muted">{t.when(r.days)}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
