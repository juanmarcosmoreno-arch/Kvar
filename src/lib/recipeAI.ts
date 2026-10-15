/**
 * «Pensar recetas con lo que hay» con Apple Intelligence (en el iPhone, sin internet ni costo).
 * Las ideas llegan como recetas comunes (source 'ai', id «ai:…»): se ven, se cruzan con el stock y,
 * si gustan, se guardan como receta de la casa.
 */
import { kitchenUnit } from '../domain/recipes';
import type { Product, Recipe } from '../domain/types';
import { LANGUAGES, lang } from '../i18n';
import { uuid } from './id';
import { KvarVoice } from './voice';

const LANGUAGE_NAME: Record<string, string> = {
  es: 'español rioplatense', en: 'English', pt: 'português do Brasil', fr: 'français', it: 'italiano',
  sv: 'svenska', da: 'dansk', zh: '简体中文', ja: '日本語',
};

export const isAIIdea = (r: Pick<Recipe, 'id'>) => r.id.startsWith('ai:');

export async function recipeIdeas(opts: {
  products: Product[];
  servings: number;
  avoid: string[];
  now?: number;
}): Promise<Recipe[]> {
  const now = opts.now ?? Date.now();
  const have = opts.products.filter((p) => p.status !== 'out').map((p) => p.name);
  const expiring = opts.products
    .filter((p) => p.status !== 'out' && p.expires_on && Date.parse(p.expires_on) - now < 4 * 86_400_000)
    .map((p) => p.name);
  const r = await KvarVoice.recipeIdeas({
    have: have.slice(0, 80),
    expiring,
    avoid: opts.avoid.slice(0, 30),
    servings: opts.servings,
    language: LANGUAGE_NAME[lang] ?? LANGUAGES[0].name,
  });
  const at = new Date(now).toISOString();
  return r.recipes
    .filter((x) => x.title?.trim() && x.ingredients?.length)
    .map((x) => {
      const id = `ai:${uuid()}`;
      return {
        id,
        household_id: '',
        title: x.title.trim(),
        source: 'ai' as const,
        source_url: null,
        servings: opts.servings,
        total_minutes: Math.round(x.minutes) || null,
        meal_types: [],
        constraints: [],
        tags: ['ia'],
        steps: x.steps.join('\n'),
        image_url: null,
        created_at: at,
        updated_at: at,
        ingredients: x.ingredients.map((i, n) => {
          const toTaste = i.unit === 'a_gusto' || !(i.quantity > 0);
          const unit = kitchenUnit(i.unit) ? i.unit : 'u';
          return {
            id: `${id}:${n}`,
            recipe_id: id,
            household_id: '',
            product_id: null,
            name: i.name.trim(),
            quantity: toTaste ? null : i.quantity,
            unit: toTaste ? null : unit,
            amount: toTaste ? 'a gusto' : null,
            optional: false,
            sort_order: n,
          };
        }),
      };
    });
}
