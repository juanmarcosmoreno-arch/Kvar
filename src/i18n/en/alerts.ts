import type { Messages } from '../es';

export const alerts: Messages['alerts'] = {
  settings: {
    title: 'Notifications',
    hint: 'I’ll notify you on your iPhone before something runs out or expires. It’s all worked out on your phone.',
    enable: 'Turn on notifications',
    enabled: 'Notifications on',
    denied: 'iOS didn’t allow notifications. Turn them on in iPhone Settings → Stoka → Notifications.',
    predicted: 'What’s about to run out',
    predictedHint: 'Based on how long each thing lasts in your home.',
    expiry: 'What expires soon',
    expiryHint: 'Two days before the expiration date.',
    others: 'What others do',
    othersHint: 'While you’re using the app: “Sofía bought the milk.”',
    webNote: 'On the web I only show you what others do while the app is open. Notifications arrive in the iPhone app.',
  },
  notif: {
    expiryTitle: 'Expires soon',
    expiry: (name, days) =>
      days <= 0 ? `${name} expires today.` : days === 1 ? `${name} expires tomorrow.` : `${name} expires in ${days} days.`,
    predictedTitle: 'About to run out',
    predicted: (name) => `${name} will probably run out soon. Add it to the list?`,
  },
  others: {
    bought: (who, what) => `${who} bought ${what}.`,
    someone: 'Someone',
  },
};
