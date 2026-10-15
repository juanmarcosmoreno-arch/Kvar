import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import App from './App';
import { initI18n } from './i18n';
import { isDemo } from './lib/demo';
import { isNative } from './lib/platform';
import './styles/index.css';

// El service worker es para la web/PWA. En la app nativa los archivos ya vienen dentro.
if (!isNative && !isDemo) {
  void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}

// El idioma se elige antes de dibujar (si no es español, se carga su archivo de textos)
void initI18n().then(() => createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* La demo corre dentro de un marco sin URLs propias: navegación en memoria */}
    {isDemo ? (
      <MemoryRouter>
        <App />
      </MemoryRouter>
    ) : (
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )}
  </StrictMode>,
));
