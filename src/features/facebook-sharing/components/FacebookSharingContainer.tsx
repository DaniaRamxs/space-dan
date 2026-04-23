'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FacebookVideo } from '../types';
import { FacebookPlayer } from './FacebookPlayer';
import { VideoFeed } from './VideoFeed';
import { Sparkles, Play, Monitor, Users, X, Search, Clapperboard } from 'lucide-react';

interface FacebookSharingProps {
  roomName: string;
  isHost: boolean;
  onClose: () => void;
  initialPayload?: { url?: string; type?: 'video' | 'reel' };
  onPayloadChange: (payload: any) => void;
}

export const FacebookSharingContainer: React.FC<FacebookSharingProps> = ({
  isHost,
  initialPayload,
  onPayloadChange,
  onClose
}) => {
  const [url, setUrl] = useState(initialPayload?.url || '');
  const [currentVideo, setCurrentVideo] = useState<FacebookVideo | null>(
    initialPayload?.url ? {
      id: 'sync-video',
      url: initialPayload.url,
      title: 'Contenido en Directo',
      type: initialPayload.type || 'video'
    } : null
  );

  useEffect(() => {
    if (initialPayload?.url && initialPayload.url !== currentVideo?.url) {
      setCurrentVideo({
        id: 'sync-video',
        url: initialPayload.url,
        title: 'Contenido en Directo',
        type: initialPayload.type || 'video'
      });
      setUrl(initialPayload.url);
    } else if (!initialPayload?.url) {
        setCurrentVideo(null);
    }
  }, [initialPayload]);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!url || !isHost) return;
    
    const isReel = url.includes('/reels/') || url.includes('reel');
    const payload = { url, type: isReel ? 'reel' : 'video' };
    
    onPayloadChange(payload);
    setCurrentVideo({
      id: Math.random().toString(36).substr(2, 9),
      url: url,
      title: 'Cargando Cinema...',
      type: isReel ? 'reel' : 'video'
    });
  };

  const handleSelectFromFeed = (video: FacebookVideo) => {
    if (!isHost) return;
    onPayloadChange({ url: video.url, type: video.type });
    setCurrentVideo(video);
    setUrl(video.url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center p-4 md:p-10 relative overflow-x-hidden select-none">
      
      {/* Ambient Light Effect */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-600/5 blur-[160px] rounded-full animate-pulse" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-600/5 blur-[140px] rounded-full animate-pulse-slow" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 w-full max-w-5xl flex flex-col items-center"
      >
        {/* Top Floating Controls */}
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

        {/* Banner/Input Section */}
        <div className="w-full mb-12 relative">
             <div className="text-center mb-10">
                <motion.h1 
                    initial={{ letterSpacing: '0.1em', opacity: 0 }}
                    animate={{ letterSpacing: '-0.02em', opacity: 1 }}
                    className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter"
                >
                    FACEBOOK <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-emerald-400 to-emerald-500">CINEMA</span>
                </motion.h1>
                <p className="text-white/30 text-sm md:text-base font-medium max-w-lg mx-auto">
                    {isHost ? "Estás al mando. Comparte la experiencia pegando un link de video." : "Modo espectador activo. El host está eligiendo qué ver."}
                </p>
             </div>

             {isHost && (
                <motion.form 
                    onSubmit={handleSearch}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="relative group max-w-2xl mx-auto"
                >
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-emerald-500/20 rounded-3xl blur opacity-75 group-hover:opacity-100 transition duration-1000"></div>
                    <div className="relative flex items-center">
                        <div className="absolute left-5 text-white/20">
                            <Search size={20} />
                        </div>
                        <input
                            type="text"
                            placeholder="Pega un link de Reel o Video..."
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="w-full h-16 bg-black/60 border-2 border-white/5 rounded-2xl pl-14 pr-32 text-white placeholder:text-white/10 focus:outline-none focus:border-blue-500/30 transition-all text-lg backdrop-blur-3xl shadow-2xl"
                        />
                        <button 
                            type="submit"
                            className="absolute right-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold rounded-xl hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all active:scale-95 flex items-center gap-2"
                        >
                            <Play size={16} fill="white" />
                            Cargar
                        </button>
                    </div>
                </motion.form>
             )}
        </div>

        {/* Main Screening Area */}
        <div className="w-full mb-20">
            <AnimatePresence mode="wait">
                {currentVideo ? (
                    <motion.div 
                        key="player"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        className="space-y-6"
                    >
                        <div className="relative group">
                            <div className="absolute -inset-8 bg-blue-500/5 rounded-[4rem] blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                            <div className="relative w-full aspect-video md:h-[65vh] backdrop-blur-3xl bg-black/40 border border-white/10 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] ring-1 ring-white/5">
                                <FacebookPlayer url={currentVideo.url} type={currentVideo.type} />
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4 bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] backdrop-blur-xl">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                                    <Clapperboard size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white tracking-tight leading-none mb-1">{currentVideo.title}</h2>
                                    <p className="text-emerald-400/60 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                        <Sparkles size={10} /> Sintonía Galáctica Activa
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex -space-x-2 mr-4">
                                    {[1,2,3].map(i => (
                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0a0a0c] bg-white/10 overflow-hidden">
                                             <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20" />
                                        </div>
                                    ))}
                                    <div className="w-8 h-8 rounded-full border-2 border-[#0a0a0c] bg-white/5 flex items-center justify-center text-[10px] text-white/50">
                                        +5
                                    </div>
                                </div>
                                {isHost && (
                                    <button 
                                        onClick={() => { setCurrentVideo(null); setUrl(''); onPayloadChange({}); }}
                                        className="h-12 px-6 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition-all shadow-lg"
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
                        className="py-32 flex flex-col items-center text-center"
                    >
                         <div className="w-32 h-32 mb-8 relative">
                            <motion.div 
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 4, repeat: Infinity }}
                                className="absolute inset-0 bg-blue-500/10 rounded-full blur-3xl"
                            />
                            <div className="relative w-full h-full rounded-[2.5rem] bg-white/[0.03] border border-white/10 flex items-center justify-center backdrop-blur-3xl">
                                <Monitor size={48} className="text-white/20" strokeWidth={1} />
                            </div>
                         </div>
                         <h3 className="text-2xl font-bold text-white mb-2">Proyector en Espera</h3>
                         <p className="text-white/30 text-sm max-w-xs mx-auto mb-10">
                            {isHost ? "Explora el feed inferior para proyectar un video al resto del equipo." : "Espera a que el host inicie una actividad de cine."}
                         </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* Recommendations Section */}
        <div className="w-full flex flex-col mt-4">
             <div className="w-full flex items-center justify-between mb-8 px-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Discovery Estelar</h3>
                        <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">Lo mejor de Facebook</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.02] border border-white/5 text-white/40 text-[10px] font-black tracking-widest">
                    <Users size={12} /> {isHost ? "EL HOST DECIDE" : "SOLO LECTURA"}
                </div>
             </div>

             <div className={isHost ? "opacity-100" : "opacity-30 pointer-events-none grayscale-[50%]"}>
                <VideoFeed onSelect={handleSelectFromFeed} />
             </div>
             
             {!isHost && (
                <div className="mt-8 p-4 rounded-xl border border-blue-500/10 bg-blue-500/5 text-center">
                    <p className="text-[10px] text-blue-400/60 font-black uppercase tracking-[0.2em]">
                        Pide al host que cambie de canal si quieres ver algo nuevo
                    </p>
                </div>
             )}
        </div>
      </motion.div>

      <style jsx global>{`
        .animate-pulse-slow {
          animation: pulse 12s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
};

export default FacebookSharingContainer;
