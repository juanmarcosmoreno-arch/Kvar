import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // ⚠️ Cambialo por tu propio identificador ANTES de registrar la app en App Store Connect:
  // una vez creado no se puede cambiar.
  appId: 'uy.kvar.app',
  appName: 'Kvar',
  webDir: 'dist',
  ios: {
    // Los márgenes de la muesca y la barra de inicio los maneja el CSS con env(safe-area-inset-*)
    contentInset: 'never',
    backgroundColor: '#F5F3EE',
    scheme: 'Kvar',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      launchAutoHide: true,
      backgroundColor: '#F5F3EE',
      showSpinner: false,
    },
  },
};

export default config;
