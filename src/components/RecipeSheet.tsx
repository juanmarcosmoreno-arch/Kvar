import { useMemo, useState } from 'react';
import {
  assessRecipe, capitalize, CONSTRAINT_LABEL, MEAL_LABEL, minutesLabel, usedProducts, type IngredientLine,
} from '../domain/recipes';
import type { Product, Recipe, StockStatus } from '../domain/types';
import { addMissingToList, cookedRecipe, deleteRecipe, dismissRecipe } from '../store/actions';
import { useView } from '../store/store';
import { toast } from '../store/toast';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { StatusDot } from './Status';
import { peopleLabel, Stepper } from './Stepper';

/** Detalle de una receta: ingredientes escalados y cruzados con el stock, pasos, «La hice». */
export function RecipeSheet({
  recipe, servings: initialServings, onClose, onEdit,
}: {
  recipe: Recipe | null;
  servings: number;
  onClose: () => void;
  /** Editar (propia) o «Hacerla mía» (del catálogo: se copia) */
  onEdit: (recipe: Recipe) => void;
}) {
  return (
    <Sheet open={Boolean(recipe)} onClose={onClose} title={recipe?.title}>
      {recipe && <Body key={recipe.id} recipe={recipe} initialServings={initialServings} onClose={onClose} onEdit={onEdit} />}
    </Sheet>
  );
}

