import type { CatalogTranslation } from '../catalog';
import { capture } from './capture';
import { common } from './common';
import { recipes } from './recipes';
import { settings } from './settings';
import { shell } from './shell';
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
  /** El recetario está escrito en español: no necesita traducción */
  catalog: null as CatalogTranslation | null,
};

/** La forma de los textos: cada idioma tiene que tener exactamente esto. */
export type Messages = typeof es;
