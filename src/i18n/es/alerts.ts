/** Textos de: avisos. */
export const alerts = {
  settings: {
    title: 'Avisos',
    hint: 'Te aviso en el iPhone antes de que algo se termine o venza. Se calcula en el teléfono.',
    enable: 'Activar avisos',
    enabled: 'Avisos activados',
    denied: 'iOS no dejó mandar avisos. Activalos en Ajustes del iPhone → Stoka → Notificaciones.',
    predicted: 'Lo que se está por terminar',
    predictedHint: 'Según cuánto le dura cada cosa a la casa.',
    expiry: 'Lo que vence pronto',
    expiryHint: 'Dos días antes de la fecha de vencimiento.',
    others: 'Lo que hacen los demás',
    othersHint: 'Mientras usás la app: «Sofía compró la leche».',
    webNote: 'En la web solo te muestro lo que hacen los demás mientras la app está abierta. Los avisos llegan en la app del iPhone.',
  },
  notif: {
    expiryTitle: 'Vence pronto',
    expiry: (name: string, days: number) =>
      days <= 0 ? `${name} vence hoy.` : days === 1 ? `${name} vence mañana.` : `${name} vence en ${days} días.`,
    predictedTitle: 'Se está por terminar',
    predicted: (name: string) => `Probablemente se termine ${name}. ¿Lo agregás a la lista?`,
  },
  others: {
    bought: (who: string, what: string) => `${who} compró ${what}.`,
    someone: 'Alguien',
  },
};
