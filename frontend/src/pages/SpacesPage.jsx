/**
 * SpacesPage — Hub de Espacios
 * Diseño v4: layout tipo Figma con brand header, hero CTA y grid de actividades
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
    iconBg:   'bg-indigo-500',
    cardBg:   'bg-[#161628]',
    border:   'border-white/[0.06]',
    glow:     'hover:border-indigo-500/30',
  },
  {
    type: 'manga',  id: 'manga-party',
    label: 'Manga',        sublabel: 'Lectura grupal',
    Icon: BookOpen,
    iconBg:   'bg-pink-500',
    cardBg:   'bg-[#1a1221]',
    border:   'border-white/[0.06]',
    glow:     'hover:border-pink-500/30',
  },
  {
    type: 'game',   id: 'pixel-galaxy',
    label: 'Pixel Galaxy', sublabel: 'Arte colaborativo',
    Icon: Palette,
    iconBg:   'bg-orange-500',
    cardBg:   'bg-[#1a1610]',
    border:   'border-white/[0.06]',
    glow:     'hover:border-orange-500/30',
  },
  {
    type: 'game',   id: 'connect4',
    label: 'Connect 4',    sublabel: 'Duelo 1v1',
    Icon: Gamepad2,
    iconBg:   'bg-rose-500',
    cardBg:   'bg-[#1a1016]',
    border:   'border-white/[0.06]',
    glow:     'hover:border-rose-500/30',
  },
  {
    type: 'game',   id: 'chess',
    label: 'Ajedrez',      sublabel: 'Partidas rápidas',
    Icon: Crown,
    iconBg:   'bg-violet-500',
    cardBg:   'bg-[#12102a]',
    border:   'border-white/[0.06]',
    glow:     'hover:border-violet-500/30',
  },
  {
    type: 'game',   id: 'poker',
    label: 'Poker',        sublabel: 'Mesa privada',
    Icon: Dice5,
    iconBg:   'bg-red-500',
    cardBg:   'bg-[#1a1010]',
    border:   'border-white/[0.06]',
    glow:     'hover:border-red-500/30',
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
  const { Icon, iconBg, cardBg, border, glow, label, sublabel } = activity;

  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      disabled={loading}
      className={`relative flex flex-col gap-3 rounded-[20px] border ${border} ${cardBg} ${glow} p-4 text-left transition-all duration-200 hover:scale-[1.02] disabled:opacity-50`}
    >
      {/* Icon block */}
      <div className={`flex h-11 w-11 items-center justify-center rounded-[14px] ${iconBg}`}>
        <Icon size={20} className="text-white" strokeWidth={1.8} />
      </div>

      {/* Labels */}
      <div>
        <p className="text-sm font-bold text-white leading-tight">{label}</p>
        <p className="mt-0.5 text-[11px] text-white/40 leading-snug">{sublabel}</p>
      </div>

      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-[20px] bg-black/50">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      )}
    </motion.button>
  );
}

// ─── Live space card ──────────────────────────────────────────────────────────

function LiveSpaceCard({ space, onJoin, index }) {
  const meta = getActivityMeta(space.activity?.type, space.activity?.id);
  const { Icon, iconBg } = meta;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-3 rounded-[18px] border border-white/[0.06] bg-[#111120] p-3"
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ${iconBg}`}>
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
    <div className="min-h-full text-white">
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
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/60">
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
            className="group relative w-full overflow-hidden rounded-[22px] bg-gradient-to-r from-cyan-400 via-purple-500 to-purple-600 p-[1px] transition hover:brightness-110 active:scale-[0.98]"
          >
            <div className="flex flex-col items-center justify-center gap-1 rounded-[21px] bg-gradient-to-r from-cyan-500/90 via-purple-500/90 to-purple-600/90 px-6 py-5">
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
