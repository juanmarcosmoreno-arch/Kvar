import type { Messages } from '../es';
import { isOne } from '..';

export const plan: Messages['plan'] = {
  title: 'Cardápio da semana',
  make: 'Monte meu cardápio da semana',
  hint: 'Com o que tem: primeiro o que vence e o que não precisa de compras.',
  days: 'Dias',
  meal: 'Refeição',
  build: 'Montar o cardápio',
  rebuild: 'Montar de novo',
  swap: (title) => `Trocar ${title} por outra receita`,
  save: 'Salvar o cardápio',
  saved: 'Salvei o cardápio. A casa toda vê.',
  edit: 'Mudar o cardápio',
  addMissing: (n) => `Adicionar o que falta à lista (${n})`,
  added: (n) => (isOne(n) ? `Adicionei ${n} coisa à lista.` : `Adicionei ${n} coisas à lista.`),
  allInList: 'O que falta já estava na lista.',
  nothingMissing: 'Você tem tudo para este cardápio.',
  missingNote: 'Para o cardápio da semana',
  empty: 'Não encontrei receitas para esses dias. Tente outra refeição ou adicione receitas da casa.',
  today: 'Hoje',
  deleted: '(não existe mais)',
};
