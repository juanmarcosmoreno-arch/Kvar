import { isOne } from '..';
import type { Messages } from '../es';

export const stock: Messages['stock'] = {
  home: {
    settings: 'Ajustes',
    searchPlaceholder: 'Buscar um produto…',
    voice: 'Fale por voz',
    scan: 'Escanear um código de barras',
    addNamed: (name) => `Adicionar “${name}”`,
    ranOutTitle: 'Acabou alguma coisa?',
    ranOutHint: 'Toque e vai direto para a lista',
    restock: 'Para repor',
    viewList: (n) => `Ver lista (${n})`,
    allGoodTitle: 'Está tudo em ordem',
    allGoodHint: 'Quando algo estiver acabando ou acabar, aparece aqui.',
    emptyTitle: 'Comece adicionando o que você tem',
    emptyHint: 'Com o botão + você cadastra seus produtos um por um, só com o nome.',
    addProduct: 'Adicionar produto',
    expiringSoon: 'Vence em breve',
  },

  expiry: (days) => {
    if (days < 0) return days === -1 ? 'Venceu ontem' : `Venceu há ${-days} ${isOne(-days) ? 'dia' : 'dias'}`;
    if (days === 0) return 'Vence hoje';
    if (days === 1) return 'Vence amanhã';
    return `Vence em ${days} ${isOne(days) ? 'dia' : 'dias'}`;
  },

  inventory: {
    viewList: 'Lista',
    viewHouse: 'Casa',
    title: 'Produtos',
    addProduct: 'Adicionar produto',
    searchPlaceholder: 'Buscar…',
    filterAll: 'Todos',
    filterStaple: 'Básicos',
    noMatchTitle: 'Nada com esses filtros',
    noMatchHint: 'Tente remover algum filtro.',
    emptyTitle: 'Ainda não há produtos',
    emptyHint: 'Adicione o que você tem em casa; só precisa do nome.',
    swipeHint: 'Deslize para a esquerda para “está acabando” e para a direita para “Tem”.',
  },

  list: {
    title: 'Lista de compras',
    reasons: {
      recipe: 'Para uma receita',
      plan: 'Plano semanal',
      predicted: 'Deve estar acabando',
    },
    boughtNowOk: (name) => `${name}: comprado, agora tem.`,
    bought: (name) => `${name}: comprado.`,
    backFromStore: 'Voltei do mercado',
    receipt: 'Cupom',
    addPlaceholder: 'Adicionar à lista…',
    emptyTitle: 'Não falta nada',
    emptyHint: 'Quando você marcar que algo acabou, aparece aqui sozinho.',
    markBought: (name) => `Marcar ${name} como comprado`,
    howMany: (name) => `Quantos comprar de ${name}`,
    remove: (name) => `Tirar ${name} da lista`,
    checkedTitle: 'Comprado',
    clear: 'Limpar',
    uncheck: (name) => `Desmarcar ${name}`,
  },

  row: {
    staple: 'Básico',
    unidentified: 'Não identificado',
    minusOne: (name) => `Tirar um de ${name} (segure para escolher quantos)`,
    plusOne: (name) => `Somar um de ${name} (segure para escolher quantos)`,
    chooseAmount: (unitPlural, name) => `Escolher quantos ${unitPlural} de ${name}`,
    changeStatus: (name) => `Mudar o estado de ${name}`,
  },

  product: {
    changePhoto: 'Trocar foto',
    noCutoutNative: 'Não consegui separar o produto do fundo: salvei a foto inteira.',
    noCutoutWeb: 'Foto salva. O recorte sem fundo está no app para iPhone.',
    anotherBarcode: 'Outro código',
    linkBarcode: 'Vincular código',
    minusOne: 'Tirar um',
    plusOne: 'Somar um',
    tapForMany: 'toque para somar ou tirar vários',
    addedToList: (name) => `Adicionei ${name} à lista.`,
    addToList: 'Adicionar à lista',
    inList: 'Está na lista de compras',
    buyN: (n) => `Comprar ${n}`,
    howManyToBuy: 'Quantos comprar',
    name: 'Nome',
    location: 'Lugar',
    category: 'Categoria',
    staple: 'É um básico',
    stapleHint: 'Aviso antes que acabe: com “Está acabando” já vai para a lista.',
    countUnits: 'Contar unidades',
    countUnitsHint: 'Para fraldas, latas ou o que está no freezer.',
    unit: 'Unidade',
    lowAt: '“Está acabando” com',
    confirmDelete: 'Sim, apagar',
    deleteProduct: 'Apagar produto',
  },

  add: {
    howManyNow: 'Quantos tem agora',
    titleNew: 'Produto novo',
    title: 'Adicionar produto',
    linked: (name) => `Pronto: da próxima vez que você escanear, é ${name}.`,
    addedToList: (name) => `Adicionei ${name} e vai para a lista.`,
    added: (name) => `Adicionei ${name}.`,
    foundOff: 'Encontrei no Open Food Facts. ',
    unknownCode: 'Não conheço este código. ',
    confirmOnce: 'Confirme só uma vez: da próxima vez que você escanear, eu reconheço.',
    namePlaceholder: 'Ex.: Café, Leite, Fraldas…',
    isOneOfThese: 'É algum destes?',
    alreadyHave: 'Você já tem?',
    anotherPhoto: 'Outra foto',
    photo: 'Foto',
    isExisting: (name) => `É ${name}`,
    viewExisting: (name) => `Ver ${name}`,
  },

  quantity: {
    titles: {
      add: 'Quantos somar?',
      remove: 'Quantos você usou?',
      set: 'Quantos tem?',
      bought: 'Quantos você comprou?',
      list: 'Quantos comprar?',
    },
    modes: { add: 'Somar', remove: 'Tirar', set: 'Contar' },
    toastBuy: (name, n) => `${name}: comprar ${n}.`,
    toastLeft: (name, quantity) => `${name}: restam ${quantity}.`,
    toastOk: (name) => `${name}: tem.`,
    has: (quantity) => `tem ${quantity}`,
    oneLess: 'Um a menos',
    oneMore: 'Um a mais',
    amount: 'Quantidade',
  },

  ranOut: {
    title: 'Acabou alguma coisa?',
    searchPlaceholder: 'Busque um produto…',
    scanEmpty: 'Escaneie a embalagem vazia',
    frequent: 'Os que mais acabam',
    alreadyInList: 'Já está na lista',
    addedOut: (name) => `${name}: acabou. Adicionei à lista.`,
    addToList: (name) => `Adicionar “${name}” à lista`,
    empty: 'Ainda não há produtos. Busque um para adicioná-lo.',
  },

  unitPicker: {
    other: 'Outra',
    placeholder: 'No plural, ex.: fraldas, potes',
    use: 'Usar',
  },

  status: { label: 'Estado' },

  photo: {
    take: 'Tire uma foto',
    failed: 'Não consegui processar a foto. Tente outra.',
    cropping: 'Recortando…',
  },

  codes: {
    title: 'Códigos de barras',
    remove: (code) => `Remover o código ${code}`,
    removed: 'Removi o código. Se você escanear de novo, eu pergunto o que é.',
  },
  merge: {
    open: 'Juntar com outro produto',
    hint: 'Para duas marcas que são a mesma coisa ou um produto cadastrado duas vezes.',
    title: 'Juntar com outro produto',
    search: 'Buscar o outro produto…',
    pick: (name) => `Qual é a mesma coisa que ${name}?`,
    none: 'Não há outro produto com esse nome.',
    confirmTitle: (keep) => `Fica ${keep}`,
    confirmBody: (duplicate, keep) =>
      `${duplicate} é apagado e passa a ser ${keep}: os códigos de barras, o histórico, a lista e as receitas.`,
    confirm: 'Juntar',
    done: (duplicate, keep) => `Pronto: ${duplicate} agora é ${keep}.`,
  },
  house: {
    noPlace: 'Sem lugar',
    low: (n) => `${n} acabando`,
    out: (n) => `${n} acabou`,
  },
};
