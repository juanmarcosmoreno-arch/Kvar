import type { Messages } from '../es';

export const importer: Messages['importer'] = {
  title: 'Importera från en länk',
  urlLabel: 'Länk till receptet',
  urlPlaceholder: 'Klistra in länken till receptet',
  import: 'Importera',
  reading: 'Läser receptet…',
  done: 'Klart: kolla ingredienserna och spara.',
  pasteToggle: 'Eller klistra in receptets text',
  pasteLabel: 'Klistra in receptet',
  pastePlaceholder: 'Pasta med tomatsås\nIngredienser\n400 g pasta\n1 burk krossade tomater\nGör så här\n1. Fräs löken…',
  useText: 'Använd den här texten',
  errors: {
    invalidUrl: 'Länken ser inte rätt ut.',
    webBlocked: 'Webbversionen kan inte läsa den länken; klistra in receptets text i stället.',
    network: 'Kunde inte ansluta. Kolla anslutningen och försök igen.',
    http: 'Sidan svarade inte. Försök igen senare.',
    notRecipe: 'Jag hittade inget recept på sidan. Du kan klistra in texten.',
    textNotRecipe: 'Jag hittade inga ingredienser i texten. Skriv en per rad.',
  },
};
