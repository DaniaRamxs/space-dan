import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LiveKitRoom,
    useParticipants,
    useLocalParticipant,
    RoomAudioRenderer,
    useChat,
    VideoTrack,
    useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Mic, MicOff, LogOut, Users, Radio, X, ChevronDown, ChevronUp, MessageSquare, Send, Gamepad2, Music, Flame, Volume2, VolumeX, Monitor, MonitorOff, Maximize2, Minimize2, Tv, Tv2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { getNicknameClass } from '../../utils/user';
import { getFrameStyle } from '../../utils/styles';
import { Capacitor, registerPlugin } from '@capacitor/core';
import JukeboxDJ from '../VoiceActivities/JukeboxDJ';
import VoiceActivityTracker from './VoiceActivityTracker';
import VoiceActivityLauncher from '../VoiceActivities/VoiceActivityLauncher';
import EnergyReactor from '../VoiceActivities/EnergyReactor';
import VoiceFXMenu from './VoiceFXMenu';
import toast from 'react-hot-toast';

const VoiceServicePlugin = registerPlugin('VoiceService');

const LIVEKIT_URL = "wss://danspace-76f5bceh.livekit.cloud";

const createSafeAudio = (path) => {
    // We don't initialize src here to avoid immediate 404 in console if files are missing.
    // The current implementation uses playSyntheticSound as primary or fallback.
    const audio = new Audio();
    // Only set src if we actually want to TRY to use the file.
    // Since we are seeing 404s, it's safer to not even try until files exist.
    // audio.src = path; 
    return audio;
};

const joinSound = createSafeAudio('/sounds/room_join.mp3');
const leaveSound = createSafeAudio('/sounds/room_leave.mp3');
const micOnSound = createSafeAudio('/sounds/mic_on.mp3');

joinSound.volume = 0.3;
leaveSound.volume = 0.3;
micOnSound.volume = 0.15;

// Fallback syntethic space sounds if files don't exist
const playSyntheticSound = (type) => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const mainGain = ctx.createGain();
        mainGain.connect(ctx.destination);

        if (type === 'join') {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);

            mainGain.gain.setValueAtTime(0, ctx.currentTime);
            mainGain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
            mainGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

            osc.connect(mainGain);
            osc.start();
            osc.stop(ctx.currentTime + 0.8);
        } else if (type === 'leave') {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.2);

            mainGain.gain.setValueAtTime(0.15, ctx.currentTime);
            mainGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

            osc.connect(mainGain);
            osc.start();
            osc.stop(ctx.currentTime + 0.6);
        } else if (type === 'mic') {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.05);

            mainGain.gain.setValueAtTime(0, ctx.currentTime);
            mainGain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.02);
            mainGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);

            osc.connect(mainGain);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        }
    } catch (e) { }
};

