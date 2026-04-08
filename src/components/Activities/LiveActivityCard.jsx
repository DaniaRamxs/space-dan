/**
 * Live Activity Card Component
 * Displays live activity with participant count and join button
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Eye, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ACTIVITY_ICONS = {
  voice: '🎙️',
  watch: '📺',
  music: '🎵',
  game: '🎮',
  interactive: '✨'
};

export default function LiveActivityCard({ activity, onJoin }) {
  const navigate = useNavigate();
  const [durationText, setDurationText] = useState('0m');

  useEffect(() => {
    const updateDuration = () => {
      const duration = Math.floor((Date.now() - new Date(activity.created_at).getTime()) / 60000);
      setDurationText(duration < 60 ? `${duration}m` : `${Math.floor(duration / 60)}h`);
    };
    updateDuration();
    const interval = setInterval(updateDuration, 60000);
    return () => clearInterval(interval);
  }, [activity.created_at]);

  const handleJoin = (e) => {
    e.stopPropagation();
    if (onJoin) {
      onJoin(activity.id);
    } else {
      navigate(`/activity/${activity.id}`);
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 hover:border-cyan-500/30 transition-all cursor-pointer"
      onClick={() => navigate(`/activity/${activity.id}`)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{ACTIVITY_ICONS[activity.type] || '✨'}</span>
          <div>
            <h4 className="text-sm font-bold text-white/90">
              {activity.title}
            </h4>
            {activity.community && (
              <p className="text-[10px] text-white/40 uppercase tracking-wider">
                {activity.community.name}
              </p>
            )}
          </div>
        </div>

        {/* Duration */}
        <div className="flex items-center gap-1 text-[10px] text-white/40">
          <Clock size={10} />
          <span>{durationText}</span>
        </div>
      </div>

      {/* Host */}
      <div className="flex items-center gap-2 mb-3">
        <img 
          src={activity.host?.avatar_url || '/default-avatar.png'} 
          alt={activity.host?.username}
          className="w-6 h-6 rounded-full"
        />
        <span className="text-xs text-white/60">
          {activity.host?.username || 'Anonymous'}
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5">
          <Users size={14} className="text-cyan-400" />
          <span className="text-xs font-bold text-cyan-300">
            {activity.participant_count || 0}
          </span>
          <span className="text-[10px] text-white/40">activos</span>
        </div>

        {activity.spectator_count > 0 && (
          <div className="flex items-center gap-1.5">
            <Eye size={14} className="text-purple-400" />
            <span className="text-xs font-bold text-purple-300">
              {activity.spectator_count}
            </span>
            <span className="text-[10px] text-white/40">viendo</span>
          </div>
        )}
      </div>

      {/* Join Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-full py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-xs font-bold text-cyan-300 uppercase tracking-wider transition-all"
        onClick={handleJoin}
      >
        Unirse
      </motion.button>
    </motion.div>
  );
}
