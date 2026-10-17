import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import mark from './assets/brand/stoka-icon-160.webp';
import { Shell } from './components/Shell';
import { IntroSplash, introSeen } from './components/IntroSplash';
import { pendingInvite, useSession } from './lib/auth';
import { persist } from './lib/persist';
import { fetchMemberships, fetchMinVersion, joinHousehold } from './lib/remote';
import { APP_VERSION } from './lib/platform';
import { syncWatch } from './lib/watch';
import { mustUpdate } from './domain/version';
import { isConfigured } from './lib/supabase';
import { applyTheme } from './lib/theme';
import { Cook } from './screens/Cook';
import { Stats } from './screens/Stats';
import { Prices } from './screens/Prices';
import { Home } from './screens/Home';
import { Inventory } from './screens/Inventory';
import { Login } from './screens/Login';
import { Onboarding } from './screens/Onboarding';
import { Settings } from './screens/Settings';
import { SetupMissing } from './screens/SetupMissing';
import { UpdateRequired } from './screens/UpdateRequired';
import { ShoppingList } from './screens/ShoppingList';
import { applyShortcutActions, localizeNewHousehold } from './store/actions';
import { shareWithWidget, takePendingShortcutActions } from './lib/watch';
import { closeHousehold, openHousehold, useStore, useView } from './store/store';
import { toast } from './store/toast';
import { m } from './i18n';
import { alertPrefs, scheduleAlerts } from './lib/alerts';
import { startPresence, stopPresence } from './lib/presence';
import { setMe } from './lib/me';
import { ListActivitySync } from './components/ListActivitySync';
import { WatchExtrasSync } from './components/WatchExtrasSync';
import { request as requestEvents } from './lib/stats';
import type { Snapshot } from './domain/types';

/** Volver a la app después de esto (en segundo plano) muestra otra vez la bienvenida corta */
const AWAY_FOR_INTRO = 10 * 60_000;

export default function App() {
  useEffect(() => applyTheme(), []);
  const { session, loading } = useSession();
  const minVersion = useMinVersion();
  // La primera vez, la bienvenida entera; después, la corta cada vez que se abre la app (o se vuelve a ella
  // después de un rato)
  const [intro, setIntro] = useState<'full' | 'short' | null>(() => (introSeen() ? 'short' : 'full'));
  useEffect(() => {
    let hiddenAt: number | null = null;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now();
      else if (hiddenAt !== null && Date.now() - hiddenAt > AWAY_FOR_INTRO) setIntro((v) => v ?? 'short');
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  if (isConfigured && minVersion && mustUpdate(APP_VERSION, minVersion)) {
    return <UpdateRequired minimum={minVersion} />;
  }

  return (
    <>
    {intro && <IntroSplash key={intro} short={intro === 'short'} onDone={() => setIntro(null)} />}
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
        toast(m.shell.app.joined(hh.name));
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
      const ids = memberships.map((x) => x.household_id);
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
  useEffect(() => setMe(userId), [userId]);
  // Apple Watch: se le pasa el hogar actual (solo si cambió)
  useEffect(() => {
    if (view) void syncWatch(view, userId);
  }, [view?.household.id, view?.household.invite_code, view?.members, userId]); // eslint-disable-line react-hooks/exhaustive-deps
  // Hogar recién creado con la app en otro idioma: lugares y categorías en ese idioma
  useEffect(() => {
    if (view) localizeNewHousehold();
  }, [view?.household.id, view?.categories.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useHouseholdAlerts(view, userId);
  // Widget y Siri: la foto del hogar, y lo que Siri anotó sin conexión
  useEffect(() => {
    if (view) shareWithWidget(view);
  }, [view]);
  useEffect(() => {
    if (!view) return;
    const apply = () => void takePendingShortcutActions().then((actions) => applyShortcutActions(actions));
    apply();
    const onVisible = () => document.visibilityState === 'visible' && apply();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [view?.household.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const myName = view?.members.find((x) => x.user_id === userId)?.display_name ?? '';
  useEffect(() => {
    if (view) startPresence(view.household.id, { id: userId, name: myName || m.alerts.others.someone });
  }, [view?.household.id, myName, userId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => stopPresence(), []);
  const loaded = useStore((s) => s.loaded);
  const online = useStore((s) => s.online);
  if (!view) {
    return loaded || online ? <Splash /> : <Splash message={m.shell.app.offlineFirstRun} />;
  }
  return (
    <Shell>
      <ListActivitySync view={view} />
      <WatchExtrasSync view={view} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/inventario" element={<Inventory />} />
        <Route path="/lista" element={<ShoppingList />} />
        <Route path="/cocino" element={<Cook />} />
        <Route path="/estadisticas" element={<Stats />} />
        <Route path="/precios" element={<Prices />} />
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

/**
 * Avisos: reprograma las notificaciones del iPhone cuando cambia el stock, y muestra en la app
 * lo que compran los demás («Sofía compró la leche»).
 */
function useHouseholdAlerts(view: Snapshot | null, userId: string) {
  const prevList = useRef<Snapshot['list'] | null>(null);
  useEffect(() => {
    if (!view || !alertPrefs().enabled) return;
    const t = setTimeout(() => {
      requestEvents(view.household.id)
        .then((r) => scheduleAlerts(view, r.events))
        .catch(() => void scheduleAlerts(view, []));
    }, 3000);
    return () => clearTimeout(t);
  }, [view?.products, view?.list]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!view) return;
    const before = prevList.current;
    prevList.current = view.list;
    if (!before || !alertPrefs().others) return;
    const was = new Map(before.map((i) => [i.id, i]));
    for (const item of view.list) {
      const old = was.get(item.id);
      if (!old || old.checked_at || !item.checked_at || !item.checked_by || item.checked_by === userId) continue;
      const who = view.members.find((x) => x.user_id === item.checked_by)?.display_name ?? m.alerts.others.someone;
      const what = item.product_id ? view.products.find((p) => p.id === item.product_id)?.name : item.name;
      if (what) toast(m.alerts.others.bought(who, what.toLowerCase()));
    }
  }, [view?.list]); // eslint-disable-line react-hooks/exhaustive-deps
}
