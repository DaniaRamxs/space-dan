'use client'
/**
 * AppTrackers — componentes "invisibles" que rastrean presencia, música y visitas.
 * Separados del layout principal para poder envolverlos en Suspense
 * (ya que usan useSearchParams internamente vía el shim de react-router-dom).
 */
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAuthContext } from '@/contexts/AuthContext'
import { useUniverse } from '@/contexts/UniverseContext'
import { trackPageVisit } from '@/hooks/useStarlys'
import { lastfmService } from '@/services/lastfmService'

// ─── PageTracker ─────────────────────────────────────────────────────────────

function PageTracker() {
  const pathname = usePathname()
  const auth = useAuthContext() as any
  const user = auth?.user
  useEffect(() => {
    if (user) trackPageVisit(pathname)
  }, [pathname, user])
  return null
}

// ─── PresenceTracker ─────────────────────────────────────────────────────────

function PresenceTracker() {
  const pathname = usePathname()
  const { updatePresence, activeStation, isPresenceReady } = useUniverse()
  const auth = useAuthContext() as any
  const profile = auth?.profile
  const lastStatus = useRef('')

  useEffect(() => {
    if (!profile || !isPresenceReady || !updatePresence) return
    const getBaseStatus = () => {
      if (!pathname) return 'NAVEGANDO POR SPACELY'
      if (pathname === '/chat') return 'EN EL CHAT GLOBAL 💬'
      if (pathname === '/cabina') return 'EN LA CABINA DE MANDO 🚀'
      if (pathname === '/desktop') return 'OPERANDO SPACE-OS 💻'
      if (pathname === '/tienda') return 'EN EL MERCADO ESTELAR 🛍️'
      if (pathname === '/spaces') return 'EXPLORANDO ESPACIOS 🌐'
      if (pathname.startsWith('/spaces/')) return 'EN UN ESPACIO 🚀'
      if (pathname === '/games') return 'EN EL SECTOR DE JUEGOS 🎮'
      if (pathname === '/universo') return 'OBSERVANDO EL COSMOS 🌌'
      if (pathname === '/explorar') return 'EXPLORANDO EL SISTEMA 🧭'
      if (pathname.startsWith('/@')) return 'MIRANDO UN PERFIL 👤'
      return 'NAVEGANDO POR SPACELY'
    }
    const activity = getBaseStatus()
    const finalStatus = activeStation ? `SINTONIZANDO: ${activeStation} 🎵 • ${activity}` : activity
    if (finalStatus !== lastStatus.current) {
      updatePresence({ status: finalStatus }).then((s: any) => {
        if (s !== false) lastStatus.current = finalStatus
      })
    }
  }, [pathname, profile?.id, updatePresence, activeStation, isPresenceReady, profile])
  return null
}

// ─── MusicSyncTracker ────────────────────────────────────────────────────────

function MusicSyncTracker() {
  const auth = useAuthContext() as any
  const user = auth?.user
  const pathname = usePathname()
  useEffect(() => {
    if (!user || pathname === '/spotify-callback') return
    const syncAll = () => {
      lastfmService.syncCurrentSoundState()
        .then((t: any) => t && console.log('[LastfmSync] Sincronizado:', t.name, '-', t.artist))
        .catch((e: any) => console.warn('[LastfmSync] Error:', e?.message || e))
    }
    syncAll()
    const interval = setInterval(syncAll, 30000)
    return () => clearInterval(interval)
  }, [user, pathname])
  return null
}

// ─── DarkSideManager ─────────────────────────────────────────────────────────

function DarkSideManager() {
  useEffect(() => {
    const check = () => {
      const h = new Date().getHours()
      if (h >= 0 && h < 5) document.body.classList.add('the-dark-side')
      else document.body.classList.remove('the-dark-side')
    }
    check()
    const id = setInterval(check, 60000)
    return () => clearInterval(id)
  }, [])
  return null
}

// ─── Export ──────────────────────────────────────────────────────────────────

export function AppTrackers() {
  return (
    <>
      <PageTracker />
      <PresenceTracker />
      <MusicSyncTracker />
      <DarkSideManager />
    </>
  )
}
