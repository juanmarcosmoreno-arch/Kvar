/** Textos de: la estructura de la app (pestañas, acciones rápidas, avisos, demo, configuración y actualización). */
export const shell = {
  app: {
    joined: (household: string) => `Te uniste a ${household}.`,
    offlineFirstRun: 'Sin conexión. Abrí Stoka con internet la primera vez.',
  },
  nav: {
    label: 'Principal',
    home: 'Inicio',
    products: 'Productos',
    list: 'Lista',
    cook: 'Cocino',
    quickActions: 'Acciones rápidas',
  },
  actions: {
    title: '¿Qué hacemos?',
    ranOut: { title: 'Se terminó algo', hint: 'Un toque y va a la lista' },
    voice: { title: 'Decíselo', hint: '«Compré leche», «Se terminó el aceite», «¿Hay arroz?»' },
    scan: { title: 'Escanear', hint: 'Se terminó o lo compraste: elegís con un toque' },
    bought: { title: 'Volví del súper', hint: (ok: string) => `Escaneá lo que compraste y pasa a «${ok}»` },
    receipt: { title: 'Foto del ticket', hint: 'Cargo toda la compra de una vez' },
    add: { title: 'Agregar producto', hint: 'Solo el nombre; lo demás es opcional' },
  },
  demoBar: {
    label: 'Demo con datos de ejemplo',
    simulate: (name: string) => `${name} marca algo`,
    reset: 'Reiniciar',
    nothingToMark: (name: string, ok: string) => `No queda nada en «${ok}» para que ${name} marque.`,
    marked: (name: string, product: string, out: string) => `${name} marcó «${product}»: ${out}. Ya está en tu lista.`,
    resetDone: 'Volví a los datos de ejemplo.',
  },
  sync: {
    offlineHint: 'Sin conexión: los cambios se guardan y se envían al reconectar',
    sending: (n: number) => `Enviando ${n}…`,
    unsent: (n: number) => `${n} sin enviar`,
    offline: 'Sin conexión',
  },
  intro: {
    videoLabel: 'Stoka: la casa se llena de productos',
  },
  setup: {
    missing: {
      title: 'Falta configurar Supabase',
      body: 'En el archivo .env faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY.',
    },
    badUrl: {
      title: 'La dirección de Supabase no es válida',
      body: 'VITE_SUPABASE_URL tiene que ser la Project URL, por ejemplo https://abcdefgh.supabase.co (Project Settings → Data API).',
    },
    badKey: {
      title: 'La clave de Supabase no es válida',
      body: 'VITE_SUPABASE_ANON_KEY tiene que ser la Publishable key, que empieza con sb_publishable_ (Project Settings → API Keys).',
    },
    secretKey: {
      title: 'Pusiste la clave secreta',
      body: 'En VITE_SUPABASE_ANON_KEY va la Publishable key (sb_publishable_…), nunca la Secret key: da acceso total a la base. Cambiala y generá una Secret key nueva en Supabase por las dudas.',
    },
    current: (url: string) => `Ahora dice: ${url}`,
    empty: '(vacío)',
    /** «Corregí el archivo <code>.env</code> en la carpeta del proyecto y volvé a correr <code>npm run ios:sync</code>.» */
    fix: {
      before: 'Corregí el archivo ',
      middle: ' en la carpeta del proyecto y volvé a correr ',
      after: '.',
    },
  },
  update: {
    title: 'Actualizá Stoka',
    body: 'Hay una versión nueva que hace falta para seguir sincronizando con tu hogar. Tus datos están a salvo.',
    openAppStore: 'Abrir el App Store',
    searchAppStore: 'Buscá Stoka en el App Store y tocá «Actualizar».',
    updateNow: 'Actualizar ahora',
    versions: (current: string, minimum: string) => `Tenés la ${current} · se necesita la ${minimum} o más nueva`,
  },
};
