import { alertPrefs, canNotify, clearAlerts, requestAlertPermission, saveAlertPrefs, type AlertPrefs } from '../lib/alerts';
import { CURRENCIES, currency, currencyName, setCurrency } from '../lib/currency';
import { setTickMode, useTickMode } from '../lib/tickMode';
import { replayIntro } from '../components/IntroSplash';
import { peopleLabel, Stepper } from '../components/Stepper';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Shell';
import { Icon, type IconName } from '../components/Icon';
import { Toggle } from '../components/Toggle';
import { DiscountsEditor, StoresEditor } from '../components/PriceSettings';
import { usePriceData } from '../lib/priceData';
import type { Category, Location } from '../domain/types';
import { isStandalone } from '../lib/auth';
import { APP_VERSION, isNative, PUBLIC_URL } from '../lib/platform';
import { categoryIcon, locationIcon } from '../lib/categoryIcon';
import { isDemo } from '../lib/demo';
import { deleteMyAccount, regenerateInviteCode } from '../lib/remote';
import { supabase } from '../lib/supabase';
import { getTheme, setTheme, type Theme } from '../lib/theme';
import { LANGUAGES, m, savedChoice, setLanguage, type LangChoice } from '../i18n';
import {
  deleteCategory, deleteLocation, moveCategory, saveCategory, saveLocation, updateHousehold,
  setMyName,
} from '../store/actions';
import { resetLocal, sync, useStore, useView } from '../store/store';
import { toast } from '../store/toast';

