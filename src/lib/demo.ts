/**
 * Modo demo: la app completa funcionando sin Supabase, con un hogar de ejemplo.
 * Se activa al compilar con VITE_DEMO=1 (npm run build:demo). El «servidor» vive en
 * este navegador: las mismas operaciones que irían a Supabase se aplican acá.
 */
import { applyOp, type Op } from '../domain/ops';
import type { Household, Member, Product, Recipe, RecipeIngredient, ShoppingItem, Snapshot } from '../domain/types';
import { lang, m } from '../i18n';
import leche from '../assets/demo/p1.webp';
import yerba from '../assets/demo/p2.webp';
import tomate from '../assets/demo/p3.webp';
import fideos from '../assets/demo/p4.webp';
import pan from '../assets/demo/p7.webp';
import huevos from '../assets/demo/p9.webp';
import queso from '../assets/demo/p11.webp';
import cafe from '../assets/demo/p12.webp';

export const isDemo = import.meta.env.VITE_DEMO === '1';

export const DEMO_USER = 'demo-juan';
const HH = 'demo-hogar';
// v2: con recetas (si cambia el ejemplo, cambia la clave). Cada idioma guarda su propio ejemplo.
const storageKey = () => (lang === 'es' ? 'kvar-demo:servidor-v2' : `kvar-demo:servidor-v2:${lang}`);

const day = 86_400_000;
const iso = (offsetDays = 0) => new Date(Date.now() + offsetDays * day).toISOString();
const date = (offsetDays: number) => iso(offsetDays).slice(0, 10);

