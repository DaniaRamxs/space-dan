/**
 * BeatSound.jsx
 * Juego de ritmo sincronizado - Guitar Hero social
 * Features: pre-beat indicator, hit zones, combo counter, fire streak, sync celebration
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Music, Trophy, Target, Volume2, VolumeX, Settings, 
    ChevronDown, Radio, Star, Zap, Activity, Crown 
} from 'lucide-react';
import * as Colyseus from 'colyseus.js';
import { useAuthContext } from '../../contexts/AuthContext';
import YouTubeSearchModal from '../Social/YouTubeSearchModal';
import GalacticSyncEffect from './GalacticSyncEffect';
import toast from 'react-hot-toast';

// Configuración de colores para jugadores
const PLAYER_COLORS = [
    '#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', 
    '#f38181', '#aa96da', '#fcbad3', '#a8e6cf'
];

// Sonidos de feedback (URLs de efectos simples)
const SOUNDS = {
    perfect: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
    great: 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3',
    good: 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3',
    miss: 'https://assets.mixkit.co/active_storage/sfx/2012/2012-preview.mp3',
    beat: 'https://assets.mixkit.co/active_storage/sfx/2008/2008-preview.mp3',
    galactic_sync: 'https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3',
};

// Colores de precisión
const ACCURACY_COLORS = {
    perfect: '#a855f7', // 🟣 Púrpura
    great: '#3b82f7',   // 🔵 Azul  
    good: '#eab308',    // 🟡 Amarillo
    miss: '#ef4444',    // 🔴 Rojo
};

export default function BeatSound({ roomName, onClose }) {
    const { user, profile } = useAuthContext();
    
    // Estado del juego
    const [client, setClient] = useState(null);
    const [room, setRoom] = useState(null);
    const [state, setState] = useState(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [youtubePlayer, setYoutubePlayer] = useState(null);
    const [youtubeReady, setYoutubeReady] = useState(false);
    const youtubePlayerRef = useRef(null);
    
    // Refs para funciones usadas en callbacks
    const showHitFeedbackRef = useRef();
    const playFeedbackSoundRef = useRef();
    const vibrateRef = useRef();
    const lastHitTime = useRef(0);
    const audioRefs = useRef({});
    const timeOffsetRef = useRef(0); // Offset de sincronización
    const [hitFeedbacks, setHitFeedbacks] = useState([]); // Feedback visual de hits
    
    // Vibración táctil
    const vibrate = useCallback(() => {
        if (navigator.vibrate && state?.config?.vibrationEnabled) {
            navigator.vibrate(50);
        }
    }, [state?.config?.vibrationEnabled]);
    
    // Mostrar feedback visual de precisión
    const showHitFeedback = useCallback((accuracy, points, combo) => {
        const id = Date.now();
        const feedback = {
            id,
            accuracy,
            points,
            combo,
            color: ACCURACY_COLORS[accuracy],
            x: 50 + (Math.random() * 20 - 10),
            y: 50 + (Math.random() * 20 - 10),
        };
        
        setHitFeedbacks(prev => [...prev, feedback]);
        
        setTimeout(() => {
            setHitFeedbacks(prev => prev.filter(f => f.id !== id));
        }, 1000);
    }, []);
    
    // Reproducir sonido de feedback
    const playFeedbackSound = useCallback((type) => {
        if (isMuted || !state?.config?.soundEffectsEnabled) return;
        
        const audio = audioRefs.current[type];
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
        }
    }, [isMuted, state?.config?.soundEffectsEnabled]);
    
    // Actualizar refs en useEffect para evitar error durante render
    useEffect(() => {
        vibrateRef.current = vibrate;
    }, [vibrate]);
    
    useEffect(() => {
        showHitFeedbackRef.current = showHitFeedback;
    }, [showHitFeedback]);
    
    useEffect(() => {
        playFeedbackSoundRef.current = playFeedbackSound;
    }, [playFeedbackSound]);
    
    // Conectar a Colyseus
    useEffect(() => {
        const colyseusClient = new Colyseus.Client(
            import.meta.env.VITE_COLYSEUS_URL || 'ws://localhost:2567'
        );
        setClient(colyseusClient);
        
        return () => {
            if (room) room.leave();
        };
    }, []);
    
    // Unirse a sala
    useEffect(() => {
        if (!client || !roomName || !user?.id) return;
        
        let r = null;
        
        const joinRoom = async () => {
            try {
                r = await client.joinOrCreate('beat_sound', {
                    roomName,
                    userId: user.id,
                    username: profile?.username || user.email?.split('@')[0] || 'Piloto',
                    avatar: profile?.avatar_url || user.avatar_url || '/default-avatar.png',
                });
                
                setRoom(r);
                
                r.onStateChange((newState) => {
                    setState(newState);
                });
                
                r.onMessage('init', (data) => {
                    // Calcular offset de tiempo
                    const now = Date.now();
                    const roundTrip = now - data.clientTime;
                    timeOffsetRef.current = data.serverTime - now + (roundTrip / 2);
                    console.log('[BeatSound] Time offset:', timeOffsetRef.current);
                });
                
                r.onMessage('hit_result', (resultData) => {
                    // Mostrar feedback visual de precisión
                    showHitFeedbackRef.current?.(resultData.accuracy, resultData.points, resultData.combo);
                    playFeedbackSoundRef.current?.(resultData.accuracy);
                    
                    if (resultData.accuracy === 'perfect' && !isMuted) {
                        vibrateRef.current?.();
                    }
                });
                
                r.onMessage('galactic_sync', () => {
                    // Efecto Galactic Sync
                    playFeedbackSoundRef.current?.('galactic_sync');
                    vibrateRef.current?.();
                });
                
                r.onMessage('game_start', (data) => {
                    console.log('[BeatSound] Game started:', data);
                    console.log('[BeatSound] YouTube player ready?', !!youtubePlayerRef.current);
                    // Iniciar reproducción de YouTube si hay trackId
                    if (data.trackId && youtubePlayerRef.current) {
                        console.log('[BeatSound] Loading video:', data.trackId);
                        try {
                            youtubePlayerRef.current.loadVideoById(data.trackId);
                            youtubePlayerRef.current.playVideo();
                            console.log('[BeatSound] Video playback started');
                            
                            // Obtener duración del video y enviarla al servidor
                            setTimeout(() => {
                                const duration = youtubePlayerRef.current.getDuration();
                                if (duration && duration > 0) {
                                    const durationMs = Math.floor(duration * 1000);
                                    console.log('[BeatSound] Video duration:', durationMs, 'ms');
                                    r.send('update_duration', { duration: durationMs });
                                }
                            }, 1000);
                        } catch (err) {
                            console.error('[BeatSound] Error playing video:', err);
                        }
                    } else {
                        console.warn('[BeatSound] Cannot play - trackId:', data.trackId, 'player:', !!youtubePlayerRef.current);
                    }
                });
                
                r.onMessage('game_end', (data) => {
                    console.log('[BeatSound] Game ended:', data);
                    // Pausar YouTube
                    if (youtubePlayerRef.current) {
                        youtubePlayerRef.current.pauseVideo();
                    }
                });
                
            } catch (e) {
                console.error('[BeatSound] Join error:', e);
                toast.error('Error conectando al juego. Por favor, inténtalo de nuevo.');
            }
        };
        
        joinRoom();
        
        return () => {
            if (r) r.leave();
        };
    }, [client, roomName, user?.id]);
    
    // Precargar sonidos
    useEffect(() => {
        Object.entries(SOUNDS).forEach(([key, url]) => {
            const audio = new Audio(url);
            audio.volume = 0.3;
            audioRefs.current[key] = audio;
        });
    }, []);
    
    // Manejar click en beat
    const handleHit = useCallback((e) => {
        if (!room || !state?.isPlaying) return;
        
        // Cooldown de 100ms entre hits
        const now = Date.now();
        if (now - lastHitTime.current < 100) return;
        lastHitTime.current = now;
        
        // Posición del click para efectos visuales
        const rect = e?.currentTarget?.getBoundingClientRect?.();
        const x = rect ? ((e.clientX - rect.left) / rect.width) : 0.5;
        const y = rect ? ((e.clientY - rect.top) / rect.height) : 0.5;
        
        // Enviar hit con tiempo ajustado por offset
        const clientTime = now + timeOffsetRef.current;
        room.send('hit', {
            clientTime,
            x,
            y,
        });
    }, [room, state?.isPlaying]);
    
    // Toggle ready
    const toggleReady = useCallback(() => {
        if (!room) return;
        room.send('ready');
    }, [room]);
    
    // Seleccionar canción
    const handleSelectTrack = useCallback((track) => {
        if (!room) return;
        room.send('set_track', {
            trackId: track.id,
            trackName: track.name,
            artist: track.artist,
        });
        setIsSearchOpen(false);
        toast.success(`🎵 ${track.name} seleccionada`);
    }, [room]);
    
    // Cambiar dificultad
    const setDifficulty = useCallback((diff) => {
        if (!room) return;
        room.send('set_difficulty', { difficulty: diff });
    }, [room]);
    
    // Calcular beats activos próximos
    const upcomingBeats = useMemo(() => {
        if (!state?.beats || !state?.currentTime) return [];
        
        return state.beats
            .filter(b => {
                const timeToBeat = b.time - state.currentTime;
                return timeToBeat > -500 && timeToBeat < 2000 && b.isActive;
            })
            .slice(0, 5);
    }, [state?.beats, state?.currentTime]);
    
    // Jugador local
    const localPlayer = useMemo(() => {
        if (!state?.players || !room) return null;
        return state.players.get(room.sessionId);
    }, [state?.players, room]);
    
    // Es líder
    const isLeader = useMemo(() => {
        return room?.sessionId === state?.leaderId;
    }, [room?.sessionId, state?.leaderId]);
    
    // Inicializar YouTube Player
    useEffect(() => {
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }

        window.onYouTubeIframeAPIReady = () => {
            console.log('[BeatSound] YouTube API Ready, initializing player...');
            const player = new window.YT.Player('youtube-player-beatsound', {
                height: '0',
                width: '0',
                playerVars: {
                    autoplay: 0,
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                    modestbranding: 1,
                },
                events: {
                    onReady: (event) => {
                        console.log('[BeatSound] YouTube player ready!');
                        youtubePlayerRef.current = event.target;
                        setYoutubePlayer(event.target);
                        setYoutubeReady(true);
                    },
                    onError: (event) => {
                        console.error('[BeatSound] YouTube player error:', event.data);
                    },
                    onStateChange: (event) => {
                        console.log('[BeatSound] YouTube state changed:', event.data);
                    },
                },
            });
        };

        if (window.YT && window.YT.Player) {
            window.onYouTubeIframeAPIReady();
        }
    }, []);
    
    if (!state) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
                <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="text-cyan-400"
                >
                    <Radio size={48} />
                </motion.div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[10005] bg-gradient-to-br from-indigo-950 via-purple-950 to-pink-950 overflow-hidden">
            {/* YouTube Player (oculto pero funcional) */}
            <div id="youtube-player-beatsound" style={{ position: 'absolute', top: -9999, left: -9999 }} />
            
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-cyan-500/30 to-purple-500/30 rounded-xl border border-cyan-500/30">
                        <Music size={24} className="text-cyan-400" />
                    </div>
                    <div>
                        <h2 className="text-white font-black text-lg tracking-wider">BEATSOUND</h2>
                        <p className="text-white/40 text-xs uppercase tracking-widest">
                            {state.currentTrackName || 'Selecciona una canción'}
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {/* Leaderboard compacto */}
                    <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
                        <Trophy size={16} className="text-amber-400" />
                        <span className="text-white/60 text-xs">
                            #{Array.from(state.players.values())
                                .sort((a, b) => b.score - a.score)
                                .findIndex(p => p.sessionId === room?.sessionId) + 1 || '-'}
                        </span>
                    </div>
                    
                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-3 bg-white/5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
                    >
                        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                    
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="p-3 bg-white/5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all"
                    >
                        <Settings size={20} />
                    </button>
                </div>
            </div>
            
            {/* Área de juego principal */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                {/* Visualizador de ondas */}
                <WaveVisualizer 
                    isPlaying={state.isPlaying}
                    beats={upcomingBeats}
                    currentTime={state.currentTime}
                    players={state.players}
                    localSessionId={room?.sessionId}
                />
                
                {/* Hit zones */}
                <HitZone
                    onHit={handleHit}
                    isActive={state.isPlaying}
                    recentHits={state.recentHits}
                    localSessionId={room?.sessionId}
                />
                
                {/* Pre-beat indicator */}
                {state.isPlaying && upcomingBeats[0] && (
                    <PreBeatIndicator 
                        beat={upcomingBeats[0]} 
                        currentTime={state.currentTime}
                        config={state.config}
                    />
                )}
                
                {/* Galactic Sync Effect */}
                <GalacticSyncEffect 
                    active={state.galacticSync?.active}
                    intensity={state.galacticSync?.intensity}
                    effectType={state.galacticSync?.effectType}
                />
                
                {/* Hit Feedback Overlay */}
                <HitFeedbackOverlay hitFeedbacks={hitFeedbacks} />
            </div>
            
            {/* Panel lateral - Leaderboard (solo desktop) */}
            <div className="hidden lg:block">
                <LeaderboardPanel 
                    players={state.players}
                    leaderId={state.leaderId}
                    localSessionId={room?.sessionId}
                />
            </div>
            
            {/* Panel inferior - Stats del jugador */}
            {localPlayer && (
                <PlayerStats 
                    player={localPlayer}
                    onReady={toggleReady}
                    isPlaying={state.isPlaying}
                    gamePhase={state.gamePhase}
                    youtubeReady={youtubeReady}
                />
            )}
            
            {/* Controles de juego */}
            <GameControls
                isLeader={isLeader}
                gamePhase={state.gamePhase}
                countdown={state.countdown}
                isPlaying={state.isPlaying}
                onSelectTrack={() => setIsSearchOpen(true)}
                onStart={toggleReady}
                currentTrack={state.currentTrackName}
            />
            
            {/* Settings Panel */}
            <AnimatePresence>
                {showSettings && (
                    <SettingsPanel
                        config={state.config}
                        onSetDifficulty={setDifficulty}
                        onClose={() => setShowSettings(false)}
                    />
                )}
            </AnimatePresence>
            
            {/* Modal de búsqueda */}
            <YouTubeSearchModal
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                onSelect={handleSelectTrack}
            />
        </div>
    );
}

