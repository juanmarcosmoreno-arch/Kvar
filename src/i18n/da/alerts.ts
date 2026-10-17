import type { Messages } from '../es';

export const alerts: Messages['alerts'] = {
  settings: {
    title: 'Notifikationer',
    hint: 'Jeg giver dig besked på iPhonen, før noget slipper op eller udløber. Det regnes ud på telefonen.',
    enable: 'Slå notifikationer til',
    enabled: 'Notifikationer er slået til',
    denied: 'iOS tillod ikke notifikationer. Slå dem til i iPhonens Indstillinger → Stoka → Notifikationer.',
    predicted: 'Det, der snart slipper op',
    predictedHint: 'Ud fra, hvor længe hver ting holder i hjemmet.',
    expiry: 'Det, der snart udløber',
    expiryHint: 'To dage før udløbsdatoen.',
    phone: 'På iPhone',
    inApp: 'Mens du bruger appen',
    prices: 'Prisalarmer',
    pricesHint: 'Når noget, du følger, falder i pris eller er på tilbud (Priser → Alarmer).',
    others: 'Hvad de andre gør',
    othersHint: '“Sofía købte mælken”.',
    shoppers: 'Når nogen er i butikken',
    shoppersHint: '“Sofía er i butikken”: det, du tilføjer til listen, når frem med det samme.',
    webNote: 'På nettet viser jeg kun, hvad de andre gør, mens appen er åben. Notifikationerne kommer i iPhone-appen.',
  },
  notif: {
    expiryTitle: 'Udløber snart',
    expiry: (name, days) =>
      days <= 0 ? `${name} udløber i dag.` : days === 1 ? `${name} udløber i morgen.` : `${name} udløber om ${days} dage.`,
    predictedTitle: 'Næsten tom',
    predicted: (name) => `${name} slipper nok snart op. Vil du tilføje til listen?`,
  },
  others: {
    bought: (who, what) => `${who} købte ${what}.`,
    someone: 'Nogen',
    shopping: (who) => `${who} er i butikken.`,
  },
};
