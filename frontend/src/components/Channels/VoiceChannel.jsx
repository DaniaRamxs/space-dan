import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Volume2, Mic, Headphones, PhoneOff, Users, Settings, 
  MoreVertical, MessageSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { channelsService } from '../../services/channelsService';
import { liveActivitiesService } from '../../services/liveActivitiesService';
import toast from 'react-hot-toast';

export default function VoiceChannel({ channel, communityId, communityName, isMember, isOwner }) {
  const navigate = useNavigate();
  const [participants, setParticipants] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activity, setActivity] = useState(null);

  useEffect(() => {
    // Check if there's an existing activity for this channel
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
      setActivity(channelActivity);
      setParticipants(channelActivity?.participants || []);
    } catch (err) {
      console.error('[VoiceChannel] Check activity error:', err);
    }
  };

  const handleConnect = async () => {
    if (!isMember) {
      toast.error('Únete a la comunidad para usar la voz');
      return;
    }

    setLoading(true);
    try {
      let voiceActivity = activity;

      // Create activity if it doesn't exist
      if (!voiceActivity) {
        voiceActivity = await liveActivitiesService.createActivity({
          type: 'voice',
          title: channel.name,
          communityId: communityId,
          roomName: `channel-${channel.id}`,
          metadata: { 
            channelId: channel.id, 
            channelName: channel.name,
            communityId,
            communityName 
          }
        });
      }

      // Navigate to voice room
      navigate(`/chat?voice=channel-${voiceActivity.id}`);
      setIsConnected(true);
    } catch (err) {
      console.error('[VoiceChannel] Connect error:', err);
      toast.error('Error al conectar al canal de voz');
    } finally {
      setLoading(false);
    }
  };

  const ParticipantItem = ({ participant }) => (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
      <div className="relative">
        <img
          src={participant.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${participant.username}`}
          alt={participant.username}
          className="w-8 h-8 rounded-full bg-white/5"
        />
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#1a1a24]" />
      </div>
      <span className="text-sm text-gray-300">{participant.username}</span>
      <div className="flex-1" />
      {participant.isMuted && <Mic size={14} className="text-gray-500" />}
      {participant.isDeafened && <Headphones size={14} className="text-gray-500" />}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-[#0f0f13]">
      {/* Channel Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-white/5 bg-[#0f0f13]/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Volume2 size={20} className="text-emerald-400" />
          <div>
            <h3 className="font-semibold text-white">{channel?.name}</h3>
            <p className="text-xs text-gray-500">
              {participants.length > 0 
                ? `${participants.length} conectado${participants.length !== 1 ? 's' : ''}` 
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
          <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Participants List */}
        <div className="w-64 border-r border-white/5 p-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Conectados — {participants.length}
          </h4>
          <div className="space-y-1">
            {participants.length === 0 ? (
              <p className="text-sm text-gray-600 italic">Nadie conectado</p>
            ) : (
              participants.map((p, i) => <ParticipantItem key={i} participant={p} />)
            )}
          </div>
        </div>

        {/* Center Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {participants.length === 0 ? (
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <Volume2 size={48} className="text-emerald-400/50" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Canal vacío</h3>
              <p className="text-gray-500 mb-6">Sé el primero en unirte a esta sala de voz</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {participants.slice(0, 6).map((p, i) => (
                <div key={i} className="w-24 h-24 rounded-xl bg-white/5 flex items-center justify-center">
                  <img
                    src={p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.username}`}
                    alt={p.username}
                    className="w-16 h-16 rounded-full"
                  />
                </div>
              ))}
              {participants.length > 6 && (
                <div className="w-24 h-24 rounded-xl bg-white/5 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-500">+{participants.length - 6}</span>
                </div>
              )}
            </div>
          )}

          {/* Connect Button */}
          <button
            onClick={handleConnect}
            disabled={loading}
            className="mt-8 px-8 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-emerald-950 font-semibold transition-all flex items-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-emerald-950/30 border-t-emerald-950 rounded-full animate-spin" />
            ) : (
              <>
                <PhoneOff size={20} className="rotate-180" />
                Unirse al canal de voz
              </>
            )}
          </button>

          {isOwner && (
            <p className="mt-4 text-xs text-gray-500">
              Como owner, puedes moderar este canal
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
