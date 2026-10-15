import type { Messages } from '../es';

export const shopping: Messages['shopping'] = {
  suggested: (n) => `× ${n}?`,
  useSuggested: (n, name) => `Köp ${n} × ${name} (det du brukar köpa)`,
  suggestedHint: 'Siffrorna med ”?” är det du brukar köpa. Tryck på en för att använda den.',
  imShopping: 'Jag är i affären',
  stopShopping: 'Jag har lämnat affären',
  meShoppingBanner: 'Du är i affären: det de andra lägger till syns direkt hos dig.',
  othersShopping: (names) => `${names} är i affären och ser direkt det du lägger till.`,
  othersShoppingMany: (names) => `${names} är i affären och ser direkt det du lägger till.`,
  addedByOthers: (what) => `${what} har lagts till på listan.`,
  share: {
    button: 'Dela',
    label: 'Dela listan',
    title: (household) => `Inköpslista · ${household}`,
    footer: 'Skickat från Stoka',
    copied: 'Listan är kopierad. Klistra in den var du vill.',
    whatsapp: 'WhatsApp',
    copy: 'Kopiera',
  },
};
