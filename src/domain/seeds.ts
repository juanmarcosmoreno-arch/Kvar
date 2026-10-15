/**
 * Lugares y categorías que la base crea con cada hogar nuevo (en español, ver create_household).
 * Si la app está en otro idioma se renombran al crear el hogar; y para reconocerlos (íconos, adivinar la
 * categoría de un producto) se traducen de vuelta al nombre original en español.
 */
import { m } from '../i18n';
import { normalizeAlias } from './aliases';
import type { Category, Location } from './types';

export const SEED_CATEGORIES_ES = {
  produce: 'Frutas y verduras',
  bakery: 'Panadería',
  meat: 'Carnes y pescados',
  dairy: 'Lácteos y huevos',
  pantry: 'Almacén',
  frozen: 'Congelados',
  drinks: 'Bebidas',
  cleaning: 'Limpieza',
  hygiene: 'Higiene',
  baby: 'Bebé',
  pets: 'Mascotas',
  other: 'Otros',
} as const;

export const SEED_LOCATIONS_ES = {
  fridge: 'Heladera', snow: 'Freezer', shelf: 'Alacena', drop: 'Baño', spark: 'Limpieza',
} as const;

type CategoryKind = keyof typeof SEED_CATEGORIES_ES;
type LocationIcon = keyof typeof SEED_LOCATIONS_ES;

/** «Dairy & eggs» (en la app en inglés) → «Lácteos y huevos». Cualquier otro nombre queda igual. */
export function seedNameInSpanish(name: string): string {
  const n = normalizeAlias(name);
  for (const k of Object.keys(SEED_CATEGORIES_ES) as CategoryKind[]) {
    if (normalizeAlias(m.common.seeds.categories[k]) === n) return SEED_CATEGORIES_ES[k];
  }
  for (const k of Object.keys(SEED_LOCATIONS_ES) as LocationIcon[]) {
    if (normalizeAlias(m.common.seeds.locations[k]) === n) return SEED_LOCATIONS_ES[k];
  }
  return name;
}

/** Los lugares y categorías recién creados, con el nombre en el idioma de la app (solo los que siguen en español). */
export function localizedSeeds(categories: Category[], locations: Location[]): { categories: Category[]; locations: Location[] } {
  const cats = categories.flatMap((c) => {
    const kind = (Object.keys(SEED_CATEGORIES_ES) as CategoryKind[]).find((k) => SEED_CATEGORIES_ES[k] === c.name);
    const name = kind && m.common.seeds.categories[kind];
    return name && name !== c.name ? [{ ...c, name }] : [];
  });
  const locs = locations.flatMap((l) => {
    const icon = l.icon as LocationIcon | null;
    const name = icon && SEED_LOCATIONS_ES[icon] === l.name ? m.common.seeds.locations[icon] : null;
    return name && name !== l.name ? [{ ...l, name }] : [];
  });
  return { categories: cats, locations: locs };
}
