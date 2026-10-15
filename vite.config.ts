/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['brand/kvar-mark.svg', 'icons/apple-touch-icon.png', 'favicon.svg'],
      manifest: {
        name: 'Kvar — lo que queda',
        short_name: 'Kvar',
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
