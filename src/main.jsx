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

    CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
      console.log('[MobileAuth] Deep link detectado:', url);

      if (url.includes('code=') && !isExchanging) {
        isExchanging = true;
        console.log('[MobileAuth] Intercambiando código por sesión...');
        try {
          const parsedUrl = new URL(url);
          const code = parsedUrl.searchParams.get('code');
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
              console.error('[MobileAuth] Error exchangeCodeForSession:', error);
              alert(`Error de sesión: ${error.message}`);
            } else {
              console.log('[MobileAuth] Sesión establecida correctamente');
            }
          }
        } catch (err) {
          console.error('[MobileAuth] Error procesando el deep link:', err);
          alert(`Error en deep link: ${err.message}`);
        } finally {
          setTimeout(async () => {
            await Browser.close();
            isExchanging = false;
          }, 500);
        }
      }
    });

    // También manejar el caso donde la app se abre desde un link estando cerrada
    CapacitorApp.getLaunchUrl().then((ret) => {
      if (ret?.url) {
        console.log('[MobileAuth] Launch URL detectada:', ret.url);
        // El listener appUrlOpen debería disparar esto también en la mayoría de los casos,
        // pero lo registramos por si acaso.
      }
    });

  } catch (err) {
    console.warn('No se pudo inicializar la autenticación móvil:', err);
  }
}


// Inicializar auth solo si estamos en nativo
if (Capacitor.isNativePlatform()) {
  initMobileAuth();
}

// Render app
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)