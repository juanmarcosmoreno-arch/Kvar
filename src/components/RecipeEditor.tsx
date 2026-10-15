import { useMemo, useState } from 'react';
import {
  amountLabel, capitalize, ingredientLine, parseIngredientLine,
} from '../domain/recipes';
import type { MealType, Recipe, RecipeConstraint } from '../domain/types';
import { m } from '../i18n';
import { nowIso, uuid } from '../lib/id';
import { saveRecipe } from '../store/actions';
import { useView } from '../store/store';
import { toast } from '../store/toast';
import { Sheet } from './Sheet';
import { peopleLabel, Stepper } from './Stepper';

/**
 * Cargar o editar una receta de la casa. Los ingredientes se escriben como en un papel, uno por
 * renglón («400 g de fideos», «sal a gusto»), y abajo se ve cómo se entendió cada uno.
 * `base` puede ser una receta del catálogo: se guarda como copia propia.
 */
export function RecipeEditor({ base, open, onClose, onSaved }: {
  base: Recipe | null;
  open: boolean;
  onClose: () => void;
  onSaved?: (r: Recipe) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={base && base.source !== 'catalog' ? m.recipes.editor.editTitle : m.recipes.editor.newTitle}>
      {open && <Form key={base?.id ?? 'new'} base={base} onClose={onClose} onSaved={onSaved} />}
    </Sheet>
  );
}

function Form({ base, onClose, onSaved }: { base: Recipe | null; onClose: () => void; onSaved?: (r: Recipe) => void }) {
  const view = useView()!;
  const t = m.recipes.editor;
  const { meals: mealLabels, constraints: constraintLabels } = m.common;
  const editing = base && base.source !== 'catalog' ? base : null;
  const [title, setTitle] = useState(base?.title ?? '');
  const [servings, setServings] = useState(base?.servings ?? view.household.default_servings ?? 2);
  const [minutes, setMinutes] = useState(base?.total_minutes ? String(base.total_minutes) : '');
  const [meals, setMeals] = useState<MealType[]>(base?.meal_types ?? []);
  const [constraints, setConstraints] = useState<RecipeConstraint[]>(base?.constraints ?? []);
  const [ingredientsText, setIngredientsText] = useState(
    base ? [...base.ingredients].sort((a, b) => a.sort_order - b.sort_order).map(ingredientLine).join('\n') : '',
  );
  const [steps, setSteps] = useState(base?.steps ?? '');

  const parsed = useMemo(
    () => ingredientsText.split('\n').map(parseIngredientLine).filter((x): x is NonNullable<typeof x> => Boolean(x)),
    [ingredientsText],
  );
  const canSave = title.trim().length > 0 && parsed.length > 0;

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const save = () => {
    if (!canSave) return;
    const id = editing?.id ?? uuid();
    const hh = view.household.id;
    const at = nowIso();
    const recipe: Recipe = {
      id,
      household_id: hh,
      title: capitalize(title.trim()),
      source: editing?.source ?? 'own',
      source_url: editing?.source_url ?? null,
      servings,
      total_minutes: Number(minutes) > 0 ? Math.round(Number(minutes)) : null,
      meal_types: meals,
      constraints,
      tags: editing?.tags ?? base?.tags ?? [],
      steps: steps.trim() || null,
      image_url: editing?.image_url ?? null,
      created_at: editing?.created_at ?? at,
      updated_at: at,
      ingredients: parsed.map((p, i) => ({
        id: uuid(), recipe_id: id, household_id: hh, product_id: null, sort_order: i, ...p,
      })),
    };
    saveRecipe(recipe);
    toast(editing ? t.savedChanges : t.saved(recipe.title));
    onSaved?.(recipe);
    onClose();
  };

  return (
    <div className="space-y-5 pb-2">
      <input
        className="field text-lg"
        placeholder={t.namePlaceholder}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label={t.nameLabel}
        autoFocus={!base}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-muted">{t.serves}</span>
        <Stepper value={servings} onChange={setServings} max={50} label={t.servesLabel} unit={peopleLabel} />
      </div>

      <label className="flex items-center justify-between gap-3">
        <span className="text-muted">{t.minutes}</span>
        <input
          className="field w-28 text-right tabular-nums"
          inputMode="numeric"
          placeholder="30"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value.replace(/\D/g, '').slice(0, 4))}
        />
      </label>

      <div className="space-y-2">
        <span className="section-title">{t.for}</span>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(mealLabels) as MealType[]).map((k) => (
            <Chip key={k} active={meals.includes(k)} onClick={() => setMeals(toggle(meals, k))}>{mealLabels[k]}</Chip>
          ))}
          {(Object.keys(constraintLabels) as RecipeConstraint[]).map((c) => (
            <Chip key={c} active={constraints.includes(c)} onClick={() => setConstraints(toggle(constraints, c))}>
              {constraintLabels[c]}
            </Chip>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="section-title" htmlFor="ingredientes">{t.ingredients}</label>
        <textarea
          id="ingredientes"
          className="field min-h-[9rem] py-3 leading-relaxed"
          placeholder={t.ingredientsPlaceholder}
          value={ingredientsText}
          onChange={(e) => setIngredientsText(e.target.value)}
        />
        {parsed.length > 0 && (
          <ul className="rounded-2xl bg-sunken/70 px-4 py-2 text-sm" aria-label={t.understood}>
            {parsed.map((p, i) => (
              <li key={i} className="flex justify-between gap-3 py-1">
                <span>
                  {capitalize(p.name)}
                  {p.optional && <span className="text-muted">{m.recipes.sheet.optional(m.common.optional)}</span>}
                </span>
                <span className="tabular-nums text-muted">{amountLabel(p)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <label className="section-title" htmlFor="pasos">{t.steps}</label>
        <textarea
          id="pasos"
          className="field min-h-[7rem] py-3 leading-relaxed"
          placeholder={t.stepsPlaceholder}
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
        />
      </div>

      <button className="btn-primary w-full" disabled={!canSave} onClick={save}>
        {t.save}
      </button>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`chip ${active ? 'border-primary bg-primary text-on-primary' : 'bg-surface text-ink'}`}
    >
      {children}
    </button>
  );
}
