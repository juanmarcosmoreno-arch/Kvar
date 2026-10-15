/** Textos compartidos por toda la app. */
export const common = {
  appName: 'Stoka',
  status: { ok: 'Hay', low: 'Queda poco', out: 'No hay' },
  save: 'Guardar',
  cancel: 'Cancelar',
  done: 'Listo',
  undo: 'Deshacer',
  delete: 'Borrar',
  confirmDelete: '¿Borrar?',
  close: 'Cerrar',
  back: 'Volver',
  add: 'Agregar',
  edit: 'Editar',
  retry: 'Reintentar',
  more: 'Más',
  less: 'Menos',
  optional: 'opcional',
  people: (n: number) => `${n} ${n === 1 ? 'persona' : 'personas'}`,
  minutes: (n: number) => `${n} min`,
  hoursMinutes: (h: number, min: number) => (min ? `${h} h ${min} min` : `${h} h`),

  /**
   * Unidades del catálogo para productos con conteo. La clave es lo que se guarda en la base
   * (siempre en español, para que el hogar se entienda aunque cada uno use otro idioma).
   */
  units: {
    unidades: ['unidad', 'unidades'],
    paquetes: ['paquete', 'paquetes'],
    latas: ['lata', 'latas'],
    botellas: ['botella', 'botellas'],
    cajas: ['caja', 'cajas'],
    frascos: ['frasco', 'frascos'],
    sachets: ['sachet', 'sachets'],
    bolsas: ['bolsa', 'bolsas'],
    sobres: ['sobre', 'sobres'],
    rollos: ['rollo', 'rollos'],
    packs: ['pack', 'packs'],
    docenas: ['docena', 'docenas'],
    tabletas: ['tableta', 'tabletas'],
    'cápsulas': ['cápsula', 'cápsulas'],
    potes: ['pote', 'potes'],
    bandejas: ['bandeja', 'bandejas'],
  } as Record<string, [string, string]>,

  /** Unidades de cocina de las recetas (singular, plural). «u» no se muestra. */
  kitchenUnits: {
    g: ['g', 'g'],
    kg: ['kg', 'kg'],
    ml: ['ml', 'ml'],
    l: ['l', 'l'],
    dl: ['dl', 'dl'],
    taza: ['taza', 'tazas'],
    cda: ['cucharada', 'cucharadas'],
    cdita: ['cucharadita', 'cucharaditas'],
    diente: ['diente', 'dientes'],
    feta: ['feta', 'fetas'],
    rebanada: ['rebanada', 'rebanadas'],
    lata: ['lata', 'latas'],
    sobre: ['sobre', 'sobres'],
    cubo: ['cubo', 'cubos'],
    frasco: ['frasco', 'frascos'],
    pote: ['pote', 'potes'],
    paquete: ['paquete', 'paquetes'],
    atado: ['atado', 'atados'],
    u: ['', ''],
  } as Record<string, [string, string]>,

  /** Cantidades que no se escalan */
  amounts: {
    'a gusto': 'a gusto',
    'una pizca': 'una pizca',
    'un chorrito': 'un chorrito',
    'un poco': 'un poco',
    'unas gotas': 'unas gotas',
    'un puñado': 'un puñado',
    'para freír': 'para freír',
    'para servir': 'para servir',
    'para decorar': 'para decorar',
    'para untar': 'para untar',
    'para espolvorear': 'para espolvorear',
  } as Record<string, string>,

  /** Cómo se escribe un ingrediente (al editar una receta) */
  ingredient: {
    withUnit: (amount: string, name: string) => `${amount} de ${name}`,
    count: (n: string, name: string) => `${n} ${name}`,
    leading: (amount: string, name: string) => `${amount} de ${name}`,
    trailing: (name: string, amount: string) => `${name} ${amount}`,
    optional: (text: string) => `${text} (opcional)`,
  },

  noCategory: 'Sin categoría',
  forRecipe: (title: string) => `Para ${title}`,
  forRecipeAmount: (amount: string, title: string) => `${amount} · para ${title}`,
  meals: { almuerzo: 'Almuerzo', cena: 'Cena', vianda: 'Vianda', dulce: 'Dulce' },
  constraints: { sin_horno: 'Sin horno', una_olla: 'Una sola olla' },

  /** Lo que se crea con cada hogar nuevo (la base lo crea en español; si el idioma es otro, se renombra) */
  seeds: {
    locations: { fridge: 'Heladera', snow: 'Freezer', shelf: 'Alacena', drop: 'Baño', spark: 'Limpieza' },
    categories: {
      produce: 'Frutas y verduras',
      bakery: 'Panadería',
      meat: 'Carnes y pescados',
      dairy: 'Lácteos y huevos',
      pantry: 'Almacén',
      frozen: 'Congelados',
      drinks: 'Bebidas',
      cleaning: 'Limpieza',
      hygiene: 'Higiene',
      baby: 'Bebé',
      pets: 'Mascotas',
      other: 'Otros',
    },
  },

  language: {
    title: 'Idioma',
    auto: 'El del teléfono',
    hint: 'Stoka usa el idioma del teléfono. Podés elegir otro.',
  },
};
