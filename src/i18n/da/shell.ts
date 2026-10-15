import type { Messages } from '../es';

export const shell: Messages['shell'] = {
  app: {
    joined: (household) => `Du er nu med i ${household}.`,
    offlineFirstRun: 'Ingen forbindelse. Åbn Stoka med internet første gang.',
  },
  nav: {
    label: 'Hovedmenu',
    home: 'Hjem',
    products: 'Varer',
    list: 'Liste',
    cook: 'Lav mad',
    quickActions: 'Hurtige handlinger',
  },
  actions: {
    title: 'Hvad skal vi?',
    ranOut: { title: 'Noget er sluppet op', hint: 'Ét tryk, så kommer det på listen' },
    voice: { title: 'Sig det', hint: '”Jeg har købt mælk”, ”Olien er sluppet op”, ”Er der ris?”' },
    scan: { title: 'Scan', hint: 'Sluppet op eller købt: vælg med ét tryk' },
    bought: { title: 'Hjemme fra indkøb', hint: (ok) => `Scan det, du har købt, så flyttes det til ”${ok}”` },
    receipt: { title: 'Foto af kvitteringen', hint: 'Jeg lægger hele indkøbet ind på én gang' },
    add: { title: 'Tilføj vare', hint: 'Kun navnet; resten er valgfrit' },
  },
  demoBar: {
    label: 'Demo med eksempeldata',
    simulate: (name) => `${name} markerer noget`,
    reset: 'Nulstil',
    nothingToMark: (name, ok) => `Der er intet tilbage under ”${ok}”, som ${name} kan markere.`,
    marked: (name, product, out) => `${name} markerede ”${product}”: ${out}. Det står allerede på din liste.`,
    resetDone: 'Tilbage til eksempeldataene.',
  },
  sync: {
    offlineHint: 'Offline: ændringerne gemmes og sendes, når du er online igen',
    sending: (n) => `Sender ${n}…`,
    unsent: (n) => `${n} ikke sendt`,
    offline: 'Offline',
  },
  intro: {
    videoLabel: 'Stoka: huset fyldes med varer',
  },
  setup: {
    missing: {
      title: 'Supabase er ikke sat op',
      body: 'VITE_SUPABASE_URL eller VITE_SUPABASE_ANON_KEY mangler i .env-filen.',
    },
    badUrl: {
      title: 'Supabase-adressen er ugyldig',
      body: 'VITE_SUPABASE_URL skal være Project URL, for eksempel https://abcdefgh.supabase.co (Project Settings → Data API).',
    },
    badKey: {
      title: 'Supabase-nøglen er ugyldig',
      body: 'VITE_SUPABASE_ANON_KEY skal være Publishable key, som starter med sb_publishable_ (Project Settings → API Keys).',
    },
    secretKey: {
      title: 'Du har brugt den hemmelige nøgle',
      body: 'I VITE_SUPABASE_ANON_KEY skal der stå Publishable key (sb_publishable_…), aldrig Secret key: den giver fuld adgang til databasen. Skift den ud, og lav en ny Secret key i Supabase for en sikkerheds skyld.',
    },
    current: (url) => `Der står nu: ${url}`,
    empty: '(tom)',
    fix: {
      before: 'Ret filen ',
      middle: ' i projektmappen, og kør ',
      after: ' igen.',
    },
  },
  update: {
    title: 'Opdater Stoka',
    body: 'Der kræves en ny version for at blive ved med at synkronisere med din husstand. Dine data er i sikkerhed.',
    openAppStore: 'Åbn App Store',
    searchAppStore: 'Søg efter Stoka i App Store, og tryk på ”Opdater”.',
    updateNow: 'Opdater nu',
    versions: (current, minimum) => `Du har ${current} · ${minimum} eller nyere kræves`,
  },
};
