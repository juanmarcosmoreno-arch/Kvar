import { isOne } from '..';
import type { Messages } from '../es';

export const stock: Messages['stock'] = {
  home: {
    settings: 'Inställningar',
    searchPlaceholder: 'Sök efter en produkt…',
    voice: 'Säg det med rösten',
    scan: 'Skanna en streckkod',
    addNamed: (name) => `Lägg till ”${name}”`,
    ranOutTitle: 'Har något tagit slut?',
    ranOutHint: 'Tryck så hamnar det direkt på listan',
    restock: 'Att fylla på',
    viewList: (n) => `Visa listan (${n})`,
    allGoodTitle: 'Allt är i ordning',
    allGoodHint: 'När något börjar ta slut eller tar slut visas det här.',
    emptyTitle: 'Börja med att lägga till det du har',
    emptyHint: 'Med knappen + lägger du till dina produkter en i taget, bara med namnet.',
    addProduct: 'Lägg till produkt',
    expiringSoon: 'Går snart ut',
  },

  expiry: (days) => {
    if (days < 0) return days === -1 ? 'Gick ut i går' : `Gick ut för ${-days} ${isOne(-days) ? 'dag' : 'dagar'} sedan`;
    if (days === 0) return 'Går ut i dag';
    if (days === 1) return 'Går ut i morgon';
    return `Går ut om ${days} ${isOne(days) ? 'dag' : 'dagar'}`;
  },

  inventory: {
    viewList: 'Lista',
    viewHouse: 'Huset',
    title: 'Produkter',
    addProduct: 'Lägg till produkt',
    searchPlaceholder: 'Sök…',
    filterAll: 'Alla',
    filterStaple: 'Basvaror',
    noMatchTitle: 'Inget med de här filtren',
    noMatchHint: 'Prova att ta bort något filter.',
    emptyTitle: 'Inga produkter än',
    emptyHint: 'Lägg till det du har hemma; det räcker med namnet.',
    swipeHint: 'Svep åt vänster för ”håller på att ta slut”, åt höger för ”Finns”.',
  },

  list: {
    title: 'Inköpslista',
    reasons: {
      recipe: 'Till ett recept',
      plan: 'Veckoplan',
      predicted: 'Borde snart ta slut',
    },
    boughtNowOk: (name) => `${name}: köpt, finns nu.`,
    bought: (name) => `${name}: köpt.`,
    backFromStore: 'Hemma från affären',
    receipt: 'Kvitto',
    addPlaceholder: 'Lägg till på listan…',
    emptyTitle: 'Inget saknas',
    emptyHint: 'När du markerar att något är slut dyker det upp här av sig självt.',
    markBought: (name) => `Markera ${name} som köpt`,
    howMany: (name) => `Hur många ${name} ska köpas`,
    remove: (name) => `Ta bort ${name} från listan`,
    checkedTitle: 'Köpt',
    clear: 'Rensa',
    uncheck: (name) => `Avmarkera ${name}`,
  },

  row: {
    staple: 'Basvara',
    unidentified: 'Oidentifierad',
    minusOne: (name) => `Ta bort en ${name} (håll in för att välja antal)`,
    plusOne: (name) => `Lägg till en ${name} (håll in för att välja antal)`,
    chooseAmount: (unitPlural, name) => `Välj hur många ${unitPlural} ${name}`,
    changeStatus: (name) => `Ändra status för ${name}`,
  },

  product: {
    changePhoto: 'Byt foto',
    noCutoutNative: 'Kunde inte skilja produkten från bakgrunden, så hela fotot sparades.',
    noCutoutWeb: 'Fotot sparades. Bakgrundsborttagning finns i iPhone-appen.',
    anotherBarcode: 'En till kod',
    linkBarcode: 'Koppla kod',
    minusOne: 'Ta bort en',
    plusOne: 'Lägg till en',
    tapForMany: 'tryck för att lägga till eller ta bort flera',
    addedToList: (name) => `${name} har lagts till på listan.`,
    addToList: 'Lägg till på listan',
    inList: 'Finns på inköpslistan',
    buyN: (n) => `Köp ${n}`,
    howManyToBuy: 'Hur många att köpa',
    name: 'Namn',
    location: 'Plats',
    category: 'Kategori',
    staple: 'Det är en basvara',
    stapleHint: 'Jag säger till innan den tar slut: vid ”Snart slut” hamnar den redan på listan.',
    countUnits: 'Räkna antal',
    countUnitsHint: 'För blöjor, burkar eller sånt i frysen.',
    unit: 'Enhet',
    lowAt: '”Snart slut” vid',
    confirmDelete: 'Ja, ta bort',
    deleteProduct: 'Ta bort produkt',
  },

  add: {
    howManyNow: 'Hur många nu',
    titleNew: 'Ny produkt',
    title: 'Lägg till produkt',
    linked: (name) => `Klart: nästa gång du skannar den är det ${name}.`,
    addedToList: (name) => `${name} har lagts till och hamnar på listan.`,
    added: (name) => `${name} har lagts till.`,
    foundOff: 'Hittade den på Open Food Facts. ',
    unknownCode: 'Jag känner inte igen den här koden. ',
    confirmOnce: 'Bekräfta bara en gång: nästa gång du skannar den känner jag igen den.',
    namePlaceholder: 'T.ex. Kaffe, Mjölk, Blöjor…',
    isOneOfThese: 'Är det någon av de här?',
    alreadyHave: 'Har du den redan?',
    anotherPhoto: 'Ett till foto',
    photo: 'Foto',
    isExisting: (name) => `Det är ${name}`,
    viewExisting: (name) => `Visa ${name}`,
  },

  quantity: {
    titles: {
      add: 'Hur många lägger du till?',
      remove: 'Hur många använde du?',
      set: 'Hur många finns det?',
      bought: 'Hur många köpte du?',
      list: 'Hur många ska köpas?',
    },
    modes: { add: 'Lägg till', remove: 'Ta bort', set: 'Räkna' },
    toastBuy: (name, n) => `${name}: köp ${n}.`,
    toastLeft: (name, quantity) => `${name}: ${quantity} kvar.`,
    toastOk: (name) => `${name}: finns.`,
    has: (quantity) => `${quantity} hemma`,
    oneLess: 'En mindre',
    oneMore: 'En till',
    amount: 'Antal',
  },

  ranOut: {
    title: 'Har något tagit slut?',
    searchPlaceholder: 'Sök efter en produkt…',
    scanEmpty: 'Skanna den tomma förpackningen',
    frequent: 'De som tar slut oftast',
    alreadyInList: 'Redan på listan',
    addedOut: (name) => `${name}: slut. Lades till på listan.`,
    addToList: (name) => `Lägg till ”${name}” på listan`,
    empty: 'Inga produkter än. Sök efter en för att lägga till den.',
  },

  unitPicker: {
    other: 'Annan',
    placeholder: 'I plural, t.ex. blöjor, burkar',
    use: 'Använd',
  },

  status: { label: 'Status' },

  photo: {
    take: 'Ta ett foto',
    failed: 'Kunde inte bearbeta fotot. Prova ett annat.',
    cropping: 'Beskär…',
  },

  codes: {
    title: 'Streckkoder',
    remove: (code) => `Ta bort koden ${code}`,
    removed: 'Jag tog bort koden. Om du skannar den igen frågar jag vad det är.',
  },
  merge: {
    open: 'Slå ihop med en annan produkt',
    hint: 'För två märken som är samma sak, eller en produkt som lagts till två gånger.',
    title: 'Slå ihop med en annan produkt',
    search: 'Sök efter den andra produkten…',
    pick: (name) => `Vilken är samma sak som ${name}?`,
    none: 'Det finns ingen annan produkt med det namnet.',
    confirmTitle: (keep) => `${keep} blir kvar`,
    confirmBody: (duplicate, keep) =>
      `${duplicate} tas bort och blir ${keep}: streckkoder, historik, listan och recepten.`,
    confirm: 'Slå ihop',
    done: (duplicate, keep) => `Klart: ${duplicate} är nu ${keep}.`,
  },
  house: {
    more: (n) => `Visa ${n} till`,
    less: 'Visa färre',
    noPlace: 'Ingen plats',
    low: (n) => `${n} snart slut`,
    out: (n) => `${n} slut`,
  },
};
