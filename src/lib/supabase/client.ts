/**
 * Cliente Supabase multi-plataforma
 * Soporta: Web (localStorage), Tauri (localStorage nativo), Capacitor (Preferences API)
 *
 * Migrado desde space-dan/frontend/src/supabaseClient.js
 * Cambio principal: process.env.NEXT_PUBLIC_* → process.env.NEXT_PUBLIC_*
 */
import { createClient as _createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ─── Platform detection ───────────────────────────────────────────────────────

export const isTauri =
  typeof window !== 'undefined' &&
  (
    (window as any).__TAURI_INTERNALS__ !== undefined ||
    (window as any).__TAURI__ !== undefined ||
    window.location.hostname === 'tauri.localhost' ||
    window.location.protocol === 'tauri:'
  )

// ─── Capacitor storage adapter ───────────────────────────────────────────────

const capacitorStorage = {
  getItem: async (key: string) => {
    const { Preferences } = await import('@capacitor/preferences')
    const { value } = await Preferences.get({ key })
    return value
  },
  setItem: async (key: string, value: string) => {
    const { Preferences } = await import('@capacitor/preferences')
    await Preferences.set({ key, value })
  },
  removeItem: async (key: string) => {
    const { Preferences } = await import('@capacitor/preferences')
    await Preferences.remove({ key })
  },
}

// ─── Singleton ───────────────────────────────────────────────────────────────

function buildClient() {
  if (typeof window === 'undefined') {
    // SSR: cliente mínimo sin storage
    return _createClient(supabaseUrl, supabaseAnonKey)
  }

  let storageAdapter: any = localStorage

  // Detectar Capacitor nativo sin romper si no está instalado
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Capacitor } = require('@capacitor/core')
    if (Capacitor.isNativePlatform()) {
      storageAdapter = capacitorStorage
    }
  } catch {
    // Capacitor no disponible (build web puro)
  }

  return _createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: storageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // manejado manualmente en /auth/callback
      flowType: 'pkce',
    },
  })
}

// Exportamos como `supabase` (igual que space-dan) para compatibilidad directa
export const supabase = buildClient()

// También exportamos createClient() (patrón mi-saas original)
export function createClient() {
  return supabase
}
