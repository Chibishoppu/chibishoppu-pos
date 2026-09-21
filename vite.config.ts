import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { createRequire } from 'module';
import {defineConfig} from 'vite';

const pkg = createRequire(import.meta.url)('./package.json');

export default defineConfig(() => {
  return {
    // '/' locally & in the Android WebView; '/<repo>/' when built for GitHub Pages
    base: process.env.VITE_BASE_PATH || '/',
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['ChibishoppuLogo2.jpeg'],
        workbox: {
          // Cache all assets for offline use
          globPatterns: ['**/*.{js,css,html,ico,jpeg,jpg,png,svg,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3MB
        },
        manifest: {
          name: 'Chibishoppu POS',
          short_name: 'Chibishoppu',
          description: 'ACG Booth Point of Sale & Inventory System',
          theme_color: '#FF85A1',
          background_color: '#F4F9FE',
          display: 'standalone',
          orientation: 'any',
          // Relative paths — resolve correctly at '/' (Android/Capacitor) and '/<repo>/' (GitHub Pages)
          start_url: './',
          scope: './',
          icons: [
            {
              src: 'ChibishoppuLogo2.jpeg',
              sizes: '192x192',
              type: 'image/jpeg',
              purpose: 'any',
            },
            {
              src: 'ChibishoppuLogo2.jpeg',
              sizes: '512x512',
              type: 'image/jpeg',
              purpose: 'any',
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          // Static receipt viewer for GitHub Pages: /receipt → receipt.html
          receipt: path.resolve(__dirname, 'receipt.html'),
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
