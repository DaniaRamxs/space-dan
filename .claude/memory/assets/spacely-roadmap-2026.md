# Spacely — Mapa de prioridades (v2)

**Fecha:** 2026-04-18
**Propietaria:** Dan (Dania)
**Estado:** Beta abierta con usuarios reales
**Objetivo personal:** Experimento técnico / pasión
**Presupuesto de tiempo:** 5-10 horas/semana sosteniblemente

---

## Posicionamiento real

**Spacely es una aplicación nativa (mobile + desktop) de hangout social con voz, juegos multijugador y manga reader. La web no es producto — es landing de descargas.**

Esta es la realidad operativa. Los usuarios viven en las apps nativas. El backend (Node/Express + Colyseus) es el único servidor compartido y por ahí pasa todo.

---

## Arquitectura actual

```
┌─────────────────────────────────────────────────────┐
│                   USUARIOS BETA                     │
│          50% mobile  ·  50% desktop                 │
└──────────────┬──────────────────────┬───────────────┘
               │                      │
               ▼                      ▼
    ┌──────────────────┐    ┌──────────────────┐
    │ Capacitor mobile │    │  Tauri desktop   │
    │   (incompleta)   │    │    (en uso)      │
    │ APK/IPA en       │    │ Build en GitHub  │
    │ GitHub Releases  │    │ Releases         │
    └─────────┬────────┘    └────────┬─────────┘
              │                      │
              └──────────┬───────────┘
                         │
                         ▼
               ┌───────────────────┐
               │  Backend Node     │
               │  + Colyseus rooms │
               │  Railway          │
               └─────────┬─────────┘
                         │
                         ▼
               ┌───────────────────┐
               │  Supabase (DB)    │
               │  LiveKit (voice)  │
               └───────────────────┘

              ┌─────────────────┐
              │  Web (Next.js)  │ ← solo landing de descargas
              │  tráfico bajo   │
              └─────────────────┘
```

---

## Estado de features

| Feature | Estado | Usuarios | Acción |
|---------|--------|----------|--------|
| Backend API | ✅ Core crítico | Todos | Mantener seguro y estable |
| Social (posts, comunidades, chat) | ✅ Activo | Usan mucho | Mejorar y mantener |
| Video / voice (LiveKit) | ✅ Activo | Usan mucho | Mejorar y mantener |
| Juegos (Colyseus, Phaser, chess) | ⚠️ Pasión sin tracción | Usan poco | Invertir en UX/descubribilidad |
| Manga reader + manga-party | ✅ Activo | Usan | Mantener, cerrar deuda seguridad |
| Tauri desktop | ✅ En uso | 50% de usuarios | Mantener + auto-update |
| Capacitor mobile | 🟡 Incompleta | 50% de usuarios | **Terminar (prioridad real)** |
| AR / MediaPipe | 🧊 Congelado | Uso ocasional | No desarrollar más |
| Web (Next.js) | 🧊 Landing mínima | Tráfico bajo | Simplificar si aporta, podar si no |
| Anime | ❌ Eliminado 2026-04-18 | — | Depreciado |

---

## Cambio de narrativa importante

**Los security headers de Next.js NO son prioridad.** La web casi no se usa. Si un usuario explota un XSS en la landing, el blast radius es mínimo. Priorizar fixes que protegen el backend (el único punto compartido) y no el frontend web.

**La deuda técnica aumenta en criticidad.** Si las apps nativas son la plataforma real, un bug en producción se convierte en "usuarios con app rota en su device" hasta que descarguen una versión nueva manualmente (no hay auto-update). No es un bug que se fixea con un deploy.

**La distribución manual APK/IPA/exe es un tapón silencioso.** Cada nuevo usuario tiene que:
1. Entrar a GitHub (servicio de desarrollador, no de producto)
2. Navegar a Releases (no user-friendly)
3. Descargar el binario correcto para su OS
4. En Android: permitir instalación de fuentes desconocidas (fricción + sospecha)
5. En iOS: no se puede sin TestFlight o jailbreak (imposible para usuarios casuales)

