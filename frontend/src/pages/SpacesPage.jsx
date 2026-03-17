/**
 * SpacesPage — Hub de Espacios
 * Diseño v4: layout tipo Figma con brand header, hero CTA y grid de actividades
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Tv, BookOpen, Palette, Gamepad2, Crown, Dice5,
  Swords, Music, Users, ArrowRight, Plus, Sparkles,
} from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/supabaseClient';

const COLYSEUS_URL = (import.meta.env.VITE_COLYSEUS_URL || 'https://spacely-server-production.up.railway.app')
  .replace(/^wss:\/\//, 'https://')
  .replace(/^ws:\/\//, 'http://');

// ─── Activity catalog ─────────────────────────────────────────────────────────

const ACTIVITY_CATALOG = [
  {
    type: 'anime',  id: 'astro-party',
    label: 'Anime',        sublabel: 'Watch party',
    Icon: Tv,
    gradient:     'linear-gradient(135deg, #0a1628 0%, #152340 50%, #1e3a5f 100%)',
    iconGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    glowColor:    'rgba(99,102,241,0.25)',
    border:       'border-indigo-500/20',
    glow:         'hover:shadow-[0_0_36px_rgba(99,102,241,0.22)]',
  },
  {
    type: 'manga',  id: 'manga-party',
    label: 'Manga',        sublabel: 'Lectura grupal',
    Icon: BookOpen,
    gradient:     'linear-gradient(135deg, #2a1035 0%, #3d1a50 50%, #5c2a70 100%)',
    iconGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    glowColor:    'rgba(236,72,153,0.25)',
    border:       'border-pink-500/20',
    glow:         'hover:shadow-[0_0_36px_rgba(236,72,153,0.22)]',
  },
  {
    type: 'game',   id: 'pixel-galaxy',
    label: 'Pixel Galaxy', sublabel: 'Arte colaborativo',
    Icon: Palette,
    gradient:     'linear-gradient(135deg, #0d2018 0%, #163326 50%, #1e4d2e 100%)',
    iconGradient: 'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)',
    glowColor:    'rgba(249,115,22,0.25)',
    border:       'border-amber-500/20',
    glow:         'hover:shadow-[0_0_36px_rgba(249,115,22,0.22)]',
  },
  {
    type: 'game',   id: 'connect4',
    label: 'Connect 4',    sublabel: 'Duelo 1v1',
    Icon: Gamepad2,
    gradient:     'linear-gradient(135deg, #2a100e 0%, #421a18 50%, #5e2620 100%)',
    iconGradient: 'linear-gradient(135deg, #fd79a8 0%, #e84393 100%)',
    glowColor:    'rgba(244,63,94,0.25)',
    border:       'border-rose-500/20',
    glow:         'hover:shadow-[0_0_36px_rgba(244,63,94,0.22)]',
  },
  {
    type: 'game',   id: 'chess',
    label: 'Ajedrez',      sublabel: 'Partidas rápidas',
    Icon: Crown,
    gradient:     'linear-gradient(135deg, #18182a 0%, #252538 50%, #323250 100%)',
    iconGradient: 'linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%)',
    glowColor:    'rgba(139,92,246,0.25)',
    border:       'border-violet-500/20',
    glow:         'hover:shadow-[0_0_36px_rgba(139,92,246,0.22)]',
  },
  {
    type: 'game',   id: 'poker',
    label: 'Poker',        sublabel: 'Mesa privada',
    Icon: Dice5,
    gradient:     'linear-gradient(135deg, #28100e 0%, #3e1818 50%, #581e1e 100%)',
    iconGradient: 'linear-gradient(135deg, #ff7675 0%, #d63031 100%)',
    glowColor:    'rgba(239,68,68,0.25)',
    border:       'border-red-500/20',
    glow:         'hover:shadow-[0_0_36px_rgba(239,68,68,0.22)]',
  },
  {
    type: 'game',   id: 'battles',
    label: 'Batallas',     sublabel: 'PvP en tiempo real',
    Icon: Swords,
    gradient:     'linear-gradient(135deg, #1a1208 0%, #2e2010 50%, #433018 100%)',
    iconGradient: 'linear-gradient(135deg, #f9ca24 0%, #f0932b 100%)',
    glowColor:    'rgba(245,158,11,0.25)',
    border:       'border-yellow-500/20',
    glow:         'hover:shadow-[0_0_36px_rgba(245,158,11,0.22)]',
  },
  {
    type: 'game',   id: 'music',
    label: 'Música',       sublabel: 'Escucha en grupo',
    Icon: Music,
    gradient:     'linear-gradient(135deg, #0e1a28 0%, #102030 50%, #143040 100%)',
    iconGradient: 'linear-gradient(135deg, #00cec9 0%, #0984e3 100%)',
    glowColor:    'rgba(34,211,238,0.25)',
    border:       'border-cyan-500/20',
    glow:         'hover:shadow-[0_0_36px_rgba(34,211,238,0.22)]',
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
      className={`group relative flex flex-col gap-3 overflow-hidden rounded-[22px] border ${border} ${glow} p-4 text-left transition-all duration-300 hover:scale-[1.03] disabled:opacity-50`}
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
        className="flex h-11 w-11 items-center justify-center rounded-[14px] shadow-lg"
      >
        <Icon size={20} className="text-white drop-shadow-sm" strokeWidth={1.8} />
      </div>

      {/* Labels + arrow */}
      <div className="flex items-end justify-between gap-1">
        <div>
          <p className="text-sm font-bold text-white leading-tight">{label}</p>
          <p className="mt-0.5 text-[11px] text-white/40 leading-snug">{sublabel}</p>
        </div>
        <ArrowRight
          size={13}
          className="mb-0.5 shrink-0 text-white/20 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-white/50"
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
      className="flex items-center gap-3 rounded-[18px] border border-white/[0.06] bg-[#111120] p-3"
    >
      <div
        style={{ background: iconGradient }}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] shadow-md"
      >
        <Icon size={18} className="text-white" strokeWidth={1.8} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white leading-tight">
          {space.spaceName || space.spaceId}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
          <span className="text-[10px] text-white/40">{meta.label}</span>
          <span className="text-[10px] text-white/25">·</span>
          <Users size={9} className="text-white/30" />
          <span className="text-[10px] text-white/40">{space.users || 1}</span>
        </div>
      </div>

      <button
        onClick={() => onJoin(space)}
        className="shrink-0 flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-white/[0.12]"
      >
        Entrar <ArrowRight size={10} />
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
      <div className="mx-auto max-w-lg px-4 pb-24 pt-5">

        {/* ── Brand header ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          {/* Logo row */}
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xl font-black tracking-tight text-white">SPACELY</span>
            <Sparkles size={14} className="text-cyan-400" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/35 mb-4">
            Tu universo, a tu manera.
          </p>

          {/* Section pill */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 shadow-[0_0_12px_rgba(34,211,238,0.1)]">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300/80">
              Espacios
            </span>
          </div>
        </motion.div>

        {/* ── Page title ────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          className="mb-6"
        >
          <h1 className="text-[2rem] font-black uppercase tracking-[0.1em] leading-none text-white">
            ESPACIOS
          </h1>
          <p className="mt-2 text-sm text-white/45 leading-snug">
            Entra directo, habla cuando quieras.
          </p>
        </motion.div>

        {/* ── Create CTA ────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mb-2"
        >
          <button
            onClick={() => navigate('/spaces/new')}
            className="group relative w-full overflow-hidden rounded-[22px] bg-gradient-to-r from-cyan-400 via-purple-500 to-purple-600 p-[1px] shadow-[0_0_32px_rgba(34,211,238,0.18),0_0_60px_rgba(139,92,246,0.12)] transition hover:shadow-[0_0_44px_rgba(34,211,238,0.3),0_0_80px_rgba(139,92,246,0.2)] hover:brightness-110 active:scale-[0.98]"
          >
            <div className="relative flex flex-col items-center justify-center gap-1 overflow-hidden rounded-[21px] bg-gradient-to-r from-cyan-500/90 via-purple-500/90 to-purple-600/90 px-6 py-5">
              {/* Shine overlay */}
              <div className="pointer-events-none absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-[100%]" />
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-white" />
                <Plus size={18} className="text-white" strokeWidth={2.5} />
                <span className="text-base font-black uppercase tracking-[0.18em] text-white">
                  Crear espacio
                </span>
              </div>
            </div>
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.12 }}
          className="mb-8 text-center text-[11px] text-white/30"
        >
          o elige una actividad para lanzar directo
        </motion.p>

        {/* ── Activity grid ─────────────────────────────────────────────────── */}
        <section className="mb-10">
          <div className="grid grid-cols-2 gap-3">
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
        </section>

        {/* ── Live spaces ───────────────────────────────────────────────────── */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
            <h2 className="text-[11px] font-black uppercase tracking-[0.24em] text-white/40">
              En vivo ahora
            </h2>
            {!loading && spaces.length > 0 && (
              <span className="ml-auto text-[10px] text-white/25">{spaces.length}</span>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-[18px] border border-white/[0.04] bg-white/[0.02]" />
              ))}
            </div>
          ) : spaces.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-[20px] border border-dashed border-white/[0.08] bg-white/[0.02] py-10 text-center">
              <Users size={24} className="text-white/15" />
              <p className="text-xs text-white/30">Sin espacios activos</p>
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
