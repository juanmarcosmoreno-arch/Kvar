import { useMemo, useState } from 'react';
import { defaultDays, isoDay, missingForPlan, mondayOf, planMeals, swapEntry, type PlanEntry } from '../domain/mealPlan';
import { recipeCatalog } from '../domain/recipeCatalog';
import type { MealType } from '../domain/types';
import { locale, m } from '../i18n';
import { addPlanMissingToList, saveMealPlan } from '../store/actions';
import { useView } from '../store/store';
import { toast } from '../store/toast';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { peopleLabel, Stepper } from './Stepper';

const MEALS: MealType[] = ['almuerzo', 'cena', 'vianda'];

export const weekdayName = (day: string, style: 'long' | 'short' = 'long') =>
  new Date(`${day}T12:00:00`).toLocaleDateString(locale, { weekday: style });

/** «Armame el menú de la semana»: elegir días, comida y personas; ver, cambiar, guardar y pasar lo que falta a la lista. */
export function PlanSheet({ open, onClose, onOpenRecipe, initial }: {
  open: boolean;
  onClose: () => void;
  onOpenRecipe: (recipeKey: string) => void;
  initial?: PlanEntry[] | null;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={m.plan.title}>
      {open && <Body onClose={onClose} onOpenRecipe={onOpenRecipe} initial={initial ?? null} />}
    </Sheet>
  );
}

function Body({ onClose, onOpenRecipe, initial }: { onClose: () => void; onOpenRecipe: (k: string) => void; initial: PlanEntry[] | null }) {
  const view = useView()!;
  const t = m.plan;
  const week = useMemo(() => {
    const first = defaultDays(new Date())[0] ?? new Date();
    const monday = mondayOf(first);
    return Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
  }, []);
  const [days, setDays] = useState<string[]>(() => initial?.map((e) => e.day) ?? defaultDays(new Date()).map(isoDay));
  const [meal, setMeal] = useState<MealType>(initial?.[0]?.meal ?? 'cena');
  const [servings, setServings] = useState(initial?.[0]?.servings ?? view.household.default_servings ?? 2);
  const [plan, setPlan] = useState<PlanEntry[] | null>(initial);
  const recipes = useMemo(() => [...(view.recipes ?? []), ...recipeCatalog()], [view.recipes]);
  const today = isoDay(new Date());

  const build = () => {
    const chosen = week.filter((d) => days.includes(isoDay(d)));
    const p = planMeals(recipes, view.products, { days: chosen, meal, servings, feedback: view.feedback });
    setPlan(p);
  };
  const missing = plan ? missingForPlan(plan, recipes, view.products) : [];
  const toggleDay = (d: string) => setDays((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d].sort()));

  return (
    <div className="space-y-5 pb-2">
      {!plan && <p className="text-muted">{t.hint}</p>}

      <div className="space-y-2">
        <span className="section-title">{t.days}</span>
        <div className="grid grid-cols-7 gap-1">
          {week.map((d) => {
            const k = isoDay(d);
            const on = days.includes(k);
            const past = k < today;
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                disabled={past}
                onClick={() => toggleDay(k)}
                className={`flex min-h-[52px] flex-col items-center justify-center rounded-xl border text-xs disabled:opacity-30 ${on ? 'border-primary bg-primary text-on-primary' : 'border-line bg-surface'}`}
              >
                <span className="font-medium">{weekdayName(k, 'short').replace('.', '')}</span>
                <span className="tabular-nums opacity-80">{d.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5" role="radiogroup" aria-label={t.meal}>
          {MEALS.map((x) => (
            <button
              key={x}
              role="radio"
              aria-checked={meal === x}
              onClick={() => setMeal(x)}
              className={`chip min-h-[40px] ${meal === x ? 'border-primary bg-primary text-on-primary' : 'bg-surface'}`}
            >
              {m.common.meals[x]}
            </button>
          ))}
        </div>
        <Stepper value={servings} onChange={setServings} label={m.recipes.servingsLabel} unit={peopleLabel} />
      </div>

      <button className={plan ? 'btn-ghost w-full' : 'btn-primary w-full'} disabled={!days.length} onClick={build}>
        <Icon name={plan ? 'sync' : 'pot'} size={20} /> {plan ? t.rebuild : t.build}
      </button>

      {plan && plan.length === 0 && <p className="card p-4 text-muted">{t.empty}</p>}

      {plan && plan.length > 0 && (
        <>
          <ul className="card divide-y divide-line">
            {plan.map((e, i) => (
              <li key={e.day} className="flex min-h-[60px] items-center gap-2 pl-4">
                <button className="min-w-0 flex-1 py-2 text-left" onClick={() => onOpenRecipe(e.recipe_key)}>
                  <span className="block text-xs uppercase tracking-wider text-muted first-letter:uppercase">
                    {e.day === today ? t.today : weekdayName(e.day)}
                  </span>
                  <span className="block truncate font-medium">{e.title}</span>
                </button>
                <button
                  className="flex min-h-tap min-w-tap items-center justify-center text-muted"
                  aria-label={t.swap(e.title)}
                  onClick={() => setPlan(swapEntry(plan, i, recipes, view.products, { feedback: view.feedback }))}
                >
                  <Icon name="sync" size={18} />
                </button>
              </li>
            ))}
          </ul>

          {missing.length > 0 ? (
            <button
              className="btn-ghost w-full"
              onClick={() => {
                const n = addPlanMissingToList(missing, t.missingNote);
                toast(n ? t.added(n) : t.allInList);
              }}
            >
              <Icon name="cart" size={20} /> {t.addMissing(missing.length)}
            </button>
          ) : (
            <p className="text-center text-sm text-muted">{t.nothingMissing}</p>
          )}
          <button
            className="btn-primary w-full"
            onClick={() => {
              saveMealPlan(plan);
              toast(t.saved);
              onClose();
            }}
          >
            <Icon name="check" size={20} /> {t.save}
          </button>
        </>
      )}
    </div>
  );
}
