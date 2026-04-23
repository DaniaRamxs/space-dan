# Spacely (mi-saas)

Red social gamificada con temática espacial. Stack: Next.js 16 + React 19 + TypeScript + Supabase + Tailwind 3.4 + Framer Motion.

Plataformas soportadas: Web (joinspacely.com), Desktop (Tauri), Mobile (Capacitor APK).

## Docs técnicas

Ver `docs/` para documentación de decisiones arquitecturales y fixes importantes:

- [`docs/BUGS_FIXED_2026-04-19.md`](./docs/BUGS_FIXED_2026-04-19.md) — registro de bugs del APK Android y sus fixes
- [`docs/CAPACITOR_SPA_ROUTING.md`](./docs/CAPACITOR_SPA_ROUTING.md) — arquitectura SPA en Capacitor (router manual)
- [`BUSINESS_LOGIC.md`](./BUSINESS_LOGIC.md) — lógica de negocio de Spacely

## Scripts

```bash
npm run dev          # Next dev server (web)
npm run build        # Build web production
npm run build:static # Static export para Capacitor/Tauri
npm run cap:sync     # build:static + sync a android/
npm run cap:android  # cap:sync + abrir Android Studio
npm run tauri:dev    # Tauri desktop en dev
npm run tauri:build  # Tauri desktop build
```

## Build del APK Android

```bash
npm run cap:sync
cd android
./gradlew.bat assembleDebug
# → android/app/build/outputs/apk/debug/app-universal-debug.apk
```

## Estructura

```
src/
  app/                  # Next.js App Router (para web)
    client.tsx         # HomePageClient — router manual SPA para Capacitor/Tauri
    (main)/            # Rutas bajo GardenLayout
  pages/                # Páginas reales (lazy-imported por client.tsx en native)
  layouts/GardenLayout.jsx
  components/           # UI compartida
  contexts/             # AuthContext, EconomyContext, UniverseContext, YouTubeContext
  services/             # Supabase, Colyseus, YouTube, manga, etc.
  shims/react-router-dom.tsx  # Shim de react-router sobre NextLink/router
  styles/spacely.css
server/                 # Colyseus + Express (Railway)
android/                # Proyecto Android (Capacitor)
scripts/fix-static-routes.mjs  # Post-build: SPA shell para Capacitor
```

## Plataformas nativas

**Android (Capacitor):** ver `CAPACITOR_SPA_ROUTING.md` para detalles del routing en APK. El shell HTML se clona sobre todas las rutas via `fix-static-routes.mjs` y `src/app/client.tsx` actúa como router SPA.

**Desktop (Tauri):** mismo build estático. Config en `src-tauri/`.

**Web (joinspacely.com):** build de Next.js normal, sin los overrides de native.

## Servidor

`server/` es un proceso Node con Colyseus (WebSocket para actividades multiplayer) + Express (API REST para YouTube, audio, manga, communities, activities). Desplegado en Railway en `spacely-server-production.up.railway.app`.

Endpoints clave:
- `POST /matchmake/:method/:room` — Colyseus matchmaking
- `GET /api/youtube/search?q=` — búsqueda YouTube (backend scraping)
- `GET /api/audio/:videoId` — stream de audio de YouTube
- `GET /api/manga/*` — proxy MangaDex
- `/api/communities/*`, `/api/activities/*` — auth required (Supabase JWT)

CORS allowlist en `server/index.mjs` incluye `http://localhost`, `https://localhost`, `capacitor://localhost`, `tauri://localhost` para todas las variantes de Capacitor/Tauri.
