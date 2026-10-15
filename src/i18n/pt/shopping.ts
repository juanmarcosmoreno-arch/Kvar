import type { Messages } from '../es';

export const shopping: Messages['shopping'] = {
  suggested: (n) => `× ${n}?`,
  useSuggested: (n, name) => `Levar ${n} de ${name} (o que você costuma comprar)`,
  suggestedHint: 'Os números com “?” são o que você costuma levar. Toque em um para usar.',
  imShopping: 'Estou no mercado',
  stopShopping: 'Já saí do mercado',
  meShoppingBanner: 'Você está no mercado: o que os outros adicionarem aparece na hora.',
  othersShopping: (names) => `${names} está no mercado e vê na hora o que você adicionar.`,
  othersShoppingMany: (names) => `${names} estão no mercado e veem na hora o que você adicionar.`,
  addedByOthers: (what) => `Adicionaram ${what} à lista.`,
  share: {
    button: 'Compartilhar',
    label: 'Compartilhar a lista',
    title: (household) => `Lista de compras · ${household}`,
    footer: 'Enviado pelo Stoka',
    copied: 'Copiei a lista. Cole onde quiser.',
    whatsapp: 'WhatsApp',
    copy: 'Copiar',
  },
};
