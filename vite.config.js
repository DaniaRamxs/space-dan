import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { AccessToken } from 'livekit-server-sdk'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url === '/api/livekit-token' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const { roomName, participantName, userAvatar } = JSON.parse(body);

                const at = new AccessToken(
                  env.LIVEKIT_API_KEY,
                  env.LIVEKIT_API_SECRET,
                  {
                    identity: 'local-dev-user-' + Math.random().toString(36).substring(7),
                    name: participantName,
                    metadata: JSON.stringify({ avatar: userAvatar })
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
                res.end(JSON.stringify({ token }));
              } catch (e) {
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
