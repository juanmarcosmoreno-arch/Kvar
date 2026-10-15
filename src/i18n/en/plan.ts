import type { Messages } from '../es';
import { isOne } from '..';

export const plan: Messages['plan'] = {
  title: 'This week’s menu',
  make: 'Plan my week’s menu',
  hint: 'Using what you have: first what’s expiring and what needs no shopping.',
  days: 'Days',
  meal: 'Meal',
  build: 'Plan the menu',
  rebuild: 'Plan again',
  swap: (title) => `Swap ${title} for another recipe`,
  save: 'Save the menu',
  saved: 'Menu saved. Everyone at home can see it.',
  edit: 'Change the menu',
  addMissing: (n) => `Add what’s missing to the list (${n})`,
  added: (n) => (isOne(n) ? `Added ${n} thing to the list.` : `Added ${n} things to the list.`),
  allInList: 'What’s missing was already on the list.',
  nothingMissing: 'You have everything for this menu.',
  missingNote: 'For this week’s menu',
  empty: 'I couldn’t find recipes for those days. Try another meal or add your family recipes.',
  today: 'Today',
  deleted: '(no longer available)',
};
