'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

/**
 * Ruta raíz — redirige según plataforma y estado de sesión.
 *
 * Web:    → /download  (página de descarga)
 * Nativo/Tauri sin sesión: → /onboarding  (login)
 * Nativo/Tauri con sesión: → /posts       (feed principal)
 */
export default function HomePageClient() {
  const router = useRouter()

  useEffect(() => {
    const isNative =
      (typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNative === true) ||
      (typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNativePlatform?.())

    const isTauri =
      (window as any).__TAURI_INTERNALS__ !== undefined ||
      (window as any).__TAURI__ !== undefined ||
      window.location.hostname === 'tauri.localhost' ||
      window.location.protocol === 'tauri:'

    if (!isNative && !isTauri) {
      router.replace('/download')
      return
    }

    // Es nativo o Tauri — verificar sesión antes de decidir destino
    const redirect = async () => {
      try {
        const { data: { session } } = await supabase!.auth.getSession()
        router.replace(session ? '/posts' : '/login')
      } catch {
        // Sin conexión o error — enviar a login por seguridad
        router.replace('/onboarding')
      }
    }

    redirect()
  }, [router])

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#030308]">
      <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  )
}
