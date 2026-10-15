import { isOne } from '..';
import type { Messages } from '../es';

export const expiry: Messages['expiry'] = {
  title: 'Péremption',
  none: 'Sans date',
  set: 'Ajouter une date',
  clear: 'Supprimer la date de péremption',
  dateLabel: 'Date de péremption',
  inDays: (days) =>
    days < 0 ? (days === -1 ? 'périmé depuis hier' : `périmé depuis ${-days} ${isOne(-days) ? 'jour' : 'jours'}`)
      : days === 0 ? 'périme aujourd’hui' : days === 1 ? 'périme demain' : `périme dans ${days} ${isOne(days) ? 'jour' : 'jours'}`,
  fromPhoto: 'Lire sur la photo',
  reading: 'Lecture de la date…',
  found: (date) => `J’ai lu ${date}. Est-ce bien ça ?`,
  confirm: 'Oui, enregistrer',
  change: 'Non, je la saisis',
  notFound: 'Aucune date trouvée sur la photo. Saisissez-la à la main.',
  failed: 'Impossible de lire la photo. Réessayez ou saisissez-la à la main.',
  saved: (date) => `Périme le ${date}.`,
};
