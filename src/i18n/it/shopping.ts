import type { Messages } from '../es';

export const shopping: Messages['shopping'] = {
  suggested: (n) => `× ${n}?`,
  useSuggested: (n, name) => `Prendere ${n} × ${name} (quello che compri di solito)`,
  suggestedHint: 'I numeri con «?» sono quello che prendi di solito. Toccane uno per usarlo.',
  imShopping: 'Sono al supermercato',
  stopShopping: 'Ho finito la spesa',
  meShoppingBanner: 'Sei al supermercato: quello che aggiungono gli altri ti appare subito.',
  othersShopping: (names) => `${names} è al supermercato e vede subito quello che aggiungi.`,
  othersShoppingMany: (names) => `${names} sono al supermercato e vedono subito quello che aggiungi.`,
  addedByOthers: (what) => `Hanno aggiunto ${what} alla lista.`,
  share: {
    button: 'Condividi',
    label: 'Condividi la lista',
    title: (household) => `Lista della spesa · ${household}`,
    footer: 'Inviato da Stoka',
    copied: 'Ho copiato la lista. Incollala dove vuoi.',
    whatsapp: 'WhatsApp',
    copy: 'Copia',
  },
};
