import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['/assets/logo.JPG'],
      manifest: {
        name: 'U-Global Horizons - Wealth Creation Nigeria',
        short_name: 'U-Global Horizons',
        description: 'Nigeria\'s leading wealth creation and asset management company offering structured savings, investment management, real estate brokerage, livestock farming, and financial advisory services.',
        theme_color: '#2563eb',
        background_color: '#2563eb',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/assets/logo.JPG',
            sizes: '192x192',
            type: 'image/jpeg',
            purpose: 'any maskable'
          },
          {
            src: '/assets/logo.JPG',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,mp4,jpg,jpeg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\/api\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 300 // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 86400 // 24 hours
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.(?:mp4|webm)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'videos',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 604800 // 7 days
              }
            }
          }
        ],
        skipWaiting: false,
        clientsClaim: true
      },
      injectRegister: 'auto',
      devOptions: {
        enabled: true
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})