import type { Messages } from '../es';

export const expiry: Messages['expiry'] = {
  title: '保质期',
  none: '无日期',
  set: '设置日期',
  clear: '删除过期日期',
  dateLabel: '过期日期',
  inDays: (days) =>
    days < 0 ? (days === -1 ? '昨天已过期' : `已过期 ${-days} 天`)
      : days === 0 ? '今天过期' : days === 1 ? '明天过期' : `${days} 天后过期`,
  fromPhoto: '从照片读取',
  reading: '正在读取日期…',
  found: (date) => `读取到 ${date}，对吗？`,
  confirm: '对，保存',
  change: '不对，手动输入',
  notFound: '照片中未找到日期，请手动输入。',
  failed: '无法读取照片，请重试或手动输入。',
  saved: (date) => `${date} 过期。`,
};
