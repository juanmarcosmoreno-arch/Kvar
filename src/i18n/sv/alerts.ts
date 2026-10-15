import type { Messages } from '../es';

export const alerts: Messages['alerts'] = {
  settings: {
    title: 'Notiser',
    hint: 'Jag meddelar dig på iPhone innan något tar slut eller går ut. Det räknas ut i telefonen.',
    enable: 'Slå på notiser',
    enabled: 'Notiser på',
    denied: 'iOS tillät inte notiser. Slå på dem i iPhones Inställningar → Stoka → Notiser.',
    predicted: 'Det som snart tar slut',
    predictedHint: 'Utifrån hur länge varje sak brukar räcka hemma.',
    expiry: 'Det som snart går ut',
    expiryHint: 'Två dagar före bäst före-datumet.',
    others: 'Vad de andra gör',
    othersHint: 'Medan du använder appen: ”Sofía köpte mjölken”.',
    webNote: 'På webben visar jag bara vad de andra gör medan appen är öppen. Notiserna kommer i iPhone-appen.',
  },
  notif: {
    expiryTitle: 'Går snart ut',
    expiry: (name, days) =>
      days <= 0 ? `${name} går ut i dag.` : days === 1 ? `${name} går ut i morgon.` : `${name} går ut om ${days} dagar.`,
    predictedTitle: 'Snart slut',
    predicted: (name) => `${name} tar troligen snart slut. Vill du lägga till på listan?`,
  },
  others: {
    bought: (who, what) => `${who} köpte ${what}.`,
    someone: 'Någon',
  },
};
