'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FacebookPlayer } from './FacebookPlayer';
import {
  Sparkles, Play, Monitor, X, Search, ExternalLink,
  Pause, AlertTriangle, Loader2,
} from 'lucide-react';

// URL del backend — inyectada por Vite (NEXT_PUBLIC_API_URL en .env.local).
// process.env se reemplaza en build time (ver vite.config.ts).
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const API_URL: string =
  (typeof process !== 'undefined' && process?.env?.NEXT_PUBLIC_API_URL) ||
  'https://spacely-server-production.up.railway.app';

interface VideoMeta {
  mp4_url: string;
  title?: string;
  duration?: number;
  thumbnail?: string | null;
  provider?: string;
  originalUrl: string;
}

interface FacebookSharingProps {
  roomName?: string;
  isHost: boolean;
  onClose: () => void;
  initialPayload?: { url?: string; meta?: VideoMeta };
  onPayloadChange: (payload: any) => void;
  activityChannelRef?: React.MutableRefObject<any>;
}

/**
 * FacebookSharingContainer — "FB Cinema" v2
 *
 * Funcionamiento:
 *  1. Host pega link de Facebook / IG / TikTok / Twitter / Twitch / Vimeo / etc.
 *  2. Frontend llama a /api/video/extract?url=...
 *  3. Backend usa yt-dlp para resolver la URL directa del .mp4
 *  4. <video> HTML nativo reproduce ese mp4
 *  5. Todos los usuarios en la sala reciben el mismo mp4_url (via activityChannelRef
 *     si existe, o via onPayloadChange)
 *  6. Sincronización de play/pause/seek vía broadcast por el canal.
 *
 * Fallback si yt-dlp falla (video DRM/privado):
 *  - Mensaje claro del porqué
 *  - Botón "Abrir en Facebook" (o proveedor original) en ventana del sistema
 */
