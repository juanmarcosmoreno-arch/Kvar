import type { Messages } from '../es';

export const alerts: Messages['alerts'] = {
  settings: {
    title: 'Avvisi',
    hint: 'Ti avviso sull’iPhone prima che qualcosa finisca o scada. Il calcolo avviene sul telefono.',
    enable: 'Attiva gli avvisi',
    enabled: 'Avvisi attivati',
    denied: 'iOS non ha permesso di inviare avvisi. Attivali in Impostazioni dell’iPhone → Stoka → Notifiche.',
    predicted: 'Ciò che sta finendo',
    predictedHint: 'In base a quanto dura ogni cosa in casa.',
    expiry: 'Ciò che scade presto',
    expiryHint: 'Due giorni prima della data di scadenza.',
    others: 'Cosa fanno gli altri',
    othersHint: 'Mentre usi l’app: «Sofía ha comprato il latte».',
    webNote: 'Sul web ti mostro solo cosa fanno gli altri mentre l’app è aperta. Gli avvisi arrivano nell’app per iPhone.',
  },
  notif: {
    expiryTitle: 'Scade presto',
    expiry: (name, days) =>
      days <= 0 ? `${name} scade oggi.` : days === 1 ? `${name} scade domani.` : `${name} scade tra ${days} giorni.`,
    predictedTitle: 'Sta finendo',
    predicted: (name) => `Probabilmente ${name} sta per finire. Lo aggiungi alla lista?`,
  },
  others: {
    bought: (who, what) => `${who} ha comprato ${what}.`,
    someone: 'Qualcuno',
  },
};
