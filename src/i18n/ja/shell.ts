import type { Messages } from '../es';

export const shell: Messages['shell'] = {
  app: {
    joined: (household) => `「${household}」に参加しました。`,
    offlineFirstRun: 'オフラインです。初回はインターネットに接続して Stoka を開いてください。',
  },
  nav: {
    label: 'メイン',
    home: 'ホーム',
    products: '品目',
    list: 'リスト',
    cook: '料理',
    quickActions: 'クイック操作',
  },
  actions: {
    title: '何をしますか？',
    ranOut: { title: '何かがなくなった', hint: 'タップでリストに追加' },
    voice: { title: '話しかける', hint: '「牛乳を買った」「油がなくなった」「お米ある？」' },
    scan: { title: 'スキャン', hint: 'なくなった・買った：タップで選べます' },
    bought: { title: '買い物から帰った', hint: (ok) => `買ったものをスキャンすると「${ok}」になります` },
    receipt: { title: 'レシートを撮影', hint: '買い物をまとめて登録します' },
    add: { title: '品目を追加', hint: '名前だけでOK。ほかは任意です' },
  },
  demoBar: {
    label: 'サンプルデータのデモ',
    simulate: (name) => `${name}が何かをマーク`,
    reset: 'リセット',
    nothingToMark: (name, ok) => `「${ok}」に${name}がマークできるものが残っていません。`,
    marked: (name, product, out) => `${name}が「${product}」を「${out}」にしました。リストに追加済みです。`,
    resetDone: 'サンプルデータに戻しました。',
  },
  sync: {
    offlineHint: 'オフライン：変更は保存され、再接続時に送信されます',
    sending: (n) => `${n}件を送信中…`,
    unsent: (n) => `${n}件未送信`,
    offline: 'オフライン',
  },
  intro: {
    videoLabel: 'Stoka：家が品物でいっぱいになります',
  },
  setup: {
    missing: {
      title: 'Supabase が設定されていません',
      body: '.env ファイルに VITE_SUPABASE_URL または VITE_SUPABASE_ANON_KEY がありません。',
    },
    badUrl: {
      title: 'Supabase のアドレスが無効です',
      body: 'VITE_SUPABASE_URL には Project URL を指定してください。例：https://abcdefgh.supabase.co（Project Settings → Data API）。',
    },
    badKey: {
      title: 'Supabase のキーが無効です',
      body: 'VITE_SUPABASE_ANON_KEY には sb_publishable_ で始まる Publishable key を指定してください（Project Settings → API Keys）。',
    },
    secretKey: {
      title: 'シークレットキーが入っています',
      body: 'VITE_SUPABASE_ANON_KEY には Publishable key（sb_publishable_…）を指定します。Secret key はデータベースへの完全なアクセス権を持つため、絶対に使わないでください。キーを差し替え、念のため Supabase で新しい Secret key を生成してください。',
    },
    current: (url) => `現在の値：${url}`,
    empty: '（空）',
    fix: {
      before: 'プロジェクトフォルダの ',
      middle: ' ファイルを修正して、',
      after: ' をもう一度実行してください。',
    },
  },
  update: {
    title: 'Stoka をアップデートしてください',
    body: '家族との同期を続けるには新しいバージョンが必要です。データは安全です。',
    openAppStore: 'App Store を開く',
    searchAppStore: 'App Store で Stoka を検索し、「アップデート」をタップしてください。',
    updateNow: '今すぐアップデート',
    versions: (current, minimum) => `現在 ${current} · ${minimum} 以降が必要です`,
  },
};
