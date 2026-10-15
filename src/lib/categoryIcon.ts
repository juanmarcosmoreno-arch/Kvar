import { normalizeAlias } from '../domain/aliases';
import type { IconName } from '../components/Icon';

// Ícono de línea según el nombre de la categoría o del lugar (los nombres son editables).
const RULES: [RegExp, IconName][] = [
  [/fruta|verdura/, 'apple'],
  [/panad|panific/, 'bread'],
  [/carne|pollo|fiambre/, 'meat'],
  [/pescad/, 'fish'],
  [/lacteo|huevo|leche/, 'milk'],
  [/almacen|despensa|seco/, 'wheat'],
  [/congel|freezer/, 'snow'],
  [/bebida/, 'drink'],
  [/limpieza/, 'spray'],
  [/higiene|bano|perfum/, 'bath'],
  [/bebe/, 'baby'],
  [/mascota/, 'paw'],
  [/conserva|lata/, 'soup'],
  [/heladera/, 'fridge'],
  [/alacena/, 'shelf'],
];

export function categoryIcon(name: string | undefined | null, fallback: IconName = 'leaf'): IconName {
  if (!name) return fallback;
  const n = normalizeAlias(name);
  return RULES.find(([re]) => re.test(n))?.[1] ?? fallback;
}

const LOCATION_ICON: Record<string, IconName> = {
  fridge: 'fridge',
  snow: 'snow',
  shelf: 'shelf',
  drop: 'bath',
  spark: 'spray',
};

export function locationIcon(icon: string | null, name: string): IconName {
  return (icon && LOCATION_ICON[icon]) || categoryIcon(name, 'box');
}
