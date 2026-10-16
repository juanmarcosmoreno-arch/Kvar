import type { Messages } from '../es';

export const stock: Messages['stock'] = {
  home: {
    settings: '設定',
    searchPlaceholder: '商品を検索…',
    voice: '音声で伝える',
    scan: 'バーコードをスキャン',
    addNamed: (name) => `「${name}」を追加`,
    ranOutTitle: '何か切れましたか？',
    ranOutHint: 'タップするとすぐリストに入ります',
    restock: '補充するもの',
    viewList: (n) => `リストを見る（${n}）`,
    allGoodTitle: 'すべてそろっています',
    allGoodHint: '残り少なくなったり切れたりすると、ここに表示されます。',
    emptyTitle: 'まずは家にあるものを追加しましょう',
    emptyHint: '＋ボタンで商品を1つずつ追加できます。名前だけでOKです。',
    addProduct: '商品を追加',
    expiringSoon: 'もうすぐ期限',
  },

  expiry: (days) => {
    if (days < 0) return days === -1 ? '昨日期限切れ' : `${-days}日前に期限切れ`;
    if (days === 0) return '今日が期限';
    if (days === 1) return '明日が期限';
    return `あと${days}日で期限`;
  },

  inventory: {
    viewList: 'リスト',
    viewHouse: 'おうち',
    title: '商品',
    addProduct: '商品を追加',
    searchPlaceholder: '検索…',
    filterAll: 'すべて',
    filterStaple: '定番',
    noMatchTitle: 'この条件に合う商品はありません',
    noMatchHint: 'フィルタを外してみてください。',
    emptyTitle: 'まだ商品がありません',
    emptyHint: '家にあるものを追加しましょう。名前だけでOKです。',
    swipeHint: '左にスワイプで「残り少ない」、右にスワイプで「あり」。',
  },

  list: {
    title: '買い物リスト',
    reasons: {
      recipe: 'レシピ用',
      plan: '週間プラン',
      predicted: 'そろそろ切れそう',
    },
    boughtNowOk: (name) => `${name}：購入済み、「あり」にしました。`,
    bought: (name) => `${name}：購入済み。`,
    backFromStore: '買い物から帰った',
    receipt: 'レシート',
    addPlaceholder: 'リストに追加…',
    emptyTitle: '足りないものはありません',
    emptyHint: '「なし」にしたものは自動でここに表示されます。',
    markBought: (name) => `${name}を購入済みにする`,
    howMany: (name) => `${name}を買う数`,
    remove: (name) => `${name}をリストから削除`,
    checkedTitle: '購入済み',
    clear: 'クリア',
    uncheck: (name) => `${name}のチェックを外す`,
  },

  row: {
    staple: '定番',
    unidentified: '未確認',
    minusOne: (name) => `${name}を1つ減らす（長押しで数を選択）`,
    plusOne: (name) => `${name}を1つ増やす（長押しで数を選択）`,
    chooseAmount: (unitPlural, name) => `${name}の数（${unitPlural}）を選ぶ`,
    changeStatus: (name) => `${name}の状態を変更`,
  },

  product: {
    changePhoto: '写真を変更',
    noCutoutNative: '背景から商品を切り抜けなかったため、写真全体を保存しました。',
    noCutoutWeb: '写真を保存しました。背景の切り抜きはiPhoneアプリで使えます。',
    anotherBarcode: '別のバーコード',
    linkBarcode: 'バーコードを登録',
    minusOne: '1つ減らす',
    plusOne: '1つ増やす',
    tapForMany: 'タップでまとめて増減',
    addedToList: (name) => `${name}をリストに追加しました。`,
    addToList: 'リストに追加',
    inList: '買い物リストに入っています',
    buyN: (n) => `${n}個買う`,
    howManyToBuy: '買う数',
    name: '名前',
    location: '場所',
    category: 'カテゴリ',
    staple: '定番商品',
    stapleHint: '切れる前にお知らせします。「残り少ない」でリストに入ります。',
    countUnits: '数を数える',
    countUnitsHint: 'おむつや缶詰、冷凍庫のものに。',
    unit: '単位',
    lowAt: '「残り少ない」にする数',
    confirmDelete: '削除する',
    deleteProduct: '商品を削除',
  },

  add: {
    howManyNow: '今の数',
    titleNew: '新しい商品',
    title: '商品を追加',
    linked: (name) => `完了：次回スキャンすると${name}になります。`,
    addedToList: (name) => `${name}を追加し、リストに入れました。`,
    added: (name) => `${name}を追加しました。`,
    foundOff: 'Open Food Factsで見つかりました。',
    unknownCode: 'このバーコードは未登録です。',
    confirmOnce: '一度確認すれば、次回のスキャンで認識します。',
    namePlaceholder: '例：コーヒー、牛乳、おむつ…',
    isOneOfThese: 'この中にありますか？',
    alreadyHave: 'すでに登録済みですか？',
    anotherPhoto: '別の写真',
    photo: '写真',
    isExisting: (name) => `${name}です`,
    viewExisting: (name) => `${name}を見る`,
  },

  quantity: {
    titles: {
      add: 'いくつ追加しますか？',
      remove: 'いくつ使いましたか？',
      set: 'いくつありますか？',
      bought: 'いくつ買いましたか？',
      list: 'いくつ買いますか？',
    },
    modes: { add: '追加', remove: '減らす', set: '数える' },
    toastBuy: (name, n) => `${name}：${n}個買う。`,
    toastLeft: (name, quantity) => `${name}：残り${quantity}。`,
    toastOk: (name) => `${name}：あり。`,
    has: (quantity) => `${quantity}あり`,
    oneLess: '1つ減らす',
    oneMore: '1つ増やす',
    amount: '数量',
  },

  ranOut: {
    title: '何か切れましたか？',
    searchPlaceholder: '商品を検索…',
    scanEmpty: '空の容器をスキャン',
    frequent: 'よく切れるもの',
    alreadyInList: 'リストに追加済み',
    addedOut: (name) => `${name}：なし。リストに追加しました。`,
    addToList: (name) => `「${name}」をリストに追加`,
    empty: 'まだ商品がありません。検索して追加しましょう。',
  },

  unitPicker: {
    other: 'その他',
    placeholder: '例：枚、瓶',
    use: '使う',
  },

  status: { label: '状態' },

  photo: {
    take: '写真を撮る',
    failed: '写真を処理できませんでした。別の写真でお試しください。',
    cropping: '切り抜き中…',
  },

  codes: {
    title: 'バーコード',
    remove: (code) => `バーコード ${code} を削除`,
    removed: 'バーコードを削除しました。もう一度スキャンすると、何か確認します。',
  },
  merge: {
    open: 'ほかの商品とまとめる',
    hint: '同じものの別ブランドや、二重に登録した商品に。',
    title: 'ほかの商品とまとめる',
    search: 'もう一方の商品を検索…',
    pick: (name) => `${name}と同じものはどれですか？`,
    none: 'その名前の商品はほかにありません。',
    confirmTitle: (keep) => `${keep}を残します`,
    confirmBody: (duplicate, keep) =>
      `${duplicate}は削除され、${keep}になります。バーコード、履歴、リスト、レシピも移ります。`,
    confirm: 'まとめる',
    done: (duplicate, keep) => `完了：${duplicate}は${keep}になりました。`,
  },
  house: {
    noPlace: '場所なし',
    low: (n) => `残り少ない ${n}`,
    out: (n) => `なし ${n}`,
  },
};
