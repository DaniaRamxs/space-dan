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
      console.log('Deep link detectado:', url);
      if (url.includes('code=') && !isExchanging) {
        isExchanging = true;
        try {
          const parsedUrl = new URL(url);
          const code = parsedUrl.searchParams.get('code');
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;
          }
        } catch (err) {
          console.error('Error procesando el deep link:', err);
        } finally {
          await Browser.close();
          isExchanging = false;
        }
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