import type { Messages } from '../es';

export const shell: Messages['shell'] = {
  app: {
    joined: (household) => `Você entrou em ${household}.`,
    offlineFirstRun: 'Sem conexão. Abra o Stoka com internet na primeira vez.',
  },
  nav: {
    label: 'Principal',
    home: 'Início',
    products: 'Produtos',
    list: 'Lista',
    cook: 'Cozinhar',
    quickActions: 'Ações rápidas',
  },
  actions: {
    title: 'O que vamos fazer?',
    ranOut: { title: 'Algo acabou', hint: 'Um toque e vai para a lista' },
    voice: { title: 'Fale', hint: '“Comprei leite”, “Acabou o óleo”, “Tem arroz?”' },
    scan: { title: 'Escanear', hint: 'Acabou ou você comprou: escolha com um toque' },
    bought: { title: 'Voltei do mercado', hint: (ok) => `Escaneie o que comprou e passa para “${ok}”` },
    receipt: { title: 'Foto do cupom', hint: 'Registro a compra toda de uma vez' },
    add: { title: 'Adicionar produto', hint: 'Só o nome; o resto é opcional' },
  },
  demoBar: {
    label: 'Demo com dados de exemplo',
    simulate: (name) => `${name} marca algo`,
    reset: 'Reiniciar',
    nothingToMark: (name, ok) => `Não sobrou nada em “${ok}” para ${name} marcar.`,
    marked: (name, product, out) => `${name} marcou “${product}”: ${out}. Já está na sua lista.`,
    resetDone: 'Voltei aos dados de exemplo.',
  },
  sync: {
    offlineHint: 'Sem conexão: as alterações são salvas e enviadas quando reconectar',
    sending: (n) => `Enviando ${n}…`,
    unsent: (n) => `${n} não enviados`,
    offline: 'Sem conexão',
  },
  intro: {
    videoLabel: 'Stoka: a casa se enche de produtos',
  },
  setup: {
    missing: {
      title: 'Falta configurar o Supabase',
      body: 'No arquivo .env faltam VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY.',
    },
    badUrl: {
      title: 'O endereço do Supabase não é válido',
      body: 'VITE_SUPABASE_URL precisa ser a Project URL, por exemplo https://abcdefgh.supabase.co (Project Settings → Data API).',
    },
    badKey: {
      title: 'A chave do Supabase não é válida',
      body: 'VITE_SUPABASE_ANON_KEY precisa ser a Publishable key, que começa com sb_publishable_ (Project Settings → API Keys).',
    },
    secretKey: {
      title: 'Você usou a chave secreta',
      body: 'Em VITE_SUPABASE_ANON_KEY vai a Publishable key (sb_publishable_…), nunca a Secret key: ela dá acesso total ao banco. Troque e gere uma Secret key nova no Supabase por precaução.',
    },
    current: (url) => `Agora diz: ${url}`,
    empty: '(vazio)',
    fix: {
      before: 'Corrija o arquivo ',
      middle: ' na pasta do projeto e rode de novo ',
      after: '.',
    },
  },
  update: {
    title: 'Atualize o Stoka',
    body: 'Há uma versão nova necessária para continuar sincronizando com sua casa. Seus dados estão seguros.',
    openAppStore: 'Abrir a App Store',
    searchAppStore: 'Procure o Stoka na App Store e toque em “Atualizar”.',
    updateNow: 'Atualizar agora',
    versions: (current, minimum) => `Você tem a ${current} · é preciso a ${minimum} ou mais nova`,
  },
};
