import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { newProfileService } from '../../services/newProfileService';
import { ProfileLayout } from './ProfileLayout';

export const BlogPostPage = () => {
    const { username, slug } = useParams();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        load();
    }, [username, slug]);

    async function load() {
        setLoading(true);
        try {
            const data = await newProfileService.getBlogPostBySlug(username, slug);
            setPost(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
            <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
            <span className="text-[10px] uppercase font-black tracking-widest text-cyan-500 animate-pulse">Sintonizando Diario... 📑</span>
        </div>
    );

    if (!post) return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-12 text-center text-white space-y-8">
            <div className="text-8xl opacity-10 font-black italic select-none">404</div>
            <h2 className="text-3xl font-black uppercase italic tracking-tighter">Página de bitácora no encontrada</h2>
            <Link to="/" className="px-8 py-3 bg-white text-black text-[12px] font-black uppercase tracking-widest rounded-2xl hover:bg-cyan-400">
                Regresar al Inicio
            </Link>
        </div>
    );

    // We reuse layout for theme coherence
    const theme = { background_style: 'mesh', font_style: 'serif', primary_color: '#06b6d4' };

    return (
        <ProfileLayout theme={theme}>
            <header className="h-96 w-full relative overflow-hidden flex items-end">
                <img src={post.cover_url || '/placeholder_cover.png'} className="absolute inset-0 w-full h-full object-cover blur-sm opacity-50 scale-105" alt="" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black" />

                <div className="max-w-4xl mx-auto px-6 w-full pb-12 relative z-10 space-y-4">
                    <Link to={`/@${username}`} className="text-[10px] font-black uppercase tracking-widest text-cyan-400 hover:text-white transition-colors">
                        ← BITÁCORA DE {username}
                    </Link>
                    <h1 className="text-4xl md:text-7xl font-black text-white italic uppercase tracking-tighter leading-none drop-shadow-2xl">
                        {post.title}
                    </h1>
                    <div className="flex gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 italic">
                        <span>Puesto en Órbita: {new Date(post.created_at).toLocaleDateString()}</span>
                        <span>Tiempo de Lectura: {post.read_time || 5} MIN</span>
                    </div>
                </div>
            </header>

            <article className="max-w-3xl mx-auto px-6 py-20">
                <div className="prose prose-invert prose-lg md:prose-xl prose-cyan max-w-none 
                        prose-headings:font-black prose-headings:uppercase prose-headings:italic prose-headings:tracking-tighter
                        prose-p:text-white/70 prose-p:leading-relaxed prose-p:text-lg
                        prose-strong:text-cyan-400 prose-blockquote:border-cyan-500/50 prose-blockquote:bg-white/[0.02] 
                        prose-blockquote:rounded-2xl prose-blockquote:p-4 prose-blockquote:italic select-text">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeSanitize]}
                    >
                        {post.content}
                    </ReactMarkdown>
                </div>

                <footer className="mt-32 pt-12 border-t border-white/5 flex flex-col items-center gap-12">
                    <div className="flex flex-col items-center gap-4 group cursor-pointer">
                        <img src={post.author.avatar_url || '/default_user.png'} className="w-20 h-20 rounded-[1.5rem] border-2 border-white/10 group-hover:border-cyan-500/50 transition-all p-1" alt="" />
                        <div className="text-center">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Escritor Espacial</span>
                            <h4 className="text-xl font-black text-white italic uppercase tracking-tighter">@{post.author.username}</h4>
                        </div>
                    </div>

                    <Link to={`/@${username}`} className="px-12 py-4 bg-white/[0.03] border border-white/10 rounded-2xl text-[12px] font-black uppercase tracking-[0.3em] hover:bg-white/10 transition-all">
                        Ver Perfil Completo de {username}
                    </Link>
                </footer>
            </article>
        </ProfileLayout>
    );
};
