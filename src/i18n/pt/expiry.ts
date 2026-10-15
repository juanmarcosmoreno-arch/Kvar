import { isOne } from '..';
import type { Messages } from '../es';

export const expiry: Messages['expiry'] = {
  title: 'Validade',
  none: 'Sem data',
  set: 'Definir data',
  clear: 'Remover a data de validade',
  dateLabel: 'Data de validade',
  inDays: (days) =>
    days < 0 ? (days === -1 ? 'venceu ontem' : `venceu há ${-days} ${isOne(-days) ? 'dia' : 'dias'}`)
      : days === 0 ? 'vence hoje' : days === 1 ? 'vence amanhã' : `vence em ${days} ${isOne(days) ? 'dia' : 'dias'}`,
  fromPhoto: 'Ler da foto',
  reading: 'Lendo a data…',
  found: (date) => `Li ${date}. É essa?`,
  confirm: 'Sim, salvar',
  change: 'Não, vou digitar',
  notFound: 'Não encontrei uma data na foto. Digite à mão.',
  failed: 'Não consegui ler a foto. Tente de novo ou digite à mão.',
  saved: (date) => `Vence em ${date}.`,
};
