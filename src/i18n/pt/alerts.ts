import type { Messages } from '../es';

export const alerts: Messages['alerts'] = {
  settings: {
    title: 'Avisos',
    hint: 'Aviso no iPhone antes que algo acabe ou vença. O cálculo é feito no celular.',
    enable: 'Ativar avisos',
    enabled: 'Avisos ativados',
    denied: 'O iOS não deixou enviar avisos. Ative em Ajustes do iPhone → Stoka → Notificações.',
    predicted: 'O que está acabando',
    predictedHint: 'Pelo quanto cada coisa dura na casa.',
    expiry: 'O que vence logo',
    expiryHint: 'Dois dias antes da data de validade.',
    others: 'O que os outros fazem',
    othersHint: 'Enquanto você usa o app: “Sofía comprou o leite”.',
    webNote: 'Na web só mostro o que os outros fazem enquanto o app está aberto. Os avisos chegam no app do iPhone.',
  },
  notif: {
    expiryTitle: 'Vence logo',
    expiry: (name, days) =>
      days <= 0 ? `${name} vence hoje.` : days === 1 ? `${name} vence amanhã.` : `${name} vence em ${days} dias.`,
    predictedTitle: 'Está acabando',
    predicted: (name) => `${name} provavelmente vai acabar. Quer adicionar à lista?`,
  },
  others: {
    bought: (who, what) => `${who} comprou ${what}.`,
    someone: 'Alguém',
  },
};
