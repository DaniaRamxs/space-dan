import { useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Gamepad2, Users, Flame } from 'lucide-react';

/**
 * ActivityDiscoveryBanner
 * 
 * An expandable activity hub banner for Spacely platform.
 * Appears below the "Write a post" input in the feed.
 * 
 * @param {Function} joinActivity - Callback when an activity is clicked
 */

const activities = [
  { id: "connect4", name: "Cosmic 4", icon: "🎮", description: "Conecta 4 fichas antes que tu rival" },
  { id: "snake", name: "Snake Duel", icon: "⚡", description: "Serpientes 1vs1. Sobrevive mas tiempo" },
  { id: "tetris", name: "Tetris Duel", icon: "📱", description: "Tetris competitivo. Envia basura al rival" },
  { id: "poker", name: "Poker", icon: "💰", description: "Texas Hold'em multinivel en tiempo real" },
  { id: "starboard", name: "Starboard", icon: "✨", description: "Pizarra Pro compartida. GIFs, capas y Colyseus real-time" },
  { id: "dj", name: "Jukebox DJ", icon: "🎧", description: "Musica compartida con playlist colaborativa" },
  { id: "blackjack", name: "Blackjack", icon: "♠️", description: "Blackjack clasico contra el dealer" },
  { id: "chess", name: "Realtime Chess", icon: "♟️", description: "Ajarez en tiempo real con otros jugadores" },
  { id: "pixel-galaxy", name: "Pixel Galaxy", icon: "🪐", description: "Crea y explora galaxias pixel art" },
  { id: "asteroid-battle", name: "Asteroid Battle", icon: "🚀", description: "Batalla espacial multijugador" },
  { id: "puzzle", name: "Co-Op Puzzle", icon: "🧩", description: "Puzles colaborativos en tiempo real" },
  { id: "ludo", name: "Ludo Classic", icon: "🎲", description: "Ludo clasico para 4 jugadores" },
  { id: "watch", name: "Watch Together", icon: "🎬", description: "Ve videos en sincronia con amigos" },
];

const containerVariants = {
  collapsed: {
    height: 'auto',
    transition: {
      duration: 0.4,
      ease: [0.04, 0.62, 0.23, 0.98]
    }
  },
  expanded: {
    height: 'auto',
    transition: {
      duration: 0.5,
      ease: [0.04, 0.62, 0.23, 0.98],
      staggerChildren: 0.03,
      delayChildren: 0.1
    }
  }
};

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.9
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.04, 0.62, 0.23, 0.98]
    }
  }
};

const pulseAnimation = {
  scale: [1, 1.02, 1],
  boxShadow: [
    '0 0 0 0 rgba(139, 92, 246, 0)',
    '0 0 20px 2px rgba(139, 92, 246, 0.3)',
    '0 0 0 0 rgba(139, 92, 246, 0)'
  ],
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: 'easeInOut'
  }
};

export default function ActivityDiscoveryBanner({ joinActivity }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter activities with active users for "Popular Now" section - DISABLED
  const popularActivities = [];

  const handleCardClick = (activityId) => {
    if (joinActivity) {
      joinActivity(activityId);
    }
  };

  return (
    <motion.div
      initial="collapsed"
      animate={isExpanded ? 'expanded' : 'collapsed'}
      variants={containerVariants}
      className="w-full"
    >
      <div 
        className={`
          relative overflow-hidden rounded-2xl
          bg-gradient-to-br from-slate-900/80 via-purple-900/30 to-slate-900/80
          backdrop-blur-xl
          border border-white/10
          shadow-lg shadow-purple-500/10
          ${isExpanded ? 'mb-4' : 'mb-3'}
        `}
      >
        {/* Background glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-fuchsia-500/5 to-cyan-500/5 pointer-events-none" />
        
        {/* Compact Banner Header */}
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          className="relative w-full p-4 flex items-center justify-between text-left group"
          whileHover={{ scale: 1.005 }}
          whileTap={{ scale: 0.995 }}
        >
          <div className="flex items-center gap-3">
            <motion.div
              animate={!isExpanded ? pulseAnimation : {}}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30"
            >
              <Gamepad2 className="w-5 h-5 text-violet-300" />
            </motion.div>
            
            <div>
              <h3 className="text-sm font-semibold text-white/90 flex items-center gap-2">
                <span className="hidden sm:inline">🎮</span>
                Actividades disponibles
              </h3>
              <p className="text-xs text-white/50 mt-0.5">
                Juega, mira o explora con otros
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AnimatePresence mode="wait">
              {!isExpanded ? (
                <motion.span
                  key="explore"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="text-xs font-medium text-violet-300/80 hidden sm:block"
                >
                  Explorar
                </motion.span>
              ) : (
                <motion.span
                  key="close"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="text-xs font-medium text-white/60 hidden sm:block"
                >
                  Cerrar
                </motion.span>
              )}
            </AnimatePresence>
            
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors"
            >
              <ChevronDown className="w-4 h-4 text-white/70" />
            </motion.div>
          </div>
        </motion.button>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4">
                {/* Popular Now Section */}
                {popularActivities.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Flame className="w-4 h-4 text-orange-400" />
                      <span className="text-xs font-semibold text-orange-300/90 uppercase tracking-wider">
                        Popular ahora
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {popularActivities.map((activity) => (
                        <motion.button
                          key={`popular-${activity.id}`}
                          onClick={() => handleCardClick(activity.id)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r from-orange-500/20 to-pink-500/20 border border-orange-500/30 text-xs text-white/80 hover:text-white hover:border-orange-500/50 transition-all"
                        >
                          <span>{activity.icon}</span>
                          <span className="font-medium">{activity.name}</span>
                          <span className="flex items-center gap-1 text-orange-300/70">
                            <Users className="w-3 h-3" />
                            {activity.active}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Divider */}
                {popularActivities.length > 0 && (
                  <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4" />
                )}

                {/* Activity Grid */}
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3"
                >
                  {activities.map((activity) => (
                    <motion.button
                      key={activity.id}
                      variants={cardVariants}
                      onClick={() => handleCardClick(activity.id)}
                      whileHover={{ 
                        scale: 1.05,
                        y: -4,
                        boxShadow: '0 8px 30px rgba(139, 92, 246, 0.25)'
                      }}
                      whileTap={{ scale: 0.95 }}
                      className="relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-white/5 hover:border-violet-500/40 transition-all group"
                    >
                      {/* Card glow effect */}
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500/0 via-fuchsia-500/0 to-cyan-500/0 group-hover:from-violet-500/10 group-hover:via-fuchsia-500/5 group-hover:to-cyan-500/10 transition-all duration-300" />
                      
                      <div className="relative">
                        <span className="text-2xl sm:text-3xl filter drop-shadow-lg">
                          {activity.icon}
                        </span>
                      </div>
                      
                      <span className="relative mt-2 text-[10px] sm:text-xs font-medium text-white/70 text-center line-clamp-1 group-hover:text-white/90 transition-colors">
                        {activity.name}
                      </span>
                      
                      {/* Description tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900/95 backdrop-blur-sm border border-white/10 rounded-lg text-[10px] text-white/80 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                        {activity.description}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-slate-900/95 border border-white/10 border-t-0 border-l-0 rotate-45" />
                      </div>
                    </motion.button>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
