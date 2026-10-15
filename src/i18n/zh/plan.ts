import type { Messages } from '../es';

export const plan: Messages['plan'] = {
  title: '本周菜单',
  make: '帮我安排本周菜单',
  hint: '用现有的材料：优先用快过期的和不需要采购的。',
  days: '天数',
  meal: '餐次',
  build: '生成菜单',
  rebuild: '重新生成',
  swap: (title) => `把${title}换成其他菜谱`,
  save: '保存菜单',
  saved: '菜单已保存，全家都能看到。',
  edit: '修改菜单',
  addMissing: (n) => `将缺少的加入清单（${n}）`,
  added: (n) => `已将 ${n} 样东西加入清单。`,
  allInList: '缺少的已经在清单里了。',
  nothingMissing: '这份菜单的材料都齐了。',
  missingNote: '用于本周菜单',
  empty: '没有找到适合这些天的菜谱。换一餐试试，或添加家常菜谱。',
  today: '今天',
  deleted: '（已删除）',
};
