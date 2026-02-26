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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Usamos capacitorStorage solo si estamos en plataforma nativa
    storage: Capacitor.isNativePlatform() ? capacitorStorage : localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
