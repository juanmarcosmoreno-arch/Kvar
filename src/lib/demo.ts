/**
 * Modo demo: la app completa funcionando sin Supabase, con un hogar de ejemplo.
 * Se activa al compilar con VITE_DEMO=1 (npm run build:demo). El «servidor» vive en
 * este navegador: las mismas operaciones que irían a Supabase se aplican acá.
 */
import { applyOp, type Op } from '../domain/ops';
import type { Household, Member, Product, ShoppingItem, Snapshot } from '../domain/types';
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
const KEY = 'kvar-demo:servidor';

const day = 86_400_000;
const iso = (offsetDays = 0) => new Date(Date.now() + offsetDays * day).toISOString();
const date = (offsetDays: number) => iso(offsetDays).slice(0, 10);

function seed(): Snapshot {
  const household: Household = { id: HH, name: 'Casa', invite_code: 'K7F2A9QX', list_on_low: false, created_at: iso(-30) };
  const members: Member[] = [
    { household_id: HH, user_id: DEMO_USER, role: 'owner', display_name: 'Vos', joined_at: iso(-30) },
    { household_id: HH, user_id: 'demo-sofia', role: 'member', display_name: 'Sofía', joined_at: iso(-29) },
  ];
  const locations = [['Heladera', 'fridge'], ['Freezer', 'snow'], ['Alacena', 'shelf'], ['Baño', 'drop'], ['Limpieza', 'spark']]
    .map(([name, icon], i) => ({ id: `l${i}`, household_id: HH, name, icon, sort_order: i + 1 }));
  const categories = ['Frutas y verduras', 'Panadería', 'Carnes y pescados', 'Lácteos y huevos', 'Almacén', 'Congelados',
    'Bebidas', 'Limpieza', 'Higiene', 'Bebé', 'Mascotas', 'Otros']
    .map((name, i) => ({ id: `c${i}`, household_id: HH, name, icon: null, sort_order: i + 1 }));
  const P = (id: string, name: string, category_id: string, location_id: string, status: Product['status'], extra: Partial<Product> = {}): Product => ({
    id, household_id: HH, name, category_id, location_id, status, track_quantity: false, quantity: null, low_threshold: 1,
    unit: null, is_staple: false, unidentified: false, expires_on: null, image_url: null, image_path: null, brand: null,
    notes: null, status_changed_at: iso(-3), created_at: iso(-30), updated_at: iso(-3), ...extra,
  });
  const products: Product[] = [
    P('p1', 'Leche', 'c3', 'l0', 'out', { is_staple: true, image_url: leche }),
    P('p2', 'Yerba', 'c4', 'l2', 'low', { is_staple: true, image_url: yerba }),
    P('p3', 'Tomate', 'c0', 'l0', 'ok', { expires_on: date(2), image_url: tomate }),
    P('p4', 'Fideos', 'c4', 'l2', 'ok', { image_url: fideos }),
    P('p5', 'Aceite de girasol', 'c4', 'l2', 'low'),
    P('p6', 'Pañales', 'c9', 'l3', 'ok', { track_quantity: true, quantity: 12, low_threshold: 5, unit: 'pañales' }),
    P('p7', 'Pan', 'c1', 'l2', 'ok', { image_url: pan }),
    P('p8', 'Detergente', 'c7', 'l4', 'ok'),
    P('p9', 'Huevos', 'c3', 'l0', 'ok', { track_quantity: true, quantity: 4, low_threshold: 4, unit: 'huevos', image_url: huevos }),
    P('p10', 'Arroz', 'c4', 'l2', 'ok'),
    P('p11', 'Queso rallado', 'c3', 'l0', 'ok', { expires_on: date(4), image_url: queso }),
    P('p12', 'Café', 'c4', 'l2', 'ok', { is_staple: true, image_url: cafe }),
    P('p13', 'Papel higiénico', 'c8', 'l3', 'ok', { is_staple: true }),
    P('p14', 'Milanesas', 'c2', 'l1', 'ok'),
    P('p15', 'Manzanas', 'c0', 'l0', 'low'),
    P('p16', 'Comida del perro', 'c10', 'l2', 'ok'),
  ];
  const I = (id: string, product_id: string | null, reason: ShoppingItem['reason'], extra: Partial<ShoppingItem> = {}): ShoppingItem => ({
    id, household_id: HH, product_id, name: null, quantity: null, note: null, reason, checked_at: null, checked_by: null,
    created_at: iso(-1), ...extra,
  });
  const list = [I('i1', 'p1', 'out'), I('i2', 'p2', 'low'), I('i3', null, 'manual', { name: 'Velas de cumpleaños' })];
  const alias = (id: string, product_id: string, code: string) =>
    ({ id, household_id: HH, product_id, kind: 'barcode' as const, alias: code, normalized: code, hits: 2 });
  return {
    household, members, locations, categories, products, list,
    outCounts: { p4: 6, p7: 4, p12: 3, p9: 1, p10: 1 },
    aliases: [alias('a1', 'p1', '7730000000017'), alias('a2', 'p4', '7790000000010'), alias('a3', 'p12', '7790000000027')],
  };
}

let server: Snapshot | null = null;

function load(): Snapshot {
  if (server) return server;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) server = JSON.parse(raw) as Snapshot;
  } catch {
    /* almacenamiento bloqueado: se usa el ejemplo en memoria */
  }
  server ??= seed();
  return server;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(server));
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
export const DEMO_CODES = [
  { code: '7730000000017', label: 'Leche (conocido)' },
  { code: '7790000000010', label: 'Fideos (conocido)' },
  { code: '7790070411716', label: 'Arroz Gallo Oro (nuevo)' },
];
