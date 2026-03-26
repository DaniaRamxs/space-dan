// Trigger build 2026-03-06
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './profile-v2.css'
import App from './App.jsx'
import { YouTubeProvider } from './contexts/YouTubeContext'
import { loadSavedTheme } from './hooks/useTheme'
import { supabase } from './supabaseClient'
import { Capacitor } from '@capacitor/core'

// Aplicar tema antes del render
loadSavedTheme()

const ONE_SIGNAL_SUB_KEY = 'spacely_onesignal_subscription_id'
const ONE_SIGNAL_ID_KEY = 'spacely_onesignal_id'

function waitForDeviceReady() {
  if (window.cordova?.platformId) return Promise.resolve()
  return new Promise((resolve) => {
    document.addEventListener('deviceready', () => resolve(), { once: true })
  })
}

async function initOneSignal() {
  if (!Capacitor.isNativePlatform()) return

  const oneSignalAppId = import.meta.env.VITE_ONESIGNAL_APP_ID
  if (!oneSignalAppId) {
    console.warn('[OneSignal] Falta VITE_ONESIGNAL_APP_ID en .env')
    return
  }

  try {
    await waitForDeviceReady()
    const oneSignal = window.plugins?.OneSignal

    if (!oneSignal) {
      console.warn('[OneSignal] Plugin no disponible en runtime nativo')
      return
    }

    oneSignal.initialize(oneSignalAppId)

    oneSignal.Notifications.addEventListener('click', (event) => {
      window.dispatchEvent(new CustomEvent('native-push-action', { detail: event }))
    })

    const canRequest = await oneSignal.Notifications.canRequestPermission().catch(() => false)
    if (canRequest) {
      await oneSignal.Notifications.requestPermission(true).catch(() => { })
    }

    const { data } = await supabase.auth.getUser()
    if (data?.user?.id) {
      oneSignal.login(data.user.id)
    }

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) {
        oneSignal.login(session.user.id)
      } else {
        oneSignal.logout()
      }
    })

    const oneSignalId = await oneSignal.User.getOnesignalId().catch(() => null)
    const subscriptionId = await oneSignal.User.pushSubscription.getIdAsync().catch(() => null)
    if (oneSignalId) localStorage.setItem(ONE_SIGNAL_ID_KEY, oneSignalId)
    if (subscriptionId) localStorage.setItem(ONE_SIGNAL_SUB_KEY, subscriptionId)
  } catch (err) {
    console.warn('[OneSignal] No se pudo inicializar:', err)
  }
}

// --- Deep Link + Auth bootstrap ---
async function initMobileAuth() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { App: CapacitorApp } = await import('@capacitor/app');
    const { Browser } = await import('@capacitor/browser');
    let isExchanging = false;

    const handleDeepLink = async (url) => {
      console.log('[MobileAuth] Procesando URL:', url);
      if (!url || !url.includes('code=') || isExchanging) return;

      isExchanging = true;
      console.log('[MobileAuth] Intercambiando código por sesión...');

      try {
        // Extraer código de forma segura (funciona incluso si no es un objeto URL válido)
        const codeMatch = url.match(/[?&]code=([^&#]+)/);
        const code = codeMatch ? codeMatch[1] : null;

        if (code) {
          console.log('[MobileAuth] Código extraído, intercambiando...');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          
          if (error) {
            console.error('[MobileAuth] Error exchangeCodeForSession:', error);
          } else if (data?.session) {
            console.log('[MobileAuth] Sesión establecida correctamente, User ID:', data.session.user.id);
            
            // Esperar a que la sesión se guarde completamente
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Verificar que la sesión persistió
            const { data: sessionCheck } = await supabase.auth.getSession();
            if (sessionCheck?.session) {
              console.log('[MobileAuth] Sesión persistida correctamente');
            } else {
              console.warn('[MobileAuth] La sesión no persistió, puede haber race condition');
            }
          }
        }
      } catch (err) {
        console.error('[MobileAuth] Error procesando el deep link:', err);
      } finally {
        // Cerrar browser después de un delay para asegurar que todo se procese
        setTimeout(async () => {
          try {
            await Browser.close();
          } catch (e) {
            console.warn('[MobileAuth] Error cerrando browser:', e);
          }
          isExchanging = false;
        }, 1200);
      }
    };

    // Escuchar links mientras la app está abierta
    CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      handleDeepLink(url);
    });

    // Manejar caso donde la app se abre desde un link estando cerrada
    const ret = await CapacitorApp.getLaunchUrl();
    if (ret?.url) {
      handleDeepLink(ret.url);
    }

  } catch (err) {
    console.warn('No se pudo inicializar la autenticación móvil:', err);
  }
}


