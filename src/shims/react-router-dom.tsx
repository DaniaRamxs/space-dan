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

export function useParams<T extends Record<string, string>>() {
  return useNextParams() as T
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
