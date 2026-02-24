import React, { useRef, useEffect, useCallback } from 'react';
import { useActivityFeed } from '../../hooks/useActivityFeed';
import ActivityCard from './ActivityCard';

export default function ActivityFeed({ userId, filter = 'all' }) {
    const { feed, setFeed, loading, loadingMore, hasMore, loadMore } = useActivityFeed(filter);

    // Actualiza un post existente en el feed (p.ej. después de reaccionar)
    const handleUpdatePost = useCallback((updatedPost) => {
        setFeed(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
    }, [setFeed]);

    // Precarga un nuevo post (repost/cita) al principio del feed
    const handleNewPost = useCallback((newPost) => {
        if (!newPost) return;
        setFeed(prev => {
            // Evitar duplicados si el RPC ya lo retornó
            if (prev.find(p => p.id === newPost.id)) return prev;
            return [newPost, ...prev];
        });
    }, [setFeed]);

    // Escucha posts nuevos emitidos desde el PostComposer (evento global)
    useEffect(() => {
        const onNewPost = (e) => {
            const newPost = e.detail;
            if (!newPost) return;
            // Enriquecer con metadata vacía para que ReactionsBar no crashee
            const enriched = {
                ...newPost,
                reactions_metadata: newPost.reactions_metadata || { total_count: 0, top_reactions: [], user_reaction: null },
                original_post: newPost.original_post || null,
            };
            handleNewPost(enriched);
        };
        window.addEventListener('activity:new-post', onNewPost);
        return () => window.removeEventListener('activity:new-post', onNewPost);
    }, [handleNewPost]);

    // Infinite Scroll Trigger nativo y eficiente
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
                    loadMore();
                }
            },
            { rootMargin: '200px' } // Pre-carga antes de llegar exactamente al final
        );

        const target = document.querySelector('#feed-end-trigger');
        if (target) observer.observe(target);

        return () => observer.disconnect();
    }, [hasMore, loadingMore, loading, loadMore]);

    return (
        <div className="w-full flex items-center justify-center">
            <div className="w-full max-w-2xl flex flex-col gap-6">

                {loading && !loadingMore && feed.length === 0 ? (
                    // Skeleton Loader
                    <div className="flex flex-col gap-6">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="animate-pulse bg-[#0a0a0f] border border-white/5 rounded-[2.5rem] p-6 h-40">
                                <div className="flex gap-4 h-full">
                                    <div className="w-12 h-12 bg-white/5 rounded-2xl shrink-0" />
                                    <div className="flex-1 space-y-3 py-1">
                                        <div className="h-3 bg-white/5 rounded-full w-1/3" />
                                        <div className="h-2 bg-white/5 rounded-full w-3/4 mt-4" />
                                        <div className="h-2 bg-white/5 rounded-full w-2/3" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        {feed.map((post) => (
                            <ActivityCard
                                key={post.id}
                                post={post}
                                onUpdate={handleUpdatePost}
                                onNewPost={handleNewPost}
                            />
                        ))}
                    </div>
                )}

                {!loading && feed.length === 0 && (
                    <div className="text-center py-20 bg-[#0a0a0f] rounded-[3rem] border border-white/5 shadow-inner">
                        <span className="text-4xl mb-4 block opacity-30">🛰️</span>
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">Ninguna transmisión detectada</p>
                    </div>
                )}

                {/* Sentinel para scroll infinito */}
                <div id="feed-end-trigger" className="h-16 w-full flex justify-center items-center">
                    {loadingMore && (
                        <div className="w-6 h-6 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                    )}
                </div>

                {!hasMore && feed.length > 0 && (
                    <div className="text-center pb-8 border-t border-white/5 pt-8 mt-4">
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em]">Final de la transmisión</span>
                    </div>
                )}
            </div>
        </div>
    );
}
