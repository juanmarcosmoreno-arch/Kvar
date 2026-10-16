import { useEffect, useState } from 'react';
import type { MealType, Recipe, Snapshot } from '../domain/types';
import { m } from '../i18n';
import { inventRecipe, inventStatus } from '../lib/aiRecipe';
import type { AIStatus } from '../lib/voice';
import { Icon } from './Icon';

/** «Inventame algo con lo que hay»: una receta nueva (casera o gourmet) con el stock, con Apple Intelligence. */
export function InventCard({
  view, servings, meal, gourmetDefault, onRecipe,
}: { view: Snapshot; servings: number; meal: MealType | null; gourmetDefault: boolean; onRecipe: (r: Recipe) => void }) {
  const t = m.recipes.invent;
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [gourmet, setGourmet] = useState(gourmetDefault);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<string[]>([]);

  useEffect(() => {
    void inventStatus().then(setStatus);
  }, []);
  useEffect(() => setGourmet(gourmetDefault), [gourmetDefault]);

  if (status === null || status === 'unsupported') return null;
  const blocked = status !== 'available' ? t[status] : !view.products.some((p) => p.status !== 'out') ? t.noStock : null;

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await inventRecipe(view, { gourmet, servings, meal, avoid: made });
      setMade((x) => [...x, r.title]);
      onRecipe(r);
    } catch {
      setError(t.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card space-y-3 border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xl" aria-hidden>✨</span>
        <div className="min-w-0">
          <h2 className="font-semibold">{t.title}</h2>
          <p className="text-sm text-muted">{blocked ?? t.hint}</p>
        </div>
      </div>
      {!blocked && (
        <>
          <div className="flex rounded-full bg-sunken p-1 text-sm" role="group">
            {([false, true] as const).map((v) => (
              <button
                key={String(v)}
                className={`min-h-[38px] flex-1 rounded-full px-3 font-medium ${gourmet === v ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
                aria-pressed={gourmet === v}
                onClick={() => setGourmet(v)}
              >
                {v ? `✨ ${t.gourmet}` : t.homey}
              </button>
            ))}
          </div>
          <button className="btn-primary w-full" onClick={() => void run()} disabled={busy}>
            {busy ? (
              <>
                <Icon name="sync" size={18} className="animate-spin" /> {t.thinking}
              </>
            ) : made.length ? (
              t.again
            ) : (
              t.button
            )}
          </button>
          {error && <p className="text-sm text-out">{error}</p>}
        </>
      )}
    </section>
  );
}
