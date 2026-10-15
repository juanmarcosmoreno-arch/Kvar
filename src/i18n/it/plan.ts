import type { Messages } from '../es';
import { isOne } from '..';

export const plan: Messages['plan'] = {
  title: 'Menù della settimana',
  make: 'Preparami il menù della settimana',
  hint: 'Con quello che c’è: prima ciò che scade e ciò che non richiede acquisti.',
  days: 'Giorni',
  meal: 'Pasto',
  build: 'Prepara il menù',
  rebuild: 'Rifai',
  swap: (title) => `Cambia ${title} con un’altra ricetta`,
  save: 'Salva il menù',
  saved: 'Ho salvato il menù. Lo vede tutta la casa.',
  edit: 'Cambia il menù',
  addMissing: (n) => `Aggiungi alla lista quello che manca (${n})`,
  added: (n) => (isOne(n) ? `Ho aggiunto ${n} cosa alla lista.` : `Ho aggiunto ${n} cose alla lista.`),
  allInList: 'Quello che manca era già nella lista.',
  nothingMissing: 'Per questo menù hai tutto.',
  missingNote: 'Per il menù della settimana',
  empty: 'Non ho trovato ricette per quei giorni. Prova con un altro pasto o aggiungi le ricette di casa.',
  today: 'Oggi',
  deleted: '(non c’è più)',
};
