import type { Messages } from '../es';

export const expiry: Messages['expiry'] = {
  title: '期限',
  none: '日付なし',
  set: '日付を設定',
  clear: '期限の日付を削除',
  dateLabel: '期限日',
  inDays: (days) =>
    days < 0 ? (days === -1 ? '昨日期限切れ' : `${-days}日前に期限切れ`)
      : days === 0 ? '今日が期限' : days === 1 ? '明日が期限' : `あと${days}日で期限`,
  fromPhoto: '写真から読み取る',
  reading: '日付を読み取っています…',
  found: (date) => `${date}と読み取りました。合っていますか？`,
  confirm: 'はい、保存',
  change: 'いいえ、入力します',
  notFound: '写真に日付が見つかりませんでした。手入力してください。',
  failed: '写真を読み取れませんでした。もう一度試すか、手入力してください。',
  saved: (date) => `期限は${date}です。`,
};
