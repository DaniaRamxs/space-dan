import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Detectar si estamos en Tauri
const isTauri = typeof window !== 'undefined' && (
  window.__TAURI_INTERNALS__ !== undefined ||
  window.__TAURI__ !== undefined ||
  window.location.hostname === 'tauri.localhost' ||
  window.location.protocol === 'tauri:'
);

// Adaptador de almacenamiento nativo para Capacitor
const capacitorStorage = {
  getItem: async (key) => {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key });
    return value;
  },
  setItem: async (key, value) => {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key, value });
  },
  removeItem: async (key) => {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.remove({ key });
  },
};

// Tauri usa WebView2 en Windows, que soporta localStorage nativamente y persiste entre sesiones.
// Usamos localStorage directamente — es más simple y evita overhead async innecesario.

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing! Check your .env file and build process.');
  if (Capacitor.isNativePlatform()) {
    alert('Configuración de Supabase ausente. Verifica las variables de entorno.');
  }
}

// Determinar el storage apropiado según el entorno
let storageAdapter;
if (Capacitor.isNativePlatform()) {
  storageAdapter = capacitorStorage;
  console.log('[Supabase] Usando Capacitor Storage para mobile');
} else if (isTauri) {
  storageAdapter = localStorage;
  console.log('[Supabase] Usando localStorage nativo para Tauri (WebView2)');
} else {
  storageAdapter = localStorage;
  console.log('[Supabase] Usando localStorage para web');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    // Deshabilitamos el escaneo automático de la URL porque lo manejamos manualmente
    // en AuthCallback.jsx (Web) y main.jsx (Nativo) para evitar errores de intercambio doble.
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

