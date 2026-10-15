import { useStore } from '../store/store';
import { Icon } from './Icon';
import { m } from '../i18n';

export function SyncBadge() {
  const online = useStore((s) => s.online);
  const pending = useStore((s) => s.outbox.length);
  const syncing = useStore((s) => s.syncing);
  if (online && !pending) return null;
  // Corto a propósito: entra al lado del título en 375px
  return (
    <span
      title={online ? undefined : m.shell.sync.offlineHint}
      className="inline-flex w-fit items-center gap-1.5 rounded-full bg-sunken px-3 py-1.5 text-xs font-medium text-muted"
      role="status"
    >
      <Icon name={online ? 'sync' : 'cloudOff'} size={14} className={syncing ? 'animate-spin' : ''} />
      {online ? m.shell.sync.sending(pending) : pending ? m.shell.sync.unsent(pending) : m.shell.sync.offline}
    </span>
  );
}
