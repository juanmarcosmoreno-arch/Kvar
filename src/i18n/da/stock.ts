import { isOne } from '..';
import type { Messages } from '../es';

export const stock: Messages['stock'] = {
  home: {
    settings: 'Indstillinger',
    searchPlaceholder: 'Søg efter et produkt…',
    voice: 'Sig det med stemmen',
    scan: 'Scan en stregkode',
    addNamed: (name) => `Tilføj “${name}”`,
    ranOutTitle: 'Er noget løbet tør?',
    ranOutHint: 'Tryk, så kommer det direkte på listen',
    restock: 'Skal købes igen',
    viewList: (n) => `Se listen (${n})`,
    allGoodTitle: 'Alt er i orden',
    allGoodHint: 'Når noget er ved at slippe op eller er sluppet op, vises det her.',
    emptyTitle: 'Start med at tilføje det, du har',
    emptyHint: 'Med knappen + tilføjer du dine produkter ét ad gangen, kun med navnet.',
    addProduct: 'Tilføj produkt',
    expiringSoon: 'Udløber snart',
  },

  expiry: (days) => {
    if (days < 0) return days === -1 ? 'Udløb i går' : `Udløb for ${-days} ${isOne(-days) ? 'dag' : 'dage'} siden`;
    if (days === 0) return 'Udløber i dag';
    if (days === 1) return 'Udløber i morgen';
    return `Udløber om ${days} ${isOne(days) ? 'dag' : 'dage'}`;
  },

  inventory: {
    viewList: 'Liste',
    viewHouse: 'Huset',
    title: 'Produkter',
    addProduct: 'Tilføj produkt',
    searchPlaceholder: 'Søg…',
    filterAll: 'Alle',
    filterStaple: 'Basisvarer',
    noMatchTitle: 'Intet med disse filtre',
    noMatchHint: 'Prøv at fjerne et filter.',
    emptyTitle: 'Ingen produkter endnu',
    emptyHint: 'Tilføj det, du har derhjemme; du skal kun bruge navnet.',
    swipeHint: 'Swipe til venstre for “ved at slippe op”, til højre for “Er der”.',
  },

  list: {
    title: 'Indkøbsliste',
    reasons: {
      recipe: 'Til en opskrift',
      plan: 'Ugeplan',
      predicted: 'Er nok ved at slippe op',
    },
    boughtNowOk: (name) => `${name}: købt, er der nu.`,
    bought: (name) => `${name}: købt.`,
    backFromStore: 'Hjemme fra butikken',
    receipt: 'Kvittering',
    addPlaceholder: 'Tilføj til listen…',
    emptyTitle: 'Der mangler ikke noget',
    emptyHint: 'Når du markerer, at noget er sluppet op, dukker det op her af sig selv.',
    markBought: (name) => `Markér ${name} som købt`,
    howMany: (name) => `Hvor mange ${name} skal købes`,
    remove: (name) => `Fjern ${name} fra listen`,
    checkedTitle: 'Købt',
    clear: 'Ryd',
    uncheck: (name) => `Fjern markering af ${name}`,
  },

  row: {
    staple: 'Basisvare',
    unidentified: 'Ikke identificeret',
    minusOne: (name) => `Fjern én ${name} (hold nede for at vælge antal)`,
    plusOne: (name) => `Tilføj én ${name} (hold nede for at vælge antal)`,
    chooseAmount: (unitPlural, name) => `Vælg hvor mange ${unitPlural} ${name}`,
    changeStatus: (name) => `Skift status for ${name}`,
  },

  product: {
    changePhoto: 'Skift foto',
    noCutoutNative: 'Kunne ikke skille produktet fra baggrunden, så hele fotoet blev gemt.',
    noCutoutWeb: 'Fotoet er gemt. Fjernelse af baggrund findes i iPhone-appen.',
    anotherBarcode: 'En kode mere',
    linkBarcode: 'Tilknyt kode',
    minusOne: 'Fjern én',
    plusOne: 'Tilføj én',
    tapForMany: 'tryk for at tilføje eller fjerne flere',
    addedToList: (name) => `${name} er tilføjet til listen.`,
    addToList: 'Tilføj til listen',
    inList: 'Står på indkøbslisten',
    buyN: (n) => `Køb ${n}`,
    howManyToBuy: 'Hvor mange skal købes',
    name: 'Navn',
    location: 'Sted',
    category: 'Kategori',
    staple: 'Det er en basisvare',
    stapleHint: 'Jeg giver besked, før den slipper op: ved “Næsten tom” kommer den allerede på listen.',
    countUnits: 'Tæl antal',
    countUnitsHint: 'Til bleer, dåser eller det i fryseren.',
    unit: 'Enhed',
    lowAt: '“Næsten tom” ved',
    confirmDelete: 'Ja, slet',
    deleteProduct: 'Slet produkt',
  },

  add: {
    howManyNow: 'Hvor mange nu',
    titleNew: 'Nyt produkt',
    title: 'Tilføj produkt',
    linked: (name) => `Færdig: næste gang du scanner den, er det ${name}.`,
    addedToList: (name) => `${name} er tilføjet og kommer på listen.`,
    added: (name) => `${name} er tilføjet.`,
    foundOff: 'Fandt den på Open Food Facts. ',
    unknownCode: 'Jeg kender ikke denne kode. ',
    confirmOnce: 'Bekræft det bare én gang: næste gang du scanner den, genkender jeg den.',
    namePlaceholder: 'F.eks. Kaffe, Mælk, Bleer…',
    isOneOfThese: 'Er det en af disse?',
    alreadyHave: 'Har du den allerede?',
    anotherPhoto: 'Et foto mere',
    photo: 'Foto',
    isExisting: (name) => `Det er ${name}`,
    viewExisting: (name) => `Se ${name}`,
  },

  quantity: {
    titles: {
      add: 'Hvor mange tilføjer du?',
      remove: 'Hvor mange brugte du?',
      set: 'Hvor mange er der?',
      bought: 'Hvor mange købte du?',
      list: 'Hvor mange skal købes?',
    },
    modes: { add: 'Tilføj', remove: 'Fjern', set: 'Tæl' },
    toastBuy: (name, n) => `${name}: køb ${n}.`,
    toastLeft: (name, quantity) => `${name}: ${quantity} tilbage.`,
    toastOk: (name) => `${name}: er der.`,
    has: (quantity) => `${quantity} hjemme`,
    oneLess: 'Én mindre',
    oneMore: 'Én mere',
    amount: 'Antal',
  },

  ranOut: {
    title: 'Er noget løbet tør?',
    searchPlaceholder: 'Søg efter et produkt…',
    scanEmpty: 'Scan den tomme emballage',
    frequent: 'Dem, der oftest slipper op',
    alreadyInList: 'Står allerede på listen',
    addedOut: (name) => `${name}: sluppet op. Tilføjet til listen.`,
    addToList: (name) => `Tilføj “${name}” til listen`,
    empty: 'Ingen produkter endnu. Søg efter et for at tilføje det.',
  },

  unitPicker: {
    other: 'Anden',
    placeholder: 'I flertal, f.eks. bleer, glas',
    use: 'Brug',
  },

  status: { label: 'Status' },

  photo: {
    take: 'Tag et foto',
    failed: 'Kunne ikke behandle fotoet. Prøv et andet.',
    cropping: 'Beskærer…',
  },

  codes: {
    title: 'Stregkoder',
    remove: (code) => `Fjern koden ${code}`,
    removed: 'Jeg har fjernet koden. Hvis du scanner den igen, spørger jeg, hvad det er.',
  },
  merge: {
    open: 'Slå sammen med et andet produkt',
    hint: 'Til to mærker, der er det samme, eller et produkt, der er tilføjet to gange.',
    title: 'Slå sammen med et andet produkt',
    search: 'Søg efter det andet produkt…',
    pick: (name) => `Hvilket er det samme som ${name}?`,
    none: 'Der er ikke noget andet produkt med det navn.',
    confirmTitle: (keep) => `${keep} bliver`,
    confirmBody: (duplicate, keep) =>
      `${duplicate} slettes og bliver til ${keep}: stregkoder, historik, listen og opskrifterne.`,
    confirm: 'Slå sammen',
    done: (duplicate, keep) => `Færdig: ${duplicate} er nu ${keep}.`,
  },
  house: {
    noPlace: 'Intet sted',
    low: (n) => `${n} næsten tom`,
    out: (n) => `${n} tom`,
  },
};
