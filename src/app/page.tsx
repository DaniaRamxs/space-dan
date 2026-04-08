'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Ruta raíz — redirige al download page (web) o al feed (nativo/Tauri).
 * Mismo comportamiento que App.jsx de space-dan.
 */
export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    let isNative = false
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Capacitor } = require('@capacitor/core')
      isNative = Capacitor.isNativePlatform()
    } catch {}

    const isTauri =
      typeof window !== 'undefined' &&
      ((window as any).__TAURI_INTERNALS__ !== undefined ||
        (window as any).__TAURI__ !== undefined ||
        window.location.hostname === 'tauri.localhost' ||
        window.location.protocol === 'tauri:')

    if (isNative || isTauri) {
      router.replace('/posts')
    } else {
      router.replace('/download')
    }
  }, [router])

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#030308]">
      <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  )
}
