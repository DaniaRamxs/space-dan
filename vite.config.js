import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { AccessToken } from 'livekit-server-sdk'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    build: {
      // Reducir warnings de chunk size
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          // Separar vendors grandes en chunks propios para mejor caché
          manualChunks: {
            'react-core':    ['react', 'react-dom', 'react-router-dom'],
            'framer':        ['framer-motion'],
            'supabase':      ['@supabase/supabase-js'],
            'livekit':       ['livekit-client', '@livekit/components-react'],
            'giphy':         ['@giphy/js-fetch-api', '@giphy/react-components'],
            'markdown':      ['react-markdown', 'remark-gfm', 'rehype-raw', 'rehype-sanitize'],
          },
        },
      },
    },
    server: {
      port: 5173,
      strictPort: true,
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
