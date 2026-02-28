import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LiveKitRoom,
    useParticipants,
    useLocalParticipant,
    RoomAudioRenderer,
    useChat,
} from '@livekit/components-react';
import { Mic, MicOff, LogOut, Users, Radio, X, ChevronDown, MessageSquare, Send } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { getNicknameClass } from '../../utils/user';
import { getFrameStyle } from '../../utils/styles';

const LIVEKIT_URL = "wss://danspace-76f5bceh.livekit.cloud";

const joinSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
const leaveSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
joinSound.volume = 0.2;
leaveSound.volume = 0.2;

export default function VoiceRoomUI({ roomName, onLeave, onConnected, userAvatar, nicknameStyle, frameId, isOpen, onMinimize }) {
    const [token, setToken] = useState(null);
    const [connecting, setConnecting] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('participants');

    useEffect(() => {
        setToken(null);
        setConnecting(true);
        setError(null);
        setActiveTab('participants');
    }, [roomName]);

    useEffect(() => {
        if (!isOpen && !token) return;
        if (token) return;

        const fetchToken = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("Debes iniciar sesión");

                console.log(`[VoiceRoomUI] Fetching token for ${roomName}...`);
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
                        userAvatar,
                        nicknameStyle,
                        frameId
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
    }, [roomName, token, isOpen]);

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
            onDisconnected={onLeave}
            className="voice-room-container"
        >
            <RoomAudioRenderer />
            <AnimatePresence>
                {isOpen && createPortal(
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 overflow-hidden">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onMinimize} />
                        <motion.div
                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 30, scale: 0.95 }}
                            className="relative w-full max-w-md bg-[#050518] border border-white/10 rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh]"
                            onClick={e => e.stopPropagation()}
                        >
                            <header className="flex flex-col p-6 sm:p-8 border-b border-white/5 bg-white/[0.02]">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20"><Radio size={24} className="text-cyan-400" /></div>
                                        <div>
                                            <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-widest leading-tight">{roomName}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em]">En Directo</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={onMinimize} className="w-10 h-10 rounded-xl bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center"><ChevronDown size={20} /></button>
                                        <button onClick={onLeave} className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 active:scale-95 transition-all flex items-center justify-center"><LogOut size={20} /></button>
                                    </div>
                                </div>
                                <div className="flex gap-2 p-1 bg-black/20 rounded-2xl">
                                    <button onClick={() => setActiveTab('participants')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'participants' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-white/30 hover:bg-white/5'}`}><Users size={14} /> Tripulación</button>
                                    <button onClick={() => setActiveTab('chat')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'chat' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-white/30 hover:bg-white/5'}`}><MessageSquare size={14} /> Chat Temporal</button>
                                </div>
                            </header>
                            <div className="flex-1 overflow-y-auto p-6 sm:p-8 no-scrollbar">
                                {activeTab === 'participants' ? <ParticipantsList /> : <ChatPanel />}
                            </div>
                            <footer className="p-6 sm:p-8 bg-black/40 border-t border-white/5 flex items-center justify-center">
                                <MuteToggle />
                            </footer>
                        </motion.div>
                    </div>, document.body
                )}
            </AnimatePresence>
        </LiveKitRoom>
    );
}

function ParticipantsList() {
    const participants = useParticipants();
    const prevCount = useRef(participants.length);

    useEffect(() => {
        if (participants.length > prevCount.current) { joinSound.play().catch(() => { }); }
        else if (participants.length < prevCount.current) { leaveSound.play().catch(() => { }); }
        prevCount.current = participants.length;
    }, [participants.length]);

    return (
        <div className="flex flex-col gap-3">
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
                                <h4 className={`text-[11px] font-black uppercase tracking-widest ${nickClass || 'text-white'}`}>{p.name || 'Piloto'}</h4>
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
                <button onClick={handleSend} className="absolute right-2 top-2 bottom-2 px-4 rounded-xl bg-cyan-500 text-black hover:bg-cyan-400 transition-all scale-90 group-focus-within:scale-100"><Send size={14} /></button>
            </div>
        </div>
    );
}

function MuteIndicator({ participant }) {
    if (!participant.isMicrophoneEnabled) return <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20"><MicOff size={12} className="text-rose-500" /></div>;
    return <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${participant.isSpeaking ? 'bg-cyan-500/20 border-cyan-400/40' : 'bg-emerald-500/5 border-emerald-500/20'}`}><Mic size={12} className={participant.isSpeaking ? 'text-cyan-400' : 'text-emerald-500/40'} /></div>;
}

function MuteToggle() {
    const { isMicrophoneEnabled, localParticipant } = useLocalParticipant();
    return (
        <button onClick={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-xl ${isMicrophoneEnabled ? 'bg-white/90 text-black hover:bg-white scale-110' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'}`}>
            {isMicrophoneEnabled ? <Mic size={24} /> : <MicOff size={24} />}
        </button>
    );
}
