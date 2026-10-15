import type { Messages } from '../es';

export const importer: Messages['importer'] = {
  title: 'Importa da un link',
  urlLabel: 'Link della ricetta',
  urlPlaceholder: 'Incolla il link della ricetta',
  import: 'Importa',
  reading: 'Sto leggendo la ricetta…',
  done: 'Fatto: controlla gli ingredienti e salvala.',
  pasteToggle: 'Oppure incolla il testo della ricetta',
  pasteLabel: 'Incolla la ricetta',
  pastePlaceholder: 'Pasta al pomodoro\nIngredienti\n400 g di pasta\n1 barattolo di pomodori pelati\nPreparazione\n1. Soffriggi la cipolla…',
  useText: 'Usa questo testo',
  errors: {
    invalidUrl: 'Questo link non sembra valido.',
    webBlocked: 'Dalla versione web non si può leggere quel link; incolla il testo della ricetta.',
    network: 'Non riesco a connettermi. Controlla la connessione e riprova.',
    http: 'La pagina non ha risposto. Riprova più tardi.',
    notRecipe: 'Non ho trovato una ricetta in quella pagina. Puoi incollare il testo.',
    textNotRecipe: 'Non ho trovato ingredienti in quel testo. Mettine uno per riga.',
  },
};
