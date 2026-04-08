/**
 * SpacesPage — Hub de Espacios
 * Diseño v4: layout tipo Figma con brand header, hero CTA y grid de actividades
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Tv, BookOpen, Palette, Gamepad2, Crown, Dice5,
  Swords, Users, ArrowRight, Plus, Zap, Music,
} from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/supabaseClient';

const COLYSEUS_URL = (process.env.NEXT_PUBLIC_COLYSEUS_URL || 'https://spacely-server-production.up.railway.app')
  .replace(/^wss:\/\//, 'https://')
  .replace(/^ws:\/\//, 'http://');

// ─── Activity catalog ─────────────────────────────────────────────────────────

const ACTIVITY_CATALOG = [
  {
    type: 'watch',  id: 'watch-together',
    label: 'Mirar Juntos',        sublabel: 'Prueba nuestra nueva función para ver shorts y videos en tiempo real',
    Icon: Tv,
    gradient:     'linear-gradient(135deg, #0a1628 0%, #152340 50%, #1e3a5f 100%)',
    iconGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    glowColor:    'rgba(99,102,241,0.25)',
    border:       'border-indigo-500/20',
    glow:         'hover:shadow-[0_0_36px_rgba(99,102,241,0.22)]',
  },
  {
    type: 'game',   id: 'pixel-galaxy',
    label: 'Pixel Galaxy', sublabel: 'Construye una galaxia pixel art en tiempo real',
    Icon: Palette,
    gradient:     'linear-gradient(135deg, #0d2018 0%, #163326 50%, #1e4d2e 100%)',
    iconGradient: 'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)',
    glowColor:    'rgba(249,115,22,0.25)',
    border:       'border-amber-500/20',
    glow:         'hover:shadow-[0_0_36px_rgba(249,115,22,0.22)]',
  },
  {
    type: 'game',   id: 'puzzle',
    label: 'Co-Op Puzzle', sublabel: 'Resuelve rompecabezas en equipo con fotos reales',
    Icon: Palette,
    gradient:     'linear-gradient(135deg, #0d2818 0%, #1a4026 50%, #265033 100%)',
    iconGradient: 'linear-gradient(135deg, #00b894 0%, #00a085 100%)',
    glowColor:    'rgba(0,184,148,0.25)',
    border:       'border-emerald-500/20',
    glow:         'hover:shadow-[0_0_36px_rgba(0,184,148,0.22)]',
  },
  {
    type: 'game',   id: 'connect4',
    label: 'Cosmic 4',    sublabel: 'Conecta 4 fichas antes que tu rival',
    Icon: Gamepad2,
    gradient:     'linear-gradient(135deg, #2a100e 0%, #421a18 50%, #5e2620 100%)',
    iconGradient: 'linear-gradient(135deg, #fd79a8 0%, #e84393 100%)',
    glowColor:    'rgba(244,63,94,0.25)',
    border:       'border-pink-500/20',
    glow:         'hover:shadow-[0_0_36px_rgba(244,63,94,0.22)]',
  },
  {
    type: 'game',   id: 'snake',
    label: 'Snake Duel',    sublabel: 'Serpientes 1vs1. Sobrevive mas tiempo',
    Icon: Zap,
    gradient:     'linear-gradient(135deg, #0d2818 0%, #1a4026 50%, #265033 100%)',
    iconGradient: 'linear-gradient(135deg, #00b894 0%, #00a085 100%)',
    glowColor:    'rgba(0,184,148,0.25)',
    border:       'border-emerald-500/20',
    glow:         'hover:shadow-[0_0_36px_rgba(0,184,148,0.22)]',
  },
  {
    type: 'game',   id: 'tetris',
    label: 'Tetris Duel',   sublabel: 'Tetris competitivo. Envia basura al rival',
    Icon: Gamepad2,
    gradient:     'linear-gradient(135deg, #0a1628 0%, #152340 50%, #1e3a5f 100%)',
    iconGradient: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
    glowColor:    'rgba(52,152,219,0.25)',
    border:       'border-blue-500/20',
    glow:         'hover:shadow-[0_0_36px_rgba(52,152,219,0.22)]',
  },
  {
    type: 'game',   id: 'poker',
    label: 'Poker',        sublabel: "Texas Hold'em multinivel en tiempo real",
    Icon: Dice5,
    gradient:     'linear-gradient(135deg, #0d2818 0%, #1a4026 50%, #265033 100%)',
    iconGradient: 'linear-gradient(135deg, #00b894 0%, #00a085 100%)',
    glowColor:    'rgba(0,184,148,0.25)',
    border:       'border-emerald-500/20',
    glow:         'hover:shadow-[0_0_36px_rgba(0,184,148,0.22)]',
  },
  {
    type: 'game',   id: 'starboard',
    label: 'Starboard',    sublabel: 'Pizarra Pro compartida. GIFs, capas y Colyseus real-time',
    Icon: Palette,
    gradient:     'linear-gradient(135deg, #0a1628 0%, #152340 50%, #1e3a5f 100%)',
    iconGradient: 'linear-gradient(135deg, #00cec9 0%, #0984e3 100%)',
    glowColor:    'rgba(34,211,238,0.25)',
    border:       'border-cyan-500/20',
    glow:         'hover:shadow-[0_0_36px_rgba(34,211,238,0.22)]',
  },
  {
    type: 'game',   id: 'dj',
    label: 'Jukebox DJ',   sublabel: 'Musica sincronizada V.I.P para la sala',
    Icon: Music,
    gradient:     'linear-gradient(135deg, #2a1810 0%, #4a2c1a 50%, #6b4423 100%)',
    iconGradient: 'linear-gradient(135deg, #fd79a8 0%, #e84393 100%)',
    glowColor:    'rgba(253,121,168,0.25)',
    border:       'border-orange-500/20',
    glow:         'hover:shadow-[0_0_36px_rgba(253,121,168,0.22)]',
  },
  {
    type: 'game',   id: 'blackjack',
    label: 'Blackjack',    sublabel: 'Mesa de Blackjack multijugador en tiempo real',
    Icon: Dice5,
    gradient:     'linear-gradient(135deg, #2a1810 0%, #4a1a1a 50%, #6b2323 100%)',
    iconGradient: 'linear-gradient(135deg, #ff7675 0%, #d63071 100%)',
    glowColor:    'rgba(255,118,117,0.25)',
    border:       'border-rose-500/20',
    glow:         'hover:shadow-[0_0_36px_rgba(255,118,117,0.22)]',
  },
  {
    type: 'game',   id: 'chess',
    label: 'Realtime Chess', sublabel: 'Ajedrez 1vs1 con sincronización en tiempo real',
    Icon: Crown,
    gradient:     'linear-gradient(135deg, #1e1e2e 0%, #2d2d3f 50%, #3c3c54 100%)',
    iconGradient: 'linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%)',
    glowColor:    'rgba(162,155,254,0.25)',
    border:       'border-purple-500/20',
    glow:         'hover:shadow-[0_0_36px_rgba(162,155,254,0.22)]',
  },
  {
    type: 'game',   id: 'ludo',
    label: 'Ludo Classic', sublabel: 'Ludo tradicional multinivel para hasta 4 jugadores',
    Icon: Dice5,
    gradient:     'linear-gradient(135deg, #2d1810 0%, #4a2c1a 50%, #6b4423 100%)',
    iconGradient: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
    glowColor:    'rgba(243,156,18,0.25)',
    border:       'border-amber-500/20',
    glow:         'hover:shadow-[0_0_36px_rgba(243,156,18,0.22)]',
  },
  {
    type: 'game',   id: 'beat-sound',
    label: 'BeatSound',    sublabel: 'Juego de ritmo sincronizado. Golpea los beats al ritmo de la música',
    Icon: Zap,
    gradient:     'linear-gradient(135deg, #0a1628 0%, #152340 50%, #1e3a5f 100%)',
    iconGradient: 'linear-gradient(135deg, #00cec9 0%, #0984e3 100%)',
    glowColor:    'rgba(34,211,238,0.25)',
    border:       'border-cyan-500/20',
    glow:         'hover:shadow-[0_0_36px_rgba(34,211,238,0.22)]',
  },
  {
    type: 'anime',  id: 'astro-party',
    label: 'Screen Sharing',        sublabel: 'Comparte tu pantalla en tiempo real con toda la sala',
    Icon: Tv,
    gradient:     'linear-gradient(135deg, #2a1035 0%, #3d1a50 50%, #5c2a70 100%)',
    iconGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    glowColor:    'rgba(236,72,153,0.25)',
    border:       'border-pink-500/20',
    glow:         'hover:shadow-[0_0_36px_rgba(236,72,153,0.22)]',
  },
  {
    type: 'manga',  id: 'manga-party',
    label: 'Manga Party',        sublabel: 'Lee manga sincronizado con tus amigos en tiempo real',
    Icon: BookOpen,
    gradient:     'linear-gradient(135deg, #2a1035 0%, #3d1a50 50%, #5c2a70 100%)',
    iconGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    glowColor:    'rgba(236,72,153,0.25)',
    border:       'border-pink-500/20',
    glow:         'hover:shadow-[0_0_36px_rgba(236,72,153,0.22)]',
  },
];

const ACTIVITY_META = Object.fromEntries(
  ACTIVITY_CATALOG.map(a => [`${a.type}:${a.id}`, a])
);
function getActivityMeta(type, id) {
  return ACTIVITY_META[`${type}:${id}`]
    || ACTIVITY_CATALOG.find(a => a.type === type)
    || ACTIVITY_CATALOG[0];
}

// ─── Activity card ─────────────────────────────────────────────────────────────

function ActivityCard({ activity, onClick, loading }) {
  const { Icon, gradient, iconGradient, glowColor, border, glow, label, sublabel } = activity;

  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      disabled={loading}
      style={{ background: gradient }}
      className={`group relative flex flex-col gap-4 overflow-hidden rounded-[24px] border ${border} ${glow} p-5 text-left transition-all duration-300 hover:scale-[1.03] disabled:opacity-50 h-full min-h-[160px] shadow-lg w-full`}
    >
      {/* Top shimmer line */}
      <div
        className="absolute inset-x-0 top-0 h-px opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${glowColor}, transparent)` }}
      />

      {/* Bottom glow bloom */}
      <div
        className="pointer-events-none absolute -bottom-6 -right-6 h-24 w-24 rounded-full opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-40"
        style={{ background: iconGradient }}
      />

      {/* Icon block */}
      <div
        style={{ background: iconGradient }}
        className="flex h-12 w-12 items-center justify-center rounded-[16px] shadow-lg"
      >
        <Icon size={22} className="text-white drop-shadow-sm" strokeWidth={2} />
      </div>

      {/* Labels + arrow */}
      <div className="flex items-start justify-between gap-2 mt-auto">
        <div className="min-w-0 flex-1">
          <p className="text-base lg:text-lg font-bold text-white leading-tight truncate mb-1">{label}</p>
          <p className="text-xs lg:text-sm text-white/50 leading-snug line-clamp-3 hyphens-auto break-words">{sublabel}</p>
        </div>
        <ArrowRight
          size={16}
          className="shrink-0 text-white/30 transition-all duration-200 group-hover:translate-x-1 group-hover:text-white/60 mt-1"
        />
      </div>

      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-[22px] bg-black/50">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      )}
    </motion.button>
  );
}

