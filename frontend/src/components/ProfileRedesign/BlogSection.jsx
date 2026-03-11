import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export const BlogSection = ({ title, posts, isOwn, username }) => {
    const pinnedPost = posts.find((p) => p.is_pinned) || posts[0];
    const listPosts = posts.filter((p) => p.id !== pinnedPost?.id);

    // Clean username for URLs
    const cleanUsername = (username || 'dan').replace('@', '');

    if (!pinnedPost && posts.length === 0) {
        return (
            <div className="py-20 text-center bg-white/[0.01] border border-white/5 rounded-[3rem] text-white/20 uppercase tracking-[0.5em] text-[10px] font-black italic">
                La base de conocimientos está vacía... 📡
            </div>
        );
    }

    return (
        <section className="space-y-12">
            {/* Featured Post */}
            {pinnedPost && (
                <article className="group relative overflow-hidden rounded-[3rem] bg-[#0a0a0f] border border-white/5 shadow-2xl transition-all duration-700 hover:border-cyan-500/30">
                    <div className="grid grid-cols-1 lg:grid-cols-2">
                        <div
                            className="h-64 lg:h-auto min-h-[350px] w-full bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
                            style={{ backgroundImage: `url(${pinnedPost.cover_url || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop'})` }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent lg:hidden" />
                        </div>
                        <div className="p-10 lg:p-16 space-y-8 flex flex-col justify-center relative">
                            <div className="absolute top-0 right-0 p-10 text-6xl opacity-[0.03] font-black italic select-none">FEATURED</div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <span className="w-8 h-px bg-cyan-500/50" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 italic">Transmisión Destacada</span>
                                </div>
                                <h2 className="text-4xl lg:text-5xl font-black text-white leading-none tracking-tighter uppercase italic group-hover:text-cyan-400 transition-colors duration-500">
                                    {pinnedPost.title}
                                </h2>
                            </div>
                            <p className="text-white/50 text-base lg:text-lg leading-relaxed line-clamp-3 italic font-medium">
                                {pinnedPost.content?.substring(0, 220).replace(/[#*`]/g, '')}...
                            </p>
                            <div className="flex flex-wrap items-center gap-8">
                                <Link
                                    to={`/blog/${cleanUsername}/${pinnedPost.slug}`}
                                    className="px-10 py-4 rounded-2xl bg-cyan-500 text-black text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white transition-all shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:scale-105 active:scale-95"
                                >
                                    Leer Artículo
                                </Link>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] uppercase font-black tracking-widest text-white/40 italic">
                                        {new Date(pinnedPost.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </span>
                                    <span className="h-px w-full bg-white/10" />
                                    <span className="text-[9px] uppercase font-black tracking-widest text-cyan-400/60 italic">{pinnedPost.read_time || 5} min de lectura</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </article>
            )}

            {/* Blog Feed */}
            {listPosts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {listPosts.map((post) => (
                        <motion.div
                            key={post.id}
                            whileHover={{ y: -8 }}
                            className="p-10 rounded-[2.5rem] bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] hover:border-white/10 transition-all duration-500 group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-6 text-4xl opacity-[0.02] font-black italic">ART.</div>
                            <div className="flex flex-col h-full justify-between gap-8 relative z-10">
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-black text-white/20 tracking-[0.3em] uppercase italic">{new Date(post.created_at).toLocaleDateString()}</span>
                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/40" />
                                    </div>
                                    <h3 className="text-2xl font-black text-white leading-tight uppercase italic group-hover:text-cyan-400 transition-colors duration-500">
                                        {post.title}
                                    </h3>
                                    <p className="text-white/40 text-sm leading-relaxed line-clamp-3 italic">
                                        {post.content?.substring(0, 160).replace(/[#*`]/g, '')}...
                                    </p>
                                </div>
                                <Link
                                    to={`/blog/${cleanUsername}/${post.slug}`}
                                    className="w-full py-4 rounded-2xl border border-white/10 text-[10px] font-black uppercase tracking-[0.3em] bg-white/5 hover:bg-white/10 hover:border-cyan-500/30 text-center transition-all group-hover:text-cyan-400 shadow-xl"
                                >
                                    Abrir Registro
                                </Link>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </section>
    );
};
