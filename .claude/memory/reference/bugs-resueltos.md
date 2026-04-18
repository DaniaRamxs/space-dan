# Bugs Resueltos — Spacely

## 2026-04-08: YouTube IFrame API fallaba en dev (Turbopack)

**Síntoma:** `[YouTubeContext] ❌ Failed to load YouTube IFrame API` en consola.

**Causa:** El script se inyectaba manualmente en el DOM (`document.createElement('script')` + `insertBefore`). Turbopack interfiere con esta técnica en dev.

**Fix aplicado:** Reemplazar la inyección manual por el componente `<Script>` de Next.js con `strategy="afterInteractive"` y callbacks `onReady` / `onError`. Archivo: `src/contexts/YouTubeContext.jsx`.

---

## 2026-04-09: Rutas no cargaban en APK Android (out/ contaminado con Vite)

**Síntoma:** Chat, perfil, vinculos, banco, communities no abrían en el APK tras migrar de Vite a Next.js.

**Causa raíz:** `out/` tenía archivos Vite mezclados con Next.js porque `build:static` nunca limpiaba antes de construir. El WebView cargaba el `out/index.html` de Vite, que no conocía las nuevas rutas Next.js. La soft navigation de Next.js (`router.push/replace`) SÍ funciona en Capacitor — los RSC payloads pre-generados (`.txt`) se sirven correctamente por el HTTP server local.

**Fix aplicado (2 archivos):**
1. `package.json` `build:static` → añadido `rmSync('out', {recursive:true,force:true})` antes del build → garantiza `out/` 100% Next.js
2. `scripts/fix-static-routes.mjs` → corregido para copiar shells dinámicos (`transmission/index.html`, `community/index.html`, `game/index.html`) y generar `404.html` como fallback SPA

**Lo que NO funciona:** `window.location.href` (hard navigation) en Capacitor causa pantalla negra. El HTTP server de Capacitor no sirve `index.html` por directorio para navegaciones iniciadas desde JS — todo navega de vuelta a `out/index.html` creando un loop o mostrando negro. **Usar siempre soft navigation (`router.push/replace`) en Capacitor.**

**Patrón:** Para rutas dinámicas en static export (`/transmission/abc123`), el shim `react-router-dom.tsx` reescribe a placeholder (`/transmission/_?_id=abc123`). Esto es necesario porque el shell dinámico solo existe en `out/transmission/_/index.html`. Rutas estáticas funcionan con soft navigation directa.

---

## 2026-04-08: favicon.ico devolvía 500

**Síntoma:** `favicon.ico: Failed to load resource: 500` en consola.

**Causa:** No existía carpeta `public/` ni favicon configurado en App Router.

**Fix aplicado:** Copiar `src-tauri/icons/spacelyicon.png` a `src/app/icon.png`. Next.js App Router lo detecta automáticamente como favicon.
