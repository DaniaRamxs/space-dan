import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,mp3}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // Aumentar límite a 10MB para las canciones
      },

      manifest: {
        name: 'Space Dan',
        short_name: 'SpaceDan',
        description: 'Una red social y arcade espacial inspirada en Dania.',
        theme_color: '#0d0d14',
        background_color: '#0d0d14',
        display: 'standalone',
        icons: [
          {
            src: '/dan_profile.jpg',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: '/dan_profile.jpg',
            sizes: '512x512',
            type: 'image/jpeg'
          }
        ]
      }
    })
  ],
})

