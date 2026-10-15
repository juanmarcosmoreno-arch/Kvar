import { useEffect, useRef, useState } from 'react';
import introMp4 from '../assets/brand/stoka-intro.mp4';
import introWebm from '../assets/brand/stoka-intro.webm';
import finalFrame from '../assets/brand/stoka-intro-final.webp';

const SEEN_KEY = 'kvar:intro-visto'; // clave interna: se mantiene para no repetir la bienvenida

export function introSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return true;
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* modo privado */
  }
}

/**
 * Bienvenida: la casa de Stoka se va llenando (video mudo, ~5 s). Solo la primera vez en cada
 * dispositivo; un toque la saltea. Con «reducir movimiento» se muestra el cuadro final.
 */
export function IntroSplash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const done = useRef(false);
  const reduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const finish = () => {
    if (done.current) return;
    done.current = true;
    markSeen();
    setLeaving(true);
    setTimeout(onDone, 350);
  };

  useEffect(() => {
    // Respaldo por si el video no arranca (modo ahorro de energía, formato no soportado)
    const t = setTimeout(finish, reduced ? 1400 : 7000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="presentation"
      onClick={finish}
      className={`fixed inset-0 z-[70] flex items-center justify-center bg-bg transition-opacity duration-300 ${
        leaving ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* El fundido va en la capa animada: si va en la imagen, la animación lo aísla y se ve el blanco */}
      <div className="animate-intro mix-blend-multiply dark:overflow-hidden dark:rounded-[2.5rem] dark:bg-white dark:p-4 dark:mix-blend-normal">
        {reduced ? (
          <img src={finalFrame} alt="Stoka" className="h-72 w-72" />
        ) : (
          <video
            poster={finalFrame}
            className="h-72 w-72"
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={() => setTimeout(finish, 450)}
            aria-label="Stoka: la casa se llena de productos"
          >
            <source src={introMp4} type="video/mp4" />
            <source src={introWebm} type="video/webm" onError={finish} />
          </video>
        )}
      </div>
    </div>
  );
}
