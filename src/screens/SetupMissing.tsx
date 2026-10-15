import { setupProblem, setupRawUrl } from '../lib/supabase';
import { AuthLayout } from './Login';

const MESSAGES = {
  missing: {
    title: 'Falta configurar Supabase',
    body: 'En el archivo .env faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY.',
  },
  'bad-url': {
    title: 'La dirección de Supabase no es válida',
    body: 'VITE_SUPABASE_URL tiene que ser la Project URL, por ejemplo https://abcdefgh.supabase.co (Project Settings → Data API).',
  },
  'bad-key': {
    title: 'La clave de Supabase no es válida',
    body: 'VITE_SUPABASE_ANON_KEY tiene que ser la Publishable key, que empieza con sb_publishable_ (Project Settings → API Keys).',
  },
  'secret-key': {
    title: 'Pusiste la clave secreta',
    body: 'En VITE_SUPABASE_ANON_KEY va la Publishable key (sb_publishable_…), nunca la Secret key: da acceso total a la base. Cambiala y generá una Secret key nueva en Supabase por las dudas.',
  },
} as const;

export function SetupMissing() {
  const m = MESSAGES[setupProblem ?? 'missing'];
  return (
    <AuthLayout>
      <div className="card space-y-3 p-5 text-sm">
        <p className="text-lg font-semibold">{m.title}</p>
        <p className="text-muted">{m.body}</p>
        {setupProblem === 'bad-url' && (
          <p className="break-all rounded-lg bg-sunken p-2 font-mono text-xs">Ahora dice: {setupRawUrl || '(vacío)'}</p>
        )}
        <p className="text-muted">
          Corregí el archivo <code>.env</code> en la carpeta del proyecto y volvé a correr <code>npm run ios:sync</code>.
        </p>
      </div>
    </AuthLayout>
  );
}
