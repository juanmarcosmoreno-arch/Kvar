import { Header } from '../components/Shell';
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
          <div className="text-5xl" aria-hidden>🍲</div>
          <p className="font-round text-xl font-bold">Muy pronto</p>
          <p className="text-muted">
            Acá vas a ver comidas para hacer con lo que tenés: «Tenés todo», «Te falta 1 cosa» y «Para aprovechar lo que vence».
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4">
            <div className="font-round text-3xl font-bold text-ok">{available}</div>
            <div className="text-sm text-muted">productos disponibles</div>
          </div>
          <div className="card p-4">
            <div className="font-round text-3xl font-bold text-low">{missing}</div>
            <div className="text-sm text-muted">para reponer</div>
          </div>
        </div>
      </div>
    </>
  );
}
