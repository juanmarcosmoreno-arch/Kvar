import { APP_STORE_URL, APP_VERSION, isNative } from '../lib/platform';
import { AuthLayout } from './Login';
import { m } from '../i18n';

/** Se muestra cuando esta versión de la app ya no es compatible con la base. */
export function UpdateRequired({ minimum }: { minimum: string }) {
  return (
    <AuthLayout>
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold">{m.shell.update.title}</h1>
        <p className="text-muted">
          {m.shell.update.body}
        </p>
        {isNative ? (
          APP_STORE_URL ? (
            <a className="btn-primary w-full" href={APP_STORE_URL}>{m.shell.update.openAppStore}</a>
          ) : (
            <p className="text-sm text-muted">{m.shell.update.searchAppStore}</p>
          )
        ) : (
          <button className="btn-primary w-full" onClick={() => window.location.reload()}>{m.shell.update.updateNow}</button>
        )}
        <p className="text-xs text-muted">{m.shell.update.versions(APP_VERSION, minimum)}</p>
      </div>
    </AuthLayout>
  );
}
