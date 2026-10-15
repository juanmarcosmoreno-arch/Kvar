import type { Messages } from '../es';

export const shell: Messages['shell'] = {
  app: {
    joined: (household) => `You joined ${household}.`,
    offlineFirstRun: 'No connection. Open Stoka with internet the first time.',
  },
  nav: {
    label: 'Main',
    home: 'Home',
    products: 'Products',
    list: 'List',
    cook: 'Cook',
    quickActions: 'Quick actions',
  },
  actions: {
    title: 'What do you need?',
    ranOut: { title: 'Something ran out', hint: 'One tap and it goes on the list' },
    voice: { title: 'Just say it', hint: '“I bought milk”, “We’re out of oil”, “Is there rice?”' },
    scan: { title: 'Scan', hint: 'Ran out or just bought: pick with one tap' },
    bought: { title: 'Back from the store', hint: (ok) => `Scan what you bought and it moves to “${ok}”` },
    receipt: { title: 'Receipt photo', hint: 'I’ll add the whole shop at once' },
    add: { title: 'Add product', hint: 'Just the name; the rest is optional' },
  },
  demoBar: {
    label: 'Demo with sample data',
    simulate: (name) => `${name} marks something`,
    reset: 'Reset',
    nothingToMark: (name, ok) => `Nothing left in “${ok}” for ${name} to mark.`,
    marked: (name, product, out) => `${name} marked “${product}”: ${out}. It’s on your list now.`,
    resetDone: 'Back to the sample data.',
  },
  sync: {
    offlineHint: 'Offline: changes are saved and sent when you reconnect',
    sending: (n) => `Sending ${n}…`,
    unsent: (n) => `${n} not sent`,
    offline: 'Offline',
  },
  intro: {
    videoLabel: 'Stoka: the house fills up with groceries',
  },
  setup: {
    missing: {
      title: 'Supabase isn’t set up',
      body: 'VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing from the .env file.',
    },
    badUrl: {
      title: 'The Supabase URL isn’t valid',
      body: 'VITE_SUPABASE_URL must be the Project URL, for example https://abcdefgh.supabase.co (Project Settings → Data API).',
    },
    badKey: {
      title: 'The Supabase key isn’t valid',
      body: 'VITE_SUPABASE_ANON_KEY must be the Publishable key, which starts with sb_publishable_ (Project Settings → API Keys).',
    },
    secretKey: {
      title: 'You used the secret key',
      body: 'VITE_SUPABASE_ANON_KEY takes the Publishable key (sb_publishable_…), never the Secret key: it gives full access to the database. Change it, and generate a new Secret key in Supabase just in case.',
    },
    current: (url) => `It currently says: ${url}`,
    empty: '(empty)',
    fix: {
      before: 'Fix the ',
      middle: ' file in the project folder and run ',
      after: ' again.',
    },
  },
  update: {
    title: 'Update Stoka',
    body: 'A new version is needed to keep syncing with your household. Your data is safe.',
    openAppStore: 'Open the App Store',
    searchAppStore: 'Find Stoka in the App Store and tap “Update”.',
    updateNow: 'Update now',
    versions: (current, minimum) => `You have ${current} · ${minimum} or newer is required`,
  },
};