// Componente: Visualizador de ondas
function WaveVisualizer({ isPlaying, beats, currentTime, players }) {
    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Ondas de fondo */}
            <div className="relative w-[400px] h-[400px]">
                {isPlaying && beats.map((beat, i) => {
                    const timeToBeat = beat.time - currentTime;
                    const progress = 1 - (timeToBeat / 2000);
                    const scale = Math.max(0.2, progress * 1.2);
                    const opacity = Math.max(0, 1 - progress);
                    
                    return (
                        <motion.div
                            key={`${beat.time}-${i}`}
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                            style={{
                                width: `${scale * 180}px`,
                                height: `${scale * 180}px`,
                                opacity,
                                borderColor: beat.type === 'special' ? '#fbbf24' : 
                                            beat.type === 'double' ? '#a78bfa' : '#22d3ee',
                                boxShadow: `0 0 ${scale * 30}px ${beat.type === 'special' ? 'rgba(251, 191, 36, 0.5)' : 'rgba(34, 211, 238, 0.3)'}`,
                            }}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale, opacity }}
                        />
                    );
                })}
                
                {/* Ondas de jugadores que acertaron */}
                {Array.from(players.values()).map((player) => (
                    <motion.div
                        key={player.sessionId}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                        style={{
                            width: '80px',
                            height: '80px',
                            background: `radial-gradient(circle, ${player.color}40 0%, transparent 70%)`,
                        }}
                        animate={{
                            scale: player.combo > 0 ? [1, 1.2, 1] : 1,
                            opacity: player.combo > 0 ? 1 : 0.3,
                        }}
                        transition={{ duration: 0.3 }}
                    />
                ))}
            </div>
        </div>
    );
}

