'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Music, Play, Pause, SkipForward, Youtube, Volume2, 
  Flame, Heart, Search, X, ListMusic, Sparkles, 
  TrendingUp, Radio, RefreshCw, AudioLines
} from 'lucide-react';
import { JukeboxTrack, JukeboxState } from '../types';
import { useEconomy } from '../../../contexts/EconomyContext';
import { useAuthContext } from '../../../contexts/AuthContext';
import YouTubeSearchModal from '../../../components/Social/YouTubeSearchModal';
import toast from 'react-hot-toast';

interface JukeboxDJProps {
  roomName: string;
  isHost: boolean;
  onClose: () => void;
  initialPayload?: string; // Colyseus stores it as string
  onPayloadChange: (payload: any) => void;
}

export const JukeboxDJContainer: React.FC<JukeboxDJProps> = ({
  isHost,
  initialPayload,
  onPayloadChange,
  onClose
}) => {
  const { profile } = useAuthContext();
  const { balance, deductCoins } = useEconomy();
  
  // -- Sync State Parsing --
  const syncState: JukeboxState = useMemo(() => {
    try {
      return initialPayload ? JSON.parse(initialPayload) : {
        queue: [],
        currentTrack: null,
        isPlaying: false,
        progress: 0,
        currentTime: 0,
        lastUpdatedAt: Date.now()
      };
    } catch {
      return { queue: [], currentTrack: null, isPlaying: false, progress: 0, currentTime: 0, lastUpdatedAt: Date.now() };
    }
  }, [initialPayload]);

  const [localVolume, setLocalVolume] = useState(50);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const playerRef = useRef<any>(null);
  const [isSDKReady, setIsSDKReady] = useState(false);

  // -- YouTube SDK Loading --
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScript = document.getElementsByTagName('script')[0];
      firstScript.parentNode?.insertBefore(tag, firstScript);
      
      window.onYouTubeIframeAPIReady = () => setIsSDKReady(true);
    } else {
      setIsSDKReady(true);
    }
  }, []);

  // -- Player Sync Logic --
  useEffect(() => {
    if (isSDKReady && syncState.currentTrack) {
        if (!playerRef.current) {
            playerRef.current = new window.YT.Player('jukebox-v2-player', {
                height: '0',
                width: '0',
                videoId: syncState.currentTrack.id,
                playerVars: { autoplay: syncState.isPlaying ? 1 : 0, controls: 0 },
                events: {
                    onReady: () => {
                        playerRef.current.setVolume(localVolume);
                        if (syncState.isPlaying) playerRef.current.playVideo();
                    },
                    onStateChange: (e: any) => {
                        if (e.data === 0 && isHost) { // Ended
                            handlePlayNext();
                        }
                    }
                }
            });
        } else {
            const currentId = playerRef.current.getVideoData?.()?.video_id;
            if (currentId !== syncState.currentTrack.id) {
                playerRef.current.loadVideoById(syncState.currentTrack.id);
            }
            
            if (syncState.isPlaying) playerRef.current.playVideo();
            else playerRef.current.pauseVideo();
            
            // Time sync check (drift > 3s)
            const playerTime = playerRef.current.getCurrentTime?.() || 0;
            if (Math.abs(playerTime - syncState.currentTime) > 3) {
                playerRef.current.seekTo(syncState.currentTime, true);
            }
        }
    }
  }, [isSDKReady, syncState.currentTrack?.id, syncState.isPlaying]);

  // -- Host Tick (Sync frequency) --
  useEffect(() => {
    if (!isHost || !syncState.isPlaying || !playerRef.current) return;
    
    const interval = setInterval(() => {
        const currentTime = playerRef.current.getCurrentTime?.() || 0;
        const duration = playerRef.current.getDuration?.() || 1;
        onPayloadChange({
            ...syncState,
            currentTime,
            progress: (currentTime / duration) * 100,
            lastUpdatedAt: Date.now()
        });
    }, 4000);

    return () => clearInterval(interval);
  }, [isHost, syncState.isPlaying, syncState.currentTrack]);

  // -- Actions --
  const handleAddToQueue = (track: any) => {
    const newTrack: JukeboxTrack = {
        id: track.id,
        name: track.name,
        artist: track.artist,
        cover: track.cover,
        addedBy: profile?.username || 'Anon',
        addedById: profile?.id || '', // Explicitly store ID for tipping
        boostPower: 0,
        source: 'youtube'
    };

    if (!syncState.currentTrack) {
        onPayloadChange({
            ...syncState,
            currentTrack: newTrack,
            isPlaying: true,
            progress: 0,
            currentTime: 0
        });
    } else {
        onPayloadChange({
            ...syncState,
            queue: [...syncState.queue, newTrack]
        });
    }
    toast.success('Pista añadida a la cola estelar');
  };

  const handleTipDJ = async (amount: number) => {
    const djId = syncState.currentTrack?.addedById;
    const djName = syncState.currentTrack?.addedBy;
    
    if (!djId || !profile?.id) return;
    
    if (djId === profile.id) {
        toast.error('¿Dándote propina a ti mismo? El universo no funciona así.');
        return;
    }

    if ((balance || 0) < amount) {
        toast.error('No tienes suficientes Starlys');
        return;
    }

    const result = await transfer(djId, amount, `Propina DJ: ${syncState.currentTrack?.name}`);
    if (result?.success) {
        toast.success(`✨ ¡Has enviado ◈ ${amount} a ${djName}!`, {
            icon: '🚀',
            duration: 4000
        });
    } else {
        toast.error('Error al transferir propina');
    }
  };

  const handlePlayNext = () => {
    if (!isHost) return;
    const [next, ...rest] = syncState.queue;
    onPayloadChange({
        ...syncState,
        currentTrack: next || null,
        isPlaying: !!next,
        queue: rest,
        progress: 0,
        currentTime: 0
    });
  };

  const handleBoost = async (trackId: string) => {
    const BOOST_COST = 50;
    if ((balance || 0) < BOOST_COST) {
        toast.error('Necesitas Starlys para dar Boost');
        return;
    }

    const { success } = await deductCoins(BOOST_COST, 'casino_bet', 'Stellar Boost');
    if (!success) return;

    const newQueue = syncState.queue.map(t => 
        t.id === trackId ? { ...t, boostPower: t.boostPower + BOOST_COST } : t
    ).sort((a, b) => b.boostPower - a.boostPower);

    onPayloadChange({ ...syncState, queue: newQueue });
    toast.success('¡Inyección de Starlys completada! La canción sube de rango.');
  };

  return (
    <div className="w-full flex flex-col items-center p-4 md:p-8 relative">
       {/* Hidden Player */}
       <div id="jukebox-v2-player" className="fixed -left-[1000px] pointer-events-none" />

       {/* Main Player Card */}
       <motion.div 
         initial={{ opacity: 0, scale: 0.95 }}
         animate={{ opacity: 1, scale: 1 }}
         className="w-full max-w-4xl backdrop-blur-3xl bg-black/40 border border-white/10 rounded-[3rem] p-6 md:p-10 shadow-2xl relative overflow-hidden"
       >
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row gap-10">
            {/* Vinyl & Visualizer Section */}
            <div className="flex-1 flex flex-col items-center">
                <div className="relative w-64 h-64 md:w-80 md:h-80 mb-8">
                    <motion.div 
                      animate={{ rotate: syncState.isPlaying ? 360 : 0 }}
                      transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                      className="w-full h-full rounded-full bg-[#050510] border-[10px] border-black shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden ring-2 ring-white/5"
                    >
                        <div className="absolute inset-0 bg-[repeating-radial-gradient(circle_at_center,transparent_0,transparent_2px,rgba(255,255,255,0.03)_2px,rgba(255,255,255,0.03)_3px)]" />
                        {syncState.currentTrack?.cover && (
                            <img 
                              src={syncState.currentTrack.cover} 
                              className="absolute inset-6 rounded-full w-[calc(100%-48px)] h-[calc(100%-48px)] object-cover opacity-60 grayscale blur-[0.5px]"
                              alt="Track cover"
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-purple-500/10 to-transparent" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-purple-600 border-4 border-black" />
                    </motion.div>
                </div>

                <div className="w-full text-center space-y-2 mb-4">
                    <h2 className="text-2xl md:text-3xl font-black text-white line-clamp-1">
                        {syncState.currentTrack?.name || 'Sintonía de Espera'}
                    </h2>
                    <div className="flex flex-col items-center gap-1">
                        <p className="text-purple-400 font-bold uppercase tracking-widest text-[10px]">
                            {syncState.currentTrack?.artist || 'Spacely Radio'}
                        </p>
                        {syncState.currentTrack && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-white/[0.03] border border-white/5 rounded-full">
                                <span className="text-[9px] text-white/30 uppercase font-black tracking-tighter">DJ:</span>
                                <span className="text-[10px] text-white/60 font-bold">{syncState.currentTrack.addedBy}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tipping Section */}
                {syncState.currentTrack && syncState.currentTrack.addedById !== profile?.id && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center gap-3 mb-8"
                    >
                        <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Enviar Propina Estelar</p>
                        <div className="flex items-center gap-2">
                            {[10, 50, 100].map(amt => (
                                <button
                                    key={amt}
                                    onClick={() => handleTipDJ(amt)}
                                    className="px-4 py-2 rounded-xl bg-gradient-to-b from-white/[0.08] to-transparent border border-white/10 text-white font-black text-[10px] hover:border-purple-500/50 hover:bg-purple-500/10 transition-all active:scale-95 flex items-center gap-1.5"
                                >
                                    <Sparkles size={10} className="text-purple-400" />
                                    ◈ {amt}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Controls */}
                <div className="flex items-center gap-8 mb-6">
                    {isHost && (
                        <button onClick={() => onPayloadChange({...syncState, isPlaying: !syncState.isPlaying})} className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl">
                            {syncState.isPlaying ? <Pause fill="black" /> : <Play fill="black" className="ml-1" />}
                        </button>
                    )}
                    {isHost && (
                        <button onClick={handlePlayNext} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 text-white flex items-center justify-center hover:bg-white/10 transition-all">
                            <SkipForward size={20} />
                        </button>
                    )}
                </div>

                <div className="w-full space-y-4">
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div animate={{ width: `${syncState.progress}%` }} className="h-full bg-gradient-to-r from-purple-600 to-pink-500" />
                    </div>
                </div>
            </div>

            {/* Queue & Search Section */}
            <div className="w-full lg:w-80 flex flex-col bg-white/[0.03] border border-white/5 rounded-[2rem] p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-black text-white/40 tracking-widest uppercase">Próximos Temas</h3>
                    <button 
                      onClick={() => setIsSearchOpen(true)}
                      className="p-2 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-600/30 hover:bg-purple-600 hover:text-white transition-all shadow-lg"
                    >
                        <Search size={16} />
                    </button>
                </div>

                <div className="flex-1 space-y-4 max-h-[300px] overflow-y-auto no-scrollbar pr-2">
                    {syncState.queue.length > 0 ? syncState.queue.map(track => (
                        <div key={track.id} className="group relative flex items-center gap-4 bg-white/[0.02] border border-white/5 p-3 rounded-2xl hover:bg-white/[0.05] transition-all">
                            <img src={track.cover} className="w-12 h-12 rounded-xl object-cover" alt="" />
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-bold text-xs truncate">{track.name}</p>
                                <p className="text-white/30 text-[10px] truncate">{track.artist}</p>
                            </div>
                            <button 
                                onClick={() => handleBoost(track.id)}
                                className="flex flex-col items-center gap-0.5 text-orange-400 opacity-40 group-hover:opacity-100 transition-all hover:scale-110"
                            >
                                <Flame size={16} fill={track.boostPower > 0 ? 'currentColor' : 'none'} />
                                <span className="text-[8px] font-black">{track.boostPower || ''}</span>
                            </button>
                        </div>
                    )) : (
                        <div className="h-40 flex flex-col items-center justify-center text-white/10 italic text-xs">
                            <ListMusic size={32} className="mb-2 opacity-5" />
                            Cola estelar vacía
                        </div>
                    )}
                </div>
                
                <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-purple-400">
                            <TrendingUp size={14} />
                         </div>
                         <div className="text-[10px]">
                            <p className="text-white/40 font-bold uppercase">Balance</p>
                            <p className="text-white font-black">◈ {balance || 0}</p>
                         </div>
                    </div>
                </div>
            </div>
          </div>
       </motion.div>

       <YouTubeSearchModal 
            isOpen={isSearchOpen} 
            onClose={() => setIsSearchOpen(false)} 
            onSelect={handleAddToQueue} 
       />
    </div>
  );
};

export default JukeboxDJContainer;
