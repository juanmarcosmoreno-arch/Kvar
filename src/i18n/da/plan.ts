import type { Messages } from '../es';

export const plan: Messages['plan'] = {
  title: 'Ugens menu',
  make: 'Lav ugens menu',
  hint: 'Med det, der er: først det, der udløber, og det, der ikke kræver indkøb.',
  days: 'Dage',
  meal: 'Måltid',
  build: 'Lav menuen',
  rebuild: 'Lav den igen',
  swap: (title) => `Skift ${title} ud med en anden opskrift`,
  save: 'Gem menuen',
  saved: 'Menuen er gemt. Hele husstanden kan se den.',
  edit: 'Ret menuen',
  addMissing: (n) => `Tilføj det, der mangler, til listen (${n})`,
  added: (n) => `${n} ting er tilføjet til listen.`,
  allInList: 'Det, der mangler, stod allerede på listen.',
  nothingMissing: 'Du har det hele til denne menu.',
  missingNote: 'Til ugens menu',
  empty: 'Jeg fandt ingen opskrifter til de dage. Prøv et andet måltid, eller tilføj husets opskrifter.',
  today: 'I dag',
  deleted: '(findes ikke længere)',
};
