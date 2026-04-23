'use client';

import React from 'react';

interface FacebookPlayerProps {
  mp4Url: string;
  poster?: string;
  isHost: boolean;
  videoRef?: React.MutableRefObject<HTMLVideoElement | null>;
  onPlay?: () => void;
  onPause?: () => void;
  onSeeked?: () => void;
}

/**
 * FacebookPlayer v2 — Reproductor HTML <video> nativo.
 *
 * El mp4Url viene del backend (/api/video/extract) que usa yt-dlp para sacar
 * la URL directa del stream desde Facebook / IG / TikTok / Twitter / Twitch /
 * Vimeo / Dailymotion / Reddit.
 *
 * Los espectadores (!isHost) tienen controles deshabilitados — solo pueden
 * ver lo que el host pone. La sincronización la maneja el contenedor.
 */
export const FacebookPlayer: React.FC<FacebookPlayerProps> = ({
  mp4Url,
  poster,
  isHost,
  videoRef,
  onPlay,
  onPause,
  onSeeked,
}) => {
  if (!mp4Url) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black/40 text-white/30">
        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Sin video</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-black overflow-hidden">
      <video
        ref={videoRef as React.RefObject<HTMLVideoElement>}
        src={mp4Url}
        poster={poster}
        controls={isHost}
        playsInline
        preload="metadata"
        onPlay={onPlay}
        onPause={onPause}
        onSeeked={onSeeked}
        className="w-full h-full object-contain bg-black"
        crossOrigin="anonymous"
      >
        Tu navegador no soporta el tag de video.
      </video>

      {/* Overlay para espectadores (bloquea interacción con el player nativo) */}
      {!isHost && (
        <div
          className="absolute inset-0 pointer-events-auto"
          style={{ background: 'transparent' }}
          aria-label="Modo espectador"
        />
      )}

      {/* Status pills */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-bold text-white/50 uppercase tracking-widest">
          {isHost ? 'Control Host' : 'Solo Lectura'}
        </div>
        <div className="flex items-center gap-2 text-[9px] font-bold text-emerald-400 bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-3 py-1.5">
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
          LIVE SYNC
        </div>
      </div>
    </div>
  );
};
