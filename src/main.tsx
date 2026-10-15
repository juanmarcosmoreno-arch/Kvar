import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import App from './App';
import { isDemo } from './lib/demo';
import { isNative } from './lib/platform';
import './styles/index.css';

// El service worker es para la web/PWA. En la app nativa los archivos ya vienen dentro.
if (!isNative && !isDemo) {
  void import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}

createRoot(document.getElementById('root')!).render(
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
);
