/**
 * «Inventame algo con lo que hay»: una receta nueva con el stock, armada por Apple Intelligence en el iPhone
 * (iOS 26 y un iPhone compatible). Nada sale del teléfono. En la demo se muestra un ejemplo.
 */
import { registerPlugin } from '@capacitor/core';
import { parseIngredientLine } from '../domain/recipes';
import { daysUntil } from '../domain/status';
import type { MealType, Recipe, Snapshot } from '../domain/types';
import { lang, m } from '../i18n';
import { LANGUAGES } from '../i18n/languages';
import { isDemo } from './demo';
import { uuid } from './id';
import { isNative } from './platform';
import { voiceAvailability, type AIStatus } from './voice';

interface Idea {
  title: string;
  minutes: number;
  ingredients: string[];
  steps: string[];
  tip: string;
}

interface Plugin {
  inventRecipe(options: {
    have: string[]; expiring: string[]; avoid: string[]; servings: number; gourmet: boolean; meal: string; language: string;
  }): Promise<Idea>;
}

const KvarVoice = registerPlugin<Plugin>('KvarVoice');

/** ¿Se puede inventar acá? (en la demo, con un ejemplo) */
export async function inventStatus(): Promise<AIStatus> {
  if (isDemo) return 'available';
  if (!isNative) return 'unsupported';
  return (await voiceAvailability()).ai;
}

/** Lo que hay (lo que vence primero), en el idioma de la app */
function stock(view: Snapshot): { have: string[]; expiring: string[] } {
  const usable = view.products.filter((p) => p.status !== 'out');
  const expiring = usable.filter((p) => p.expires_on && daysUntil(p.expires_on) <= 4).map((p) => p.name);
  const rest = usable.filter((p) => !expiring.includes(p.name)).map((p) => p.name);
  return { have: [...expiring, ...rest].slice(0, 80), expiring };
}

export async function inventRecipe(
  view: Snapshot,
  opts: { gourmet: boolean; servings: number; meal: MealType | null; avoid: string[] },
): Promise<Recipe> {
  const { have, expiring } = stock(view);
  const idea = isDemo
    ? demoIdea(opts.gourmet)
    : await KvarVoice.inventRecipe({
      have,
      expiring,
      avoid: opts.avoid.slice(-6),
      servings: opts.servings,
      gourmet: opts.gourmet,
      meal: opts.meal ? m.common.meals[opts.meal] : '',
      language: lang === 'es' ? 'español rioplatense (voseo)' : LANGUAGES.find((l) => l.code === lang)?.name ?? 'English',
    });
  return toRecipe(idea, view, opts);
}

function toRecipe(idea: Idea, view: Snapshot, opts: { gourmet: boolean; servings: number; meal: MealType | null }): Recipe {
  const id = `ai:${uuid()}`;
  const now = new Date().toISOString();
  const steps = [...idea.steps.map((s) => s.trim()).filter(Boolean)];
  if (idea.tip.trim()) steps.push(`💡 ${idea.tip.trim()}`);
  return {
    id,
    household_id: view.household.id,
    title: idea.title.trim(),
    source: 'ai',
    source_url: null,
    servings: opts.servings,
    total_minutes: Math.round(idea.minutes) || null,
    meal_types: opts.meal ? [opts.meal] : ['cena'],
    constraints: [],
    tags: opts.gourmet ? ['gourmet'] : [],
    steps: steps.join('\n'),
    image_url: null,
    created_at: now,
    updated_at: now,
    ingredients: idea.ingredients
      .map((line, i) => {
        const p = parseIngredientLine(line);
        return p
          ? { id: `${id}:${i}`, recipe_id: id, household_id: view.household.id, product_id: null, sort_order: i, ...p }
          : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
  };
}

/** Demo: un ejemplo armado con los productos de la casa de ejemplo */
function demoIdea(gourmet: boolean): Idea {
  return gourmet
    ? {
      title: 'Milanesas en costra de queso con puré de papas a la manteca y tomates confitados',
      minutes: 50,
      ingredients: ['4 milanesas', '60 g de queso rallado', '4 papas', '40 g de manteca', '2 tomates', '1 cebolla', '1 cda de azúcar', 'sal y pimienta a gusto'],
      steps: [
        'Cortá los tomates en cuartos, condimentalos con sal, azúcar y un hilo de aceite y horneálos 25 minutos a 180 °C.',
        'Herví las papas y pisalas con la manteca hasta que quede un puré liso.',
        'Cociná las milanesas y, en el último minuto, cubrilas con el queso rallado hasta que gratine.',
        'Emplatá el puré en la base, la milanesa encima y los tomates confitados al costado.',
      ],
      tip: 'Dorá la cebolla en la manteca antes de sumarla al puré: le da un dulzor de restaurante.',
    }
    : {
      title: 'Fideos con tomate fresco, cebolla dorada y queso',
      minutes: 25,
      ingredients: ['400 g de fideos', '2 tomates', '1 cebolla', '2 cdas de aceite', '50 g de queso rallado', 'sal a gusto'],
      steps: ['Dorá la cebolla en el aceite.', 'Sumá los tomates picados y cociná 8 minutos.', 'Mezclá con los fideos recién hervidos y el queso.'],
      tip: 'Guardá un poco del agua de los fideos para que la salsa quede cremosa.',
    };
}
