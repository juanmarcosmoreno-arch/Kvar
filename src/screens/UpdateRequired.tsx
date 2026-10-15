import { APP_STORE_URL, APP_VERSION, isNative } from '../lib/platform';
import { AuthLayout } from './Login';

/** Se muestra cuando esta versión de la app ya no es compatible con la base. */
export function UpdateRequired({ minimum }: { minimum: string }) {
  return (
    <AuthLayout>
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Actualizá Kvar</h1>
        <p className="text-muted">
          Hay una versión nueva que hace falta para seguir sincronizando con tu hogar. Tus datos están a salvo.
        </p>
        {isNative ? (
          APP_STORE_URL ? (
            <a className="btn-primary w-full" href={APP_STORE_URL}>Abrir el App Store</a>
          ) : (
            <p className="text-sm text-muted">Buscá Kvar en el App Store y tocá «Actualizar».</p>
          )
        ) : (
          <button className="btn-primary w-full" onClick={() => window.location.reload()}>Actualizar ahora</button>
        )}
        <p className="text-xs text-muted">Tenés la {APP_VERSION} · se necesita la {minimum} o más nueva</p>
      </div>
    </AuthLayout>
  );
}
