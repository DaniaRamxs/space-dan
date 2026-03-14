import React, { useEffect, useRef, useState, useMemo } from 'react';
import Hls from 'hls.js';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize, MonitorPlay, Heart, Laugh, Ghost, Zap } from 'lucide-react';
import ReactionOverlay from '@/components/reactions/ReactionOverlay';

const API_URL = import.meta.env.VITE_API_URL || '';

const proxyUrl = (url) => {
  if (!url) return url;
  if (url.startsWith('/api/anime/proxy')) return url;
  return `${API_URL}/api/anime/proxy?url=${encodeURIComponent(url)}`;
};

const formatTime = (time) => {
  const safe = Number.isFinite(time) ? time : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = Math.floor(safe % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const QUICK_REACTIONS = [
    { type: 'emoji', content: '😂', icon: Laugh, color: 'text-yellow-400' },
    { type: 'emoji', content: '🔥', icon: Zap, color: 'text-orange-500' },
    { type: 'emoji', content: '😱', icon: Ghost, color: 'text-purple-400' },
    { type: 'emoji', content: '❤️', icon: Heart, color: 'text-red-500' },
];

const AnimePlayer = ({
  source,
  subtitles = [],
  onTimeUpdate,
  onPlay,
  onPause,
  onSeek,
  isHost = false,
  externalState = {},
  reactions = [],
  onReaction,
  gifOverlays = [],
  isStorming = false
}) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const controlsTimeout = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const src = source?.url;
  const sourceFormat = source?.format || source?.sourceType || 'hls';
  const isEmbed = sourceFormat === 'embed';

  useEffect(() => {
    if (!src || isEmbed) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      return undefined;
    }

    const video = videoRef.current;
    const proxiedSrc = proxyUrl(src);

    if (Hls.isSupported()) {
      if (hlsRef.current) hlsRef.current.destroy();
      const hls = new Hls({
        manifestLoadingTimeOut: 15000,
        levelLoadingTimeOut: 15000,
        fragLoadingTimeOut: 30000,
      });
      hls.loadSource(proxiedSrc);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR: hls.startLoad(); break;
          case Hls.ErrorTypes.MEDIA_ERROR: hls.recoverMediaError(); break;
          default: hls.destroy(); break;
        }
      });
      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = proxiedSrc;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [isEmbed, src]);

  useEffect(() => {
    if (isEmbed || !videoRef.current || isHost) return;
    if (externalState.playing !== undefined) {
      if (externalState.playing) videoRef.current.play().catch(() => {});
      else videoRef.current.pause();
    }
    if (externalState.currentTime !== undefined) {
      const diff = Math.abs(videoRef.current.currentTime - externalState.currentTime);
      if (diff > 3) {
        videoRef.current.currentTime = externalState.currentTime;
      }
    }
  }, [externalState, isEmbed, isHost]);

  const autoHideControls = () => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 4000);
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      if (onPlay) onPlay(videoRef.current.currentTime);
    } else {
      videoRef.current.pause();
      if (onPause) onPause(videoRef.current.currentTime);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    if (isHost && onTimeUpdate) onTimeUpdate(videoRef.current.currentTime);
  };

  const handleSeek = (e) => {
    if (!videoRef.current || !isHost) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
    if (onSeek) onSeek(time);
  };

  const timelineReactions = useMemo(() => {
    if (!reactions || duration === 0) return [];
    
    const WINDOW = 3; 
    const sorted = [...reactions].sort((a, b) => a.timestamp - b.timestamp);
    const groups = [];

    sorted.forEach(r => {
        const lastGroup = groups[groups.length - 1];
        if (lastGroup && (r.timestamp - lastGroup.timestamp) <= WINDOW) {
            lastGroup.count = (lastGroup.count || 1) + 1;
        } else {
            groups.push({ ...r, count: 1 });
        }
    });

    return groups.map(g => ({
      ...g,
      left: (g.timestamp / duration) * 100
    }));
  }, [reactions, duration]);

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#080810] shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:rounded-[40px]">
      <div
        className="relative aspect-video w-full bg-black group/player"
        onMouseMove={!isEmbed ? autoHideControls : undefined}
      >
        {isEmbed ? (
          <iframe src={src} className="h-full w-full" allowFullScreen />
        ) : (
          <>
            <video
              ref={videoRef}
              className="h-full w-full"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={() => setDuration(videoRef.current.duration)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onClick={handlePlayPause}
            >
              {subtitles.map((sub, i) => (
                <track key={i} kind="subtitles" src={sub.url} srcLang={sub.lang} label={sub.label} default={i === 0} />
              ))}
            </video>

            <ReactionOverlay gifOverlays={gifOverlays} isStorming={isStorming} />

            <AnimatePresence>
                {showControls && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40 p-4 flex flex-col justify-end"
                    >
                        {/* Reaction Markers */}
                        <div className="relative h-6 mb-1">
                            {timelineReactions.map((r, i) => (
                                <div 
                                    key={i} 
                                    className="absolute bottom-0 bg-white/10 rounded-full backdrop-blur-sm border border-white/20 transform -translate-x-1/2 p-0.5 shadow-lg overflow-hidden" 
                                    style={{ left: `${r.left}%` }}
                                >
                                    {r.type === 'gif' ? (
                                        <div className="relative">
                                            <img src={r.content} className="w-5 h-5 object-cover rounded-md" alt="marker" />
                                            {r.count > 1 && (
                                                <span className="absolute -top-1.5 -right-1.5 bg-cyan-500 text-white text-[7px] font-black px-1 rounded-full border border-white/20">
                                                    {r.count}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-0.5 px-0.5">
                                            <span className="text-[10px]">{r.content}</span>
                                            {r.count > 1 && (
                                                <span className="text-[8px] font-black text-cyan-400">x{r.count}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Progress Bar */}
                        <div className="relative h-1.5 w-full bg-white/20 rounded-full mb-4 group/progress cursor-pointer"
                             onClick={(e) => {
                                 if (!isHost) return;
                                 const rect = e.currentTarget.getBoundingClientRect();
                                 const time = ((e.clientX - rect.left) / rect.width) * duration;
                                 videoRef.current.currentTime = time;
                             }}>
                            <div className="absolute h-full bg-cyan-400 rounded-full" style={{ width: `${(currentTime/duration)*100}%` }} />
                            {isHost && (
                                <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full scale-0 group-hover/progress:scale-100 transition-transform" style={{ left: `${(currentTime/duration)*100}%` }} />
                            )}
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button onClick={handlePlayPause} className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-all">
                                    {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" />}
                                </button>
                                <span className="text-xs font-mono text-white/70">{formatTime(currentTime)} / {formatTime(duration)}</span>
                            </div>

                            {/* Reactions panel */}
                            <div className="flex items-center gap-2">
                                {QUICK_REACTIONS.map((r, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => onReaction?.(r.type, r.content)}
                                        className="p-2 bg-white/5 rounded-xl hover:bg-white/15 transition-all active:scale-90 border border-white/5"
                                    >
                                        <r.icon size={16} className={r.color} />
                                    </button>
                                ))}
                            </div>

                            <button onClick={() => {
                                const container = videoRef.current?.parentElement;
                                if (!document.fullscreenElement) container.requestFullscreen();
                                else document.exitFullscreen();
                            }} className="p-2 bg-white/5 rounded-xl hover:bg-white/10">
                                <Maximize size={18} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
          </>
        )}

        <div className="absolute left-4 top-4 flex gap-2 pointer-events-none">
          {isHost ? (
            <div className="flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-500/20 px-3 py-1.5 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <span className="text-[14px]">👑</span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-100">HOST</span>
            </div>
          ) : (externalState && externalState.videoId) ? (
            <div className="flex items-center gap-2 rounded-full border border-blue-300/40 bg-blue-500/20 px-3 py-1.5 backdrop-blur-md">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100 text-shadow-glow">Synced</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AnimePlayer;