// Componente: Zona de golpeo
function HitZone({ onHit, isActive, recentHits, localSessionId }) {
    const [ripples, setRipples] = useState([]);
    
    const handleClick = (e) => {
        if (!isActive) return;
        
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        
        // Agregar ripple
        const id = Date.now();
        setRipples(prev => [...prev, { id, x, y, color: '#22d3ee' }]);
        setTimeout(() => {
            setRipples(prev => prev.filter(r => r.id !== id));
        }, 600);
        
        onHit();
    };
    
    // Mostrar hits de otros jugadores
    useEffect(() => {
        if (!recentHits) return;
        
        recentHits.forEach(hit => {
            if (hit.playerId !== localSessionId) {
                const id = `remote-${hit.time}`;
                setRipples(prev => {
                    if (prev.some(r => r.id === id)) return prev;
                    return [...prev, { 
                        id, 
                        x: hit.x * 100, 
                        y: hit.y * 100, 
                        color: hit.type === 'perfect' ? '#fbbf24' : '#a78bfa',
                        isRemote: true 
                    }];
                });
                setTimeout(() => {
                    setRipples(prev => prev.filter(r => r.id !== id));
                }, 600);
            }
        });
    }, [recentHits, localSessionId]);
    
    return (
        <div 
            className={`relative w-full max-w-2xl h-[50vh] mx-4 rounded-3xl transition-all ${
                isActive 
                    ? 'bg-gradient-to-b from-cyan-500/10 to-purple-500/10 border-2 border-cyan-500/30 cursor-pointer' 
                    : 'bg-white/5 border border-white/10'
            }`}
            onClick={handleClick}
        >
            {/* Centro - Target */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <motion.div 
                    className={`w-20 h-20 rounded-full flex items-center justify-center ${
                        isActive ? 'bg-gradient-to-br from-cyan-400 to-purple-500' : 'bg-white/10'
                    }`}
                    animate={isActive ? {
                        scale: [1, 1.1, 1],
                        boxShadow: [
                            '0 0 20px rgba(34, 211, 238, 0.5)',
                            '0 0 40px rgba(34, 211, 238, 0.8)',
                            '0 0 20px rgba(34, 211, 238, 0.5)',
                        ]
                    } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                >
                    <Target size={32} className="text-white" />
                </motion.div>
            </div>
            
            {/* Ripples */}
            <AnimatePresence>
                {ripples.map(ripple => (
                    <motion.div
                        key={ripple.id}
                        className="absolute rounded-full pointer-events-none"
                        style={{
                            left: `${ripple.x}%`,
                            top: `${ripple.y}%`,
                            background: `radial-gradient(circle, ${ripple.color}40 0%, transparent 70%)`,
                        }}
                        initial={{ width: 20, height: 20, x: '-50%', y: '-50%', opacity: 1 }}
                        animate={{ width: 200, height: 200, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6 }}
                    />
                ))}
            </AnimatePresence>
            
            {/* Texto de instrucción */}
            {isActive && (
                <motion.p 
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 text-sm font-medium tracking-widest uppercase"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    Toca el ritmo
                </motion.p>
            )}
        </div>
    );
}

// Componente: Indicador de beat próximo
function PreBeatIndicator({ beat, currentTime, config }) {
    const timeToBeat = beat.time - currentTime;
    const progress = Math.max(0, Math.min(1, 1 - (timeToBeat / config.preBeatWarning)));
    
    return (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            {/* Barra de carga */}
            <div className="w-48 h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                    className="h-full rounded-full"
                    style={{
                        background: beat.type === 'special' 
                            ? 'linear-gradient(90deg, #fbbf24, #f59e0b)' 
                            : 'linear-gradient(90deg, #22d3ee, #a78bfa)'
                    }}
                    initial={{ width: '0%' }}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 0.05, ease: 'linear' }}
                />
            </div>
            
            {/* Icono de tipo */}
            <motion.div
                animate={{ scale: progress > 0.8 ? [1, 1.3, 1] : 1 }}
                transition={{ repeat: progress > 0.8 ? Infinity : 0, duration: 0.2 }}
            >
                {beat.type === 'special' ? (
                    <Star size={24} className="text-amber-400" />
                ) : beat.type === 'double' ? (
                    <Zap size={24} className="text-purple-400" />
                ) : (
                    <Activity size={24} className="text-cyan-400" />
                )}
            </motion.div>
        </div>
    );
}

