import type { Messages } from '../es';

export const shopping: Messages['shopping'] = {
  suggested: (n) => `× ${n}?`,
  useSuggested: (n, name) => `${name} × ${n}（いつも買う量）`,
  suggestedHint: '「?」付きの数はいつも買う量です。タップすると使えます。',
  imShopping: 'スーパーにいます',
  stopShopping: 'スーパーを出ました',
  meShoppingBanner: 'スーパーにいます。ほかの人が追加したものがすぐに表示されます。',
  othersShopping: (names) => `${names}がスーパーにいます。追加したものはすぐに相手に表示されます。`,
  othersShoppingMany: (names) => `${names}がスーパーにいます。追加したものはすぐにみんなに表示されます。`,
  addedByOthers: (what) => `${what}がリストに追加されました。`,
  share: {
    button: '共有',
    label: 'リストを共有',
    title: (household) => `買い物リスト · ${household}`,
    footer: 'Stokaから送信',
    copied: 'リストをコピーしました。好きな場所に貼り付けてください。',
    whatsapp: 'WhatsApp',
    copy: 'コピー',
  },
};
