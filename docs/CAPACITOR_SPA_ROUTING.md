# Capacitor SPA Routing — Arquitectura final

> **Contexto:** Spacely originalmente fue construida con Vite (SPA puro). En la migración a Next.js 16 + App Router + static export, el modelo de múltiples HTMLs por ruta + hidratación RSC rompió varios patrones. Esta doc describe la solución adoptada: **forzar SPA puro en Capacitor** mediante un router manual en el cliente raíz.

---

## Problema

Next.js con `output: 'export'` + Capacitor Android tenía los siguientes fallos en navegación:

1. **"This page couldn't load"** — el RSC payload fetch (`.txt` flight data) fallaba en el WebView al navegar client-side.
2. **Redirect loop a `/posts`** — `HomePageClient` se montaba accidentalmente sobre subrutas durante bailouts a CSR y disparaba `router.replace('/posts')`.
3. **Componentes invisibles** — `motion.div initial={{ opacity: 0 }}` quedaba atascado en `opacity:0` si la hidratación interrumpía a framer-motion.
4. **Rutas dinámicas** (`/profile/:id`, `/transmission/:id`) — el shim reescribía a `/profile/_/?_id=...` pero el client router de Next no matcheaba el placeholder de forma consistente.

Durante el debugging se verificó con fetch directo que los archivos **sí existen** en el `out/`:
```
/communities/ → 200
/explorar/    → 200
/profile/_/   → 200
/posts/       → 200
```

El problema no era de filesystem — era de **hidratación y routing client-side** de Next App Router en el WebView.

---

## Solución — SPA puro

Dos cambios en tándem:

### 1. `scripts/fix-static-routes.mjs` — sobrescribir todos los HTMLs con el root

Después del build de Next, el script recorre `out/` y reemplaza **cada `*/index.html`** con una copia de `out/index.html`. Excepciones: `_next/` y `_not-found/` (assets internos de Next).

```js
function walkAndOverwrite(dir, depth = 0) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (!statSync(full).isDirectory()) continue
    if (depth === 0 && KEEP_TOP_LEVEL.has(entry)) continue

    const indexFile = join(full, 'index.html')
    if (existsSync(indexFile)) {
      copyFileSync(ROOT_INDEX, indexFile)
    }
    walkAndOverwrite(full, depth + 1)
  }
}
```

Así, cualquier URL que Capacitor sirva (por ejemplo `https://localhost/explorar/`) devuelve **el mismo HTML root** que monta `HomePageClient`. Adicionalmente, `404.html` también es una copia del root — cubre rutas desconocidas.

### 2. `src/app/client.tsx` — HomePageClient como router manual

`HomePageClient` se transforma en un router que, en native:

1. Lee `window.location.pathname` con `useState`.
2. Patchea `history.pushState` y `history.replaceState` para disparar un `popstate` sintético — así detecta cambios del router interno de Next (que usa `pushState` internamente cuando los NavLink client-nav).
3. Resuelve el componente correcto usando un mapa de rutas estáticas + matchers de prefijos para rutas dinámicas.
4. Renderiza el componente envuelto en `<GardenLayout>`.

```tsx
const STATIC_ROUTES: Record<string, any> = {
  '/posts':       dynamic(() => import('@/pages/PostsPage'), { ssr: false }),
  '/communities': dynamic(() => import('@/pages/CommunitiesPage'), { ssr: false }),
  '/explorar':    dynamic(() => import('@/pages/ExplorePage'), { ssr: false }),
  // ... (32 rutas estáticas mapeadas)
}

const DYNAMIC_MATCHERS = [
  { prefix: '/profile/',      Component: ProfilePublic },
  { prefix: '/transmission/', Component: PostDetailPage },
  { prefix: '/community/',    Component: CommunityPage },
  { prefix: '/game/',         Component: GamesPage },
  { prefix: '/spaces/',       Component: SpaceSessionPage },
  { prefix: '/log/',          Component: PostDetailPage },
]

// /:username → ProfileRedesign
```

En web (no-native), `HomePageClient` mantiene su comportamiento original: redirige a `/download` o `/posts` según sesión.

---

## Flujo de una navegación en native

1. Usuario toca **"COMUNIDADES"** en el nav inferior del GardenLayout.
2. NavLink del shim renderiza `<NextLink href="/communities">`.
3. Al click, Next `router.push('/communities')` llama internamente a `history.pushState(null, '', '/communities')`.
4. Nuestro patch de `history.pushState` dispara un `popstate`.
5. `HomePageClient` oye el `popstate`, actualiza su state `pathname` a `/communities`.
6. Re-render: `resolveComponent('/communities')` retorna `CommunitiesPage` (dynamic import).
7. `<GardenLayout><CommunitiesPage /></GardenLayout>` renderiza.
8. El nav inferior sigue ahí, las transiciones son instantáneas (sin recarga).

