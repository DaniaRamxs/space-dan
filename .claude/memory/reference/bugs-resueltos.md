# Bugs Resueltos — Spacely

## 2026-04-08: YouTube IFrame API fallaba en dev (Turbopack)

**Síntoma:** `[YouTubeContext] ❌ Failed to load YouTube IFrame API` en consola.

**Causa:** El script se inyectaba manualmente en el DOM (`document.createElement('script')` + `insertBefore`). Turbopack interfiere con esta técnica en dev.

**Fix aplicado:** Reemplazar la inyección manual por el componente `<Script>` de Next.js con `strategy="afterInteractive"` y callbacks `onReady` / `onError`. Archivo: `src/contexts/YouTubeContext.jsx`.

---

## 2026-04-08: favicon.ico devolvía 500

**Síntoma:** `favicon.ico: Failed to load resource: 500` en consola.

**Causa:** No existía carpeta `public/` ni favicon configurado en App Router.

**Fix aplicado:** Copiar `src-tauri/icons/spacelyicon.png` a `src/app/icon.png`. Next.js App Router lo detecta automáticamente como favicon.
