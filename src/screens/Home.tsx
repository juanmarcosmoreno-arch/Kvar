import { useState } from 'react';
import { Link } from 'react-router-dom';
import { searchProducts } from '../domain/aliases';
import { openCount } from '../domain/shoppingList';
import { daysUntil, expiringSoon, expiryLabel, frequentProducts, needsAttention } from '../domain/status';
import { Header } from '../components/Shell';
import { Icon, type IconName } from '../components/Icon';
import { ProductRow } from '../components/ProductRow';
import { SyncBadge } from '../components/SyncBadge';
import { Wordmark } from '../components/Wordmark';
import { categoryIcon } from '../lib/categoryIcon';
import { setStatus } from '../store/actions';
import { useView } from '../store/store';
import { useUI } from '../store/ui';

/** Inicio: búsqueda + "Se terminó algo", lo que está en amarillo/rojo y lo que vence pronto. */
export function Home() {
  const view = useView()!;
  const ui = useUI();
  const [q, setQ] = useState('');
  const cat = new Map(view.categories.map((c) => [c.id, c.name]));
  const attention = needsAttention(view.products);
  const expiring = expiringSoon(view.products);
  const frequent = frequentProducts(view.products, view.outCounts, 6);
  const results = q.trim() ? searchProducts(q, view.products).slice(0, 8) : [];
  const listCount = openCount(view.list);

  return (
    <>
      <Header
        title={<Wordmark className="h-9" />}
        right={
          <>
            <SyncBadge />
            <Link to="/ajustes" aria-label="Ajustes" className="flex min-h-tap min-w-tap items-center justify-center rounded-full text-muted">
              <Icon name="gear" />
            </Link>
          </>
        }
      />

      <div className="space-y-7 px-5 pt-2">
        {/* Bloque 1: búsqueda + Se terminó algo */}
        <section className="space-y-3">
          <label className="relative block">
            <Icon name="search" size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              className="field rounded-full pl-12 pr-[5.5rem]"
              placeholder="Buscar un producto…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              enterKeyHint="search"
              type="search"
            />
            <span className="absolute right-1 top-1/2 flex -translate-y-1/2">
              <button
                type="button"
                aria-label="Decíselo por voz"
                onClick={ui.openVoice}
                className="flex min-h-tap min-w-[40px] items-center justify-center rounded-full text-muted"
              >
                <Icon name="mic" size={20} />
              </button>
              <button
                type="button"
                aria-label="Escanear un código de barras"
                onClick={() => ui.openScan('ask')}
                className="flex min-h-tap min-w-[40px] items-center justify-center rounded-full text-muted"
              >
                <Icon name="scan" size={20} />
              </button>
            </span>
          </label>

          {q.trim() ? (
            <div className="space-y-2">
              {results.map((p) => (
                <ProductRow key={p.id} product={p} categoryName={cat.get(p.category_id ?? '')} onOpen={() => ui.openProduct(p.id)} />
              ))}
              <button className="btn-ghost w-full" onClick={() => { ui.openAdd({ name: q }); setQ(''); }}>
                <Icon name="plus" size={20} /> Agregar «{q.trim()}»
              </button>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <button
                onClick={ui.openRanOut}
                className="flex min-h-[68px] w-full items-center gap-4 bg-primary px-5 text-left text-on-primary active:opacity-90"
              >
                <span className="flex-1">
                  <span className="block text-lg font-medium">¿Se terminó algo?</span>
                  <span className="block text-sm opacity-75">Tocalo y va directo a la lista</span>
                </span>
                <Icon name="chevron" />
              </button>
              {frequent.length > 0 && (
                <div className="flex gap-2 overflow-x-auto p-3">
                  {frequent.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setStatus(p, 'out', 'quick_out')}
                      className="chip min-h-tap bg-surface text-ink active:scale-95"
                    >
                      <Icon name={categoryIcon(cat.get(p.category_id ?? ''))} size={16} className="text-muted" />
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Bloque 2: amarillo y rojo */}
        {!q.trim() && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="section-title">Para reponer</h2>
              {listCount > 0 && (
                <Link to="/lista" className="text-sm text-primary">
                  Ver lista ({listCount})
                </Link>
              )}
            </div>
            {attention.length ? (
              <div className="space-y-2">
                {attention.map((p) => (
                  <ProductRow key={p.id} product={p} categoryName={cat.get(p.category_id ?? '')} onOpen={() => ui.openProduct(p.id)} />
                ))}
              </div>
            ) : (
              <EmptyCard
                icon="leaf"
                title={view.products.length ? 'Está todo en orden' : 'Empezá agregando lo que hay'}
                hint={view.products.length ? 'Cuando algo quede poco o se termine, aparece acá.' : 'Con el botón + cargás tus productos de a uno, solo con el nombre.'}
                action={!view.products.length ? { label: 'Agregar producto', run: () => ui.openAdd() } : undefined}
              />
            )}
          </section>
        )}

        {/* Bloque 3: vence pronto (los vencimientos se cargan desde la Fase 4) */}
        {!q.trim() && expiring.length > 0 && (
          <section className="space-y-3">
            <h2 className="section-title">Vence pronto</h2>
            <div className="space-y-2">
              {expiring.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  categoryName={cat.get(p.category_id ?? '')}
                  subtitle={expiryLabel(daysUntil(p.expires_on!))}
                  onOpen={() => ui.openProduct(p.id)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

export function EmptyCard({
  icon, title, hint, action,
}: { icon: IconName; title: string; hint: string; action?: { label: string; run: () => void } }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sunken text-muted">
        <Icon name={icon} size={22} />
      </span>
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted">{hint}</p>
      {action && (
        <button className="btn-primary mt-2" onClick={action.run}>
          {action.label}
        </button>
      )}
    </div>
  );
}
