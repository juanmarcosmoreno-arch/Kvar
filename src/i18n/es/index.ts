import type { CatalogTranslation } from '../catalog';
import { capture } from './capture';
import { common } from './common';
import { recipes } from './recipes';
import { settings } from './settings';
import { shell } from './shell';
import { stats } from './stats';
import { money } from './money';
import { prices } from './prices';
import { priceCenter } from './priceCenter';
import { alerts } from './alerts';
import { shopping } from './shopping';
import { plan } from './plan';
import { importer } from './importer';
import { expiry } from './expiry';
import { stock } from './stock';
import { store } from './store';

export const es = {
  common,
  shell,
  stock,
  capture,
  settings,
  recipes,
  store,
  stats,
  money,
  prices,
  priceCenter,
  alerts,
  shopping,
  plan,
  importer,
  expiry,
  /** El recetario está escrito en español: no necesita traducción */
  catalog: null as CatalogTranslation | null,
};

/** La forma de los textos: cada idioma tiene que tener exactamente esto. */
export type Messages = typeof es;
