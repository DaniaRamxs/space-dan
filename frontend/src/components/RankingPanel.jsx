import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { getCommunityRanking } from '../services/reputationService';
import ReputationBadge from './Reputation/ReputationBadge';

export default function RankingPanel({ communityId, compact }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRanking = useCallback(async () => {
    if (!communityId) return;
    try {
      const data = await getCommunityRanking(communityId, 10);
      setMembers(data.slice(0, 5));
    } catch (error) {
      console.error('[RankingPanel] Load error:', error);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    loadRanking();
  }, [loadRanking]);

  const medals = ['🥇', '🥈', '🥉', '4', '5'];

  if (loading) {
    return (
      <div className={`bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 sm:p-6 ${compact ? '' : 'm-4'}`}>
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-white/5 shrink-0" />
              <div className="w-9 h-9 rounded-full bg-white/5 shrink-0" />
              <div className="flex-1 h-9 bg-white/5 rounded-xl" />
              <div className="w-10 h-9 bg-white/5 rounded-xl shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`${compact ? 'bg-white/[0.02] border border-white/[0.06] rounded-2xl p-3 sm:p-4' : ''}`}>
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
          <Trophy size={16} className="text-orange-400" />
        </div>
        <h3 className="font-bold text-white/90 text-sm sm:text-base">Más Activos</h3>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-4 sm:py-6 text-white/40 text-sm">
          Aún no hay miembros activos
        </div>
      ) : (
        <div className="space-y-1.5 sm:space-y-2">
          {members.map((member, index) => (
            <motion.div
              key={member.userId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-all"
            >
              {/* Medalla */}
              <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                index === 1 ? 'bg-gray-400/20 text-gray-300' :
                index === 2 ? 'bg-orange-500/20 text-orange-400' :
                'bg-white/[0.05] text-white/40'
              }`}>
                {medals[index]}
              </div>

              {/* Avatar — usa avatarUrl (camelCase) que retorna el servicio */}
              <img
                src={member.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`}
                alt={member.username}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 shrink-0 object-cover"
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white/90 text-xs sm:text-sm truncate">{member.username}</p>
                <ReputationBadge points={member.points ?? 0} size="sm" showName={false} />
              </div>

              {/* Puntos */}
              <div className="text-right shrink-0">
                <p className="text-xs sm:text-sm font-bold text-cyan-400">{member.points ?? 0}</p>
                <p className="text-[9px] sm:text-[10px] text-white/30">pts</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
