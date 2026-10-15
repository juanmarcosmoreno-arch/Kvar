import type { Messages } from '../es';

export const shopping: Messages['shopping'] = {
  suggested: (n) => `× ${n}?`,
  useSuggested: (n, name) => `${name} 买 ${n}（你平时买的量）`,
  suggestedHint: '带“?”的数字是你平时买的量。点一下即可使用。',
  imShopping: '我在超市',
  stopShopping: '我已离开超市',
  meShoppingBanner: '你在超市：其他人添加的东西会立即显示。',
  othersShopping: (names) => `${names}在超市，你添加的东西对方会立即看到。`,
  othersShoppingMany: (names) => `${names}在超市，你添加的东西他们会立即看到。`,
  addedByOthers: (what) => `有人将${what}加入了清单。`,
  share: {
    button: '分享',
    label: '分享清单',
    title: (household) => `购物清单 · ${household}`,
    footer: '来自 Stoka',
    copied: '已复制清单，可以粘贴到任何地方。',
    whatsapp: 'WhatsApp',
    copy: '复制',
  },
};
