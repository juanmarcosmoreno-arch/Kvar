import type { Messages } from '../es';

export const plan: Messages['plan'] = {
  title: '今週の献立',
  make: '今週の献立を作って',
  hint: '今あるもので作ります。期限が近いものと、買い物がいらないものを優先します。',
  days: '日数',
  meal: '食事',
  build: '献立を作る',
  rebuild: '作り直す',
  swap: (title) => `${title}をほかのレシピに変更`,
  save: '献立を保存',
  saved: '献立を保存しました。家族全員が見られます。',
  edit: '献立を変更',
  addMissing: (n) => `足りないものをリストに追加（${n}）`,
  added: (n) => `${n}件をリストに追加しました。`,
  allInList: '足りないものはすでにリストに入っています。',
  nothingMissing: 'この献立の材料はそろっています。',
  missingNote: '今週の献立用',
  empty: 'その日に合うレシピが見つかりませんでした。ほかの食事を選ぶか、わが家のレシピを追加してください。',
  today: '今日',
  deleted: '（削除済み）',
};
