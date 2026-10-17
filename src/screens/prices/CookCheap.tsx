import { useState } from 'react';
import { RecipeSheet } from '../../components/RecipeSheet';
import type { Recipe } from '../../domain/types';
import { m } from '../../i18n';
import { formatCurrency } from '../../lib/currency';
import { useRecipePrices, type RecipePrice } from '../../lib/priceCenter';
import { useView } from '../../store/store';
import { PriceHeader } from './common';

const SHOWN = 30;

/** Recetas por lo que sale cada porción (aproximado) */
export function CookCheap() {
  const view = useView()!;
  const t = m.priceCenter.cook;
  const recipes = useRecipePrices(view);
  const [open, setOpen] = useState<Recipe | null>(null);
  const complete = recipes.filter((r) => r.complete);
  const partial = recipes.filter((r) => !r.complete);
  const servings = view.household.default_servings ?? 2;
  return (
    <>
      <PriceHeader title={t.title} />
      <div className="space-y-4 px-5 pb-6">
        <p className="text-sm text-muted">{t.hint}</p>
        {recipes.length ? (
          <>
            <RecipeList recipes={complete.slice(0, SHOWN)} onOpen={setOpen} />
            {partial.length > 0 && (
              <section className="space-y-2">
                <h2 className="section-title">{t.partialTitle}</h2>
                <p className="text-sm text-muted">{t.partialHint}</p>
                <RecipeList recipes={partial.slice(0, SHOWN)} onOpen={setOpen} />
              </section>
            )}
          </>
        ) : (
          <p className="card p-4 text-sm text-muted">{t.none}</p>
        )}
      </div>
      <RecipeSheet recipe={open} servings={servings} onClose={() => setOpen(null)} onEdit={() => setOpen(null)} />
    </>
  );
}

function RecipeList({ recipes, onOpen }: { recipes: RecipePrice[]; onOpen: (r: Recipe) => void }) {
  const t = m.priceCenter.cook;
  if (!recipes.length) return null;
  return (
    <ul className="card divide-y divide-line px-4">
      {recipes.map((r) => (
        <li key={r.recipe.id}>
          <button className="flex min-h-[60px] w-full items-center gap-3 py-2 text-left" onClick={() => onOpen(r.recipe)}>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{r.recipe.title}</span>
              {r.missing.length > 0 && <span className="block truncate text-sm text-muted">{t.missingNames(r.missing.join(', '))}</span>}
            </span>
            <span className="shrink-0 text-right text-sm font-semibold tabular-nums">{t.perServing(formatCurrency(r.perServing))}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
