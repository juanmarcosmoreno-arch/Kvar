import { useState } from 'react';
import logo from '../assets/brand/stoka-logo.webp';
import { supabase } from '../lib/supabase';
import { m } from '../i18n';

/**
 * Ingreso sin correo: «Empezar» crea un usuario propio del teléfono (anonymous sign-in de
 * Supabase). Lo que se comparte es el hogar, con su código de invitación.
 * El ingreso con código por correo queda como opción, para quien configure el envío de correos.
 */
export function Login() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'start' | 'email' | 'code'>('start');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInAnonymously();
    setBusy(false);
    if (error) {
      setError(
        /anonymous/i.test(error.message)
          ? m.settings.login.errors.anonymousDisabled
          : traducir(error.message),
      );
    }
  };

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) setError(traducir(error.message));
    else setStep('code');
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    setBusy(false);
    if (error) setError(m.settings.login.errors.badCode);
  };

  const t = m.settings.login;
  return (
    <AuthLayout>
      {step === 'start' ? (
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold">{t.welcome}</h1>
          <p className="text-muted">
            {t.intro}
          </p>
          <button className="btn-primary w-full" onClick={() => void start()} disabled={busy}>
            {busy ? t.wait : t.start}
          </button>
          <button type="button" className="btn w-full text-sm text-muted" onClick={() => setStep('email')}>
            {t.withEmail}
          </button>
        </div>
      ) : step === 'email' ? (
        <form onSubmit={sendCode} className="space-y-4">
          <h1 className="text-2xl font-semibold">{t.emailTitle}</h1>
          <p className="text-muted">{t.emailIntro}</p>
          <input
            className="field"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button className="btn-primary w-full" disabled={busy || !email.includes('@')}>
            {busy ? t.sending : t.sendCode}
          </button>
          <button type="button" className="btn w-full text-muted" onClick={() => { setStep('start'); setError(null); }}>
            {m.common.back}
          </button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-4">
          <h1 className="text-2xl font-semibold">{t.codeTitle}</h1>
          <p className="text-muted">
            {t.codeBefore}<strong className="text-ink">{email}</strong>{t.codeAfter}
          </p>
          <input
            className="field text-center text-2xl tracking-[0.4em]"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={8}
            placeholder="······"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            autoFocus
          />
          <button className="btn-primary w-full" disabled={busy || code.length < 6}>
            {busy ? t.verifying : t.confirm}
          </button>
          <button type="button" className="btn w-full text-muted" onClick={() => { setStep('email'); setCode(''); }}>
            {t.otherEmail}
          </button>
        </form>
      )}
      {error && <p className="mt-4 rounded-2xl bg-out/10 p-3 text-sm text-out">{error}</p>}
    </AuthLayout>
  );
}

function traducir(msg: string): string {
  if (/rate limit|seconds/i.test(msg)) return m.settings.login.errors.rateLimit;
  if (/fetch|network/i.test(msg)) return m.settings.login.errors.offline;
  return msg;
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-full max-w-sm flex-col justify-center px-6 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-[calc(env(safe-area-inset-top)+24px)]">
      <div className="mb-8 flex flex-col items-center text-center">
        {/* Logo: la casa con la despensa y «Stoka» */}
        <div className="dark:overflow-hidden dark:rounded-[2rem] dark:bg-white">
          <img src={logo} alt={m.common.appName} className="h-48 w-auto mix-blend-multiply dark:mix-blend-normal" />
        </div>
        <span className="mt-2 text-[11px] uppercase tracking-[0.32em] text-muted">{m.settings.tagline}</span>
      </div>
      {children}
    </div>
  );
}
