import { isOne } from '..';
import type { Messages } from '../es';

export const expiry: Messages['expiry'] = {
  title: 'Scadenza',
  none: 'Senza data',
  set: 'Imposta data',
  clear: 'Rimuovi la data di scadenza',
  dateLabel: 'Data di scadenza',
  inDays: (days) =>
    days < 0 ? (days === -1 ? 'scaduto ieri' : `scaduto da ${-days} ${isOne(-days) ? 'giorno' : 'giorni'}`)
      : days === 0 ? 'scade oggi' : days === 1 ? 'scade domani' : `scade tra ${days} ${isOne(days) ? 'giorno' : 'giorni'}`,
  fromPhoto: 'Leggi dalla foto',
  reading: 'Leggo la data…',
  found: (date) => `Ho letto ${date}. È giusta?`,
  confirm: 'Sì, salva',
  change: 'No, la scrivo io',
  notFound: 'Non ho trovato una data nella foto. Scrivila a mano.',
  failed: 'Non sono riuscito a leggere la foto. Riprova o scrivila a mano.',
  saved: (date) => `Scade il ${date}.`,
};
