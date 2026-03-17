/**
 * SpacesPage — Hub de Espacios
 * v3: prominent "Crear espacio" button + activity quick-launch catalog
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Tv, BookOpen, Gamepad2, Plus, Zap, ArrowRight, Music, Sparkles } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/supabaseClient';

const COLYSEUS_URL = (import.meta.env.VITE_COLYSEUS_URL || 'https://spacely-server-production.up.railway.app')
  .replace(/^wss:\/\//, 'https://')
  .replace(/^ws:\/\//, 'http://');

// ─── Activity catalog ─────────────────────────────────────────────────────────

const ACTIVITY_CATALOG = [
  { type: 'anime',  id: 'astro-party',  label: 'Anime',        sublabel: 'Watch party',      emoji: '📺', gradient: 'from-cyan-500/20 to-blue-600/10',    border: 'border-cyan-400/20',   accent: 'text-cyan-300',   dot: 'bg-cyan-400'   },
  { type: 'manga',  id: 'manga-party',  label: 'Manga',        sublabel: 'Lectura grupal',    emoji: '📖', gradient: 'from-purple-500/20 to-pink-600/10',  border: 'border-purple-400/20', accent: 'text-purple-300', dot: 'bg-purple-400' },
  { type: 'game',   id: 'pixel-galaxy', label: 'Pixel Galaxy', sublabel: 'Arte colaborativo', emoji: '🎨', gradient: 'from-green-500/20 to-teal-600/10',   border: 'border-green-400/20',  accent: 'text-green-300',  dot: 'bg-green-400'  },
  { type: 'game',   id: 'connect4',     label: 'Connect 4',    sublabel: 'Duelo 1v1',         emoji: '🔴', gradient: 'from-amber-500/20 to-orange-600/10', border: 'border-amber-400/20',  accent: 'text-amber-300',  dot: 'bg-amber-400'  },
  { type: 'game',   id: 'chess',        label: 'Ajedrez',      sublabel: 'Estrategia',        emoji: '♟️', gradient: 'from-slate-500/20 to-gray-600/10',   border: 'border-slate-400/20',  accent: 'text-slate-300',  dot: 'bg-slate-400'  },
  { type: 'game',   id: 'poker',        label: 'Poker',        sublabel: "Texas Hold'em",     emoji: '🃏', gradient: 'from-red-500/20 to-rose-600/10',     border: 'border-red-400/20',    accent: 'text-red-300',    dot: 'bg-red-400'    },
];

const ACTIVITY_META = Object.fromEntries(
  ACTIVITY_CATALOG.map(a => [`${a.type}:${a.id}`, a])
);
function getActivityMeta(type, id) {
  return ACTIVITY_META[`${type}:${id}`]
    || ACTIVITY_CATALOG.find(a => a.type === type)
    || ACTIVITY_CATALOG[0];
}


// ─── Live preview card ────────────────────────────────────────────────────────

function LiveSpaceCard({ space, onJoin, index }) {
  const meta    = getActivityMeta(space.activity?.type, space.activity?.id);
  const hasTrack = !!space.preview?.track;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`group relative flex flex-col overflow-hidden rounded-[22px] border bg-gradient-to-br ${meta.gradient} ${meta.border}`}
    >
      <div className="relative flex h-10 items-center overflow-hidden px-4">
        {space.preview?.thumbnail && (
          <img
            src={space.preview.thumbnail}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
        )}
        <div className="relative z-10 w-full flex items-center justify-end">
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${meta.dot}`} />
            <span className={`text-[9px] font-black uppercase tracking-[0.22em] ${meta.accent}`}>
              LIVE
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-4 pb-4">
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${meta.accent}`}>
            {meta.emoji} {meta.label}
          </span>
          <div className="flex items-center gap-1 text-white/40">
            <Users size={9} />
            <span className="text-[10px]">{space.users || 1}</span>
          </div>
        </div>

        <p className="truncate text-sm font-black text-white leading-tight">
          {hasTrack ? space.preview.track : (space.spaceName || space.spaceId)}
        </p>

        {space.hostUsername && (
          <div className="flex items-center gap-1.5">
            {space.hostAvatar && (
              <img src={space.hostAvatar} alt="" className="h-4 w-4 rounded-full object-cover opacity-80" />
            )}
            <span className="text-[10px] text-white/45">{space.hostUsername}</span>
          </div>
        )}

        <button
          onClick={() => onJoin(space)}
          className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-white/[0.14] group-hover:border-white/20"
        >
          Entrar <ArrowRight size={11} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Hook: live space previews ────────────────────────────────────────────────

function useSpacePreviews() {
  const [spaces,  setSpaces]  = useState([]);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef(null);

  async function fetchPreviews() {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const res = await fetch(`${COLYSEUS_URL}/api/spaces/active`, {
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error('not ok');
      const data = await res.json();
      setSpaces(data || []);
    } catch (err) {
      if (err.name === 'AbortError') return;
      try {
        const { data } = await supabase
          .from('live_activities')
          .select('id, type, title, room_name, participant_count, host_id, profiles:host_id(username, avatar_url)')
          .eq('status', 'active')
          .order('participant_count', { ascending: false })
          .limit(12);
        const mapped = (data || []).map(s => ({
          spaceId:      s.room_name,
          spaceName:    s.title,
          hostId:       s.host_id,
          hostUsername: s.profiles?.username || '',
          hostAvatar:   s.profiles?.avatar_url || '',
          activity:     { type: s.type, id: '' },
          users:        s.participant_count || 1,
          preview:      { thumbnail: null, track: null, timestamp: 0 },
        }));
        setSpaces(mapped);
      } catch { /* silent */ }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPreviews();
    const interval = setInterval(fetchPreviews, 12000);
    return () => {
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, []);

  return { spaces, loading, refresh: fetchPreviews };
}

