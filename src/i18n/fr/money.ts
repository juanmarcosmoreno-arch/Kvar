import type { Messages } from '../es';
import { isOne } from '..';

export const money: Messages['money'] = {
  tabConsumption: 'Consommation',
  tabSpending: 'Dépenses',
  loading: 'Chargement des dépenses…',
  empty: 'Pas encore de prix. Ils sont enregistrés automatiquement quand vous lisez un ticket (Liste → Ticket).',
  kpi: {
    total: 'Vous avez dépensé',
    perMonth: 'Par mois',
    perTrip: 'Par course',
    trips: (n) => `${n} ${isOne(n) ? 'course' : 'courses'}`,
    average: 'en moyenne',
  },
  monthly: { title: 'Dépenses par mois', chartLabel: 'Graphique en colonnes : dépenses par mois' },
  categories: { title: 'Par catégorie', none: 'Sans catégorie' },
  products: { title: 'Où va l’argent', hint: 'Ce qui vous a coûté le plus sur la période.' },
  prices: {
    title: 'Variations de prix',
    hint: 'Premier et dernier achat sur la période.',
    up: (pct) => `+${pct}`,
    down: (pct) => `−${pct}`,
    same: 'stable',
  },
  product: {
    price: 'Dernier prix',
    change: (pct, up) => (up ? `${pct} de plus qu’il y a quelques mois` : `${pct} de moins qu’il y a quelques mois`),
    paid: (when) => `Payé le ${when}`,
  },
  settings: { title: 'Devise', hint: 'Pour afficher les dépenses de vos tickets.' },
  stores: {
    title: 'Où est-ce moins cher ?',
    hint: 'Les mêmes produits achetés dans différents magasins (dernier prix, 6 derniers mois).',
    cheapest: 'Le moins cher',
    over: (pct) => `${pct} plus cher`,
    detail: (cheapest, compared) => `Moins cher pour ${cheapest} sur ${compared}`,
    dealsTitle: 'Quoi acheter où',
    deal: (store, pct) => `Chez ${store}, ${pct} de moins`,
    needMore: 'Pour comparer, ajoutez des tickets de plusieurs magasins.',
  },
  byStore: 'Prix dans chaque magasin',
};
