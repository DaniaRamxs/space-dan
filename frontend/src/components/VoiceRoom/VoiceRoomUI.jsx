/**
 * VoiceRoomUI.jsx
 * Componente raíz de las salas de voz de Space Dan.
 *
 * Árbol de componentes:
 *   VoiceRoomUI                  ← obtiene token, maneja estado global de la sala
 *     └─ LiveKitRoom             ← proveedor de contexto de LiveKit
 *          ├─ RoomAudioRenderer  ← renderiza audio de todos los participantes
 *          ├─ VoiceActivityTracker ← otorga XP silenciosamente (sin UI)
 *          └─ VoiceRoomInner     ← toda la UI: panel, minimizado, actividades
 *               ├─ MinimizedBar     (portal) ← barra flotante cuando el panel está minimizado
 *               ├─ JukeboxDJ        (portal) ← persistente para no cortar la música
 *               ├─ Panel completo   (portal) ← overlay con header, tabs, footer
 *               │   ├─ EnergyReactor
 *               │   ├─ ScreenSharePanel
 *               │   ├─ ParticipantsList / ChatPanel
 *               │   └─ VoiceActivityLauncher
 *               └─ VoiceFXMenu (en footer del panel)
 *
 * Sincronización de actividades:
 *   El canal de Supabase broadcast `activity-sync-{roomName}` coordina
 *   qué actividad está activa en toda la sala. Cuando un usuario lanza o
 *   cierra una actividad, el evento se propaga a todos los participantes.
 *
 * Manejo de sonidos:
 *   Los archivos .mp3 de /sounds/ pueden no existir en dev.
 *   Se usa Web Audio API como fuente primaria (sin 404s) y sin archivos externos.
 */

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
import {
    Mic, MicOff, LogOut, Users, Radio, X, ChevronDown, ChevronUp,
    MessageSquare, Send, Gamepad2, Music, Flame, Volume2, VolumeX,
    Monitor, MonitorOff, Maximize2, Minimize2, Tv, Tv2,
} from 'lucide-react';
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

// ─── Plugin nativo de Capacitor para mantener audio en background (Android) ──
// Se registra de forma segura — si no existe (web), falla silenciosamente.
let VoiceServicePlugin;
try {
    VoiceServicePlugin = registerPlugin('VoiceService');
} catch (_) { }

// ─── Constantes ──────────────────────────────────────────────────────────────
const LIVEKIT_URL = 'wss://danspace-76f5bceh.livekit.cloud';

// ─── Sonidos sintéticos (Web Audio API) ──────────────────────────────────────
// Generados programáticamente para evitar requests a archivos .mp3 que
// pueden no existir en el servidor de desarrollo (evita 404s en consola).
/**
 * Reproduce un sonido sintético de sala de voz.
 * @param {'join'|'leave'|'mic'} type
 */