**Clave:** no hay fetch HTTP durante la navegación. No hay recarga del WebView. No hay RSC fetch. Solo cambia el pathname y React re-renderiza el componente correcto. Exactamente como funcionaba en Vite.

---

## Deep links y reload

Si el usuario hace reload del WebView (o abre un deep link directo como `spacely://transmission/abc`), Capacitor sirve el HTML root (porque todos los HTMLs son copias del root). `HomePageClient` se monta, lee `window.location.pathname`, y renderiza el componente correspondiente.

Esto es idéntico al comportamiento de una SPA Vite con `historyApiFallback`.

---

## Trade-offs

### Pros
- ✅ Replica el modelo SPA Vite que sí funcionaba.
- ✅ No depende del RSC fetch del App Router (que falla en Capacitor).
- ✅ Navegaciones instantáneas — no hay recarga de HTML/JS.
- ✅ Deep links funcionan.
- ✅ El overlay "Más", menús, modales no pierden estado al navegar.
- ✅ Web production (`joinspacely.com`) **NO se ve afectada** — el router manual solo se activa en native.

### Cons
- ❌ Hay que mantener el mapping manual de rutas en `src/app/client.tsx`. Si se agrega una nueva página, hay que registrarla en `STATIC_ROUTES` o en `DYNAMIC_MATCHERS`.
- ❌ El primer render en native carga todos los chunks de `HomePageClient` (aunque los pages internos son lazy).
- ❌ Algunas optimizaciones de Next App Router (RSC prefetching, server components, etc.) se pierden en native — pero el proyecto no usa server components real, solo `ssr: false` dynamic imports.

---

## Checklist para agregar una nueva ruta

1. Crear `src/app/(main)/<ruta>/page.tsx` y `client.tsx` como siempre (para que web production funcione).
2. Crear `src/pages/<NuevaPage>.jsx` con el componente real.
3. **Registrar en `src/app/client.tsx`:**
   ```tsx
   const STATIC_ROUTES = {
     // ...
     '/<ruta>': dynamic(() => import('@/pages/<NuevaPage>'), { ssr: false }),
   }
   ```
4. Si es ruta dinámica (`/<ruta>/:id`), agregar al array `DYNAMIC_MATCHERS`.
5. Build + sync + gradle assembleDebug. Probar en Capacitor.

---

## Archivos clave

| Archivo                                           | Rol                                                 |
|---------------------------------------------------|-----------------------------------------------------|
| `src/app/client.tsx`                              | Router manual + HomePageClient (SPA entry)          |
| `src/app/layout.tsx`                              | Providers (auth, economy, universe) — sin cambios   |
| `src/app/(main)/layout-client.tsx`                | StarfieldBg, DebugConsole, MotionConfig             |
| `src/layouts/GardenLayout.jsx`                    | Nav inferior + header + children (el shell visual)  |
| `src/shims/react-router-dom.tsx`                  | Link/NavLink/useNavigate que usan NextLink          |
| `scripts/fix-static-routes.mjs`                   | Post-build: sobrescribe HTMLs con el root           |
| `next.config.ts`                                  | `output: 'export'` + `trailingSlash: true`          |
| `capacitor.config.json`                           | Sin config especial; usa default scheme `https`     |

---

## Debug tools

En native, se inyecta un **overlay flotante de logs** (botón celeste "LOGS" en esquina inferior izquierda) que persiste en `localStorage` para sobrevivir a navegaciones. Además, se carga **eruda** (DevTools embebida) desde CDN para inspección completa sin necesidad de `chrome://inspect`.

Ambos están activos solo en native y se remueven automáticamente en web production (condición `isNativePlatform()` en `DebugConsole.tsx`).

---

## Comparación: antes vs. después

| Aspecto                        | Antes (Next App Router en native) | Ahora (SPA puro)                    |
|--------------------------------|-----------------------------------|-------------------------------------|
| Navegación                     | Client router Next + RSC fetch    | Router manual en HomePageClient     |
| HTML servido por Capacitor     | Uno distinto por ruta             | Siempre el `index.html` root        |
| Recarga al navegar             | A veces sí (bailout a CSR)        | Nunca                               |
| "This page couldn't load"      | Sí, en rutas dinámicas            | Nunca                               |
| Redirect loop a /posts         | Posible                           | Imposible (guard en HomePageClient) |
| Deep links                     | A veces fallan                    | Siempre funcionan                   |
| Web production                 | Intacto                           | Intacto                             |
