import { isOne } from '..';
import type { Messages } from '../es';

export const expiry: Messages['expiry'] = {
  title: 'Holdbarhed',
  none: 'Ingen dato',
  set: 'Angiv dato',
  clear: 'Fjern udløbsdatoen',
  dateLabel: 'Udløbsdato',
  inDays: (days) =>
    days < 0 ? (days === -1 ? 'udløb i går' : `udløb for ${-days} ${isOne(-days) ? 'dag' : 'dage'} siden`)
      : days === 0 ? 'udløber i dag' : days === 1 ? 'udløber i morgen' : `udløber om ${days} ${isOne(days) ? 'dag' : 'dage'}`,
  fromPhoto: 'Læs fra foto',
  reading: 'Læser datoen…',
  found: (date) => `Jeg læste ${date}. Passer det?`,
  confirm: 'Ja, gem',
  change: 'Nej, jeg skriver den',
  notFound: 'Jeg fandt ingen dato på fotoet. Skriv den i hånden.',
  failed: 'Jeg kunne ikke læse fotoet. Prøv igen, eller skriv den i hånden.',
  saved: (date) => `Udløber ${date}.`,
};