function Body({
  recipe, initialServings, onClose, onEdit,
}: { recipe: Recipe; initialServings: number; onClose: () => void; onEdit: (r: Recipe) => void }) {
  const view = useView()!;
  const [servings, setServings] = useState(initialServings);
  const [cooking, setCooking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const s = useMemo(() => assessRecipe(recipe, view.products, servings), [recipe, view.products, servings]);
  const own = recipe.source !== 'catalog';

  if (cooking) return <Cooked recipe={recipe} used={usedProducts(s)} onDone={onClose} onBack={() => setCooking(false)} />;

  const meta = [
    minutesLabel(recipe.total_minutes),
    ...recipe.meal_types.map((m) => MEAL_LABEL[m]),
    ...recipe.constraints.map((c) => CONSTRAINT_LABEL[c]),
  ].filter(Boolean);
  const steps = (recipe.steps ?? '').split('\n').map((x) => x.trim()).filter(Boolean);

  const addMissing = () => {
    const n = addMissingToList(s);
    toast(n ? `Agregué ${n === 1 ? '1 cosa' : `${n} cosas`} a la lista.` : 'Ya estaba todo en la lista.');
  };

  return (
    <div className="space-y-6 pb-2">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        {own && <span className="chip min-h-[28px] border-primary/40 text-primary">De la casa</span>}
        {meta.length > 0 && <span>{meta.join(' · ')}</span>}
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-muted">Para</span>
        <Stepper value={servings} onChange={setServings} label="Personas a comer" unit={peopleLabel} />
      </div>
      {recipe.servings && recipe.servings !== servings && (
        <p className="-mt-4 text-sm text-muted">La receta original es para {peopleLabel(recipe.servings)}; ya ajusté las cantidades.</p>
      )}

      <section className="space-y-2">
        <h3 className="section-title">Ingredientes</h3>
        <ul className="card divide-y divide-line">
          {s.lines.map((l) => <Ingredient key={l.ingredient.id} line={l} />)}
        </ul>
      </section>

      {steps.length > 0 && (
        <section className="space-y-2">
          <h3 className="section-title">Cómo se hace</h3>
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sunken text-sm font-medium text-muted">{i + 1}</span>
                <p className="pt-0.5 leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="space-y-2">
        {s.missing.length > 0 && (
          <button className="btn-ghost w-full" onClick={addMissing}>
            <Icon name="cart" size={20} />
            Agregar lo que falta a la lista ({s.missing.length})
          </button>
        )}
        <button className="btn-primary w-full" onClick={() => setCooking(true)}>
          <Icon name="check" size={20} /> La hice
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-ghost" onClick={() => onEdit(recipe)}>
            <Icon name={own ? 'edit' : 'copy'} size={18} /> {own ? 'Editar' : 'Hacerla mía'}
          </button>
          {own ? (
            confirmDelete ? (
              <button className="btn bg-out/15 text-out" onClick={() => { deleteRecipe(recipe); onClose(); }}>
                ¿Borrar?
              </button>
            ) : (
              <button className="btn-ghost" onClick={() => setConfirmDelete(true)}>
                <Icon name="trash" size={18} /> Borrar
              </button>
            )
          ) : (
            <button className="btn-ghost" onClick={() => { dismissRecipe(recipe); onClose(); }}>
              <Icon name="x" size={18} /> No me tienta
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Ingredient({ line }: { line: IngredientLine }) {
  const { ingredient: ing, product, availability } = line;
  const note =
    availability === 'missing'
      ? line.buy ? `Falta: comprar ${line.buy}` : 'Falta'
      : availability === 'low' ? 'Queda poco'
        : availability === 'basic' ? null
          : product && product.name.toLowerCase() !== ing.name.toLowerCase() ? `Tenés: ${product.name}` : null;
  const dot: StockStatus | null =
    availability === 'missing' ? 'out' : availability === 'low' ? 'low' : availability === 'have' ? 'ok' : null;
  return (
    <li className="flex min-h-[52px] items-center gap-3 px-4 py-2">
      {dot ? <StatusDot status={dot} size={8} /> : <span className="w-2" aria-hidden />}
      <span className="min-w-0 flex-1">
        <span className="block">
          {capitalize(ing.name)}
          {ing.optional && <span className="text-muted"> (opcional)</span>}
        </span>
        {note && (
          <span className={`block text-xs ${availability === 'missing' ? 'text-[#B53A2A] dark:text-out' : availability === 'low' ? 'text-[#9A6300] dark:text-low' : 'text-muted'}`}>
            {note}
          </span>
        )}
      </span>
      <span className="shrink-0 text-right tabular-nums text-muted">{line.label}</span>
    </li>
  );
}

type Choice = 'keep' | 'low' | 'out';

/** «Usaste arroz, cebolla y pollo. ¿Se terminó alguno?» — no pide descontar cantidades (salvo lo que se cuenta). */
function Cooked({
  recipe, used, onDone, onBack,
}: { recipe: Recipe; used: { product: Product; uses: number | null }[]; onDone: () => void; onBack: () => void }) {
  const counted = used.filter((u) => u.product.track_quantity && u.uses != null);
  const plain = used.filter((u) => !counted.includes(u));
  const [choices, setChoices] = useState<Record<string, Choice>>(() =>
    Object.fromEntries(plain.map((u) => [u.product.id, u.product.status === 'low' ? 'low' : 'keep'])),
  );
  const [left, setLeft] = useState<Record<string, number>>(() =>
    Object.fromEntries(counted.map((u) => [u.product.id, Math.max(0, (u.product.quantity ?? 0) - (u.uses ?? 0))])),
  );
  const names = used.map((u) => u.product.name.toLowerCase());
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}` : names[0];

  const save = () => {
    cookedRecipe(recipe, [
      ...plain.map((u) => ({
        product: u.product,
        status: (choices[u.product.id] === 'keep' ? (u.product.status === 'low' ? 'low' : 'ok') : choices[u.product.id]) as StockStatus,
      })),
      ...counted.map((u) => ({ product: u.product, quantity: left[u.product.id] })),
    ]);
    toast('¡Buen provecho! Actualicé lo que hay.');
    onDone();
  };

  return (
    <div className="space-y-5 pb-2">
      {used.length ? (
        <p className="text-lg">
          Usaste {list}. <span className="font-semibold">¿Se terminó alguno?</span>
        </p>
      ) : (
        <p className="text-lg">No usaste nada de lo que está cargado. ¡Buen provecho!</p>
      )}
      {plain.length > 0 && (
        <ul className="card divide-y divide-line">
          {plain.map(({ product }) => (
            <li key={product.id} className="space-y-2 px-4 py-3">
              <span className="block font-medium">{product.name}</span>
              <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={`¿Queda ${product.name}?`}>
                {(['keep', 'low', 'out'] as Choice[]).map((c) => {
                  const active = choices[product.id] === c;
                  const tone = c === 'out' ? 'bg-out/15 text-[#B53A2A] dark:text-out border-current' : c === 'low' ? 'bg-low/20 text-[#9A6300] dark:text-low border-current' : 'bg-ok/15 text-[#2E7A4A] dark:text-ok border-current';
                  return (
                    <button
                      key={c}
                      role="radio"
                      aria-checked={active}
                      onClick={() => setChoices((x) => ({ ...x, [product.id]: c }))}
                      className={`min-h-[44px] rounded-xl border text-sm ${active ? `${tone} font-medium` : 'border-line bg-surface'}`}
                    >
                      {c === 'keep' ? 'Queda' : c === 'low' ? 'Queda poco' : 'Se terminó'}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
      {counted.length > 0 && (
        <ul className="card divide-y divide-line">
          {counted.map(({ product, uses }) => (
            <li key={product.id} className="flex min-h-[64px] flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3">
              <span className="min-w-0">
                <span className="block font-medium">{product.name}</span>
                <span className="text-xs text-muted">Usaste {uses}. ¿Cuántos quedan?</span>
              </span>
              <Stepper
                value={left[product.id]}
                min={0}
                max={999}
                onChange={(n) => setLeft((x) => ({ ...x, [product.id]: n }))}
                label={`Cuántos quedan de ${product.name}`}
              />
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <button className="btn-ghost" onClick={onBack} aria-label="Volver a la receta">
          <Icon name="back" size={20} />
        </button>
        <button className="btn-primary" onClick={save}>Listo</button>
      </div>
    </div>
  );
}
