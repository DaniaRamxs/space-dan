'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

/**
 * HomePageClient — modo SPA puro para Capacitor/Tauri.
 *
 * Estrategia (replica el modelo Vite que sí funcionaba):
 * Capacitor sirve el mismo HTML raíz para TODAS las rutas. Este componente
 * se monta en cada navegación y decide qué página renderizar según
 * window.location.pathname, envolviéndola con el GardenLayout.
 *
 * En web (no-native) mantiene el comportamiento original: redirige a
 * /download o /posts según sesión.
 */

// ─── Layout ──────────────────────────────────────────────────────────────────
const GardenLayout = dynamic(() => import('@/layouts/GardenLayout'), { ssr: false })

// ─── Mapping de rutas estáticas ─────────────────────────────────────────────
const STATIC_ROUTES: Record<string, any> = {
  '/posts':             dynamic(() => import('@/pages/PostsPage'), { ssr: false }),
  '/communities':       dynamic(() => import('@/pages/CommunitiesPage'), { ssr: false }),
  '/chat':              dynamic(() => import('@/pages/GlobalChatPage'), { ssr: false }),
  '/explorar':          dynamic(() => import('@/pages/ExplorePage'), { ssr: false }),
  '/games':             dynamic(() => import('@/pages/GamesPage'), { ssr: false }),
  '/tienda':            dynamic(() => import('@/pages/ShopPage'), { ssr: false }),
  '/tienda-galactica':  dynamic(() => import('@/pages/GalacticStore'), { ssr: false }),
  '/cabina':            dynamic(() => import('@/pages/SpaceCabinPage'), { ssr: false }),
  '/cartas':            dynamic(() => import('@/pages/OrbitLettersPage'), { ssr: false }),
  '/download':          dynamic(() => import('@/pages/DownloadPage'), { ssr: false }),
  '/vault':             dynamic(() => import('@/pages/VaultPage'), { ssr: false }),
  '/vinculos':          dynamic(() => import('@/pages/VinculosPage'), { ssr: false }),
  '/universo':          dynamic(() => import('@/pages/UniversoPage'), { ssr: false }),
  '/spaces':            dynamic(() => import('@/pages/SpacesPage'), { ssr: false }),
  '/login':             dynamic(() => import('@/pages/LoginPage'), { ssr: false }),
  '/onboarding':        dynamic(() => import('@/pages/OnboardingPage'), { ssr: false }),
  '/desktop':           dynamic(() => import('@/pages/DesktopPage'), { ssr: false }),
  '/foco':              dynamic(() => import('@/pages/FocusRoom'), { ssr: false }),
  '/guestbook':         dynamic(() => import('@/pages/GuestbookPage'), { ssr: false }),
  '/inventory':         dynamic(() => import('@/pages/InventoryPage'), { ssr: false }),
  '/leaderboard':       dynamic(() => import('@/pages/GlobalLeaderboardPage'), { ssr: false }),
  '/logros':            dynamic(() => import('@/pages/AchievementsPage'), { ssr: false }),
  '/pase-estelar':      dynamic(() => import('@/pages/StellarPassPage'), { ssr: false }),
  '/mercado-negro':     dynamic(() => import('@/pages/BlackMarketPage'), { ssr: false }),
  '/banco':             dynamic(() => import('@/pages/BankPage'), { ssr: false }),
  '/bulletin':          dynamic(() => import('@/pages/BulletinPage'), { ssr: false }),
  '/arquitectura':      dynamic(() => import('@/pages/ArquitecturaPage'), { ssr: false }),
  '/afinidad':          dynamic(() => import('@/pages/AffinityPage'), { ssr: false }),
  '/ahora-suena':       dynamic(() => import('@/pages/GlobalMusicFeedPage'), { ssr: false }),
  '/manga-party':       dynamic(() => import('@/spacely-features/manga/MangaPartyPage'), { ssr: false }),
  '/kinnies':           dynamic(() => import('@/pages/KinniesPage'), { ssr: false }),
  '/tests':             dynamic(() => import('@/pages/TestsPage'), { ssr: false }),
  '/notifications':     dynamic(() => import('@/pages/PostsPage'), { ssr: false }),
  '/profile':           dynamic(() => import('@/pages/Profile/ProfileOwn'), { ssr: false }),
  '/spotify-callback':  dynamic(() => import('@/pages/SpotifyCallback'), { ssr: false }),
}

