/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };
import { viteSingleFile } from 'vite-plugin-singlefile';

const isDemo = process.env.VITE_DEMO === '1';

// Demo: un solo HTML autocontenido (sin service worker ni Supabase), salvo los videos, que van aparte.
const demoConfig = defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  base: './',
  plugins: [
    react(),
    viteSingleFile({ useRecommendedBuildConfig: false, removeViteModuleLoader: true }),
    // En la demo no hay service worker: el import de la PWA se resuelve a un módulo vacío
    {
      name: 'kvar-demo-sin-pwa',
      resolveId: (id: string) => (id === 'virtual:pwa-register' ? '\0pwa-stub' : null),
      load: (id: string) => (id === '\0pwa-stub' ? 'export function registerSW() {}' : null),
    },
  ],
  build: {
    outDir: 'dist-demo',
    assetsInlineLimit: (file: string) => !/\.(mp4|webm)$/.test(file),
    cssCodeSplit: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});

export default isDemo ? demoConfig : defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'favicon.png'],
      manifest: {
        name: 'Stoka',
        short_name: 'Stoka',
        description: 'Stock de la casa, lista de compras y qué cocinar con lo que hay.',
        lang: 'es-UY',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F6F4EE',
        theme_color: '#F6F4EE',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2,mp4,webm}'],
        // Los originales del logo (public/brand) son para generar íconos, no para la app
        globIgnores: ['brand/**'],
        navigateFallback: '/index.html',
        // Supabase nunca se cachea en el service worker: los datos offline viven en IndexedDB.
        navigateFallbackDenylist: [/^\/auth\//],
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
