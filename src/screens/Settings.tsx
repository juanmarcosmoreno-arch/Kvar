import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Shell';
import { Icon, type IconName } from '../components/Icon';
import { Toggle } from '../components/Toggle';
import type { Category, Location } from '../domain/types';
import { isStandalone } from '../lib/auth';
import { APP_VERSION, isNative, PUBLIC_URL } from '../lib/platform';
import { categoryIcon, locationIcon } from '../lib/categoryIcon';
import { isDemo } from '../lib/demo';
import { deleteMyAccount, regenerateInviteCode } from '../lib/remote';
import { supabase } from '../lib/supabase';
import { getTheme, setTheme, type Theme } from '../lib/theme';
import {
  deleteCategory, deleteLocation, moveCategory, saveCategory, saveLocation, updateHousehold,
} from '../store/actions';
import { resetLocal, sync, useStore, useView } from '../store/store';
import { toast } from '../store/toast';

export function Settings({ userId, onSwitchHousehold }: { userId: string; onSwitchHousehold: () => void }) {
  const view = useView()!;
  const navigate = useNavigate();
  const online = useStore((s) => s.online);
  const [hhName, setHhName] = useState(view.household.name);
  const [theme, setThemeState] = useState<Theme>(getTheme());
  useEffect(() => setHhName(view.household.name), [view.household.name]);

  const link = `${PUBLIC_URL}/unirse/${view.household.invite_code}`;

  const share = async () => {
    if (isDemo) {
      toast(`En la app real esto comparte el link de invitación. Código: ${view.household.invite_code}`);
      return;
    }
    const text = `Sumate a «${view.household.name}» en Kvar: ${link}  (código ${view.household.invite_code})`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Kvar', text, url: link });
      } catch {
        /* cancelado */
      }
    } else {
      await navigator.clipboard?.writeText(text);
      toast('Copié el link de invitación.');
    }
  };

  const regenerate = async () => {
    try {
      await regenerateInviteCode(view.household.id);
      await sync();
      toast('Código nuevo listo. El anterior ya no sirve.');
    } catch {
      toast('Necesitás conexión para cambiar el código.');
    }
  };

  const signOut = async () => {
    await resetLocal();
    await supabase.auth.signOut();
  };

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
      toast('No se pudo borrar la cuenta. ¿Tenés conexión?');
    }
  };

  return (
    <>
      <Header
        title="Ajustes"
        left={
          <button className="-ml-3 flex min-h-tap min-w-tap items-center justify-center text-muted" aria-label="Volver" onClick={() => navigate(-1)}>
            <Icon name="back" />
          </button>
        }
      />
      <div className="space-y-8 px-5 pb-6">
        {!isNative && !isStandalone() && (
          <div className="card space-y-1 border border-lime/50 p-4">
            <p className="font-semibold">Instalá Kvar en tu iPhone</p>
            <p className="text-sm text-muted">
              En Safari tocá <strong>Compartir</strong> <Icon name="share" size={14} className="inline" /> y después{' '}
              <strong>Agregar a inicio</strong>. Así abre como app y funciona sin conexión.
            </p>
          </div>
        )}

        <Section title="Hogar">
          <div className="card space-y-4 p-4">
            <input
              className="field"
              value={hhName}
              onChange={(e) => setHhName(e.target.value)}
              onBlur={() => hhName.trim() && hhName.trim() !== view.household.name && updateHousehold({ name: hhName.trim() })}
              aria-label="Nombre del hogar"
            />
            <div className="rounded-2xl bg-sunken p-4 text-center">
              <p className="text-sm text-muted">Código de invitación</p>
              <p className="font-mono text-3xl font-semibold tracking-[0.25em]">{view.household.invite_code}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-primary" onClick={share}>
                <Icon name="share" size={20} /> Invitar
              </button>
              <button className="btn-ghost" onClick={regenerate} disabled={!online}>
                <Icon name="sync" size={20} /> Nuevo código
              </button>
            </div>
            <ul className="divide-y divide-line">
              {view.members.map((m) => (
                <li key={m.user_id} className="flex min-h-[48px] items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary">
                    {(m.display_name ?? '?').slice(0, 1).toUpperCase()}
                  </span>
                  <span className="flex-1">
                    {m.display_name ?? 'Sin nombre'}
                    {m.user_id === userId && <span className="text-muted"> (vos)</span>}
                  </span>
                  {m.role === 'owner' && <span className="text-xs text-muted">Creó el hogar</span>}
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <Section title="Lista de compras">
          <div className="card px-4">
            <Toggle
              checked={view.household.list_on_low}
              onChange={(v) => updateHousehold({ list_on_low: v })}
              label="Agregar también lo que queda poco"
              hint="Si está apagado, solo van a la lista los básicos que quedan poco y lo que no hay."
            />
          </div>
        </Section>

        <Section title="Lugares">
          <EditableList<Location>
            items={[...view.locations].sort((a, b) => a.sort_order - b.sort_order)}
            icon={(l) => locationIcon(l.icon, l.name)}
            onRename={(l, name) => saveLocation({ ...l, name })}
            onDelete={(l) => deleteLocation(l.id)}
            onAdd={(name) => saveLocation({ name })}
            placeholder="Nuevo lugar (ej: Despensa)"
          />
        </Section>

        <Section title="Categorías" hint="El orden es el del recorrido del súper: así se ordena la lista.">
          <EditableList<Category>
            items={[...view.categories].sort((a, b) => a.sort_order - b.sort_order)}
            icon={(c) => categoryIcon(c.name)}
            onRename={(c, name) => saveCategory({ ...c, name })}
            onDelete={(c) => deleteCategory(c.id)}
            onAdd={(name) => saveCategory({ name })}
            onMove={(c, dir) => moveCategory(c.id, dir)}
            placeholder="Nueva categoría"
          />
        </Section>

        <Section title="Apariencia">
          <div className="card grid grid-cols-3 gap-1 p-1">
            {(['system', 'light', 'dark'] as Theme[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTheme(t); setThemeState(t); }}
                className={`min-h-tap rounded-2xl text-sm font-medium ${theme === t ? 'bg-primary text-on-primary' : 'text-muted'}`}
              >
                {t === 'system' ? 'Automático' : t === 'light' ? 'Claro' : 'Oscuro'}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Cuenta">
          <div className="grid gap-2">
            <button className="btn-ghost w-full" onClick={onSwitchHousehold}>Crear otro hogar o sumarme a uno</button>
            {!isDemo && <button className="btn w-full text-out" onClick={signOut}>Cerrar sesión</button>}
          </div>
          {deleting === 'idle' ? (
            <button className="btn w-full text-sm text-muted" onClick={() => setDeleting('confirm')}>
              Borrar mi cuenta
            </button>
          ) : (
            <div className="card space-y-3 border-out/40 p-4">
              <p className="font-medium">¿Borrar tu cuenta para siempre?</p>
              <p className="text-sm text-muted">
                {alone
                  ? `Sos la única persona en «${view.household.name}», así que también se borran el hogar, sus productos y su lista.`
                  : `Salís de «${view.household.name}». El hogar y sus datos quedan para los demás miembros.`}{' '}
                No se puede deshacer.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button className="btn-ghost" onClick={() => setDeleting('idle')} disabled={deleting === 'busy'}>Cancelar</button>
                <button className="btn bg-out text-white" onClick={deleteAccount} disabled={deleting === 'busy' || !online}>
                  {deleting === 'busy' ? 'Borrando…' : 'Sí, borrar'}
                </button>
              </div>
              {!online && <p className="text-xs text-muted">Necesitás conexión para borrar la cuenta.</p>}
            </div>
          )}
        </Section>
        <p className="text-center text-xs text-muted">Kvar {APP_VERSION} · «lo que queda»</p>
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
            aria-label={`Nombre de ${it.name}`}
          />
          {onMove && (
            <>
              <button className="flex min-h-tap min-w-[36px] items-center justify-center text-muted disabled:opacity-30" disabled={i === 0} onClick={() => onMove(it, -1)} aria-label="Subir">
                <Icon name="up" size={18} />
              </button>
              <button className="flex min-h-tap min-w-[36px] items-center justify-center text-muted disabled:opacity-30" disabled={i === items.length - 1} onClick={() => onMove(it, 1)} aria-label="Bajar">
                <Icon name="down" size={18} />
              </button>
            </>
          )}
          {confirm === it.id ? (
            <button className="min-h-tap px-3 text-sm font-semibold text-out" onClick={() => { onDelete(it); setConfirm(null); }}>
              ¿Borrar?
            </button>
          ) : (
            <button className="flex min-h-tap min-w-tap items-center justify-center text-muted" onClick={() => setConfirm(it.id)} aria-label={`Borrar ${it.name}`}>
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
        {draft.trim() && <button className="min-h-tap px-3 font-semibold text-primary">Agregar</button>}
      </form>
    </div>
  );
}
