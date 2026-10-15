import type { Messages } from '../es';

export const alerts: Messages['alerts'] = {
  settings: {
    title: 'Notifications',
    hint: 'Je vous préviens sur l’iPhone avant qu’un produit soit fini ou périmé. Le calcul se fait sur le téléphone.',
    enable: 'Activer les notifications',
    enabled: 'Notifications activées',
    denied: 'iOS n’a pas autorisé les notifications. Activez-les dans Réglages de l’iPhone → Stoka → Notifications.',
    predicted: 'Ce qui sera bientôt fini',
    predictedHint: 'Selon le temps que dure chaque produit à la maison.',
    expiry: 'Ce qui périme bientôt',
    expiryHint: 'Deux jours avant la date de péremption.',
    others: 'Ce que font les autres',
    othersHint: 'Pendant que vous utilisez l’app : « Sofía a acheté le lait ».',
    webNote: 'Sur le web, je vous montre seulement ce que font les autres quand l’app est ouverte. Les notifications arrivent dans l’app iPhone.',
  },
  notif: {
    expiryTitle: 'Périme bientôt',
    expiry: (name, days) =>
      days <= 0 ? `${name} périme aujourd’hui.` : days === 1 ? `${name} périme demain.` : `${name} périme dans ${days} jours.`,
    predictedTitle: 'Bientôt fini',
    predicted: (name) => `${name} : sans doute bientôt fini. L’ajouter à la liste ?`,
  },
  others: {
    bought: (who, what) => `${who} a acheté ${what}.`,
    someone: 'Quelqu’un',
  },
};
