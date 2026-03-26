import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { ensureProfile, syncAchievementToDb } from '../services/supabaseScores';
import { Capacitor } from '@capacitor/core';

// Safe import for Browser (avoids issues in some environments)
let Browser = null;
if (Capacitor.isNativePlatform()) {
  import('@capacitor/browser').then(m => { Browser = m.Browser; });
}

const ACH_KEY = 'space-dan-achievements';


/**
 * Manages Supabase Auth session.
 * On login: ensures profile exists + syncs local achievements to DB.
 */
export default function useAuth() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);



  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.warn('[useAuth] Error recuperando sesión inicial:', error.message);
        // Si el error es de refresh token o similar, forzamos un logout para limpiar
        if (error.message.includes('refresh_token') || error.status === 400) {
          supabase.auth.signOut();
        }
      }
      setSession(session);
      if (!session) setProfileLoading(false);
      setLoading(false);
    }).catch(err => {
      console.error('[useAuth] Error crítico en getSession:', err);
      setProfileLoading(false);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setProfile(null);
        setProfileLoading(false);
      }
    });


    return () => subscription.unsubscribe();
  }, []);

  // Fetch Profile & Real-time Subscription
  const fetchProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          theme_item:equipped_theme(id, metadata),
          nick_style_item:equipped_nickname_style(id, metadata),
          primary_role_item:equipped_primary_role(id, title, metadata),
          secondary_role_item:equipped_secondary_role(id, title, metadata),
          ambient_sound_item:equipped_ambient_sound(id, title, metadata),
          banner_item:banner_item_id(id, title, metadata, preview_url),
          frame_item:frame_item_id(id, title, metadata, preview_url)
        `)
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) console.error('[useAuth] Fetch profile error:', error);
      setProfile(data);
    } catch (err) {
      console.error('[useAuth] Fetch profile critical error:', err);
    } finally {
      setProfileLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      return;
    }

    const user = session.user;
    ensureProfile(user);

    // Initial fetch
    fetchProfile();

    // Subscribe to profile changes
    const profileSubscription = supabase
      .channel(`profile:${session.user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${session.user.id}`
      }, (payload) => {
        fetchProfile();
      })
      .subscribe();

    const localAchs = (() => {
      try { return JSON.parse(localStorage.getItem(ACH_KEY) || '[]'); }
      catch { return []; }
    })();
    localAchs.forEach(id => syncAchievementToDb(id));

    // Update last_seen_at
    const ping = async () => {
      if (session?.user?.id) {
        await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', session.user.id);
      }
    };
    ping();
    const interval = setInterval(ping, 60000 * 5); // 5 min

    return () => {
      profileSubscription.unsubscribe();
      clearInterval(interval);
    };
  }, [session, fetchProfile]);


  const getRedirectUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    // Detectar si estamos en Tauri
    const isTauri = typeof window !== 'undefined' && (
      window.__TAURI_INTERNALS__ !== undefined ||
      window.__TAURI__ !== undefined ||
      window.location.hostname === 'tauri.localhost' ||
      window.location.protocol === 'tauri:'
    );

    // Si estamos en Tauri, usamos el redirect especial
    if (isTauri) {
      const tauriUrl = 'http://tauri.localhost/auth/callback';
      console.log('[Auth] Entorno Tauri detectado, redirect a:', tauriUrl);
      return tauriUrl;
    }

    // Si estamos en NATIVO (APK), usamos el esquema personalizado
    if (Capacitor.isNativePlatform() && (Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios')) {
      return 'com.dan.space://auth';
    }

    // Para cualquier entorno web (localhost, IPs locales o producción), 
    // usamos el origen actual para que la sesión se guarde en este dominio.
    const url = `${origin}/auth/callback`;
    console.log('[Auth] Redirección configurada a:', url);
    return url;
  };

  const loginWithProvider = async (provider) => {
    try {
      const isNative = Capacitor.isNativePlatform();
      const redirectUrl = getRedirectUrl();

      // Detectar si estamos en Tauri
      const isTauri = typeof window !== 'undefined' && (
        window.__TAURI_INTERNALS__ !== undefined ||
        window.__TAURI__ !== undefined ||
        window.location.hostname === 'tauri.localhost' ||
        window.location.protocol === 'tauri:'
      );

      console.log(`[OAuth] Iniciando login con ${provider}`);
      console.log(`[OAuth] Entorno detectado:`, { isNative, isTauri });
      console.log(`[OAuth] Redirect URL: ${redirectUrl}`);

      if (isNative) {
        console.log(`[OAuth] Configurando para mobile con redirect a: ${redirectUrl}`);
      } else if (isTauri) {
        console.log(`[OAuth] Configurando para Tauri con redirect a: ${redirectUrl}`);
      }

      // Validar que Supabase esté configurado
      if (!supabase.auth) {
        throw new Error('Supabase Auth no está inicializado.');
      }

      console.log(`[OAuth] Llamando a signInWithOAuth...`);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: isNative,
          queryParams: {
            prompt: 'select_account'
          }
        },
      });

      console.log(`[OAuth] Respuesta de Supabase:`, { data, error });

      if (error) {
        console.error(`[OAuth] Error en signInWithOAuth:`, error);
        if (isNative) alert(`Error Supabase OAuth: ${error.message}`);
        throw error;
      }

      if (isNative) {
        if (data?.url) {
          console.log(`[OAuth] Abriendo navegador con URL: ${data.url}`);
          if (Browser) {
            await Browser.open({ url: data.url });
          } else {
            // Fallback: try to import again if not ready
            console.log(`[OAuth] Browser no está listo, importando dinámicamente...`);
            const { Browser: B } = await import('@capacitor/browser');
            await B.open({ url: data.url });
          }
        } else {
          console.error('[OAuth] No se recibió URL de Supabase');
          alert('Error: Supabase no devolvió una URL para el login móvil.');
        }
      } else {
        console.log(`[OAuth] Login ${isTauri ? 'Tauri' : 'web'} iniciado, esperando redirect...`);
      }

    } catch (err) {
      console.error(`Error logging in with ${provider}:`, err);
      if (Capacitor.isNativePlatform()) {
        alert(`Error fatal en login: ${err.message || 'Error desconocido'}`);
      }
    }
  };




  const loginWithGoogle = () => loginWithProvider('google');
  const loginWithDiscord = () => loginWithProvider('discord');
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // Fallback: clear local storage if sign out fails
      localStorage.removeItem('sb-dwhobtphhacmoogullxk-auth-token');
      window.location.href = '/';
    }
  };

  const deleteAccount = async () => {
    try {
      const { error } = await supabase.rpc('delete_user_account');
      if (error) throw error;
      await logout();
      return { success: true };
    } catch (err) {
      console.error('[useAuth] Error deleting account:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    session,
    user: session?.user ?? null,
    profile,
    // Solo bloquea hasta saber si hay sesión (lee de localStorage, <5ms).
    // El perfil llega después en background; las páginas manejan profile===null con skeleton.
    loading,
    profileLoading,
    refreshProfile: fetchProfile,
    loginWithGoogle,
    loginWithDiscord,
    logout,
    deleteAccount,
  };
}
