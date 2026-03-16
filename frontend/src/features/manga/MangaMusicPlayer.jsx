// MangaMusicPlayer — ambient music panel for Manga Party
//
// Position: fixed top-14 right-3 (top-right corner, below the room header)
//
// Playback strategy — direct YouTube IFrame API (no ReactPlayer):
//   React state updates are async. By the time ReactPlayer processes a
//   playing=true prop change, the browser's user-gesture window has expired
//   and Chrome blocks autoplay. The fix: create the <iframe> synchronously
//   inside the click handler (still within the gesture), then use postMessage
//   for subsequent play/pause/volume commands.

import React, { memo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music2, ChevronDown, ChevronUp, Play, Pause, SkipForward,
  Volume2, VolumeX, RotateCcw, Plus, X, Heart, AlertCircle,
} from 'lucide-react';
import { ATMOSPHERE_META } from './mangaTracks';
import { parseYoutubeUrl } from './useMangaMusic';

// ── MangaMusicPlayer ──────────────────────────────────────────────────────────

const MangaMusicPlayer = memo(({
  // state (from useMangaMusic)
  currentTrack,
  isPlaying,
  volume,
  loop,
  votes,
  myVote,
  atmosphere,
  expanded,
  userInteracted,
  addingUrl,
  urlInput,
  playerError,
  rankedTracks,
  filteredTracks,
  // setters
  setLoop,
  setAtmosphere,
  setExpanded,
  setUserInteracted,
  setAddingUrl,
  setUrlInput,
  // callbacks
  playTrack,
  handleTogglePlay,
  handleVolumeChange,
  handleSkip,
  handleTrackEnded,
  handleVote,
  handleAddUrl,
  handlePlayerError,
  handlePlayerReady,
  // from parent
  isHost,
}) => {
  // ── YouTube iframe engine ──────────────────────────────────────────────────
  // containerRef: off-screen div that holds the active <iframe>
  // activeVideoId: tracks which video ID is currently loaded
  const containerRef    = useRef(null);
  const iframeRef       = useRef(null);
  const activeVideoId   = useRef(null);

  // Send a YouTube IFrame API command via postMessage
  const ytCmd = useCallback((func, args = []) => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        '*',
      );
    } catch (_) {}
  }, []);

  // Create (or replace) the iframe — MUST be called inside a user gesture.
  // autoplay=1 in the src fires play synchronously when the iframe loads,
  // while the browser still considers the click gesture active.
  const ytLoad = useCallback((videoId, vol, shouldLoop) => {
    if (!containerRef.current || !videoId) return;
    activeVideoId.current = videoId;
    const loopParam = shouldLoop ? `&loop=1&playlist=${videoId}` : '';
    const src = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&enablejsapi=1&playsinline=1&rel=0&fs=0${loopParam}&origin=${encodeURIComponent(window.location.origin)}`;
    const iframe = document.createElement('iframe');
    iframe.src   = src;
    iframe.allow = 'autoplay; encrypted-media';
    iframe.style.cssText = 'width:100%;height:100%;border:0;';
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(iframe);
    iframeRef.current = iframe;
    // Apply volume after a brief delay (player needs time to init)
    setTimeout(() => ytCmd('setVolume', [Math.round(vol * 100)]), 1500);
  }, [ytCmd]);

  const ytStop = useCallback(() => {
    if (containerRef.current) containerRef.current.innerHTML = '';
    iframeRef.current    = null;
    activeVideoId.current = null;
  }, []);

  // Keep volume in sync when slider changes
  useEffect(() => {
    if (iframeRef.current) ytCmd('setVolume', [Math.round(volume * 100)]);
  }, [volume, ytCmd]);

  // Sync play/pause state (works after initial autoplay has started)
  useEffect(() => {
    if (!iframeRef.current) return;
    ytCmd(isPlaying ? 'playVideo' : 'pauseVideo');
  }, [isPlaying, ytCmd]);

  // When current track changes via sync event (guest) or is cleared
  useEffect(() => {
    if (!currentTrack?.url) { ytStop(); return; }
    const vid = parseYoutubeUrl(currentTrack.url);
    if (!vid || activeVideoId.current === vid) return;
    // Guest received track change — load with autoplay=1 (works if user has
    // previously interacted with the page, which is what userInteracted tracks)
    if (isPlaying && userInteracted) ytLoad(vid, volume, loop);
  }, [currentTrack?.id, isPlaying, userInteracted]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Interaction gate (mobile autoplay policy) ──────────────────────────────

  const handleInteract = useCallback(() => {
    setUserInteracted(true);
    // User clicked "Iniciar" — create iframe now while gesture is active
    if (currentTrack?.url) {
      const vid = parseYoutubeUrl(currentTrack.url);
      if (vid) ytLoad(vid, volume, loop);
    }
    if (currentTrack && !isPlaying && isHost) handleTogglePlay();
  }, [setUserInteracted, currentTrack, isPlaying, isHost, handleTogglePlay, ytLoad, volume, loop]);

  const handleUrlKeyDown = useCallback((e) => {
    if (e.key === 'Enter')  handleAddUrl();
    if (e.key === 'Escape') { setAddingUrl(false); setUrlInput(''); }
  }, [handleAddUrl, setAddingUrl, setUrlInput]);

  // ── Computed display props ─────────────────────────────────────────────────

  const trackMeta = currentTrack ? ATMOSPHERE_META[currentTrack.category] : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    /*
     * Positioned at top-right of the viewport (below the ~56px room header).
     * On large screens we shift left 300px so it clears the 288px right sidebar.
     * z-index is below the GraffitiToolbar (z-[10030]) so it never blocks drawing.
     */
    <div className="fixed top-14 right-3 lg:right-[300px] z-[10020]">

      {/* ── Off-screen iframe container (always mounted) ─────────────────── */}
      {/* ytLoad() injects the <iframe> here synchronously inside click handlers */}
      <div
        ref={containerRef}
        style={{
          position: 'fixed', top: '-9999px', left: '-9999px',
          width: 480, height: 270, pointerEvents: 'none',
        }}
      />

      <AnimatePresence mode="wait">
        {!expanded ? (

          /* ── Collapsed pill ─────────────────────────────────────────────── */
          <motion.button
            key="pill"
            initial={{ opacity: 0, scale: 0.88, y: -8 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{    opacity: 0, scale: 0.88, y: -8  }}
            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
            onClick={() => setExpanded(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-full
                       bg-[#0d0d14]/95 border border-white/10
                       shadow-xl backdrop-blur-md hover:border-white/20 transition-colors"
          >
            {/* Animated equalizer bars when playing */}
            {isPlaying ? (
              <span className="flex items-end gap-px h-3 flex-shrink-0">
                {[0, 1, 2].map(i => (
                  <motion.span
                    key={i}
                    className="w-0.5 rounded-full bg-violet-400"
                    animate={{ height: ['4px', '12px', '4px'] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </span>
            ) : (
              <Music2 size={13} className="text-violet-400/60 flex-shrink-0" />
            )}

            <span className="text-white/60 text-xs max-w-[140px] truncate">
              {currentTrack?.title ?? 'Música Ambiente'}
            </span>

            <ChevronDown size={11} className="text-white/30 flex-shrink-0" />
          </motion.button>

        ) : (

          /* ── Expanded panel ─────────────────────────────────────────────── */
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,   scale: 1    }}
            exit={{    opacity: 0, y: -10, scale: 0.97  }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            className="w-[300px] max-h-[75vh] flex flex-col rounded-2xl
                       bg-[#0d0d14]/97 border border-white/10
                       shadow-2xl backdrop-blur-md overflow-hidden"
          >

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3
                            border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Music2 size={13} className="text-violet-400" />
                <span className="text-white/80 text-sm font-black">Música Ambiente</span>
                {isPlaying && (
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-1.5 h-1.5 rounded-full bg-violet-400"
                  />
                )}
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="w-6 h-6 rounded-lg flex items-center justify-center
                           text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
              >
                <ChevronUp size={13} />
              </button>
            </div>

            {/* Scrollable body */}
            <div
              className="flex-1 overflow-y-auto"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#7c3aed33 transparent' }}
            >

              {/* Atmosphere filter pills */}
              <div
                className="flex gap-1.5 px-3 pt-3 pb-2 overflow-x-auto"
                style={{ scrollbarWidth: 'none' }}
              >
                <button
                  onClick={() => setAtmosphere(null)}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black border transition-all ${
                    atmosphere === null
                      ? 'bg-violet-600 border-violet-500 text-white'
                      : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                  }`}
                >
                  Todas
                </button>
                {Object.entries(ATMOSPHERE_META).map(([key, meta]) => (
                  <button
                    key={key}
                    onClick={() => setAtmosphere(atmosphere === key ? null : key)}
                    className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border transition-all ${
                      atmosphere === key
                        ? 'border-white/30 text-white'
                        : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                    }`}
                    style={atmosphere === key
                      ? { backgroundColor: `${meta.color}22`, borderColor: `${meta.color}55`, color: meta.color }
                      : {}}
                  >
                    <span>{meta.emoji}</span>
                    {meta.label}
                  </button>
                ))}
              </div>

              {/* Mobile autoplay gate */}
              {!userInteracted && currentTrack && (
                <div className="mx-3 mb-3 px-3 py-2.5 rounded-xl
                                bg-violet-600/15 border border-violet-500/25
                                flex items-center justify-between gap-3">
                  <span className="text-white/60 text-xs">Toca para iniciar música</span>
                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    onClick={handleInteract}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg
                               bg-violet-600 hover:bg-violet-500
                               text-white text-xs font-black transition-colors"
                  >
                    Iniciar
                  </motion.button>
                </div>
              )}

              {/* Player error banner */}
              {playerError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mx-3 mb-3 px-3 py-2.5 rounded-xl
                             bg-red-500/10 border border-red-500/25
                             flex items-start gap-2"
                >
                  <AlertCircle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-300/80 text-[11px] leading-snug">{playerError}</p>
                </motion.div>
              )}

              {/* Now Playing */}
              {currentTrack ? (
                <div className="mx-3 mb-3 px-3 py-3 rounded-xl bg-white/5 border border-white/10">

                  {/* Track info */}
                  <div className="flex items-start gap-2 mb-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                      style={{ backgroundColor: `${trackMeta?.color ?? '#a78bfa'}18` }}
                    >
                      {trackMeta?.emoji ?? '🎵'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 text-xs font-bold truncate">{currentTrack.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-white/30 text-[10px]">
                          {trackMeta?.label ?? currentTrack.category}
                        </p>
                        {currentTrack.credit && (
                          <span className="text-white/20 text-[9px] truncate">{currentTrack.credit}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Host controls */}
                  {isHost ? (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        {/* Play / Pause */}
                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          onClick={() => {
                            if (!userInteracted) setUserInteracted(true);
                            // If paused and no iframe loaded yet, create it now (in gesture)
                            if (!isPlaying && currentTrack?.url && !iframeRef.current) {
                              const vid = parseYoutubeUrl(currentTrack.url);
                              if (vid) ytLoad(vid, volume, loop);
                            } else {
                              ytCmd(isPlaying ? 'pauseVideo' : 'playVideo');
                            }
                            handleTogglePlay();
                          }}
                          className="w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-500
                                     flex items-center justify-center text-white transition-colors flex-shrink-0"
                        >
                          {isPlaying
                            ? <Pause size={14} fill="currentColor" />
                            : <Play  size={14} fill="currentColor" />}
                        </motion.button>

                        {/* Skip */}
                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          onClick={handleSkip}
                          disabled={rankedTracks.length <= 1}
                          className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 border border-white/10
                                     flex items-center justify-center
                                     text-white/50 hover:text-white/80 transition-all disabled:opacity-30"
                        >
                          <SkipForward size={12} />
                        </motion.button>

                        {/* Loop */}
                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          onClick={() => setLoop(l => !l)}
                          className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all ${
                            loop
                              ? 'bg-violet-600/20 border-violet-500/40 text-violet-400'
                              : 'bg-white/5 border-white/10 text-white/30 hover:text-white/60'
                          }`}
                        >
                          <RotateCcw size={11} />
                        </motion.button>

                        <div className="flex-1" />

                        {/* Mute toggle */}
                        <button
                          onClick={() => handleVolumeChange(volume > 0 ? 0 : 0.35)}
                          className="text-white/30 hover:text-white/70 transition-colors flex-shrink-0"
                        >
                          {volume === 0 ? <VolumeX size={13} /> : <Volume2 size={13} />}
                        </button>
                      </div>

                      {/* Volume slider */}
                      <input
                        type="range"
                        min={0} max={1} step={0.01}
                        value={volume}
                        onChange={e => handleVolumeChange(parseFloat(e.target.value))}
                        className="w-full h-1 accent-violet-500 cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #7c3aed ${volume * 100}%, #ffffff15 ${volume * 100}%)`,
                        }}
                      />
                    </>
                  ) : (
                    /* Guest: show playing status only */
                    <div className="flex items-center gap-2 text-white/30 text-xs">
                      {isPlaying ? (
                        <>
                          <motion.span
                            animate={{ opacity: [1, 0.3, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="w-1.5 h-1.5 rounded-full bg-violet-400"
                          />
                          <span>Reproduciendo</span>
                        </>
                      ) : (
                        <span>En pausa</span>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* No track selected */
                <div className="mx-3 mb-3 px-3 py-4 rounded-xl bg-white/3 border border-white/5 text-center">
                  <p className="text-white/25 text-xs">
                    {filteredTracks.length === 0
                      ? 'Agrega una URL de YouTube para escuchar música 🎵'
                      : isHost
                        ? 'Elige una pista de la lista para reproducir'
                        : 'Esperando que el host elija una pista'}
                  </p>
                </div>
              )}

              {/* Track list */}
              <div className="px-3 pb-1">
                <p className="text-white/25 text-[10px] font-black uppercase tracking-wider mb-2">
                  {atmosphere
                    ? `${ATMOSPHERE_META[atmosphere]?.label ?? atmosphere}`
                    : 'Todas las pistas'}
                  {rankedTracks.length > 0 && (
                    <span className="ml-1 font-normal">({rankedTracks.length})</span>
                  )}
                </p>

                {rankedTracks.length === 0 ? (
                  <p className="text-white/20 text-xs text-center py-3">
                    No hay pistas en esta categoría — pega un link de YouTube ⬇️
                  </p>
                ) : (
                  <div className="space-y-1">
                    {rankedTracks.map((track) => {
                      const voteCount      = votes[track.id]?.length ?? 0;
                      const isCurrentTrack = currentTrack?.id === track.id;
                      const isVoted        = myVote === track.id;
                      const meta           = ATMOSPHERE_META[track.category];

                      return (
                        <div
                          key={track.id}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-all ${
                            isCurrentTrack
                              ? 'bg-violet-600/15 border-violet-500/25'
                              : 'bg-white/3 border-white/5 hover:bg-white/5'
                          }`}
                        >
                          {/* Category emoji */}
                          <span className="text-sm flex-shrink-0">{meta?.emoji ?? '🎵'}</span>

                          {/* Title + generated badge */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs truncate ${isCurrentTrack ? 'text-violet-300 font-bold' : 'text-white/60'}`}>
                              {track.title}
                            </p>
                            {track.custom && (
                              <span className="text-white/20 text-[9px]">custom</span>
                            )}
                          </div>

                          {/* Vote count badge */}
                          {voteCount > 0 && (
                            <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full
                                             bg-pink-500/20 border border-pink-500/30
                                             text-pink-400 text-[9px] font-black">
                              {voteCount}
                            </span>
                          )}

                          {/* Heart vote button */}
                          <motion.button
                            whileTap={{ scale: 0.82 }}
                            onClick={() => handleVote(track.id)}
                            className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                              isVoted
                                ? 'bg-pink-500/20 border border-pink-500/30 text-pink-400'
                                : 'bg-white/5 border border-white/10 text-white/25 hover:text-pink-400'
                            }`}
                          >
                            <Heart size={10} fill={isVoted ? 'currentColor' : 'none'} />
                          </motion.button>

                          {/* Play button (host only) */}
                          {isHost && (
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              onClick={() => {
                                if (!userInteracted) setUserInteracted(true);
                                // Load iframe synchronously inside the gesture
                                const vid = parseYoutubeUrl(track.url);
                                if (vid) ytLoad(vid, volume, loop);
                                playTrack(track);
                              }}
                              className={`flex-shrink-0 flex items-center gap-1 px-1.5 py-1 rounded-lg text-[10px] font-black border transition-all ${
                                isCurrentTrack && isPlaying
                                  ? 'bg-violet-600/20 border-violet-500/30 text-violet-400'
                                  : 'bg-white/5 border-white/10 text-white/40 hover:text-white/80 hover:border-white/20'
                              }`}
                            >
                              {isCurrentTrack && isPlaying ? (
                                <span className="flex items-center gap-0.5">
                                  <motion.span
                                    animate={{ opacity: [1, 0.3, 1] }}
                                    transition={{ duration: 1.2, repeat: Infinity }}
                                    className="w-1 h-1 rounded-full bg-violet-400"
                                  />
                                  ON
                                </span>
                              ) : (
                                <Play size={8} fill="currentColor" />
                              )}
                            </motion.button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="h-2" />
            </div>

            {/* Add URL — pinned at bottom */}
            <div className="flex-shrink-0 border-t border-white/10 px-3 py-2.5">
              <AnimatePresence>
                {addingUrl ? (
                  <motion.div
                    key="url-input"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{    opacity: 0, height: 0    }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        type="url"
                        value={urlInput}
                        onChange={e => setUrlInput(e.target.value)}
                        onKeyDown={handleUrlKeyDown}
                        placeholder="https://youtube.com/watch?v=…"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2
                                   text-[11px] text-white placeholder-white/20 outline-none
                                   focus:border-violet-500/50 transition-all font-mono min-w-0"
                      />
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handleAddUrl}
                        disabled={!urlInput.trim()}
                        className="flex-shrink-0 w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-500
                                   disabled:opacity-30 flex items-center justify-center text-white transition-colors"
                      >
                        <Play size={11} fill="currentColor" />
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => { setAddingUrl(false); setUrlInput(''); }}
                        className="flex-shrink-0 w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10
                                   border border-white/10 flex items-center justify-center
                                   text-white/40 hover:text-white/70 transition-all"
                      >
                        <X size={13} />
                      </motion.button>
                    </div>
                    <p className="text-white/20 text-[10px] mt-1.5 px-1">
                      youtube.com/watch?v=… · youtu.be/… · /embed/… · MP3 URL
                    </p>
                  </motion.div>
                ) : (
                  <motion.button
                    key="url-btn"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{    opacity: 0 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setAddingUrl(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl
                               bg-white/5 border border-white/10 hover:border-violet-500/30
                               hover:bg-violet-600/10 text-white/40 hover:text-violet-400
                               text-xs font-bold transition-all"
                  >
                    <Plus size={12} />
                    Agregar URL (YouTube / MP3)
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

MangaMusicPlayer.displayName = 'MangaMusicPlayer';
export default MangaMusicPlayer;
