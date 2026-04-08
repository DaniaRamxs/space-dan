/**
 * ActivityRouter
 *
 * Renders the currently active activity for a SpaceSession.
 * Activities are lazy-loaded and receive a uniform set of props.
 * This component knows NOTHING about voice — fully decoupled.
 */

import React, { Suspense } from 'react';

// ─── Lazy activity components ─────────────────────────────────────────────────
const AstroPartyPage  = React.lazy(() => import('@/features/anime/AstroPartyPage'));
const MangaPartyPage  = React.lazy(() => import('@/features/manga/MangaPartyPage'));

// VoiceActivities games — these still work standalone
const Connect4Game    = React.lazy(() => import('@/components/VoiceActivities/Connect4Game'));
const PixelGalaxy     = React.lazy(() => import('@/components/VoiceActivities/PixelGalaxy/PixelGalaxyGame'));
const StarboardGame   = React.lazy(() => import('@/components/VoiceActivities/Starboard'));
const ChessGame       = React.lazy(() => import('@/components/VoiceActivities/Chess/ChessGame'));
const PokerGame       = React.lazy(() => import('@/components/VoiceActivities/PokerGame'));
const BlackjackGame   = React.lazy(() => import('@/components/VoiceActivities/Blackjack/BlackjackGame'));
const SnakeDuel       = React.lazy(() => import('@/components/VoiceActivities/SnakeDuelGame'));
const TetrisDuel      = React.lazy(() => import('@/components/VoiceActivities/TetrisDuelGame'));
const AsteroidBattle  = React.lazy(() => import('@/components/VoiceActivities/AsteroidBattleGame'));
const WatchTogether   = React.lazy(() => import('@/components/VoiceActivities/WatchTogether'));
const CoOpPuzzleGame  = React.lazy(() => import('@/components/VoiceActivities/CoOpPuzzle/CoOpPuzzleGame'));
const LudoGame        = React.lazy(() => import('@/components/VoiceActivities/Ludo/LudoGame'));
const BeatSound       = React.lazy(() => import('@/components/VoiceActivities/BeatSound'));
const JukeboxDJ       = React.lazy(() => import('@/components/VoiceActivities/JukeboxDJ'));

// ─── Registry ─────────────────────────────────────────────────────────────────
// key: "${activity.type}:${activity.id}"
const ACTIVITY_MAP = {
  'watch:watch-together':  WatchTogether,
  'anime:astro-party':     AstroPartyPage,
  'manga:manga-party':     MangaPartyPage,
  'game:pixel-galaxy':     PixelGalaxy,
  'game:puzzle':           CoOpPuzzleGame,
  'game:connect4':         Connect4Game,
  'game:snake':            SnakeDuel,
  'game:tetris':           TetrisDuel,
  'game:poker':            PokerGame,
  'game:starboard':        StarboardGame,
  'game:dj':               JukeboxDJ,
  'game:blackjack':        BlackjackGame,
  'game:chess':            ChessGame,
  'game:ludo':             LudoGame,
  'game:beat-sound':       BeatSound,
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * @param {object} activity        - From useSpaceSession: { type, id, payload, hostId }
 * @param {object} session         - Full useSpaceSession return value
 * @param {function} [onClose]     - Override close handler (defaults to stopActivity)
 */
export function ActivityRouter({ activity, session, onClose }) {
  if (!activity?.type || !activity?.id) return null;

  const key = `${activity.type}:${activity.id}`;
  
  // Bloquear específicamente music:chill para evitar error
  if (key === 'music:chill') {
    console.warn('[ActivityRouter] Blocked music:chill activity - not available');
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-white/40">
        <span className="text-2xl">🎵</span>
        <p className="text-sm">Actividad no disponible</p>
        {session.isHost && (
          <button
            onClick={() => session.stopActivity()}
            className="mt-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs hover:bg-white/10"
          >
            Volver al lobby
          </button>
        )}
      </div>
    );
  }
  
  const Component = ACTIVITY_MAP[key];

  if (!Component) {
    console.warn('[ActivityRouter] Unknown activity key:', key);
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-white/40">
        <span className="text-2xl">🔌</span>
        <p className="text-sm">Actividad desconocida: {key}</p>
        {session.isHost && (
          <button
            onClick={() => session.stopActivity()}
            className="mt-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs hover:bg-white/10"
          >
            Volver al lobby
          </button>
        )}
      </div>
    );
  }

  const handleClose = onClose || (() => session.stopActivity());

  return (
    <Suspense fallback={<ActivityLoader />}>
      <Component
        /* Uniform props that all space activities receive */
        roomName={session.spaceId}
        colyseusRoom={session.room}
        isHost={session.isHost}
        initialPayload={activity.payload}
        onPayloadChange={session.updateActivityPayload}
        onClose={handleClose}
        /* Extra: give components access to the full session if they want it */
        spaceSession={session}
      />
    </Suspense>
  );
}

function ActivityLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400" />
      <p className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300/60">
        Cargando actividad...
      </p>
    </div>
  );
}
