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
 * En `output: 'export'` Next.js solo genera shells HTML para el placeholder '_'.
 * Ej: out/transmission/_/index.html   out/community/_/index.html
 *
 * Problema: router.push('/transmission/abc123') intenta cargar RSC payload
 * de esa ruta → no existe → pantalla en blanco.
 *
 * Solución: navegar al placeholder con el ID real en query param `_id`:
 *   navigate('/transmission/abc123')
 *   → router.push('/transmission/_?_id=abc123&_r=<ts>')
 *
 * useParams() lee ?_id del query cuando el param Next.js es '_'.
 * useLocation() devuelve la ruta lógica reconstruida desde el prefijo + _id.
 *
 * Para usernames (/danilord → /_?_u=danilord):
 *   useParams() devuelve { username: 'danilord' }
 */

import NextLink from 'next/link'
import {
  usePathname,
  useRouter,
  useParams as useNextParams,
  useSearchParams as useNextSearchParams,
} from 'next/navigation'
import { useEffect, useMemo, type ComponentProps, type ReactNode } from 'react'

// ─── Constantes de rutas ──────────────────────────────────────────────────────

const STATIC_PREFIXES = new Set([
  'posts', 'communities', 'community', 'transmission', 'profile', 'game',
  'games', 'spaces', 'chat', 'explorar', 'download', 'login', 'onboarding',
  'auth', 'afinidad', 'ahora-suena', 'arquitectura', 'banco',
  'bulletin', 'cabina', 'cartas', 'desktop', 'foco', 'guestbook', 'inventory',
  'leaderboard', 'logros', 'manga-party', 'mercado-negro', 'pase-estelar',
  'snake', 'tienda', 'tienda-galactica', 'universo', 'vault', 'vinculos',
  'spotify-callback', 'notifications',
])

const DYNAMIC_PREFIXES = new Set([
  'transmission', 'community', 'profile', 'game', 'spaces',
])

const DYNAMIC_ROUTE_MAP: Record<string, string> = {
  transmission: 'postId',
  community: 'slug',
  profile: 'userId',
  game: 'gameId',
  spaces: 'spaceId',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
 * Convierte una ruta dinámica real en la URL del placeholder con query params.
 * Solo actúa en entornos nativos (static export).
 *
 * /transmission/abc123  →  /transmission/_?_id=abc123&_r=<ts>
 * /community/tech       →  /community/_?_id=tech&_r=<ts>
 * /danilord             →  /_?_u=danilord&_r=<ts>
 *
 * Devuelve null si no es necesario reescribir.
 */
export function toPlaceholderUrl(to: string): string | null {
  if (!isNativePlatform()) return null

  const [pathPart, queryPart] = to.split('?')
  const clean = pathPart.replace(/\/$/, '')
  const parts = clean.split('/').filter(Boolean)

  const ts = `_r=${Date.now()}`
  const extra = queryPart ? `&${queryPart}` : ''

  // /transmission/abc123  →  /transmission/_/?_id=abc123&_r=<ts>
  if (parts.length >= 2 && DYNAMIC_PREFIXES.has(parts[0]) && parts[1] !== '_') {
    return `/${parts[0]}/_/?_id=${encodeURIComponent(parts[1])}&${ts}${extra}`
  }

  // /danilord  →  /_/?_u=danilord&_r=<ts>
  if (parts.length === 1 && parts[0] !== '_' && !STATIC_PREFIXES.has(parts[0])) {
    return `/_/?_u=${encodeURIComponent(parts[0])}&${ts}${extra}`
  }

  return null
}

// Asegura trailing slash en paths estáticos para native (Next exige trailingSlash:true)
function withTrailingSlash(url: string): string {
  const [path, query] = url.split('?')
  if (path.endsWith('/')) return url
  // No tocar archivos con extensión ni el root "/"
  if (path === '/' || /\.[a-z0-9]+$/i.test(path)) return url
  return `${path}/${query ? `?${query}` : ''}`
}

// ─── Link ─────────────────────────────────────────────────────────────────────
//
// En Capacitor/Tauri WebView el client-side routing del App Router falla al hacer
// fetch del RSC payload ("This page couldn't load"). Para evitarlo, en native
// renderizamos un <a> nativo — el click dispara hard nav que sí resuelve bien
// contra los archivos estáticos de `out/`.

type LinkProps = Omit<ComponentProps<typeof NextLink>, 'href'> & { to: string }

export function Link({ to, children, ...props }: LinkProps) {
  const placeholder = useMemo(() => toPlaceholderUrl(to), [to])
  const href = placeholder ?? to

  // Rutas dinámicas: usar <a> nativo (hard nav) porque Next client router no
  // maneja bien los placeholders en static export. Rutas estáticas siguen con NextLink.
  if (placeholder && typeof window !== 'undefined' && isNativePlatform()) {
    return <a href={withTrailingSlash(href)} {...(props as any)}>{children}</a>
  }

  return (
    <NextLink href={href} {...props}>
      {children}
    </NextLink>
  )
}

// ─── NavLink ──────────────────────────────────────────────────────────────────

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

  const placeholder = useMemo(() => toPlaceholderUrl(to), [to])
  const href = placeholder ?? to

  return (
    <NextLink href={href} className={resolvedClass} {...props}>
      {resolvedChildren}
    </NextLink>
  )
}

