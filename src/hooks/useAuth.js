import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { ensureProfile, syncAchievementToDb } from '../services/supabaseScores';

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) setProfileLoading(false);
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
  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      return;
    }

    const fetchProfile = async () => {
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
    };




    fetchProfile();

    // Subscribe to profile changes
    const profileSubscription = supabase
      .channel(`profile:${session.user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${session.user.id}`
      }, (payload) => {
        // En lugar de solo usar payload.new, re-obtenemos para tener los joins actualizados
        fetchProfile();
      })
      .subscribe();

    const user = session.user;
    ensureProfile(user);

    const localAchs = (() => {
      try { return JSON.parse(localStorage.getItem(ACH_KEY) || '[]'); }
      catch { return []; }
    })();
    localAchs.forEach(id => syncAchievementToDb(id));

    // Update last_seen_at
    const ping = async () => {
      try { await supabase.rpc('ping_activity'); }
      catch (e) { console.warn('Ping activity failed:', e); }
    };

    ping();
    const pingInterval = setInterval(ping, 5 * 60 * 1000);

    return () => {
      clearInterval(pingInterval);
      supabase.removeChannel(profileSubscription);
    };
  }, [session?.user?.id]);


  const loginWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });

  const loginWithDiscord = () =>
    supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: window.location.origin },
    });

  const logout = () => supabase.auth.signOut();

  return {
    session,
    user: session?.user ?? null,
    profile,
    loading: loading || (session?.user ? profileLoading : false),
    loginWithGoogle,
    loginWithDiscord,
    logout,
  };
}


