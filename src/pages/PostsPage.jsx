import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { blogService } from '../services/blogService';
import LikeButton from '../components/LikeButton';
import { useAuthContext } from '../contexts/AuthContext';

export default function PostsPage() {
  const { user } = useAuthContext();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  async function loadPosts() {
    try {
      setLoading(true);
      const data = await blogService.getGlobalFeed(50, 0);
      setPosts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="w-full max-w-3xl mx-auto min-h-[100dvh] pb-24 text-white font-sans px-4 pt-10 flex justify-center items-center">
        <span className="text-cyan-500 animate-pulse font-mono text-sm tracking-widest uppercase">cargando_red_estelar...</span>
      </main>
    );
  }

  return (
    <main className="w-full max-w-3xl mx-auto min-h-[100dvh] pb-24 text-white font-sans flex flex-col pt-6 md:pt-10 px-4 relative">
      <div className="flex flex-col mb-8 md:mb-12 animate-fade-in-up">
        <h1 className="text-4xl md:text-5xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
          Global Feed
        </h1>
        <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">
          Transmisiones Estelares
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {posts.length === 0 ? (
          <div className="text-center p-12 border border-white/5 rounded-2xl bg-[#0a0a0f] text-gray-500 text-sm animate-fade-in-up">
            La red estelar está en silencio absoluto. Sé el primero en transmitir.
          </div>
        ) : (
          posts.map((p, index) => (
            <div key={p.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
              <Link to={`/log/${p.slug}`} className="block bg-[#13131c]/60 backdrop-blur-md p-6 rounded-2xl border border-white/5 transition-colors hover:bg-[#13131c] hover:border-white/10 group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full border border-white/10 overflow-hidden">
                    <img src={p.author?.avatar_url || '/dan_profile.jpg'} alt="avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-200 group-hover:text-cyan-400 transition-colors uppercase tracking-wider">{p.author?.username || 'Usuario'}</span>
                    <span className="text-[10px] text-gray-500 font-mono">{new Date(p.created_at).toLocaleString()}</span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono tracking-widest ml-auto opacity-60 flex items-center gap-1">
                    👁 {p.views || 0}
                  </span>
                </div>

                <div className="pl-11">
                  <h3 className="text-xl md:text-2xl font-bold text-gray-100 group-hover:text-white transition-colors mb-2 leading-tight">
                    {p.title}
                  </h3>
                  {p.subtitle && (
                    <p className="text-sm md:text-base text-gray-400 mb-4 line-clamp-2 leading-relaxed">
                      {p.subtitle}
                    </p>
                  )}
                </div>
              </Link>
              <div className="pl-16 pr-6 pt-3 pb-2 w-full flex align-center">
                <LikeButton postId={p.id} />
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB: Mobile First Create Post Button */}
      {user && (
        <Link
          to="/create-post"
          className="fixed bottom-24 right-6 md:hidden w-14 h-14 bg-cyan-500 text-black text-2xl font-black rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.5)] z-50 hover:scale-105 active:scale-95 transition-transform"
        >
          +
        </Link>
      )}

      {/* Desktop Create Button */}
      {user && (
        <div className="hidden md:flex justify-center mt-12 mb-8">
          <Link to="/create-post" className="btn-accent px-8 py-3 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] transition-all flex items-center gap-2 font-bold tracking-widest uppercase text-xs">
            <span className="text-lg leading-none">+</span> Redactar Nueva Transmisión
          </Link>
        </div>
      )}
    </main>
  );
}