// ─── Matchers para rutas dinámicas ──────────────────────────────────────────
const DYNAMIC_MATCHERS: { prefix: string; Component: any }[] = [
  { prefix: '/profile/',      Component: dynamic(() => import('@/pages/Profile/ProfilePublic'), { ssr: false }) },
  { prefix: '/transmission/', Component: dynamic(() => import('@/pages/PostDetailPage'), { ssr: false }) },
  { prefix: '/community/',    Component: dynamic(() => import('@/pages/CommunityPage'), { ssr: false }) },
  { prefix: '/game/',         Component: dynamic(() => import('@/pages/GamesPage'), { ssr: false }) },
  { prefix: '/spaces/',       Component: dynamic(() => import('@/pages/SpaceSessionPage'), { ssr: false }) },
  { prefix: '/log/',          Component: dynamic(() => import('@/pages/PostDetailPage'), { ssr: false }) },
]

const UsernameRoute = dynamic(() => import('@/pages/Profile/ProfileRedesign'), { ssr: false })

// ─── Helpers ────────────────────────────────────────────────────────────────
function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as any
  return (
    (typeof w.Capacitor !== 'undefined' && w.Capacitor.isNativePlatform?.()) ||
    w.__TAURI_INTERNALS__ !== undefined ||
    w.location.hostname === 'tauri.localhost' ||
    w.location.protocol === 'tauri:'
  )
}

function LoadingSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#030308]">
      <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  )
}

function resolveComponent(pathname: string) {
  const clean = pathname.replace(/\/+$/, '') || '/'

  // Rutas estáticas exactas
  if (STATIC_ROUTES[clean]) return STATIC_ROUTES[clean]

  // Rutas dinámicas por prefijo
  for (const m of DYNAMIC_MATCHERS) {
    if (clean.startsWith(m.prefix)) return m.Component
  }

  // /@username o /:username  → ProfileRedesign
  const parts = clean.split('/').filter(Boolean)
  if (parts.length === 1) {
    const first = parts[0]
    if (!first.startsWith('_') && first !== 'api') return UsernameRoute
  }

  return null
}

// ─── Componente principal ───────────────────────────────────────────────────
export default function HomePageClient() {
  const router = useRouter()
  const [pathname, setPathname] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  )
  const [hasHandledRoot, setHasHandledRoot] = useState(false)

  // Patch history y escucha cambios de ruta
  useEffect(() => {
    if (typeof window === 'undefined') return
    const update = () => setPathname(window.location.pathname)

    window.addEventListener('popstate', update)

    const origPush = history.pushState.bind(history)
    const origReplace = history.replaceState.bind(history)
    history.pushState = function (...args: any[]) {
      origPush(...(args as [any, string, string?]))
      update()
    }
    history.replaceState = function (...args: any[]) {
      origReplace(...(args as [any, string, string?]))
      update()
    }

    return () => {
      window.removeEventListener('popstate', update)
      history.pushState = origPush
      history.replaceState = origReplace
    }
  }, [])

  const native = isNativePlatform()
  const clean = pathname.replace(/\/+$/, '') || '/'
  const isRoot = clean === '/' || clean === ''

  // Redirect inicial desde la raíz
  useEffect(() => {
    if (!isRoot || hasHandledRoot) return
    setHasHandledRoot(true)

    if (!native) {
      router.replace('/download')
      return
    }

    const doRedirect = async () => {
      try {
        const { data: { session } } = await supabase!.auth.getSession()
        const dest = session ? '/posts/' : '/login/'
        history.replaceState(null, '', dest)
        setPathname(dest)
      } catch {
        history.replaceState(null, '', '/login/')
        setPathname('/login/')
      }
    }
    doRedirect()
  }, [isRoot, hasHandledRoot, native, router])

  // Web: mantener comportamiento original (spinner mientras redirect)
  if (!native) return <LoadingSpinner />

  // Native: si estamos en root, esperar al redirect
  if (isRoot) return <LoadingSpinner />

  // Native: resolver componente y renderizar
  const Component = resolveComponent(clean)
  if (!Component) {
    return (
      <GardenLayout>
        <div className="p-8 text-white text-center">
          <h1 className="text-2xl mb-4">Ruta no encontrada</h1>
          <p className="text-white/50 text-sm font-mono break-all">{clean}</p>
        </div>
      </GardenLayout>
    )
  }

  return (
    <GardenLayout>
      <Component />
    </GardenLayout>
  )
}
