# Bugs & Fixes — APK Debug Session (2026-04-18 / 2026-04-19)

Sesión completa de debugging del APK Android de Spacely (mi-saas). Se reportaron 8 bugs iniciales, más 3 regresiones introducidas durante el proceso y una reescritura arquitectural final (SPA puro) que se documenta en `CAPACITOR_SPA_ROUTING.md`.

---

## Índice

1. [Bug 1 — Hub "Más" tab no navega a Explorar](#bug-1--hub-más-tab-no-navega-a-explorar)
2. [Bug 2 — Franja gris al abrir teclado en chat](#bug-2--franja-gris-al-abrir-teclado-en-chat)
3. [Bug 3 — Click en avatar/nombre de post no navega al perfil](#bug-3--click-en-avatarnombre-de-post-no-navega-al-perfil)
4. [Bug 4 — Voice chat entra muteado sin poder desmutear](#bug-4--voice-chat-entra-muteado-sin-poder-desmutear)
5. [Bug 5 — Actividades Colyseus no conectan (servidor caído)](#bug-5--actividades-colyseus-no-conectan-servidor-caído)
6. [Bug 6 — API YouTube devuelve videos default (Gangnam Style)](#bug-6--api-youtube-devuelve-videos-default-gangnam-style)
7. [Bug 7 — CoOpPuzzle sin acceso a galería](#bug-7--coop-puzzle-sin-acceso-a-galería)
8. [Bug 8 — MangaDex no conecta](#bug-8--mangadex-no-conecta)
9. [Regresión 1 — CSS comment inválido en `.hubOverlay`](#regresión-1--css-comment-inválido-en-huboverlay)
10. [Regresión 2 — Framer-motion deja componentes en `opacity:0`](#regresión-2--framer-motion-deja-componentes-en-opacity0)
11. [Regresión 3 — `HomePageClient` redirige a `/posts` desde cualquier ruta](#regresión-3--homepageclient-redirige-a-posts-desde-cualquier-ruta)
12. [Lecciones aprendidas](#lecciones-aprendidas)

---

## Bug 1 — Hub "Más" tab no navega a Explorar

### Síntoma
Al tocar "Más" en el nav inferior, el overlay abría pero tocar "Explorar Centro" mostraba **"This page couldn't load"** (mensaje del Chrome WebView).

### Causa raíz
Next.js App Router con `output: 'export'` hace client-side navigation intentando cargar el **RSC payload** (`.txt` flight data) de la ruta destino. En el WebView de Capacitor, ese fetch falla silenciosamente y Chrome muestra el error genérico.

### Fix final
Migración a SPA puro (`src/app/client.tsx`). Se evita completamente el client router de Next.js en native — `HomePageClient` decide qué componente renderizar basado en `window.location.pathname`.

### Archivos tocados
- `src/app/client.tsx`
- `scripts/fix-static-routes.mjs`

---

## Bug 2 — Franja gris al abrir teclado en chat

### Síntoma
En GlobalChat, al abrir el teclado Android, el área de mensajes se convertía en un bloque gris grande que ocultaba todo el chat.

### Causa raíz
`src/styles/spacely.css` línea ~68:
```css
html, body, #root {
  height: 100%;
  min-height: 100dvh;   /* ← bloqueaba el resize del WebView */
}
```

Cuando Capacitor `Keyboard.resize: "native"` reducía el viewport para el teclado, `min-height: 100dvh` mantenía el body en la altura original. El contenido quedaba fuera del WebView visible y se mostraba el background gris del compositor.

### Fix
Se removió `min-height: 100dvh` del body/html/#root. Dejar solo `height: 100%` + la cadena flex de los layouts.

### Archivos tocados
- `src/styles/spacely.css`
- `src/pages/GlobalChatPage.jsx` (MobileChatLayout también usa `visualViewport.height` como backup)

---

## Bug 3 — Click en avatar/nombre de post no navega al perfil

### Síntoma
Tocar avatar o username en un post no abría el perfil del usuario — la pantalla no cambiaba.

### Causa raíz
`ActivityCard.jsx` y `BlogPostCard.jsx` usaban el patrón:
```jsx
to={username ? `/@${username}` : `/profile/${author_id}`}
```
El shim `react-router-dom` reescribe `/@username` al placeholder `/_/?_u=username` que cae en `out/_/index.html` (shell de `[username]`). En Capacitor, el RSC fetch de ese placeholder fallaba silenciosamente.

### Fix
1. Priorizar `/profile/:id` sobre `/@username` — la ruta `/profile/_/` tiene un shell dinámico propio que es más estable en static export.
2. Fix final: migración a SPA puro — `HomePageClient` matchea `/profile/*` directamente y renderiza `ProfilePublic`.

### Archivos tocados
- `src/components/Social/ActivityCard.jsx`
- `src/components/Social/BlogPostCard.jsx`

---

## Bug 4 — Voice chat entra muteado sin poder desmutear

### Síntoma
Al entrar a una sala de voz, el micrófono aparecía muteado y `setMicrophoneEnabled(true)` no desmuteaba. El botón alternaba el ícono pero el audio nunca se publicaba.

### Causa raíz
`<LiveKitRoom audio={true}>` dispara `getUserMedia({audio: true})` al montar. En Android 14+ sin el permiso `RECORD_AUDIO` previamente concedido por el runtime, `getUserMedia` falla silenciosamente y LiveKit deja el track vacío. Luego `setMicrophoneEnabled(true)` no puede re-adquirir el mic sin pedir permiso nuevamente.

### Fix
Agregado estado `micReady` en `VoiceRoomUI.jsx` que gate el render de `<LiveKitRoom>`:
1. Al abrir la sala, se llama `VoiceServicePlugin.start()` que pide `RECORD_AUDIO` en runtime.
2. Solo cuando el permiso es concedido, `micReady = true` y `<LiveKitRoom>` monta.
3. Fallback: si `VoiceServicePlugin` no está registrado, usa `navigator.mediaDevices.getUserMedia({audio:true})` para forzar el prompt.

### Archivos tocados
- `src/components/VoiceRoom/VoiceRoomUI.jsx`
- `android/app/src/main/java/com/dan/space/VoiceServicePlugin.java` (ya existente de sesión previa)

---

## Bug 5 — Actividades Colyseus no conectan (servidor caído)

### Síntoma
Ninguna actividad (Chess, Snake, Poker, etc.) conectaba al servidor. Error "nunca detecta el host".

### Causa raíz — dos capas

**Capa 1 — Código del cliente:**
`src/services/colyseusClient.js` hacía:
```js
return window.location.hostname === 'localhost'
  ? `ws://${hostname}:2567`
  : PROD_URL;
```
En Capacitor Android, `window.location.hostname === 'localhost'` (es el scheme interno). El cliente intentaba conectar a `ws://localhost:2567` en el propio dispositivo.

**Capa 2 — Servidor Railway caído:**
El deploy de Railway estaba crasheando con:
```
Cannot find package 'node-cache' imported from /app/youtubeSearch.mjs
ERR_MODULE_NOT_FOUND
```
En una sesión anterior (commit `9184047`) se eliminó `node-cache` del `package.json` pero `server/modules/audio/audioService.mjs` seguía importándolo.

### Fix — dos capas

**Fix 1 — Cliente:**
Agregado `isNativePlatform()` check. En Capacitor/Tauri, usa siempre la URL de Railway.

**Fix 2 — Servidor:**
Reemplazado `NodeCache` por un Map con TTL en `audioService.mjs`. Commit `14eb15b`, pusheado a main, Railway redesplegó OK.

### Archivos tocados
- `src/services/colyseusClient.js`
- `src/components/VoiceActivities/BeatSound.jsx` (fallback URL)
- `server/modules/audio/audioService.mjs`

---

## Bug 6 — API YouTube devuelve videos default (Gangnam Style)

### Síntoma
Jukebox / BeatSound mostraba siempre los mismos 5 videos fallback (Rick Astley, Gangnam Style, Despacito, Uptown Funk, Adele) sin importar la búsqueda.

### Causa raíz
`src/services/youtubeService.js` tenía un `_getFallbackVideos()` que se invoca cuando el fetch al backend falla. El backend fetch fallaba porque el server Express rechazaba el request con **500 CORS** — el Capacitor Android WebView manda `Origin: https://localhost` (androidScheme=https default en Capacitor v5+), y esa origin **no estaba en el allowlist** del server:

```js
// server/index.mjs — allowedOrigins antes del fix
const allowedOrigins = [
  "http://localhost",        // ✓
  "capacitor://localhost",   // ✓
  // "https://localhost"     ← ❌ faltaba
];
```

### Fix
Agregado `"https://localhost"` al allowlist del server. Fix afecta también `/api/audio`, `/api/communities`, `/api/activities` — toda llamada HTTP desde el APK que antes caía en 500 CORS ahora responde 200.

### Archivos tocados
- `server/index.mjs`

---

## Bug 7 — CoOpPuzzle sin acceso a galería

### Síntoma
En CoOpPuzzle, al intentar subir una foto, no aparecía el prompt de selección de galería. El botón de upload no respondía.

### Causa raíz
`AndroidManifest.xml` no declaraba los permisos de lectura de media necesarios:
- `READ_MEDIA_IMAGES` (Android 13+, API 33+)
- `READ_MEDIA_VIDEO`
- `READ_EXTERNAL_STORAGE` (para Android ≤ 32)

Sin esos permisos declarados, el WebView no puede invocar el picker del sistema.

### Fix
Agregado al `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
<uses-permission
    android:name="android.permission.READ_EXTERNAL_STORAGE"
    android:maxSdkVersion="32" />
```

### Archivos tocados
- `android/app/src/main/AndroidManifest.xml`

---

## Bug 8 — MangaDex no conecta

### Síntoma
Manga Party mostraba "no se pudo conectar a mangadex".

### Causa raíz
Mismo que Bug 6 — CORS del server rechazaba `https://localhost` origin de Capacitor. El endpoint `/api/manga` en el server tiene config CORS wildcard independiente, pero el fetch del cliente pasaba primero por el middleware global (`cors(corsOptions)`) que se aplica antes.

### Fix
El mismo que Bug 6 — agregar `https://localhost` al allowlist global resolvió ambos.

### Archivos tocados
- `server/index.mjs`

---

## Regresión 1 — CSS comment inválido en `.hubOverlay`

### Síntoma
Al tocar "Más" en el nav inferior, el overlay con user card + links no aparecía. El div estaba en el DOM pero sin estilos.

### Causa raíz
`src/styles/spacely.css` línea 1661 tenía un comentario mal formateado:
```css
\* backdrop-filter removed: causes blank render on Android WebView */
```

La apertura era `\*` (backslash + asterisco) en lugar de `/*`. El parser CSS interpretaba esto como un selector inválido, desalineando el bloque `.hubOverlay {}` entero. Las propiedades `position: fixed`, `z-index`, `display: flex` se descartaban y el overlay quedaba sin estilos.

### Fix
Corregir el comentario a `/* backdrop-filter removed... */`.

*Nota: este bug venía de una sesión anterior (obs #186 del timeline claude-mem).*

### Archivos tocados
- `src/styles/spacely.css`

---

## Regresión 2 — Framer-motion deja componentes en `opacity:0`

### Síntoma
Tras migrar a Next.js, algunos componentes con `<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>` quedaban **invisibles** (en opacity:0) forever en Capacitor. Afectaba: PageTransition, hub overlay del GardenLayout, ExplorePage, y varias otras páginas.

### Causa raíz
En Vite (SPA puro) la app se hidrataba una sola vez. Framer-motion tenía tiempo de inicializar correctamente antes del primer render.

En Next.js App Router + static export + Capacitor, la hidratación es más compleja: hay `BAILOUT_TO_CLIENT_SIDE_RENDERING` en varios boundaries, los chunks se cargan dinámicamente con `dynamic({ ssr: false })`, y framer-motion puede quedar en un estado inconsistente donde `initial` se aplica pero `animate` nunca dispara.

### Fix (parcial)
1. **`PageTransition.jsx`**: removido `<motion.div>`, ahora es un `<div>` plano sin animación.
2. **GardenLayout hub overlay**: removidos todos los `<motion.div>` y `<AnimatePresence>` del overlay "Más". El contenido ahora aparece instantáneamente sin animación.
3. **MotionConfig global** en `(main)/layout-client.tsx`: en native, wrap children con `<MotionConfig reducedMotion="always">` para que framer-motion skipee todas las transiciones — "reduced motion" hace que `animate` salte al end state inmediatamente.

### Archivos tocados
- `src/components/PageTransition.jsx`
- `src/layouts/GardenLayout.jsx`
- `src/app/(main)/layout-client.tsx`

---

## Regresión 3 — `HomePageClient` redirige a `/posts` desde cualquier ruta

### Síntoma
Tras intentar un fix con hard-navigation, cualquier tap en un link llevaba a `/posts` independiente del destino.

### Causa raíz
`src/app/client.tsx` (`HomePageClient`) solo se monta cuando la ruta raíz es `/`, pero en Next App Router + static export con bailout a CSR, ese componente se montaba accidentalmente sobre subrutas (porque Capacitor servía el shell root para paths que no coincidían exactamente). El `useEffect` interno hacía `router.replace('/posts')` sin verificar pathname.

### Fix
Agregado guard al inicio del `useEffect`:
```tsx
const path = window.location.pathname.replace(/\/+$/, '')
if (path !== '' && path !== '/') return  // No redirigir si no estás en root
```

*Este guard se mantiene en la versión SPA final de HomePageClient.*

### Archivos tocados
- `src/app/client.tsx`

---

## Lecciones aprendidas

### 1. Migración Vite → Next.js no es trivial para apps con patrones SPA puros
El proyecto fue originalmente construido para Vite. Los patrones (React Router, `dynamic` imports, framer-motion, client-side routing) estaban calibrados para ese entorno. Next.js App Router + static export introduce:
- RSC payload fetching (fails en Capacitor)
- Bailout a CSR con mismatches de hidratación
- Múltiples HTMLs por ruta (en vez de uno solo SPA)
- Timing diferente para framer-motion, que expone bugs latentes

La solución final (ver `CAPACITOR_SPA_ROUTING.md`) es forzar un modelo **SPA puro** en Capacitor: un único HTML root + router manual.

### 2. Capacitor Android scheme default cambió
Desde Capacitor v5, `androidScheme` defaultea a `https` (antes era `http`). Cualquier CORS allowlist pre-existente debe actualizarse. Chequear que ambas variantes (`http://localhost` y `https://localhost`) estén en el allowlist.

### 3. Permisos Android 13+ cambiaron
Apps que lean archivos de media necesitan `READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO` en Android 13+, no `READ_EXTERNAL_STORAGE`. Declarar ambos con `maxSdkVersion` para compatibilidad.

### 4. `<LiveKitRoom audio={true}>` necesita permiso runtime de micrófono antes de montar
En Android 14+, si `getUserMedia` corre sin permiso, el track queda silenciado permanentemente y no se puede recuperar con `setMicrophoneEnabled(true)`. Solución: gate el render hasta que el permiso sea concedido.

### 5. CORS en producción es estricto — el origin del APK no es obvio
Capacitor envía Origin `http://localhost` o `https://localhost` según el scheme. Fetch sin Origin (curl) será rechazado en prod. El debugging debe incluir Origin explícita.

### 6. Server deploy puede estar caído silenciosamente
Una dependencia removida sin actualizar todos los imports crashea el server al boot. Railway no alerta automáticamente — los clientes ven "servidor no responde" genérico. Siempre verificar `curl https://server/health` antes de asumir bug en el cliente.

### 7. Framer-motion `initial={opacity:0}` es peligroso en entornos con timing inestable
Si por cualquier motivo `animate={opacity:1}` no dispara, el componente queda invisible. Alternativas:
- `initial={false}` para skippear el initial state
- `<MotionConfig reducedMotion="always">` global
- Reemplazar `motion.div` por `div` en componentes críticos

---

## Timeline de fixes

| Tiempo       | APK      | Cambio                                                                       |
|--------------|----------|------------------------------------------------------------------------------|
| 21:28        | v1       | Build inicial con fixes de Bugs 1-5                                          |
| 21:58        | v2       | Agregado `WebView.setWebContentsDebuggingEnabled` en MainActivity            |
| 22:18        | v3       | Hard-nav para rutas en Capacitor (causó regresión 3)                         |
| 22:30        | v4       | Trailing slash fix para hard-nav                                             |
| 22:47        | v5       | Agregado eruda debug console                                                 |
| 22:57        | v6       | Listener de clicks + logs de shim navigate                                   |
| 23:07        | v7       | Overlay persistente de logs en localStorage                                  |
| 23:17        | v8       | Interceptor de `history.pushState/replaceState`                              |
| 23:25        | v9       | Stack traces en HIST logs                                                    |
| 23:34        | v10      | `HomePageClient` guard — no redirige si pathname ≠ /                         |
| 23:43        | v11      | Suspense fallback = null + auth timeout reducido                             |
| 23:46        | v12      | PageTransition sin framer-motion                                             |
| 23:51        | v13      | Revertido a client-side nav + mantengo guards                                |
| 00:02        | v14      | Hard-nav solo para rutas dinámicas; quitado `onClick={closeMenu}` del hub    |
| 00:08        | v15      | Hub overlay sin framer-motion (fix Regresión 1)                              |
| 00:17        | v16      | `<MotionConfig reducedMotion="always">` global                               |
| **00:30**    | **v17**  | **SPA puro: HomePageClient como router + fix-static-routes sobrescribe all** |

---

**Commits del servidor:**
- `14eb15b` — fix(server): replace NodeCache with Map-based TTL cache
- `10d1374` — fix(server): allow https://localhost origin for Capacitor
