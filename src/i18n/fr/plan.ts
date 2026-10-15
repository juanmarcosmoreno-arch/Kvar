import type { Messages } from '../es';
import { isOne } from '..';

export const plan: Messages['plan'] = {
  title: 'Menu de la semaine',
  make: 'Préparer le menu de la semaine',
  hint: 'Avec ce que vous avez : d’abord ce qui périme et ce qui ne demande pas de courses.',
  days: 'Jours',
  meal: 'Repas',
  build: 'Préparer le menu',
  rebuild: 'Recommencer',
  swap: (title) => `Remplacer ${title} par une autre recette`,
  save: 'Enregistrer le menu',
  saved: 'Menu enregistré. Toute la maison le voit.',
  edit: 'Modifier le menu',
  addMissing: (n) => `Ajouter ce qui manque à la liste (${n})`,
  added: (n) => (isOne(n) ? `${n} chose ajoutée à la liste.` : `${n} choses ajoutées à la liste.`),
  allInList: 'Ce qui manque était déjà dans la liste.',
  nothingMissing: 'Vous avez tout pour ce menu.',
  missingNote: 'Pour le menu de la semaine',
  empty: 'Aucune recette trouvée pour ces jours. Essayez un autre repas ou ajoutez les recettes de la maison.',
  today: 'Aujourd’hui',
  deleted: '(n’existe plus)',
};
