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


  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
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
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
      setProfile(data);
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
        setProfile(payload.new);
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
    loading,
    loginWithGoogle,
    loginWithDiscord,
    logout,
  };
}

