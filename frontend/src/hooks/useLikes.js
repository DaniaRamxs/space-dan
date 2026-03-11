import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuthContext } from '../contexts/AuthContext';

const LS_KEY = 'space-dan-likes';

function loadLS() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ids: [] };
    const p = JSON.parse(raw);
    if (Array.isArray(p.ids)) return p;
    return { ids: [] };
  } catch {
    return { ids: [] };
  }
}

function saveLS(ids) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ids }));
  } catch { }
}

/**
 * Sync like state with Supabase.
 */
export default function useLikes(postId) {
  const { user } = useAuthContext();
  const [count, setCount] = useState(null);
  const [liked, setLiked] = useState(() => loadLS().ids.includes(postId));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchCount() {
      try {
        const { data, error } = await supabase.rpc('get_post_likes', { p_post_id: postId });
        if (!error && active) {
          setCount(data || 0);
        }
      } catch (e) {
        console.error('get_post_likes error:', e);
      }

      if (user) {
        try {
          const { data } = await supabase.from('post_likes')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', user.id)
            .maybeSingle();
          if (data && active) {
            if (!liked) {
              setLiked(true);
              saveLS([...new Set([...loadLS().ids, postId])]);
            }
          }
        } catch (e) { }
      }

      if (active) setLoading(false);
    }

    fetchCount();
    return () => { active = false; };
  }, [postId, user?.id]); // Note: omitted `liked` so it doesn't loop

  const toggle = useCallback(async () => {
    if (loading) return;

    const isLiking = !liked;
    setLiked(isLiking);
    setCount(c => c !== null ? (isLiking ? c + 1 : Math.max(0, c - 1)) : null);

    const ls = loadLS();
    if (isLiking) {
      if (!ls.ids.includes(postId)) saveLS([...ls.ids, postId]);
    } else {
      saveLS(ls.ids.filter(x => x !== postId));
    }

    if (user) {
      try {
        if (isLiking) {
          await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
        } else {
          await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
        }
      } catch (err) {
        console.error('Like toggle error:', err);
      }
    }
  }, [liked, postId, user, loading]);

  return [count, liked, toggle];
}
