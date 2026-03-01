import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing! Check your .env file and build process.');
  if (Capacitor.isNativePlatform()) {
    alert('Configuración de Supabase ausente. Verifica las variables de entorno.');
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Capacitor.isNativePlatform() ? capacitorStorage : localStorage,
    autoRefreshToken: true,
    persistSession: true,
    // On native we exchange the code manually via appUrlOpen, don't scan the WebView URL
    detectSessionInUrl: !Capacitor.isNativePlatform(),
    flowType: 'pkce',
  },
});

