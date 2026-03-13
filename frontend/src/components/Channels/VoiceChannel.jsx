import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2, Mic, MicOff, LogOut, Radio, Gamepad2,
} from 'lucide-react';
import {
  LiveKitRoom,
  useParticipants,
  useLocalParticipant,
  RoomAudioRenderer,
} from '@livekit/components-react';
import { supabase } from '../../supabaseClient';
import { liveActivitiesService } from '../../services/liveActivitiesService';
import { addVoicePoints } from '../../services/reputationService';
import { activityService } from '../../services/activityService';
import { missionService } from '../../services/missionService';
import { getNicknameClass } from '../../utils/user';
import { getFrameStyle } from '../../utils/styles';
import toast from 'react-hot-toast';

const VoiceActivityLauncher = lazy(() =>
  import('../VoiceActivities/VoiceActivityLauncher')
);

const LIVEKIT_URL = 'wss://danspace-76f5bceh.livekit.cloud';

// ── Sonido sintético ──────────────────────────────────────────────────────────
const playSyntheticSound = (type) => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    if (type === 'join') {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
    } else {
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    }
    osc.connect(gain);
    osc.start();
    osc.stop(ctx.currentTime + 0.7);
    osc.onended = () => ctx.close();
  } catch (_) {}
};

// ═══════════════════════════════════════════════════════════════════════════════
// CommunityVoiceTracker — XP global + reputación de comunidad (sin UI)
// ═══════════════════════════════════════════════════════════════════════════════
function CommunityVoiceTracker({ userId, communityId }) {
  const { isMicrophoneEnabled } = useLocalParticipant();
  const micRef = useRef(isMicrophoneEnabled);

  useEffect(() => { micRef.current = isMicrophoneEnabled; }, [isMicrophoneEnabled]);

  useEffect(() => {
    if (!userId || !communityId) return;

    const interval = setInterval(async () => {
      const micActive = micRef.current;
      // XP global del universo (igual que VoiceActivityTracker)
      const xp = micActive ? 15 : 5;
      try {
        await activityService.awardActivityXP(xp, 'voice_time');
        missionService.updateProgress('social', 2, 'voice_10').catch(() => {});
      } catch (_) {}

      // Puntos de reputación en la comunidad — solo si tiene mic activo
      if (micActive) {
        addVoicePoints(userId, communityId).catch(() => {});
      }
    }, 120_000); // cada 2 minutos

    return () => clearInterval(interval);
  }, [userId, communityId]);

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Fila compacta en sidebar
// ═══════════════════════════════════════════════════════════════════════════════
function ParticipantRow({ participant: p, meta }) {
  return (
    <div className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-all ${
      p.isSpeaking ? 'bg-emerald-500/10' : 'hover:bg-white/5'
    }`}>
      <div className="relative shrink-0">
        <img
          src={meta.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`}
          alt={p.name}
          className={`w-7 h-7 rounded-full object-cover ${
            p.isSpeaking ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-[#0f0f13]' : ''
          }`}
        />
        {p.isSpeaking && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0f0f13] animate-pulse" />
        )}
      </div>
      <span className={`text-sm truncate ${p.isSpeaking ? 'text-white' : 'text-gray-400'}`}>
        {p.name || 'Piloto'}
      </span>
      <div className="ml-auto shrink-0">
        {!p.isMicrophoneEnabled && <MicOff size={12} className="text-gray-600" />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tarjeta grande en área central
// ═══════════════════════════════════════════════════════════════════════════════
function ParticipantCard({ participant: p, meta, frame, nickClass }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="flex flex-col items-center gap-2"
    >
      <div className="relative">
        <AnimatePresence>
          {p.isSpeaking && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1.18 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, repeat: Infinity, repeatType: 'reverse' }}
              className="absolute inset-0 rounded-full bg-emerald-400/25 blur-md"
            />
          )}
        </AnimatePresence>
        <div
          className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 transition-all duration-300 ${
            p.isSpeaking
              ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)]'
              : 'border-white/10'
          } ${frame.className || ''}`}
          style={frame}
        >
          <img
            src={meta.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.name}`}
            alt={p.name}
            className="w-full h-full object-cover"
          />
        </div>
        {!p.isMicrophoneEnabled && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-rose-500/90 rounded-full flex items-center justify-center border-2 border-[#0f0f13]">
            <MicOff size={10} className="text-white" />
          </div>
        )}
      </div>
      <span className={`text-xs font-semibold text-center max-w-[80px] truncate ${nickClass || 'text-white'}`}>
        {p.name || 'Piloto'}
      </span>
      <span className={`text-[10px] font-medium ${p.isSpeaking ? 'text-emerald-400' : 'text-gray-600'}`}>
        {p.isSpeaking ? 'Hablando...' : 'En silencio'}
      </span>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Componente interno — dentro de <LiveKitRoom>
