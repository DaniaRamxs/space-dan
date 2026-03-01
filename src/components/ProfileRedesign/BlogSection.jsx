import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export const BlogSection = ({ title, posts, isOwn }) => {
    const pinnedPost = posts.find((p) => p.is_pinned) || posts[0];
    const listPosts = posts.filter((p) => p.id !== pinnedPost?.id);

    if (!pinnedPost && posts.length === 0) {
        return (
            <div className="py-12 text-center text-white/20 uppercase tracking-[0.5em] text-[10px] font-black italic">
                Bitácora vacía... 📡
            </div>
        );
    }

    return (
        <section className="space-y-12">
            {/* Featured Post */}
            {pinnedPost && (
                <article className="group relative overflow-hidden rounded-[2.5rem] bg-[#111118]/80 border border-white/5 shadow-2xl transition-all duration-500 hover:border-cyan-500/20">
                    <div className="grid grid-cols-1 md:grid-cols-2">
                        <div
                            className="h-64 md:h-full min-h-[300px] w-full bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                            style={{ backgroundImage: `url(${pinnedPost.cover_url || '/placeholder_cover.png'})` }}
                        />
                        <div className="p-8 md:p-12 space-y-6 flex flex-col justify-center">
                            <div className="space-y-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Artículo Destacado</span>
                                <h2 className="text-3xl md:text-5xl font-black text-white leading-none tracking-tighter uppercase italic drop-shadow-lg">
                                    {pinnedPost.title}
                                </h2>
                            </div>
                            <p className="text-white/60 text-sm md:text-lg leading-relaxed line-clamp-3 italic">
                                {pinnedPost.content?.substring(0, 200).replace(/[#*`]/g, '')}...
                            </p>
                            <div className="flex items-center gap-6">
                                <Link
                                    to={`/blog/${pinnedPost.slug}`}
                                    className="px-8 py-3 rounded-2xl bg-white text-black text-[12px] font-black uppercase tracking-wider hover:bg-cyan-400 transition-all shadow-xl hover:scale-105"
                                >
                                    Leer Artículo
                                </Link>
                                <div className="flex flex-col text-[10px] uppercase font-black tracking-widest text-white/30">
                                    <span>{new Date(pinnedPost.created_at).toLocaleDateString()}</span>
                                    <span>{pinnedPost.read_time || 5} min read</span>
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
                            whileHover={{ y: -5 }}
                            className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group"
                        >
                            <div className="flex flex-col h-full justify-between gap-6">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-start">
                                        <span className="text-[9px] font-black text-white/30 tracking-widest uppercase italic">{new Date(post.created_at).toLocaleDateString()}</span>
                                        <span className="text-[9px] font-black text-cyan-400/40 tracking-widest uppercase italic">{post.read_time || 5} Min Read</span>
                                    </div>
                                    <h3 className="text-xl md:text-2xl font-black text-white leading-tight uppercase italic group-hover:text-cyan-400 transition-colors">
                                        {post.title}
                                    </h3>
                                    <p className="text-white/40 text-[13px] leading-relaxed line-clamp-3">
                                        {post.content?.substring(0, 150).replace(/[#*`]/g, '')}...
                                    </p>
                                </div>
                                <Link
                                    to={`/blog/${post.slug}`}
                                    className="w-full py-3 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 text-center transition-all"
                                >
                                    Abrir Diario
                                </Link>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </section>
    );
};
