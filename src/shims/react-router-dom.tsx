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
 *
 * ─── STATIC EXPORT (Capacitor/Tauri) ─────────────────────────────────────────
 * En `output: 'export'` Next.js solo genera el shell HTML para el placeholder '_'.
 * Ej: transmission/_/index.html  community/_/index.html  _/index.html
 *
 * Problema: router.push('/transmission/abc123') intenta cargar el RSC payload
 * de esa ruta → no existe → pantalla en blanco.
 *
 * Solución aplicada:
 *   1. useNavigate intercepta rutas dinámicas y navega al placeholder correspondiente
 *      (/transmission/abc123 → /transmission/_) guardando la ruta real en
 *      window.history.state.__realPath ANTES de la navegación.
 *   2. useParams lee __realPath del history.state para obtener el ID real.
 *   3. useLocation también devuelve la ruta real cuando existe __realPath.
 */

import NextLink from 'next/link'
import {
  usePathname,
  useRouter,
  useParams as useNextParams,
  useSearchParams as useNextSearchParams,
} from 'next/navigation'
import { useEffect, type ComponentProps, type ReactNode } from 'react'

// ─── Helpers para static export ──────────────────────────────────────────────

// Prefijos de rutas estáticas conocidas (no son [username] dinámico)
const STATIC_PREFIXES = new Set([
  'posts', 'communities', 'community', 'transmission', 'profile', 'game',
  'games', 'spaces', 'chat', 'explorar', 'download', 'login', 'onboarding',
  'auth', 'afinidad', 'ahora-suena', 'anime', 'arquitectura', 'banco',
  'bulletin', 'cabina', 'cartas', 'desktop', 'foco', 'guestbook', 'inventory',
  'leaderboard', 'logros', 'manga-party', 'mercado-negro', 'pase-estelar',
  'snake', 'tienda', 'tienda-galactica', 'universo', 'vault', 'vinculos',
  'spotify-callback',
])

// Prefijos de rutas dinámicas con segundo segmento
const DYNAMIC_PREFIXES = new Set([
  'transmission', 'community', 'profile', 'game', 'spaces',
])

// Mapa prefijo → nombre del parámetro
const DYNAMIC_ROUTE_MAP: Record<string, string> = {
  transmission: 'postId',
  community: 'slug',
  profile: 'userId',
  game: 'gameId',
  spaces: 'spaceId',
}

/** ¿Estamos corriendo dentro de Capacitor o Tauri? */
function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false
  return (
    (typeof (window as any).Capacitor !== 'undefined' &&
      (window as any).Capacitor.isNativePlatform?.()) ||
    (window as any).__TAURI_INTERNALS__ !== undefined ||
    window.location.hostname === 'tauri.localhost' ||
    window.location.protocol === 'tauri:'
  )
}

/**
 * Convierte una ruta dinámica real al placeholder correcto.
 * Solo actúa en entornos nativos (static export).
 * Devuelve null si no es necesario reescribir.
 *
 * /transmission/abc123  →  /transmission/_
 * /community/tech       →  /community/_
 * /danilord             →  /_
 */
function toPlaceholderPath(to: string): string | null {
  if (!isNativePlatform()) return null

  const clean = to.split('?')[0].split('#')[0].replace(/\/$/, '')
  const parts = clean.split('/').filter(Boolean)

  if (parts.length >= 2 && DYNAMIC_PREFIXES.has(parts[0]) && parts[1] !== '_') {
    return `/${parts[0]}/_`
  }

  if (parts.length === 1 && parts[0] !== '_' && !STATIC_PREFIXES.has(parts[0])) {
    return '/_'
  }

  return null
}

/**
 * Lee los parámetros reales desde history.state.__realPath o window.location.
 * Se usa como fallback cuando Next.js devuelve el placeholder '_'.
 */