export default function VoiceRoomUI({
    roomName, isOpen, onMinimize, onExpand, onLeave,
    userName, userAvatar, nicknameStyle, frameId, activityLevel,
    onConnected
}) {
    const [token, setToken] = useState(null);
    const [connecting, setConnecting] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('participants'); // participants, chat
    const [activeActivity, setActiveActivity] = useState(null);
    const [jukeboxEverStarted, setJukeboxEverStarted] = useState(false);
    const [isFullView, setIsFullView] = useState(false);
    const [isTheaterMode, setIsTheaterMode] = useState(false);
    const roomRef = useRef(roomName);

    useEffect(() => {
        if (activeActivity === 'dj') setJukeboxEverStarted(true);
    }, [activeActivity]);

    useEffect(() => {
        if (roomRef.current !== roomName) {
            setToken(null);
            setConnecting(true);
            setError(null);
            setActiveTab('participants');
            roomRef.current = roomName;
        }
    }, [roomName]);

    useEffect(() => {
        if (token || (!isOpen && !token)) return;
        const fetchToken = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const participantName = userName || session?.user?.user_metadata?.username || 'Anónimo';
                const { data, error: fnError } = await supabase.functions.invoke('livekit-token', {
                    body: { roomName, participantName, userAvatar, nicknameStyle, frameId, activityLevel }
                });
                if (fnError) throw new Error(fnError.message);
                if (data?.error) throw new Error(data.error);
                setToken(data.token);
            } catch (err) {
                console.error("Error obteniendo token:", err);
                setError(err.message);
            } finally {
                setConnecting(false);
            }
        };
        fetchToken();
    }, [roomName, token, isOpen]);

    useEffect(() => {
        const handleOpenActivity = (e) => {
            if (e.detail) setActiveActivity(e.detail);
        };
        window.addEventListener('voice:open_activity', handleOpenActivity);
        return () => window.removeEventListener('voice:open_activity', handleOpenActivity);
    }, []);

    // ⚠️ Este hook DEBE ir antes del early return para respetar las Rules of Hooks
    useEffect(() => {
        if (!token) return;
        if (Capacitor.isNativePlatform()) {
            VoiceServicePlugin.start().catch(() => { });
        }
        window.dispatchEvent(new CustomEvent('voice:connect'));
        return () => {
            if (Capacitor.isNativePlatform()) {
                VoiceServicePlugin.stop().catch(() => { });
            }
            window.dispatchEvent(new CustomEvent('voice:disconnect'));
        };
    }, [token]);

    // Estado de carga / error: solo muestra portal si isOpen
    if (!token && (connecting || error)) {
        if (!isOpen) return null;
        return createPortal(
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onMinimize} />
                {error ? (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-sm p-8 text-center bg-[#0a0505] border border-rose-500/20 rounded-[2.5rem] shadow-2xl">
                        <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-6"><X size={32} className="text-rose-500" /></div>
                        <p className="text-rose-400 font-black uppercase tracking-widest text-xs mb-6">Error de Sincronización</p>
                        <p className="text-white/40 text-[10px] leading-relaxed mb-8">{error}</p>
                        <button onClick={onLeave} className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Regresar al Espacio</button>
                    </motion.div>
                ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative w-full max-w-xs p-12 text-center bg-[#050510]/80 backdrop-blur-xl border border-white/5 rounded-[3rem] shadow-2xl">
                        <div className="relative w-20 h-20 mx-auto mb-8">
                            <div className="absolute inset-0 border-2 border-cyan-500/20 rounded-full" />
                            <div className="absolute inset-0 border-2 border-cyan-500 rounded-full border-t-transparent animate-spin" />
                            <Radio className="absolute inset-0 m-auto text-cyan-400 animate-pulse" size={32} />
                        </div>
                        <p className="text-[10px] uppercase font-black tracking-[0.3em] text-cyan-400 animate-pulse">Sintonizando Canal de Voz...</p>
                    </motion.div>
                )}
            </div>, document.body
        );
    }

    return (
        <LiveKitRoom
            audio={true}
            video={false}
            token={token}
            serverUrl={LIVEKIT_URL}
            onConnected={() => { if (onConnected) onConnected(); }}
            className="voice-room-container"
            style={{ display: 'contents' }}
        >
            <RoomAudioRenderer />
            <VoiceActivityTracker />

            <VoiceRoomInner
                roomName={roomName}
                isOpen={isOpen}
                onMinimize={onMinimize}
                onExpand={onExpand}
                onLeave={onLeave}
                activeActivity={activeActivity}
                setActiveActivity={setActiveActivity}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isFullView={isFullView}
                setIsFullView={setIsFullView}
                isTheaterMode={isTheaterMode}
                setIsTheaterMode={setIsTheaterMode}
                jukeboxEverStarted={jukeboxEverStarted}
            />
        </LiveKitRoom>
    );
}