El problema: estás filtrando usuarios por sofisticación técnica antes de que prueben el producto. Es una barrera enorme.

---

## Lo que NO se hace

- Security headers de la web (deprioridad, la web no es producto)
- Nuevas features del backlog mental hasta que Sprint 1 y 2 estén cerrados
- Expandir AR (congelado)
- Invertir en la web más allá de lo mínimo (landing funcional, nada más)

---

## Prioridades próximos 3 meses

### 🔴 Sprint 1 — Cerrar seguridad del backend (esta semana, ~3-5h)

Cosas sueltas que faltan del capítulo de seguridad iniciado hoy:

- [x] Fixes críticos (CORS, debug endpoint, SSRF anime) — cerrado 2026-04-18
- [x] Eliminar feature anime completa — cerrado 2026-04-18
- [x] Fix SSRF en `/api/manga/ext-image` (private-IP + DNS + maxRedirects:0 + redirect hop validation) — cerrado 2026-04-18
- [x] Revisar CORS de manga (`credentials:true` ausente → wildcard seguro, comentado) — cerrado 2026-04-18
- [x] Security headers Next.js (HSTS, CSP, X-Frame, X-Content-Type, Referrer, Permissions) — cerrado 2026-04-18 *(baja prioridad para la web, pero ya están)*
- [x] Fix turbopack.root (`../../../` → `__dirname`) — cerrado 2026-04-18
- [x] WatchlistPage: filtros con conteo por categoría — cerrado 2026-04-18
- [x] Dependencias npm: `node-cache` eliminado + bug en `youtubeSearch.mjs` corregido (Map+TTL nativo) — cerrado 2026-04-18
- [x] Rate limiting en endpoints públicos: 60 req/15min en youtube/ext-image, 20 req/15min en scrape — cerrado 2026-04-18
- [x] `testSupabaseConnection.mjs` eliminado — cerrado 2026-04-18

### 🟡 Sprint 2 — Distribución profesional (2-3 semanas, ~6-10h)

**Este sprint es el que más ROI tiene de todo el plan**, porque resuelve el tapón silencioso de distribución.

