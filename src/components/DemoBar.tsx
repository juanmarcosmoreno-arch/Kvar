import { demoServer } from '../lib/demo';
import { nowIso, uuid } from '../lib/id';
import { getState, getView, openHousehold, resetLocal, sync } from '../store/store';
import { toast } from '../store/toast';
import { m } from '../i18n';

/**
 * Barra del modo demo. «Sofía marca algo» simula lo que en la app real llega en tiempo
 * real desde el teléfono de otro miembro del hogar.
 */
export function DemoBar() {
  const simulate = () => {
    const view = getView();
    if (!view) return;
    const candidates = view.products.filter((p) => p.status === 'ok' && !p.track_quantity);
    const p = candidates[Math.floor(Math.random() * candidates.length)];
    if (!p) {
      toast(m.shell.demoBar.nothingToMark(m.store.demo.partner, m.common.status.ok));
      return;
    }
    demoServer.apply({ kind: 'set_status', id: uuid(), at: nowIso(), productId: p.id, status: 'out', source: 'manual' });
    void sync();
    toast(m.shell.demoBar.marked(m.store.demo.partner, p.name, m.common.status.out));
  };

  const reset = async () => {
    const hh = getState().householdId;
    demoServer.reset();
    await resetLocal();
    if (hh) await openHousehold(hh);
    toast(m.shell.demoBar.resetDone);
  };

  return (
    <div className="mx-5 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-lime/60 bg-lime/10 px-3 py-2 text-[13px]">
      <span className="min-w-0 flex-1 text-muted">{m.shell.demoBar.label}</span>
      <button className="min-h-[36px] font-medium text-primary" onClick={simulate}>{m.shell.demoBar.simulate(m.store.demo.partner)}</button>
      <button className="min-h-[36px] text-muted" onClick={() => void reset()}>{m.shell.demoBar.reset}</button>
    </div>
  );
}

