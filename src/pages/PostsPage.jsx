import { motion } from 'framer-motion';
import { useAuthContext } from '../contexts/AuthContext';
import ActivityFeed from '../components/Social/ActivityFeed';
import PostComposer from '../components/Social/PostComposer';

export default function PostsPage() {
  const { user } = useAuthContext();

  const handlePostCreated = (newPost) => {
    if (!newPost) return;
    window.dispatchEvent(new CustomEvent('activity:new-post', { detail: newPost }));
  };

  return (
    <main className="w-full max-w-2xl mx-auto min-h-[100dvh] pb-32 text-white font-sans flex flex-col pt-6 md:pt-10 px-4 relative">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col mb-8"
      >
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/30 tracking-tight mb-1">
          Global Feed
        </h1>
        <p className="text-[10px] text-white/25 uppercase tracking-[0.4em] font-black">
          Transmisiones Estelares
        </p>
      </motion.div>

      {/* ── Composer (solo autenticados) ── */}
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

      {/* ── Feed — solo posts originales (no reposts, no citas) ── */}
      <ActivityFeed filter="post" />
    </main>
  );
}
