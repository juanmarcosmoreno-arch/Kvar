/** Textos de: fecha de vencimiento (a mano o con la cámara). */
export const expiry = {
  title: 'Vencimiento',
  none: 'Sin fecha',
  set: 'Poner fecha',
  clear: 'Quitar la fecha de vencimiento',
  dateLabel: 'Fecha de vencimiento',
  inDays: (days: number) =>
    days < 0 ? (days === -1 ? 'venció ayer' : `venció hace ${-days} días`)
      : days === 0 ? 'vence hoy' : days === 1 ? 'vence mañana' : `vence en ${days} días`,
  fromPhoto: 'Leer de la foto',
  reading: 'Leyendo la fecha…',
  found: (date: string) => `Leí ${date}. ¿Es esa?`,
  confirm: 'Sí, guardar',
  change: 'No, la escribo',
  notFound: 'No encontré una fecha en la foto. Escribila a mano.',
  failed: 'No pude leer la foto. Probá de nuevo o escribila a mano.',
  saved: (date: string) => `Vence el ${date}.`,
};
