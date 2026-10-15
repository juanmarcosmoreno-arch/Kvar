import type { Messages } from '../es';

export const shell: Messages['shell'] = {
  app: {
    joined: (household) => `你已加入「${household}」。`,
    offlineFirstRun: '无网络连接。首次打开 Stoka 需要联网。',
  },
  nav: {
    label: '主导航',
    home: '首页',
    products: '物品',
    list: '清单',
    cook: '做饭',
    quickActions: '快捷操作',
  },
  actions: {
    title: '要做什么？',
    ranOut: { title: '有东西用完了', hint: '点一下就加入清单' },
    voice: { title: '说出来', hint: '“我买了牛奶”“油用完了”“还有米吗？”' },
    scan: { title: '扫码', hint: '用完了还是买了：点一下选择' },
    bought: { title: '购物回来了', hint: (ok) => `扫描买到的东西，状态改为“${ok}”` },
    receipt: { title: '拍小票', hint: '一次录入整次购物' },
    add: { title: '添加物品', hint: '只需名称，其余可选' },
  },
  demoBar: {
    label: '示例数据演示',
    simulate: (name) => `${name}标记一项`,
    reset: '重置',
    nothingToMark: (name, ok) => `“${ok}”里已没有可供${name}标记的物品。`,
    marked: (name, product, out) => `${name}将“${product}”标记为：${out}。已加入你的清单。`,
    resetDone: '已恢复示例数据。',
  },
  sync: {
    offlineHint: '离线：更改已保存，重新联网后发送',
    sending: (n) => `正在发送 ${n} 项…`,
    unsent: (n) => `${n} 项未发送`,
    offline: '离线',
  },
  intro: {
    videoLabel: 'Stoka：房子里装满了物品',
  },
  setup: {
    missing: {
      title: '尚未配置 Supabase',
      body: '.env 文件中缺少 VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY。',
    },
    badUrl: {
      title: 'Supabase 地址无效',
      body: 'VITE_SUPABASE_URL 必须是 Project URL，例如 https://abcdefgh.supabase.co（Project Settings → Data API）。',
    },
    badKey: {
      title: 'Supabase 密钥无效',
      body: 'VITE_SUPABASE_ANON_KEY 必须是以 sb_publishable_ 开头的 Publishable key（Project Settings → API Keys）。',
    },
    secretKey: {
      title: '你填入了私密密钥',
      body: 'VITE_SUPABASE_ANON_KEY 应填写 Publishable key（sb_publishable_…），绝不能填 Secret key：它拥有数据库的完全访问权限。请更换，并为安全起见在 Supabase 中重新生成一个 Secret key。',
    },
    current: (url) => `当前值：${url}`,
    empty: '（空）',
    fix: {
      before: '请修改项目文件夹中的 ',
      middle: ' 文件，然后重新运行 ',
      after: '。',
    },
  },
  update: {
    title: '请更新 Stoka',
    body: '需要新版本才能继续与家庭同步。你的数据是安全的。',
    openAppStore: '打开 App Store',
    searchAppStore: '在 App Store 中搜索 Stoka，然后点按“更新”。',
    updateNow: '立即更新',
    versions: (current, minimum) => `当前版本 ${current} · 需要 ${minimum} 或更高版本`,
  },
};