**Fase A — Auto-update (prioridad alta, ~2-3h):**
- Tauri tiene [soporte nativo de updater](https://tauri.app/plugin/updater/). Configurarlo contra GitHub Releases.
- Capacitor Android: implementar check de versión al arrancar app + redirigir a APK nueva si hay update disponible.
- Capacitor iOS: complicado sin store. Por ahora limitarse a mostrar aviso "nueva versión disponible" al arrancar.

**Fase B — Mejorar página de descargas (~2h):**
- Landing clara con botones directos por plataforma (detectar OS del navegador, mostrar el botón relevante en grande).
- Instrucciones de instalación claras por plataforma (especialmente Android: cómo permitir fuentes desconocidas de forma segura).
- Esto no es "mejorar la web como producto" — es reducir fricción de distribución.

**Fase C — Plan para stores (~2-3h de research, sin ejecutar aún):**
- Investigar requisitos de Play Store: privacy policy, íconos, screenshots, descripción. Tu caso de uso más rápido.
- Investigar requisitos de App Store: requiere Mac físico, cuenta de Apple Developer $99/año, proceso más estricto.
- Microsoft Store: opcional, Tauri exporta a formato compatible.
- Mac App Store: opcional, requiere sandbox changes en Tauri.
- **Output esperado:** checklist de lo que necesitas para cada store, cuál publicar primero (Play Store sale como candidata por costo y velocidad), qué costos reales asumes.

**No se publica en stores este sprint** — es solo planificación. Publicación va a Sprint 3 o 4.

### 🟢 Sprint 3 — Completar Capacitor mobile (3-4 semanas, ~8-15h)

App móvil usable para publicar en Play Store. No paridad total con desktop.

MVP de mobile incluye:
- Login + onboarding
- Social (posts, comunidades, chat)
- Voice chat (LiveKit tiene SDK nativo para mobile)
- Manga reader
- Settings + profile

NO incluye en v1 mobile (pueden quedarse solo en desktop):
- Juegos complejos (Phaser performance en mobile es cuestionable)
- AR (congelado en general)
- Cualquier feature desktop-specific

**Output:** APK publicable en Play Store beta. IPA distribuible por TestFlight.

### 🔵 Sprint 4 — Publicar en Play Store (1-2 semanas, ~4-6h)

Ejecutar el checklist de Sprint 2 Fase C aplicado a Play Store:
- Privacy policy escrita (tienes que tenerla pública)
- Pagar registro Google Play ($25 único)
- Íconos, screenshots, descripción ES + EN
- Submit para review
- Responder observaciones de Google si las hay

**No se ataca App Store en este trimestre.** App Store requiere:
- Mac físico (no tienes confirmado)
- $99/año continuo
- Review más estricto, tiempos más largos
- Privacy manifest adicional (regla reciente de Apple)

App Store queda para Q2 2026 o después.

---

## Deuda técnica — ajustada al nuevo contexto

| Ítem | Urgencia | Estimado | Cuándo |
|------|----------|----------|--------|
| Migración de shims `react-router-dom` | Alta | 4-8h | Sprint 3 en paralelo |
| Testing de Capacitor en dispositivos reales | Alta | 3-5h | Sprint 3 |
| Auto-update Tauri | Alta (era media) | 2-3h | Sprint 2 |
| Auto-update Capacitor | Media | 1-2h | Sprint 2 |
| Monitoreo de errores en apps nativas (Sentry o similar) | Media | 2-3h | Sprint 3 |
| Testing básico backend | Media | 4-6h | En paralelo Sprint 1-2 |
| Security headers Next.js web | **Baja** (bajó desde alta) | 30m | Si sobra tiempo |
| `turbopack.root` fix | **Baja** (bajó) | 5m | Si sobra tiempo |

---

## Presupuesto estimado realista

Para stores (Sprint 4 y futuros):

| Concepto | Costo |
|----------|-------|
| Google Play Console | $25 único |
| Apple Developer Program | $99/año (cuando llegue el turno) |
| Microsoft Store | $19 único (individual) |
| Mac App Store | Incluido en Apple Developer |
| Privacy policy (puede generarse gratis con herramientas, o $0-100 si quieres algo robusto) | $0-100 |
| Íconos y screenshots profesionales (puedes hacerlos en Canva con lo que ya manejas) | $0 |
| **Total para lanzar en Play Store + Microsoft Store** | **~$44 único** |
| **Total para agregar App Store después** | **+$99/año** |

Esto es accesible. No te bloquea el lanzamiento.

---

## Reglas de operación

1. **Un sprint a la vez.** No saltar entre Sprints 2, 3 y 4 por impulso.
2. **Cerrar ramas antes de abrir nuevas.**
3. **Respetar orden de satisfacción real:** social/voice > juegos > deuda > estabilidad > features nuevas.
4. **Features nuevas → parking lot.** No empezar, solo anotar.
5. **Reevaluar este mapa cada 6-8 semanas.**

---

## Parking lot

Ideas que NO se tocan ahora.

- *(vacío — agregar aquí cuando surjan)*

---

## Checkpoints cerrados hoy (2026-04-18)

- Ruflo v3.0.0 instalado y operativo
- Auditoría completa de seguridad de Spacely
- 3 vulnerabilidades críticas cerradas
- Feature anime eliminada completa
- Merge clean a main (`5c2e604`)
- Este mapa de prioridades v2 construido y documentado

---

## Próxima acción concreta

**Lanzar el prompt de fixes de manga** (rama `fix-manga-security`) para cerrar Sprint 1:
- SSRF en `/api/manga/ext-image`
- CORS manga
- Rate limiting básico

Después de mergear eso, la siguiente sesión abre Sprint 2 (auto-update + landing de descargas).