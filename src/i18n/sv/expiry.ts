import { isOne } from '..';
import type { Messages } from '../es';

export const expiry: Messages['expiry'] = {
  title: 'Bäst före',
  none: 'Inget datum',
  set: 'Ange datum',
  clear: 'Ta bort bäst före-datum',
  dateLabel: 'Bäst före-datum',
  inDays: (days) =>
    days < 0 ? (days === -1 ? 'gick ut i går' : `gick ut för ${-days} ${isOne(-days) ? 'dag' : 'dagar'} sedan`)
      : days === 0 ? 'går ut i dag' : days === 1 ? 'går ut i morgon' : `går ut om ${days} ${isOne(days) ? 'dag' : 'dagar'}`,
  fromPhoto: 'Läs från foto',
  reading: 'Läser datumet…',
  found: (date) => `Jag läste ${date}. Stämmer det?`,
  confirm: 'Ja, spara',
  change: 'Nej, jag skriver det',
  notFound: 'Jag hittade inget datum på fotot. Skriv in det för hand.',
  failed: 'Jag kunde inte läsa fotot. Försök igen eller skriv in det för hand.',
  saved: (date) => `Går ut ${date}.`,
};
