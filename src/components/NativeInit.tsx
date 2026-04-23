'use client'
/**
 * NativeInit
 * Ejecuta la inicialización de Tauri y Capacitor que antes vivía en main.jsx.
 * Se monta en el root layout y no renderiza nada visible.
 *
 * Nota: Todos los `@capacitor/*` se importan ESTÁTICAMENTE. Los dynamic
 * imports (`await import('@capacitor/...')`) se colgaban en APK porque
 * Rolldown (Vite) no siempre empaqueta bien esos chunks → el fetch devolvía
 * el index.html SPA-fallback → parse error silencioso → promesa pending eterna.
 */
import { useEffect } from 'react'
import { supabase, isTauri } from '@/lib/supabase/client'
import { App as CapacitorApp } from '@capacitor/app'
import { Browser as CapacitorBrowser } from '@capacitor/browser'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Keyboard, KeyboardResize } from '@capacitor/keyboard'
import { SplashScreen } from '@capacitor/splash-screen'
import { Capacitor } from '@capacitor/core'

const ONE_SIGNAL_SUB_KEY = 'spacely_onesignal_subscription_id'
const ONE_SIGNAL_ID_KEY = 'spacely_onesignal_id'

function waitForDeviceReady() {
  if ((window as any).cordova?.platformId) return Promise.resolve()
  return new Promise<void>((resolve) => {
    document.addEventListener('deviceready', () => resolve(), { once: true })
  })
}

async function initOneSignal() {
  const oneSignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
  if (!oneSignalAppId) return

  try {
    await waitForDeviceReady()
    const oneSignal = (window as any).plugins?.OneSignal
    if (!oneSignal) return

    oneSignal.initialize(oneSignalAppId)

    oneSignal.Notifications.addEventListener('click', (event: any) => {
      window.dispatchEvent(new CustomEvent('native-push-action', { detail: event }))
    })

    const canRequest = await oneSignal.Notifications.canRequestPermission().catch(() => false)
    if (canRequest) {
      await oneSignal.Notifications.requestPermission(true).catch(() => {})
    }

    const { data } = await supabase.auth.getUser()
    if (data?.user?.id) oneSignal.login(data.user.id)

    supabase.auth.onAuthStateChange((_event: string, session: any) => {
      if (session?.user?.id) oneSignal.login(session.user.id)
      else oneSignal.logout()
    })

    const oneSignalId = await oneSignal.User.getOnesignalId().catch(() => null)
    const subscriptionId = await oneSignal.User.pushSubscription.getIdAsync().catch(() => null)
    if (oneSignalId) localStorage.setItem(ONE_SIGNAL_ID_KEY, oneSignalId)
    if (subscriptionId) localStorage.setItem(ONE_SIGNAL_SUB_KEY, subscriptionId)
  } catch (err) {
    console.warn('[OneSignal] No se pudo inicializar:', err)
  }
}

async function initMobileAuth() {
  try {
    alert('[MobileAuth A] Inicializando listener de deep links')
    let isExchanging = false

    const handleDeepLink = async (url: string) => {
      alert('[MobileAuth B] Deep link recibido: ' + url.slice(0, 100))
      if (!url) { alert('[MobileAuth B2] URL vacía, descartado'); return }
      if (!url.includes('code=')) { alert('[MobileAuth B3] URL sin code=, descartado'); return }
      if (isExchanging) { alert('[MobileAuth B4] Ya estoy canjeando, descartado'); return }
      isExchanging = true
      try {
        const codeMatch = url.match(/[?&]code=([^&#]+)/)
        const code = codeMatch ? codeMatch[1] : null
        if (code) {
          alert('[MobileAuth C] Canjeando code=' + code.slice(0, 20) + '...')
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            alert('[MobileAuth ERROR] exchangeCodeForSession: ' + error.message)
          } else if (data?.session) {
            alert('[MobileAuth D] ✅ Sesión creada! user=' + data.session.user?.email)
            await new Promise(resolve => setTimeout(resolve, 500))
            const { data: check } = await supabase.auth.getSession()
            if (!check?.session) alert('[MobileAuth E] ⚠️ Sesión no persistió')
            else alert('[MobileAuth E] ✅ Sesión persistió correctamente')
          } else {
            alert('[MobileAuth X] No hay error pero tampoco hay session')
          }
        } else {
          alert('[MobileAuth B5] Match regex falló')
        }
      } catch (err) {
        alert('[MobileAuth CATCH] Error: ' + (err as Error)?.message)
      } finally {
        setTimeout(async () => {
          try { await CapacitorBrowser.close() } catch {}
          isExchanging = false
        }, 1200)
      }
    }

    CapacitorApp.addListener('appUrlOpen', ({ url }: { url: string }) => {
      alert('[MobileAuth EVENT] appUrlOpen disparó con url=' + url.slice(0, 80))
      handleDeepLink(url)
    })

    const ret = await CapacitorApp.getLaunchUrl()
    if (ret?.url) {
      alert('[MobileAuth LAUNCH] Launch URL: ' + ret.url.slice(0, 80))
      handleDeepLink(ret.url)
    } else {
      alert('[MobileAuth LAUNCH] No launch URL (normal en arranque sin deep link)')
    }
  } catch (err) {
    alert('[MobileAuth FATAL] initMobileAuth error: ' + (err as Error)?.message)
  }
}

async function initNative() {
  try {
    // Imports estáticos ya cargados arriba del archivo.
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#050510' })
    await StatusBar.setOverlaysWebView({ overlay: false })

    Keyboard.setResizeMode({ mode: KeyboardResize.Body })

    setTimeout(() => SplashScreen.hide({ fadeOutDuration: 300 }), 400)

    CapacitorApp.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
      if (canGoBack) window.history.back()
      else CapacitorApp.minimizeApp()
    })
  } catch (err) {
    console.warn('[NativeInit] initNative error:', err)
  }
}

function initTauri() {
  // Deshabilitar menú contextual
  document.addEventListener('contextmenu', (e) => e.preventDefault())

  // F11 → fullscreen nativo
  import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
    const win = getCurrentWindow()
    document.addEventListener('keydown', async (e) => {
      if (e.key === 'F11') {
        e.preventDefault()
        await win.setFullscreen(!(await win.isFullscreen()))
      }
      if (e.key === 'F12') {
        ;(window as any).__TAURI_INTERNALS__?.invoke('plugin:webview|internal_toggle_devtools').catch(() => {})
      }
    })
  })

  // Mostrar ventana tras primer render
  setTimeout(() => {
    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      getCurrentWindow().show()
    })
  }, 80)

  // Purgar service workers en Tauri
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(reg => reg.unregister())
    })
  }
}

export function NativeInit() {
  useEffect(() => {
    // Capacitor está import estático arriba del archivo, podemos usarlo sincrono.
    let isNative = false
    try {
      isNative = Capacitor.isNativePlatform()
    } catch (err) {
      console.warn('[NativeInit] Capacitor.isNativePlatform falló:', err)
    }

    if (isNative) {
      document.documentElement.classList.add('native')
      initMobileAuth()
      initNative().then(() => {
        setTimeout(async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
            stream.getTracks().forEach(t => t.stop())
          } catch {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
              stream.getTracks().forEach(t => t.stop())
            } catch {}
          }
        }, 1200)
      })
      setTimeout(initOneSignal, 1400)
    }

    if (isTauri) {
      initTauri()
    }
  }, [])

  return null
}
