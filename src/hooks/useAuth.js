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

  // Sync on login + ping activity
  useEffect(() => {
    if (!session?.user) return;
    const user = session.user;

    ensureProfile(user);

    const localAchs = (() => {
      try { return JSON.parse(localStorage.getItem(ACH_KEY) || '[]'); }
      catch { return []; }
    })();
    localAchs.forEach(id => syncAchievementToDb(id));

    // Update last_seen_at so activity status works in profiles
    const ping = async () => {
      try { await supabase.rpc('ping_activity'); }
      catch (e) { console.warn('Ping activity failed:', e); }
    };

    ping();
    const pingInterval = setInterval(ping, 5 * 60 * 1000); // every 5 minutes

    return () => clearInterval(pingInterval);
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
    loading,
    loginWithGoogle,
    loginWithDiscord,
    logout,
  };
}
