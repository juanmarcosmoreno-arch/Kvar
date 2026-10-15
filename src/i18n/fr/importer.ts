import type { Messages } from '../es';

export const importer: Messages['importer'] = {
  title: 'Importer depuis un lien',
  urlLabel: 'Lien de la recette',
  urlPlaceholder: 'Collez le lien de la recette',
  import: 'Importer',
  reading: 'Lecture de la recette…',
  done: 'C’est fait : vérifiez les ingrédients et enregistrez-la.',
  pasteToggle: 'Ou collez le texte de la recette',
  pasteLabel: 'Collez la recette',
  pastePlaceholder: 'Pâtes à la sauce tomate\nIngrédients\n400 g de pâtes\n1 boîte de tomates concassées\nPréparation\n1. Faire revenir l’oignon…',
  useText: 'Utiliser ce texte',
  errors: {
    invalidUrl: 'Ce lien ne semble pas valide.',
    webBlocked: 'La version web ne peut pas lire ce lien ; collez le texte de la recette.',
    network: 'Connexion impossible. Vérifiez votre connexion et réessayez.',
    http: 'La page n’a pas répondu. Réessayez plus tard.',
    notRecipe: 'Je n’ai pas trouvé de recette sur cette page. Vous pouvez coller le texte.',
    textNotRecipe: 'Je n’ai pas trouvé d’ingrédients dans ce texte. Mettez-en un par ligne.',
  },
};
