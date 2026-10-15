import type { Messages } from '../es';

export const shopping: Messages['shopping'] = {
  suggested: (n) => `× ${n}?`,
  useSuggested: (n, name) => `Køb ${n} × ${name} (det, du plejer at købe)`,
  suggestedHint: 'Tallene med “?” er det, du plejer at købe. Tryk på et for at bruge det.',
  imShopping: 'Jeg er i supermarkedet',
  stopShopping: 'Jeg har forladt supermarkedet',
  meShoppingBanner: 'Du er i supermarkedet: det, de andre tilføjer, dukker op med det samme.',
  othersShopping: (names) => `${names} er i supermarkedet og ser med det samme, hvad du tilføjer.`,
  othersShoppingMany: (names) => `${names} er i supermarkedet og ser med det samme, hvad du tilføjer.`,
  addedByOthers: (what) => `${what} er tilføjet til listen.`,
  share: {
    button: 'Del',
    label: 'Del listen',
    title: (household) => `Indkøbsliste · ${household}`,
    footer: 'Sendt fra Stoka',
    copied: 'Listen er kopieret. Indsæt den, hvor du vil.',
    whatsapp: 'WhatsApp',
    copy: 'Kopiér',
  },
};