// ═══════════════════════════════════════════════════════════════════════════════
function VoiceChannelInner({ channel, communityId, userId, roomName, onLeave }) {
  const participants = useParticipants();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const [showParticipants, setShowParticipants] = useState(false);
  const [activeTab, setActiveTab] = useState('participants'); // 'participants' | 'activities'
  const [activeActivity, setActiveActivity] = useState(null);
  const activeActivityRef = useRef(null);
  const syncChannelRef = useRef(null);
  const activityChannelRef = useRef(null);
  const prevIdsRef = useRef(new Set());

  useEffect(() => { activeActivityRef.current = activeActivity; }, [activeActivity]);

  // ── Sincronización de actividades via Supabase broadcast ──────────────────
  useEffect(() => {
    if (!roomName) return;
    const chanName = `activity-sync-${roomName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const channel = supabase.channel(chanName);
    syncChannelRef.current = channel;

    channel
      .on('broadcast', { event: 'start_activity' }, ({ payload }) => {
        if (payload.activityId && payload.activityId !== activeActivityRef.current) {
          setActiveActivity(payload.activityId);
          toast(`🔥 ${payload.sender} inició ${payload.activityId}`, {
            icon: '🎮',
            style: { background: '#020617', color: '#fff', border: '1px solid #334155' },
          });
        }
      })
      .on('broadcast', { event: 'stop_activity' }, () => {
        setActiveActivity(null);
      })
      .on('broadcast', { event: 'activity_sync_req' }, () => {
        const current = activeActivityRef.current;
        if (current) {
          channel.send({
            type: 'broadcast', event: 'start_activity',
            payload: { activityId: current, sender: 'Sistema (Sync)' },
          });
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({ type: 'broadcast', event: 'activity_sync_req', payload: {} });
        }
      });

    return () => {
      syncChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [roomName]);

  // ── Canal de actividad específica ────────────────────────────────────────
  useEffect(() => {
    if (!activeActivity) {
      if (activityChannelRef.current) {
        supabase.removeChannel(activityChannelRef.current);
        activityChannelRef.current = null;
      }
      return;
    }
    const chanName = `activity-${activeActivity}-${roomName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const ch = supabase.channel(chanName);
    activityChannelRef.current = ch;
    ch.subscribe();
    return () => {
      activityChannelRef.current = null;
      supabase.removeChannel(ch);
    };
  }, [activeActivity, roomName]);

  // ── Broadcast de cambio de actividad a otros usuarios ────────────────────
  const handleSetActiveActivity = (id) => {
    setActiveActivity(id);
    const ch = syncChannelRef.current;
    if (!ch) return;
    if (id) {
      ch.send({
        type: 'broadcast', event: 'start_activity',
        payload: { activityId: id, sender: 'Tú' },
      });
    } else {
      ch.send({ type: 'broadcast', event: 'stop_activity', payload: {} });
    }
  };

  // ── Detectar join/leave ───────────────────────────────────────────────────
  useEffect(() => {
    const currentIds = new Set(participants.map(p => p.sid));
    participants.forEach(p => {
      if (!prevIdsRef.current.has(p.sid) && prevIdsRef.current.size > 0) {
        playSyntheticSound('join');
        toast(`🌌 ${p.name || 'Piloto'} entró al canal`, {
          style: { background: '#080b14', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.2)' },
          icon: '🚀', duration: 2500,
        });
      }
    });
    prevIdsRef.current.forEach(id => {
      if (!currentIds.has(id)) playSyntheticSound('leave');
    });
    prevIdsRef.current = currentIds;
  }, [participants]);

  const toggleMic = () => localParticipant?.setMicrophoneEnabled(!isMicrophoneEnabled);

  return (
    <div className="flex-1 flex flex-col bg-[#0f0f13] overflow-hidden min-h-0">
      {/* Tracker silencioso de XP + reputación */}
      <CommunityVoiceTracker userId={userId} communityId={communityId} />

      {/* Header */}
      <div className="h-14 flex items-center justify-between px-3 sm:px-4 border-b border-white/5 bg-[#0f0f13]/95 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Volume2 size={18} className="text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <h3 className="font-semibold text-white text-sm sm:text-base truncate">{channel?.name}</h3>
            <p className="text-xs text-emerald-400/70">
              {participants.length} conectado{participants.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {/* Botón participantes mobile */}
        <button
          onClick={() => setShowParticipants(v => !v)}
          className="sm:hidden p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors relative"
          aria-label="Ver participantes"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          {participants.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-emerald-500 text-[9px] font-bold text-black rounded-full flex items-center justify-center">
              {participants.length}
            </span>
          )}
        </button>
      </div>

      {/* Cuerpo */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar participantes — solo sm+ */}
        <div className="hidden sm:flex w-48 md:w-56 border-r border-white/5 flex-col shrink-0">
          <div className="px-3 py-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Conectados — {participants.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
            {participants.length === 0 ? (
              <p className="px-2 text-xs text-gray-600 italic">Nadie conectado</p>
            ) : (
              participants.map(p => {
                let meta = {};
                try { meta = p.metadata ? JSON.parse(p.metadata) : {}; } catch (_) {}
                return <ParticipantRow key={p.sid} participant={p} meta={meta} />;
              })
            )}
          </div>
        </div>

        {/* Área central */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">

          {/* Tabs: Sala / Actividades */}
          <div className="flex border-b border-white/5 shrink-0">
            <button
              onClick={() => setActiveTab('participants')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all ${
                activeTab === 'participants'
                  ? 'text-emerald-400 border-b-2 border-emerald-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Sala
            </button>
            <button
              onClick={() => setActiveTab('activities')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all ${
                activeTab === 'activities'
                  ? 'text-violet-400 border-b-2 border-violet-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Gamepad2 size={13} />
              Actividades
              {activeActivity && (
                <span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
              )}
            </button>
          </div>

          {/* Contenido del tab */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'participants' ? (
              /* ── Tab Sala: avatares grandes ────────────────── */
              <div className="flex items-center justify-center p-4 sm:p-6 min-h-full">
                {participants.length === 0 ? (
                  <div className="text-center">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                      <Volume2 size={36} className="text-emerald-400/50" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-1">Canal vacío</h3>
                    <p className="text-sm text-gray-500">Eres el primero, ¡invita a alguien!</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 max-w-xl">
                    {participants.map(p => {
                      let meta = {};
                      try { meta = p.metadata ? JSON.parse(p.metadata) : {}; } catch (_) {}
                      const frame = getFrameStyle(meta.frameId);
                      const nickClass = getNicknameClass({ nickname_style: meta.nicknameStyle });
                      return (
                        <ParticipantCard key={p.sid} participant={p} meta={meta} frame={frame} nickClass={nickClass} />
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* ── Tab Actividades ────────────────────────────── */
              <div className="p-3 sm:p-4">
                <Suspense fallback={
                  <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" />
                  </div>
                }>
                  <VoiceActivityLauncher
                    roomName={roomName}
                    activeActivity={activeActivity}
                    setActiveActivity={handleSetActiveActivity}
                    activityChannelRef={activityChannelRef}
                  />
                </Suspense>
              </div>
            )}
          </div>

          {/* Barra de controles */}
          <div className="h-14 sm:h-16 border-t border-white/5 bg-[#0f0f13]/90 flex items-center justify-center gap-2 sm:gap-3 px-3 shrink-0">
            <button
              onClick={toggleMic}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isMicrophoneEnabled
                  ? 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
              }`}
            >
              {isMicrophoneEnabled ? <Mic size={15} /> : <MicOff size={15} />}
              <span className="hidden sm:inline">
                {isMicrophoneEnabled ? 'Silenciar' : 'Activar mic'}
              </span>
            </button>
            <button
              onClick={onLeave}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30 transition-all"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Desconectar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Drawer mobile de participantes */}
      <AnimatePresence>
        {showParticipants && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="sm:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowParticipants(false)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="sm:hidden fixed bottom-0 left-0 right-0 bg-[#1a1a24] border-t border-white/10 rounded-t-2xl z-50 max-h-[60vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <span className="font-semibold text-white text-sm">
                  Conectados — {participants.length}
                </span>
                <button onClick={() => setShowParticipants(false)} className="text-gray-400 p-1">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto p-3 space-y-0.5">
                {participants.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 py-6">Nadie conectado aún</p>
                ) : (
                  participants.map(p => {
                    let meta = {};
                    try { meta = p.metadata ? JSON.parse(p.metadata) : {}; } catch (_) {}
                    return <ParticipantRow key={p.sid} participant={p} meta={meta} />;
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL: VoiceChannel
// ═══════════════════════════════════════════════════════════════════════════════
export default function VoiceChannel({
  channel,
  communityId,
  communityName,
  isMember,
  isOwner,
  onJoinVoice,
  userAvatar,
  userName,
  nicknameStyle,
  frameId,
  activityLevel,
  userId,
}) {
  const [token, setToken] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [previewParticipants, setPreviewParticipants] = useState([]);

  useEffect(() => {
    checkExistingActivity();
    const id = setInterval(checkExistingActivity, 10000);
    return () => clearInterval(id);
  }, [channel?.id]);

  const checkExistingActivity = async () => {
    try {
      const activities = await liveActivitiesService.getTrendingActivities({ type: 'voice', limit: 20 });
      const found = activities.find(a =>
        a.metadata?.channelId === channel?.id || a.room_name?.includes(channel?.id)
      );
      setPreviewParticipants(found?.participants || []);
    } catch (err) {
      console.error('[VoiceChannel] Check activity error:', err);
    }
  };

  const handleConnect = async () => {
    if (!isMember) { toast.error('Únete a la comunidad para usar la voz'); return; }
    setConnecting(true);
    setError(null);
    try {
      const activities = await liveActivitiesService.getTrendingActivities({ type: 'voice', limit: 20 });
      const existing = activities.find(a =>
        a.metadata?.channelId === channel?.id || a.room_name?.includes(channel?.id)
      );
      if (!existing) {
        await liveActivitiesService.createActivity({
          type: 'voice', title: channel.name, communityId,
          roomName: `channel-${channel.id}`,
          metadata: { channelId: channel.id, channelName: channel.name, communityId, communityName },
        });
      }
      const { data: { session } } = await supabase.auth.getSession();
      const participantName = userName || session?.user?.user_metadata?.username || 'Piloto';
      const roomName = `channel-${channel.id}`;
      const { data, error: fnError } = await supabase.functions.invoke('livekit-token', {
        body: { roomName, participantName, userAvatar, nicknameStyle, frameId, activityLevel },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      setToken(data.token);
      setConnected(true);
      onJoinVoice?.(roomName, channel.name);
    } catch (err) {
      console.error('[VoiceChannel] Connect error:', err);
      setError('Error al conectar. Intenta de nuevo.');
      toast.error('Error al conectar al canal de voz');
    } finally {
      setConnecting(false);
    }
  };

  const handleLeave = () => { setToken(null); setConnected(false); setError(null); };

  // ── Vista conectada ────────────────────────────────────────────────────────
  if (connected && token) {
    const roomName = `channel-${channel.id}`;
    return (
      <LiveKitRoom
        audio={true} video={false}
        token={token} serverUrl={LIVEKIT_URL}
        onDisconnected={handleLeave}
        className="flex-1 flex flex-col min-w-0 min-h-0"
        style={{ display: 'contents' }}
      >
        <RoomAudioRenderer />
        <VoiceChannelInner
          channel={channel}
          communityId={communityId}
          userId={userId}
          roomName={roomName}
          onLeave={handleLeave}
        />
      </LiveKitRoom>
    );
  }

  // ── Vista desconectada ─────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col bg-[#0f0f13] min-h-0">
      <div className="h-14 flex items-center justify-between px-3 sm:px-4 border-b border-white/5 bg-[#0f0f13]/95 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <Volume2 size={18} className="text-emerald-400 shrink-0" />
          <div>
            <h3 className="font-semibold text-white text-sm sm:text-base">{channel?.name}</h3>
            <p className="text-xs text-gray-500">
              {previewParticipants.length > 0
                ? `${previewParticipants.length} conectado${previewParticipants.length !== 1 ? 's' : ''}`
                : 'Canal de voz vacío'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar preview — solo sm+ */}
        <div className="hidden sm:flex w-48 md:w-56 border-r border-white/5 flex-col shrink-0">
          <div className="px-3 py-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Conectados — {previewParticipants.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
            {previewParticipants.length === 0 ? (
              <p className="px-2 text-xs text-gray-600 italic">Nadie conectado</p>
            ) : (
              previewParticipants.map((p, i) => (
                <div key={i} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/5">
                  <img
                    src={p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.username}`}
                    alt={p.username} className="w-7 h-7 rounded-full object-cover"
                  />
                  <span className="text-sm text-gray-400 truncate">{p.username}</span>
                  {p.isMuted && <MicOff size={12} className="ml-auto text-gray-600 shrink-0" />}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 gap-5">
          {previewParticipants.length === 0 ? (
            <>
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Volume2 size={36} className="text-emerald-400/50" />
              </div>
              <div className="text-center">
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-1 sm:mb-2">Canal vacío</h3>
                <p className="text-gray-500 text-sm">Sé el primero en unirte a esta sala de voz</p>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 max-w-md sm:max-w-xl mb-2">
              {previewParticipants.slice(0, 8).map((p, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <img
                    src={p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.username}`}
                    alt={p.username}
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-white/10"
                  />
                  <span className="text-xs text-gray-400">{p.username}</span>
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-2 text-center">
              {error}
            </p>
          )}

          <button
            onClick={handleConnect}
            disabled={connecting || !isMember}
            className="px-6 sm:px-8 py-2.5 sm:py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-emerald-950 font-semibold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 text-sm sm:text-base"
          >
            {connecting ? (
              <>
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-emerald-950/30 border-t-emerald-950 rounded-full animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <Radio size={18} />
                Unirse al canal de voz
              </>
            )}
          </button>

          {!isMember && <p className="text-xs text-gray-600 text-center">Únete a la comunidad para acceder a la voz</p>}
          {isOwner && isMember && <p className="text-xs text-gray-600">Como owner, puedes moderar este canal</p>}
        </div>
      </div>
    </div>
  );
}
