import type { Messages } from '../es';

export const shopping: Messages['shopping'] = {
  suggested: (n) => `× ${n}?`,
  useSuggested: (n, name) => `Prendre ${n} × ${name} (ce que vous achetez d’habitude)`,
  suggestedHint: 'Les nombres avec « ? » sont ce que vous prenez d’habitude. Touchez-en un pour l’utiliser.',
  imShopping: 'Je suis au supermarché',
  stopShopping: 'J’ai fini mes courses',
  meShoppingBanner: 'Vous êtes au supermarché : ce que les autres ajoutent apparaît aussitôt.',
  othersShopping: (names) => `${names} est au supermarché et voit aussitôt ce que vous ajoutez.`,
  othersShoppingMany: (names) => `${names} sont au supermarché et voient aussitôt ce que vous ajoutez.`,
  addedByOthers: (what) => `On a ajouté ${what} à la liste.`,
  share: {
    button: 'Partager',
    label: 'Partager la liste',
    title: (household) => `Liste de courses · ${household}`,
    footer: 'Envoyé depuis Stoka',
    copied: 'Liste copiée. Collez-la où vous voulez.',
    whatsapp: 'WhatsApp',
    copy: 'Copier',
  },
};