// ─── Navigate ─────────────────────────────────────────────────────────────────

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  const router = useRouter()
  useEffect(() => {
    const placeholder = toPlaceholderUrl(to)
    const url = placeholder ?? to
    if (replace) router.replace(url)
    else router.push(url)
  }, [to, replace, router])
  return null
}

// ─── useLocation ──────────────────────────────────────────────────────────────

export function useLocation() {
  const pathname = usePathname()
  let sp: ReturnType<typeof useNextSearchParams> | null = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    sp = useNextSearchParams()
  } catch {
    // fallback when Suspense boundary not present
  }

  // Reconstruir pathname lógico si venimos de una ruta dinámica reescrita
  let logicalPathname = pathname
  if (sp) {
    const id = sp.get('_id')
    const u = sp.get('_u')
    // /transmission/_?_id=abc  → /transmission/abc
    const segments = (pathname ?? '').replace(/\/$/, '').split('/').filter(Boolean)
    if (id && segments.length >= 2 && segments[1] === '_') {
      logicalPathname = `/${segments[0]}/${id}`
    } else if (u && segments.length === 1 && segments[0] === '_') {
      logicalPathname = `/${u}`
    }
  }

  // Filtrar query params internos (_id, _u, _r) del search visible
  const search = sp
    ? (() => {
        const filtered = new URLSearchParams()
        sp.forEach((v, k) => { if (!['_id', '_u', '_r'].includes(k)) filtered.set(k, v) })
        const str = filtered.toString()
        return str ? `?${str}` : ''
      })()
    : ''

  return { pathname: logicalPathname, search, hash: '' }
}

// ─── useNavigate ──────────────────────────────────────────────────────────────

export function useNavigate() {
  const router = useRouter()
  return (to: string, options?: { replace?: boolean }) => {
    const placeholder = toPlaceholderUrl(to)
    const url = placeholder ?? to
    ;(window as any).__navLog?.('NAV', `useNavigate to="${to}" placeholder="${placeholder}"`)
    // Rutas dinámicas (reescritas al placeholder "_") no funcionan con el client
    // router de Next en static export — el pushState no dispara. Fallback a hard nav
    // SOLO para esos casos. Rutas estáticas siguen yendo por router.push normal.
    if (placeholder && isNativePlatform()) {
      const final = withTrailingSlash(url)
      if (options?.replace) window.location.replace(final)
      else window.location.assign(final)
      return
    }
    if (options?.replace) router.replace(url)
    else router.push(url)
  }
}

// ─── useParams ────────────────────────────────────────────────────────────────

export function useParams<T extends Record<string, string>>() {
  const nextParams = useNextParams() as Record<string, string>

  let sp: ReturnType<typeof useNextSearchParams> | null = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    sp = useNextSearchParams()
  } catch {
    // no Suspense boundary — sp permanece null
  }

  // Si algún param es el placeholder '_', leer el ID real del query
  const hasPlaceholder = Object.values(nextParams).some(v => v === '_')
  if (!hasPlaceholder || !sp) return nextParams as T

  // Caso: /transmission/_?_id=abc123
  const id = sp.get('_id')
  if (id) {
    // Determinar qué param corresponde según el pathname
    if (typeof window !== 'undefined') {
      const segments = window.location.pathname.replace(/\/$/, '').split('/').filter(Boolean)
      const prefix = segments[0]
      if (prefix && DYNAMIC_ROUTE_MAP[prefix]) {
        return { [DYNAMIC_ROUTE_MAP[prefix]]: id } as T
      }
    }
    // Fallback: devolver el primer param con el valor real
    const firstKey = Object.keys(nextParams)[0]
    if (firstKey) return { [firstKey]: id } as T
  }

  // Caso: /_?_u=danilord (username)
  const u = sp.get('_u')
  if (u) return { username: u } as unknown as T

  return nextParams as T
}

// ─── useSearchParams ──────────────────────────────────────────────────────────
// Retorna una tupla [URLSearchParams, setFn] compatible con React Router v6.
// Los componentes usan: const [searchParams, setSearchParams] = useSearchParams()
// Next.js useSearchParams() solo retorna el objeto — no una tupla.

type SetSearchParamsArg =
  | Record<string, string>
  | URLSearchParams
  | ((prev: URLSearchParams) => Record<string, string> | URLSearchParams)

export function useSearchParams(): [URLSearchParams, (params: SetSearchParamsArg) => void] {
  const sp = useNextSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const params = useMemo(
    () => new URLSearchParams(sp?.toString() ?? ''),
    [sp]
  )

  function setParams(newParams: SetSearchParamsArg) {
    let resolved: Record<string, string> | URLSearchParams
    if (typeof newParams === 'function') {
      resolved = newParams(new URLSearchParams(sp?.toString() ?? ''))
    } else {
      resolved = newParams
    }

    let search: string
    if (resolved instanceof URLSearchParams) {
      search = resolved.toString()
    } else {
      search = new URLSearchParams(resolved as Record<string, string>).toString()
    }

    router.replace(`${pathname}${search ? `?${search}` : ''}`)
  }

  return [params, setParams]
}

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

export function Routes({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function Route({ element }: { path?: string; element?: ReactNode; children?: ReactNode; index?: boolean }) {
  return <>{element}</>
}

export { AnimatePresence } from 'framer-motion'
