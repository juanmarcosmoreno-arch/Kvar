import { useMemo, useState } from 'react';
import { Header } from '../components/Shell';
import { Icon } from '../components/Icon';
import { RecipeEditor } from '../components/RecipeEditor';
import { RecipeSheet } from '../components/RecipeSheet';
import { peopleLabel, Stepper } from '../components/Stepper';
import { RECIPE_CATALOG } from '../domain/recipeCatalog';
import {
  capitalize, CONSTRAINT_LABEL, MEAL_LABEL, minutesLabel, QUICK_MINUTES, suggestRecipes, type CookFilters, type Suggestion,
} from '../domain/recipes';
import type { MealType, Recipe, RecipeConstraint } from '../domain/types';
import { addMissingToList } from '../store/actions';
import { useView } from '../store/store';
import { toast } from '../store/toast';

type FilterKey = 'quick' | MealType | RecipeConstraint;
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'quick', label: `Rápido (≤ ${QUICK_MINUTES} min)` },
  ...(Object.keys(MEAL_LABEL) as MealType[]).map((m) => ({ key: m, label: MEAL_LABEL[m] })),
  ...(Object.keys(CONSTRAINT_LABEL) as RecipeConstraint[]).map((c) => ({ key: c, label: CONSTRAINT_LABEL[c] })),
];
const isMeal = (k: FilterKey): k is MealType => k in MEAL_LABEL;
const isConstraint = (k: FilterKey): k is RecipeConstraint => k in CONSTRAINT_LABEL;

/** ¿Qué cocino? — recetas con lo que hay: «Tenés todo», «Te falta 1 cosa», «Para aprovechar lo que vence». */
export function Cook() {
  const view = useView()!;
  const [servings, setServings] = useState(view.household.default_servings ?? 2);
  const [active, setActive] = useState<FilterKey[]>([]);
  const [open, setOpen] = useState<Recipe | null>(null);
  const [editing, setEditing] = useState<{ base: Recipe | null } | null>(null);
  const [showMore, setShowMore] = useState(false);

  const own = view.recipes ?? [];
  const filters: CookFilters = {
    quick: active.includes('quick'),
    meal: active.find(isMeal) ?? null,
    constraints: active.filter(isConstraint),
  };
  const groups = useMemo(
    () => suggestRecipes([...own, ...RECIPE_CATALOG], view.products, { servings, filters, feedback: view.feedback }),
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
        title="¿Qué cocino?"
        right={
          <button
            className="-mr-2 flex min-h-tap min-w-tap items-center justify-center rounded-full text-primary"
            onClick={() => setEditing({ base: null })}
            aria-label="Cargar una receta"
          >
            <Icon name="plus" />
          </button>
        }
      />
      <div className="space-y-6 px-5 pb-6">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted">Comemos</span>
          <Stepper value={servings} onChange={setServings} label="Personas a comer" unit={peopleLabel} />
        </div>

        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1" role="group" aria-label="Filtros">
          {FILTERS.map((f) => {
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

        <Group
          title="Para aprovechar lo que vence"
          icon="leaf"
          items={groups.expiring}
          onOpen={setOpen}
        />
        <Group title="Tenés todo" icon="check" items={groups.ready} onOpen={setOpen} />
        <Group title="Te falta 1 cosa" icon="cart" items={groups.oneMissing} onOpen={setOpen} quickAdd />

        {total === 0 && (
          <div className="card space-y-2 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sunken text-muted">
              <Icon name="pot" size={24} />
            </div>
            <p className="font-semibold">Con lo que hay no me sale nada redondo</p>
            <p className="text-sm text-muted">
              {active.length ? 'Probá sacando algún filtro, o mirá' : 'Mirá'} lo que se puede hacer con un par de compras.
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
              <span>Con un par de compras ({groups.more.length})</span>
              <Icon name={showMore || total === 0 ? 'up' : 'down'} size={16} />
            </button>
            {(showMore || total === 0) && <Cards items={groups.more} onOpen={setOpen} />}
          </section>
        )}

        <section className="space-y-2">
          <h2 className="section-title">Recetas de la casa</h2>
          {own.length ? (
            <ul className="card divide-y divide-line">
              {[...own].sort((a, b) => a.title.localeCompare(b.title, 'es')).map((r) => (
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
                <span className="block font-medium">Cargá las recetas de tu casa</span>
                <span className="text-sm text-muted">Las de siempre. Aparecen primero cuando hay lo que llevan.</span>
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
  if (days <= 0) return 'vence hoy';
  if (days === 1) return 'vence mañana';
  return `vence en ${days} días`;
}

function RecipeCard({ s, onOpen, quickAdd }: { s: Suggestion; onOpen: () => void; quickAdd?: boolean }) {
  const { recipe } = s;
  const uses = s.lines
    .filter((l) => l.product && l.availability !== 'missing')
    .map((l) => l.product!.name);
  const meta = [minutesLabel(recipe.total_minutes), recipe.source !== 'catalog' ? 'De la casa' : null].filter(Boolean);
  const add = (e: React.MouseEvent) => {
    e.stopPropagation();
    const n = addMissingToList(s);
    toast(n ? `${capitalize(s.missing[0].product?.name ?? s.missing[0].ingredient.name)} va a la lista.` : 'Ya estaba en la lista.');
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
        {uses.length > 0 && <span className="block truncate text-sm text-muted">Usa {[...new Set(uses)].join(', ').toLowerCase()}</span>}
        {s.missing.length > 0 && (
          <span className="block text-sm text-[#B53A2A] dark:text-out">
            Falta {s.missing.map((m) => (m.product?.name ?? m.ingredient.name).toLowerCase()).join(', ')}
          </span>
        )}
      </button>
      {quickAdd && s.missing.length === 1 && (
        <button
          className="flex min-w-[64px] flex-col items-center justify-center gap-0.5 border-l border-line px-2 text-xs text-primary"
          onClick={add}
          aria-label={`Agregar ${s.missing[0].ingredient.name} a la lista`}
        >
          <Icon name="cart" size={20} />
          A la lista
        </button>
      )}
    </div>
  );
}
