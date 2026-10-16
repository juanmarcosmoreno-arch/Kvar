import { isOne } from '..';
import type { Messages } from '../es';

export const stock: Messages['stock'] = {
  home: {
    settings: 'Impostazioni',
    searchPlaceholder: 'Cerca un prodotto…',
    voice: 'Dillo a voce',
    scan: 'Scansiona un codice a barre',
    addNamed: (name) => `Aggiungi «${name}»`,
    ranOutTitle: 'È finito qualcosa?',
    ranOutHint: 'Toccalo e va dritto nella lista',
    restock: 'Da ricomprare',
    viewList: (n) => `Vedi lista (${n})`,
    allGoodTitle: 'È tutto a posto',
    allGoodHint: 'Quando qualcosa sta per finire o finisce, compare qui.',
    emptyTitle: 'Inizia aggiungendo quello che hai',
    emptyHint: 'Con il pulsante + aggiungi i tuoi prodotti uno alla volta, solo con il nome.',
    addProduct: 'Aggiungi prodotto',
    expiringSoon: 'In scadenza',
  },

  expiry: (days) => {
    if (days < 0) return days === -1 ? 'Scaduto ieri' : `Scaduto da ${-days} ${isOne(-days) ? 'giorno' : 'giorni'}`;
    if (days === 0) return 'Scade oggi';
    if (days === 1) return 'Scade domani';
    return `Scade tra ${days} ${isOne(days) ? 'giorno' : 'giorni'}`;
  },

  inventory: {
    viewList: 'Lista',
    viewHouse: 'Casa',
    title: 'Prodotti',
    addProduct: 'Aggiungi prodotto',
    searchPlaceholder: 'Cerca…',
    filterAll: 'Tutti',
    filterStaple: 'Essenziali',
    noMatchTitle: 'Niente con questi filtri',
    noMatchHint: 'Prova a togliere qualche filtro.',
    emptyTitle: 'Ancora nessun prodotto',
    emptyHint: 'Aggiungi quello che hai in casa; basta il nome.',
    swipeHint: 'Scorri a sinistra per «sta finendo», a destra per «C’è».',
  },

  list: {
    title: 'Lista della spesa',
    reasons: {
      recipe: 'Per una ricetta',
      plan: 'Piano settimanale',
      predicted: 'Starà per finire',
    },
    boughtNowOk: (name) => `${name}: comprato, ora c’è.`,
    bought: (name) => `${name}: comprato.`,
    backFromStore: 'Tornato dalla spesa',
    receipt: 'Scontrino',
    addPlaceholder: 'Aggiungi alla lista…',
    emptyTitle: 'Non manca niente',
    emptyHint: 'Quando segni che qualcosa è finito, compare qui da solo.',
    markBought: (name) => `Segna ${name} come comprato`,
    howMany: (name) => `Quanti comprare di ${name}`,
    remove: (name) => `Togli ${name} dalla lista`,
    checkedTitle: 'Comprato',
    clear: 'Svuota',
    uncheck: (name) => `Deseleziona ${name}`,
  },

  row: {
    staple: 'Essenziale',
    unidentified: 'Non identificato',
    minusOne: (name) => `Togli uno di ${name} (tieni premuto per scegliere quanti)`,
    plusOne: (name) => `Aggiungi uno di ${name} (tieni premuto per scegliere quanti)`,
    chooseAmount: (unitPlural, name) => `Scegli quanti ${unitPlural} di ${name}`,
    changeStatus: (name) => `Cambia lo stato di ${name}`,
  },

  product: {
    changePhoto: 'Cambia foto',
    noCutoutNative: 'Non sono riuscito a separare il prodotto dallo sfondo: ho salvato la foto intera.',
    noCutoutWeb: 'Foto salvata. Lo scontorno è disponibile nell’app per iPhone.',
    anotherBarcode: 'Altro codice',
    linkBarcode: 'Collega codice',
    minusOne: 'Togli uno',
    plusOne: 'Aggiungi uno',
    tapForMany: 'tocca per aggiungerne o toglierne diversi',
    addedToList: (name) => `Ho aggiunto ${name} alla lista.`,
    addToList: 'Aggiungi alla lista',
    inList: 'È nella lista della spesa',
    buyN: (n) => `Compra ${n}`,
    howManyToBuy: 'Quanti comprare',
    name: 'Nome',
    location: 'Posto',
    category: 'Categoria',
    staple: 'È essenziale',
    stapleHint: 'Ti avviso prima che finisca: con «Sta finendo» va già nella lista.',
    countUnits: 'Conta le unità',
    countUnitsHint: 'Per pannolini, lattine o la roba nel freezer.',
    unit: 'Unità',
    lowAt: '«Sta finendo» con',
    confirmDelete: 'Sì, elimina',
    deleteProduct: 'Elimina prodotto',
  },

  add: {
    howManyNow: 'Quanti ce ne sono',
    titleNew: 'Nuovo prodotto',
    title: 'Aggiungi prodotto',
    linked: (name) => `Fatto: la prossima volta che lo scansioni, è ${name}.`,
    addedToList: (name) => `Ho aggiunto ${name} e va nella lista.`,
    added: (name) => `Ho aggiunto ${name}.`,
    foundOff: 'L’ho trovato su Open Food Facts. ',
    unknownCode: 'Non conosco questo codice. ',
    confirmOnce: 'Confermalo una volta sola: la prossima volta che lo scansioni, lo riconosco.',
    namePlaceholder: 'Es.: Caffè, Latte, Pannolini…',
    isOneOfThese: 'È uno di questi?',
    alreadyHave: 'Ce l’hai già?',
    anotherPhoto: 'Altra foto',
    photo: 'Foto',
    isExisting: (name) => `È ${name}`,
    viewExisting: (name) => `Vedi ${name}`,
  },

  quantity: {
    titles: {
      add: 'Quanti ne aggiungi?',
      remove: 'Quanti ne hai usati?',
      set: 'Quanti ce ne sono?',
      bought: 'Quanti ne hai comprati?',
      list: 'Quanti comprarne?',
    },
    modes: { add: 'Aggiungi', remove: 'Togli', set: 'Conta' },
    toastBuy: (name, n) => `${name}: comprarne ${n}.`,
    toastLeft: (name, quantity) => `${name}: restano ${quantity}.`,
    toastOk: (name) => `${name}: c’è.`,
    has: (quantity) => `ci sono ${quantity}`,
    oneLess: 'Uno in meno',
    oneMore: 'Uno in più',
    amount: 'Quantità',
  },

  ranOut: {
    title: 'È finito qualcosa?',
    searchPlaceholder: 'Cerca un prodotto…',
    scanEmpty: 'Scansiona la confezione vuota',
    frequent: 'Quelli che finiscono più spesso',
    alreadyInList: 'Già nella lista',
    addedOut: (name) => `${name}: finito. L’ho aggiunto alla lista.`,
    addToList: (name) => `Aggiungi «${name}» alla lista`,
    empty: 'Ancora nessun prodotto. Cercane uno per aggiungerlo.',
  },

  unitPicker: {
    other: 'Altra',
    placeholder: 'Al plurale, es.: pannolini, barattoli',
    use: 'Usa',
  },

  status: { label: 'Stato' },

  photo: {
    take: 'Scatta una foto',
    failed: 'Non sono riuscito a elaborare la foto. Provane un’altra.',
    cropping: 'Scontorno…',
  },

  codes: {
    title: 'Codici a barre',
    remove: (code) => `Rimuovi il codice ${code}`,
    removed: 'Ho tolto il codice. Se lo scansioni di nuovo, ti chiedo cos’è.',
  },
  merge: {
    open: 'Unisci a un altro prodotto',
    hint: 'Per due marche che sono la stessa cosa o un prodotto aggiunto due volte.',
    title: 'Unisci a un altro prodotto',
    search: 'Cerca l’altro prodotto…',
    pick: (name) => `Qual è la stessa cosa di ${name}?`,
    none: 'Nessun altro prodotto con quel nome.',
    confirmTitle: (keep) => `Resta ${keep}`,
    confirmBody: (duplicate, keep) =>
      `${duplicate} viene eliminato e diventa ${keep}: i codici a barre, lo storico, la lista e le ricette.`,
    confirm: 'Unisci',
    done: (duplicate, keep) => `Fatto: ${duplicate} ora è ${keep}.`,
  },
  house: {
    more: (n) => `Mostra altri ${n}`,
    less: 'Mostra meno',
    noPlace: 'Senza posto',
    low: (n) => `${n} in esaurimento`,
    out: (n) => `${n} finito`,
  },
};
