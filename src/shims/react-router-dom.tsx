'use client'
/**
 * react-router-dom → Next.js shim
 *
 * Permite que todo el código de space-dan (hooks, componentes, páginas)
 * siga importando desde 'react-router-dom' sin modificación. Este archivo
 * se resuelve primero gracias al path alias en tsconfig.json.
 *
 * Cubre: Link, NavLink, Navigate, useLocation, useNavigate, useParams,
 * useSearchParams, BrowserRouter, HashRouter, Routes, Route (no-ops en Next.js).
 */

import NextLink from 'next/link'
import { usePathname, useRouter, useParams as useNextParams, useSearchParams as useNextSearchParams } from 'next/navigation'
import { useEffect, type ComponentProps, type ReactNode } from 'react'

// ─── Link ────────────────────────────────────────────────────────────────────

type LinkProps = Omit<ComponentProps<typeof NextLink>, 'href'> & { to: string }

export function Link({ to, children, ...props }: LinkProps) {
  return <NextLink href={to} {...props}>{children}</NextLink>
}

// ─── NavLink ─────────────────────────────────────────────────────────────────

type ClassNameFn = (arg: { isActive: boolean }) => string
type ChildrenFn = (arg: { isActive: boolean }) => ReactNode

type NavLinkProps = LinkProps & {
  end?: boolean
  className?: string | ClassNameFn
  children?: ReactNode | ChildrenFn
}

export function NavLink({ to, end, className, children, ...props }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = end ? pathname === to : (pathname?.startsWith(to) ?? false)
  const resolvedClass = typeof className === 'function' ? (className as ClassNameFn)({ isActive }) : className
  const resolvedChildren = typeof children === 'function' ? (children as ChildrenFn)({ isActive }) : children
  return (
    <NextLink href={to} className={resolvedClass} {...props}>
      {resolvedChildren}
    </NextLink>
  )
}

// ─── Navigate ────────────────────────────────────────────────────────────────

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  const router = useRouter()
  useEffect(() => {
    if (replace) router.replace(to)
    else router.push(to)
  }, [to, replace, router])
  return null
}

// ─── useLocation ─────────────────────────────────────────────────────────────

export function useLocation() {
  const pathname = usePathname()
  // useSearchParams must be wrapped in Suspense in the consumer — handled per page
  let search = ''
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const sp = useNextSearchParams()
    search = sp?.toString() ? `?${sp.toString()}` : ''
  } catch {
    // fallback when Suspense boundary not present
  }
  return { pathname, search, hash: '' }
}

// ─── useNavigate ─────────────────────────────────────────────────────────────

export function useNavigate() {
  const router = useRouter()
  return (to: string, options?: { replace?: boolean }) => {
    if (options?.replace) router.replace(to)
    else router.push(to)
  }
}

// ─── useParams ───────────────────────────────────────────────────────────────
//
// En output:export (Capacitor/Tauri), Next.js sólo genera el shell HTML para
// el placeholder '_'. Cuando el usuario navega a /transmission/abc123, el
// WebView carga transmission/_/index.html y useNextParams() devuelve {postId:'_'}.
// Necesitamos leer el segmento REAL desde window.location.pathname.
//
// Mapa de rutas dinámicas → nombre del param:
//   /[username]            → { username }   (segmento 1, si no coincide con prefijos)
//   /transmission/[postId] → { postId }     (segmento 2 bajo /transmission/)
//   /community/[slug]      → { slug }       (segmento 2 bajo /community/)
//   /profile/[userId]      → { userId }     (segmento 2 bajo /profile/)
//   /game/[gameId]         → { gameId }     (segmento 2 bajo /game/)
//   /spaces/[spaceId]      → { spaceId }    (segmento 2 bajo /spaces/)

const DYNAMIC_ROUTE_MAP: Record<string, string> = {
  transmission: 'postId',
  community: 'slug',
  profile: 'userId',
  game: 'gameId',
  spaces: 'spaceId',
}

// Prefijos de rutas estáticas conocidas (no son [username])
const STATIC_PREFIXES = new Set([
  'posts', 'communities', 'community', 'transmission', 'profile', 'game',
  'games', 'spaces', 'chat', 'explorar', 'download', 'login', 'onboarding',
  'auth', 'afinidad', 'ahora-suena', 'anime', 'arquitectura', 'banco',
  'bulletin', 'cabina', 'cartas', 'desktop', 'foco', 'guestbook', 'inventory',
  'leaderboard', 'logros', 'manga-party', 'mercado-negro', 'pase-estelar',
  'snake', 'tienda', 'tienda-galactica', 'universo', 'vault', 'vinculos',
  'spotify-callback', 'posts',
])

function parseParamsFromPathname(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  // Usar la URL real actual — puede diferir del pathname de Next.js en el APK
  const raw = window.location.pathname.replace(/\/$/, '') // quitar trailing slash
  const parts = raw.split('/').filter(Boolean) // ['transmission', 'abc123']

  if (parts.length === 0) return {}

  const prefix = parts[0]

  // Ruta con prefijo conocido y segundo segmento: /transmission/abc123
  if (parts.length >= 2 && DYNAMIC_ROUTE_MAP[prefix]) {
    const paramName = DYNAMIC_ROUTE_MAP[prefix]
    const value = parts[1]
    if (value && value !== '_') return { [paramName]: value }
  }

  // Ruta raíz dinámica: /danilord (si el primer segmento no es una ruta estática)
  if (parts.length === 1 && !STATIC_PREFIXES.has(prefix) && prefix !== '_') {
    return { username: prefix }
  }

  return {}
}

export function useParams<T extends Record<string, string>>() {
  const nextParams = useNextParams() as Record<string, string>

  // Si todos los valores del param son '_' (placeholder), leer desde window.location
  const hasPlaceholder = Object.values(nextParams).some(v => v === '_')
  if (hasPlaceholder) {
    const real = parseParamsFromPathname()
    if (Object.keys(real).length > 0) return real as T
  }

  return nextParams as T
}

// ─── useSearchParams ─────────────────────────────────────────────────────────

export { useNextSearchParams as useSearchParams }

// ─── Router stubs (no-ops en Next.js App Router) ─────────────────────────────

export function BrowserRouter({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function HashRouter({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function MemoryRouter({ children }: { children: ReactNode }) {
  return <>{children}</>
}

// Routes y Route son no-ops: Next.js gestiona el routing por filesystem.
// Los usamos como wrappers vacíos para que el código compila sin errores.
export function Routes({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function Route({ element }: { path?: string; element?: ReactNode; children?: ReactNode; index?: boolean }) {
  return <>{element}</>
}

// AnimatePresence re-export (framer-motion) — usado en App.jsx junto a Routes
export { AnimatePresence } from 'framer-motion'
