import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { AccessToken } from 'livekit-server-sdk'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig(({ mode }) => {
  // eslint-disable-next-line no-undef
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';
  // Check if we are building for Tauri or Mobile
  const isTauri = process.env.TAURI_ENV_PLATFORM !== undefined || process.env.TAURI_PLATFORM !== undefined;
  const isMobile = process.env.CAPACITOR_PLATFORM !== undefined;
  const enablePWA = isProd && !isTauri && !isMobile;
  const tauriHost = process.env.TAURI_DEV_HOST;

  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    envDir: '../',
    plugins: [
      react(),
      // Service Worker solo para versión Web pura
      enablePWA && VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        workbox: {
          // Precaché mínimo y estratégico
          globPatterns: ['**/*.{html,ico,png,svg,woff,woff2}'],
          // No precachear chunks grandes - se cachean por HTTP headers
          globIgnores: ['**/assets/*.js'],
          // Configuración moderna
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          runtimeCaching: [
            {
              // API requests - network first
              urlPattern: /https:\/\/.*\.supabase\.co\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-api',
                expiration: { maxEntries: 60, maxAgeSeconds: 300 }
              }
            },
            {
              // Imágenes - cache first
              urlPattern: /\.(png|jpg|jpeg|webp|gif|svg)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 }
              }
            }
          ]
        },
        manifest: {
          name: 'Spacely',
          short_name: 'Spacely',
          theme_color: '#050510',
          background_color: '#050510',
          display: 'standalone',
          icons: [
            { src: '/favicon.svg', sizes: '64x64', type: 'image/svg+xml' },
            { src: '/favicon.svg', sizes: '192x192', type: 'image/svg+xml' },
            { src: '/favicon.svg', sizes: '512x512', type: 'image/svg+xml' }
          ]
        },
        devOptions: {
          enabled: false
        }
      }),
    ].filter(Boolean),
    optimizeDeps: {
      include: ['konva', 'react-konva'],
    },
    worker: {
      format: 'es',
    },
    build: {
      // Reducir warnings de chunk size
      chunkSizeWarningLimit: 800,
      // Configuración limpia sin timestamps
      sourcemap: false,
      manifest: false,
      rollupOptions: {
        output: {
          // Manual chunks simple y efectivo
          manualChunks: {
            vendor: ["react", "react-dom"],
            router: ["react-router-dom"],
            supabase: ["@supabase/supabase-js"],
            framer: ["framer-motion"],
            livekit: ["livekit-client"],
            canvas: ["konva", "react-konva"],
            giphy: ["@giphy/react-components"],
          },
        },
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      // Tauri necesita conocer el host para establecer su canal IPC
      host: tauriHost || 'localhost',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Log para debug directo en la consola de la terminal
          if (req.url.includes('/api/')) {
            console.log(`[Vite Server] Solicitud recibida: ${req.method} ${req.url}`);
          }

          // Test endpoint
          if (req.url === '/api/ping') {
            res.statusCode = 200;
            res.end('¡Servidor de voz local detectado!');
            return;
          }

          // Token Generator
          if (req.url.startsWith('/api/livekit-token') && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const { roomName, participantName, userAvatar, nicknameStyle, frameId } = JSON.parse(body);

                const at = new AccessToken(
                  env.LIVEKIT_API_KEY || 'APIjSWriRpvkSbS',
                  env.LIVEKIT_API_SECRET || 'mVRhpaQfrTpCND5qYRc8gHKV1LiaXXbYacUu59fHLrH',
                  {
                    identity: 'dev-' + Math.random().toString(36).substring(7),
                    name: participantName,
                    metadata: JSON.stringify({
                      avatar: userAvatar,
                      nicknameStyle,
                      frameId
                    })
                  }
                );

                at.addGrant({
                  roomJoin: true,
                  room: roomName,
                  canPublish: true,
                  canSubscribe: true,
                  videoJoin: false,
                });

                const token = await at.toJwt();
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(JSON.stringify({ token }));
                console.log(`[Vite Server] Token generado con éxito para ${participantName}`);
              } catch (e) {
                console.error('[Vite Server] Error:', e.message);
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e.message }));
              }
            });
            return;
          }
          next();
        });
      }
    }
  }
})