const playSyntheticSound = (type) => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx       = new AudioContext();
        const mainGain  = ctx.createGain();
        mainGain.connect(ctx.destination);

        if (type === 'join') {
            // Tono ascendente: bienvenida
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
            // Cerrar contexto automáticamente al terminar
            osc.onended = () => ctx.close();

        } else if (type === 'leave') {
            // Tono descendente: despedida
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.2);
            mainGain.gain.setValueAtTime(0.15, ctx.currentTime);
            mainGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
            osc.connect(mainGain);
            osc.start();
            osc.stop(ctx.currentTime + 0.6);
            osc.onended = () => ctx.close();

        } else if (type === 'mic') {
            // Pitido corto: micrófono activado
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
            osc.onended = () => ctx.close();
        }
    } catch (_) {
        // Web Audio no disponible en este entorno — ignorar silenciosamente
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL: VoiceRoomUI
// ═══════════════════════════════════════════════════════════════════════════════

export default function VoiceRoomUI({
    roomName,
    isOpen,
    onMinimize,
    onExpand,
    onLeave,
    userName,
    userAvatar,
    nicknameStyle,
    frameId,
    activityLevel,
    onConnected,
    initialPersonalActivity = null, // NEW: Activity to open without broadcasting
}) {
    const [token,      setToken]      = useState(null);
    const [connecting, setConnecting] = useState(true);
    const [error,      setError]      = useState(null);

    // Tab activa en el panel: 'participants' | 'chat'
    const [activeTab,  setActiveTab]  = useState('participants');

    // ID de la actividad activa en esta sala (null = ninguna)
    const [activeActivity, setActiveActivity] = useState(null);
    // Ref para leer el valor actual dentro del callback del broadcast sin stale closure
    const activeActivityRef = useRef(null);
    useEffect(() => { activeActivityRef.current = activeActivity; }, [activeActivity]);

    // NEW: Track if user has a personal activity that shouldn't sync with others
    const hasPersonalActivityRef = useRef(!!initialPersonalActivity);

    // El Jukebox se monta una vez y se mantiene montado para no cortar la música
    // incluso cuando se minimiza el panel o se navega entre tabs.
    const [jukeboxEverStarted, setJukeboxEverStarted] = useState(false);
    useEffect(() => {
        if (activeActivity === 'dj') setJukeboxEverStarted(true);
    }, [activeActivity]);

    // Modos de vista del panel
    const [isFullView,    setIsFullView]    = useState(false);
    const [isTheaterMode, setIsTheaterMode] = useState(false);

    // Canal de Supabase broadcast para sincronizar actividades entre usuarios
    const syncChannelRef = useRef(null);
    // NEW: Canal específico para la actividad actual (si hay una)
    const activityChannelRef = useRef(null);

    // Ref para detectar cambio de sala y resetear estado
    const roomRef = useRef(roomName);

    // ── Resetear estado cuando cambia la sala ────────────────────────────────
    useEffect(() => {
        if (roomRef.current !== roomName) {
            setToken(null);
            setConnecting(true);
            setError(null);
            setActiveTab('participants');
            setActiveActivity(null);
            setJukeboxEverStarted(false);
            roomRef.current = roomName;
        }
    }, [roomName]);

    // ── Obtener token de LiveKit via Edge Function de Supabase ───────────────
    useEffect(() => {
        // No re-fetchar si ya tenemos token, o si el panel no está abierto y no hay token
        if (token || (!isOpen && !token)) return;

        const fetchToken = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const participantName = userName || session?.user?.user_metadata?.username || 'Anónimo';

                const { data, error: fnError } = await supabase.functions.invoke('livekit-token', {
                    body: { roomName, participantName, userAvatar, nicknameStyle, frameId, activityLevel },
                });

                if (fnError) throw new Error(fnError.message);
                if (data?.error) throw new Error(data.error);

                setToken(data.token);
            } catch (err) {
                console.error('[VoiceRoom] Error obteniendo token:', err?.message);
                setError(err.message);
            } finally {
                setConnecting(false);
            }
        };

        fetchToken();
    }, [roomName, token, isOpen]);

    // NEW: Open personal activity when provided (no broadcast to others)
    useEffect(() => {
        if (initialPersonalActivity && token) {
            // Open the activity without broadcasting to others
            setActiveActivity(initialPersonalActivity);
            // Mark as processed so it doesn't reopen on re-renders
            // This is a one-time action when entering the room
        }
    }, [initialPersonalActivity, token]);

    // ── Canal de Supabase broadcast: sincronización de actividades ───────────
    useEffect(() => {
        if (!roomName || !isOpen) return;

        // Nombre del canal: normalizado para evitar caracteres inválidos
        const chanName = `activity-sync-${roomName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const channel  = supabase.channel(chanName);
        syncChannelRef.current = channel;

        channel
            // Otro usuario inició una actividad — solo sincronizar si no tenemos actividad personal
            .on('broadcast', { event: 'start_activity' }, ({ payload }) => {
                // Skip if this user has a personal activity (came from feed)
                if (hasPersonalActivityRef.current) return;
                
                const current = activeActivityRef.current;
                if (payload.activityId && payload.activityId !== current) {
                    setActiveActivity(payload.activityId);
                    toast(`🔥 ${payload.sender} inició ${payload.activityId}`, {
                        icon: '🎮',
                        style: { background: '#020617', color: '#fff', border: '1px solid #334155' },
                    });
                }
            })
            // Otro usuario cerró la actividad — solo sincronizar si no tenemos actividad personal
            .on('broadcast', { event: 'stop_activity' }, () => {
                if (hasPersonalActivityRef.current) return;
                setActiveActivity(null);
            })
            // Un usuario nuevo se unió y pide el estado actual para sincronizarse
            .on('broadcast', { event: 'activity_sync_req' }, () => {
                const current = activeActivityRef.current;
                if (current) {
                    // Responder con la actividad activa actual
                    channel.send({
                        type:    'broadcast',
                        event:   'start_activity',
                        payload: { activityId: current, sender: 'Sistema (Sync)' },
                    });
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    // Al suscribirnos, pedir el estado actual de la sala
                    channel.send({ type: 'broadcast', event: 'activity_sync_req', payload: {} });
                }
            });

        return () => {
            syncChannelRef.current = null;
            supabase.removeChannel(channel);
        };
    }, [roomName, isOpen]);

    // ── Canal específico para actividad actual (sincronización dentro de la misma actividad) ──
    useEffect(() => {
        if (!activeActivity || !isOpen) {
            // Cerrar canal de actividad si no hay actividad activa
            if (activityChannelRef.current) {
                supabase.removeChannel(activityChannelRef.current);
                activityChannelRef.current = null;
            }
            return;
        }

        const activityChanName = `activity-${activeActivity}-${roomName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        const activityChannel = supabase.channel(activityChanName);
        activityChannelRef.current = activityChannel;

        activityChannel
            .on('broadcast', { event: 'activity_state' }, ({ payload }) => {
                // Sincronizar estado específico de la actividad (ej: estado del juego)
                // Este evento es específico para la actividad actual
                console.log(`[${activeActivity}] Activity state:`, payload);
            })
            .on('broadcast', { event: 'activity_join' }, ({ payload }) => {
                // Notificar cuando alguien se une a esta actividad
                if (payload.userId !== userName) {
                    toast(`🎮 ${payload.userName} se unió a ${activeActivity}`, {
                        icon: '👥',
                        style: { background: '#020617', color: '#fff', border: '1px solid #334155' },
                    });
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    // Anunciar que nos unimos a esta actividad
                    activityChannel.send({
                        type: 'broadcast',
                        event: 'activity_join',
                        payload: { userId: userName, userName: userName || 'Anónimo' },
                    });
                }
            });

        return () => {
            activityChannelRef.current = null;
            supabase.removeChannel(activityChannel);
        };
    }, [activeActivity, roomName, isOpen, userName]);

    // ── Plugin nativo: notificar al SO que hay una sesión de voz activa ──────
    // IMPORTANTE: este useEffect debe ir ANTES del early return para
    // respetar las Rules of Hooks (orden estable entre renders).
    useEffect(() => {
        if (!token) return;

        // Iniciar servicio de audio en background (Android)
        if (Capacitor.isNativePlatform() && VoiceServicePlugin) {
            VoiceServicePlugin.start().catch(() => { });
        }
        // Evento global: otros componentes pueden reaccionar a la conexión de voz
        window.dispatchEvent(new CustomEvent('voice:connect'));

        return () => {
            if (Capacitor.isNativePlatform() && VoiceServicePlugin) {
                VoiceServicePlugin.stop().catch(() => { });
            }
            window.dispatchEvent(new CustomEvent('voice:disconnect'));
        };
    }, [token]);

    /**
     * Cambia la actividad activa Y la propaga a todos los usuarios de la sala
     * via el canal de broadcast de Supabase.
     * @param {string|null} id — ID de la actividad, o null para cerrar
     */
    const handleSetActiveActivity = (id) => {
        setActiveActivity(id);
        
        // Si es una actividad personal (vino del feed), no hacer broadcast al canal general
        // El canal específico de la actividad se manejará en el useEffect de activityChannelRef
        if (hasPersonalActivityRef.current) {
            return;
        }
        
        // Solo hacer broadcast si no es una actividad personal
        const channel = syncChannelRef.current;
        if (!channel) return;

        if (id) {
            channel.send({
                type:    'broadcast',
                event:   'start_activity',
                payload: { activityId: id, sender: userName || 'Alguien' },
            });
        } else {
            channel.send({
                type:    'broadcast',
                event:   'stop_activity',
                payload: { sender: userName || 'Alguien' },
            });
        }
    };

    // ── Estado de carga / error ───────────────────────────────────────────────
    if (!token && (connecting || error)) {
        if (!isOpen) return null;
        return createPortal(
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onMinimize} />
                {error && (
                    // Panel de error
                    <motion.div
                        className="relative w-full max-w-xs p-12 text-center bg-[#050510]/80 backdrop-blur-xl border border-white/5 rounded-[3rem] shadow-2xl"
                    >
                        <div className="relative w-20 h-20 mx-auto mb-8">
                            <div className="absolute inset-0 border-2 border-cyan-500/20 rounded-full" />
                            <div className="absolute inset-0 border-2 border-cyan-500 rounded-full border-t-transparent animate-spin" />
                            <Radio className="absolute inset-0 m-auto text-cyan-400 animate-pulse" size={32} />
                        </div>
                        <p className="text-[10px] uppercase font-black tracking-[0.3em] text-cyan-400 animate-pulse">
                            Sintonizando Canal de Voz...
                        </p>
                    </motion.div>
                )}
            </div>,
            document.body
        );
    }

    // ── Sala conectada: renderizar LiveKitRoom con toda la UI ─────────────────
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
            {/* Renderiza el audio de todos los participantes de forma invisible */}
            <RoomAudioRenderer />

            {/* Rastreador silencioso de XP por tiempo en voz */}
            <VoiceActivityTracker />

            {/* UI completa de la sala */}
            <VoiceRoomInner
                roomName={roomName}
                isOpen={isOpen}
                onMinimize={onMinimize}
                onExpand={onExpand}
                onLeave={onLeave}
                activeActivity={activeActivity}
                setActiveActivity={handleSetActiveActivity}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isFullView={isFullView}
                setIsFullView={setIsFullView}
                isTheaterMode={isTheaterMode}
                setIsTheaterMode={setIsTheaterMode}
                jukeboxEverStarted={jukeboxEverStarted}
                activityChannelRef={activityChannelRef}
            />
        </LiveKitRoom>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VoiceRoomInner — UI principal (debe estar dentro de LiveKitRoom)
