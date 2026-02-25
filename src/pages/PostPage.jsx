import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { blogService } from '../services/blogService';
import LikeButton from '../components/LikeButton';
import Comments from '../components/Comments'; // We might need to ensure this works with string IDs too
import { useAuthContext } from '../contexts/AuthContext';

export default function PostPage() {
  const { slug } = useParams();
  const { user } = useAuthContext();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!slug) return;
    blogService.getPostBySlug(slug)
      .then(setPost)
      .catch(err => {
        console.error(err);
        setErrorMsg(err.message || JSON.stringify(err));
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <main className="w-full max-w-3xl mx-auto min-h-[100dvh] pb-24 text-white font-sans px-4 pt-10 flex justify-center items-center">
        <span className="text-cyan-500 animate-pulse font-mono text-sm tracking-widest uppercase">cargando_red_estelar...</span>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="w-full max-w-3xl mx-auto min-h-[100dvh] pb-24 text-white font-sans px-4 pt-10 text-center">
        <h1 className="text-2xl font-black mb-4">Post no encontrado</h1>
        <p className="text-gray-400 mb-8">El archivo estelar parece no existir en esta coordenada.</p>
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-lg mb-8 text-left font-mono text-xs w-full max-w-md mx-auto">
            ERROR DB: {errorMsg}
          </div>
        )}
        <Link to="/posts" className="text-cyan-400 hover:text-cyan-300">← Volver al Feed</Link>
      </main>
    );
  }

  return (
    <main className="w-full max-w-3xl mx-auto min-h-[100dvh] pb-24 text-white font-sans flex flex-col pt-6 md:pt-10 px-4">
      <div className="mb-8">
        <Link to="/posts" className="text-gray-500 hover:text-white transition-colors text-sm font-bold tracking-widest uppercase">← Explorar Feed</Link>
      </div>

      <article className="bg-[#0a0a0f] border border-white/5 p-6 md:p-10 rounded-2xl shadow-xl animate-fade-in-up">

        {/* Header */}
        <header className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 leading-tight">
            {post.title}
          </h1>
          {post.subtitle && <h2 className="text-xl text-gray-400 mb-6">{post.subtitle}</h2>}

          <div className="flex items-center justify-center gap-4 text-sm mt-6">
            <Link to={post.author?.username ? `/@${post.author.username}` : `/profile/${post.user_id}`} className="flex items-center gap-2 group">
              <img src={post.author?.avatar_url || '/dan_profile.jpg'} alt="Avatar" className="w-8 h-8 rounded-full border border-white/10 group-hover:border-cyan-500 transition-colors" />
              <span className="font-bold text-gray-200 group-hover:text-cyan-400 transition-colors">{post.author?.username || 'Usuario'}</span>
            </Link>
            <span className="text-gray-600">•</span>
            <span className="text-gray-400 font-mono tracking-widest">{new Date(post.created_at).toLocaleDateString()}</span>
            <span className="text-gray-600">•</span>
            <span className="text-cyan-500 font-mono">👁 {post.views} vistas</span>
          </div>
        </header>

        {/* Markdown Content */}
        <div className="postBigText markdownContent mx-auto" style={{ maxWidth: '65ch', fontSize: '1.1rem', lineHeight: '1.7' }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {post.content_markdown}
          </ReactMarkdown>
        </div>

        {/* Footer Actions */}
        <footer className="mt-14 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <LikeButton postId={post.id} />

          {user?.id === post.user_id && (
            <Link to={`/edit-post/${post.slug}`} className="px-5 py-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition text-sm font-bold tracking-wider">
              Editar Post
            </Link>
          )}
        </footer>
      </article>

      {/* Discussion */}
      <section className="mt-8">
        <div className="bg-[#13131c] p-6 md:p-8 rounded-2xl border border-white/5">
          <h2 className="text-lg font-bold mb-6 text-gray-200">Discusión</h2>
          {/* Assuming Comments component works generically with full UUIDs */}
          <Comments postId={post.id} />
        </div>
      </section>
    </main>
  );
}
