import { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import mark from './assets/brand/stoka-icon-160.webp';
import { Shell } from './components/Shell';
import { IntroSplash, introSeen } from './components/IntroSplash';
import { pendingInvite, useSession } from './lib/auth';
import { persist } from './lib/persist';
import { fetchMemberships, fetchMinVersion, joinHousehold } from './lib/remote';
import { APP_VERSION } from './lib/platform';
import { mustUpdate } from './domain/version';
import { isConfigured } from './lib/supabase';
import { applyTheme } from './lib/theme';
import { Cook } from './screens/Cook';
import { Home } from './screens/Home';
import { Inventory } from './screens/Inventory';
import { Login } from './screens/Login';
import { Onboarding } from './screens/Onboarding';
import { Settings } from './screens/Settings';
import { SetupMissing } from './screens/SetupMissing';
import { UpdateRequired } from './screens/UpdateRequired';
import { ShoppingList } from './screens/ShoppingList';
import { closeHousehold, openHousehold, useStore, useView } from './store/store';
import { toast } from './store/toast';

export default function App() {
  useEffect(() => applyTheme(), []);
  const { session, loading } = useSession();
  const minVersion = useMinVersion();
  const [intro, setIntro] = useState(() => !introSeen());

  if (isConfigured && minVersion && mustUpdate(APP_VERSION, minVersion)) {
    return <UpdateRequired minimum={minVersion} />;
  }

  return (
    <>
    {intro && <IntroSplash onDone={() => setIntro(false)} />}
    <Routes>
      <Route path="/unirse/:code" element={<JoinLink signedIn={Boolean(session)} />} />
      <Route
        path="*"
        element={
          !isConfigured ? <SetupMissing /> : loading ? <Splash /> : !session ? <Login /> : <HouseholdGate userId={session.user.id} />
        }
      />
    </Routes>
    </>
  );
}

/** Consulta la versión mínima al abrir y cada vez que la app vuelve al frente. */
function useMinVersion(): string | null {
  const [min, setMin] = useState<string | null>(null);
  useEffect(() => {
    if (!isConfigured) return;
    const check = () => void fetchMinVersion().then((v) => v && setMin(v));
    check();
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
  return min;
}

/** Link de invitación: guarda el código y sigue con el flujo normal. */
function JoinLink({ signedIn }: { signedIn: boolean }) {
  const { code } = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    if (!code) return;
    pendingInvite.set(code.toUpperCase());
    if (!signedIn) {
      navigate('/', { replace: true });
      return;
    }
    joinHousehold(code, null)
      .then(async (hh) => {
        pendingInvite.clear();
        await persist.saveHousehold(hh.id);
        toast(`Te uniste a ${hh.name}.`);
        window.location.replace('/');
      })
      .catch(() => navigate('/', { replace: true }));
  }, [code, signedIn, navigate]);
  return <Splash />;
}

function HouseholdGate({ userId }: { userId: string }) {
  const [hhId, setHhId] = useState<string | null | undefined>(undefined);
  const [choosing, setChoosing] = useState(false);

  const resolve = useCallback(async () => {
    const cached = await persist.loadHousehold();
    try {
      const memberships = await fetchMemberships(userId);
      const ids = memberships.map((m) => m.household_id);
      if (pendingInvite.get()) return setHhId(null); // completar la invitación
      setHhId(cached && ids.includes(cached) ? cached : ids[ids.length - 1] ?? null);
    } catch {
      // Sin conexión: seguimos con el último hogar guardado.
      setHhId(cached ?? null);
    }
  }, [userId]);

  useEffect(() => {
    void resolve();
  }, [resolve]);

  useEffect(() => {
    if (hhId) void openHousehold(hhId);
    return () => closeHousehold();
  }, [hhId]);

  if (hhId === undefined) return <Splash />;
  if (!hhId || choosing) {
    return (
      <Onboarding
        onReady={(id) => {
          setChoosing(false);
          setHhId(id);
        }}
      />
    );
  }
  return <Main userId={userId} onSwitchHousehold={() => setChoosing(true)} />;
}

function Main({ userId, onSwitchHousehold }: { userId: string; onSwitchHousehold: () => void }) {
  const view = useView();
  const loaded = useStore((s) => s.loaded);
  const online = useStore((s) => s.online);
  if (!view) {
    return loaded || online ? <Splash /> : <Splash message="Sin conexión. Abrí Stoka con internet la primera vez." />;
  }
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/inventario" element={<Inventory />} />
        <Route path="/lista" element={<ShoppingList />} />
        <Route path="/cocino" element={<Cook />} />
        <Route path="/ajustes" element={<Settings userId={userId} onSwitchHousehold={onSwitchHousehold} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}

function Splash({ message }: { message?: string }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <img src={mark} alt="" className="h-16 w-16 animate-pulse rounded-2xl" />
      {message && <p className="text-muted">{message}</p>}
    </div>
  );
}
