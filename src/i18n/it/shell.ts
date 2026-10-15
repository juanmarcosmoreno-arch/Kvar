import type { Messages } from '../es';

export const shell: Messages['shell'] = {
  app: {
    joined: (household) => `Sei entrato in ${household}.`,
    offlineFirstRun: 'Nessuna connessione. Apri Stoka con internet la prima volta.',
  },
  nav: {
    label: 'Principale',
    home: 'Home',
    products: 'Prodotti',
    list: 'Lista',
    cook: 'Cucina',
    quickActions: 'Azioni rapide',
  },
  actions: {
    title: 'Cosa facciamo?',
    ranOut: { title: 'È finito qualcosa', hint: 'Un tocco e va nella lista' },
    voice: { title: 'Dillo a voce', hint: '«Ho comprato il latte», «È finito l’olio», «C’è riso?»' },
    scan: { title: 'Scansiona', hint: 'Finito o comprato: scegli con un tocco' },
    bought: { title: 'Sono tornato dalla spesa', hint: (ok) => `Scansiona quello che hai comprato e passa a «${ok}»` },
    receipt: { title: 'Foto dello scontrino', hint: 'Registro tutta la spesa in un colpo' },
    add: { title: 'Aggiungi prodotto', hint: 'Solo il nome; il resto è facoltativo' },
  },
  demoBar: {
    label: 'Demo con dati di esempio',
    simulate: (name) => `${name} segna qualcosa`,
    reset: 'Ricomincia',
    nothingToMark: (name, ok) => `Non è rimasto niente in «${ok}» da far segnare a ${name}.`,
    marked: (name, product, out) => `${name} ha segnato «${product}»: ${out}. È già nella tua lista.`,
    resetDone: 'Sono tornato ai dati di esempio.',
  },
  sync: {
    offlineHint: 'Offline: le modifiche vengono salvate e inviate quando torni online',
    sending: (n) => `Invio di ${n}…`,
    unsent: (n) => `${n} da inviare`,
    offline: 'Offline',
  },
  intro: {
    videoLabel: 'Stoka: la casa si riempie di prodotti',
  },
  setup: {
    missing: {
      title: 'Supabase non è configurato',
      body: 'Nel file .env mancano VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY.',
    },
    badUrl: {
      title: 'L’indirizzo di Supabase non è valido',
      body: 'VITE_SUPABASE_URL deve essere la Project URL, per esempio https://abcdefgh.supabase.co (Project Settings → Data API).',
    },
    badKey: {
      title: 'La chiave di Supabase non è valida',
      body: 'VITE_SUPABASE_ANON_KEY deve essere la Publishable key, che inizia con sb_publishable_ (Project Settings → API Keys).',
    },
    secretKey: {
      title: 'Hai messo la chiave segreta',
      body: 'In VITE_SUPABASE_ANON_KEY va la Publishable key (sb_publishable_…), mai la Secret key: dà accesso totale al database. Cambiala e genera una nuova Secret key in Supabase per sicurezza.',
    },
    current: (url) => `Ora contiene: ${url}`,
    empty: '(vuoto)',
    fix: {
      before: 'Correggi il file ',
      middle: ' nella cartella del progetto ed esegui di nuovo ',
      after: '.',
    },
  },
  update: {
    title: 'Aggiorna Stoka',
    body: 'Serve una nuova versione per continuare a sincronizzare con la tua casa. I tuoi dati sono al sicuro.',
    openAppStore: 'Apri l’App Store',
    searchAppStore: 'Cerca Stoka nell’App Store e tocca «Aggiorna».',
    updateNow: 'Aggiorna ora',
    versions: (current, minimum) => `Hai la ${current} · serve la ${minimum} o successiva`,
  },
};
