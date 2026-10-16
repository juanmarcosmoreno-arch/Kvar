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

/**
 * Historial de ejemplo para las estadísticas: 12 meses de compras y de cosas que se terminan, con el ritmo
 * típico de cada producto (la leche dura una semana, el arroz casi un mes…). Siempre el mismo (semilla fija).
 */
export function demoEvents(now = Date.now()): import('../domain/stats').StockEvent[] {
  // id → [días que dura, días hasta volver a comprar después de terminarse]
  const rhythm: Record<string, [number, number]> = {
    p1: [6, 1], p2: [13, 2], p3: [5, 2], p4: [9, 3], p5: [28, 4], p7: [2, 1], p8: [35, 6], p10: [24, 5],
    p11: [11, 3], p12: [17, 1], p13: [19, 1], p14: [15, 6], p15: [7, 4], p16: [27, 1], p17: [8, 3], p18: [10, 3],
    p20: [14, 4], p22: [6, 5],
  };
  let s = 7;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const events: import('../domain/stats').StockEvent[] = [];
  const start = now - 365 * day;
  const ev = (product_id: string, t: number, type: string, from: 'ok' | 'low' | 'out', to: 'ok' | 'low' | 'out', fq: number | null = null, tq: number | null = null) =>
    events.push({ product_id, type, from_status: from, to_status: to, from_quantity: fq, to_quantity: tq, at: new Date(t).toISOString() });
  for (const [id, [lasts, gap]] of Object.entries(rhythm)) {
    let t = start + rand() * lasts * day;
    while (t < now) {
      ev(id, t, 'purchased', 'out', 'ok');
      const end = t + lasts * (0.75 + rand() * 0.5) * day;
      if (end >= now) break;
      if (lasts > 5 && rand() < 0.6) ev(id, end - lasts * 0.25 * day, 'status_changed', 'ok', 'low');
      ev(id, end, 'status_changed', rand() < 0.6 ? 'low' : 'ok', 'out');
      t = end + gap * (0.5 + rand()) * day;
    }
  }
  // Con conteo: huevos (se usan ~2 por día, se compran por docena) y pañales (~5 por día, paquetes de 30)
  for (const [id, perDay, pack] of [['p9', 1.6, 12], ['p6', 5, 30]] as const) {
    let q = pack;
    for (let t = start; t < now; t += day) {
      const used = Math.min(q, Math.round(perDay * (0.6 + rand() * 0.8)));
      if (used > 0) {
        ev(id, t + 9 * 3_600_000, 'quantity_changed', 'ok', q - used === 0 ? 'out' : 'ok', q, q - used);
        q -= used;
      }
      if (q <= (id === 'p9' ? 2 : 6)) {
        ev(id, t + 19 * 3_600_000, 'purchased', q === 0 ? 'out' : 'low', 'ok', q, q + pack);
        q += pack;
      }
    }
  }
  // Tres compras con la lista en el súper, siempre en el mismo recorrido (para «ordenar por pasillo»)
  const route = ['p15', 'p17', 'p3', 'p7', 'p2', 'p4', 'p12', 'p14', 'p1', 'p9', 'p11', 'p20'];
  for (const daysAgo of [20, 13, 6]) {
    const t0 = now - daysAgo * day + 10 * 3_600_000;
    route.forEach((id, i) => {
      if (rand() < 0.25) return;
      events.push({ product_id: id, type: 'purchased', source: 'shopping', user_id: 'demo-yo', from_status: 'low', to_status: 'ok',
        from_quantity: null, to_quantity: null, at: new Date(t0 + i * 150_000).toISOString() });
    });
  }
  return events.sort((a, b) => a.at.localeCompare(b.at));
}

/**
 * Tickets de ejemplo para Gastos: cada compra del historial de ejemplo con su precio, agrupadas por semana
 * (un ticket por semana) y con los precios subiendo un poco mes a mes.
 */
const STORES = ['Macromercado', 'Disco', 'Tienda Inglesa'] as const;

export function demoPurchases(now = Date.now()): import('../domain/spending').PurchaseLine[] {
  const base: Record<string, number> = {
    p1: 46, p2: 245, p3: 89, p4: 62, p5: 158, p6: 520, p7: 75, p8: 139, p9: 168, p10: 72, p11: 115, p12: 310,
    p13: 189, p14: 345, p15: 79, p16: 890, p17: 39, p18: 59, p20: 128, p22: 142,
  };
  const names = demoServer.snapshot().products;
  let s = 11;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const lines: import('../domain/spending').PurchaseLine[] = [];
  for (const e of demoEvents(now)) {
    if (e.type !== 'purchased' || !e.product_id || !base[e.product_id]) continue;
    const t = Date.parse(e.at);
    const monthsAgo = (now - t) / (30.44 * day);
    // ~2,5 % por mes de suba, con alguna oferta
    const qty = e.product_id === 'p9' || e.product_id === 'p6' ? 1 : rand() < 0.25 ? 2 : 1;
    const week = Math.floor(t / (7 * day));
    // Tres súper que se van turnando: el Macro suele ser más barato, pero algunas cosas convienen en otro lado
    const store = STORES[week % 3];
    const n = Number(e.product_id.slice(1));
    const factor = store === 'Macromercado' ? 1 : store === 'Disco' ? (n % 4 === 0 ? 0.88 : 1.07) : n % 5 === 0 ? 0.92 : 1.12;
    const price = Math.round(base[e.product_id] * factor * (1 - 0.025 * monthsAgo) * (rand() < 0.15 ? 0.85 : 1) * (0.97 + rand() * 0.06));
    lines.push({
      id: `demo-${lines.length}`,
      household_id: HH,
      product_id: e.product_id,
      name: names.find((p) => p.id === e.product_id)?.name ?? e.product_id,
      quantity: qty,
      unit_price: price,
      total: price * qty,
      store,
      bought_at: new Date(week * 7 * day + 5 * day + 11 * 3_600_000).toISOString(),
      receipt_key: `demo-${week}`,
    });
  }
  return lines;
}
