import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, MonitorPlay } from 'lucide-react';

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

const AnimePlayer = ({
  source,
  subtitles = [],
  onTimeUpdate,
  onPlay,
  onPause,
  onSeek,
  isHost = false,
  externalState = {},
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
          case Hls.ErrorTypes.NETWORK_ERROR:
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError();
            break;
          default:
            hls.destroy();
            break;
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

    if (externalState.isPlaying !== undefined) {
      if (externalState.isPlaying) videoRef.current.play().catch(() => {});
      else videoRef.current.pause();
    }

    if (externalState.currentTime !== undefined) {
      const diff = Math.abs(videoRef.current.currentTime - externalState.currentTime);
      if (diff > 1.5) {
        videoRef.current.currentTime = externalState.currentTime;
      }
    }
  }, [externalState, isEmbed, isHost]);

  useEffect(() => () => {
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
  }, []);

  const autoHideControls = () => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
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

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleSeek = (e) => {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
    if (onSeek) onSeek(time);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e) => {
    if (!videoRef.current) return;
    const nextVolume = parseFloat(e.target.value);
    videoRef.current.volume = nextVolume;
    setVolume(nextVolume);
    setIsMuted(nextVolume === 0);
  };

  const toggleFullscreen = () => {
    if (isEmbed) return;
    const container = videoRef.current?.parentElement;
    if (!container) return;
    if (!document.fullscreenElement) container.requestFullscreen();
    else document.exitFullscreen();
  };

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[#080810] shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:rounded-[28px]">
      <div
        className="relative aspect-video w-full bg-black"
        onMouseMove={!isEmbed ? autoHideControls : undefined}
        onMouseLeave={!isEmbed && isPlaying ? () => setShowControls(false) : undefined}
      >
        {isEmbed ? (
          <iframe
            src={src}
            title={source?.quality || 'Anime embed player'}
            className="h-full w-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <>
            <video
              ref={videoRef}
              className="h-full w-full"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onClick={handlePlayPause}
            >
              {subtitles.map((sub, index) => (
                <track
                  key={`${sub.url}-${index}`}
                  kind="subtitles"
                  src={sub.url}
                  srcLang={sub.lang || 'es'}
                  label={sub.label || 'Español'}
                  default={index === 0}
                />
              ))}
            </video>

            <div
              className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 py-3 transition-opacity sm:px-4 ${showControls ? 'opacity-100' : 'opacity-0'}`}
            >
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="mb-3 h-1 w-full cursor-pointer appearance-none rounded-lg bg-white/20 accent-cyan-400"
                disabled={!isHost && Object.keys(externalState).length > 0}
              />

              <div className="flex flex-wrap items-center justify-between gap-3 text-white">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <button onClick={handlePlayPause} className="rounded-full bg-white/10 p-2 transition hover:bg-white/20">
                    {isPlaying ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" />}
                  </button>
                  <button onClick={toggleMute} className="rounded-full bg-white/10 p-2 transition hover:bg-white/20">
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="hidden h-1 w-20 cursor-pointer appearance-none rounded-lg bg-white/20 accent-white sm:block"
                  />
                  <span className="min-w-0 text-xs font-semibold text-white/80 sm:text-sm">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <button onClick={toggleFullscreen} className="ml-auto rounded-full bg-white/10 p-2 transition hover:bg-white/20">
                  <Maximize size={18} />
                </button>
              </div>
            </div>
          </>
        )}

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {isHost && (
            <span className="rounded-full border border-cyan-300/40 bg-cyan-500/20 px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100">
              Host
            </span>
          )}
          {!isHost && Object.keys(externalState).length > 0 && !isEmbed && (
            <span className="rounded-full border border-blue-300/40 bg-blue-500/20 px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-blue-100">
              Synced
            </span>
          )}
          {isEmbed && (
            <span className="rounded-full border border-amber-300/40 bg-amber-500/20 px-2 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-100">
              <span className="mr-1 inline-flex align-middle"><MonitorPlay size={12} /></span>
              Embed
            </span>
          )}
        </div>
      </div>

      {isEmbed && (
        <div className="flex flex-col gap-1 border-t border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/70 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <span>{source?.isDub ? 'Audio latino disponible' : 'Subtitulado en español'}</span>
          <span>{source?.quality || source?.server || 'Reproductor externo'}</span>
        </div>
      )}
    </div>
  );
};

export default AnimePlayer;
