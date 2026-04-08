# Estructura de Carpetas — Spacely

## src/
```
app/                    # Next.js App Router
  (main)/              # Rutas con layout principal (sidebar/nav)
  (auth)/              # Rutas sin layout (login, etc.)
  layout.tsx           # Root layout — importa todos los CSS globales
  providers.tsx        # Árbol de providers: YouTubeProvider > AuthProvider > EconomyProvider > UniverseProvider > CosmicProvider
  icon.png             # Favicon web (copiado de src-tauri/icons/spacelyicon.png)

contexts/              # Contextos globales
  AuthContext.jsx      # Sesión Supabase + perfil
  EconomyContext.jsx   # Balance ◈ + daily bonus
  YouTubeContext.jsx   # Pre-carga YouTube IFrame API (usa next/script)
  UniverseContext.jsx
  OverlayContext.jsx

pages/                 # Páginas legacy (montadas via dynamic import en app/)
features/
  anime/
  manga/

styles/                # CSS globales importados en layout.tsx
hooks/                 # useAuth.js, useShopItems, useSeason, etc.
services/              # Lógica de negocio (economy, affinityService, universe, etc.)
components/            # Componentes compartidos
data/                  # Datos estáticos (musicPlaylist.js, etc.)
```

## Raíz
```
src-tauri/icons/       # Iconos para la app Tauri desktop
  spacelyicon.png      # Icono principal (también usado como favicon web)
public/                # Assets estáticos (carpeta creada en 2026-04-08, estaba vacía)
BUSINESS_LOGIC.md      # Documento de lógica de negocio completo
next.config.ts         # Sin CSP headers. Soporte static export para Tauri/Capacitor.
```
