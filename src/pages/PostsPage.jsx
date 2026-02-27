import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthContext } from '../contexts/AuthContext';
import ActivityFeed from '../components/Social/ActivityFeed';
import PostComposer, { CATEGORIES } from '../components/Social/PostComposer';
import { Globe } from 'lucide-react';

export default function PostsPage() {
  const { user } = useAuthContext();
  const [activeCategory, setActiveCategory] = useState('all');

  const handlePostCreated = (newPost) => {
    if (!newPost) return;
    window.dispatchEvent(new CustomEvent('activity:new-post', { detail: newPost }));
  };

  return (
    <main className="w-full max-w-2xl mx-auto min-h-screen pb-32 text-white font-sans flex flex-col pt-6 md:pt-10 px-0 md:px-4 relative">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8 hidden md:block">
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 mb-1">
          Global_Feed
        </h1>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/20 font-mono">
          :: Transmisiones_Estelares
        </p>
      </motion.div>

      {/* Composer */}
      {user && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mb-8"
        >
          <PostComposer onPostCreated={handlePostCreated} />
        </motion.div>
      )}

      {/* Filtros de categoría */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.12 }}
        className="mobile-scroll-x px-4 md:px-0 mb-6 pb-2"
      >
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex-shrink-0 ${activeCategory === 'all'
            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
            : 'bg-white/[0.03] text-white/30 border-white/[0.06] hover:text-white/60 hover:border-white/15'
            }`}
        >
          <Globe size={12} strokeWidth={1.5} className="mr-1.5 inline" /> Todo
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex-shrink-0 ${activeCategory === cat.id
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
              : 'bg-white/[0.03] text-white/30 border-white/[0.06] hover:text-white/60 hover:border-white/15'
              }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </motion.div>

      {/* Feed */}
      <ActivityFeed filter="post" category={activeCategory === 'all' ? null : activeCategory} />
    </main>
  );
}
