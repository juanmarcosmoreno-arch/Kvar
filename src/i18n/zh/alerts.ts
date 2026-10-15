import type { Messages } from '../es';

export const alerts: Messages['alerts'] = {
  settings: {
    title: '提醒',
    hint: '在东西用完或过期之前，在 iPhone 上提醒你。计算在手机上完成。',
    enable: '开启提醒',
    enabled: '提醒已开启',
    denied: 'iOS 不允许发送提醒。请在 iPhone 的“设置”→ Stoka →“通知”中开启。',
    predicted: '快用完的东西',
    predictedHint: '根据每样东西在家里能用多久。',
    expiry: '快过期的东西',
    expiryHint: '在过期日前两天提醒。',
    others: '其他人的动态',
    othersHint: '使用 App 时：“Sofía 买了牛奶”。',
    webNote: '在网页上，只有 App 打开时才会显示其他人的动态。提醒会发送到 iPhone App。',
  },
  notif: {
    expiryTitle: '快过期了',
    expiry: (name, days) =>
      days <= 0 ? `${name}今天过期。` : days === 1 ? `${name}明天过期。` : `${name} ${days} 天后过期。`,
    predictedTitle: '快用完了',
    predicted: (name) => `${name}可能快用完了。要加入清单吗？`,
  },
  others: {
    bought: (who, what) => `${who}买了${what}。`,
    someone: '有人',
  },
};
