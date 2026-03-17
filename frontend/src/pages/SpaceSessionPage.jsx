/**
 * SpaceSessionPage v2
 * + Presence layer: remote cursors, user soft-states, floating reactions
 * + auto-start listener (shows toast when server triggers default activity)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Users, ChevronLeft, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthContext } from '@/contexts/AuthContext';
import { useSpaceSession } from '@/hooks/useSpaceSession';
import { usePresenceLayer } from '@/hooks/usePresenceLayer';
import { ActivityRouter } from '@/components/spaces/ActivityRouter';
import { VoiceModule } from '@/components/spaces/VoiceModule';

// ─── Quick-reaction bar ───────────────────────────────────────────────────────

const QUICK_EMOJIS = ['🔥', '❤️', '😂', '👏', '🎉', '💀', '✨', '👀'];

function ReactionBar({ onReact }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 backdrop-blur-md">
      {QUICK_EMOJIS.map(e => (
        <button
          key={e}
          onClick={() => onReact(e)}
          className="text-base leading-none transition hover:scale-125 active:scale-110"
        >
          {e}
        </button>
      ))}
    </div>
  );
}

// ─── Floating reaction pop ────────────────────────────────────────────────────

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

// ─── Remote cursors overlay ───────────────────────────────────────────────────

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
            {/* Cursor arrow */}
            <svg width="14" height="16" viewBox="0 0 14 16" fill="none">
              <path d="M0 0L0 12L3.5 8.5L6 14L8 13L5.5 7.5L10 7.5L0 0Z" fill="white" opacity="0.9" />
            </svg>
            {/* Username pill */}
            <div className="rounded-full bg-cyan-500/80 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-md whitespace-nowrap">
              {c.username}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── User status badges (e.g. "escribiendo…", "viendo") ──────────────────────

function StatusBadge({ statusText }) {
  if (!statusText) return null;
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[9px] text-white/50">
      {statusText}
    </span>
  );
}

// ─── Activity launcher (lobby) ────────────────────────────────────────────────

const QUICK_ACTIVITIES = [
  { type: 'anime',  id: 'astro-party',  label: 'Anime',        emoji: '📺', accent: 'border-cyan-400/30 text-cyan-300'   },
  { type: 'manga',  id: 'manga-party',  label: 'Manga',        emoji: '📖', accent: 'border-purple-400/30 text-purple-300'},
  { type: 'game',   id: 'pixel-galaxy', label: 'Pixel Galaxy', emoji: '🎨', accent: 'border-green-400/30 text-green-300'  },
  { type: 'game',   id: 'connect4',     label: 'Connect 4',    emoji: '🔴', accent: 'border-amber-400/30 text-amber-300'  },
  { type: 'game',   id: 'chess',        label: 'Ajedrez',      emoji: '♟️', accent: 'border-slate-400/30 text-slate-300'  },
  { type: 'game',   id: 'poker',        label: 'Poker',        emoji: '🃏', accent: 'border-red-400/30 text-red-300'      },
  { type: 'game',   id: 'starboard',    label: 'Pizarra',      emoji: '✏️', accent: 'border-sky-400/30 text-sky-300'      },
  { type: 'game',   id: 'blackjack',    label: 'Blackjack',    emoji: '🃏', accent: 'border-yellow-400/30 text-yellow-300'},
  { type: 'game',   id: 'snake',        label: 'Snake',        emoji: '🐍', accent: 'border-lime-400/30 text-lime-300'    },
];

