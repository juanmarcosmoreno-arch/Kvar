import type { Messages } from '../es';
import { isOne } from '..';

export const shell: Messages['shell'] = {
  app: {
    joined: (household) => `Vous avez rejoint ${household}.`,
    offlineFirstRun: 'Pas de connexion. Ouvrez Stoka avec internet la première fois.',
  },
  nav: {
    label: 'Principal',
    home: 'Accueil',
    products: 'Produits',
    list: 'Liste',
    cook: 'Cuisiner',
    quickActions: 'Actions rapides',
  },
  actions: {
    title: 'On fait quoi ?',
    ranOut: { title: 'Il n’y a plus de…', hint: 'Un geste et c’est sur la liste' },
    voice: { title: 'Dites-le', hint: '« J’ai acheté du lait », « Plus d’huile », « Il y a du riz ? »' },
    scan: { title: 'Scanner', hint: 'Terminé ou acheté : choisissez d’un geste' },
    bought: { title: 'De retour des courses', hint: (ok) => `Scannez vos achats, ils passent en « ${ok} »` },
    receipt: { title: 'Photo du ticket', hint: 'J’ajoute tous les achats d’un coup' },
    add: { title: 'Ajouter un produit', hint: 'Juste le nom ; le reste est facultatif' },
  },
  demoBar: {
    label: 'Démo avec des données d’exemple',
    simulate: (name) => `${name} marque un produit`,
    reset: 'Réinitialiser',
    nothingToMark: (name, ok) => `Plus rien en « ${ok} » à faire marquer par ${name}.`,
    marked: (name, product, out) => `${name} a marqué « ${product} » : ${out}. C’est déjà sur votre liste.`,
    resetDone: 'Retour aux données d’exemple.',
  },
  sync: {
    offlineHint: 'Hors ligne : les modifications sont enregistrées et envoyées à la reconnexion',
    sending: (n) => `Envoi de ${n}…`,
    unsent: (n) => `${n} non envoyé${isOne(n) ? '' : 's'}`,
    offline: 'Hors ligne',
  },
  intro: {
    videoLabel: 'Stoka : la maison se remplit de produits',
  },
  setup: {
    missing: {
      title: 'Supabase n’est pas configuré',
      body: 'Il manque VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY dans le fichier .env.',
    },
    badUrl: {
      title: 'L’adresse Supabase n’est pas valide',
      body: 'VITE_SUPABASE_URL doit être la Project URL, par exemple https://abcdefgh.supabase.co (Project Settings → Data API).',
    },
    badKey: {
      title: 'La clé Supabase n’est pas valide',
      body: 'VITE_SUPABASE_ANON_KEY doit être la Publishable key, qui commence par sb_publishable_ (Project Settings → API Keys).',
    },
    secretKey: {
      title: 'Vous avez mis la clé secrète',
      body: 'VITE_SUPABASE_ANON_KEY doit contenir la Publishable key (sb_publishable_…), jamais la Secret key : elle donne un accès total à la base. Remplacez-la et générez une nouvelle Secret key dans Supabase par précaution.',
    },
    current: (url) => `Valeur actuelle : ${url}`,
    empty: '(vide)',
    fix: {
      before: 'Corrigez le fichier ',
      middle: ' dans le dossier du projet et relancez ',
      after: '.',
    },
  },
  update: {
    title: 'Mettez à jour Stoka',
    body: 'Une nouvelle version est nécessaire pour continuer à synchroniser avec votre foyer. Vos données sont en sécurité.',
    openAppStore: 'Ouvrir l’App Store',
    searchAppStore: 'Cherchez Stoka dans l’App Store et touchez « Mettre à jour ».',
    updateNow: 'Mettre à jour',
    versions: (current, minimum) => `Vous avez la ${current} · il faut la ${minimum} ou plus récente`,
  },
};
