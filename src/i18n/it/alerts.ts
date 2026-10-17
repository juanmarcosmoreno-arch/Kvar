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
    phone: 'Sull’iPhone',
    inApp: 'Mentre usi l’app',
    prices: 'Avvisi di prezzo',
    pricesHint: 'Quando qualcosa che segui scende di prezzo o è in offerta (Prezzi → Avvisi).',
    others: 'Cosa fanno gli altri',
    othersHint: '«Sofía ha comprato il latte».',
    shoppers: 'Quando qualcuno è al supermercato',
    shoppersHint: '«Sofía è al supermercato»: quello che aggiungi alla lista gli arriva subito.',
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
    shopping: (who) => `${who} è al supermercato.`,
  },
};
