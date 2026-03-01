import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './profile-v2.css'
import App from './App.jsx'
import { loadSavedTheme } from './hooks/useTheme'
import { supabase } from './supabaseClient'
import { Capacitor } from '@capacitor/core'

// Aplicar tema antes del render
loadSavedTheme()

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
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('[MobileAuth] Error exchangeCodeForSession:', error);
          } else {
            console.log('[MobileAuth] Sesión establecida correctamente');
          }
        }
      } catch (err) {
        console.error('[MobileAuth] Error procesando el deep link:', err);
      } finally {
        setTimeout(async () => {
          await Browser.close();
          isExchanging = false;
        }, 800);
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

// Inicializar auth solo si estamos en nativo
if (Capacitor.isNativePlatform()) {
  initMobileAuth();
  initNative();
}

// Service Worker habilitado para caché de assets (mejora carga en móvil y PC)
// Nota: si necesitas depurar layout en móvil, puedes descommentar el bloque de abajo
// temporalmente, pero NO dejarlo en producción.
// if ('serviceWorker' in navigator && !Capacitor.isNativePlatform()) {
//   navigator.serviceWorker.getRegistrations().then((regs) => {
//     regs.forEach((reg) => reg.unregister());
//   });
// }

// Render app
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
