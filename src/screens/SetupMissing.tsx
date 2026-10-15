import { setupProblem, setupRawUrl } from '../lib/supabase';
import { m } from '../i18n';
import { AuthLayout } from './Login';

function messages() {
  const s = m.shell.setup;
  return { missing: s.missing, 'bad-url': s.badUrl, 'bad-key': s.badKey, 'secret-key': s.secretKey } as const;
}

export function SetupMissing() {
  const s = m.shell.setup;
  const msg = messages()[setupProblem ?? 'missing'];
  return (
    <AuthLayout>
      <div className="card space-y-3 p-5 text-sm">
        <p className="text-lg font-semibold">{msg.title}</p>
        <p className="text-muted">{msg.body}</p>
        {setupProblem === 'bad-url' && (
          <p className="break-all rounded-lg bg-sunken p-2 font-mono text-xs">{s.current(setupRawUrl || s.empty)}</p>
        )}
        <p className="text-muted">
          {s.fix.before}<code>.env</code>{s.fix.middle}<code>npm run ios:sync</code>{s.fix.after}
        </p>
      </div>
    </AuthLayout>
  );
}
