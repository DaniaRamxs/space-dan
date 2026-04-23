'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FacebookPlayer } from './FacebookPlayer';
import {
  Sparkles, Play, Monitor, X, Search, ExternalLink,
  AlertTriangle, Loader2, Maximize2, Minimize2, Send, MessageCircle,
} from 'lucide-react';

// URL del backend — inyectada por Vite
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

interface ChatMsg {
  id: string;
  user: string;
  text: string;
  at: number;
}

interface FacebookSharingProps {
  roomName?: string;
  isHost: boolean;
  onClose: () => void;
  initialPayload?: { url?: string; meta?: VideoMeta };
  onPayloadChange: (payload: any) => void;
  activityChannelRef?: React.MutableRefObject<any>;
}

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadChat, setUnreadChat] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerWrapperRef = useRef<HTMLDivElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const ignoreNextEventRef = useRef(false);

  // ── Username del usuario actual (mejor: del AuthContext, pero fallback) ─────
  // El container recibe isHost pero no el username. Leemos del localStorage / random.
  const myUsername = useRef<string>(
    (typeof window !== 'undefined' &&
      (localStorage.getItem('spacely_username') ||
        'Viajero-' + Math.random().toString(36).slice(2, 6))) as string
  ).current;

  // ── Broadcast helper ────────────────────────────────────────────────────────
  const broadcast = useCallback(
    (event: string, payload: any) => {
      try {
        activityChannelRef?.current?.send?.({ type: 'broadcast', event, payload });
      } catch {}
    },
    [activityChannelRef]
  );

  // ── Listeners de canal (fb_video, fb_sync, fb_chat) ─────────────────────────
  useEffect(() => {
    const ch = activityChannelRef?.current;
    if (!ch) return;

    const onFbVideo = ({ payload }: any) => {
      if (!payload) return;
      if (payload.meta && payload.meta.mp4_url !== video?.mp4_url) {
        setVideo(payload.meta);
        setUrl(payload.meta.originalUrl || '');
        setExtractError(null);
      } else if (payload.meta === null) {
        setVideo(null);
        setUrl('');
      }
    };

    const onFbSync = ({ payload }: any) => {
      if (!payload || !videoRef.current) return;
      ignoreNextEventRef.current = true;
      try {
        if (typeof payload.time === 'number') {
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
      setTimeout(() => {
        ignoreNextEventRef.current = false;
      }, 200);
    };

    const onFbChat = ({ payload }: any) => {
      if (!payload?.msg) return;
      setChatMsgs((prev) => [...prev.slice(-199), payload.msg]);
      if (!chatOpen) setUnreadChat((x) => x + 1);
    };

    try {
      ch.on?.('broadcast', { event: 'fb_video' }, onFbVideo);
      ch.on?.('broadcast', { event: 'fb_sync' }, onFbSync);
      ch.on?.('broadcast', { event: 'fb_chat' }, onFbChat);
    } catch {}
  }, [activityChannelRef, video?.mp4_url, chatOpen]);

  // ── Auto-scroll chat al final cuando llega mensaje ──────────────────────────
  useEffect(() => {
    if (chatOpen && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMsgs, chatOpen]);

  // ── Reset unread al abrir ────────────────────────────────────────────────
  useEffect(() => {
    if (chatOpen) setUnreadChat(0);
  }, [chatOpen]);

  // ── initialPayload sync ─────────────────────────────────────────────────
  useEffect(() => {
    if (initialPayload?.meta && initialPayload.meta.mp4_url !== video?.mp4_url) {
      setVideo(initialPayload.meta);
      setUrl(initialPayload.meta.originalUrl || '');
    }
  }, [initialPayload]);

  // ── Host: extraer video y broadcast ─────────────────────────────────────
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
      onPayloadChange({ url, meta });
      broadcast('fb_video', { meta });
    } catch (err: any) {
      console.error('[FBCinema] extract error:', err);
      setExtractError('Error de red. Verifica tu conexión y vuelve a intentar.');
    } finally {
      setLoading(false);
    }
  };

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

  // ── Fullscreen ──────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(async () => {
    const el = playerWrapperRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      // iOS/WebView a veces no implementa fullscreen API en elementos no-video.
      // Fallback: fullscreen del propio <video>.
      try {
        if (videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
          (videoRef.current as any).webkitEnterFullscreen();
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // ── Chat ────────────────────────────────────────────────────────────────
  const sendChat = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    const msg: ChatMsg = {
      id: 'm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      user: myUsername,
      text,
      at: Date.now(),
    };
    setChatMsgs((prev) => [...prev.slice(-199), msg]);
    broadcast('fb_chat', { msg });
    setChatInput('');
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
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
              Cine Sincronizado
            </span>
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
            SOCIAL{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-emerald-400 to-emerald-500">
              CINEMA
            </span>
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

        {/* Error */}
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

        {/* Player + Chat lateral */}
        <div className="w-full mb-10">
          <AnimatePresence mode="wait">
            {video ? (
              <motion.div
                key="player"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="flex flex-col lg:flex-row gap-4"
              >
                {/* Player column */}
                <div className="flex-1 min-w-0 space-y-4">
                  <div
                    ref={playerWrapperRef}
                    className="relative group bg-black rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.5)]"
                    style={{
                      // En fullscreen ocupa toda la pantalla
                      ...(isFullscreen
                        ? { width: '100vw', height: '100vh', borderRadius: 0 }
                        : {}),
                    }}
                  >
                    <div className={isFullscreen ? 'w-full h-full' : 'w-full aspect-video md:h-[60vh]'}>
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

                    {/* Botón fullscreen flotante (top-right del player) */}
                    <button
                      onClick={toggleFullscreen}
                      className="absolute top-4 right-4 z-20 h-11 w-11 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white/70 hover:text-white hover:bg-black/80 flex items-center justify-center transition-all"
                      aria-label={isFullscreen ? 'Salir pantalla completa' : 'Pantalla completa'}
                    >
                      {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                    </button>
                  </div>

                  {/* Info bar */}
                  {!isFullscreen && (
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 bg-white/[0.02] border border-white/5 p-4 rounded-[1.5rem] backdrop-blur-xl">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                          <Monitor size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h2 className="text-sm md:text-base font-bold text-white tracking-tight leading-tight truncate">
                            {video.title || 'Video'}
                          </h2>
                          <p className="text-emerald-400/60 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                            <Sparkles size={10} /> {video.provider || 'Live Sync'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={toggleFullscreen}
                          className="h-10 px-4 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-500 hover:text-white transition-all inline-flex items-center gap-2"
                        >
                          <Maximize2 size={14} /> Pantalla completa
                        </button>
                        <a
                          href={video.originalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-10 px-4 bg-white/5 border border-white/10 text-white/60 rounded-lg text-xs font-bold hover:bg-white/10 hover:text-white transition-all inline-flex items-center gap-2"
                        >
                          <ExternalLink size={14} /> Original
                        </a>
                        {isHost && (
                          <button
                            onClick={handleStop}
                            className="h-10 px-5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition-all"
                          >
                            Detener
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat column (hidden en fullscreen) */}
                {!isFullscreen && (
                  <div className="w-full lg:w-80 flex flex-col">
                    <div className="flex-1 flex flex-col bg-white/[0.02] border border-white/5 rounded-[1.5rem] backdrop-blur-xl overflow-hidden min-h-[360px] max-h-[60vh]">
                      {/* Header */}
                      <button
                        onClick={() => setChatOpen((x) => !x)}
                        className="flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/[0.03] transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <MessageCircle size={16} className="text-blue-400" />
                          <span className="text-[11px] font-black uppercase tracking-widest text-white/70">
                            Chat
                          </span>
                          {unreadChat > 0 && !chatOpen && (
                            <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-500 text-white text-[9px] font-black">
                              {unreadChat}
                            </span>
                          )}
                        </div>
                        <span className="text-white/30 text-lg leading-none">
                          {chatOpen ? '▾' : '▸'}
                        </span>
                      </button>

                      {/* Messages */}
                      {chatOpen && (
                        <>
                          <div
                            ref={chatScrollRef}
                            className="flex-1 overflow-y-auto p-3 space-y-2"
                            style={{ scrollbarWidth: 'thin', scrollbarColor: '#ffffff20 transparent' }}
                          >
                            {chatMsgs.length === 0 ? (
                              <p className="text-white/20 text-[10px] uppercase tracking-widest text-center py-6">
                                Sé el primero en comentar 🎬
                              </p>
                            ) : (
                              chatMsgs.map((m) => (
                                <div
                                  key={m.id}
                                  className={`flex flex-col ${m.user === myUsername ? 'items-end' : 'items-start'}`}
                                >
                                  <span className="text-[8px] font-black uppercase tracking-widest text-white/30 px-1">
                                    {m.user}
                                  </span>
                                  <div
                                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-snug ${
                                      m.user === myUsername
                                        ? 'bg-blue-500/20 border border-blue-500/30 text-blue-100 rounded-br-sm'
                                        : 'bg-white/5 border border-white/10 text-white/80 rounded-bl-sm'
                                    }`}
                                  >
                                    {m.text}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Input */}
                          <form
                            onSubmit={sendChat}
                            className="flex items-center gap-2 p-2 border-t border-white/5"
                          >
                            <input
                              type="text"
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              maxLength={300}
                              placeholder="Mensaje..."
                              className="flex-1 h-9 bg-white/[0.03] border border-white/10 rounded-lg px-3 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/40"
                            />
                            <button
                              type="submit"
                              disabled={!chatInput.trim()}
                              className="h-9 w-9 rounded-lg bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                            >
                              <Send size={14} />
                            </button>
                          </form>
                        </>
                      )}
                    </div>
                  </div>
                )}
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
