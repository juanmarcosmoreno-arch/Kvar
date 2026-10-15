import type { Messages } from '../es';

export const importer: Messages['importer'] = {
  title: 'Importér fra et link',
  urlLabel: 'Link til opskriften',
  urlPlaceholder: 'Indsæt linket til opskriften',
  import: 'Importér',
  reading: 'Læser opskriften…',
  done: 'Færdig: tjek ingredienserne og gem den.',
  pasteToggle: 'Eller indsæt opskriftens tekst',
  pasteLabel: 'Indsæt opskriften',
  pastePlaceholder: 'Pasta med tomatsauce\nIngredienser\n400 g pasta\n1 dåse hakkede tomater\nFremgangsmåde\n1. Svits løget…',
  useText: 'Brug denne tekst',
  errors: {
    invalidUrl: 'Linket ser ikke rigtigt ud.',
    webBlocked: 'Webversionen kan ikke læse det link; indsæt opskriftens tekst i stedet.',
    network: 'Kunne ikke forbinde. Tjek forbindelsen, og prøv igen.',
    http: 'Siden svarede ikke. Prøv igen senere.',
    notRecipe: 'Jeg fandt ingen opskrift på siden. Du kan indsætte teksten.',
    textNotRecipe: 'Jeg fandt ingen ingredienser i teksten. Skriv én per linje.',
  },
};
