'use client'
/**
 * NativeInit
 * Ejecuta la inicialización de Tauri y Capacitor que antes vivía en main.jsx.
 * Se monta en el root layout y no renderiza nada visible.
 */
import { useEffect } from 'react'
import { supabase, isTauri } from '@/lib/supabase/client'

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
    const { App: CapacitorApp } = await import('@capacitor/app')
    const { Browser } = await import('@capacitor/browser')
    let isExchanging = false

    const handleDeepLink = async (url: string) => {
      if (!url || !url.includes('code=') || isExchanging) return
      isExchanging = true
      try {
        const codeMatch = url.match(/[?&]code=([^&#]+)/)
        const code = codeMatch ? codeMatch[1] : null
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) console.error('[MobileAuth] Error exchangeCodeForSession:', error)
          else if (data?.session) {
            await new Promise(resolve => setTimeout(resolve, 500))
            const { data: check } = await supabase.auth.getSession()
            if (!check?.session) console.warn('[MobileAuth] Sesión no persistió')
          }
        }
      } catch (err) {
        console.error('[MobileAuth] Error procesando deep link:', err)
      } finally {
        setTimeout(async () => {
          try { await Browser.close() } catch {}
          isExchanging = false
        }, 1200)
      }
    }

    CapacitorApp.addListener('appUrlOpen', ({ url }: { url: string }) => {
      handleDeepLink(url)
    })

    const ret = await CapacitorApp.getLaunchUrl()
    if (ret?.url) handleDeepLink(ret.url)
  } catch (err) {
    console.warn('[NativeInit] initMobileAuth error:', err)
  }
}

async function initNative() {
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard')
    const { SplashScreen } = await import('@capacitor/splash-screen')
    const { App: CapacitorApp } = await import('@capacitor/app')

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
    let isNative = false

    try {
      import('@capacitor/core').then(({ Capacitor }) => {
        isNative = Capacitor.isNativePlatform()

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
      })
    } catch {}

    if (isTauri) {
      initTauri()
    }
  }, [])

  return null
}