function seed(): Snapshot {
  const d = m.store.demo;
  const pn = d.products;
  const household: Household = { id: HH, name: d.household, invite_code: 'K7F2A9QX', list_on_low: false, default_servings: 2, created_at: iso(-30) };
  const members: Member[] = [
    { household_id: HH, user_id: DEMO_USER, role: 'owner', display_name: d.me, joined_at: iso(-30) },
    { household_id: HH, user_id: 'demo-sofia', role: 'member', display_name: d.partner, joined_at: iso(-29) },
  ];
  const loc = m.common.seeds.locations;
  const locations = (['fridge', 'snow', 'shelf', 'drop', 'spark'] as const)
    .map((icon, i) => ({ id: `l${i}`, household_id: HH, name: loc[icon], icon, sort_order: i + 1 }));
  const cat = m.common.seeds.categories;
  const categories = ([cat.produce, cat.bakery, cat.meat, cat.dairy, cat.pantry, cat.frozen,
    cat.drinks, cat.cleaning, cat.hygiene, cat.baby, cat.pets, cat.other])
    .map((name, i) => ({ id: `c${i}`, household_id: HH, name, icon: null, sort_order: i + 1 }));
  const P = (id: string, name: string, category_id: string, location_id: string, status: Product['status'], extra: Partial<Product> = {}): Product => ({
    id, household_id: HH, name, category_id, location_id, status, track_quantity: false, quantity: null, low_threshold: 1,
    unit: null, is_staple: false, unidentified: false, expires_on: null, image_url: null, image_path: null, brand: null,
    notes: null, status_changed_at: iso(-3), created_at: iso(-30), updated_at: iso(-3), ...extra,
  });
  const products: Product[] = [
    P('p1', pn.milk, 'c3', 'l0', 'out', { is_staple: true, image_url: leche }),
    P('p2', pn.yerba, 'c4', 'l2', 'low', { is_staple: true, image_url: yerba }),
    P('p3', pn.tomato, 'c0', 'l0', 'ok', { expires_on: date(2), image_url: tomate }),
    P('p4', pn.pasta, 'c4', 'l2', 'ok', { image_url: fideos }),
    P('p5', pn.sunflowerOil, 'c4', 'l2', 'low'),
    P('p6', pn.diapers, 'c9', 'l3', 'ok', { track_quantity: true, quantity: 12, low_threshold: 5, unit: d.units.diapers }),
    P('p7', pn.bread, 'c1', 'l2', 'ok', { image_url: pan }),
    P('p8', pn.detergent, 'c7', 'l4', 'ok'),
    P('p9', pn.eggs, 'c3', 'l0', 'low', { track_quantity: true, quantity: 3, low_threshold: 4, unit: d.units.eggs, is_staple: true, image_url: huevos }),
    P('p10', pn.rice, 'c4', 'l2', 'ok'),
    P('p11', pn.gratedCheese, 'c3', 'l0', 'ok', { expires_on: date(4), image_url: queso }),
    P('p12', pn.coffee, 'c4', 'l2', 'ok', { is_staple: true, image_url: cafe }),
    P('p13', pn.toiletPaper, 'c8', 'l3', 'ok', { is_staple: true }),
    P('p14', pn.milanesas, 'c2', 'l1', 'ok'),
    P('p15', pn.apples, 'c0', 'l0', 'low'),
    P('p16', pn.dogFood, 'c10', 'l2', 'ok'),
    P('p17', pn.onion, 'c0', 'l2', 'ok'),
    P('p18', pn.potatoes, 'c0', 'l2', 'ok'),
    P('p19', pn.crushedTomatoes, 'c4', 'l2', 'ok', { track_quantity: true, quantity: 2, low_threshold: 1, unit: 'latas' }),
    P('p20', pn.butter, 'c3', 'l0', 'low'),
    P('p21', pn.groundBeef, 'c2', 'l1', 'ok', { expires_on: date(1) }),
    P('p22', pn.ham, 'c3', 'l0', 'ok', { expires_on: date(3) }),
  ];
  const recipeId = 'demo-receta-tuco';
  const ing = d.recipe.ingredients;
  // Cantidades fijas (unidades del catálogo: se traducen al mostrarlas); solo los nombres dependen del idioma
  const ingredients: Omit<RecipeIngredient, 'id' | 'recipe_id' | 'household_id' | 'product_id' | 'sort_order'>[] = [
    { name: ing.groundBeef, quantity: 500, unit: 'g', amount: null, optional: false },
    { name: ing.crushedTomatoes, quantity: 2, unit: 'lata', amount: null, optional: false },
    { name: ing.onion, quantity: 1, unit: 'u', amount: null, optional: false },
    { name: ing.pasta, quantity: 400, unit: 'g', amount: null, optional: false },
    { name: ing.salt, quantity: null, unit: null, amount: 'a gusto', optional: false },
  ];
  const recipes: Recipe[] = [{
    id: recipeId, household_id: HH, title: d.recipe.title, source: 'own', source_url: null, servings: 4,
    total_minutes: 90, meal_types: ['almuerzo'], constraints: ['sin_horno', 'una_olla'], tags: ['pasta'],
    steps: d.recipe.steps,
    image_url: null, created_at: iso(-20), updated_at: iso(-20),
    ingredients: ingredients
      .map((x, i) => ({ id: `${recipeId}:${i}`, recipe_id: recipeId, household_id: HH, product_id: null, sort_order: i, ...x })),
  }];
  const I = (id: string, product_id: string | null, reason: ShoppingItem['reason'], extra: Partial<ShoppingItem> = {}): ShoppingItem => ({
    id, household_id: HH, product_id, name: null, quantity: null, note: null, reason, checked_at: null, checked_by: null,
    created_at: iso(-1), ...extra,
  });
  const list = [I('i1', 'p1', 'out', { quantity: 2 }), I('i2', 'p2', 'low'), I('i4', 'p9', 'low', { quantity: 12 }), I('i3', null, 'manual', { name: d.listItem })];
  const alias = (id: string, product_id: string, code: string) =>
    ({ id, household_id: HH, product_id, kind: 'barcode' as const, alias: code, normalized: code, hits: 2 });
  return {
    household, members, locations, categories, products, list,
    outCounts: { p4: 6, p7: 4, p12: 3, p9: 1, p10: 1 },
    aliases: [alias('a1', 'p1', '7730000000017'), alias('a2', 'p4', '7790000000010'), alias('a3', 'p12', '7790000000027')],
    recipes,
    feedback: [],
  };
}

let server: Snapshot | null = null;

function load(): Snapshot {
  if (server) return server;
  try {
    const raw = localStorage.getItem(storageKey());
    if (raw) server = JSON.parse(raw) as Snapshot;
  } catch {
    /* almacenamiento bloqueado: se usa el ejemplo en memoria */
  }
  server ??= seed();
  return server;
}

function save() {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(server));
  } catch {
    /* sin almacenamiento: la demo funciona igual mientras la página esté abierta */
  }
}

export const demoServer = {
  household: () => load().household,
  snapshot: (): Snapshot => structuredClone(load()),
  apply(op: Op) {
    server = applyOp(load(), op);
    save();
  },
  reset() {
    server = seed();
    save();
  },
};

/** Códigos de barras de ejemplo, para probar el escáner escribiendo el número. */
export const DEMO_CODES: readonly { readonly code: string; readonly label: string }[] = [
  { code: '7730000000017', get label() { return m.store.demo.codes.milk; } },
  { code: '7790000000010', get label() { return m.store.demo.codes.pasta; } },
  { code: '7790070411716', get label() { return m.store.demo.codes.newRice; } },
];
