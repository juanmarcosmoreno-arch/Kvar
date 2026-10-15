import type { Messages } from '../es';
import { capture } from './capture';
import { catalog } from './catalog';
import { common } from './common';
import { recipes } from './recipes';
import { settings } from './settings';
import { shell } from './shell';
import { stock } from './stock';
import { store } from './store';

export const messages: Messages = { common, shell, stock, capture, settings, recipes, store, catalog };
