import { isOne } from '..';
import type { Messages } from '../es';

export const stock: Messages['stock'] = {
  home: {
    settings: 'Réglages',
    searchPlaceholder: 'Rechercher un produit…',
    voice: 'Dites-le à voix haute',
    scan: 'Scanner un code-barres',
    addNamed: (name) => `Ajouter « ${name} »`,
    ranOutTitle: 'Quelque chose est fini ?',
    ranOutHint: 'Touchez-le et il va directement dans la liste',
    restock: 'À racheter',
    viewList: (n) => `Voir la liste (${n})`,
    allGoodTitle: 'Tout est en ordre',
    allGoodHint: 'Quand quelque chose est presque fini ou fini, il apparaît ici.',
    emptyTitle: 'Commencez par ajouter ce que vous avez',
    emptyHint: 'Avec le bouton +, ajoutez vos produits un par un, juste avec le nom.',
    addProduct: 'Ajouter un produit',
    expiringSoon: 'Périme bientôt',
  },

  expiry: (days) => {
    if (days < 0) return days === -1 ? 'Périmé depuis hier' : `Périmé depuis ${-days} ${isOne(-days) ? 'jour' : 'jours'}`;
    if (days === 0) return 'Périme aujourd’hui';
    if (days === 1) return 'Périme demain';
    return `Périme dans ${days} ${isOne(days) ? 'jour' : 'jours'}`;
  },

  inventory: {
    title: 'Produits',
    addProduct: 'Ajouter un produit',
    searchPlaceholder: 'Rechercher…',
    filterAll: 'Tous',
    filterStaple: 'Essentiels',
    noMatchTitle: 'Aucun résultat avec ces filtres',
    noMatchHint: 'Essayez de retirer un filtre.',
    emptyTitle: 'Pas encore de produits',
    emptyHint: 'Ajoutez ce que vous avez à la maison ; il suffit du nom.',
    swipeHint: 'Balayez vers la gauche pour « bientôt fini », vers la droite pour « En stock ».',
  },

  list: {
    title: 'Liste de courses',
    reasons: {
      recipe: 'Pour une recette',
      plan: 'Menu de la semaine',
      predicted: 'Sans doute bientôt fini',
    },
    boughtNowOk: (name) => `${name} : acheté, maintenant en stock.`,
    bought: (name) => `${name} : acheté.`,
    backFromStore: 'Retour des courses',
    receipt: 'Ticket',
    addPlaceholder: 'Ajouter à la liste…',
    emptyTitle: 'Rien ne manque',
    emptyHint: 'Quand vous indiquez qu’un produit est fini, il apparaît ici tout seul.',
    markBought: (name) => `Marquer ${name} comme acheté`,
    howMany: (name) => `Combien acheter de ${name}`,
    remove: (name) => `Retirer ${name} de la liste`,
    checkedTitle: 'Acheté',
    clear: 'Effacer',
    uncheck: (name) => `Décocher ${name}`,
  },

  row: {
    staple: 'Essentiel',
    unidentified: 'Non identifié',
    minusOne: (name) => `Retirer un ${name} (maintenez pour choisir combien)`,
    plusOne: (name) => `Ajouter un ${name} (maintenez pour choisir combien)`,
    chooseAmount: (unitPlural, name) => `Choisir combien de ${unitPlural} de ${name}`,
    changeStatus: (name) => `Changer l’état de ${name}`,
  },

  product: {
    changePhoto: 'Changer la photo',
    noCutoutNative: 'Impossible de détourer le produit : la photo entière a été enregistrée.',
    noCutoutWeb: 'Photo enregistrée. Le détourage est disponible dans l’app iPhone.',
    anotherBarcode: 'Autre code',
    linkBarcode: 'Associer un code',
    minusOne: 'Retirer un',
    plusOne: 'Ajouter un',
    tapForMany: 'touchez pour en ajouter ou retirer plusieurs',
    addedToList: (name) => `${name} ajouté à la liste.`,
    addToList: 'Ajouter à la liste',
    inList: 'Dans la liste de courses',
    buyN: (n) => `Acheter ${n}`,
    howManyToBuy: 'Combien acheter',
    name: 'Nom',
    location: 'Emplacement',
    category: 'Catégorie',
    staple: 'C’est un essentiel',
    stapleHint: 'Je vous préviens avant qu’il soit fini : dès « Bientôt fini », il va dans la liste.',
    countUnits: 'Compter les unités',
    countUnitsHint: 'Pour les couches, les conserves ou le congélateur.',
    unit: 'Unité',
    lowAt: '« Bientôt fini » à',
    confirmDelete: 'Oui, supprimer',
    deleteProduct: 'Supprimer le produit',
  },

  add: {
    howManyNow: 'Combien maintenant',
    titleNew: 'Nouveau produit',
    title: 'Ajouter un produit',
    linked: (name) => `C’est fait : la prochaine fois que vous le scannerez, ce sera ${name}.`,
    addedToList: (name) => `${name} ajouté, et il va dans la liste.`,
    added: (name) => `${name} ajouté.`,
    foundOff: 'Trouvé sur Open Food Facts. ',
    unknownCode: 'Je ne connais pas ce code. ',
    confirmOnce: 'Confirmez-le une seule fois : la prochaine fois que vous le scannerez, je le reconnaîtrai.',
    namePlaceholder: 'Ex. : Café, Lait, Couches…',
    isOneOfThese: 'Est-ce l’un de ceux-ci ?',
    alreadyHave: 'Vous l’avez déjà ?',
    anotherPhoto: 'Autre photo',
    photo: 'Photo',
    isExisting: (name) => `C’est ${name}`,
    viewExisting: (name) => `Voir ${name}`,
  },

  quantity: {
    titles: {
      add: 'Combien en ajouter ?',
      remove: 'Combien en avez-vous utilisé ?',
      set: 'Combien y en a-t-il ?',
      bought: 'Combien en avez-vous acheté ?',
      list: 'Combien en acheter ?',
    },
    modes: { add: 'Ajouter', remove: 'Retirer', set: 'Compter' },
    toastBuy: (name, n) => `${name} : en acheter ${n}.`,
    toastLeft: (name, quantity) => `${name} : il reste ${quantity}.`,
    toastOk: (name) => `${name} : en stock.`,
    has: (quantity) => `il y a ${quantity}`,
    oneLess: 'Un de moins',
    oneMore: 'Un de plus',
    amount: 'Quantité',
  },

  ranOut: {
    title: 'Quelque chose est fini ?',
    searchPlaceholder: 'Recherchez un produit…',
    scanEmpty: 'Scannez l’emballage vide',
    frequent: 'Ceux qui finissent le plus souvent',
    alreadyInList: 'Déjà dans la liste',
    addedOut: (name) => `${name} : fini. Ajouté à la liste.`,
    addToList: (name) => `Ajouter « ${name} » à la liste`,
    empty: 'Pas encore de produits. Recherchez-en un pour l’ajouter.',
  },

  unitPicker: {
    other: 'Autre',
    placeholder: 'Au pluriel, ex. : couches, bocaux',
    use: 'Utiliser',
  },

  status: { label: 'État' },

  photo: {
    take: 'Prendre une photo',
    failed: 'Impossible de traiter la photo. Essayez-en une autre.',
    cropping: 'Détourage…',
  },

  codes: {
    title: 'Codes-barres',
    remove: (code) => `Retirer le code ${code}`,
    removed: 'Code retiré. Si vous le scannez à nouveau, je vous demanderai ce que c’est.',
  },
  merge: {
    open: 'Fusionner avec un autre produit',
    hint: 'Pour deux marques qui sont la même chose ou un produit ajouté deux fois.',
    title: 'Fusionner avec un autre produit',
    search: 'Rechercher l’autre produit…',
    pick: (name) => `Lequel est la même chose que ${name} ?`,
    none: 'Aucun autre produit avec ce nom.',
    confirmTitle: (keep) => `On garde ${keep}`,
    confirmBody: (duplicate, keep) =>
      `${duplicate} sera supprimé et deviendra ${keep} : ses codes-barres, son historique, la liste et les recettes.`,
    confirm: 'Fusionner',
    done: (duplicate, keep) => `C’est fait : ${duplicate} est maintenant ${keep}.`,
  },
};
