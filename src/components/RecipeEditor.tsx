import { useMemo, useState } from 'react';
import {
  amountLabel, capitalize, CONSTRAINT_LABEL, ingredientLine, MEAL_LABEL, parseIngredientLine,
} from '../domain/recipes';
import type { MealType, Recipe, RecipeConstraint } from '../domain/types';
import { nowIso, uuid } from '../lib/id';
import { saveRecipe } from '../store/actions';
import { useView } from '../store/store';
import { toast } from '../store/toast';
import { Sheet } from './Sheet';
import { peopleLabel, Stepper } from './Stepper';

const MEALS = Object.keys(MEAL_LABEL) as MealType[];
const CONSTRAINTS = Object.keys(CONSTRAINT_LABEL) as RecipeConstraint[];

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
    <Sheet open={open} onClose={onClose} title={base && base.source !== 'catalog' ? 'Editar receta' : 'Nueva receta'}>
      {open && <Form key={base?.id ?? 'new'} base={base} onClose={onClose} onSaved={onSaved} />}
    </Sheet>
  );
}

function Form({ base, onClose, onSaved }: { base: Recipe | null; onClose: () => void; onSaved?: (r: Recipe) => void }) {
  const view = useView()!;
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
    toast(editing ? 'Guardé los cambios.' : `Guardé ${recipe.title} en las recetas de la casa.`);
    onSaved?.(recipe);
    onClose();
  };

  return (
    <div className="space-y-5 pb-2">
      <input
        className="field text-lg"
        placeholder="Nombre (ej: Tuco de la abuela)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Nombre de la receta"
        autoFocus={!base}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-muted">Rinde para</span>
        <Stepper value={servings} onChange={setServings} max={50} label="Para cuántas personas es la receta" unit={peopleLabel} />
      </div>

      <label className="flex items-center justify-between gap-3">
        <span className="text-muted">Tarda (minutos)</span>
        <input
          className="field w-28 text-right tabular-nums"
          inputMode="numeric"
          placeholder="30"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value.replace(/\D/g, '').slice(0, 4))}
        />
      </label>

      <div className="space-y-2">
        <span className="section-title">Para</span>
        <div className="flex flex-wrap gap-2">
          {MEALS.map((m) => (
            <Chip key={m} active={meals.includes(m)} onClick={() => setMeals(toggle(meals, m))}>{MEAL_LABEL[m]}</Chip>
          ))}
          {CONSTRAINTS.map((c) => (
            <Chip key={c} active={constraints.includes(c)} onClick={() => setConstraints(toggle(constraints, c))}>
              {CONSTRAINT_LABEL[c]}
            </Chip>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="section-title" htmlFor="ingredientes">Ingredientes, uno por renglón</label>
        <textarea
          id="ingredientes"
          className="field min-h-[9rem] py-3 leading-relaxed"
          placeholder={'400 g de fideos\n1 lata de tomate triturado\n1 cebolla\nsal a gusto'}
          value={ingredientsText}
          onChange={(e) => setIngredientsText(e.target.value)}
        />
        {parsed.length > 0 && (
          <ul className="rounded-2xl bg-sunken/70 px-4 py-2 text-sm" aria-label="Así lo entendí">
            {parsed.map((p, i) => (
              <li key={i} className="flex justify-between gap-3 py-1">
                <span>
                  {capitalize(p.name)}
                  {p.optional && <span className="text-muted"> (opcional)</span>}
                </span>
                <span className="tabular-nums text-muted">{amountLabel(p)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <label className="section-title" htmlFor="pasos">Cómo se hace (opcional)</label>
        <textarea
          id="pasos"
          className="field min-h-[7rem] py-3 leading-relaxed"
          placeholder="Un paso por renglón"
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
        />
      </div>

      <button className="btn-primary w-full" disabled={!canSave} onClick={save}>
        Guardar receta
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
