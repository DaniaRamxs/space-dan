import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, Ghost, Radio, User, Mic2, Sparkles, Star, X } from 'lucide-react';
import { useLocalParticipant, useRoomContext } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useEconomy } from '../../contexts/EconomyContext';
import { VoiceProcessor } from '../../utils/audioFX';

const FILTERS = [
    { id: 'none', name: 'Original', icon: <User size={14} />, cost: 0, color: 'bg-white/10' },
    { id: 'robot', name: 'Androide', icon: <Mic2 size={14} />, cost: 10, color: 'bg-blue-500/20' },
    { id: 'alien', name: 'Alien x-1', icon: <Ghost size={14} />, cost: 15, color: 'bg-emerald-500/20' },
    { id: 'giant', name: 'Gigante', icon: <Star size={14} />, cost: 15, color: 'bg-rose-500/20' },
    { id: 'radio', name: 'Radio NASA', icon: <Radio size={14} />, cost: 5, color: 'bg-amber-500/20' },
    { id: 'space', name: 'Vortex', icon: <Sparkles size={14} />, cost: 20, color: 'bg-purple-500/20' },
];

export default function VoiceFXMenu() {
    const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
    const room = useRoomContext();
    const { balance, deductCoins } = useEconomy();
    const [isOpen, setIsOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState('none');

    const processorRef = useRef(new VoiceProcessor());
    const processedTrackPubRef = useRef(null);

    const toggleFilter = useCallback(async (filterId) => {
        if (!isMicrophoneEnabled && filterId !== 'none') {
            alert("Primero activa tu micrófono");
            return;
        }

        const filter = FILTERS.find(f => f.id === filterId);

        // 1. Validar Cobro inicial
        if (filterId !== 'none' && activeFilter !== filterId) {
            if (balance < filter.cost) {
                alert(`Necesitas ${filter.cost}◈ para este filtro`);
                return;
            }
            await deductCoins(filter.cost, 'activity', `Activación Filtro: ${filter.name}`);
        }

        setActiveFilter(filterId);

        try {
            // 2. Limpieza de track procesado anterior si existe
            if (processedTrackPubRef.current) {
                await localParticipant.unpublishTrack(processedTrackPubRef.current.track);
                processedTrackPubRef.current = null;
            }

            if (filterId === 'none') {
                // Volver al micro normal de LiveKit
                processorRef.current.setFilter('none');
                // Al volver a normal, reactivamos el micro estándar
                await localParticipant.setMicrophoneEnabled(false);
                await localParticipant.setMicrophoneEnabled(true);
            } else {
                // Magia de Audio Interno
                // Obtenemos el stream actual del micro (LiveKit ya lo pidió)
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const processedStream = processorRef.current.init(stream);
                processorRef.current.setFilter(filterId);

                const processedTrack = processedStream.getAudioTracks()[0];

                // Apagamos el micro "oficial" para no duplicar
                await localParticipant.setMicrophoneEnabled(false);

                // Publicamos el track procesado
                const pub = await localParticipant.publishTrack(processedTrack, {
                    name: `fx-${filterId}`,
                    source: Track.Source.Microphone
                });
                processedTrackPubRef.current = pub;
            }
        } catch (err) {
            console.error('[VoiceFX] Error swapping tracks:', err);
            setActiveFilter('none');
            await localParticipant.setMicrophoneEnabled(true);
        }
    }, [localParticipant, processedTrackPubRef, balance, deductCoins, room, isMicrophoneEnabled, activeFilter]);

    // Cobrar por minuto
    useEffect(() => {
        if (activeFilter === 'none' || !isMicrophoneEnabled) return;

        const interval = setInterval(async () => {
            const filter = FILTERS.find(f => f.id === activeFilter);
            if (filter && filter.cost > 0) {
                const res = await deductCoins(filter.cost, 'activity', `Filtro de voz: ${filter.name}`);
                if (!res?.success) {
                    toggleFilter('none');
                }
            }
        }, 60000);

        return () => clearInterval(interval);
    }, [activeFilter, isMicrophoneEnabled, deductCoins, toggleFilter]);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${activeFilter !== 'none'
                    ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)] animate-pulse'
                    : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
                    }`}
                title="Efectos de Voz"
            >
                <Wand2 size={24} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10, x: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="absolute bottom-20 left-0 bg-[#070715]/95 backdrop-blur-2xl border border-white/10 p-4 rounded-[2rem] shadow-2xl w-64 z-[100]"
                    >
                        <div className="flex items-center justify-between mb-4 px-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">Modulador de Voz</span>
                            <button onClick={() => setIsOpen(false)} className="text-white/20 hover:text-white"><X size={14} /></button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {FILTERS.map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => toggleFilter(f.id)}
                                    className={`relative p-3 rounded-2xl border transition-all flex flex-col items-center gap-2 ${activeFilter === f.id
                                        ? 'bg-purple-500/20 border-purple-500 shadow-inner'
                                        : 'bg-white/5 border-white/5 hover:border-white/10'
                                        }`}
                                >
                                    <div className={`p-2 rounded-lg ${activeFilter === f.id ? 'text-purple-400' : 'text-white/40'}`}>
                                        {f.icon}
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className={`text-[9px] font-black uppercase tracking-tighter ${activeFilter === f.id ? 'text-white' : 'text-white/40'}`}>
                                            {f.name}
                                        </span>
                                        {f.cost > 0 && (
                                            <span className="text-[7px] font-bold text-amber-500/60">{f.cost}◈/min</span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {!isMicrophoneEnabled && (
                            <div className="mt-4 p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
                                <p className="text-[8px] font-bold text-rose-400 uppercase tracking-widest">Activa el micro para usar efectos</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
