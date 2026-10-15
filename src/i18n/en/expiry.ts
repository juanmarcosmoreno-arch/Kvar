import { isOne } from '..';
import type { Messages } from '../es';

export const expiry: Messages['expiry'] = {
  title: 'Expiration',
  none: 'No date',
  set: 'Set date',
  clear: 'Remove expiration date',
  dateLabel: 'Expiration date',
  inDays: (days) =>
    days < 0 ? (days === -1 ? 'expired yesterday' : `expired ${-days} ${isOne(-days) ? 'day' : 'days'} ago`)
      : days === 0 ? 'expires today' : days === 1 ? 'expires tomorrow' : `expires in ${days} ${isOne(days) ? 'day' : 'days'}`,
  fromPhoto: 'Read from photo',
  reading: 'Reading the date…',
  found: (date) => `I read ${date}. Is that right?`,
  confirm: 'Yes, save',
  change: 'No, I’ll type it',
  notFound: 'I couldn’t find a date in the photo. Type it in by hand.',
  failed: 'I couldn’t read the photo. Try again or type it in by hand.',
  saved: (date) => `Expires ${date}.`,
};