// ═══════════════════════════════════════════════════════════════════════════════

function VoiceRoomInner({
    roomName, isOpen, onMinimize, onExpand, onLeave,
    activeActivity, setActiveActivity, activeTab, setActiveTab,
    isFullView, setIsFullView, isTheaterMode, setIsTheaterMode,
    jukeboxEverStarted, activityChannelRef,
}) {
    // useTracks debe llamarse aquí (dentro de LiveKitRoom) para tener contexto
    const screenTracks = useTracks([Track.Source.ScreenShare]);
    const { chatMessages } = useChat();
    const unreadCount = activeTab !== 'chat' ? chatMessages.length : 0;

    return (
        <>
            {/* Barra minimizada: solo visible cuando el panel está cerrado */}
            {!isOpen && (
                <MinimizedBar roomName={roomName} onExpand={onExpand} onLeave={onLeave} />
            )}

            {createPortal(
                <>
                    {/*
                     * JukeboxDJ se monta fuera del bloque `isOpen` para que la música
                     * no se interrumpa al minimizar el panel de voz.
                     * Solo se monta una vez que el usuario lo ha iniciado.
                     */}
                    {jukeboxEverStarted && (
                        <JukeboxDJ
                            roomName={roomName}
                            onClose={() => setActiveActivity(null)}
                            isMinimized={activeActivity !== 'dj' || !isOpen}
                            isPanelOpen={isOpen}
                        />
                    )}

                    {/* Panel completo con AnimatePresence DENTRO del portal */}
                    <AnimatePresence>
                        {isOpen && (
                            <div
                                key="voice-panel-root"
                                className="fixed inset-0 z-[10000] flex items-center justify-center p-4 overflow-hidden"
                            >
                                {/* Backdrop: click fuera minimiza */}
                                <motion.div
                                    key="voice-backdrop"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-black/90 backdrop-blur-md"
                                    onClick={onMinimize}
                                />

                                {/* Panel principal */}
                                <motion.div
                                    key="voice-modal"
                                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                    animate={{
                                        // Ocultar panel cuando el Jukebox está en modo fullscreen
                                        opacity:       activeActivity === 'dj' ? 0 : 1,
                                        y:             activeActivity === 'dj' ? 30 : 0,
                                        scale:         activeActivity === 'dj' ? 0.95 : 1,
                                        pointerEvents: activeActivity === 'dj' ? 'none' : 'auto',
                                    }}
                                    exit={{ opacity: 0, y: 30, scale: 0.95 }}
                                    className={`relative bg-[#050518] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col transition-all duration-500 ${
                                        isFullView
                                            ? 'w-full h-[100dvh] max-w-none max-h-none rounded-none'
                                            : 'w-full max-w-md rounded-[3rem] max-h-[90vh]'
                                    }`}
                                    onClick={e => e.stopPropagation()}
                                >
                                    {/* ── HEADER ─────────────────────────────────────────── */}
                                    <header className={`flex flex-col p-6 sm:p-8 border-b border-white/5 bg-white/[0.02] transition-all duration-500 ${
                                        isTheaterMode && isFullView
                                            ? 'opacity-0 -translate-y-full absolute pointer-events-none'
                                            : 'relative opacity-100'
                                    }`}>
                                        <div className="flex items-center justify-between mb-6">
                                            {/* Info de la sala */}
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                                                    <Radio size={24} className="text-cyan-400" />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-widest leading-tight">
                                                        {roomName}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em]">
                                                            En Directo
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Controles del header */}
                                            <div className="flex items-center gap-2">
                                                {/* Pantalla completa */}
                                                <button
                                                    onClick={() => {
                                                        const next = !isFullView;
                                                        setIsFullView(next);
                                                        if (!next) setIsTheaterMode(false);
                                                        try {
                                                            if (next) {
                                                                document.documentElement.requestFullscreen?.();
                                                            } else {
                                                                if (document.fullscreenElement) document.exitFullscreen?.();
                                                            }
                                                        } catch (_) { }
                                                    }}
                                                    title={isFullView ? 'Vista reducida' : 'Pantalla completa'}
                                                    className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 active:scale-95 transition-all flex items-center justify-center"
                                                >
                                                    {isFullView ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                                                </button>

                                                {/* Minimizar panel */}
                                                <button
                                                    onClick={onMinimize}
                                                    title="Minimizar"
                                                    className="w-10 h-10 rounded-xl bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center"
                                                >
                                                    <ChevronDown size={20} />
                                                </button>

                                                {/* Salir de la sala */}
                                                <button
                                                    onClick={onLeave}
                                                    title="Salir de la sala"
                                                    className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 active:scale-95 transition-all flex items-center justify-center"
                                                >
                                                    <LogOut size={20} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Tabs: Tripulación / Chat */}
                                        <div className="flex gap-2 p-1 bg-black/20 rounded-2xl">
                                            <button
                                                onClick={() => setActiveTab('participants')}
                                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                    activeTab === 'participants'
                                                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                                        : 'text-white/30 hover:bg-white/5'
                                                }`}
                                            >
                                                <Users size={14} /> Tripulación
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('chat')}
                                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${
                                                    activeTab === 'chat'
                                                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                                        : 'text-white/30 hover:bg-white/5'
                                                }`}
                                            >
                                                <MessageSquare size={14} /> Chat Temporal
                                                {unreadCount > 0 && (
                                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-cyan-500 text-black text-[8px] font-black rounded-full flex items-center justify-center animate-pulse">
                                                        {unreadCount > 9 ? '9+' : unreadCount}
                                                    </span>
                                                )}
                                            </button>
                                        </div>
                                    </header>

                                    {/* ── CUERPO DEL PANEL ───────────────────────────────── */}
                                    <div className={`flex-1 overflow-y-auto no-scrollbar relative min-h-[300px] transition-all duration-500 ${
                                        isTheaterMode && isFullView ? 'p-0 h-full' : 'p-6 sm:p-8'
                                    }`}>
                                        {/* Reactor de energía colectiva (oculto en modo cine) */}
                                        <div className={isTheaterMode && isFullView ? 'hidden' : 'block'}>
                                            <EnergyReactor roomName={roomName} />
                                        </div>

                                        {/* Panel de pantalla compartida */}
                                        <ScreenSharePanel
                                            isTheater={isTheaterMode && isFullView && !activeActivity}
                                            onToggleTheater={() => setIsTheaterMode(!isTheaterMode)}
                                        />

                                        {/* Contenido principal según modo */}
                                        {(!isTheaterMode || !isFullView) ? (
                                            <>
                                                {activeActivity && activeActivity !== 'dj' ? (
                                                    // Actividad activa en modo normal
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
                                                        activityChannelRef={activityChannelRef}
                                                    />
                                                ) : !activeActivity ? (
                                                    // Sin actividad: mostrar lista de participantes o chat
                                                    <>
                                                        {activeTab === 'participants'
                                                            ? <ParticipantsList />
                                                            : <ChatPanel />
                                                        }
                                                        {/* Lanzador de actividades en la parte inferior */}
                                                        <div className="mt-8 relative z-10 bottom-0 left-0 w-full">
                                                            <VoiceActivityLauncher
                                                                roomName={roomName}
                                                                activeActivity={activeActivity}
                                                                setActiveActivity={setActiveActivity}
                                                                activityChannelRef={activityChannelRef}
                                                            />
                                                        </div>
                                                    </>
                                                ) : (
                                                    // Jukebox activo: mostrar placeholder mientras el DJ cubre todo
                                                    <div className="h-full flex flex-col items-center justify-center opacity-20 pointer-events-none">
                                                        <Music size={40} className="mb-4" />
                                                        <p className="text-[10px] font-black uppercase tracking-widest">
                                                            Actividad activa: Jukebox DJ
                                                        </p>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            // Modo cine activo: mostrar actividad si hay una
                                            <>
                                                {activeActivity && activeActivity !== 'dj' && (
                                                    <VoiceActivityLauncher
                                                        roomName={roomName}
                                                        activeActivity={activeActivity}
                                                        setActiveActivity={setActiveActivity}
                                                        isTheater={true}
                                                        isFullView={isFullView}
                                                        onToggleTheater={() => setIsTheaterMode(false)}
                                                        activityChannelRef={activityChannelRef}
                                                    />
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {/* ── FOOTER: CONTROLES DE AUDIO ─────────────────────── */}
                                    <footer className={`p-6 sm:p-8 bg-black/40 border-t border-white/5 flex items-center justify-center gap-6 transition-all duration-500 ${
                                        isTheaterMode && isFullView ? 'bg-transparent border-none' : 'relative'
                                    }`}>
                                        <div className={
                                            isTheaterMode && isFullView
                                                // En modo cine: controles flotantes centrados
                                                ? 'fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex gap-4 backdrop-blur-md bg-black/20 p-4 rounded-full border border-white/10'
                                                : 'flex items-center gap-6'
                                        }>
                                            {/* Efectos de voz */}
                                            <VoiceFXMenu />

                                            <div className="flex items-center gap-4">
                                                {/* Mute / Unmute */}
                                                <MuteToggle />

                                                {/* Compartir pantalla */}
                                                <ScreenShareToggle />

                                                {/* Modo Cine (solo visible si hay una transmisión activa) */}
                                                {screenTracks.length > 0 && (
                                                    <button
                                                        onClick={() => {
                                                            const nextTheater = !isTheaterMode;
                                                            setIsTheaterMode(nextTheater);
                                                            // Forzar pantalla completa al activar modo cine
                                                            if (nextTheater && !isFullView) {
                                                                setIsFullView(true);
                                                                try { document.documentElement.requestFullscreen?.(); } catch (_) { }
                                                            }
                                                        }}
                                                        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                                                            isTheaterMode
                                                                ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(34,211,238,0.5)] scale-110'
                                                                : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
                                                        }`}
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
                </>,
                document.body
            )}
        </>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MinimizedBar — Barra flotante cuando el panel está minimizado
// ═══════════════════════════════════════════════════════════════════════════════

function MinimizedBar({ roomName, onExpand, onLeave }) {
    const { isMicrophoneEnabled, localParticipant } = useLocalParticipant();

    return createPortal(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 bg-[#050518]/95 backdrop-blur-xl border border-cyan-500/30 rounded-full px-4 py-2.5 shadow-[0_8px_40px_rgba(0,0,0,0.7)]">
            {/* Indicador de sala activa */}
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/70 max-w-[110px] truncate">
                {roomName}
            </span>
            <div className="w-px h-4 bg-white/10 mx-0.5" />

            {/* Toggle de micrófono rápido */}
            <button
                onClick={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                    isMicrophoneEnabled
                        ? 'bg-white/10 text-white/70 hover:bg-white/20'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                }`}
                title={isMicrophoneEnabled ? 'Silenciar' : 'Activar micrófono'}
            >
                {isMicrophoneEnabled ? <Mic size={14} /> : <MicOff size={14} />}
            </button>

            {/* Expandir panel */}
            <button
                onClick={onExpand}
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:bg-white/15 transition-all active:scale-90"
                title="Abrir panel de voz"
            >
                <ChevronUp size={14} />
            </button>

            {/* Salir de la sala */}
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

// ═══════════════════════════════════════════════════════════════════════════════
// ParticipantsList — Lista de participantes con detección de eventos
// ═══════════════════════════════════════════════════════════════════════════════

function ParticipantsList() {
    const participants = useParticipants();
    const [soundEnabled, setSoundEnabled] = useState(true);

    // Mapa de estado anterior de participantes para detectar join/leave/mic
    const prevInfoRef = useRef(new Map());

    useEffect(() => {
        const currentIds = participants.map(p => p.sid);
        const prevIds    = Array.from(prevInfoRef.current.keys());

        // Detectar quién se unió
        const joined = participants.filter(p => !prevIds.includes(p.sid));
        // Detectar quién salió
        const left   = prevIds
            .filter(id => !currentIds.includes(id))
            .map(id => prevInfoRef.current.get(id));

        // Notificaciones de join (máximo 3 a la vez para no saturar)
        if (soundEnabled && joined.length > 0 && joined.length <= 3) {
            playSyntheticSound('join');
            joined.forEach(p => {
                toast(`🌌 ${p.name || 'Piloto'} ha entrado al universo.`, {
                    style: { background: '#080b14', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.2)' },
                    icon: '🚀',
                });
            });
        }

        // Notificaciones de leave
        if (soundEnabled && left.length > 0 && left.length <= 3) {
            playSyntheticSound('leave');
            left.forEach(p => {
                toast(`🌠 ${p?.name || 'Piloto'} ha abandonado la sala.`, {
                    style: { background: '#0f0505', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)' },
                    icon: '💨',
                });
            });
        }

        // Detectar cuando alguien activa el micrófono por primera vez
        participants.forEach(p => {
            const prev = prevInfoRef.current.get(p.sid);
            if (soundEnabled && prev && !prev.isMicrophoneEnabled && p.isMicrophoneEnabled) {
                playSyntheticSound('mic');
                toast(`🎙️ ${p.name || 'Piloto'} activó su micrófono.`, {
                    style: { background: '#050a14', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' },
                    duration: 2000,
                });
            }
        });

        // Actualizar mapa de estado anterior
        const newMap = new Map();
        participants.forEach(p => newMap.set(p.sid, {
            name:               p.name,
            isMicrophoneEnabled: p.isMicrophoneEnabled,
        }));
        prevInfoRef.current = newMap;

    }, [participants, soundEnabled]);

    return (
        <div className="flex flex-col gap-3 relative">
            {/* Header con toggle de sonidos */}
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
                <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold">
                    Actividad Espacial
                </span>
                <button
                    onClick={() => setSoundEnabled(s => !s)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase transition-all ${
                        soundEnabled
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            : 'bg-white/5 text-white/30 border border-transparent hover:bg-white/10'
                    }`}
                >
                    {soundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
                    {soundEnabled ? 'Sonidos Activos' : 'Silenciado'}
                </button>
            </div>

            {/* Tarjetas de participantes */}
            {participants.map((p) => {
                // Metadata del participante (avatar, frame, nivel, etc.)
                let meta = {};
                try { meta = p.metadata ? JSON.parse(p.metadata) : {}; } catch (_) { }

                const frame     = getFrameStyle(meta.frameId);
                const nickClass = getNicknameClass({ nickname_style: meta.nicknameStyle });

                return (
                    <div
                        key={p.sid}
                        className={`flex items-center justify-between p-4 rounded-[1.5rem] border transition-all duration-500 ${
                            p.isSpeaking
                                ? 'bg-cyan-500/10 border-cyan-400/50 shadow-[0_0_25px_rgba(34,211,238,0.2)] scale-[1.02]'
                                : 'bg-white/[0.03] border-white/5'
                        }`}
                    >
                        <div className="flex items-center gap-4">
                            {/* Avatar con halo de voz */}
                            <div className="relative w-12 h-12 flex items-center justify-center">
                                <AnimatePresence>
                                    {p.isSpeaking && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 0.5, scale: 1.2 }}
                                            exit={{ opacity: 0, scale: 1.5 }}
                                            transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
                                            className="absolute inset-0 bg-cyan-400/20 rounded-full blur-md"
                                        />
                                    )}
                                </AnimatePresence>
                                <div className={`relative w-10 h-10 ${frame.className || ''}`} style={frame}>
                                    <img
                                        src={meta.avatar || '/default-avatar.png'}
                                        alt="Avatar"
                                        className="w-full h-full object-cover rounded-full"
                                    />
                                </div>
                            </div>

                            {/* Nombre y estado */}
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className={`text-[11px] font-black uppercase tracking-widest ${nickClass || 'text-white'}`}>
                                        {p.name || 'Piloto'}
                                    </h4>
                                    {/* Nivel de actividad */}
                                    <div
                                        className="flex items-center gap-0.5 bg-violet-500/10 border border-violet-500/20 rounded-full px-1.5 py-0.5"
                                        title="Nivel de Actividad"
                                    >
                                        <Flame size={8} className="text-violet-400 fill-current" />
                                        <span className="text-[8px] font-black text-violet-300">
                                            {meta.activityLevel || 1}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${p.isSpeaking ? 'bg-cyan-400 animate-pulse' : 'bg-white/20'}`} />
                                    <span className="text-[7px] font-bold text-white/30 uppercase tracking-[0.2em]">
                                        {p.isSpeaking ? 'Hablando' : 'En línea'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Indicador de micrófono */}
                        <MuteIndicator participant={p} />
                    </div>
                );
            })}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ChatPanel — Chat de texto temporal de la sala de voz
// ═══════════════════════════════════════════════════════════════════════════════

function ChatPanel() {
    const { send, chatMessages } = useChat();
    const [input,    setInput]   = useState('');
    const scrollRef              = useRef();

    // Auto-scroll al último mensaje
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatMessages]);

    const handleSend = () => {
        if (!input.trim()) return;
        send(input.trim());
        setInput('');
    };

    return (
        <div className="flex flex-col h-[300px] gap-4">
            {/* Lista de mensajes */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 no-scrollbar pr-2">
                {chatMessages.length === 0 && (
                    <div className="h-full flex items-center justify-center text-[9px] uppercase font-black text-white/10 tracking-[0.3em]">
                        Frecuencia limpia...
                    </div>
                )}
                {chatMessages.map((msg, i) => (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={i}
                        className="bg-white/[0.03] border border-white/5 p-3 rounded-2xl"
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">
                                @{msg.from?.name || 'Anon'}
                            </span>
                            <span className="text-[7px] text-white/20">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <p className="text-[10px] text-white/70 leading-relaxed">{msg.message}</p>
                    </motion.div>
                ))}
            </div>

            {/* Input de mensaje */}
            <div className="relative group">
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSend()}
                    placeholder="Escribe en el canal..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-6 pr-14 text-[11px] text-white placeholder:text-white/20 outline-none focus:border-cyan-500/50 transition-all"
                />
                <button
                    onClick={handleSend}
                    className="absolute right-2 top-2 bottom-2 px-4 rounded-xl bg-cyan-500 text-black hover:bg-cyan-400 transition-all scale-90 group-focus-within:scale-100"
                >
                    <Send size={14} />
                </button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Componentes de control de audio
// ═══════════════════════════════════════════════════════════════════════════════

/** Indicador visual del estado del micrófono de un participante */
function MuteIndicator({ participant }) {
    if (!participant.isMicrophoneEnabled) {
        return (
            <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                <MicOff size={12} className="text-rose-500" />
            </div>
        );
    }
    return (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
            participant.isSpeaking
                ? 'bg-cyan-500/20 border-cyan-400/40'
                : 'bg-emerald-500/5 border-emerald-500/20'
        }`}>
            <Mic size={12} className={participant.isSpeaking ? 'text-cyan-400' : 'text-emerald-500/40'} />
        </div>
    );
}

/** Botón de toggle de micrófono propio (con manejo de error) */
function MuteToggle() {
    const { isMicrophoneEnabled, localParticipant } = useLocalParticipant();

    const handleToggle = async () => {
        if (!localParticipant) return;
        try {
            await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
        } catch (err) {
            console.error('[Voice] Error al cambiar estado del micrófono:', err);
            toast.error('No se pudo acceder al micrófono');
        }
    };

    return (
        <button
            onClick={handleToggle}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-xl ${
                isMicrophoneEnabled
                    ? 'bg-white/90 text-black hover:bg-white scale-110'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
            }`}
            title={isMicrophoneEnabled ? 'Silenciar micrófono' : 'Activar micrófono'}
        >
            {isMicrophoneEnabled ? <Mic size={24} /> : <MicOff size={24} />}
        </button>
    );
}

/** Botón de toggle de compartir pantalla */
function ScreenShareToggle() {
    const { isScreenShareEnabled, localParticipant } = useLocalParticipant();

    const handleToggle = async () => {
        if (!localParticipant) return;
        try {
            await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
        } catch (err) {
            console.error('[Voice] Error al cambiar pantalla compartida:', err);
            toast.error('No se pudo iniciar la transmisión de pantalla');
        }
    };

    return (
        <button
            onClick={handleToggle}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-xl ${
                isScreenShareEnabled
                    ? 'bg-cyan-500 text-black scale-110 shadow-cyan-500/20'
                    : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
            }`}
            title={isScreenShareEnabled ? 'Dejar de compartir pantalla' : 'Transmitir pantalla'}
        >
            {isScreenShareEnabled ? <MonitorOff size={24} /> : <Monitor size={24} />}
        </button>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ScreenSharePanel — Visualizador de transmisiones de pantalla activas
// ═══════════════════════════════════════════════════════════════════════════════

function ScreenSharePanel({ isTheater, onToggleTheater }) {
    const screenTracks = useTracks([Track.Source.ScreenShare]);

    // No renderizar nada si no hay transmisiones activas
    if (screenTracks.length === 0) return null;

    return (
        <div className={`transition-all duration-500 ${isTheater ? 'h-full w-full mb-0' : 'mb-8'}`}>
            {/* Label (oculto en modo cine) */}
            {!isTheater && (
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400">
                        Transmisiones de Pantalla
                    </span>
                </div>
            )}

            {/* Grid de transmisiones */}
            <div className={`grid gap-4 ${isTheater ? 'grid-cols-1 h-full' : 'grid-cols-1'}`}>
                {screenTracks.map((trackRef) => (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key={trackRef.participant.sid}
                        className={`bg-black overflow-hidden border border-white/10 relative group transition-all duration-500 ${
                            isTheater
                                ? 'h-full w-full rounded-none border-none'
                                : 'rounded-3xl aspect-video'
                        }`}
                    >
                        {/* Video de la transmisión */}
                        <VideoTrack
                            trackRef={trackRef}
                            className="w-full h-full object-contain"
                        />

                        {/* Badge con nombre del transmisor */}
                        <div className={`absolute top-4 left-4 flex items-center gap-3 transition-opacity ${
                            isTheater ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
                        }`}>
                            <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                                <span className="text-[10px] font-black text-white uppercase tracking-wider">
                                    {trackRef.participant.identity}
                                </span>
                                <div className="px-1.5 py-0.5 rounded bg-red-500 text-[7px] font-black text-white uppercase animate-pulse">
                                    Live
                                </div>
                            </div>
                        </div>

                        {/* Botón de salir del modo cine */}
                        {isTheater && (
                            <button
                                onClick={onToggleTheater}
                                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md text-white/40 border border-white/10 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Salir del modo cine"
                            >
                                <Minimize2 size={16} />
                            </button>
                        )}

                        {/* Overlay con nombre al hacer hover */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                            <p className="text-[9px] font-black text-white/60 uppercase tracking-widest">
                                Compartiendo: {trackRef.participant.name || 'Piloto'}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
