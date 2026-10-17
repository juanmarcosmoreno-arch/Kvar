import type { Messages } from '../es';

export const alerts: Messages['alerts'] = {
  settings: {
    title: '通知',
    hint: 'なくなる前や期限が切れる前に、iPhoneでお知らせします。計算は端末内で行います。',
    enable: '通知をオンにする',
    enabled: '通知はオンです',
    denied: 'iOSで通知が許可されていません。iPhoneの「設定」→ Stoka →「通知」でオンにしてください。',
    predicted: 'もうすぐなくなるもの',
    predictedHint: 'それぞれが家でどれくらいもつかをもとにします。',
    expiry: '期限が近いもの',
    expiryHint: '期限の2日前にお知らせします。',
    phone: 'iPhoneで',
    inApp: 'アプリの使用中',
    prices: '価格アラート',
    pricesHint: '気になる商品が値下がりしたりセールになったとき（価格 → アラート）。',
    others: 'ほかの人の動き',
    othersHint: '「Sofíaが牛乳を買いました」',
    shoppers: '誰かがお店にいるとき',
    shoppersHint: '「Sofíaがお店にいます」：リストに追加したものがすぐに届きます。',
    webNote: 'Webでは、アプリを開いている間だけほかの人の動きを表示します。通知はiPhoneアプリに届きます。',
  },
  notif: {
    expiryTitle: '期限が近づいています',
    expiry: (name, days) =>
      days <= 0 ? `${name}は今日が期限です。` : days === 1 ? `${name}は明日が期限です。` : `${name}はあと${days}日で期限です。`,
    predictedTitle: '残り少ない',
    predicted: (name) => `${name}がそろそろなくなりそうです。リストに追加しますか？`,
  },
  others: {
    bought: (who, what) => `${who}が${what}を買いました。`,
    someone: '誰か',
    shopping: (who) => `${who}がお店にいます。`,
  },
};