function VoiceRoomInner({
    roomName, isOpen, onMinimize, onExpand, onLeave,
    activeActivity, setActiveActivity, activeTab, setActiveTab,
    isFullView, setIsFullView, isTheaterMode, setIsTheaterMode,
    jukeboxEverStarted
}) {
    const screenTracks = useTracks([Track.Source.ScreenShare]);

    return (
        <>
            {/* Mini-barra flotante cuando el panel está minimizado */}
            {!isOpen && <MinimizedBar roomName={roomName} onExpand={onExpand} border onLeave={onLeave} />}

            {createPortal(
                <>
                    {/* JukeboxDJ fuera del bloque isOpen para que la música no se corte al minimizar el panel */}
                    {jukeboxEverStarted && (
                        <JukeboxDJ
                            roomName={roomName}
                            onClose={() => setActiveActivity(null)}
                            isMinimized={activeActivity !== 'dj' || !isOpen}
                            isPanelOpen={isOpen}
                        />
                    )}

                    {/* Panel completo: AnimatePresence DENTRO del portal para que funcione correctamente */}
                    <AnimatePresence>
                        {isOpen && (
                            <div key="voice-panel-root" className="fixed inset-0 z-[10000] flex items-center justify-center p-4 overflow-hidden">
                                <motion.div
                                    key="voice-backdrop"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-black/90 backdrop-blur-md"
                                    onClick={onMinimize}
                                />
                                <motion.div
                                    key="voice-modal"
                                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                    animate={{
                                        opacity: activeActivity === 'dj' ? 0 : 1,
                                        y: activeActivity === 'dj' ? 30 : 0,
                                        scale: activeActivity === 'dj' ? 0.95 : 1,
                                        pointerEvents: activeActivity === 'dj' ? 'none' : 'auto'
                                    }}
                                    exit={{ opacity: 0, y: 30, scale: 0.95 }}
                                    className={`relative bg-[#050518] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col transition-all duration-500 ${isFullView ? 'w-full h-[100dvh] max-w-none max-h-none rounded-none' : 'w-full max-w-md rounded-[3rem] max-h-[90vh]'}`}
                                    onClick={e => e.stopPropagation()}
                                >
                                    <header className={`flex flex-col p-6 sm:p-8 border-b border-white/5 bg-white/[0.02] transition-all duration-500 ${isTheaterMode && isFullView ? 'opacity-0 -translate-y-full absolute pointer-events-none' : 'relative opacity-100'}`}>
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                                                    <Radio size={24} className="text-cyan-400" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-widest leading-tight">{roomName}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em]">En Directo</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        const next = !isFullView;
                                                        setIsFullView(next);
                                                        if (!next) setIsTheaterMode(false); // Reset theater when closing full
                                                        try {
                                                            if (next) {
                                                                if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
                                                            } else {
                                                                if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
                                                            }
                                                        } catch (err) { }
                                                    }}
                                                    title={isFullView ? "Vista reducida" : "Pantalla Completa"}
                                                    className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 active:scale-95 transition-all flex items-center justify-center"
                                                >
                                                    {isFullView ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                                                </button>
                                                <button
                                                    onClick={onMinimize}
                                                    title="Minimizar"
                                                    className="w-10 h-10 rounded-xl bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center"
                                                >
                                                    <ChevronDown size={20} />
                                                </button>
                                                <button
                                                    onClick={onLeave}
                                                    title="Salir de la sala"
                                                    className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 active:scale-95 transition-all flex items-center justify-center"
                                                >
                                                    <LogOut size={20} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 p-1 bg-black/20 rounded-2xl">
                                            <button
                                                onClick={() => setActiveTab('participants')}
                                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'participants' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-white/30 hover:bg-white/5'}`}
                                            >
                                                <Users size={14} /> Tripulación
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('chat')}
                                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'chat' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-white/30 hover:bg-white/5'}`}
                                            >
                                                <MessageSquare size={14} /> Chat Temporal
                                            </button>
                                        </div>
                                    </header>
                                    <div className={`flex-1 overflow-y-auto no-scrollbar relative min-h-[300px] transition-all duration-500 ${isTheaterMode && isFullView ? 'p-0 h-full' : 'p-6 sm:p-8'}`}>
                                        {/* REACTOR DE ENERGÍA COLECTIVA */}
                                        <div className={`${isTheaterMode && isFullView ? 'hidden' : 'block'}`}>
                                            <EnergyReactor roomName={roomName} />
                                        </div>

                                        {/* PANEL DE PANTALLA COMPARTIDA (NUEVO) */}
                                        <ScreenSharePanel isTheater={isTheaterMode && isFullView && !activeActivity} onToggleTheater={() => setIsTheaterMode(!isTheaterMode)} />

                                        {/* El JukeboxDJ persistente se renderiza a nivel del root del portal para evitar cortes de audio. */}

                                        {(!isTheaterMode || !isFullView) ? (
                                            <>
                                                {activeActivity && activeActivity !== 'dj' ? (
                                                    <VoiceActivityLauncher
                                                        roomName={roomName}
                                                        activeActivity={activeActivity}
                                                        setActiveActivity={setActiveActivity}
                                                        isTheater={false}
                                                        isFullView={isFullView}
                                                        onToggleTheater={() => {
                                                            setIsTheaterMode(true);
                                                            if (!isFullView) setIsFullView(true);
                                                        }}
                                                    />
                                                ) : !activeActivity ? (
                                                    <>
                                                        {activeTab === 'participants' ? <ParticipantsList /> : <ChatPanel />}
                                                        <div className="mt-8 relative z-10 bottom-0 left-0 w-full">
                                                            <VoiceActivityLauncher roomName={roomName} activeActivity={activeActivity} setActiveActivity={setActiveActivity} />
                                                        </div>
                                                    </>
                                                ) : (
                                                    /* Si es 'dj', el Jukebox se encarga de mostrarse en modo completo sobre este espacio */
                                                    <div className="h-full flex flex-col items-center justify-center opacity-20 pointer-events-none">
                                                        <Music size={40} className="mb-4" />
                                                        <p className="text-[10px] font-black uppercase tracking-widest">Actividad activa: Jukebox DJ</p>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                {activeActivity && activeActivity !== 'dj' && (
                                                    <VoiceActivityLauncher
                                                        roomName={roomName}
                                                        activeActivity={activeActivity}
                                                        setActiveActivity={setActiveActivity}
                                                        isTheater={true}
                                                        isFullView={isFullView}
                                                        onToggleTheater={() => setIsTheaterMode(false)}
                                                    />
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <footer className={`p-6 sm:p-8 bg-black/40 border-t border-white/5 flex items-center justify-center gap-6 transition-all duration-500 ${isTheaterMode && isFullView ? 'bg-transparent border-none' : 'relative'}`}>
                                        <div className={`${isTheaterMode && isFullView ? 'fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex gap-4 backdrop-blur-md bg-black/20 p-4 rounded-full border border-white/10' : 'flex items-center gap-6'}`}>
                                            <VoiceFXMenu />
                                            <div className="flex items-center gap-4">
                                                <MuteToggle />
                                                <ScreenShareToggle />
                                                {/* Botón de Modo Cine: Ahora visible siempre que haya una transmisión (propia o ajena) */}
                                                {screenTracks.length > 0 && (
                                                    <button
                                                        onClick={() => {
                                                            const nextTheater = !isTheaterMode;
                                                            setIsTheaterMode(nextTheater);
                                                            // Si activamos el modo cine pero no estamos en vista completa, lo forzamos
                                                            if (nextTheater && !isFullView) {
                                                                setIsFullView(true);
                                                                try {
                                                                    if (document.documentElement.requestFullscreen) {
                                                                        document.documentElement.requestFullscreen();
                                                                    }
                                                                } catch (err) { }
                                                            }
                                                        }}
                                                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isTheaterMode ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(34,211,238,0.5)] scale-110' : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'}`}
                                                        title="Modo Cine"
                                                    >
                                                        {isTheaterMode ? <Tv2 size={24} /> : <Tv size={24} />}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </footer>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </>
                , document.body)}
        </>
    );
}

function MinimizedBar({ roomName, onExpand, onLeave }) {
    const { isMicrophoneEnabled, localParticipant } = useLocalParticipant();

    return createPortal(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 bg-[#050518]/95 backdrop-blur-xl border border-cyan-500/30 rounded-full px-4 py-2.5 shadow-[0_8px_40px_rgba(0,0,0,0.7)]">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/70 max-w-[110px] truncate">{roomName}</span>
            <div className="w-px h-4 bg-white/10 mx-0.5" />
            <button
                onClick={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${isMicrophoneEnabled ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'}`}
                title={isMicrophoneEnabled ? 'Silenciar' : 'Activar mic'}
            >
                {isMicrophoneEnabled ? <Mic size={14} /> : <MicOff size={14} />}
            </button>
            <button
                onClick={onExpand}
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:bg-white/15 transition-all active:scale-90"
                title="Abrir panel de voz"
            >
                <ChevronUp size={14} />
            </button>
            <button
                onClick={onLeave}
                className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 hover:bg-rose-500/20 transition-all active:scale-90"
                title="Salir de la sala"
            >
                <LogOut size={14} />
            </button>
        </div>,
        document.body
    );
}

function ParticipantsList() {
    const participants = useParticipants();
    const prevCount = useRef(participants.length);
    const prevParticipantsInfo = useRef(new Map());
    const [soundEnabled, setSoundEnabled] = useState(true);

    const playSound = (type) => {
        if (!soundEnabled) return;
        playSyntheticSound(type);
    };

    useEffect(() => {
        // Find who joined or left
        const currentIds = participants.map(p => p.sid);
        const prevIds = Array.from(prevParticipantsInfo.current.keys());

        const joined = participants.filter(p => !prevIds.includes(p.sid));
        const left = prevIds.filter(id => !currentIds.includes(id)).map(id => prevParticipantsInfo.current.get(id));

        // Group events to avoid saturation
        if (joined.length > 0 && joined.length <= 3) {
            playSound('join');
            joined.forEach(p => {
                toast(`🌌 ${p.name || 'Piloto'} ha entrado al universo.`, {
                    style: { background: '#080b14', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.2)' },
                    icon: '🚀'
                });
            });
        }

        if (left.length > 0 && left.length <= 3) {
            playSound('leave');
            left.forEach(p => {
                toast(`🌠 ${p.name || 'Piloto'} ha abandonado la sala.`, {
                    style: { background: '#0f0505', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)' },
                    icon: '💨'
                });
            });
        }

        // Detect mic first time activations
        participants.forEach(p => {
            const prev = prevParticipantsInfo.current.get(p.sid);
            if (prev && !prev.isMicrophoneEnabled && p.isMicrophoneEnabled) {
                playSound('mic');
                toast(`🎙️ ${p.name || 'Piloto'} activó su micrófono.`, {
                    style: { background: '#050a14', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' },
                    duration: 2000
                });
            }
        });

        // Update tracking ref
        const newMap = new Map();
        participants.forEach(p => newMap.set(p.sid, { name: p.name, isMicrophoneEnabled: p.isMicrophoneEnabled }));
        prevParticipantsInfo.current = newMap;
        prevCount.current = participants.length;

    }, [participants, soundEnabled]);

    return (
        <div className="flex flex-col gap-3 relative">

            <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
                <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Actividad Espacial</span>
                <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase transition-all ${soundEnabled ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-white/5 text-white/30 border border-transparent hover:bg-white/10'}`}
                >
                    {soundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
                    {soundEnabled ? 'Sonidos Activos' : 'Silenciado'}
                </button>
            </div>
            {participants.map((p) => {
                let meta = {}; try { meta = p.metadata ? JSON.parse(p.metadata) : {}; } catch (e) { }
                const frame = getFrameStyle(meta.frameId);
                const nickClass = getNicknameClass({ nickname_style: meta.nicknameStyle });
                return (
                    <div key={p.sid} className={`flex items-center justify-between p-4 rounded-[1.5rem] border transition-all duration-500 ${p.isSpeaking ? 'bg-cyan-500/10 border-cyan-400/50 shadow-[0_0_25px_rgba(34,211,238,0.2)] scale-[1.02]' : 'bg-white/[0.03] border-white/5'}`}>
                        <div className="flex items-center gap-4">
                            <div className="relative w-12 h-12 flex items-center justify-center">
                                <AnimatePresence>
                                    {p.isSpeaking && (
                                        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 0.5, scale: 1.2 }} exit={{ opacity: 0, scale: 1.5 }} transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }} className="absolute inset-0 bg-cyan-400/20 rounded-full blur-md" />
                                    )}
                                </AnimatePresence>
                                <div className={`relative w-10 h-10 ${frame.className || ''}`} style={frame}>
                                    <img src={meta.avatar || "/default-avatar.png"} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className={`text-[11px] font-black uppercase tracking-widest ${nickClass || 'text-white'}`}>{p.name || 'Piloto'}</h4>
                                    <div className="flex items-center gap-0.5 bg-violet-500/10 border border-violet-500/20 rounded-full px-1.5 py-0.5" title="Nivel de Actividad">
                                        <Flame size={8} className="text-violet-400 fill-current" />
                                        <span className="text-[8px] font-black text-violet-300">{meta.activityLevel || 1}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${p.isSpeaking ? 'bg-cyan-400 animate-pulse' : 'bg-white/20'}`} />
                                    <span className="text-[7px] font-bold text-white/30 uppercase tracking-[0.2em]">{p.isSpeaking ? 'Hablando' : 'En línea'}</span>
                                </div>
                            </div>
                        </div>
                        <MuteIndicator participant={p} />
                    </div>
                );
            })}
        </div>
    );
}

function ChatPanel() {
    const { send, chatMessages } = useChat();
    const [input, setInput] = useState('');
    const scrollRef = useRef();

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [chatMessages]);

    const handleSend = () => {
        if (!input.trim()) return;
        send(input);
        setInput('');
    };

    return (
        <div className="flex flex-col h-[300px] gap-4">
            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 no-scrollbar pr-2">
                {chatMessages.length === 0 && <div className="h-full flex items-center justify-center text-[9px] uppercase font-black text-white/10 tracking-[0.3em]">Frecuencia limpia...</div>}
                {chatMessages.map((msg, i) => (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={i} className="bg-white/[0.03] border border-white/5 p-3 rounded-2xl">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">@{msg.from?.name || 'Anon'}</span>
                            <span className="text-[7px] text-white/20">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-[10px] text-white/70 leading-relaxed">{msg.message}</p>
                    </motion.div>
                ))}
            </div>
            <div className="relative group">
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSend()}
                    placeholder="Escribe en el canal..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-6 pr-14 text-[11px] text-white placeholder:text-white/20 outline-none focus:border-cyan-500/50 transition-all"
                />
                <button onClick={handleSend} className="absolute right-2 top-2 bottom-2 px-4 rounded-xl bg-cyan-500 text-black hover:bg-cyan-400 transition-all scale-90 group-focus-within:scale-100">
                    <Send size={14} />
                </button>
            </div>
        </div>
    );
}

function MuteIndicator({ participant }) {
    if (!participant.isMicrophoneEnabled) return (
        <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
            <MicOff size={12} className="text-rose-500" />
        </div>
    );
    return (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${participant.isSpeaking ? 'bg-cyan-500/20 border-cyan-400/40' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
            <Mic size={12} className={participant.isSpeaking ? 'text-cyan-400' : 'text-emerald-500/40'} />
        </div>
    );
}

function MuteToggle() {
    const { isMicrophoneEnabled, localParticipant } = useLocalParticipant();

    const handleToggle = async () => {
        if (!localParticipant) return;
        try {
            await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
        } catch (err) {
            console.error('[Voice] Error toggling mic:', err);
            toast.error('No se pudo acceder al micrófono');
        }
    };

    return (
        <button
            onClick={handleToggle}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-xl ${isMicrophoneEnabled ? 'bg-white/90 text-black hover:bg-white scale-110' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'}`}
        >
            {isMicrophoneEnabled ? <Mic size={24} /> : <MicOff size={24} />}
        </button>
    );
}

function ScreenShareToggle() {
    const { isScreenShareEnabled, localParticipant } = useLocalParticipant();

    const handleToggle = async () => {
        if (!localParticipant) return;

        // Verificación básica de soporte para móviles/Capacitor
        if (Capacitor.isNativePlatform()) {
            toast.error('La transmisión de pantalla no está disponible en la versión móvil aún');
            return;
        }

        try {
            await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
        } catch (err) {
            console.error('[Voice] Error toggling screen share:', err);
            toast.error('No se pudo iniciar la transmisión de pantalla');
        }
    };

    return (
        <button
            onClick={handleToggle}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-xl ${isScreenShareEnabled ? 'bg-cyan-500 text-black scale-110 shadow-cyan-500/20' : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'}`}
            title={isScreenShareEnabled ? 'Dejar de compartir pantalla' : 'Transmitir Pantalla'}
        >
            {isScreenShareEnabled ? <MonitorOff size={24} /> : <Monitor size={24} />}
        </button>
    );
}

function ScreenSharePanel({ isTheater, onToggleTheater }) {
    const screenTracks = useTracks([Track.Source.ScreenShare]);

    if (screenTracks.length === 0) return null;

    return (
        <div className={`transition-all duration-500 ${isTheater ? 'h-full w-full mb-0' : 'mb-8'}`}>
            {!isTheater && (
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400">Transmisiones de Pantalla</span>
                </div>
            )}

            <div className={`grid gap-4 ${isTheater ? 'grid-cols-1 h-full' : 'grid-cols-1'}`}>
                {screenTracks.map((trackRef) => (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key={trackRef.participant.sid}
                        className={`bg-black overflow-hidden border border-white/10 relative group transition-all duration-500 ${isTheater ? 'h-full w-full rounded-none border-none' : 'rounded-3xl aspect-video'}`}
                    >
                        <VideoTrack trackRef={trackRef} className={`w-full h-full ${isTheater ? 'object-contain' : 'object-contain'}`} />

                        <div className={`absolute top-4 left-4 flex items-center gap-3 transition-opacity ${isTheater ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                            <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                                <span className="text-[10px] font-black text-white uppercase tracking-wider">{trackRef.participant.identity}</span>
                                <div className="px-1.5 py-0.5 rounded bg-red-500 text-[7px] font-black text-white uppercase animate-pulse">Live</div>
                            </div>
                        </div>

                        {isTheater && (
                            <button
                                onClick={onToggleTheater}
                                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md text-white/40 border border-white/10 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Minimize2 size={16} />
                            </button>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                            <p className="text-[9px] font-black text-white/60 uppercase tracking-widest">Compartiendo: {trackRef.participant.name || 'Piloto'}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
