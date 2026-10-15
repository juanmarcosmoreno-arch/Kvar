/** Inicio, productos, lista de compras y las hojas de producto. */
export const stock = {
  home: {
    settings: 'Ajustes',
    searchPlaceholder: 'Buscar un producto…',
    voice: 'Decíselo por voz',
    scan: 'Escanear un código de barras',
    addNamed: (name: string) => `Agregar «${name}»`,
    ranOutTitle: '¿Se terminó algo?',
    ranOutHint: 'Tocalo y va directo a la lista',
    restock: 'Para reponer',
    viewList: (n: number) => `Ver lista (${n})`,
    allGoodTitle: 'Está todo en orden',
    allGoodHint: 'Cuando algo quede poco o se termine, aparece acá.',
    emptyTitle: 'Empezá agregando lo que hay',
    emptyHint: 'Con el botón + cargás tus productos de a uno, solo con el nombre.',
    addProduct: 'Agregar producto',
    expiringSoon: 'Vence pronto',
  },

  /** Vencimiento relativo: días que faltan (negativo = ya venció) */
  expiry: (days: number) => {
    if (days < 0) return days === -1 ? 'Venció ayer' : `Venció hace ${-days} días`;
    if (days === 0) return 'Vence hoy';
    if (days === 1) return 'Vence mañana';
    return `Vence en ${days} días`;
  },

  inventory: {
    title: 'Productos',
    addProduct: 'Agregar producto',
    searchPlaceholder: 'Buscar…',
    filterAll: 'Todos',
    filterStaple: 'Básicos',
    noMatchTitle: 'Nada con estos filtros',
    noMatchHint: 'Probá sacando algún filtro.',
    emptyTitle: 'Todavía no hay productos',
    emptyHint: 'Agregá lo que tenés en casa; solo hace falta el nombre.',
    swipeHint: 'Deslizá a la izquierda para «se está terminando», a la derecha para «Hay».',
  },

  list: {
    title: 'Lista de compras',
    reasons: {
      recipe: 'Para una receta',
      plan: 'Plan semanal',
      predicted: 'Se estaría terminando',
    },
    boughtNowOk: (name: string) => `${name}: comprado, ahora Hay.`,
    bought: (name: string) => `${name}: comprado.`,
    backFromStore: 'Volví del súper',
    receipt: 'Ticket',
    addPlaceholder: 'Agregar a la lista…',
    emptyTitle: 'No falta nada',
    emptyHint: 'Cuando marques que algo no hay, aparece acá solo.',
    markBought: (name: string) => `Marcar ${name} como comprado`,
    howMany: (name: string) => `Cuántos comprar de ${name}`,
    remove: (name: string) => `Quitar ${name} de la lista`,
    checkedTitle: 'Comprado',
    clear: 'Limpiar',
    uncheck: (name: string) => `Desmarcar ${name}`,
  },

  row: {
    staple: 'Básico',
    unidentified: 'Sin identificar',
    minusOne: (name: string) => `Restar uno de ${name} (mantené apretado para elegir cuántos)`,
    plusOne: (name: string) => `Sumar uno de ${name} (mantené apretado para elegir cuántos)`,
    chooseAmount: (unitPlural: string, name: string) => `Elegir cuántos ${unitPlural} de ${name}`,
    changeStatus: (name: string) => `Cambiar estado de ${name}`,
  },

  product: {
    changePhoto: 'Cambiar foto',
    noCutoutNative: 'No pude separar el producto del fondo: guardé la foto entera.',
    noCutoutWeb: 'Guardé la foto. El recorte sin fondo está en la app de iPhone.',
    anotherBarcode: 'Otro código',
    linkBarcode: 'Vincular código',
    minusOne: 'Restar uno',
    plusOne: 'Sumar uno',
    tapForMany: 'tocá para sumar o restar varios',
    addedToList: (name: string) => `Agregué ${name} a la lista.`,
    addToList: 'Agregar a la lista',
    inList: 'Está en la lista de compras',
    buyN: (n: number) => `Comprar ${n}`,
    howManyToBuy: 'Cuántos comprar',
    name: 'Nombre',
    location: 'Lugar',
    category: 'Categoría',
    staple: 'Es un básico',
    stapleHint: 'Te aviso antes de que se termine: con «Queda poco» ya va a la lista.',
    countUnits: 'Contar unidades',
    countUnitsHint: 'Para pañales, latas o lo del freezer.',
    unit: 'Unidad',
    lowAt: '«Queda poco» con',
    confirmDelete: 'Sí, borrar',
    deleteProduct: 'Borrar producto',
  },

  add: {
    titleNew: 'Producto nuevo',
    title: 'Agregar producto',
    linked: (name: string) => `Listo: la próxima vez que lo escanees, es ${name}.`,
    addedToList: (name: string) => `Agregué ${name} y va a la lista.`,
    added: (name: string) => `Agregué ${name}.`,
    foundOff: 'Lo encontré en Open Food Facts. ',
    unknownCode: 'No conozco este código. ',
    confirmOnce: 'Confirmalo una sola vez: la próxima vez que lo escanees, lo reconozco.',
    namePlaceholder: 'Ej: Yerba, Leche, Pañales…',
    isOneOfThese: '¿Es alguno de estos?',
    alreadyHave: '¿Ya lo tenés?',
    anotherPhoto: 'Otra foto',
    photo: 'Foto',
    isExisting: (name: string) => `Es ${name}`,
    viewExisting: (name: string) => `Ver ${name}`,
  },

  quantity: {
    titles: {
      add: '¿Cuántos sumás?',
      remove: '¿Cuántos usaste?',
      set: '¿Cuántos hay?',
      bought: '¿Cuántos compraste?',
      list: '¿Cuántos comprar?',
    },
    modes: { add: 'Sumar', remove: 'Restar', set: 'Contar' },
    toastBuy: (name: string, n: number) => `${name}: comprar ${n}.`,
    toastLeft: (name: string, quantity: string) => `${name}: quedan ${quantity}.`,
    toastOk: (name: string) => `${name}: Hay.`,
    has: (quantity: string) => `hay ${quantity}`,
    oneLess: 'Uno menos',
    oneMore: 'Uno más',
    amount: 'Cantidad',
  },

  ranOut: {
    title: '¿Se terminó algo?',
    searchPlaceholder: 'Buscá un producto…',
    scanEmpty: 'Escaneá el envase vacío',
    frequent: 'Los que más se terminan',
    alreadyInList: 'Ya está en la lista',
    addedOut: (name: string) => `${name}: No hay. Lo agregué a la lista.`,
    addToList: (name: string) => `Agregar «${name}» a la lista`,
    empty: 'Todavía no hay productos. Buscá uno para agregarlo.',
  },

  unitPicker: {
    other: 'Otra',
    placeholder: 'En plural, ej: pañales, tarros',
    use: 'Usar',
  },

  status: { label: 'Estado' },

  photo: {
    take: 'Sacale una foto',
    failed: 'No pude procesar la foto. Probá con otra.',
    cropping: 'Recortando…',
  },

  /** Códigos de barras de un producto y «Unir con otro producto» */
  codes: {
    title: 'Códigos de barras',
    remove: (code: string) => `Quitar el código ${code}`,
    removed: 'Saqué el código. Si lo volvés a escanear, te pregunto qué es.',
  },
  merge: {
    open: 'Unir con otro producto',
    hint: 'Para dos marcas que son lo mismo o un producto cargado dos veces.',
    title: 'Unir con otro producto',
    search: 'Buscar el otro producto…',
    pick: (name: string) => `¿Cuál es lo mismo que ${name}?`,
    none: 'No hay otro producto con ese nombre.',
    confirmTitle: (keep: string) => `Queda ${keep}`,
    confirmBody: (duplicate: string, keep: string) =>
      `${duplicate} se borra y pasa a ser ${keep}: sus códigos de barras, su historial, la lista y las recetas.`,
    confirm: 'Unir',
    done: (duplicate: string, keep: string) => `Listo: ${duplicate} ahora es ${keep}.`,
  },
};
