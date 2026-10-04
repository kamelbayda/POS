import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      // Installable web app with offline support. The service worker is registered in
      // src/main.tsx only over http(s), so the Electron build (file://) is unaffected.
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null,
        includeAssets: ['icon.svg', 'apple-touch-icon.png'],
        manifest: {
          id: './',
          name: 'BeeCash – بي كاش',
          short_name: 'BeeCash',
          description: 'BeeCash: نظام الكاشير والمخزون للسوبرماركت',
          lang: 'ar',
          dir: 'rtl',
          start_url: './',
          scope: './',
          display: 'standalone',
          background_color: '#FFC21A',
          theme_color: '#1E1B16',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          // Cairo ships every subset; precache only the Arabic and Latin ones the app uses
          globIgnores: ['**/*latin-ext*', '**/*vietnamese*', '**/*cyrillic*', '**/*greek*'],
          // The app bundle is several MB; cache it whole so the till works offline.
          maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
