import type { Messages } from '../es';
import { capture } from './capture';
import { catalog } from './catalog';
import { common } from './common';
import { recipes } from './recipes';
import { settings } from './settings';
import { shell } from './shell';
import { stats } from './stats';
import { money } from './money';
import { prices } from './prices';
import { alerts } from './alerts';
import { shopping } from './shopping';
import { plan } from './plan';
import { importer } from './importer';
import { expiry } from './expiry';
import { stock } from './stock';
import { store } from './store';

export const messages: Messages = { common, shell, stock, capture, settings, recipes, store, stats, money, prices, alerts, shopping, plan, importer, expiry, catalog };
