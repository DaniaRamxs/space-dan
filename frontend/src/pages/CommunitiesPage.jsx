/**
 * Communities Page
 * Main hub for discovering and browsing communities
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, TrendingUp, Sparkles } from 'lucide-react';
import { communitiesService } from '../services/communitiesService';
import { liveActivitiesService } from '../services/liveActivitiesService';
import CommunityCard from '../components/Communities/CommunityCard';
import LiveActivityCard from '../components/Activities/LiveActivityCard';
import StellarScrollBg from '../components/Effects/StellarScrollBg';

const CATEGORIES = [
  { id: 'all', label: 'Todo', icon: '🌌' },
  { id: 'gaming', label: 'Gaming', icon: '🎮' },
  { id: 'anime', label: 'Anime', icon: '🎌' },
  { id: 'music', label: 'Música', icon: '🎵' },
  { id: 'tech', label: 'Tech', icon: '💻' },
  { id: 'art', label: 'Arte', icon: '🎨' }
];

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState([]);
  const [trendingActivities, setTrendingActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [activeCategory, searchQuery]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [communitiesData, activitiesData] = await Promise.all([
        communitiesService.getCommunities({
          category: activeCategory === 'all' ? null : activeCategory,
          search: searchQuery || null,
          limit: 20
        }),
        liveActivitiesService.getTrendingActivities({ limit: 6 })
      ]);

      setCommunities(communitiesData);
      setTrendingActivities(activitiesData);
    } catch (error) {
      console.error('[CommunitiesPage] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="w-full max-w-6xl mx-auto min-h-screen pb-32 text-white font-sans pt-6 md:pt-10 px-4 relative">
      <StellarScrollBg />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white/90 glitch-text">
          Comunidades
        </h1>
        <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400/40 mt-1">
          Descubre espacios donde algo siempre está pasando
        </p>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Buscar comunidades..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-white placeholder:text-white/30 focus:border-cyan-500/30 focus:outline-none transition-all"
          />
        </div>
      </motion.div>

      {/* Category Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex gap-2 overflow-x-auto pb-2 mb-8 mobile-scroll-x"
      >
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex-shrink-0 ${
              activeCategory === cat.id
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                : 'bg-white/[0.03] text-white/30 border-white/[0.06] hover:text-white/60 hover:border-white/15'
            }`}
          >
            <span className="mr-1.5">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </motion.div>

      {/* Trending Activities Section */}
      {trendingActivities.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-10"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-cyan-400" />
            <h2 className="text-xl font-bold uppercase tracking-tight text-white/90">
              Actividades en Tendencia
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trendingActivities.map(activity => (
              <LiveActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        </motion.section>
      )}

      {/* Communities Section */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={18} className="text-purple-400" />
          <h2 className="text-xl font-bold uppercase tracking-tight text-white/90">
            {activeCategory === 'all' ? 'Todas las Comunidades' : `Comunidades de ${CATEGORIES.find(c => c.id === activeCategory)?.label}`}
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 h-48 animate-pulse" />
            ))}
          </div>
        ) : communities.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {communities.map(community => (
              <CommunityCard key={community.id} community={community} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 opacity-30">
            <span className="text-4xl mb-4 block">🛰️</span>
            <p className="text-[10px] uppercase tracking-[0.4em]">
              {searchQuery ? 'No se encontraron comunidades' : 'Aún no hay comunidades'}
            </p>
          </div>
        )}
      </motion.section>
    </main>
  );
}
