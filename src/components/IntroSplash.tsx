import { useEffect, useRef, useState } from 'react';
import introMp4 from '../assets/brand/stoka-intro.mp4';
import introWebm from '../assets/brand/stoka-intro.webm';
import finalFrame from '../assets/brand/stoka-intro-final.webp';
import introDarkMp4 from '../assets/brand/stoka-intro-dark.mp4';
import introDarkWebm from '../assets/brand/stoka-intro-dark.webm';
import finalFrameDark from '../assets/brand/stoka-intro-final-dark.webp';
import shortMp4 from '../assets/brand/stoka-intro-short.mp4';
import shortWebm from '../assets/brand/stoka-intro-short.webm';
import shortDarkMp4 from '../assets/brand/stoka-intro-short-dark.mp4';
import shortDarkWebm from '../assets/brand/stoka-intro-short-dark.webm';
import { m } from '../i18n';

// Clave por versión de la bienvenida: si cambia el video, cada dispositivo lo ve una vez más
const SEEN_KEY = 'stoka:intro-v2';

export function introSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return true;
  }
}

/** «Ver la bienvenida de nuevo» (Ajustes): se olvida que se vio y se recarga la app. */
export function replayIntro() {
  try {
    localStorage.removeItem(SEEN_KEY);
  } catch {
    /* modo privado */
  }
  window.location.reload();
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* modo privado */
  }
}

const VIDEOS = {
  full: { light: [introMp4, introWebm, finalFrame], dark: [introDarkMp4, introDarkWebm, finalFrameDark] },
  short: { light: [shortMp4, shortWebm, finalFrame], dark: [shortDarkMp4, shortDarkWebm, finalFrameDark] },
} as const;

/**
 * Bienvenida: la casa de Stoka se va llenando (video mudo). La primera vez en cada dispositivo, la versión
 * entera (~5 s); después, cada vez que se abre la app, la corta (~2 s). En modo oscuro, la versión oscura.
 * Un toque la saltea. Con «reducir movimiento» se muestra el cuadro final.
 */
export function IntroSplash({ onDone, short = false }: { onDone: () => void; short?: boolean }) {
  const [leaving, setLeaving] = useState(false);
  const done = useRef(false);
  const reduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const [mp4, webm, poster] = VIDEOS[short ? 'short' : 'full'][dark ? 'dark' : 'light'];

  const finish = () => {
    if (done.current) return;
    done.current = true;
    markSeen();
    setLeaving(true);
    setTimeout(onDone, 350);
  };

  useEffect(() => {
    // Respaldo por si el video no arranca (modo ahorro de energía, formato no soportado)
    const t = setTimeout(finish, reduced ? (short ? 700 : 1400) : short ? 3500 : 7000);
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
      {/* El fundido va en la capa animada: si va en la imagen, la animación lo aísla y se ve el fondo.
          Claro: fondo blanco + multiply. Oscuro: fondo negro + screen (el negro desaparece sobre el fondo de la app). */}
      <div className={`animate-intro ${dark ? 'mix-blend-screen' : 'mix-blend-multiply'}`}>
        {reduced ? (
          <img src={poster} alt={m.common.appName} className="h-72 w-72" />
        ) : (
          <video
            poster={poster}
            className="h-72 w-72"
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={() => setTimeout(finish, short ? 150 : 450)}
            aria-label={m.shell.intro.videoLabel}
          >
            <source src={mp4} type="video/mp4" />
            <source src={webm} type="video/webm" onError={finish} />
          </video>
        )}
      </div>
    </div>
  );
}
