/**
 * SpaceSessionPage v3
 * Full UX redesign:
 *   - Persistent star/image/gif background layer
 *   - Floating FAB pill buttons (bottom-right)
 *   - PersonalizePanel (bottom sheet)
 *   - ActivityPickerSheet (bottom sheet)
 *   - Synced background via room messages
 *   - Identity message ("Espacio creado. Hazlo tuyo.") for new spaces
 *   - Join toasts for all participants
 *   - DisplayName from URL param
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Users, ChevronLeft, Zap, Sparkles, Palette, Mic, Heart, Plus, X, Check, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import { useSpaceSession } from '@/hooks/useSpaceSession';
import { usePresenceLayer } from '@/hooks/usePresenceLayer';
import { ActivityRouter } from '@/components/spaces/ActivityRouter';
import { VoiceModule } from '@/components/spaces/VoiceModule';
import { OverlayProvider } from '@/contexts/OverlayContext';
import OverlayLayer from '@/components/overlay/OverlayLayer';
import OverlayPanel from '@/components/overlay/OverlayPanel';

// ─── Pre-seeded stars for background (80 items, deterministic) ────────────────

const STARS_BG = Array.from({ length: 80 }, (_, i) => ({
  x:   ((i * 37 + 13) % 97) + 1.5,
  y:   ((i * 53 + 7)  % 95) + 2.5,
  s:   ((i * 11) % 3) * 0.5 + 1,
  d:   (i * 1.4) % 5,
  dur: 2 + (i % 7) * 0.5,
}));

// ─── CSS keyframes ────────────────────────────────────────────────────────────

const KEYFRAMES = `
  @keyframes spaceTwk {
    0%, 100% { opacity: 0.15; transform: scale(0.85); }
    50%       { opacity: 1;   transform: scale(1.15); }
  }
`;

// ─── Quick activities for the picker sheet ───────────────────────────────────

const QUICK_ACTIVITIES = [
  { type: 'anime',  id: 'astro-party',  label: 'Anime',        emoji: '📺', accent: 'border-cyan-400/30 text-cyan-300'    },
  { type: 'manga',  id: 'manga-party',  label: 'Manga',        emoji: '📖', accent: 'border-purple-400/30 text-purple-300' },
  { type: 'game',   id: 'pixel-galaxy', label: 'Pixel Galaxy', emoji: '🎨', accent: 'border-green-400/30 text-green-300'   },
  { type: 'game',   id: 'connect4',     label: 'Connect 4',    emoji: '🔴', accent: 'border-amber-400/30 text-amber-300'   },
  { type: 'game',   id: 'chess',        label: 'Ajedrez',      emoji: '♟️', accent: 'border-slate-400/30 text-slate-300'   },
  { type: 'game',   id: 'poker',        label: 'Poker',        emoji: '🃏', accent: 'border-red-400/30 text-red-300'       },
  { type: 'game',   id: 'starboard',    label: 'Pizarra',      emoji: '✏️', accent: 'border-sky-400/30 text-sky-300'       },
  { type: 'game',   id: 'blackjack',    label: 'Blackjack',    emoji: '🃏', accent: 'border-yellow-400/30 text-yellow-300' },
  { type: 'game',   id: 'snake',        label: 'Snake',        emoji: '🐍', accent: 'border-lime-400/30 text-lime-300'     },
];

// ─── Quick reactions ──────────────────────────────────────────────────────────

const QUICK_EMOJIS = ['🔥', '❤️', '😂', '👏', '🎉', '💀', '✨', '👀'];

// ─── ReactionBar ──────────────────────────────────────────────────────────────

function ReactionBar({ onReact }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 backdrop-blur-md"
    >
      {QUICK_EMOJIS.map(e => (
        <button
          key={e}
          onClick={() => onReact(e)}
          className="text-base leading-none transition hover:scale-125 active:scale-110"
        >
          {e}
        </button>
      ))}
    </motion.div>
  );
}

// ─── FloatingReactions ────────────────────────────────────────────────────────

function FloatingReactions({ reactions }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[300] overflow-hidden">
      <AnimatePresence>
        {reactions.map(r => (
          <motion.div
            key={r.id}
            initial={{ opacity: 1, y: 0,   scale: 0.6 }}
            animate={{ opacity: 0, y: -120, scale: 1.4 }}
            exit={{}}
            transition={{ duration: 2.2, ease: 'easeOut' }}
            className="absolute bottom-24 flex flex-col items-center gap-1"
            style={{ left: `${r.x}%` }}
          >
            <span className="text-3xl drop-shadow-lg">{r.emoji}</span>
            {r.username && (
              <span className="rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] text-white/70">
                {r.username}
              </span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── CursorOverlay ────────────────────────────────────────────────────────────

function CursorOverlay({ cursors, containerRef }) {
  if (!cursors.length || !containerRef?.current) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-[250] overflow-hidden">
      <AnimatePresence>
        {cursors.map(c => (
          <motion.div
            key={c.sessionId}
            initial={false}
            animate={{ left: `${c.x}%`, top: `${c.y}%` }}
            transition={{ duration: 0.06, ease: 'linear' }}
            className="absolute flex flex-col items-start gap-0.5"
            style={{ transform: 'translate(-2px, -2px)' }}
          >
            <svg width="14" height="16" viewBox="0 0 14 16" fill="none">
              <path d="M0 0L0 12L3.5 8.5L6 14L8 13L5.5 7.5L10 7.5L0 0Z" fill="white" opacity="0.9" />
            </svg>
            <div className="rounded-full bg-cyan-500/80 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-md whitespace-nowrap">
              {c.username}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ statusText }) {
  if (!statusText) return null;
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[9px] text-white/50">
      {statusText}
    </span>
  );
}

// ─── ParticipantsBar ──────────────────────────────────────────────────────────

function ParticipantsBar({ participants, hostId, userStates }) {
  if (!participants.length) return null;
  return (
    <div className="flex items-center gap-2">
      {participants.slice(0, 6).map((p, i) => (
        <div key={p.userId || i} className="relative flex flex-col items-center gap-0.5" title={p.username}>
          <img
            src={p.avatar || '/default-avatar.png'}
            alt={p.username}
            className="h-7 w-7 rounded-full object-cover border border-white/10"
          />
          {p.userId === hostId && (
            <Crown size={8} className="absolute -top-1 -right-1 text-yellow-400" />
          )}
          <StatusBadge statusText={userStates?.[p.userId]} />
        </div>
      ))}
      {participants.length > 6 && (
        <span className="text-[10px] text-white/30">+{participants.length - 6}</span>
      )}
    </div>
  );
}

// ─── SpaceBackground ─────────────────────────────────────────────────────────

function SpaceBackground({ bgType, bgValue, blur, brightness }) {
  if (bgType === 'stars' || !bgType) {
    return (
      <div className="fixed inset-0 z-0 overflow-hidden bg-[#030308]">
        {STARS_BG.map((star, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left:   `${star.x}%`,
              top:    `${star.y}%`,
              width:  `${star.s}px`,
              height: `${star.s}px`,
              animationName: 'spaceTwk',
              animationDuration: `${star.dur}s`,
              animationDelay:    `${star.d}s`,
              animationTimingFunction: 'ease-in-out',
              animationIterationCount: 'infinite',
            }}
          />
        ))}
      </div>
    );
  }

  // image or gif
  return (
    <div
      className="fixed inset-0 z-0 bg-center bg-cover bg-no-repeat"
      style={{
        backgroundImage: `url(${bgValue})`,
        filter: `blur(${blur || 0}px) brightness(${brightness ?? 0.5})`,
      }}
    />
  );
}

// ─── IdentityMessage ─────────────────────────────────────────────────────────

function IdentityMessage() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <motion.div
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: 4, times: [0, 0.15, 0.75, 1] }}
      onAnimationComplete={() => setVisible(false)}
      className="pointer-events-none text-center text-sm font-bold text-white/60 tracking-wide"
    >
      Espacio creado. Hazlo tuyo.
    </motion.div>
  );
}

// ─── PersonalizePanel ─────────────────────────────────────────────────────────

function PersonalizePanel({ open, onClose, currentBg, onSetBg, blur, brightness, onBlurChange, onBrightnessChange }) {
  const [urlInput, setUrlInput] = useState('');
  const [selectedType, setSelectedType] = useState(currentBg.type || 'stars');

  const bgOptions = [
    { key: 'stars', label: '✨ Estrellas' },
    { key: 'image', label: '🖼️ Imagen'    },
    { key: 'gif',   label: '🎭 GIF'       },
  ];

  const handleApply = () => {
    if (!urlInput.trim()) return;
    onSetBg(selectedType, urlInput.trim());
    onClose();
  };

  const handleStars = () => {
    setSelectedType('stars');
    onSetBg('stars', '');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="personalize-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[390] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            key="personalize-panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[400] bg-[#0c0c1e] rounded-t-[28px] border-t border-white/10 p-6"
          >
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">
                Personalizar fondo
              </h3>
              <button
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/[0.05] p-1.5 text-white/50 hover:text-white transition"
              >
                <X size={14} />
              </button>
            </div>

            {/* Bg type cards */}
            <div className="mb-5 grid grid-cols-3 gap-2">
              {bgOptions.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => {
                    setSelectedType(opt.key);
                    if (opt.key === 'stars') handleStars();
                  }}
                  className={`flex flex-col items-center gap-1.5 rounded-[18px] border py-4 text-[11px] font-black tracking-wide transition ${
                    selectedType === opt.key
                      ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-300'
                      : 'border-white/10 bg-white/[0.04] text-white/50 hover:bg-white/[0.08]'
                  }`}
                >
                  {selectedType === opt.key && opt.key !== 'stars' && (
                    <Check size={10} className="text-cyan-400" />
                  )}
                  {opt.label}
                </button>
              ))}
            </div>

            {/* URL input for image/gif */}
            {(selectedType === 'image' || selectedType === 'gif') && (
              <div className="mb-5 flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-xs text-white placeholder:text-white/25 outline-none focus:border-cyan-400/40 transition"
                />
                <button
                  onClick={handleApply}
                  disabled={!urlInput.trim()}
                  className="rounded-xl border border-cyan-400/30 bg-cyan-500/20 px-4 py-2.5 text-xs font-black text-cyan-300 hover:bg-cyan-500/30 transition disabled:opacity-40"
                >
                  Aplicar
                </button>
              </div>
            )}

            {/* Ambiente sliders */}
            <div className="flex flex-col gap-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">
                Ambiente
              </p>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-white/50 w-16 shrink-0">Blur</span>
                  <input
                    type="range" min="0" max="10" step="0.5"
                    value={blur}
                    onChange={e => onBlurChange(Number(e.target.value))}
                    className="flex-1 accent-cyan-400"
                  />
                  <span className="text-[10px] text-white/30 w-6 text-right">{blur}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-white/50 w-16 shrink-0">Brillo</span>
                  <input
                    type="range" min="0.1" max="1.0" step="0.05"
                    value={brightness}
                    onChange={e => onBrightnessChange(Number(e.target.value))}
                    className="flex-1 accent-cyan-400"
                  />
                  <span className="text-[10px] text-white/30 w-6 text-right">{Math.round(brightness * 100)}%</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── ActivityPickerSheet ──────────────────────────────────────────────────────

