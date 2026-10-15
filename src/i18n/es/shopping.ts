/** Textos de: lista (cantidad sugerida, «estoy en el súper», compartir). */
export const shopping = {
  suggested: (n: number) => `× ${n}?`,
  useSuggested: (n: number, name: string) => `Llevar ${n} de ${name} (lo que solés comprar)`,
  suggestedHint: 'Los números con «?» son lo que solés llevar. Tocá uno para usarlo.',
  imShopping: 'Estoy en el súper',
  stopShopping: 'Ya salí del súper',
  meShoppingBanner: 'Estás en el súper: lo que agreguen los demás te aparece al instante.',
  othersShopping: (names: string) => `${names} está en el súper. Lo que agregues le aparece al instante.`,
  othersShoppingMany: (names: string) => `${names} están en el súper. Lo que agregues les aparece al instante.`,
  addedByOthers: (what: string) => `Agregaron ${what} a la lista.`,
  share: {
    button: 'Compartir',
    label: 'Compartir la lista',
    title: (household: string) => `Lista de compras · ${household}`,
    footer: 'Enviado desde Stoka',
    copied: 'Copié la lista. Pegala donde quieras.',
    whatsapp: 'WhatsApp',
    copy: 'Copiar',
  },
};