function parseParamsFromRealPath(): Record<string, string> {
  if (typeof window === 'undefined') return {}

  // Prioridad: ruta real guardada por useNavigate/Link antes de navegar al placeholder
  const realPath: string | undefined = (window.history.state as any)?.__realPath
  const raw = (realPath ?? window.location.pathname).replace(/\/$/, '')
  const parts = raw.split('/').filter(Boolean)

  if (parts.length === 0) return {}

  const prefix = parts[0]

  // /transmission/abc123 → { postId: 'abc123' }
  if (parts.length >= 2 && DYNAMIC_ROUTE_MAP[prefix]) {
    const value = parts[1]
    if (value && value !== '_') return { [DYNAMIC_ROUTE_MAP[prefix]]: value }
  }

  // /danilord → { username: 'danilord' }
  if (parts.length === 1 && !STATIC_PREFIXES.has(prefix) && prefix !== '_') {
    return { username: prefix }
  }

  return {}
}

// ─── Link ────────────────────────────────────────────────────────────────────

type LinkProps = Omit<ComponentProps<typeof NextLink>, 'href'> & { to: string }

export function Link({ to, children, onClick, ...props }: LinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const placeholder = toPlaceholderPath(to)
    if (placeholder) {
      // Guardar la ruta real antes de que Next.js navegue al placeholder
      window.history.replaceState(
        { ...(window.history.state ?? {}), __realPath: to },
        '',
        window.location.href,
      )
    }
    onClick?.(e)
  }
  const placeholder = toPlaceholderPath(to)
  return (
    <NextLink href={placeholder ?? to} onClick={handleClick} {...props}>
      {children}
    </NextLink>
  )
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
    const placeholder = toPlaceholderPath(to)
    if (placeholder) {
      window.history.replaceState(
        { ...(window.history.state ?? {}), __realPath: to },
        '',
        window.location.href,
      )
      if (replace) router.replace(placeholder)
      else router.push(placeholder)
    } else {
      if (replace) router.replace(to)
      else router.push(to)
    }
  }, [to, replace, router])
  return null
}

// ─── useLocation ─────────────────────────────────────────────────────────────

export function useLocation() {
  const pathname = usePathname()
  let search = ''
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const sp = useNextSearchParams()
    search = sp?.toString() ? `?${sp.toString()}` : ''
  } catch {
    // fallback when Suspense boundary not present
  }
  // En native static export, devolver la ruta real si está guardada en history.state
  const realPath: string | undefined =
    typeof window !== 'undefined'
      ? (window.history.state as any)?.__realPath
      : undefined
  return { pathname: realPath ?? pathname, search, hash: '' }
}

// ─── useNavigate ─────────────────────────────────────────────────────────────

export function useNavigate() {
  const router = useRouter()
  return (to: string, options?: { replace?: boolean }) => {
    const placeholder = toPlaceholderPath(to)
    if (placeholder) {
      // Guardar la ruta real en el estado del historial ANTES de navegar al placeholder
      window.history.replaceState(
        { ...(window.history.state ?? {}), __realPath: to },
        '',
        window.location.href,
      )
      // Añadir ?_r=<timestamp> para forzar re-render si ya estamos en el mismo placeholder
      const sep = placeholder.includes('?') ? '&' : '?'
      const placeholderWithTs = `${placeholder}${sep}_r=${Date.now()}`
      if (options?.replace) router.replace(placeholderWithTs)
      else router.push(placeholderWithTs)
    } else {
      if (options?.replace) router.replace(to)
      else router.push(to)
    }
  }
}

// ─── useParams ───────────────────────────────────────────────────────────────

export function useParams<T extends Record<string, string>>() {
  const nextParams = useNextParams() as Record<string, string>

  // Si algún valor es el placeholder '_', intentar obtener el ID real
  const hasPlaceholder = Object.values(nextParams).some(v => v === '_')
  if (hasPlaceholder) {
    const real = parseParamsFromRealPath()
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
export function Routes({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function Route({ element }: { path?: string; element?: ReactNode; children?: ReactNode; index?: boolean }) {
  return <>{element}</>
}

// AnimatePresence re-export (framer-motion) — usado en App.jsx junto a Routes
export { AnimatePresence } from 'framer-motion'
