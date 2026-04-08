/**
 * Community Card Component
 * Displays community info with live activity indicators
 */

import { motion } from 'framer-motion';
import { Users, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CommunityCard({ community, activities = [] }) {
  const navigate = useNavigate();

  const liveActivities = activities.filter(a => a.status === 'active').slice(0, 3);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 cursor-pointer hover:border-cyan-500/30 transition-all"
      onClick={() => navigate(`/community/${community.slug}`)}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        {community.avatar_url ? (
          <img 
            src={community.avatar_url} 
            alt={community.name}
            className="w-12 h-12 rounded-xl object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
            <Users size={20} className="text-cyan-400" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-white/90 truncate">
            {community.name}
          </h3>
          <p className="text-[10px] text-white/40 uppercase tracking-wider">
            {community.member_count?.toLocaleString() || 0} miembros
          </p>
        </div>
      </div>

      {/* Description */}
      {community.description && (
        <p className="text-xs text-white/60 mb-4 line-clamp-2">
          {community.description}
        </p>
      )}

      {/* Live Activities */}
      {liveActivities.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400/60">
            <Activity size={12} />
            <span>{liveActivities.length} en vivo</span>
          </div>
          
          {liveActivities.map(activity => (
            <div 
              key={activity.id}
              className="bg-white/[0.02] border border-white/[0.04] rounded-lg px-3 py-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/80 font-medium truncate">
                  {activity.title}
                </span>
                <span className="text-[10px] text-cyan-400/60 font-bold">
                  {activity.participant_count || 0} 👥
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Join Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-full mt-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-xs font-bold text-cyan-300 uppercase tracking-wider transition-all"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/community/${community.slug}`);
        }}
      >
        Explorar
      </motion.button>
    </motion.div>
  );
}