// ─── Live space card ──────────────────────────────────────────────────────────

function LiveSpaceCard({ space, onJoin, index }) {
  const meta = getActivityMeta(space.activity?.type, space.activity?.id);
  const { Icon, iconGradient } = meta;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-4 rounded-[20px] border border-white/[0.08] bg-gradient-to-r from-white/[0.03] to-white/[0.01] p-4 backdrop-blur-sm hover:border-white/[0.12] transition-all duration-200"
    >
      <div
        style={{ background: iconGradient }}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] shadow-md"
      >
        <Icon size={18} className="text-white" strokeWidth={1.8} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white leading-tight mb-1">
          {space.spaceName || space.spaceId}
        </p>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className="h-2 w-2 rounded-full bg-red-400"></span>
              <span className="absolute inset-0 h-2 w-2 rounded-full bg-red-400 animate-ping opacity-75"></span>
            </span>
            <span className="text-xs font-medium text-white/60">{meta.label}</span>
          </div>
          <span className="text-white/20">·</span>
          <div className="flex items-center gap-1">
            <Users size={12} className="text-white/40" />
            <span className="text-xs text-white/60">{space.users || 1}</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => onJoin(space)}
        className="shrink-0 flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.08] px-4 py-2 text-xs font-bold text-white transition-all duration-200 hover:bg-white/[0.15] hover:border-white/[0.25] hover:scale-[1.05]"
      >
        Entrar <ArrowRight size={12} />
      </button>
    </motion.div>
  );
}

