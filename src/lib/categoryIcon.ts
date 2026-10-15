import { normalizeAlias } from '../domain/aliases';

// Íconos por categoría/lugar (emoji: se ven bien en iOS y funcionan offline).
const RULES: [RegExp, string][] = [
  [/fruta|verdura/, '🍎'],
  [/panad|panific/, '🥖'],
  [/carne|pescad|pollo/, '🥩'],
  [/lacteo|huevo|leche/, '🥛'],
  [/almacen|despensa|seco/, '🫙'],
  [/congel|freezer/, '🧊'],
  [/bebida/, '🧃'],
  [/limpieza/, '🧴'],
  [/higiene|bano|perfum/, '🧻'],
  [/bebe/, '🍼'],
  [/mascota/, '🐾'],
  [/conserva|lata/, '🥫'],
  [/heladera/, '❄️'],
  [/alacena/, '🗄️'],
  [/fiambre|queso/, '🧀'],
  [/condiment|especia/, '🧂'],
];

export function categoryIcon(name: string | undefined | null, fallback = '🪴'): string {
  if (!name) return fallback;
  const n = normalizeAlias(name);
  return RULES.find(([re]) => re.test(n))?.[1] ?? fallback;
}

export const LOCATION_ICON: Record<string, string> = {
  fridge: '❄️',
  snow: '🧊',
  shelf: '🗄️',
  drop: '🛁',
  spark: '🧽',
};

export function locationIcon(icon: string | null, name: string): string {
  return (icon && LOCATION_ICON[icon]) || categoryIcon(name, '📦');
}
