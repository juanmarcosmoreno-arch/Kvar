import { useMemo, useState } from 'react';
import { Header } from '../components/Shell';
import { Icon } from '../components/Icon';
import { RecipeEditor } from '../components/RecipeEditor';
import { RecipeSheet } from '../components/RecipeSheet';
import { PlanSheet, weekdayName } from '../components/PlanSheet';
import { defaultDays, isoDay, mondayOf, type MealPlan, type PlanEntry } from '../domain/mealPlan';
import { peopleLabel, Stepper } from '../components/Stepper';
import { recipeCatalog } from '../domain/recipeCatalog';
import {
  capitalize, minutesLabel, QUICK_MINUTES, suggestRecipes, type CookFilters, type Suggestion,
} from '../domain/recipes';
import type { MealType, Recipe, RecipeConstraint } from '../domain/types';
import { compareText, m } from '../i18n';
import { addMissingToList } from '../store/actions';
import { useView } from '../store/store';
import { toast } from '../store/toast';

type FilterKey = 'quick' | 'gourmet' | MealType | RecipeConstraint;
function filterOptions(): { key: FilterKey; label: string }[] {
  const { meals, constraints } = m.common;
  return [
    { key: 'gourmet', label: `✨ ${m.recipes.cook.gourmet}` },
    { key: 'quick', label: m.recipes.cook.quick(QUICK_MINUTES) },
    ...(Object.keys(meals) as MealType[]).map((k) => ({ key: k, label: meals[k] })),
    ...(Object.keys(constraints) as RecipeConstraint[]).map((c) => ({ key: c, label: constraints[c] })),
  ];
}
const isMeal = (k: FilterKey): k is MealType => k in m.common.meals;
const isConstraint = (k: FilterKey): k is RecipeConstraint => k in m.common.constraints;

