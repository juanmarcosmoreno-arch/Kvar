import type { Messages } from '../es';

export const importer: Messages['importer'] = {
  title: 'Importar de um link',
  urlLabel: 'Link da receita',
  urlPlaceholder: 'Cole o link da receita',
  import: 'Importar',
  reading: 'Lendo a receita…',
  done: 'Pronto: confira os ingredientes e salve.',
  pasteToggle: 'Ou cole o texto da receita',
  pasteLabel: 'Cole a receita',
  pastePlaceholder: 'Macarrão ao sugo\nIngredientes\n400 g de macarrão\n1 lata de tomate pelado\nModo de preparo\n1. Refogue a cebola…',
  useText: 'Usar este texto',
  errors: {
    invalidUrl: 'Esse link não parece válido.',
    webBlocked: 'Na versão web não dá para ler esse link; cole o texto da receita.',
    network: 'Não consegui conectar. Verifique a conexão e tente de novo.',
    http: 'A página não respondeu. Tente de novo mais tarde.',
    notRecipe: 'Não encontrei uma receita nessa página. Você pode colar o texto.',
    textNotRecipe: 'Não encontrei ingredientes nesse texto. Coloque um por linha.',
  },
};