// --- Native platform init (status bar, keyboard, splash, back button) ---
async function initNative() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    const { Keyboard } = await import('@capacitor/keyboard');
    const { SplashScreen } = await import('@capacitor/splash-screen');
    const { App: CapacitorApp } = await import('@capacitor/app');

    // Status bar: dark text/icons, match app background
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#050510' });
    await StatusBar.setOverlaysWebView({ overlay: false });

    // Keyboard: resize body so chat inputs aren't covered
    Keyboard.setResizeMode({ mode: 'body' });

    // Hide splash screen after short delay so app has time to paint
    setTimeout(() => SplashScreen.hide({ fadeOutDuration: 300 }), 400);

    // Android hardware back button: navigate back or minimize app
    CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        CapacitorApp.minimizeApp();
      }
    });

  } catch (err) {
    console.warn('[NativeInit] Error:', err);
  }
}

// --- Solicitar permisos de runtime (micrófono, cámara, notificaciones) ---
async function requestPermissions() {
  if (!Capacitor.isNativePlatform()) return;

  // Micrófono + Cámara: getUserMedia activa el diálogo nativo de Android
  // Capacitor's BridgeWebChromeClient forwarda onPermissionRequest al sistema
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    stream.getTracks().forEach(t => t.stop());
  } catch {
    // Si rechazan cámara, intentar solo micrófono (esencial para voz)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch { /* usuario denegó */ }
  }

  // Permiso de notificaciones se solicita desde OneSignal.
}

// Inicializar auth solo si estamos en nativo
if (Capacitor.isNativePlatform()) {
  // Marcar el documento para poder usar selectores CSS nativos
  document.documentElement.classList.add('native');
  initMobileAuth();
  initNative().then(() => {
    // Pedir permisos tras el splash screen (≈700ms) + margen
    setTimeout(requestPermissions, 1200);
  });
  setTimeout(initOneSignal, 1400);
}

// Service Worker habilitado para caché de assets (mejora carga en móvil y PC)
// Nota: si necesitas depurar layout en móvil, puedes descommentar el bloque de abajo
// temporalmente, pero NO dejarlo en producción.
// if ('serviceWorker' in navigator && !Capacitor.isNativePlatform()) {
//   navigator.serviceWorker.getRegistrations().then((regs) => {
//     regs.forEach((reg) => reg.unregister());
//   });
// }

// Auto-reload when a lazy-loaded chunk 404s (stale cached index.html after deploy)
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

// Render app
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <YouTubeProvider>
      <App />
    </YouTubeProvider>
  </StrictMode>
)

// Core Web Vitals — reporte no bloqueante, solo en producción
if (import.meta.env.PROD) {
  import('web-vitals').then(({ onCLS, onINP, onLCP, onFCP, onTTFB }) => {
    const report = ({ name, value, rating }) => {
      // En producción: loguea en consola. Para enviar a analytics, reemplaza con fetch/supabase.
      console.debug(`[Vitals] ${name}: ${Math.round(value)}ms (${rating})`);
    };
    onCLS(report);
    onINP(report);
    onLCP(report);
    onFCP(report);
    onTTFB(report);
  }).catch(() => {});
}

// Purga de Service Workers en Tauri o localhost para evitar redirecciones de caché o dominios persistentes (como Vercel)
const isTauriEnv = typeof window !== 'undefined' && (window.__TAURI_INTERNALS__ !== undefined || window.__TAURI__ !== undefined);
if (isTauriEnv || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(reg => reg.unregister().then(() => console.log('[Dev/Tauri] SW purgado para evitar redirecciones de caché')));
    });
  }
}
