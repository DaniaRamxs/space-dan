import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2, Mic, MicOff, Headphones, PhoneOff, Users,
  Settings, MoreVertical, LogOut, Radio,
} from 'lucide-react';
import {
  LiveKitRoom,
  useParticipants,
  useLocalParticipant,
  RoomAudioRenderer,
} from '@livekit/components-react';
import { supabase } from '../../supabaseClient';
import { liveActivitiesService } from '../../services/liveActivitiesService';
import { getNicknameClass } from '../../utils/user';
import { getFrameStyle } from '../../utils/styles';
import toast from 'react-hot-toast';

const LIVEKIT_URL = 'wss://danspace-76f5bceh.livekit.cloud';

// ── Sonido sintético de entrada/salida ────────────────────────────────────────
const playSyntheticSound = (type) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
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
      osc.connect(gain);
      osc.start();
      osc.stop(ctx.currentTime + 0.7);
    } else {
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gain);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
    osc.onended = () => ctx.close();
  } catch (_) {}
};

// ═══════════════════════════════════════════════════════════════════════════════
// Componente interno (debe estar dentro de <LiveKitRoom>)
// ═══════════════════════════════════════════════════════════════════════════════
function VoiceChannelInner({ channel, isOwner, onLeave }) {
  const participants = useParticipants();
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const prevIdsRef = useRef(new Set());

  // Detectar join / leave para toasts y sonidos
  useEffect(() => {
    const currentIds = new Set(participants.map(p => p.sid));
    const prevIds = prevIdsRef.current;

    participants.forEach(p => {
      if (!prevIds.has(p.sid) && prevIds.size > 0) {
        playSyntheticSound('join');
        toast(`🌌 ${p.name || 'Piloto'} entró al canal`, {
          style: { background: '#080b14', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.2)' },
          icon: '🚀',
          duration: 2500,
        });
      }
    });

    prevIds.forEach(id => {
      if (!currentIds.has(id)) {
        playSyntheticSound('leave');
      }
    });

    prevIdsRef.current = currentIds;
  }, [participants]);

  const toggleMic = () => {
    localParticipant?.setMicrophoneEnabled(!isMicrophoneEnabled);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0f0f13] overflow-hidden">
      {/* Header del canal */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-white/5 bg-[#0f0f13]/95 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <Volume2 size={20} className="text-emerald-400" />
          <div>
            <h3 className="font-semibold text-white">{channel?.name}</h3>
            <p className="text-xs text-emerald-400/70">
              {participants.length} conectado{participants.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <Users size={18} />
          </button>
          <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <Settings size={18} />
          </button>
          <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      {/* Cuerpo: lista lateral + área central */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar izquierdo: participantes */}
        <div className="w-56 border-r border-white/5 flex flex-col bg-[#0f0f13] shrink-0">
          <div className="px-4 py-3">
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
                return (
                  <ParticipantRow key={p.sid} participant={p} meta={meta} />
                );
              })
            )}
          </div>
        </div>

        {/* Área central: avatares grandes estilo Discord */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex items-center justify-center p-6">
            {participants.length === 0 ? (
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <Volume2 size={40} className="text-emerald-400/50" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">Canal vacío</h3>
                <p className="text-sm text-gray-500">Eres el primero, ¡invita a alguien!</p>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-6 max-w-2xl">
                {participants.map(p => {
                  let meta = {};
                  try { meta = p.metadata ? JSON.parse(p.metadata) : {}; } catch (_) {}
                  const frame = getFrameStyle(meta.frameId);
                  const nickClass = getNicknameClass({ nickname_style: meta.nicknameStyle });
                  return (
                    <ParticipantCard
                      key={p.sid}
                      participant={p}
                      meta={meta}
                      frame={frame}
                      nickClass={nickClass}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Barra de controles inferior */}
          <div className="h-16 border-t border-white/5 bg-[#0f0f13]/90 backdrop-blur-sm flex items-center justify-center gap-3 px-4 shrink-0">
            {/* Micrófono */}
            <button
              onClick={toggleMic}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isMicrophoneEnabled
                  ? 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
              }`}
            >
              {isMicrophoneEnabled ? <Mic size={16} /> : <MicOff size={16} />}
              <span className="hidden sm:inline">
                {isMicrophoneEnabled ? 'Silenciar' : 'Activar mic'}
              </span>
            </button>

            {/* Salir */}
            <button
              onClick={onLeave}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30 transition-all"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Desconectar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Fila compacta en el sidebar ───────────────────────────────────────────────
function ParticipantRow({ participant: p, meta }) {
  return (
    <div
      className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-all ${
        p.isSpeaking ? 'bg-emerald-500/10' : 'hover:bg-white/5'
      }`}
    >
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

// ── Tarjeta grande en el área central ────────────────────────────────────────
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
        {/* Halo cuando habla */}
        <AnimatePresence>
          {p.isSpeaking && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1.15 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, repeat: Infinity, repeatType: 'reverse' }}
              className="absolute inset-0 rounded-full bg-emerald-400/25 blur-md"
            />
          )}
        </AnimatePresence>

        {/* Avatar */}
        <div
          className={`relative w-20 h-20 rounded-full overflow-hidden border-2 transition-all duration-300 ${
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

        {/* Indicador de mic apagado */}
        {!p.isMicrophoneEnabled && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-rose-500/90 rounded-full flex items-center justify-center border-2 border-[#0f0f13]">
            <MicOff size={11} className="text-white" />
          </div>
        )}
      </div>

      {/* Nombre */}
      <span className={`text-xs font-semibold text-center max-w-[90px] truncate ${nickClass || 'text-white'}`}>
        {p.name || 'Piloto'}
      </span>

      {/* Estado de voz */}
      <span className={`text-[10px] font-medium ${p.isSpeaking ? 'text-emerald-400' : 'text-gray-600'}`}>
        {p.isSpeaking ? 'Hablando...' : 'En silencio'}
      </span>
    </motion.div>
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
  // props de perfil (pasados desde CommunityChannelsPage)
  userAvatar,
  userName,
  nicknameStyle,
  frameId,
  activityLevel,
}) {
  const [token, setToken] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [previewParticipants, setPreviewParticipants] = useState([]);

  // Polling de participantes mientras no estamos conectados
  useEffect(() => {
    checkExistingActivity();
    const interval = setInterval(checkExistingActivity, 10000);
    return () => clearInterval(interval);
  }, [channel?.id]);

  const checkExistingActivity = async () => {
    try {
      const activities = await liveActivitiesService.getTrendingActivities({ type: 'voice', limit: 20 });
      const channelActivity = activities.find(a =>
        a.metadata?.channelId === channel?.id ||
        a.room_name?.includes(channel?.id)
      );
      setPreviewParticipants(channelActivity?.participants || []);
    } catch (err) {
      console.error('[VoiceChannel] Check activity error:', err);
    }
  };

  const handleConnect = async () => {
    if (!isMember) {
      toast.error('Únete a la comunidad para usar la voz');
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      // Crear/asegurar actividad en el servidor
      const activities = await liveActivitiesService.getTrendingActivities({ type: 'voice', limit: 20 });
      const existing = activities.find(a =>
        a.metadata?.channelId === channel?.id || a.room_name?.includes(channel?.id)
      );
      if (!existing) {
        await liveActivitiesService.createActivity({
          type: 'voice',
          title: channel.name,
          communityId,
          roomName: `channel-${channel.id}`,
          metadata: { channelId: channel.id, channelName: channel.name, communityId, communityName },
        });
      }

      // Obtener token de LiveKit
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

  const handleLeave = () => {
    setToken(null);
    setConnected(false);
    setError(null);
  };

  // ── Vista conectada: LiveKit embebido ──────────────────────────────────────
  if (connected && token) {
    return (
      <LiveKitRoom
        audio={true}
        video={false}
        token={token}
        serverUrl={LIVEKIT_URL}
        onDisconnected={handleLeave}
        className="flex-1 flex flex-col min-w-0"
        style={{ display: 'contents' }}
      >
        <RoomAudioRenderer />
        <VoiceChannelInner channel={channel} isOwner={isOwner} onLeave={handleLeave} />
      </LiveKitRoom>
    );
  }

  // ── Vista desconectada ─────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col bg-[#0f0f13]">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-white/5 bg-[#0f0f13]/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Volume2 size={20} className="text-emerald-400" />
          <div>
            <h3 className="font-semibold text-white">{channel?.name}</h3>
            <p className="text-xs text-gray-500">
              {previewParticipants.length > 0
                ? `${previewParticipants.length} conectado${previewParticipants.length !== 1 ? 's' : ''}`
                : 'Canal de voz vacío'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <Users size={18} />
          </button>
          <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Cuerpo */}
      <div className="flex-1 flex">
        {/* Sidebar de participantes (preview) */}
        <div className="w-56 border-r border-white/5 flex flex-col shrink-0">
          <div className="px-4 py-3">
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
                    alt={p.username}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                  <span className="text-sm text-gray-400 truncate">{p.username}</span>
                  {p.isMuted && <MicOff size={12} className="ml-auto text-gray-600 shrink-0" />}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Área central */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6">
          {previewParticipants.length === 0 ? (
            <>
              <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Volume2 size={48} className="text-emerald-400/50" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-white mb-2">Canal vacío</h3>
                <p className="text-gray-500 text-sm">Sé el primero en unirte a esta sala de voz</p>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-6 max-w-xl mb-2">
              {previewParticipants.slice(0, 8).map((p, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <img
                    src={p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.username}`}
                    alt={p.username}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white/10"
                  />
                  <span className="text-xs text-gray-400">{p.username}</span>
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleConnect}
            disabled={connecting || !isMember}
            className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-emerald-950 font-semibold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            {connecting ? (
              <>
                <div className="w-5 h-5 border-2 border-emerald-950/30 border-t-emerald-950 rounded-full animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <Radio size={20} />
                Unirse al canal de voz
              </>
            )}
          </button>

          {!isMember && (
            <p className="text-xs text-gray-600">Únete a la comunidad para acceder a la voz</p>
          )}
          {isOwner && isMember && (
            <p className="text-xs text-gray-600">Como owner, puedes moderar este canal</p>
          )}
        </div>
      </div>
    </div>
  );
}
