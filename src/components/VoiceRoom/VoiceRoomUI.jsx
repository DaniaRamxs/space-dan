import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LiveKitRoom,
    useParticipants,
    useTracks,
    TrackLoop,
    AudioTrack,
    useLocalParticipant,
    ParticipantLoop,
    ParticipantTile,
    ControlBar,
    RoomAudioRenderer,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Mic, MicOff, LogOut, Users, Radio, X } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const LIVEKIT_URL = "wss://danspace-76f5bceh.livekit.cloud";

export default function VoiceRoomUI({ roomName, onLeave, onConnected, userAvatar }) {
    const [token, setToken] = useState(null);
    const [connecting, setConnecting] = useState(true);
    const [error, setError] = useState(null);

    // 1. Obtener Token de la Edge Function
    useEffect(() => {
        const fetchToken = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("Debes iniciar sesión");

                console.log(`[VoiceRoomUI] Fetching token from: /api/livekit-token?t=${Date.now()}`);
                const response = await fetch(`/api/livekit-token?t=${Date.now()}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({
                        roomName,
                        userId: session.user.id,
                        participantName: session.user.user_metadata?.username || 'Explorador',
                        userAvatar
                    })
                });

                const data = await response.json();
                if (data.error) throw new Error(data.error);

                setToken(data.token);
            } catch (err) {
                console.error("Error obteniendo token:", err);
                setError(err.message);
            } finally {
                setConnecting(false);
            }
        };

        fetchToken();
    }, [roomName]);

    const renderContent = () => {
        if (error) return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-sm p-8 text-center bg-[#0a0505] border border-rose-500/20 rounded-[2.5rem] shadow-2xl"
            >
                <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-6">
                    <X size={32} className="text-rose-500" />
                </div>
                <p className="text-rose-400 font-black uppercase tracking-widest text-xs mb-6">Error de Sincronización</p>
                <p className="text-white/40 text-[10px] leading-relaxed mb-8">{error}</p>
                <button onClick={onLeave} className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Regresar al Espacio</button>
            </motion.div>
        );

        if (connecting || !token) return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full max-w-xs p-12 text-center bg-[#050510]/80 backdrop-blur-xl border border-white/5 rounded-[3rem] shadow-2xl"
            >
                <div className="relative w-20 h-20 mx-auto mb-8">
                    <div className="absolute inset-0 border-2 border-cyan-500/20 rounded-full" />
                    <div className="absolute inset-0 border-2 border-cyan-500 rounded-full border-t-transparent animate-spin" />
                    <Radio className="absolute inset-0 m-auto text-cyan-400 animate-pulse" size={32} />
                </div>
                <p className="text-[10px] uppercase font-black tracking-[0.3em] text-cyan-400 animate-pulse">Sintonizando Canal de Voz...</p>
                <p className="text-white/20 text-[8px] mt-2 uppercase tracking-widest">Protocolo LiveKit 2.1</p>
            </motion.div>
        );

        return (
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.95 }}
                className="w-full max-w-md bg-[#050518] border border-white/10 rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <LiveKitRoom
                    audio={true}
                    video={false}
                    token={token}
                    serverUrl={LIVEKIT_URL}
                    onConnected={() => {
                        console.log("Conectado a la sala de voz");
                        if (onConnected) onConnected();
                    }}
                    onDisconnected={onLeave}
                    className="voice-room-container h-full flex flex-col"
                >
                    <RoomAudioRenderer />

                    <header className="flex items-center justify-between p-6 sm:p-8 border-b border-white/5 bg-white/[0.02]">
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
                        <button
                            onClick={onLeave}
                            className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 active:scale-95 transition-all flex items-center justify-center"
                        >
                            <LogOut size={20} />
                        </button>
                    </header>

                    <div className="flex-1 overflow-y-auto p-6 sm:p-8 no-scrollbar">
                        <div className="flex items-center gap-2 mb-6 opacity-30">
                            <Users size={12} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Tripulación en el canal</span>
                        </div>
                        <ParticipantsList />
                    </div>

                    <footer className="p-6 sm:p-8 bg-black/40 border-t border-white/5 flex items-center justify-center">
                        <MuteToggle />
                    </footer>
                </LiveKitRoom>
            </motion.div>
        );
    };

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/90 backdrop-blur-md"
                onClick={onLeave}
            />
            {renderContent()}
        </div>,
        document.body
    );
}

function ParticipantsList() {
    const participants = useParticipants();

    return (
        <div className="flex flex-col gap-2">
            {participants.map((p) => (
                <div
                    key={p.sid}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${p.isSpeaking
                        ? 'bg-cyan-500/10 border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.2)] scale-102'
                        : 'bg-white/[0.02] border-white/5'
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10">
                                {(() => {
                                    try {
                                        const meta = p.metadata ? JSON.parse(p.metadata) : {};
                                        return <img
                                            src={meta.avatar || "/default-avatar.png"}
                                            alt="Avatar"
                                            className="w-full h-full object-cover"
                                        />;
                                    } catch (e) {
                                        return <img src="/default-avatar.png" alt="Avatar" className="w-full h-full object-cover" />;
                                    }
                                })()}
                            </div>
                            {p.isSpeaking && (
                                <div className="absolute -inset-1 rounded-full border border-cyan-400 animate-ping opacity-50" />
                            )}
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/80">
                                {p.name || 'Piloto'}
                            </span>
                            {p.isLocal && <span className="ml-2 text-[7px] font-black text-cyan-400 uppercase tracking-widest opacity-60">(tú)</span>}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {!p.isMicrophoneEnabled ? (
                            <MicOff size={12} className="text-rose-500/60" />
                        ) : (
                            <div className={`h-1 w-1 rounded-full ${p.isSpeaking ? 'bg-cyan-400 animate-pulse' : 'bg-emerald-500/30'}`} />
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

function MuteToggle() {
    const { isMicrophoneEnabled, localParticipant } = useLocalParticipant();

    return (
        <button
            onClick={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-xl ${isMicrophoneEnabled
                ? 'bg-white/90 text-black hover:bg-white scale-110'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                }`}
        >
            {isMicrophoneEnabled ? <Mic size={24} /> : <MicOff size={24} />}
        </button>
    );
}
