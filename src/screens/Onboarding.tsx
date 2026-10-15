import { useState } from 'react';
import { createHousehold, joinHousehold } from '../lib/remote';
import { pendingInvite } from '../lib/auth';
import { AuthLayout } from './Login';

/** Primera vez: crear un hogar o unirse a uno con un código. */
export function Onboarding({ onReady }: { onReady: (householdId: string) => void }) {
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>(pendingInvite.get() ? 'join' : 'choose');
  const [name, setName] = useState('');
  const [home, setHome] = useState('Casa');
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
      setError(/inv[aá]lido/i.test(String(e)) ? 'Ese código no existe. Revisalo o pedí uno nuevo.' : 'No se pudo completar. ¿Tenés conexión?');
    } finally {
      setBusy(false);
    }
  };

  const nameField = (
    <input className="field" placeholder="Tu nombre (ej: Juan)" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" />
  );

  return (
    <AuthLayout>
      {mode === 'choose' && (
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold">¡Bienvenido a Kvar!</h1>
          <p className="text-muted">Kvar es «lo que queda» en sueco. Empezá creando tu hogar o sumate al de alguien.</p>
          <button className="btn-primary w-full" onClick={() => setMode('create')}>Crear mi hogar</button>
          <button className="btn-ghost w-full" onClick={() => setMode('join')}>Tengo un código</button>
        </div>
      )}
      {mode === 'create' && (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void run(() => createHousehold(home.trim() || 'Casa', name.trim() || null)); }}>
          <h1 className="text-2xl font-semibold">Tu hogar</h1>
          {nameField}
          <input className="field" placeholder="Nombre del hogar" value={home} onChange={(e) => setHome(e.target.value)} />
          <p className="text-sm text-muted">Te dejo armados los lugares (Heladera, Freezer, Alacena, Baño, Limpieza) y las categorías. Los podés cambiar después.</p>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creando…' : 'Crear hogar'}</button>
          <button type="button" className="btn w-full text-muted" onClick={() => setMode('choose')}>Volver</button>
        </form>
      )}
      {mode === 'join' && (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void run(() => joinHousehold(code, name.trim() || null)); }}>
          <h1 className="text-2xl font-semibold">Sumate a un hogar</h1>
          {nameField}
          <input
            className="field text-center font-mono text-xl uppercase tracking-[0.3em]"
            placeholder="CÓDIGO"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            maxLength={8}
            autoCapitalize="characters"
          />
          <button className="btn-primary w-full" disabled={busy || code.length < 6}>{busy ? 'Uniéndote…' : 'Unirme'}</button>
          <button type="button" className="btn w-full text-muted" onClick={() => { pendingInvite.clear(); setMode('choose'); }}>Volver</button>
        </form>
      )}
      {error && <p className="mt-4 rounded-2xl bg-out/10 p-3 text-sm text-out">{error}</p>}
    </AuthLayout>
  );
}