// ─── Hook: live previews ──────────────────────────────────────────────────────

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
      setSpaces((await res.json()) || []);
    } catch (err) {
      if (err.name === 'AbortError') return;
      try {
        const { data } = await supabase
          .from('live_activities')
          .select('id, type, title, room_name, participant_count, host_id, profiles:host_id(username, avatar_url)')
          .eq('status', 'active')
          .order('participant_count', { ascending: false })
          .limit(12);
        setSpaces((data || []).map(s => ({
          spaceId:      s.room_name,
          spaceName:    s.title,
          hostId:       s.host_id,
          hostUsername: s.profiles?.username || '',
          hostAvatar:   s.profiles?.avatar_url || '',
          activity:     { type: s.type, id: '' },
          users:        s.participant_count || 1,
          preview:      { thumbnail: null, track: null, timestamp: 0 },
        })));
      } catch { /* silent */ }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPreviews();
    const interval = setInterval(fetchPreviews, 12000);
    return () => { clearInterval(interval); abortRef.current?.abort(); };
  }, []);

  return { spaces, loading };
}

function generateSpaceId(profile) {
  const slug   = (profile?.username || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${slug}-${suffix}`;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function SpacesPage() {
  const navigate = useNavigate();
  const { profile, user } = useAuthContext();
  const { spaces, loading } = useSpacePreviews();
  const [creating, setCreating] = useState(null);

  const handleQuickLaunch = (activity) => {
    if (!user) { navigate('/'); return; }
    setCreating(activity.id);
    const spaceId = generateSpaceId(profile);
    navigate(`/spaces/${spaceId}?activity=${activity.type}:${activity.id}&new=1`);
  };

  const handleJoin = (space) => navigate(`/spaces/${space.spaceId}`);

  return (
    <div className="min-h-full bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(34,211,238,0.06),transparent),radial-gradient(ellipse_60%_30%_at_80%_60%,rgba(139,92,246,0.05),transparent),linear-gradient(180deg,#04040c_0%,#06060f_60%,#030308_100%)] text-white">
      <div className="mx-auto max-w-4xl px-4 pb-24 pt-5 sm:max-w-5xl lg:max-w-6xl xl:max-w-7xl lg:px-6 xl:px-8">
        {/* ── Page title ────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="mb-8 text-center lg:text-left"
        >
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="h-1 w-8 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500"></div>
            <h1 className="text-[2.5rem] lg:text-[3.5rem] font-black uppercase tracking-[0.05em] leading-none text-white">
              ESPACIOS
            </h1>
            <div className="h-1 w-8 rounded-full bg-gradient-to-r from-purple-500 to-cyan-400"></div>
          </div>
          <p className="text-sm lg:text-lg text-white/60 leading-relaxed max-w-2xl">
            Entra directo, habla cuando quieras.
          </p>
        </motion.div>

        {/* ── Create CTA ────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mb-8 lg:mb-12"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-purple-500/20 rounded-[28px] blur-xl"></div>
            <div className="relative flex justify-center">
              <button
                onClick={() => navigate('/spaces/new')}
                className="group relative w-full max-w-lg overflow-hidden rounded-[24px] bg-gradient-to-r from-cyan-400 via-purple-500 to-purple-600 p-[2px] shadow-[0_0_40px_rgba(34,211,238,0.25),0_0_80px_rgba(139,92,246,0.15)] transition-all duration-300 hover:shadow-[0_0_60px_rgba(34,211,238,0.4),0_0_120px_rgba(139,92,246,0.25)] hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-[22px] bg-gradient-to-r from-cyan-500/95 via-purple-500/95 to-purple-600/95 px-8 py-6">
                  {/* Shine overlay */}
                  <div className="pointer-events-none absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                      <Plus size={20} className="text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-lg lg:text-xl font-black uppercase tracking-[0.15em] text-white">
                      Crear espacio
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.12 }}
          className="mb-12 text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
            <div className="h-1 w-1 rounded-full bg-white/40"></div>
            <span className="text-xs lg:text-sm font-medium text-white/50">
              o elige una actividad para lanzar directo
            </span>
            <div className="h-1 w-1 rounded-full bg-white/40"></div>
          </div>
        </motion.div>

        {/* ── Activity grid ─────────────────────────────────────────────────── */}
        <section className="mb-16">
          <div className="mb-8 text-center sm:text-left">
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-2">Actividades disponibles</h2>
            <p className="text-sm text-white/50">Elige tu actividad favorita y comparte con amigos</p>
          </div>
          <div className="flex justify-center sm:justify-start">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6 w-full max-w-2xl sm:max-w-full lg:max-w-full xl:max-w-full">
            {ACTIVITY_CATALOG.map((activity, i) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <ActivityCard
                  activity={activity}
                  onClick={() => handleQuickLaunch(activity)}
                  loading={creating === activity.id}
                />
              </motion.div>
            ))}
            </div>
          </div>
        </section>

        {/* ── Live spaces ───────────────────────────────────────────────────── */}
        <section className="mb-16">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse"></span>
                <span className="absolute inset-0 h-3 w-3 rounded-full bg-red-500 animate-ping opacity-75"></span>
              </div>
              <h2 className="text-xl lg:text-2xl font-bold text-white">
                En vivo ahora
              </h2>
              {!loading && spaces.length > 0 && (
                <span className="ml-auto inline-flex items-center px-3 py-1 rounded-full border border-red-500/20 bg-red-500/10 text-xs font-medium text-red-400">
                  {spaces.length} activos
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-[18px] border border-white/[0.04] bg-white/[0.02]" />
              ))}
            </div>
          ) : spaces.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-[24px] border border-dashed border-white/[0.12] bg-gradient-to-br from-white/[0.03] to-white/[0.01] py-16 text-center backdrop-blur-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.02]">
                <Users size={28} className="text-white/20" />
              </div>
              <div>
                <p className="text-base font-medium text-white/60 mb-1">Sin espacios activos</p>
                <p className="text-sm text-white/40">Sé el primero en crear un espacio</p>
              </div>
              <button
                onClick={() => navigate('/spaces/new')}
                className="mt-2 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-400 transition hover:bg-cyan-500/20 hover:border-cyan-500/50"
              >
                <Plus size={16} />
                Crear espacio
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {spaces.map((space, i) => (
                <LiveSpaceCard key={space.spaceId} space={space} onJoin={handleJoin} index={i} />
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