/** ¿Qué cocino? — recetas con lo que hay: «Tenés todo», «Te falta 1 cosa», «Para aprovechar lo que vence». */
export function Cook() {
  const view = useView()!;
  const t = m.recipes.cook;
  const [servings, setServings] = useState(view.household.default_servings ?? 2);
  const [active, setActive] = useState<FilterKey[]>([]);
  const [open, setOpen] = useState<Recipe | null>(null);
  const [editing, setEditing] = useState<{ base: Recipe | null } | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [planning, setPlanning] = useState<PlanEntry[] | null | false>(false);
  const plan = currentPlan(view.plans ?? []);
  const openByKey = (key: string) => {
    const r = [...(view.recipes ?? []), ...recipeCatalog()].find((x) => x.id === key);
    if (r) setOpen(r);
  };

  const own = view.recipes ?? [];
  const filters: CookFilters = {
    quick: active.includes('quick'),
    gourmet: active.includes('gourmet'),
    meal: active.find(isMeal) ?? null,
    constraints: active.filter(isConstraint),
  };
  const groups = useMemo(
    () => suggestRecipes([...own, ...recipeCatalog()], view.products, { servings, filters, feedback: view.feedback }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [own, view.products, view.feedback, servings, active],
  );
  const total = groups.expiring.length + groups.ready.length + groups.oneMissing.length;

  const toggle = (k: FilterKey) =>
    setActive((a) => {
      if (a.includes(k)) return a.filter((x) => x !== k);
      // un solo tipo de comida a la vez
      return isMeal(k) ? [...a.filter((x) => !isMeal(x)), k] : [...a, k];
    });

  // Si se abrió una receta y después se editó, se muestra la versión nueva
  const openRecipe = open ? own.find((r) => r.id === open.id) ?? open : null;

  return (
    <>
      <Header
        title={t.title}
        right={
          <button
            className="-mr-2 flex min-h-tap min-w-tap items-center justify-center rounded-full text-primary"
            onClick={() => setEditing({ base: null })}
            aria-label={t.addRecipe}
          >
            <Icon name="plus" />
          </button>
        }
      />
      <div className="space-y-6 px-5 pb-6">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted">{t.eating}</span>
          <Stepper value={servings} onChange={setServings} label={m.recipes.servingsLabel} unit={peopleLabel} />
        </div>

        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1" role="group" aria-label={t.filters}>
          {filterOptions().map((f) => {
            const on = active.includes(f.key);
            return (
              <button
                key={f.key}
                aria-pressed={on}
                onClick={() => toggle(f.key)}
                className={`chip ${on ? 'border-primary bg-primary text-on-primary' : 'bg-surface text-ink'}`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        <WeekPlan plan={plan} onOpen={openByKey} onPlan={() => setPlanning(plan?.entries ?? null)} />

        <Group
          title={t.expiring}
          icon="leaf"
          items={groups.expiring}
          onOpen={setOpen}
        />
        <Group title={t.ready} icon="check" items={groups.ready} onOpen={setOpen} />
        <Group title={t.oneMissing} icon="cart" items={groups.oneMissing} onOpen={setOpen} quickAdd />

        {total === 0 && (
          <div className="card space-y-2 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sunken text-muted">
              <Icon name="pot" size={24} />
            </div>
            <p className="font-semibold">{t.emptyTitle}</p>
            <p className="text-sm text-muted">
              {active.length ? t.emptyHintFiltered : t.emptyHint}
            </p>
          </div>
        )}

        {groups.more.length > 0 && (
          <section className="space-y-2">
            <button
              className="section-title flex min-h-tap w-full items-center justify-between"
              onClick={() => setShowMore((v) => !v)}
              aria-expanded={showMore || total === 0}
            >
              <span>{t.more(groups.more.length)}</span>
              <Icon name={showMore || total === 0 ? 'up' : 'down'} size={16} />
            </button>
            {(showMore || total === 0) && <Cards items={groups.more} onOpen={setOpen} />}
          </section>
        )}

        <section className="space-y-2">
          <h2 className="section-title">{t.own}</h2>
          {own.length ? (
            <ul className="card divide-y divide-line">
              {[...own].sort((a, b) => compareText(a.title, b.title)).map((r) => (
                <li key={r.id}>
                  <button className="flex min-h-[56px] w-full items-center gap-3 px-4 text-left" onClick={() => setOpen(r)}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{r.title}</span>
                      <span className="text-xs text-muted">
                        {[r.servings && peopleLabel(r.servings), minutesLabel(r.total_minutes)].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <Icon name="chevron" size={18} className="text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <button className="card flex w-full items-center gap-3 p-4 text-left" onClick={() => setEditing({ base: null })}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon name="plus" size={22} />
              </span>
              <span>
                <span className="block font-medium">{t.ownEmptyTitle}</span>
                <span className="text-sm text-muted">{t.ownEmptyHint}</span>
              </span>
            </button>
          )}
        </section>
      </div>

      <RecipeSheet
        recipe={openRecipe}
        servings={servings}
        onClose={() => setOpen(null)}
        onEdit={(r) => {
          setOpen(null);
          setEditing({ base: r });
        }}
      />
      <PlanSheet
        open={planning !== false}
        initial={planning || null}
        onClose={() => setPlanning(false)}
        onOpenRecipe={openByKey}
      />
      <RecipeEditor
        open={Boolean(editing)}
        base={editing?.base ?? null}
        onClose={() => setEditing(null)}
        onSaved={(r) => setOpen(r)}
      />
    </>
  );
}

function Group({
  title, icon, items, onOpen, quickAdd,
}: {
  title: string;
  icon: 'leaf' | 'check' | 'cart';
  items: Suggestion[];
  onOpen: (r: Recipe) => void;
  quickAdd?: boolean;
}) {
  if (!items.length) return null;
  return (
    <section className="space-y-2">
      <h2 className="section-title flex items-center gap-2">
        <Icon name={icon} size={15} />
        {title}
      </h2>
      <Cards items={items} onOpen={onOpen} quickAdd={quickAdd} />
    </section>
  );
}

function Cards({ items, onOpen, quickAdd }: { items: Suggestion[]; onOpen: (r: Recipe) => void; quickAdd?: boolean }) {
  return (
    <ul className="space-y-2">
      {items.map((s) => (
        <li key={s.recipe.id}>
          <RecipeCard s={s} onOpen={() => onOpen(s.recipe)} quickAdd={quickAdd} />
        </li>
      ))}
    </ul>
  );
}

const DAY = 86_400_000;
function expiresLabel(iso: string): string {
  const days = Math.round((Date.parse(iso) - Date.now()) / DAY);
  if (days <= 0) return m.recipes.cook.expiresToday;
  if (days === 1) return m.recipes.cook.expiresTomorrow;
  return m.recipes.cook.expiresIn(days);
}

function RecipeCard({ s, onOpen, quickAdd }: { s: Suggestion; onOpen: () => void; quickAdd?: boolean }) {
  const { recipe } = s;
  const t = m.recipes.cook;
  const sep = m.recipes.listSep;
  const uses = s.lines
    .filter((l) => l.product && l.availability !== 'missing')
    .map((l) => l.product!.name);
  const meta = [
    recipe.tags.includes('gourmet') ? `✨ ${t.gourmet}` : null,
    minutesLabel(recipe.total_minutes),
    recipe.source !== 'catalog' ? m.recipes.fromHome : null,
  ].filter(Boolean);
  const add = (e: React.MouseEvent) => {
    e.stopPropagation();
    const n = addMissingToList(s);
    toast(n ? t.addedToList(capitalize(s.missing[0].product?.name ?? s.missing[0].ingredient.name)) : t.alreadyInList);
  };
  return (
    <div className="card flex items-stretch">
      <button className="min-w-0 flex-1 space-y-1 p-4 text-left" onClick={onOpen}>
        <span className="flex items-baseline justify-between gap-3">
          <span className="font-semibold">{recipe.title}</span>
          {meta.length > 0 && <span className="shrink-0 text-xs text-muted">{meta.join(' · ')}</span>}
        </span>
        {s.expiring.length > 0 && (
          <span className="block text-sm text-[#9A6300] dark:text-low">
            {s.expiring.map((p) => `${p.name} ${expiresLabel(p.expires_on!)}`).join(' · ')}
          </span>
        )}
        {uses.length > 0 && <span className="block truncate text-sm text-muted">{t.uses([...new Set(uses)].join(sep).toLowerCase())}</span>}
        {s.missing.length > 0 && (
          <span className="block text-sm text-[#B53A2A] dark:text-out">
            {t.missing(s.missing.map((x) => (x.product?.name ?? x.ingredient.name).toLowerCase()).join(sep))}
          </span>
        )}
      </button>
      {quickAdd && s.missing.length === 1 && (
        <button
          className="flex min-w-[64px] flex-col items-center justify-center gap-0.5 border-l border-line px-2 text-xs text-primary"
          onClick={add}
          aria-label={t.addToListAria(s.missing[0].ingredient.name)}
        >
          <Icon name="cart" size={20} />
          {t.toList}
        </button>
      )}
    </div>
  );
}

/** El menú guardado que corresponde ahora (esta semana o, el fin de semana, la que viene). */
function currentPlan(plans: MealPlan[]): MealPlan | null {
  const first = defaultDays(new Date())[0] ?? new Date();
  const week = isoDay(mondayOf(first));
  const thisWeek = isoDay(mondayOf(new Date()));
  return plans.find((p) => p.week_start === week) ?? plans.find((p) => p.week_start === thisWeek) ?? null;
}

function WeekPlan({ plan, onOpen, onPlan }: { plan: MealPlan | null; onOpen: (key: string) => void; onPlan: () => void }) {
  const t = m.plan;
  const today = isoDay(new Date());
  const upcoming = plan?.entries.filter((e) => e.day >= today) ?? [];
  if (!upcoming.length) {
    return (
      <button className="card flex w-full items-center gap-3 p-4 text-left" onClick={onPlan}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon name="pot" size={22} />
        </span>
        <span>
          <span className="block font-medium">{t.make}</span>
          <span className="text-sm text-muted">{t.hint}</span>
        </span>
      </button>
    );
  }
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="section-title">{t.title}</h2>
        <button className="min-h-tap px-1 text-sm font-medium text-primary" onClick={onPlan}>{t.edit}</button>
      </div>
      <ul className="card divide-y divide-line">
        {upcoming.map((e) => (
          <li key={e.day}>
            <button className="flex min-h-[52px] w-full items-center gap-3 px-4 text-left" onClick={() => onOpen(e.recipe_key)}>
              <span className={`w-20 shrink-0 text-sm first-letter:uppercase ${e.day === today ? 'font-semibold text-primary' : 'text-muted'}`}>
                {e.day === today ? t.today : weekdayName(e.day)}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{e.title}</span>
              <Icon name="chevron" size={16} className="text-muted" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
