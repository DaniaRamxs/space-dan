import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { getCommunityRanking } from '../services/reputationService';
import ReputationBadge from './Reputation/ReputationBadge';

export default function RankingPanel({ communityId, compact }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRanking = useCallback(async () => {
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
  }, [communityId, loadRanking]);

  const medals = ['🥇', '🥈', '🥉', '4', '5'];

  if (loading) {
    return (
      <div className={`bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 ${compact ? '' : 'm-4'}`}>
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/5" />
              <div className="flex-1 h-10 bg-white/5 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`${compact ? 'bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4' : ''}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
          <Trophy size={16} className="text-orange-400" />
        </div>
        <h3 className="font-bold text-white/90">Más Activos</h3>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-6 text-white/40 text-sm">
          Aún no hay miembros activos
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-all cursor-pointer"
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                index === 1 ? 'bg-gray-400/20 text-gray-300' :
                index === 2 ? 'bg-orange-500/20 text-orange-400' :
                'bg-white/[0.05] text-white/40'
              }`}>
                {medals[index]}
              </div>

              <img
                src={member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.username}`}
                alt={member.username}
                className="w-9 h-9 rounded-full bg-white/5"
              />

              <div className="flex-1 min-w-0">
                <p className="font-medium text-white/90 text-sm truncate">{member.username}</p>
                <ReputationBadge points={member.points || 0} size="sm" showName={false} />
              </div>

              <div className="text-right">
                <p className="text-sm font-bold text-cyan-400">{member.points || 0}</p>
                <p className="text-[10px] text-white/30">pts</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
