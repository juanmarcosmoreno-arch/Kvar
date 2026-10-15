import type { Messages } from '../es';

export const importer: Messages['importer'] = {
  title: '从链接导入',
  urlLabel: '菜谱链接',
  urlPlaceholder: '粘贴菜谱链接',
  import: '导入',
  reading: '正在读取菜谱…',
  done: '完成：请核对食材后保存。',
  pasteToggle: '或粘贴菜谱文字',
  pasteLabel: '粘贴菜谱',
  pastePlaceholder: '番茄意面\n材料\n400 g 意面\n1 罐 番茄碎\n做法\n1. 炒香洋葱…',
  useText: '使用这段文字',
  errors: {
    invalidUrl: '这个链接似乎无效。',
    webBlocked: '网页版无法读取该链接，请粘贴菜谱文字。',
    network: '无法连接。请检查网络后重试。',
    http: '页面没有响应。请稍后重试。',
    notRecipe: '该页面中没有找到菜谱。可以粘贴文字。',
    textNotRecipe: '文字中没有找到食材。请每行写一种。',
  },
};
