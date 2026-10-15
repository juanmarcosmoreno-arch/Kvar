import { AuthLayout } from './Login';

export function SetupMissing() {
  return (
    <AuthLayout>
      <div className="card space-y-3 p-5 text-sm">
        <p className="text-lg font-semibold">Falta configurar Supabase</p>
        <p className="text-muted">
          Copiá <code>.env.example</code> a <code>.env</code> y completá <code>VITE_SUPABASE_URL</code> y{' '}
          <code>VITE_SUPABASE_ANON_KEY</code>. Los pasos están en el README.
        </p>
      </div>
    </AuthLayout>
  );
}
