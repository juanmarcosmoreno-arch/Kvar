import { useEffect, useRef, useState } from 'react';
import finalFrame from '../assets/brand/kvar-intro-final.webp';
import introMp4 from '../assets/brand/kvar-intro.mp4';
import introWebm from '../assets/brand/kvar-intro.webm';

const SEEN_KEY = 'kvar:intro-visto';

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
 * Bienvenida animada: la casa se dibuja, se llena la despensa y aparece «Kvar».
 * Solo la primera vez que se abre la app en el dispositivo. Sin sonido; un toque la saltea.
 * Con «reducir movimiento» se muestra el logo quieto un instante.
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
    // Respaldo: si el video no arranca (ahorro de batería, error), igual se sigue
    const t = setTimeout(finish, reduced ? 1200 : 7000);
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
      <div className="dark:overflow-hidden dark:rounded-[2.5rem] dark:bg-white">
        {reduced ? (
          <img src={finalFrame} alt="Kvar" className="h-72 w-72 mix-blend-multiply dark:mix-blend-normal" />
        ) : (
          <video
            poster={finalFrame}
            className="h-72 w-72 mix-blend-multiply dark:mix-blend-normal"
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={() => setTimeout(finish, 450)}
            aria-label="Kvar"
          >
            {/* MP4 (H.264) para Safari y la app de iPhone; WebM para navegadores sin H.264 */}
            <source src={introMp4} type="video/mp4" />
            <source src={introWebm} type="video/webm" onError={finish} />
          </video>
        )}
      </div>
    </div>
  );
}