function ActivityLauncher({ onSelect }) {
  return (
    <div className="w-full max-w-lg">
      <p className="mb-4 text-center text-[10px] font-black uppercase tracking-[0.28em] text-white/35">
        Elige una actividad
      </p>
      <div className="grid grid-cols-3 gap-2">
        {QUICK_ACTIVITIES.map(a => (
          <button
            key={`${a.type}:${a.id}`}
            onClick={() => onSelect(a.type, a.id)}
            className={`flex flex-col items-center gap-1.5 rounded-[18px] border bg-white/[0.03] p-3 text-center transition hover:bg-white/[0.07] ${a.accent}`}
          >
            <span className="text-xl">{a.emoji}</span>
            <span className="text-[10px] font-black uppercase tracking-[0.16em]">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Participants bar ─────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SpaceSessionPage() {
  const { spaceId }      = useParams();
  const [searchParams]   = useSearchParams();
  const navigate         = useNavigate();
  const { profile, user } = useAuthContext();
  const containerRef     = useRef(null);

  const session = useSpaceSession(spaceId, { spaceName: spaceId, hostId: user?.id });
  const {
    room, activity, voiceState, isHost, participants, status,
    launchActivity, toggleVoice, setMyVoiceStatus,
  } = session;

  // Presence layer
  const { cursors, reactions, userStates, sendUserState, sendReaction } =
    usePresenceLayer(room, containerRef);

  const autoLaunchDone = useRef(false);
  const prevCount = useRef(0);

  // Auto-launch from URL param
  useEffect(() => {
    if (autoLaunchDone.current || status !== 'connected' || !isHost) return;
    const actParam = searchParams.get('activity');
    const isNew    = searchParams.get('new') === '1';
    if (!actParam || !isNew) return;
    const [type, id] = actParam.split(':');
    if (!type || !id) return;
    autoLaunchDone.current = true;
    launchActivity(type, id);
    toast.success('Espacio creado — ¡invita a tus amigos!', { duration: 4000 });
  }, [status, isHost, searchParams, launchActivity]);

  // Listener: server auto-started an activity
  useEffect(() => {
    if (!room) return;
    const unsub = room.onMessage('activity_auto_started', ({ type, id }) => {
      toast(`▶ Auto-start: ${id}`, { icon: '⚡', duration: 3000 });
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [room]);

  // Toast when someone joins
  useEffect(() => {
    if (participants.length > prevCount.current && prevCount.current > 0 && isHost) {
      const newP = participants[participants.length - 1];
      toast(`${newP?.username || 'Alguien'} se unió 👋`, { duration: 3000 });
    }
    prevCount.current = participants.length;
  }, [participants.length]);

  // Signal "in space" soft-state when connected
  useEffect(() => {
    if (status !== 'connected') return;
    sendUserState(activity?.type ? `viendo ${activity.id}` : 'en el lobby');
  }, [status, activity?.type, activity?.id]);

  const hasActivity     = !!activity?.type;
  const hostParticipant = participants.find(p => p.isHost) || participants[0];

  // ── States ─────────────────────────────────────────────────────────────────

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
    <div ref={containerRef} className="relative min-h-full text-white">

      {/* ── Remote cursors ──────────────────────────────────────────────────── */}
      <CursorOverlay cursors={cursors} containerRef={containerRef} />

      {/* ── Floating reactions ───────────────────────────────────────────────── */}
      <FloatingReactions reactions={reactions} />

      {/* ── Topbar (only in lobby) ───────────────────────────────────────────── */}
      {!hasActivity && (
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-[#030308]/80 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/spaces')}
              className="rounded-full border border-white/10 bg-white/[0.04] p-1.5 transition hover:bg-white/[0.08]"
            >
              <ChevronLeft size={16} />
            </button>
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.26em] text-white/35">Espacio</div>
              <div className="text-sm font-black uppercase tracking-[0.12em]">{spaceId}</div>
            </div>
          </div>
          <ParticipantsBar
            participants={participants}
            hostId={hostParticipant?.userId}
            userStates={userStates}
          />
        </div>
      )}

      {/* ── Activity or Lobby ────────────────────────────────────────────────── */}
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
          <motion.div
            key="lobby"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center gap-8 px-4 py-16 text-center sm:px-6"
          >
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
              🔗 {spaceId}
            </div>

            {isHost ? (
              <>
                <div className="flex items-center gap-2 rounded-2xl border border-yellow-400/20 bg-yellow-500/10 px-4 py-2.5">
                  <Crown size={14} className="text-yellow-400" />
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-yellow-300">
                    Eres el host — elige una actividad
                  </span>
                </div>
                <ActivityLauncher onSelect={(type, id) => launchActivity(type, id)} />
              </>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                  <Zap size={24} className="text-white/30" />
                </div>
                <p className="text-sm text-white/40">Esperando al host...</p>
                {hostParticipant && (
                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
                    <img src={hostParticipant.avatar || '/default-avatar.png'} alt="" className="h-6 w-6 rounded-full object-cover" />
                    <span className="text-xs font-bold text-yellow-300">{hostParticipant.username}</span>
                    <Crown size={10} className="text-yellow-400" />
                  </div>
                )}
              </div>
            )}

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
        )}
      </AnimatePresence>

      {/* ── Voice module ─────────────────────────────────────────────────────── */}
      <div className="fixed bottom-20 right-4 z-[200] flex flex-col items-end gap-2 sm:bottom-6">
        {/* Quick reactions */}
        <ReactionBar onReact={sendReaction} />
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
  );
}