// Componente: Celebración de sync
function SyncCelebration({ active, intensity }) {
    if (!active) return null;
    
    return (
        <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-400 to-purple-400"
                animate={{
                    scale: [1, 1.5, 1],
                    rotate: [0, 5, -5, 0],
                }}
                transition={{ duration: 0.5, repeat: Infinity }}
            >
                SYNC x{intensity}!
            </motion.div>
            
            {/* Partículas */}
            {[...Array(20)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-3 h-3 rounded-full"
                    style={{
                        background: ['#fbbf24', '#f472b6', '#a78bfa', '#22d3ee'][i % 4],
                    }}
                    initial={{ 
                        x: 0, 
                        y: 0, 
                        scale: 0 
                    }}
                    animate={{ 
                        x: (Math.random() - 0.5) * 400, 
                        y: (Math.random() - 0.5) * 400, 
                        scale: [0, 1, 0] 
                    }}
                    transition={{ duration: 1, delay: i * 0.05 }}
                />
            ))}
        </motion.div>
    );
}

// Componente: Leaderboard lateral
function LeaderboardPanel({ players, leaderId, localSessionId }) {
    const sortedPlayers = useMemo(() => {
        return Array.from(players.values())
            .sort((a, b) => b.score - a.score);
    }, [players]);
    
    return (
        <div className="absolute right-4 top-24 bottom-32 w-64 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/10 p-4 overflow-y-auto hidden lg:block">
            <h3 className="text-white/60 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <Trophy size={14} className="text-amber-400" />
                Leaderboard
            </h3>
            
            <div className="space-y-3">
                {sortedPlayers.map((player, i) => (
                    <motion.div
                        key={player.sessionId}
                        layout
                        className={`p-3 rounded-xl border ${
                            player.sessionId === leaderId 
                                ? 'bg-amber-500/10 border-amber-500/30' 
                                : 'bg-white/5 border-white/10'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-lg font-black w-6 text-center" style={{ color: player.color }}>
                                #{i + 1}
                            </span>
                            
                            <div className="flex-1">
                                <div className="flex items-center gap-1">
                                    <span className="text-white font-bold text-sm">
                                        {player.username}
                                    </span>
                                    {player.sessionId === localSessionId && (
                                        <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">
                                            Tú
                                        </span>
                                    )}
                                    {player.sessionId === leaderId && (
                                        <Crown size={12} className="text-amber-400" />
                                    )}
                                </div>
                                
                                <div className="flex items-center gap-3 mt-1 text-xs">
                                    <span className="text-white/60">{player.score.toLocaleString()}</span>
                                    {player.combo > 0 && (
                                        <span className="text-amber-400 font-bold">
                                            x{player.combo}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* Fire streak bar */}
                        {player.streak > 0 && (
                            <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                                <motion.div 
                                    className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, player.streak * 10)}%` }}
                                />
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

// Componente: Stats del jugador
function PlayerStats({ player, onReady, isPlaying, gamePhase, youtubeReady }) {
    return (
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-24 md:pb-6 bg-gradient-to-t from-black/80 to-transparent">
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Info del jugador */}
                <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
                    <div 
                        className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-2xl font-black"
                        style={{ background: `${player.color}30`, color: player.color }}
                    >
                        {player.username[0].toUpperCase()}
                    </div>
                    
                    <div className="flex-1">
                        <h3 className="text-white font-bold text-base md:text-lg">{player.username}</h3>
                        <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm">
                            <span className="text-white/40">Score: <span className="text-white font-bold">{player.score.toLocaleString()}</span></span>
                            {player.combo > 0 && (
                                <motion.span 
                                    className="text-amber-400 font-black"
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ repeat: Infinity, duration: 0.5 }}
                                >
                                    🔥 x{player.combo}
                                </motion.span>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Precisión y stats */}
                <div className="hidden md:flex items-center gap-6 text-sm">
                    <div className="text-center">
                        <div className="text-emerald-400 font-black text-2xl">{player.perfectHits}</div>
                        <div className="text-white/40 text-xs uppercase">Perfect</div>
                    </div>
                    <div className="text-center">
                        <div className="text-cyan-400 font-black text-2xl">{player.goodHits}</div>
                        <div className="text-white/40 text-xs uppercase">Good</div>
                    </div>
                    <div className="text-center">
                        <div className="text-rose-400 font-black text-2xl">{player.missHits}</div>
                        <div className="text-white/40 text-xs uppercase">Miss</div>
                    </div>
                </div>
                
                {/* Botón Ready / Status */}
                {!isPlaying && gamePhase === 0 && (
                    <motion.button
                        onClick={onReady}
                        disabled={player.isReady || !youtubeReady}
                        className={`w-full md:w-auto px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm transition-all ${
                            player.isReady
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : !youtubeReady
                                ? 'bg-white/10 text-white/40 border border-white/10 cursor-not-allowed'
                                : 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:shadow-lg hover:shadow-cyan-500/30'
                        }`}
                        whileHover={!player.isReady && youtubeReady ? { scale: 1.05 } : {}}
                        whileTap={!player.isReady && youtubeReady ? { scale: 0.95 } : {}}
                    >
                        {player.isReady ? '✓ Listo' : !youtubeReady ? 'Cargando...' : 'Estoy Listo'}
                    </motion.button>
                )}
            </div>
        </div>
    );
}

// Componente: Controles de juego
function GameControls({ isLeader, gamePhase, countdown, isPlaying, onSelectTrack, currentTrack }) {
    return (
        <div className="absolute top-24 left-4 flex flex-col gap-3">
            {/* Seleccionar canción */}
            {isLeader && !isPlaying && gamePhase === 0 && (
                <motion.button
                    onClick={onSelectTrack}
                    className="px-4 py-3 bg-white/10 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-all flex items-center gap-2 text-sm font-medium"
                    whileHover={{ x: 5 }}
                >
                    <Music size={18} />
                    {currentTrack || 'Seleccionar canción'}
                </motion.button>
            )}
            
            {/* Countdown */}
            {gamePhase === 1 && (
                <motion.div
                    className="px-6 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl text-white"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                >
                    <div className="text-4xl font-black text-center">{countdown}</div>
                    <div className="text-xs uppercase tracking-widest text-center opacity-80">Preparados</div>
                </motion.div>
            )}
            
            {/* Playing indicator */}
            {isPlaying && (
                <div className="px-4 py-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-emerald-400">
                    <motion.div
                        className="w-2 h-2 rounded-full bg-emerald-400"
                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                    />
                    <span className="text-sm font-medium">En juego</span>
                </div>
            )}
        </div>
    );
}

// Componente: Panel de settings
function SettingsPanel({ config, onSetDifficulty, onClose }) {
    const difficulties = [
        { id: 'easy', label: 'Fácil', desc: 'Beats espaciados', color: 'from-emerald-500 to-teal-500' },
        { id: 'normal', label: 'Normal', desc: 'Ritmo estándar', color: 'from-cyan-500 to-blue-500' },
        { id: 'pro', label: 'Pro', desc: 'Beats rápidos', color: 'from-purple-500 to-pink-500' },
        { id: 'silent', label: 'Sin Sonido', desc: 'Solo vibración', color: 'from-gray-500 to-slate-500' },
    ];
    
    return (
        <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="w-full max-w-md p-6 bg-gradient-to-br from-indigo-900/90 to-purple-900/90 rounded-3xl border border-white/20"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                onClick={e => e.stopPropagation()}
            >
                <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-2">
                    <Settings size={24} className="text-cyan-400" />
                    Configuración
                </h2>
                
                <div className="space-y-3">
                    {difficulties.map(diff => (
                        <motion.button
                            key={diff.id}
                            onClick={() => onSetDifficulty(diff.id)}
                            className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4 ${
                                config.difficulty === diff.id
                                    ? `bg-gradient-to-r ${diff.color} border-transparent text-white`
                                    : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                            }`}
                            whileHover={{ x: 5 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <div className="flex-1">
                                <div className="font-bold">{diff.label}</div>
                                <div className="text-xs opacity-70">{diff.desc}</div>
                            </div>
                            {config.difficulty === diff.id && (
                                <Target size={20} className="text-white" />
                            )}
                        </motion.button>
                    ))}
                </div>
                
                <button
                    onClick={onClose}
                    className="mt-6 w-full py-3 bg-white/10 rounded-xl text-white/80 hover:bg-white/20 transition-all"
                >
                    Cerrar
                </button>
            </motion.div>
        </motion.div>
    );
}

// Componente: Overlay de feedback de precisión
function HitFeedbackOverlay({ hitFeedbacks }) {
    return (
        <div className="absolute inset-0 pointer-events-none z-40">
            <AnimatePresence>
                {hitFeedbacks.map((feedback) => (
                    <motion.div
                        key={feedback.id}
                        className="absolute font-black text-2xl"
                        style={{
                            left: `${feedback.x}%`,
                            top: `${feedback.y}%`,
                            color: feedback.color,
                            textShadow: '0 0 20px currentColor',
                        }}
                        initial={{ scale: 0.5, opacity: 0, y: 0 }}
                        animate={{ scale: 1.5, opacity: 1, y: -30 }}
                        exit={{ scale: 0.5, opacity: 0, y: -60 }}
                        transition={{ duration: 0.5 }}
                    >
                        {feedback.accuracy === 'perfect' && 'PERFECT!'}
                        {feedback.accuracy === 'great' && 'GREAT!'}
                        {feedback.accuracy === 'good' && 'GOOD'}
                        {feedback.accuracy === 'miss' && 'MISS'}
                        {feedback.combo > 1 && (
                            <span className="ml-2 text-amber-400">x{feedback.combo}</span>
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
