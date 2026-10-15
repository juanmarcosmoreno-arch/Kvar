import type { Messages } from '../es';

export const shopping: Messages['shopping'] = {
  suggested: (n) => `× ${n}?`,
  useSuggested: (n, name) => `Get ${n} of ${name} (what you usually buy)`,
  suggestedHint: 'Numbers with “?” are what you usually get. Tap one to use it.',
  imShopping: 'I’m at the store',
  stopShopping: 'I’ve left the store',
  meShoppingBanner: 'You’re at the store: whatever others add shows up for you instantly.',
  othersShopping: (names) => `${names} is at the store. Whatever you add shows up for them instantly.`,
  othersShoppingMany: (names) => `${names} are at the store. Whatever you add shows up for them instantly.`,
  addedByOthers: (what) => `Someone added ${what} to the list.`,
  share: {
    button: 'Share',
    label: 'Share the list',
    title: (household) => `Shopping list · ${household}`,
    footer: 'Sent from Stoka',
    copied: 'List copied. Paste it wherever you like.',
    whatsapp: 'WhatsApp',
    copy: 'Copy',
  },
};
