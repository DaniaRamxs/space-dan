/**
 * Community Page
 * Individual community view with feed and live activities
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Activity, ArrowLeft } from 'lucide-react';
import { communitiesService } from '../services/communitiesService';
import { liveActivitiesService } from '../services/liveActivitiesService';
import { useAuthContext } from '../contexts/AuthContext';
import LiveActivityCard from '../components/Activities/LiveActivityCard';
import ActivityFeed from '../components/Social/ActivityFeed';
import StellarScrollBg from '../components/Effects/StellarScrollBg';

export default function CommunityPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const [community, setCommunity] = useState(null);
  const [activities, setActivities] = useState([]);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    loadCommunity();
  }, [slug]);

  const loadCommunity = async () => {
    setLoading(true);
    try {
      const communityData = await communitiesService.getCommunityBySlug(slug);
      setCommunity(communityData);

      const activitiesData = await liveActivitiesService.getTrendingActivities({ 
        limit: 10 
      });
      setActivities(activitiesData.filter(a => a.community?.slug === slug));

    } catch (error) {
      console.error('[CommunityPage] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCommunity = async () => {
    if (!user || !community) return;
    setJoining(true);
    try {
      await communitiesService.joinCommunity(community.id);
      setIsMember(true);
      setCommunity(prev => ({ ...prev, member_count: (prev.member_count || 0) + 1 }));
    } catch (error) {
      console.error('[CommunityPage] Join error:', error);
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveCommunity = async () => {
    if (!user || !community) return;
    setJoining(true);
    try {
      await communitiesService.leaveCommunity(community.id);
      setIsMember(false);
      setCommunity(prev => ({ ...prev, member_count: Math.max(0, (prev.member_count || 0) - 1) }));
    } catch (error) {
      console.error('[CommunityPage] Leave error:', error);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <main className="w-full max-w-6xl mx-auto min-h-screen pb-32 text-white font-sans pt-6 md:pt-10 px-4">
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-white/[0.03] rounded-2xl" />
          <div className="h-64 bg-white/[0.03] rounded-2xl" />
        </div>
      </main>
    );
  }

  if (!community) {
    return (
      <main className="w-full max-w-6xl mx-auto min-h-screen pb-32 text-white font-sans pt-6 md:pt-10 px-4 text-center">
        <p className="text-white/60">Comunidad no encontrada</p>
        <button onClick={() => navigate('/communities')} className="mt-4 text-cyan-400 hover:text-cyan-300">
          Volver a comunidades
        </button>
      </main>
    );
  }

  return (
    <main className="w-full max-w-6xl mx-auto min-h-screen pb-32 text-white font-sans pt-6 md:pt-10 px-4 relative">
      <StellarScrollBg />

      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => navigate('/communities')}
        className="flex items-center gap-2 text-white/40 hover:text-white/80 transition-colors mb-6 text-sm"
      >
        <ArrowLeft size={16} />
        <span>Volver</span>
      </motion.button>

      {/* Community Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 mb-8"
      >
        <div className="flex items-start gap-4">
          {community.avatar_url ? (
            <img 
              src={community.avatar_url} 
              alt={community.name}
              className="w-20 h-20 rounded-2xl object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
              <Users size={32} className="text-cyan-400" />
            </div>
          )}

          <div className="flex-1">
            <h1 className="text-3xl font-black uppercase tracking-tight text-white/90 mb-2">
              {community.name}
            </h1>
            
            <div className="flex items-center gap-4 text-[10px] text-white/40 uppercase tracking-wider mb-3">
              <span>{community.member_count?.toLocaleString() || 0} miembros</span>
              <span>•</span>
              <span>{activities.length} actividades en vivo</span>
            </div>

            {community.description && (
              <p className="text-sm text-white/60 mb-4">
                {community.description}
              </p>
            )}

            {user && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={isMember ? handleLeaveCommunity : handleJoinCommunity}
                disabled={joining}
                className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                  isMember
                    ? 'bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.1] text-white/60'
                    : 'bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300'
                }`}
              >
                {joining ? 'Cargando...' : isMember ? 'Salir' : 'Unirse'}
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Live Activities Section */}
      {activities.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-cyan-400" />
            <h2 className="text-xl font-bold uppercase tracking-tight text-white/90">
              Actividades en Vivo
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activities.map(activity => (
              <LiveActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        </motion.section>
      )}

      {/* Community Feed */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl font-bold uppercase tracking-tight text-white/90 mb-4">
          Feed de la Comunidad
        </h2>
        <ActivityFeed filter="community" category={community.category} />
      </motion.section>
    </main>
  );
}
