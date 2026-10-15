import type { Messages } from '../es';

export const stats: Messages['stats'] = {
  title: 'Statistiques',
  open: 'Voir les statistiques',
  range: (months) => `${months} mois`,
  rangeLabel: 'Période',
  loading: 'Chargement de l’historique…',
  offline: 'Hors ligne : affichage des dernières données enregistrées.',
  error: 'Impossible de charger l’historique. Réessayez une fois connecté.',
  empty: 'Pas encore d’historique. À mesure que vous indiquez ce qui est fini et ce que vous achetez, vous verrez ici la consommation du foyer.',

  kpi: {
    bought: 'Achats',
    ranOut: 'Épuisés',
    perMonth: 'Achats par mois',
    perMonthHint: 'en moyenne',
    inRange: (months) => `sur ${months} mois`,
  },

  monthly: {
    title: 'Par mois',
    showBought: 'Achats',
    showRanOut: 'Épuisé',
    showUsed: 'Unités utilisées',
    table: 'Afficher en tableau',
    hideTable: 'Masquer le tableau',
    month: 'Mois',
    chartLabel: (what) => `Histogramme : ${what} par mois`,
    thisMonth: 'Ce mois-ci',
  },

  top: {
    title: 'Ce qui s’épuise le plus',
    hint: 'Fois par mois, en moyenne. Touchez un produit pour voir le détail.',
    perMonth: (n) => `${n} par mois`,
    lasts: (days) => `dure ~${days} jours`,
  },

  soon: {
    title: 'Sans doute bientôt fini',
    hint: 'D’après sa durée dans le foyer.',
    today: 'd’un moment à l’autre',
    inDays: (days) => (days <= 1 ? 'demain' : `dans ~${days} jours`),
    addToList: 'À la liste',
    added: (name) => `${name} ajouté à la liste.`,
  },

  categories: {
    title: 'Achats par catégorie',
    none: 'Sans catégorie',
  },

  product: {
    title: 'Consommation',
    lasts: 'Durée dans le foyer',
    every: 'Acheté tous les',
    usedPerMonth: 'Utilisé par mois',
    ranOut: 'Épuisé',
    days: (n) => `${n} jours`,
    times: (n) => `${n} fois`,
    nextOut: (when) => `Devrait s’épuiser ${when}`,
    lastBought: (when) => `Dernier achat : ${when}`,
    noData: 'Pas encore assez d’historique pour ce produit.',
    noDataShort: '—',
  },
};
