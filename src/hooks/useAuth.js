import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { ensureProfile, syncAchievementToDb } from '../services/supabaseScores';
import { Capacitor } from '@capacitor/core';
// IMPORT ESTÁTICO (no dinámico): Vite empaqueta @capacitor/browser dentro del
// bundle principal. El import dinámico se colgaba en APK porque Rolldown no
// empaquetaba el chunk (verificado: no existía `capacitor-browser-*.js` en dist)
// y el fetch del chunk inexistente devolvía el index.html (fallback SPA),
// produciendo un parse error silencioso → promesa pending eterna → cuelgue.
// El módulo es seguro de cargar también en web (solo expone Browser.open, etc.).
import { Browser as CapacitorBrowser } from '@capacitor/browser';

const getCapacitorBrowser = () => {
  try {
    if (!Capacitor.isNativePlatform?.()) return null;
    return CapacitorBrowser;
  } catch (err) {
    console.warn('[useAuth] Capacitor no disponible:', err);
    return null;
  }
};

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
    const initializeAuth = async () => {
      try {
        // Detectar si estamos en Tauri para logging
        const isTauri = typeof window !== 'undefined' && (
          window.__TAURI_INTERNALS__ !== undefined ||
          window.__TAURI__ !== undefined ||
          window.location.hostname === 'tauri.localhost' ||
          window.location.protocol === 'tauri:'
        );

        console.log('[useAuth] Inicializando auth en entorno:', { isTauri, platform: Capacitor.getPlatform() });

        // Para Tauri, esperar un poco más para asegurar que el storage esté listo
        if (isTauri) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Timeout de 6s para Capacitor: si getSession() cuelga (Preferences API lenta),
        // no quedarse en pantalla negra — asumir sin sesión y dejar que el usuario haga login.
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve({ data: { session: null }, error: new Error('getSession timeout') }), 2500)
        );
        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);

        if (error) {
          console.warn('[useAuth] Error recuperando sesión inicial:', error.message);
        }
        
        setSession(session);
        if (!session) setProfileLoading(false);
        setLoading(false);
      } catch (err) {
        console.error('[useAuth] Error crítico en getSession:', err);
        setProfileLoading(false);
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[useAuth] Cambio de estado de auth:', _event, session ? 'Sesión activa' : 'Sin sesión');
      
      if (_event === 'TOKEN_REFRESHED') {
        console.log('[useAuth] Token refrescado exitosamente');
      }
      
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
      }, () => {
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
      // En dev mode (localhost:XXXX), el WebView sirve desde localhost, no tauri.localhost.
      // En producción el WebView usa tauri.localhost como origen.
      const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;
      const tauriUrl = isDev
        ? `${origin}/auth/callback`
        : 'http://tauri.localhost/auth/callback';
      console.log('[Auth] Entorno Tauri detectado, redirect a:', tauriUrl, isDev ? '(dev)' : '(prod)');
      return tauriUrl;
    }

    // Si estamos en NATIVO (APK), usamos la página web como PUENTE.
    // Google OAuth en WebView Android no maneja bien los redirects directos a
    // custom schemes (com.dan.space://). En cambio, enviamos el redirect a
    // un HTML estático (auth-bridge.html) que dispara el scheme.
    // Usamos ".html" explícito para que Vercel lo sirva como archivo estático
    // SIN ambigüedad con el SPA router (que respondería la app Spacely).
    if (Capacitor.isNativePlatform() && (Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios')) {
      return 'https://www.joinspacely.com/auth-bridge.html?native=1';
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

      console.log(`[OAuth] Iniciando login con ${provider}`, { isNative, isTauri, redirectUrl });

      // ─── CAMINO NATIVO (APK): NAVEGACIÓN INTERNA DEL WEBVIEW ─────────────
      // Estrategia correcta para OAuth en Capacitor/Android:
      //
      // PROBLEMA anterior: abríamos el OAuth en Chrome externo → Supabase
      // guardaba el PKCE `code_verifier` en el WebView de la app (cookies)
      // pero el callback llegaba a Chrome → cuando intentábamos volver a la
      // app con el `code`, Supabase no tenía el `code_verifier` (contextos
      // distintos) → error "state error" / "invalid request".
      //
      // SOLUCIÓN: navegar el MISMO WebView a la URL OAuth. Capacitor permite
      // navegar entre dominios sin problema. Google hace su redirect hacia
      // la bridge `auth-bridge.html` (que también se sirve en el mismo
      // WebView porque Vercel responde joinspacely.com). La bridge detecta
      // `hostname === 'localhost'` y salta a `/#/auth/callback?code=...`.
      // El `code` llega al React Router, que llama `exchangeCodeForSession`.
      // Como todo sucede en el mismo WebView, las cookies de PKCE están
      // disponibles → ✅ login exitoso.
      if (isNative) {
        if (!supabase.auth) {
          throw new Error('Supabase Auth no está inicializado.');
        }

        console.log(`[OAuth] Nativo: llamando signInWithOAuth con redirect interno`);
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true, // Nosotros hacemos el redirect manual abajo
            queryParams: {
              prompt: 'select_account'
            }
          },
        });

        if (error) {
          console.error('[OAuth] Error signInWithOAuth:', error);
          alert('Error OAuth: ' + error.message);
          return;
        }

        if (!data?.url) {
          alert('Error: Supabase no devolvió URL OAuth');
          return;
        }

        console.log('[OAuth] Navegando WebView a:', data.url);
        // Navegación del MISMO WebView a la URL OAuth. Preserva cookies/PKCE.
        window.location.href = data.url;
        return;
      }

      // ─── CAMINO TAURI / WEB: signInWithOAuth normal ──────────────────────
      if (!supabase.auth) {
        throw new Error('Supabase Auth no está inicializado.');
      }

      console.log(`[OAuth] Llamando a signInWithOAuth...`);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: isTauri,
          queryParams: {
            prompt: 'select_account'
          }
        },
      });

      console.log(`[OAuth] Respuesta de Supabase:`, { data, error });

      if (error) {
        console.error(`[OAuth] Error en signInWithOAuth:`, error);
        if (isTauri) alert(`Error Supabase OAuth: ${error.message}`);
        throw error;
      }

      if (isTauri) {
        // Para Tauri: navegar explícitamente dentro del WebView.
        // Usar window.location.href directo (no el redirect automático de Supabase)
        // para asegurar que la navegación ocurre DENTRO del WebView y no en el browser del sistema.
        if (data?.url) {
          console.log(`[OAuth] Tauri: navegando WebView a OAuth URL: ${data.url}`);
          window.location.href = data.url;
        } else {
          console.error('[OAuth] Tauri: no se recibió URL de Supabase');
          alert('Error: Supabase no devolvió una URL para el login.');
        }
      } else {
        console.log(`[OAuth] Login web iniciado, esperando redirect...`);
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
    } catch (error) {
      console.error('Logout error:', error);
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
