import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './profile-v2.css'
import App from './App.jsx'
import { loadSavedTheme } from './hooks/useTheme'
import { App as CapacitorApp } from '@capacitor/app'
import { supabase } from './supabaseClient'

// Aplicar tema antes del render
loadSavedTheme()

// --- Deep Link + Auth bootstrap ---
async function initMobileAuth() {
  const { Browser } = await import('@capacitor/browser');
  let isExchanging = false; // Bloqueo para evitar doble ejecución

  CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
    console.log('Deep link detectado:', url);

    // Verificamos si la URL contiene el código de intercambio (PKCE)
    if (url.includes('code=') && !isExchanging) {
      isExchanging = true;

      try {
        // Extraer el código de la URL
        const parsedUrl = new URL(url);
        const code = parsedUrl.searchParams.get('code');

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error('Error en exchangeCodeForSession:', error.message);
          } else {
            console.log('Sesión establecida correctamente con PKCE');
          }
        }
      } catch (err) {
        console.error('Error procesando el deep link:', err);
      } finally {
        // Cerramos el browser nativo SIEMPRE después del intento de login
        await Browser.close();
        isExchanging = false;
      }
    }
  });

  // Listener para DEBUG y consistencia
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      console.log('Evento SIGNED_IN detectado:', session?.user?.email);
    }
    if (event === 'SIGNED_OUT') {
      console.log('Evento SIGNED_OUT detectado');
    }
  });
}

// Inicializar auth móvil
initMobileAuth()

// Render app
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)