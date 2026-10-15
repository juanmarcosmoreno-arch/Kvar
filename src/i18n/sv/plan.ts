import type { Messages } from '../es';
import { isOne } from '..';

export const plan: Messages['plan'] = {
  title: 'Veckans meny',
  make: 'Planera veckans meny',
  hint: 'Med det som finns: först det som går ut och det som inte kräver inköp.',
  days: 'Dagar',
  meal: 'Måltid',
  build: 'Planera menyn',
  rebuild: 'Planera om',
  swap: (title) => `Byt ${title} mot ett annat recept`,
  save: 'Spara menyn',
  saved: 'Menyn är sparad. Hela hushållet ser den.',
  edit: 'Ändra menyn',
  addMissing: (n) => `Lägg till det som saknas på listan (${n})`,
  added: (n) => (isOne(n) ? `${n} sak har lagts till på listan.` : `${n} saker har lagts till på listan.`),
  allInList: 'Det som saknas fanns redan på listan.',
  nothingMissing: 'Du har allt till den här menyn.',
  missingNote: 'Till veckans meny',
  empty: 'Jag hittade inga recept för de dagarna. Prova en annan måltid eller lägg till husets recept.',
  today: 'I dag',
  deleted: '(finns inte längre)',
};
