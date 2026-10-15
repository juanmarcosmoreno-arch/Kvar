import type { Messages } from '../es';

export const shell: Messages['shell'] = {
  app: {
    joined: (household) => `Du gick med i ${household}.`,
    offlineFirstRun: 'Ingen anslutning. Öppna Stoka med internet första gången.',
  },
  nav: {
    label: 'Huvudmeny',
    home: 'Hem',
    products: 'Produkter',
    list: 'Lista',
    cook: 'Laga',
    quickActions: 'Snabbåtgärder',
  },
  actions: {
    title: 'Vad ska vi göra?',
    ranOut: { title: 'Något tog slut', hint: 'Ett tryck så hamnar det på listan' },
    voice: { title: 'Säg det', hint: '”Jag köpte mjölk”, ”Oljan är slut”, ”Finns det ris?”' },
    scan: { title: 'Skanna', hint: 'Slut eller köpt: välj med ett tryck' },
    bought: { title: 'Hemma från affären', hint: (ok) => `Skanna det du köpt så flyttas det till ”${ok}”` },
    receipt: { title: 'Foto på kvittot', hint: 'Jag lägger in hela inköpet på en gång' },
    add: { title: 'Lägg till produkt', hint: 'Bara namnet; resten är valfritt' },
  },
  demoBar: {
    label: 'Demo med exempeldata',
    simulate: (name) => `${name} markerar något`,
    reset: 'Återställ',
    nothingToMark: (name, ok) => `Det finns inget kvar under ”${ok}” för ${name} att markera.`,
    marked: (name, product, out) => `${name} markerade ”${product}”: ${out}. Det står redan på din lista.`,
    resetDone: 'Tillbaka till exempeldatan.',
  },
  sync: {
    offlineHint: 'Offline: ändringarna sparas och skickas när du är ansluten igen',
    sending: (n) => `Skickar ${n}…`,
    unsent: (n) => `${n} ej skickade`,
    offline: 'Offline',
  },
  intro: {
    videoLabel: 'Stoka: huset fylls med varor',
  },
  setup: {
    missing: {
      title: 'Supabase är inte konfigurerat',
      body: 'VITE_SUPABASE_URL eller VITE_SUPABASE_ANON_KEY saknas i .env-filen.',
    },
    badUrl: {
      title: 'Supabase-adressen är ogiltig',
      body: 'VITE_SUPABASE_URL ska vara Project URL, till exempel https://abcdefgh.supabase.co (Project Settings → Data API).',
    },
    badKey: {
      title: 'Supabase-nyckeln är ogiltig',
      body: 'VITE_SUPABASE_ANON_KEY ska vara Publishable key, som börjar med sb_publishable_ (Project Settings → API Keys).',
    },
    secretKey: {
      title: 'Du har angett den hemliga nyckeln',
      body: 'I VITE_SUPABASE_ANON_KEY ska Publishable key stå (sb_publishable_…), aldrig Secret key: den ger full åtkomst till databasen. Byt ut den och skapa en ny Secret key i Supabase för säkerhets skull.',
    },
    current: (url) => `Nu står det: ${url}`,
    empty: '(tomt)',
    fix: {
      before: 'Rätta filen ',
      middle: ' i projektmappen och kör ',
      after: ' igen.',
    },
  },
  update: {
    title: 'Uppdatera Stoka',
    body: 'Det behövs en ny version för att fortsätta synka med ditt hushåll. Dina data är säkra.',
    openAppStore: 'Öppna App Store',
    searchAppStore: 'Sök efter Stoka i App Store och tryck på ”Uppdatera”.',
    updateNow: 'Uppdatera nu',
    versions: (current, minimum) => `Du har ${current} · ${minimum} eller senare krävs`,
  },
};