function ActivityPickerSheet({ open, onClose, onSelect }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="picker-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[390] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="picker-panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[400] bg-[#0c0c1e] rounded-t-[28px] border-t border-white/10 p-6"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">
                Elegir actividad
              </h3>
              <button
                onClick={onClose}
                className="rounded-full border border-white/10 bg-white/[0.05] p-1.5 text-white/50 hover:text-white transition"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {QUICK_ACTIVITIES.map(a => (
                <button
                  key={`${a.type}:${a.id}`}
                  onClick={() => { onSelect(a.type, a.id); onClose(); }}
                  className={`flex flex-col items-center gap-1.5 rounded-[18px] border bg-white/[0.03] p-3 text-center transition hover:bg-white/[0.07] ${a.accent}`}
                >
                  <span className="text-xl">{a.emoji}</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.16em]">{a.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── FAB pill button ──────────────────────────────────────────────────────────

function FabPill({ icon, label, onClick, active = false, className = '' }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 px-4 py-2.5 backdrop-blur-md text-sm font-bold text-white transition hover:bg-white/[0.1] ${
        active ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-300' : ''
      } ${className}`}
    >
      {icon}
      <span className="text-[11px] font-black uppercase tracking-[0.14em]">{label}</span>
    </motion.button>
  );
}

// ─── FloatingFABs ─────────────────────────────────────────────────────────────

function FabStack({ isHost, onOpenActivity }) {
  return (
    <div className="fixed bottom-6 right-4 z-50 flex flex-col items-end gap-2">
      {/* FAB stack — bottom to top: Actividad (host) */}
      {isHost && (
        <FabPill
          icon={<Plus size={15} />}
          label="Actividad"
          onClick={onOpenActivity}
        />
      )}
    </div>
  );
}

// ─── LobbyContent ─────────────────────────────────────────────────────────────

function LobbyContent({ isHost, isNew, participants, hostParticipant, userStates }) {
  return (
    <motion.div
      key="lobby"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center gap-8 px-4 py-16 text-center sm:px-6"
    >
      {isHost ? (
        <>
          {/* Identity message (fading) — only on new spaces */}
          {isNew && <IdentityMessage />}

          {/* Host badge */}
          <div className="flex items-center gap-2 rounded-2xl border border-yellow-400/20 bg-yellow-500/10 px-4 py-2.5">
            <Crown size={14} className="text-yellow-400" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-yellow-300">
              Eres el host
            </span>
          </div>

          {/* Hint */}
          <p className="text-sm text-white/40">
            Toca <span className="font-black text-white/60">+</span> para agregar una actividad
          </p>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
            <Zap size={24} className="text-white/30" />
          </div>
          <p className="text-sm text-white/40">Esperando al host...</p>
          {hostParticipant && (
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
              <img
                src={hostParticipant.avatar || '/default-avatar.png'}
                alt=""
                className="h-6 w-6 rounded-full object-cover"
              />
              <span className="text-xs font-bold text-yellow-300">{hostParticipant.username}</span>
              <Crown size={10} className="text-yellow-400" />
            </div>
          )}
        </div>
      )}

      {/* Participants row */}
      {participants.length > 1 && (
        <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
          <Users size={14} className="text-white/30" />
          <div className="flex items-center gap-1.5">
            {participants.map((p, i) => (
              <img
                key={p.userId || i}
                src={p.avatar || '/default-avatar.png'}
                alt={p.username}
                className="h-7 w-7 rounded-full object-cover border border-white/10"
                title={p.username}
              />
            ))}
          </div>
          <span className="text-[11px] text-white/35">{participants.length} en la sala</span>
        </div>
      )}
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SpaceSessionPage() {
  const { spaceId }        = useParams();
  const [searchParams]     = useSearchParams();
  const navigate           = useNavigate();
  const { profile, user }  = useAuthContext();
  const containerRef       = useRef(null);

  // URL params
  const displayName = searchParams.get('spaceName') || spaceId;
  const isNew       = searchParams.get('new') === '1';

  const session = useSpaceSession(spaceId, { spaceName: displayName, hostId: user?.id });
  const {
    room, activity, voiceState, isHost, participants, status,
    launchActivity, toggleVoice, setMyVoiceStatus,
  } = session;

  // Presence layer
  const { cursors, reactions, userStates, sendUserState, sendReaction } =
    usePresenceLayer(room, containerRef);

  // ── Background state (local + synced via room messages) ────────────────────
  const [spaceBg, setSpaceBgLocal] = useState({ type: 'stars', value: '' });
  const [bgBlur, setBgBlur]               = useState(0);
  const [bgBrightness, setBgBrightness]   = useState(0.5);

  const setBg = useCallback((type, value) => {
    setSpaceBgLocal({ type, value });
    room?.send('SET_BACKGROUND', { type, value });
  }, [room]);

  // Listen for bg changes from other participants
  useEffect(() => {
    if (!room) return;
    const unsub = room.onMessage('BACKGROUND_UPDATE', ({ type, value }) => {
      setSpaceBgLocal({ type, value });
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [room]);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [showReactions,     setShowReactions]     = useState(false);
  const [showPersonalize,   setShowPersonalize]   = useState(false);
  const [showActivityPicker, setShowActivityPicker] = useState(false);
  const [showOverlayPanel,  setShowOverlayPanel]  = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const autoLaunchDone = useRef(false);
  const prevCount      = useRef(0);

  // ── Auto-launch from URL param ─────────────────────────────────────────────
  useEffect(() => {
    if (autoLaunchDone.current || status !== 'connected' || !isHost) return;
    const actParam = searchParams.get('activity');
    if (!actParam || !isNew) return;
    const [type, id] = actParam.split(':');
    if (!type || !id) return;
    autoLaunchDone.current = true;
    launchActivity(type, id);
    toast.success('Espacio creado — ¡invita a tus amigos!', { duration: 4000 });
  }, [status, isHost, searchParams, launchActivity, isNew]);

  // ── Server auto-start listener ─────────────────────────────────────────────
  useEffect(() => {
    if (!room) return;
    const unsub = room.onMessage('activity_auto_started', ({ type, id }) => {
      toast(`▶ Auto-start: ${id}`, { icon: '⚡', duration: 3000 });
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [room]);

  // ── Join toasts (all participants) ─────────────────────────────────────────
  useEffect(() => {
    if (participants.length > prevCount.current && prevCount.current > 0) {
      const newP = participants[participants.length - 1];
      toast(`${newP?.username || 'Alguien'} se unió ✨`, { duration: 3000 });
    }
    prevCount.current = participants.length;
  }, [participants.length]);

  // ── Soft-state: signal presence ────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'connected') return;
    sendUserState(activity?.type ? `viendo ${activity.id}` : 'en el lobby');
  }, [status, activity?.type, activity?.id]);

  const hasActivity     = !!activity?.type;
  const hostParticipant = participants.find(p => p.isHost) || participants[0];

  // ── Loading states ─────────────────────────────────────────────────────────
  if (status === 'connecting' || status === 'idle') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400" />
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300/60">
            Conectando espacio...
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <span className="text-4xl">⚠️</span>
        <p className="text-sm text-white/50">No se pudo conectar al espacio.</p>
        <button
          onClick={() => navigate('/spaces')}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs hover:bg-white/10"
        >
          Volver a Espacios
        </button>
      </div>
    );
  }

  return (
    <OverlayProvider
      spaceId={spaceId}
      colyseusRoom={room}
      userId={profile?.id || ''}
      isHost={isHost}
    >
    <div ref={containerRef} className="relative min-h-full text-white">
      <style>{KEYFRAMES}</style>

      {/* ── z-0: Background (always visible, behind everything) ─────────────── */}
      <SpaceBackground
        bgType={spaceBg.type}
        bgValue={spaceBg.value}
        blur={bgBlur}
        brightness={bgBrightness}
      />

      {/* ── z-30: Topbar ────────────────────────────────────────────────────── */}
      <div className={`sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3 backdrop-blur-xl sm:px-6 transition-all ${
        hasActivity
          ? 'border-transparent bg-transparent'
          : 'border-white/5 bg-[#030308]/80'
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/spaces')}
            className="rounded-full border border-white/10 bg-white/[0.04] p-1.5 transition hover:bg-white/[0.08]"
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.26em] text-white/35">
              Espacio
            </div>
            <div className="text-sm font-black uppercase tracking-[0.12em]">
              {displayName}
            </div>
            {isNew && isHost && (
              <div className="text-[9px] text-white/30 leading-tight">
                {profile?.username || 'Dan'} creó este espacio
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ParticipantsBar
            participants={participants}
            hostId={hostParticipant?.userId}
            userStates={userStates}
          />
          {hasActivity && (
            <button
              onClick={() => launchActivity('', '')}
              className="rounded-full border border-white/10 bg-white/[0.05] p-1.5 text-white/50 hover:text-white hover:bg-white/[0.1] transition"
              title="Detener actividad"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── z-10: Activity or Lobby ──────────────────────────────────────────── */}
      <div className="relative z-10 min-h-[calc(100vh-60px)]">
        <AnimatePresence mode="wait">
          {hasActivity ? (
            <motion.div
              key="activity"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative"
            >
              <ActivityRouter activity={activity} session={session} />
            </motion.div>
          ) : (
            <LobbyContent
              key="lobby"
              isHost={isHost}
              isNew={isNew}
              participants={participants}
              hostParticipant={hostParticipant}
              userStates={userStates}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ── z-[150]: Overlay Layer ────────────────────────────────────────────── */}
      <OverlayLayer containerRef={containerRef} />

      {/* ── z-[250]: Remote cursors ──────────────────────────────────────────── */}
      <CursorOverlay cursors={cursors} containerRef={containerRef} />

      {/* ── z-[300]: Floating reactions ──────────────────────────────────────── */}
      <FloatingReactions reactions={reactions} />

      {/* ── z-50: Floating FABs ──────────────────────────────────────────────── */}
      <FloatingFABs
        isHost={isHost}
        onOpenActivity={() => setShowActivityPicker(true)}
      />

      {/* ── z-[400]: Panels ──────────────────────────────────────────────────── */}
      <PersonalizePanel
        open={showPersonalize}
        onClose={() => setShowPersonalize(false)}
        currentBg={spaceBg}
        onSetBg={setBg}
        blur={bgBlur}
        brightness={bgBrightness}
        onBlurChange={setBgBlur}
        onBrightnessChange={setBgBrightness}
      />
      <ActivityPickerSheet
        open={showActivityPicker}
        onClose={() => setShowActivityPicker(false)}
        onSelect={(type, id) => launchActivity(type, id)}
      />
      <OverlayPanel
        open={showOverlayPanel}
        onClose={() => setShowOverlayPanel(false)}
      />

      {/* Hidden VoiceModule manages LiveKit connection internally */}
      <div className="hidden">
        <VoiceModule
          livekitRoom={voiceState.livekitRoom || spaceId}
          isEnabled={voiceState.active}
          isHost={isHost}
          onToggle={toggleVoice}
          onVoiceStatus={setMyVoiceStatus}
          profile={profile}
        />
      </div>
    </div>
    </OverlayProvider>
  );
}
