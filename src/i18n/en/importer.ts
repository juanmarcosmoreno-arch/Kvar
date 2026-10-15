import type { Messages } from '../es';

export const importer: Messages['importer'] = {
  title: 'Import from a link',
  urlLabel: 'Recipe link',
  urlPlaceholder: 'Paste the recipe link',
  import: 'Import',
  reading: 'Reading the recipe…',
  done: 'Done: check the ingredients and save it.',
  pasteToggle: 'Or paste the recipe text',
  pasteLabel: 'Paste the recipe',
  pastePlaceholder: 'Pasta with tomato sauce\nIngredients\n400 g pasta\n1 can of crushed tomatoes\nInstructions\n1. Sauté the onion…',
  useText: 'Use this text',
  errors: {
    invalidUrl: 'That link doesn’t look right.',
    webBlocked: 'The web version can’t read that link; paste the recipe text instead.',
    network: 'Couldn’t connect. Check your connection and try again.',
    http: 'The page didn’t respond. Try again later.',
    notRecipe: 'I couldn’t find a recipe on that page. You can paste the text.',
    textNotRecipe: 'I couldn’t find ingredients in that text. Put one per line.',
  },
};
