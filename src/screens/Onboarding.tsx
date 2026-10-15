import { useState } from 'react';
import { createHousehold, joinHousehold } from '../lib/remote';
import { markNewHousehold } from '../store/actions';
import { pendingInvite } from '../lib/auth';
import { AuthLayout } from './Login';
import { m } from '../i18n';

/** Primera vez: crear un hogar o unirse a uno con un código. */
export function Onboarding({ onReady }: { onReady: (householdId: string) => void }) {
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>(pendingInvite.get() ? 'join' : 'choose');
  const [name, setName] = useState('');
  const [home, setHome] = useState(() => m.settings.onboarding.defaultHome);
  const [code, setCode] = useState(pendingInvite.get() ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<{ id: string }>) => {
    setBusy(true);
    setError(null);
    try {
      const hh = await fn();
      pendingInvite.clear();
      onReady(hh.id);
    } catch (e) {
      setError(/inv[aá]lido/i.test(String(e)) ? m.settings.onboarding.errors.badCode : m.settings.onboarding.errors.failed);
    } finally {
      setBusy(false);
    }
  };

  const t = m.settings.onboarding;
  const nameField = (
    <input className="field" placeholder={t.yourName} value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
  );

  return (
    <AuthLayout>
      {mode === 'choose' && (
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold">{t.welcome}</h1>
          <p className="text-muted">{t.intro}</p>
          <button className="btn-primary w-full" onClick={() => setMode('create')}>{t.createMine}</button>
          <button className="btn-ghost w-full" onClick={() => setMode('join')}>{t.haveCode}</button>
        </div>
      )}
      {mode === 'create' && (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void run(async () => { const hh = await createHousehold(home.trim() || t.defaultHome, name.trim() || null); markNewHousehold(hh.id); return hh; }); }}>
          <h1 className="text-2xl font-semibold">{t.createTitle}</h1>
          {nameField}
          <input className="field" placeholder={t.homeName} value={home} onChange={(e) => setHome(e.target.value)} />
          <p className="text-sm text-muted">{t.seedsHint}</p>
          <button className="btn-primary w-full" disabled={busy}>{busy ? t.creating : t.create}</button>
          <button type="button" className="btn w-full text-muted" onClick={() => setMode('choose')}>{m.common.back}</button>
        </form>
      )}
      {mode === 'join' && (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void run(() => joinHousehold(code, name.trim() || null)); }}>
          <h1 className="text-2xl font-semibold">{t.joinTitle}</h1>
          {nameField}
          <input
            className="field text-center font-mono text-xl uppercase tracking-[0.3em]"
            placeholder={t.codePlaceholder}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            maxLength={8}
            autoCapitalize="characters"
          />
          <button className="btn-primary w-full" disabled={busy || code.length < 6}>{busy ? t.joining : t.join}</button>
          <button type="button" className="btn w-full text-muted" onClick={() => { pendingInvite.clear(); setMode('choose'); }}>{m.common.back}</button>
        </form>
      )}
      {error && <p className="mt-4 rounded-2xl bg-out/10 p-3 text-sm text-out">{error}</p>}
    </AuthLayout>
  );
}