export function Settings({ userId, onSwitchHousehold }: { userId: string; onSwitchHousehold: () => void }) {
  const view = useView()!;
  const priceData = usePriceData(view.household.id);
  const navigate = useNavigate();
  const online = useStore((s) => s.online);
  const [hhName, setHhName] = useState(view.household.name);
  const [theme, setThemeState] = useState<Theme>(getTheme());
  useEffect(() => setHhName(view.household.name), [view.household.name]);

  const link = `${PUBLIC_URL}/unirse/${view.household.invite_code}`;

  const share = async () => {
    if (isDemo) {
      toast(m.settings.settings.toasts.demoShare(view.household.invite_code));
      return;
    }
    const text = m.settings.settings.inviteText(view.household.name, link, view.household.invite_code);
    if (navigator.share) {
      try {
        await navigator.share({ title: m.common.appName, text, url: link });
      } catch {
        /* cancelado */
      }
    } else {
      await navigator.clipboard?.writeText(text);
      toast(m.settings.settings.toasts.linkCopied);
    }
  };

  const regenerate = async () => {
    try {
      await regenerateInviteCode(view.household.id);
      await sync();
      toast(m.settings.settings.toasts.newCodeReady);
    } catch {
      toast(m.settings.settings.toasts.newCodeOffline);
    }
  };

  const signOut = async () => {
    await resetLocal();
    await supabase.auth.signOut();
  };

  // Quien entró sin correo solo puede volver con el código del hogar: se avisa antes de salir
  const [anonymous, setAnonymous] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  useEffect(() => {
    if (isDemo) return;
    void supabase.auth.getSession().then(({ data }) => setAnonymous(Boolean(data.session?.user?.is_anonymous)));
  }, []);

  const [deleting, setDeleting] = useState<'idle' | 'confirm' | 'busy'>('idle');
  const alone = view.members.length <= 1;
  const deleteAccount = async () => {
    setDeleting('busy');
    try {
      await deleteMyAccount();
      await resetLocal();
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      setDeleting('confirm');
      toast(m.settings.settings.toasts.deleteFailed);
    }
  };

  const t = m.settings.settings;
  const [langChoice] = useState<LangChoice>(savedChoice);

  return (
    <>
      <Header
        title={t.title}
        left={
          <button className="-ml-3 flex min-h-tap min-w-tap items-center justify-center text-muted" aria-label={m.common.back} onClick={() => navigate(-1)}>
            <Icon name="back" />
          </button>
        }
      />
      <div className="space-y-8 px-5 pb-6">
        {!isNative && !isStandalone() && (
          <div className="card space-y-1 border border-lime/50 p-4">
            <p className="font-semibold">{t.install.title}</p>
            <p className="text-sm text-muted">
              {t.install.before}<strong>{t.install.share}</strong> <Icon name="share" size={14} className="inline" />{t.install.middle}
              <strong>{t.install.addToHome}</strong>{t.install.after}
            </p>
          </div>
        )}

        <Section title={t.household.title}>
          <div className="card space-y-4 p-4">
            <input
              className="field"
              value={hhName}
              onChange={(e) => setHhName(e.target.value)}
              onBlur={() => hhName.trim() && hhName.trim() !== view.household.name && updateHousehold({ name: hhName.trim() })}
              aria-label={t.household.nameLabel}
            />
            <div className="rounded-2xl bg-sunken p-4 text-center">
              <p className="text-sm text-muted">{t.household.inviteCode}</p>
              <p className="font-mono text-3xl font-semibold tracking-[0.25em]">{view.household.invite_code}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-primary" onClick={share}>
                <Icon name="share" size={20} /> {t.household.invite}
              </button>
              <button className="btn-ghost" onClick={regenerate} disabled={!online}>
                <Icon name="sync" size={20} /> {t.household.newCode}
              </button>
            </div>
            <ul className="divide-y divide-line">
              {view.members.map((mem) => (
                <li key={mem.user_id} className="flex min-h-[48px] items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary">
                    {(mem.display_name ?? '?').slice(0, 1).toUpperCase()}
                  </span>
                  {mem.user_id === userId ? (
                    <MyName current={mem.display_name} userId={userId} />
                  ) : (
                    <span className="flex-1">{mem.display_name ?? t.household.noName}</span>
                  )}
                  {mem.role === 'owner' && <span className="text-xs text-muted">{t.household.owner}</span>}
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <Section title={t.shopping.title}>
          <div className="card px-4">
            <Toggle
              checked={view.household.list_on_low}
              onChange={(v) => updateHousehold({ list_on_low: v })}
              label={t.shopping.addLow}
              hint={t.shopping.addLowHint}
            />
          </div>
        </Section>

        <Section title={t.kitchen.title} hint={t.kitchen.hint}>
          <div className="card flex min-h-[64px] items-center justify-between gap-3 px-4">
            <span>{t.kitchen.servings}</span>
            <Stepper
              value={view.household.default_servings ?? 2}
              onChange={(n) => updateHousehold({ default_servings: n })}
              label={t.kitchen.servings}
              unit={peopleLabel}
            />
          </div>
        </Section>

        <Section title={t.locations.title}>
          <EditableList<Location>
            items={[...view.locations].sort((a, b) => a.sort_order - b.sort_order)}
            icon={(l) => locationIcon(l.icon, l.name)}
            onRename={(l, name) => saveLocation({ ...l, name })}
            onDelete={(l) => deleteLocation(l.id)}
            onAdd={(name) => saveLocation({ name })}
            placeholder={t.locations.placeholder}
          />
        </Section>

        <Section title={t.categories.title} hint={t.categories.hint}>
          <EditableList<Category>
            items={[...view.categories].sort((a, b) => a.sort_order - b.sort_order)}
            icon={(c) => categoryIcon(c.name)}
            onRename={(c, name) => saveCategory({ ...c, name })}
            onDelete={(c) => deleteCategory(c.id)}
            onAdd={(name) => saveCategory({ name })}
            onMove={(c, dir) => moveCategory(c.id, dir)}
            placeholder={t.categories.placeholder}
          />
        </Section>

        <Section title={m.shopping.tick.title} hint={m.shopping.tick.hint}>
          <TickModePicker />
        </Section>

        <Section title={m.alerts.settings.title} hint={m.alerts.settings.hint}>
          <AlertsSettings />
        </Section>

        <Section title={m.prices.discounts.title} hint={m.prices.discounts.hint}>
          <DiscountsEditor data={priceData} />
        </Section>

        <Section title={m.prices.stores.title} hint={m.prices.stores.hint}>
          <StoresEditor data={priceData} />
        </Section>

        <Section title={m.money.settings.title} hint={m.money.settings.hint}>
          <CurrencyPicker />
        </Section>

        <Section title={m.common.language.title} hint={m.common.language.hint}>
          <div className="card divide-y divide-line" role="radiogroup" aria-label={m.common.language.title}>
            {([{ code: 'auto', name: m.common.language.auto }, ...LANGUAGES] as { code: LangChoice; name: string }[]).map((l) => (
              <button
                key={l.code}
                role="radio"
                aria-checked={langChoice === l.code}
                onClick={() => langChoice !== l.code && setLanguage(l.code)}
                className="flex min-h-[52px] w-full items-center justify-between gap-3 px-4 text-left"
              >
                <span className={langChoice === l.code ? 'font-medium' : ''}>{l.name}</span>
                {langChoice === l.code && <Icon name="check" size={20} className="text-primary" />}
              </button>
            ))}
          </div>
        </Section>

        <Section title={t.appearance.title}>
          <div className="card grid grid-cols-3 gap-1 p-1">
            {(['system', 'light', 'dark'] as Theme[]).map((th) => (
              <button
                key={th}
                onClick={() => { setTheme(th); setThemeState(th); }}
                className={`min-h-tap rounded-2xl text-sm font-medium ${theme === th ? 'bg-primary text-on-primary' : 'text-muted'}`}
              >
                {t.appearance[th]}
              </button>
            ))}
          </div>
          <button className="btn-ghost mt-2 w-full" onClick={replayIntro}>
            {t.appearance.replayIntro}
          </button>
        </Section>

        <Section title={t.account.title}>
          <div className="grid gap-2">
            <button className="btn-ghost w-full" onClick={onSwitchHousehold}>{t.account.switchHousehold}</button>
            {!isDemo && !confirmSignOut && (
              <button className="btn w-full text-out" onClick={() => (anonymous ? setConfirmSignOut(true) : void signOut())}>
                {t.account.signOut}
              </button>
            )}
            {confirmSignOut && (
              <div className="card space-y-3 p-4">
                <p className="font-medium">{t.account.anonTitle}</p>
                <p className="text-sm text-muted">
                  {t.account.anonBefore}
                  <strong className="font-mono text-ink">{view.household.invite_code}</strong>{t.account.anonAfter}
                  {alone && t.account.anonAlone}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button className="btn-ghost" onClick={() => setConfirmSignOut(false)}>{m.common.cancel}</button>
                  <button className="btn bg-out text-white" onClick={() => void signOut()}>{t.account.signOut}</button>
                </div>
              </div>
            )}
          </div>
          {deleting === 'idle' ? (
            <button className="btn w-full text-sm text-muted" onClick={() => setDeleting('confirm')}>
              {t.account.deleteAccount}
            </button>
          ) : (
            <div className="card space-y-3 border-out/40 p-4">
              <p className="font-medium">{t.account.deleteTitle}</p>
              <p className="text-sm text-muted">
                {alone ? t.account.deleteAlone(view.household.name) : t.account.deleteLeave(view.household.name)}{' '}
                {t.account.cannotUndo}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button className="btn-ghost" onClick={() => setDeleting('idle')} disabled={deleting === 'busy'}>{m.common.cancel}</button>
                <button className="btn bg-out text-white" onClick={deleteAccount} disabled={deleting === 'busy' || !online}>
                  {deleting === 'busy' ? t.account.deleting : t.account.confirmDelete}
                </button>
              </div>
              {!online && <p className="text-xs text-muted">{t.account.deleteOffline}</p>}
            </div>
          )}
        </Section>
        <p className="text-center text-xs text-muted">{m.common.appName} {APP_VERSION} · {m.settings.tagline}</p>
      </div>
    </>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="section-title">{title}</h2>
      {hint && <p className="text-sm text-muted">{hint}</p>}
      {children}
    </section>
  );
}

function EditableList<T extends { id: string; name: string }>({
  items, icon, onRename, onDelete, onAdd, onMove, placeholder,
}: {
  items: T[];
  icon: (t: T) => IconName;
  onRename: (t: T, name: string) => void;
  onDelete: (t: T) => void;
  onAdd: (name: string) => void;
  onMove?: (t: T, dir: -1 | 1) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  return (
    <div className="card divide-y divide-line">
      {items.map((it, i) => (
        <div key={it.id} className="flex min-h-[56px] items-center gap-1 pl-4 pr-1">
          <Icon name={icon(it)} size={18} className="text-muted" />
          <input
            defaultValue={it.name}
            key={it.name}
            className="min-h-tap min-w-0 flex-1 bg-transparent px-2 outline-none"
            onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== it.name && onRename(it, e.target.value.trim())}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            aria-label={m.settings.settings.list.nameOf(it.name)}
          />
          {onMove && (
            <>
              <button className="flex min-h-tap min-w-[36px] items-center justify-center text-muted disabled:opacity-30" disabled={i === 0} onClick={() => onMove(it, -1)} aria-label={m.settings.settings.list.moveUp}>
                <Icon name="up" size={18} />
              </button>
              <button className="flex min-h-tap min-w-[36px] items-center justify-center text-muted disabled:opacity-30" disabled={i === items.length - 1} onClick={() => onMove(it, 1)} aria-label={m.settings.settings.list.moveDown}>
                <Icon name="down" size={18} />
              </button>
            </>
          )}
          {confirm === it.id ? (
            <button className="min-h-tap px-3 text-sm font-semibold text-out" onClick={() => { onDelete(it); setConfirm(null); }}>
              {m.common.confirmDelete}
            </button>
          ) : (
            <button className="flex min-h-tap min-w-tap items-center justify-center text-muted" onClick={() => setConfirm(it.id)} aria-label={m.settings.settings.list.deleteItem(it.name)}>
              <Icon name="trash" size={18} />
            </button>
          )}
        </div>
      ))}
      <form
        className="flex min-h-[56px] items-center gap-2 pl-4 pr-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim()) onAdd(draft);
          setDraft('');
        }}
      >
        <Icon name="plus" size={20} className="text-muted" />
        <input className="min-h-tap flex-1 bg-transparent px-2 outline-none placeholder:text-muted" placeholder={placeholder} value={draft} onChange={(e) => setDraft(e.target.value)} />
        {draft.trim() && <button className="min-h-tap px-3 font-semibold text-primary">{m.common.add}</button>}
      </form>
    </div>
  );
}

function CurrencyPicker() {
  const [code, setCode] = useState(currency());
  return (
    <select
      className="field appearance-none"
      value={code}
      onChange={(e) => {
        setCurrency(e.target.value);
        setCode(e.target.value);
      }}
      aria-label={m.money.settings.title}
    >
      {[...new Set([code, ...CURRENCIES])].map((c) => (
        <option key={c} value={c}>
          {currencyName(c)} ({c})
        </option>
      ))}
    </select>
  );
}

/** Mi nombre en el hogar: se toca y se escribe; se guarda al salir del campo o con Enter. */
function MyName({ current, userId }: { current: string | null; userId: string }) {
  const t = m.settings.settings.household;
  const [editing, setEditing] = useState(!current);
  const [name, setName] = useState(current ?? '');
  const save = () => {
    const clean = name.trim();
    if (clean && clean !== current) {
      setMyName(userId, clean);
      toast(t.nameSaved(clean));
    }
    if (clean) setEditing(false);
  };
  if (!editing) {
    return (
      <button className="flex min-h-tap flex-1 items-center gap-2 text-left" onClick={() => setEditing(true)} aria-label={t.editName}>
        <span>
          {current}
          <span className="text-muted">{t.you}</span>
        </span>
        <Icon name="edit" size={15} className="text-muted" />
      </button>
    );
  }
  return (
    <span className="flex-1 space-y-1 py-1">
      <input
        className="field min-h-[44px]"
        value={name}
        placeholder={t.yourName}
        aria-label={t.yourName}
        maxLength={40}
        autoFocus={Boolean(current)}
        onChange={(e) => setName(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
      {!current && <span className="block text-xs text-muted">{t.setNameHint}</span>}
    </span>
  );
}

function AlertsSettings() {
  const t = m.alerts.settings;
  const [prefs, setPrefs] = useState(alertPrefs());
  const [denied, setDenied] = useState(false);
  const update = (p: AlertPrefs) => {
    setPrefs(p);
    saveAlertPrefs(p);
    if (!p.enabled) void clearAlerts();
  };
  const toggleAll = async (on: boolean) => {
    if (on && canNotify) {
      const ok = await requestAlertPermission();
      setDenied(!ok);
      if (!ok) return;
    }
    update({ ...prefs, enabled: on });
  };
  return (
    <div className="card divide-y divide-line px-4">
      <Toggle checked={prefs.enabled} onChange={(v) => void toggleAll(v)} label={prefs.enabled ? t.enabled : t.enable} />
      {denied && <p className="py-3 text-sm text-[#B53A2A] dark:text-out">{t.denied}</p>}
      {prefs.enabled && (
        <>
          {canNotify && (
            <>
              <Toggle checked={prefs.predicted} onChange={(v) => update({ ...prefs, predicted: v })} label={t.predicted} hint={t.predictedHint} />
              <Toggle checked={prefs.expiry} onChange={(v) => update({ ...prefs, expiry: v })} label={t.expiry} hint={t.expiryHint} />
            </>
          )}
          <Toggle checked={prefs.others} onChange={(v) => update({ ...prefs, others: v })} label={t.others} hint={t.othersHint} />
          {!canNotify && <p className="py-3 text-sm text-muted">{t.webNote}</p>}
        </>
      )}
    </div>
  );
}

/** Al tachar algo de la lista (teléfono y reloj): sumar al stock o solo tachar. */
function TickModePicker() {
  const mode = useTickMode();
  const t = m.shopping.tick;
  return (
    <div className="card divide-y divide-line" role="radiogroup" aria-label={t.title}>
      {(['stock', 'check'] as const).map((v) => (
        <button
          key={v}
          role="radio"
          aria-checked={mode === v}
          className="flex min-h-[60px] w-full items-center gap-3 px-4 py-2 text-left"
          onClick={() => setTickMode(v)}
        >
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{v === 'stock' ? t.stock : t.check}</span>
            <span className="block text-sm text-muted">{v === 'stock' ? t.stockHint : t.checkHint}</span>
          </span>
          {mode === v && <Icon name="check" size={20} className="shrink-0 text-primary" />}
        </button>
      ))}
    </div>
  );
}
