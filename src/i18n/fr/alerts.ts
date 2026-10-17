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
    phone: 'Sur l’iPhone',
    inApp: 'Pendant que vous utilisez l’app',
    prices: 'Alertes de prix',
    pricesHint: 'Quand un produit que vous suivez baisse de prix ou est en promo (Prix → Alertes).',
    others: 'Ce que font les autres',
    othersHint: '« Sofía a acheté le lait ».',
    shoppers: 'Quand quelqu’un est au magasin',
    shoppersHint: '« Sofía est au magasin » : ce que vous ajoutez à la liste lui arrive tout de suite.',
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
    shopping: (who) => `${who} est au magasin.`,
  },
};
