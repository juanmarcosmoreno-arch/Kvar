import { isNative } from './platform';

export type Theme = 'system' | 'light' | 'dark';

const KEY = 'kvar:theme';
const media = () => window.matchMedia('(prefers-color-scheme: dark)');

export function getTheme(): Theme {
  try {
    return (localStorage.getItem(KEY) as Theme) || 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(t: Theme = getTheme()) {
  const dark = t === 'dark' || (t === 'system' && media().matches);
  document.documentElement.classList.toggle('dark', dark);
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute('content', dark ? '#0E1611' : '#F5F3EE'));
  if (isNative) {
    // Texto de la barra de estado de iOS acorde al tema
    void import('@capacitor/status-bar').then(({ StatusBar, Style }) =>
      StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {}),
    );
  }
}

export function setTheme(t: Theme) {
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* modo privado */
  }
  applyTheme(t);
}

if (typeof window !== 'undefined') {
  media().addEventListener?.('change', () => applyTheme());
}