export const FacebookSharingContainer: React.FC<FacebookSharingProps> = ({
  isHost,
  initialPayload,
  onPayloadChange,
  onClose,
  activityChannelRef,
}) => {
  const [url, setUrl] = useState(initialPayload?.url || '');
  const [video, setVideo] = useState<VideoMeta | null>(initialPayload?.meta || null);
  const [loading, setLoading] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<{ playing: boolean; time: number }>({
    playing: false, time: 0,
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ignoreNextEventRef = useRef(false); // evita loops cuando recibimos broadcast

  // ── Recibir cambios desde el host (broadcast) ───────────────────────────────
  useEffect(() => {
    if (!activityChannelRef?.current) return;
    const ch = activityChannelRef.current;

    const onFbVideo = ({ payload }: any) => {
      if (!payload) return;
      if (payload.meta && payload.meta.mp4_url !== video?.mp4_url) {
        setVideo(payload.meta);
        setUrl(payload.meta.originalUrl || '');
        setExtractError(null);
      }
    };

    const onFbSync = ({ payload }: any) => {
      if (!payload || !videoRef.current) return;
      ignoreNextEventRef.current = true;
      try {
        if (typeof payload.time === 'number') {
          // Solo corregimos si hay desviación > 1.5s (evita parpadeo)
          if (Math.abs(videoRef.current.currentTime - payload.time) > 1.5) {
            videoRef.current.currentTime = payload.time;
          }
        }
        if (payload.playing && videoRef.current.paused) {
          videoRef.current.play().catch(() => {});
        } else if (!payload.playing && !videoRef.current.paused) {
          videoRef.current.pause();
        }
      } catch {}
      setTimeout(() => { ignoreNextEventRef.current = false; }, 200);
    };

    try {
      ch.on?.('broadcast', { event: 'fb_video' }, onFbVideo);
      ch.on?.('broadcast', { event: 'fb_sync' }, onFbSync);
    } catch {}
    // Supabase client no expone unsubscribe individual fácil; al desmontar,
    // el canal entero se limpia por el launcher.
  }, [activityChannelRef, video?.mp4_url]);

  // ── Actualizar video si llegó payload inicial de otro participante ──────────
  useEffect(() => {
    if (initialPayload?.meta && initialPayload.meta.mp4_url !== video?.mp4_url) {
      setVideo(initialPayload.meta);
      setUrl(initialPayload.meta.originalUrl || '');
    }
  }, [initialPayload]);

  // ── Broadcast helpers ───────────────────────────────────────────────────────
  const broadcast = useCallback((event: string, payload: any) => {
    try {
      activityChannelRef?.current?.send?.({ type: 'broadcast', event, payload });
    } catch {}
  }, [activityChannelRef]);

  // ── Extracción: host pega URL y pide mp4_url al backend ─────────────────────
  const handleLoad = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!url || !isHost) return;
    setLoading(true);
    setExtractError(null);
    try {
      const res = await fetch(
        `${API_URL}/api/video/extract?url=${encodeURIComponent(url)}`,
        { headers: { Accept: 'application/json' } }
      );
      const data = await res.json();
      if (!data.ok) {
        setExtractError(
          data.detail
            ? `${data.error}: ${data.detail}`
            : data.error || 'No se pudo extraer el video'
        );
        setLoading(false);
        return;
      }
      const meta: VideoMeta = {
        mp4_url: data.mp4_url,
        title: data.title || 'Video',
        duration: data.duration || 0,
        thumbnail: data.thumbnail || null,
        provider: data.provider || 'unknown',
        originalUrl: url,
      };
      setVideo(meta);
      // Enviar a resto de participantes
      onPayloadChange({ url, meta });
      broadcast('fb_video', { meta });
    } catch (err: any) {
      console.error('[FBCinema] extract error:', err);
      setExtractError('Error de red. Verifica tu conexión y vuelve a intentar.');
    } finally {
      setLoading(false);
    }
  };

  // ── Handlers del <video> (solo host envía broadcasts) ───────────────────────
  const emitSync = useCallback(() => {
    if (!isHost || ignoreNextEventRef.current) return;
    if (!videoRef.current) return;
    broadcast('fb_sync', {
      playing: !videoRef.current.paused,
      time: videoRef.current.currentTime,
    });
  }, [isHost, broadcast]);

  const handleStop = () => {
    setVideo(null);
    setUrl('');
    setExtractError(null);
    onPayloadChange({});
    broadcast('fb_video', { meta: null });
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center p-4 md:p-10 relative overflow-x-hidden select-none">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-600/5 blur-[160px] rounded-full animate-pulse" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-600/5 blur-[140px] rounded-full animate-pulse-slow" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 w-full max-w-5xl flex flex-col items-center"
      >
        {/* Top controls */}
        <div className="w-full flex items-center justify-between mb-8">
          <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Cine Sincronizado</span>
          </div>
          <button
            onClick={onClose}
            className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-white/40 hover:text-white hover:bg-red-500/10 hover:border-red-500/20 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Title */}
        <div className="w-full mb-10 text-center">
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter">
            SOCIAL <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-emerald-400 to-emerald-500">CINEMA</span>
          </h1>
          <p className="text-white/30 text-sm md:text-base font-medium max-w-lg mx-auto">
            {isHost
              ? 'Pega un link de Facebook, Instagram, TikTok, Twitter, Twitch, Vimeo o Reddit.'
              : 'Modo espectador activo. El host está eligiendo qué ver.'}
          </p>
        </div>

        {/* URL input (host) */}
        {isHost && (
          <form onSubmit={handleLoad} className="w-full max-w-2xl mx-auto mb-8 relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-emerald-500/20 rounded-3xl blur opacity-75 group-hover:opacity-100 transition duration-1000" />
            <div className="relative flex items-center">
              <div className="absolute left-5 text-white/20">
                <Search size={20} />
              </div>
              <input
                type="url"
                placeholder="https://www.facebook.com/share/v/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                className="w-full h-16 bg-black/60 border-2 border-white/5 rounded-2xl pl-14 pr-36 text-white placeholder:text-white/10 focus:outline-none focus:border-blue-500/30 transition-all text-base backdrop-blur-3xl shadow-2xl"
              />
              <button
                type="submit"
                disabled={loading || !url}
                className="absolute right-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold rounded-xl hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="white" />}
                {loading ? 'Cargando...' : 'Cargar'}
              </button>
            </div>
          </form>
        )}

        {/* Error de extracción */}
        {extractError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl mx-auto mb-8 p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-amber-400 text-sm font-bold mb-1">No pudimos cargar ese video</p>
                <p className="text-white/50 text-xs leading-relaxed">{extractError}</p>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300"
                  >
                    <ExternalLink size={12} /> Abrir en el navegador
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Player */}
        <div className="w-full mb-10">
          <AnimatePresence mode="wait">
            {video ? (
              <motion.div
                key="player"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="space-y-6"
              >
                <div className="relative group">
                  <div className="relative w-full aspect-video md:h-[65vh] backdrop-blur-3xl bg-black/80 border border-white/10 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                    <FacebookPlayer
                      mp4Url={video.mp4_url}
                      poster={video.thumbnail || undefined}
                      isHost={isHost}
                      videoRef={videoRef}
                      onPlay={emitSync}
                      onPause={emitSync}
                      onSeeked={emitSync}
                    />
                  </div>
                </div>

                {/* Info bar */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4 bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] backdrop-blur-xl">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                      <Monitor size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base md:text-lg font-bold text-white tracking-tight leading-tight truncate">
                        {video.title || 'Video'}
                      </h2>
                      <p className="text-emerald-400/60 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 mt-1">
                        <Sparkles size={10} /> {video.provider || 'Live Sync'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <a
                      href={video.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-11 px-4 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-500 hover:text-white transition-all inline-flex items-center gap-2"
                    >
                      <ExternalLink size={14} /> Original
                    </a>
                    {isHost && (
                      <button
                        onClick={handleStop}
                        className="h-11 px-5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition-all"
                      >
                        Detener
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-16 md:py-24 flex flex-col items-center text-center"
              >
                <div className="w-28 h-28 mb-6 relative">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute inset-0 bg-blue-500/10 rounded-full blur-3xl"
                  />
                  <div className="relative w-full h-full rounded-[2rem] bg-white/[0.03] border border-white/10 flex items-center justify-center backdrop-blur-3xl">
                    <Monitor size={40} className="text-white/20" strokeWidth={1} />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Proyector en Espera</h3>
                <p className="text-white/30 text-sm max-w-xs mx-auto">
                  {isHost
                    ? 'Pega un link arriba para empezar a proyectar.'
                    : 'Espera a que el host cargue un video.'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <style>{`
        .animate-pulse-slow {
          animation: pulse-slow 12s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
};

export default FacebookSharingContainer;
