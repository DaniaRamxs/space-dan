import React, { memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactPlayer from 'react-player/lazy';
import {
  Music2, ChevronDown, ChevronUp, Play, Pause, SkipForward,
  Volume2, VolumeX, RotateCcw, Plus, X, Heart, Check,
} from 'lucide-react';
import { ATMOSPHERE_META } from './mangaTracks';

const MangaMusicPlayer = memo(({
  // state
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
  rankedTracks,
  filteredTracks,
  // setters
  setLoop,
  setAtmosphere,
  setExpanded,
  setUserInteracted,
  setAddingUrl,
  setUrlInput,
  // handlers
  playTrack,
  handleTogglePlay,
  handleVolumeChange,
  handleSkip,
  handleTrackEnded,
  handleVote,
  handleAddUrl,
  // from parent
  isHost,
}) => {

  const handleInteract = useCallback(() => {
    setUserInteracted(true);
    if (currentTrack && !isPlaying && isHost) {
      handleTogglePlay();
    }
  }, [setUserInteracted, currentTrack, isPlaying, isHost, handleTogglePlay]);

  const handleUrlKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleAddUrl();
    if (e.key === 'Escape') { setAddingUrl(false); setUrlInput(''); }
  }, [handleAddUrl, setAddingUrl, setUrlInput]);

  return (
    <div className="fixed bottom-20 left-3 z-[10020]">
      {/* Hidden ReactPlayer — always mounted when track exists */}
      {currentTrack?.url && (
        <ReactPlayer
          url={currentTrack.url}
          playing={isPlaying && userInteracted}
          volume={volume}
          loop={loop}
          width="0"
          height="0"
          style={{ display: 'none' }}
          onEnded={handleTrackEnded}
          config={{
            youtube: { playerVars: { autoplay: 1, controls: 0, disablekb: 1 } },
            file: { forceAudio: true },
          }}
        />
      )}

      <AnimatePresence mode="wait">
        {!expanded ? (
          /* ── Collapsed pill ── */
          <motion.button
            key="pill"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => setExpanded(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-full bg-[#0d0d14]/95 border border-white/10 shadow-xl backdrop-blur-md"
          >
            <Music2 size={14} className="text-violet-400 flex-shrink-0" />
            {isPlaying && (
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0"
              />
            )}
            <span className="text-white/60 text-xs max-w-[120px] truncate">
              {currentTrack?.title ?? 'Música Ambiente'}
            </span>
            <ChevronUp size={12} className="text-white/30 flex-shrink-0" />
          </motion.button>
        ) : (
          /* ── Expanded panel ── */
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            className="w-[310px] max-h-[70vh] flex flex-col rounded-2xl bg-[#0d0d14]/97 border border-white/10 shadow-2xl backdrop-blur-md overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Music2 size={14} className="text-violet-400" />
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
                className="w-6 h-6 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
              >
                <ChevronDown size={14} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#7c3aed33 transparent' }}>

              {/* Atmosphere filter pills */}
              <div className="flex gap-1.5 px-3 pt-3 pb-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
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
                    style={atmosphere === key ? { backgroundColor: `${meta.color}22`, borderColor: `${meta.color}55`, color: meta.color } : {}}
                  >
                    <span>{meta.emoji}</span>
                    {meta.label}
                  </button>
                ))}
              </div>

              {/* Mobile autoplay gate */}
              {!userInteracted && currentTrack && (
                <div className="mx-3 mb-3 px-3 py-2.5 rounded-xl bg-violet-600/15 border border-violet-500/25 flex items-center justify-between gap-3">
                  <span className="text-white/60 text-xs">Toca para iniciar música</span>
                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    onClick={handleInteract}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-black transition-colors"
                  >
                    Iniciar
                  </motion.button>
                </div>
              )}

              {/* Now Playing */}
              {currentTrack ? (
                <div className="mx-3 mb-3 px-3 py-3 rounded-xl bg-white/5 border border-white/10">
                  {/* Track info */}
                  <div className="flex items-start gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                         style={{ backgroundColor: `${ATMOSPHERE_META[currentTrack.category]?.color ?? '#a78bfa'}18` }}>
                      {ATMOSPHERE_META[currentTrack.category]?.emoji ?? '🎵'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 text-xs font-bold truncate">{currentTrack.title}</p>
                      <p className="text-white/30 text-[10px]">{ATMOSPHERE_META[currentTrack.category]?.label ?? currentTrack.category}</p>
                    </div>
                  </div>

                  {/* Controls — host only */}
                  {isHost ? (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        {/* Play / Pause */}
                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          onClick={() => { if (!userInteracted) setUserInteracted(true); handleTogglePlay(); }}
                          className="w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center text-white transition-colors flex-shrink-0"
                        >
                          {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                        </motion.button>

                        {/* Skip */}
                        <motion.button
                          whileTap={{ scale: 0.88 }}
                          onClick={handleSkip}
                          disabled={rankedTracks.length <= 1}
                          className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/50 hover:text-white/80 transition-all disabled:opacity-30"
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

                        {/* Volume icon */}
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
                        min={0}
                        max={1}
                        step={0.01}
                        value={volume}
                        onChange={e => handleVolumeChange(parseFloat(e.target.value))}
                        className="w-full h-1 accent-violet-500 cursor-pointer"
                        style={{ background: `linear-gradient(to right, #7c3aed ${volume * 100}%, #ffffff15 ${volume * 100}%)` }}
                      />
                    </>
                  ) : (
                    /* Guest: show status only */
                    <div className="flex items-center gap-2 text-white/30 text-xs">
                      {isPlaying ? (
                        <>
                          <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-violet-400" />
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
                      ? 'Agrega URLs de YouTube para escuchar música 🎵'
                      : isHost
                        ? 'Elige una pista de la lista para reproducir'
                        : 'Esperando que el host elija una pista'}
                  </p>
                </div>
              )}

              {/* Track list */}
              <div className="px-3 pb-1">
                <p className="text-white/25 text-[10px] font-black uppercase tracking-wider mb-2">
                  {atmosphere ? `${ATMOSPHERE_META[atmosphere]?.label ?? atmosphere}` : 'Todas las pistas'}
                  {rankedTracks.length > 0 && <span className="ml-1 font-normal">({rankedTracks.length})</span>}
                </p>

                {rankedTracks.length === 0 ? (
                  <p className="text-white/20 text-xs text-center py-3">
                    No hay pistas en esta categoría — pega un link de YouTube ⬇️
                  </p>
                ) : (
                  <div className="space-y-1">
                    {rankedTracks.map((track) => {
                      const voteCount = votes[track.id]?.length ?? 0;
                      const isCurrentTrack = currentTrack?.id === track.id;
                      const isVoted = myVote === track.id;
                      const meta = ATMOSPHERE_META[track.category];
                      return (
                        <div
                          key={track.id}
                          className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-all ${
                            isCurrentTrack
                              ? 'bg-violet-600/15 border-violet-500/25'
                              : 'bg-white/3 border-white/5 hover:bg-white/5'
                          }`}
                        >
                          {/* Atmosphere emoji */}
                          <span className="text-sm flex-shrink-0">{meta?.emoji ?? '🎵'}</span>

                          {/* Title */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs truncate ${isCurrentTrack ? 'text-violet-300 font-bold' : 'text-white/60'}`}>
                              {track.title}
                            </p>
                            {track.custom && (
                              <p className="text-white/20 text-[9px]">custom</p>
                            )}
                          </div>

                          {/* Vote count badge */}
                          {voteCount > 0 && (
                            <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-400 text-[9px] font-black">
                              {voteCount}
                            </span>
                          )}

                          {/* Vote (heart) button — all users */}
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

                          {/* Play button — host only */}
                          {isHost && (
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              onClick={() => { if (!userInteracted) setUserInteracted(true); playTrack(track); }}
                              className={`flex-shrink-0 flex items-center gap-1 px-1.5 py-1 rounded-lg text-[10px] font-black border transition-all ${
                                isCurrentTrack && isPlaying
                                  ? 'bg-violet-600/20 border-violet-500/30 text-violet-400'
                                  : 'bg-white/5 border-white/10 text-white/40 hover:text-white/80 hover:border-white/20'
                              }`}
                            >
                              {isCurrentTrack && isPlaying
                                ? <span className="flex items-center gap-0.5"><motion.span animate={{ opacity: [1,0.3,1] }} transition={{ duration: 1.2, repeat: Infinity }} className="w-1 h-1 rounded-full bg-violet-400" />ON</span>
                                : <><Play size={8} fill="currentColor" />▶</>
                              }
                            </motion.button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Spacer before add URL */}
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
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        type="url"
                        value={urlInput}
                        onChange={e => setUrlInput(e.target.value)}
                        onKeyDown={handleUrlKeyDown}
                        placeholder="https://youtube.com/... o /music/file.mp3"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2
                                   text-[11px] text-white placeholder-white/20 outline-none
                                   focus:border-violet-500/50 transition-all font-mono min-w-0"
                      />
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handleAddUrl}
                        disabled={!urlInput.trim()}
                        className="flex-shrink-0 w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 flex items-center justify-center text-white transition-colors"
                      >
                        <Check size={13} />
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => { setAddingUrl(false); setUrlInput(''); }}
                        className="flex-shrink-0 w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/40 hover:text-white/70 transition-all"
                      >
                        <X size={13} />
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.button
                    key="url-btn"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
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
