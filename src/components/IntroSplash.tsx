import { useEffect, useRef, useState } from 'react';
import logo from '../assets/brand/stoka-logo.webp';

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
 * Bienvenida: aparece el logo de Stoka. Solo la primera vez en cada dispositivo; un toque la saltea.
 * (Si se agrega un video del logo, va acá, como en la versión anterior.)
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
    const t = setTimeout(finish, reduced ? 1200 : 2400);
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
        <img src={logo} alt="Stoka" className="h-72 w-auto" />
      </div>
    </div>
  );
}
