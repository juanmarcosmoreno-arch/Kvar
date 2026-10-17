/** Textos de: avisos de las acciones y la sincronización, y el hogar de ejemplo de la demo. */
export const store = {
  toasts: {
    statusOut: (product: string, out: string) => `${product}: ${out}. Lo agregué a la lista.`,
    status: (product: string, status: string) => `${product}: ${status}`,
    deleted: (name: string) => `Borré ${name}.`,
    surplusAdded: (name: string) => `Ojo: de ${name} hay de sobra en casa.`,
    recipeDismissed: (title: string) => `Listo, no te propongo ${title} por un tiempo.`,
    syncRejected: 'No se pudo guardar un cambio. Se actualizó con lo último del hogar.',
  },

  /** Hogar de ejemplo del modo demo (ubicaciones y categorías salen de common.seeds) */
  demo: {
    household: 'Casa',
    me: 'Vos',
    partner: 'Sofía',
    products: {
      milk: 'Leche',
      yerba: 'Yerba',
      tomato: 'Tomate',
      pasta: 'Fideos',
      sunflowerOil: 'Aceite de girasol',
      diapers: 'Pañales',
      bread: 'Pan',
      detergent: 'Detergente',
      eggs: 'Huevos',
      rice: 'Arroz',
      gratedCheese: 'Queso rallado',
      coffee: 'Café',
      toiletPaper: 'Papel higiénico',
      milanesas: 'Milanesas',
      apples: 'Manzanas',
      dogFood: 'Comida del perro',
      onion: 'Cebolla',
      potatoes: 'Papas',
      crushedTomatoes: 'Tomate triturado',
      butter: 'Manteca',
      groundBeef: 'Carne picada',
      ham: 'Jamón',
    },
    /** Unidad de los productos con conteo (texto libre o una clave de common.units) */
    units: { diapers: 'pañales', eggs: 'huevos' },
    listItem: 'Velas de cumpleaños',
    recipe: {
      title: 'Tuco de la abuela',
      steps: 'Dorá la carne con la cebolla.\nSumá el tomate y una hoja de laurel.\nCociná a fuego mínimo una hora y media.',
      /** Tienen que coincidir con los nombres de los productos */
      ingredients: {
        groundBeef: 'carne picada',
        crushedTomatoes: 'tomate triturado',
        onion: 'cebolla',
        pasta: 'fideos',
        salt: 'sal',
      },
    },
    codes: {
      milk: 'Leche (conocido)',
      pasta: 'Fideos (conocido)',
      newRice: 'Arroz Gallo Oro (nuevo)',
    },
  },
};