// ─── Quick-launch ID generator (activity in the URL, not the ID) ──────────────

function generateSpaceId(profile) {
  const slug   = (profile?.username || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${slug}-${suffix}`;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SpacesPage() {
  const navigate  = useNavigate();
  const { profile, user } = useAuthContext();
  const { spaces, loading } = useSpacePreviews();
  const [creating, setCreating] = useState(null);

  // Quick-launch: go directly to a space with an activity pre-selected
  const handleQuickLaunch = (activity) => {
    if (!user) { navigate('/'); return; }
    setCreating(activity.id);
    const spaceId = generateSpaceId(profile);
    navigate(`/spaces/${spaceId}?activity=${activity.type}:${activity.id}&new=1`);
  };

  const handleJoin = (space) => {
    navigate(`/spaces/${space.spaceId}`);
  };

  return (
    <div className="min-h-full text-white">

      <div className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-500/10 px-3 py-1 mb-3">
            <Zap size={11} className="text-cyan-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">Espacios</span>
          </div>
          <h1 className="text-3xl font-black uppercase tracking-[0.12em] sm:text-4xl">Espacios</h1>
          <p className="mt-2 text-sm leading-6 text-white/50">
            Entra directo, habla cuando quieras.
          </p>
        </motion.div>

        {/* ── Prominent create button ─────────────────────────────────────── */}
        <section className="mb-10">
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/spaces/new')}
            className="w-full flex items-center justify-center gap-3 rounded-[22px] bg-gradient-to-r from-cyan-500 to-blue-600 py-5 text-base font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-cyan-500/20 hover:brightness-110 transition"
          >
            <Sparkles size={20} />
            ✨ Crear espacio
          </motion.button>
          <p className="mt-3 text-center text-[11px] text-white/35">
            o elige una actividad para lanzar directo
          </p>
        </section>

        {/* ── Quick-launch activity cards ─────────────────────────────────── */}
        <section className="mb-10">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {ACTIVITY_CATALOG.map((activity, i) => (
              <motion.button
                key={activity.id}
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 + 0.1 }}
                onClick={() => handleQuickLaunch(activity)}
                disabled={creating === activity.id}
                className={`group relative flex flex-col items-center gap-2 overflow-hidden rounded-[20px] border bg-gradient-to-br ${activity.gradient} ${activity.border} p-4 text-center transition hover:scale-[1.03] active:scale-[0.97] disabled:opacity-60`}
              >
                <span className="text-2xl">{activity.emoji}</span>
                <div>
                  <div className={`text-xs font-black ${activity.accent}`}>{activity.label}</div>
                  <div className="mt-0.5 text-[10px] text-white/40 leading-none">{activity.sublabel}</div>
                </div>
                {creating === activity.id && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-[20px] bg-black/40 backdrop-blur-sm">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </section>

        {/* ── Live spaces ─────────────────────────────────────────────────── */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.24em] text-white/50">En vivo ahora</h2>
            </div>
            {!loading && spaces.length > 0 && (
              <span className="text-[10px] text-white/30">{spaces.length} espacios</span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-[170px] animate-pulse rounded-[22px] border border-white/5 bg-white/[0.03]" />
              ))}
            </div>
          ) : spaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] py-14 text-center">
              <Users size={28} className="text-white/20" />
              <p className="text-sm font-bold text-white/40">Sin espacios activos</p>
              <p className="text-xs text-white/25">Crea el primero con el botón de arriba</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {spaces.map((space, i) => (
                <LiveSpaceCard
                  key={space.spaceId}
                  space={space}
                  onJoin={handleJoin}
                  index={i}
                />
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
