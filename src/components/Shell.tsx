import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { openCount } from '../domain/shoppingList';
import { useView } from '../store/store';
import { UIContext, type AddDefaults, type ScanMode } from '../store/ui';
import { ScanSheet } from './ScanSheet';
import { QuantitySheet } from './QuantitySheet';
import { ReceiptSheet } from './ReceiptSheet';
import { VoiceSheet } from './VoiceSheet';
import type { QuantityMode } from '../domain/quantity';
import { DemoBar } from './DemoBar';
import { isDemo } from '../lib/demo';
import { AddProductSheet } from './AddProductSheet';
import { Icon, type IconName } from './Icon';
import { ProductSheet } from './ProductSheet';
import { RanOutSheet } from './RanOutSheet';
import { Sheet } from './Sheet';
import { ToastView } from './Toast';
import { m } from '../i18n';

export function Shell({ children }: { children: ReactNode }) {
  const [productId, setProductId] = useState<string | null>(null);
  const [addDefaults, setAddDefaults] = useState<AddDefaults | null>(null);
  const [ranOut, setRanOut] = useState(false);
  const [actions, setActions] = useState(false);
  const [scan, setScan] = useState<{ mode: ScanMode; productId?: string } | null>(null);
  const [quantity, setQuantityTarget] = useState<{ productId: string; mode: QuantityMode } | null>(null);
  const [receipt, setReceipt] = useState(false);
  const [voice, setVoice] = useState(false);

  const ui = {
    openProduct: (id: string) => {
      setAddDefaults(null);
      setProductId(id);
    },
    openAdd: (d: AddDefaults = {}) => setAddDefaults(d),
    openRanOut: () => setRanOut(true),
    openScan: (mode: ScanMode, productId?: string) => {
      setRanOut(false);
      setProductId(null);
      setScan({ mode, productId });
    },
    openQuantity: (productId: string, mode: QuantityMode) => {
      setScan(null);
      setQuantityTarget({ productId, mode });
    },
    openReceipt: () => setReceipt(true),
    openVoice: () => setVoice(true),
  };

  return (
    <UIContext.Provider value={ui}>
      <div className="mx-auto flex min-h-full max-w-lg flex-col md:max-w-2xl pb-[calc(env(safe-area-inset-bottom)+88px)] pt-[env(safe-area-inset-top)]">
        {isDemo && <DemoBar />}
        {children}
      </div>
      <TabBar onFab={() => setActions(true)} />
      <ToastView />

      <Sheet open={actions} onClose={() => setActions(false)} title={m.shell.actions.title}>
        <div className="grid gap-3 pb-4">
          <BigAction
            icon="minus"
            title={m.shell.actions.ranOut.title}
            hint={m.shell.actions.ranOut.hint}
            onClick={() => { setActions(false); setRanOut(true); }}
          />
          <BigAction
            icon="mic"
            title={m.shell.actions.voice.title}
            hint={m.shell.actions.voice.hint}
            onClick={() => { setActions(false); setVoice(true); }}
          />
          <BigAction
            icon="barcode"
            title={m.shell.actions.scan.title}
            hint={m.shell.actions.scan.hint}
            onClick={() => { setActions(false); ui.openScan('ask'); }}
          />
          <BigAction
            icon="cart"
            title={m.shell.actions.bought.title}
            hint={m.shell.actions.bought.hint(m.common.status.ok)}
            onClick={() => { setActions(false); ui.openScan('bought'); }}
          />
          <BigAction
            icon="receipt"
            title={m.shell.actions.receipt.title}
            hint={m.shell.actions.receipt.hint}
            onClick={() => { setActions(false); setReceipt(true); }}
          />
          <BigAction
            icon="plus"
            title={m.shell.actions.add.title}
            hint={m.shell.actions.add.hint}
            onClick={() => { setActions(false); setAddDefaults({}); }}
          />
        </div>
      </Sheet>

      <RanOutSheet open={ranOut} onClose={() => setRanOut(false)} />
      <AddProductSheet defaults={addDefaults} onClose={() => setAddDefaults(null)} onOpenExisting={ui.openProduct} />
      <ProductSheet productId={productId} onClose={() => setProductId(null)} />
      <ScanSheet mode={scan?.mode ?? null} productId={scan?.productId} onClose={() => setScan(null)} />
      <QuantitySheet target={quantity} onClose={() => setQuantityTarget(null)} />
      <ReceiptSheet open={receipt} onClose={() => setReceipt(false)} />
      <VoiceSheet open={voice} onClose={() => setVoice(false)} />
    </UIContext.Provider>
  );
}

function BigAction({ icon, title, hint, onClick }: { icon: IconName; title: string; hint: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="card flex min-h-[72px] items-center gap-4 px-4 text-left active:scale-[0.99]">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon name={icon} />
      </span>
      <span>
        <span className="block text-lg font-semibold">{title}</span>
        <span className="block text-sm text-muted">{hint}</span>
      </span>
    </button>
  );
}

function TabBar({ onFab }: { onFab: () => void }) {
  const view = useView();
  const count = view ? openCount(view.list) : 0;
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      aria-label={m.shell.nav.label}
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 items-end px-2 md:max-w-2xl">
        <Tab to="/" icon="home" label={m.shell.nav.home} />
        <Tab to="/inventario" icon="box" label={m.shell.nav.products} />
        <div className="flex justify-center">
          <button
            onClick={onFab}
            aria-label={m.shell.nav.quickActions}
            className="-mt-5 mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-fab active:scale-95"
          >
            <Icon name="plus" size={26} strokeWidth={2} />
          </button>
        </div>
        <Tab to="/lista" icon="cart" label={m.shell.nav.list} badge={count} />
        <Tab to="/cocino" icon="pot" label={m.shell.nav.cook} />
      </div>
    </nav>
  );
}

function Tab({ to, icon, label, badge }: { to: string; icon: IconName; label: string; badge?: number }) {
  const navigate = useNavigate();
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={(e) => {
        // Volver a tocar la pestaña activa sube al inicio
        if (window.location.pathname === to) {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          navigate(to);
        }
      }}
      className={({ isActive }) =>
        `relative flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
          isActive ? 'text-primary' : 'text-muted'
        }`
      }
    >
      <span className="relative">
        <Icon name={icon} size={24} strokeWidth={1.6} />
        {badge ? (
          <span className="absolute -right-2.5 -top-1.5 min-w-[18px] rounded-full bg-out px-1 text-center text-[11px] font-semibold leading-[18px] text-white">
            {badge > 99 ? '99+' : badge}
          </span>
        ) : null}
      </span>
      {label}
    </NavLink>
  );
}

export function Header({ title, right, left }: { title: ReactNode; right?: ReactNode; left?: ReactNode }) {
  return (
    <header className="flex min-h-[64px] items-center gap-2 px-5 pt-2">
      {left}
      <h1 className="flex-1 text-[1.6rem] font-semibold leading-tight tracking-tight">{title}</h1>
      {right}
    </header>
  );
}
