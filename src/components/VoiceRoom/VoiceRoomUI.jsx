import React, { useState, useEffect } from 'react';
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
import { Mic, MicOff, LogOut, Users, Radio } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const LIVEKIT_URL = "wss://danspace-76f5bceh.livekit.cloud";

export default function VoiceRoomUI({ roomName, onLeave }) {
    const [token, setToken] = useState(null);
    const [connecting, setConnecting] = useState(true);
    const [error, setError] = useState(null);

    // 1. Obtener Token de la Edge Function
    useEffect(() => {
        const fetchToken = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("Debes iniciar sesión");

                const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/livekit-token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({
                        roomName,
                        participantName: session.user.user_metadata?.username || 'Explorador'
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

    if (error) return (
        <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 rounded-3xl">
            <p className="text-rose-400 font-bold mb-4">Error de conexión: {error}</p>
            <button onClick={onLeave} className="btn-glass text-xs p-3">Regresar al Espacio</button>
        </div>
    );

    if (connecting || !token) return (
        <div className="p-12 text-center bg-white/[0.02] border border-white/5 rounded-3xl animate-pulse">
            <Radio className="mx-auto mb-4 text-cyan-400 animate-bounce" size={32} />
            <p className="text-[10px] uppercase font-black tracking-widest text-white/30">Sintonizando Canal de Voz...</p>
        </div>
    );

    return (
        <div className="w-full max-w-md mx-auto">
            <LiveKitRoom
                audio={true}
                video={false}
                token={token}
                serverUrl={LIVEKIT_URL}
                onConnected={() => console.log("Conectado a la sala de voz")}
                onDisconnected={onLeave}
                className="voice-room-container"
            >
                {/* Lógica de Audio (Automática) */}
                <RoomAudioRenderer />

                <header className="flex items-center justify-between mb-8 p-6 bg-white/[0.03] border border-white/10 rounded-[2rem]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
                            <Radio size={20} className="text-cyan-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">{roomName}</h3>
                            <p className="text-[8px] font-bold text-emerald-400 uppercase tracking-[0.2em]">En Directo</p>
                        </div>
                    </div>
                    <button
                        onClick={onLeave}
                        className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all flex items-center justify-center"
                    >
                        <LogOut size={16} />
                    </button>
                </header>

                {/* Lista de Participantes (Máximo 5) */}
                <div className="grid grid-cols-1 gap-3 mb-8">
                    <ParticipantsList />
                </div>

                {/* Controles MVP */}
                <footer className="p-6 bg-black/40 border border-white/5 rounded-[2.5rem] flex items-center justify-around shadow-2xl">
                    <MuteToggle />
                </footer>
            </LiveKitRoom>
        </div>
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
                                <img src="/default_user_blank.png" alt="Avatar" className="w-full h-full object-cover" />
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
