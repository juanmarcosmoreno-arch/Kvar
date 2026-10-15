import type { Messages } from '../es';

export const importer: Messages['importer'] = {
  title: 'リンクから取り込む',
  urlLabel: 'レシピのリンク',
  urlPlaceholder: 'レシピのリンクを貼り付け',
  import: '取り込む',
  reading: 'レシピを読み込んでいます…',
  done: '完了しました。材料を確認して保存してください。',
  pasteToggle: 'またはレシピのテキストを貼り付け',
  pasteLabel: 'レシピを貼り付け',
  pastePlaceholder: 'トマトパスタ\n材料\n400 g パスタ\n1 缶 カットトマト\n作り方\n1. 玉ねぎを炒める…',
  useText: 'このテキストを使う',
  errors: {
    invalidUrl: 'このリンクは正しくないようです。',
    webBlocked: 'Web版ではこのリンクを読み込めません。レシピのテキストを貼り付けてください。',
    network: '接続できませんでした。接続を確認して、もう一度お試しください。',
    http: 'ページが応答しませんでした。後でもう一度お試しください。',
    notRecipe: 'このページにレシピが見つかりませんでした。テキストを貼り付けることもできます。',
    textNotRecipe: 'テキストに材料が見つかりませんでした。1行に1つずつ書いてください。',
  },
};
