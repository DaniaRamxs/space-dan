import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { AccessToken } from 'livekit-server-sdk'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  // eslint-disable-next-line no-undef
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';
  // En Tauri dev, el host se inyecta via variable de entorno
  // eslint-disable-next-line no-undef
  const tauriHost = process.env.TAURI_DEV_HOST;

  return {
    plugins: [
      react(),
      // Service Worker solo en producción (evita problemas en dev/Capacitor)
      isProd && VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        workbox: {
          // Precaché: JS, CSS, HTML, fuentes e íconos
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          // No precachear chunks grandes (livekit, konva) — se cachean en runtime
          globIgnores: ['**/livekit-*.js', '**/konva-*.js', '**/canvas-*.js', '**/games-*.js'],
          // Limpieza agresiva de cache
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          runtimeCaching: [
            {
              // API Supabase: network-first con fallback a caché 5 min
              urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'supabase-api',
                expiration: { maxEntries: 60, maxAgeSeconds: 300 },
                networkTimeoutSeconds: 5,
              },
            },
            {
              // Avatares e imágenes: cache-first (cambian poco)
              urlPattern: /\.(png|jpg|jpeg|webp|gif|svg)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
              },
            },
            {
              // Chunks de React core: stale-while-revalidate
              urlPattern: /react-core.*\.js$/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'react-core',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 },
              },
            },
            {
              // Chunks de juegos: cache-first (cambian poco)
              urlPattern: /games.*\.js$/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'games',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 7 },
              },
            },
            {
              // Fuentes: cache-first
              urlPattern: /\.(woff|woff2|ttf|eot)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'fonts',
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
        manifest: {
          name: 'Space-Dan',
          short_name: 'SpaceDan',
          theme_color: '#050510',
          background_color: '#050510',
          display: 'standalone',
          icons: [
            { src: '/favicon.ico', sizes: '64x64', type: 'image/x-icon' },
          ],
        },
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
      rollupOptions: {
        output: {
          // Separar vendors grandes en chunks propios para mejor caché y reducir tamaño
          manualChunks: (id) => {
            // Core React - siempre cargado
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'react-core';
            }
            // Animaciones - cargar bajo demanda
            if (id.includes('framer-motion')) {
              return 'framer';
            }
            // Base de datos - cargar bajo demanda
            if (id.includes('supabase')) {
              return 'supabase';
            }
            // Voice/WebRTC - cargar solo en voice rooms
            if (id.includes('livekit')) {
              return 'livekit';
            }
            // Gifs - cargar solo en chat
            if (id.includes('giphy')) {
              return 'giphy';
            }
            // Markdown - cargar solo en posts
            if (id.includes('react-markdown') || id.includes('remark') || id.includes('rehype')) {
              return 'markdown';
            }
            // Canvas/Juegos - cargar solo en juegos
            if (id.includes('konva') || id.includes('react-konva') || id.includes('use-image')) {
              return 'canvas';
            }
            // Juegos individuales - chunk separado
            if (id.includes('/components/TetrisGame') || 
                id.includes('/components/SnakeGame') || 
                id.includes('/components/PixelGalaxy') ||
                id.includes('/components/AsteroidBattle')) {
              return 'games-core';
            }
            // UI Components pesados
            if (id.includes('lucide-react') || id.includes('@radix-ui')) {
              return 'ui-vendor';
            }
            // Vendors generales
            if (id.includes('node_modules')) {
              return 'vendor';
            }
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
