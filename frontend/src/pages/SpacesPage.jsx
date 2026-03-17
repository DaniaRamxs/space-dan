/**
 * SpacesPage — Hub de Espacios
 *
 * Punto de entrada a todos los espacios. Permite:
 *   - Ver espacios activos en tiempo real
 *   - Crear un espacio nuevo (con actividad preseleccionada)
 *   - Unirse a un espacio de otra persona
 *   - Acceso rápido a actividades directas
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Tv, BookOpen, Music, Gamepad2, Plus, Zap, ArrowRight } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/supabaseClient';

// ─── Catálogo de actividades ──────────────────────────────────────────────────

const ACTIVITY_CATALOG = [
  {
    type: 'anime',
    id:   'astro-party',
    label: 'Anime',
    sublabel: 'Watch party sincronizada',
    icon: Tv,
    gradient: 'from-cyan-500/20 to-blue-600/10',
    border: 'border-cyan-400/20',
    accent: 'text-cyan-300',
    dot: 'bg-cyan-400',
    emoji: '📺',
  },
  {
    type: 'manga',
    id:   'manga-party',
    label: 'Manga',
    sublabel: 'Lectura colaborativa',
    icon: BookOpen,
    gradient: 'from-purple-500/20 to-pink-600/10',
    border: 'border-purple-400/20',
    accent: 'text-purple-300',
    dot: 'bg-purple-400',
    emoji: '📖',
  },
  {
    type: 'game',
    id:   'pixel-galaxy',
    label: 'Pixel Galaxy',
    sublabel: 'Arte colaborativo',
    icon: Gamepad2,
    gradient: 'from-green-500/20 to-teal-600/10',
    border: 'border-green-400/20',
    accent: 'text-green-300',
    dot: 'bg-green-400',
    emoji: '🎨',
  },
  {
    type: 'game',
    id:   'connect4',
    label: 'Connect 4',
    sublabel: 'Duelo 1v1',
    icon: Gamepad2,
    gradient: 'from-amber-500/20 to-orange-600/10',
    border: 'border-amber-400/20',
    accent: 'text-amber-300',
    dot: 'bg-amber-400',
    emoji: '🔴',
  },
  {
    type: 'game',
    id:   'chess',
    label: 'Ajedrez',
    sublabel: 'Duelo estratégico',
    icon: Gamepad2,
    gradient: 'from-slate-500/20 to-gray-600/10',
    border: 'border-slate-400/20',
    accent: 'text-slate-300',
    dot: 'bg-slate-400',
    emoji: '♟️',
  },
  {
    type: 'game',
    id:   'poker',
    label: 'Poker',
    sublabel: 'Texas Hold\'em',
    icon: Gamepad2,
    gradient: 'from-red-500/20 to-rose-600/10',
    border: 'border-red-400/20',
    accent: 'text-red-300',
    dot: 'bg-red-400',
    emoji: '🃏',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateSpaceId(profile, activityId) {
  const slug = (profile?.username || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${slug}-${activityId}-${suffix}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SpacesPage() {
  const navigate = useNavigate();
  const { profile, user } = useAuthContext();
  const [liveSpaces, setLiveSpaces] = useState([]);
  const [loadingSpaces, setLoadingSpaces] = useState(true);
  const [creating, setCreating] = useState(null); // activityId being created

  // ── Load live activities from Supabase ───────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoadingSpaces(true);
      try {
        const { data } = await supabase
          .from('live_activities')
          .select(`
            id, type, title, room_name, metadata,
            participant_count, created_at,
            profiles:host_id ( username, avatar_url, display_name )
          `)
          .eq('status', 'active')
          .order('participant_count', { ascending: false })
          .limit(12);
        setLiveSpaces(data || []);
      } catch { /* no-op */ }
      finally { setLoadingSpaces(false); }
    }
    load();

    // Refresh every 30s
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  // ── Create + enter a new space ────────────────────────────────────────────
  const handleCreate = async (activity) => {
    if (!user) { navigate('/login'); return; }
    setCreating(activity.id);
    const spaceId = generateSpaceId(profile, activity.id);
    // Navigate: SpaceSessionPage will connect to Colyseus and auto-launch activity
    navigate(`/spaces/${spaceId}?activity=${activity.type}:${activity.id}&new=1`);
  };

  // ── Join existing space ───────────────────────────────────────────────────
  const handleJoin = (space) => {
    navigate(`/spaces/${space.room_name}`);
  };

  // ── Activity icon helper ──────────────────────────────────────────────────
  const activityMeta = (type) => {
    return ACTIVITY_CATALOG.find(a => a.type === type) || ACTIVITY_CATALOG[0];
  };

  return (
    <div className="min-h-full text-white">
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-500/10 px-3 py-1 mb-3">
            <Zap size={11} className="text-cyan-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
              Espacios
            </span>
          </div>
          <h1 className="text-3xl font-black uppercase tracking-[0.12em] sm:text-4xl">
            Espacios
          </h1>
          <p className="mt-2 text-sm leading-6 text-white/50">
            Entra directo a una actividad. La voz es opcional — siempre.
          </p>
        </motion.div>

        {/* ── Quick-launch: crear espacio nuevo ────────────────────────────── */}
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <Plus size={14} className="text-white/40" />
            <h2 className="text-[11px] font-black uppercase tracking-[0.24em] text-white/50">
              Crear espacio
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {ACTIVITY_CATALOG.map((activity, i) => (
              <motion.button
                key={activity.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => handleCreate(activity)}
                disabled={creating === activity.id}
                className={`group relative flex flex-col items-center gap-2 overflow-hidden rounded-[20px] border bg-gradient-to-br ${activity.gradient} ${activity.border} p-4 text-center transition hover:scale-[1.03] active:scale-[0.97] disabled:opacity-60`}
              >
                <span className="text-2xl">{activity.emoji}</span>
                <div>
                  <div className={`text-xs font-black ${activity.accent}`}>{activity.label}</div>
                  <div className="mt-0.5 text-[10px] text-white/40 leading-none">{activity.sublabel}</div>
                </div>
                {creating === activity.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-[20px]">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </section>

        {/* ── Espacios activos ──────────────────────────────────────────────── */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.24em] text-white/50">
                En vivo ahora
              </h2>
            </div>
            {liveSpaces.length > 0 && (
              <span className="text-[10px] text-white/30">{liveSpaces.length} espacios</span>
            )}
          </div>

          {loadingSpaces ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-[100px] animate-pulse rounded-[20px] border border-white/5 bg-white/[0.03]" />
              ))}
            </div>
          ) : liveSpaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] py-14 text-center">
              <Users size={28} className="text-white/20" />
              <div>
                <p className="text-sm font-bold text-white/40">Sin espacios activos</p>
                <p className="mt-1 text-xs text-white/25">Crea el primero 👆</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {liveSpaces.map((space, i) => {
                const meta = activityMeta(space.type);
                return (
                  <motion.div
                    key={space.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`group relative overflow-hidden rounded-[20px] border bg-gradient-to-br ${meta.gradient} ${meta.border} p-4`}
                  >
                    {/* Live pill */}
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${meta.dot}`} />
                        <span className={`text-[9px] font-black uppercase tracking-[0.22em] ${meta.accent}`}>
                          {meta.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-white/40">
                        <Users size={10} />
                        <span className="text-[10px]">{space.participant_count || 1}</span>
                      </div>
                    </div>

                    {/* Info */}
                    <p className="mb-1 truncate text-sm font-black text-white">{space.title}</p>
                    <div className="flex items-center gap-1.5">
                      <img
                        src={space.profiles?.avatar_url || '/default-avatar.png'}
                        alt=""
                        className="h-5 w-5 rounded-full object-cover"
                      />
                      <span className="text-[11px] text-white/50">
                        {space.profiles?.display_name || space.profiles?.username || 'Anon'}
                      </span>
                    </div>

                    {/* Join button */}
                    <button
                      onClick={() => handleJoin(space)}
                      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white transition hover:bg-white/[0.12] group-hover:border-white/20"
                    >
                      Unirse <ArrowRight size={11} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
