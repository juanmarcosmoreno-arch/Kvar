import { Header } from '../components/Shell';
import { Icon } from '../components/Icon';
import { needsAttention } from '../domain/status';
import { useView } from '../store/store';

/** Qué cocino — se implementa en la Fase 5 (ver docs/SPEC.md). */
export function Cook() {
  const view = useView()!;
  const available = view.products.filter((p) => p.status !== 'out').length;
  const missing = needsAttention(view.products).length;
  return (
    <>
      <Header title="¿Qué cocino?" />
      <div className="space-y-4 px-5">
        <div className="card space-y-3 p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sunken text-muted">
            <Icon name="pot" size={26} />
          </div>
          <p className="text-xl font-semibold">Muy pronto</p>
          <p className="text-muted">
            Acá vas a ver comidas para hacer con lo que tenés: «Tenés todo», «Te falta 1 cosa» y «Para aprovechar lo que vence».
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4">
            <div className="text-3xl font-semibold text-ok">{available}</div>
            <div className="text-sm text-muted">productos disponibles</div>
          </div>
          <div className="card p-4">
            <div className="text-3xl font-semibold text-low">{missing}</div>
            <div className="text-sm text-muted">para reponer</div>
          </div>
        </div>
      </div>
    </>
  );
}
